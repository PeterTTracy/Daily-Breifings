/*
 * supabase-briefing.js — read the latest assembled briefing from Supabase.
 *
 * WHY THIS EXISTS
 * ---------------
 * The scheduled routine that produces the briefing was moved to write into
 * Supabase (project `tblzkwjfpiokulnjvgcv`): it ingests Outlook email/calendar
 * with `execute_sql`, then calls `trigger_recap()` to assemble the briefing into
 * the `briefings` table. But the dashboard's `GET /api/briefing` only ever read
 * Vercel KV, which the routine no longer writes — so the live app went stale
 * (14 days behind). This module lets the read path pull straight from Supabase,
 * the actual source of truth, so the dashboard shows what the routine generated.
 *
 * DEPENDENCY-FREE ON PURPOSE
 * --------------------------
 * The Daily Briefing app is intentionally pure JS with a tiny dependency set
 * (next/react/@vercel/kv) — no `@supabase/supabase-js`. So we talk to Supabase's
 * PostgREST HTTP API directly with global `fetch`, exactly like scripts/
 * post-briefing.mjs does. No new dependency, no build weight.
 *
 * SCHEMA TOLERANCE
 * ----------------
 * The `briefings` table / `trigger_recap()` were created directly in Supabase,
 * not in this repo, so the exact column layout isn't known here. Rather than hard
 * -code a guess, we fetch the newest row (`select=*`) and normalize it: the
 * assembled briefing is used whether it lives in a JSONB payload column (payload/
 * briefing/recap/data/...) or the row itself already carries the briefing shape
 * ({date, items, calendar, ...}). Everything is overridable via env vars so a
 * schema surprise is a config change, not a code change. Any failure returns null
 * and the caller falls back to KV, then to sample data — so this can never make
 * the endpoint worse than before it existed.
 */

// --- config (all overridable via Vercel env vars) --------------------------

function supabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).replace(/\/+$/, '');
}

// Prefer a service-role key when present: the briefings table almost certainly
// has RLS that denies anonymous SELECT, and this only ever runs server-side in
// the API route (never shipped to the browser), so the elevated key is safe here.
function supabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

const TABLE = process.env.SUPABASE_BRIEFING_TABLE || 'briefings';
// Explicit override for the column that holds the assembled briefing JSON.
const EXPLICIT_COLUMN = process.env.SUPABASE_BRIEFING_COLUMN || '';
// Timestamp/serial columns to try (newest-first) when ordering "latest".
const ORDER_CANDIDATES = dedupe([
  process.env.SUPABASE_BRIEFING_ORDER,
  'created_at',
  'inserted_at',
  'updated_at',
  'id',
].filter(Boolean));

const TIMEOUT_MS = 6000;

// JSONB columns a `trigger_recap()`-style assembler is likely to write into.
const PAYLOAD_COLUMNS = [
  'payload', 'briefing', 'recap', 'data', 'content', 'body', 'json', 'briefing_json', 'result',
];
// Row metadata to drop when the row itself IS the briefing (flat/jsonb columns).
const META_COLUMNS = new Set([
  'id', 'created_at', 'inserted_at', 'updated_at', 'generated_at', 'user_id', 'owner',
]);

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseKey());
}

// --- fetch -----------------------------------------------------------------

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      // Never let Next's data cache serve a stale briefing.
      cache: 'no-store',
      headers: {
        apikey: supabaseKey(),
        Authorization: `Bearer ${supabaseKey()}`,
        Accept: 'application/json',
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch the most recent briefing row and normalize it to the dashboard shape.
 * Returns the briefing object, or null if unconfigured / not found / on any error.
 */
export async function getLatestBriefingFromSupabase() {
  if (!isSupabaseConfigured()) return null;

  const base = `${supabaseUrl()}/rest/v1/${encodeURIComponent(TABLE)}?select=*&limit=1`;

  // Try each ordering column until PostgREST accepts one (a missing column 400s);
  // then, as a last resort, fetch with no ordering at all.
  const attempts = [
    ...ORDER_CANDIDATES.map((c) => `${base}&order=${encodeURIComponent(c)}.desc`),
    base,
  ];

  for (const url of attempts) {
    let r;
    try {
      r = await fetchJson(url);
    } catch (e) {
      console.error('[supabase-briefing] fetch failed:', e && e.name, e && e.message);
      return null; // network/DNS/timeout — bail so the caller can fall back to KV.
    }
    if (!r.ok) {
      // 400 usually means the order column doesn't exist — try the next candidate.
      // Anything else (401/403 RLS, 404 table) won't be fixed by reordering.
      if (r.status === 400) continue;
      console.error(`[supabase-briefing] ${TABLE} query HTTP ${r.status}: ${truncate(r.text)}`);
      return null;
    }
    let rows;
    try {
      rows = JSON.parse(r.text);
    } catch {
      console.error('[supabase-briefing] response was not JSON:', truncate(r.text));
      return null;
    }
    if (!Array.isArray(rows) || rows.length === 0) return null; // no briefing yet
    const briefing = extractBriefing(rows[0]);
    if (briefing) return briefing;
    console.error('[supabase-briefing] latest row had no recognizable briefing payload; columns:', Object.keys(rows[0] || {}).join(', '));
    return null;
  }
  return null;
}

// --- normalization ---------------------------------------------------------

function extractBriefing(row) {
  if (!row || typeof row !== 'object') return null;

  // 1) Explicit column override wins.
  if (EXPLICIT_COLUMN && row[EXPLICIT_COLUMN] != null) {
    const b = coerce(row[EXPLICIT_COLUMN]);
    if (looksLikeBriefing(b)) return b;
  }

  // 2) A known JSONB payload column holding the assembled briefing.
  for (const col of PAYLOAD_COLUMNS) {
    if (row[col] != null) {
      const b = coerce(row[col]);
      if (looksLikeBriefing(b)) return b;
    }
  }

  // 3) The row itself already carries the briefing shape (flat or per-field jsonb).
  if (looksLikeBriefing(row)) return stripMeta(row);

  return null;
}

function coerce(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
}

function looksLikeBriefing(b) {
  return Boolean(
    b &&
    typeof b === 'object' &&
    !Array.isArray(b) &&
    (Array.isArray(b.items) || Array.isArray(b.calendar) || b.date || b.briefingType)
  );
}

function stripMeta(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (!META_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

// --- misc ------------------------------------------------------------------

function dedupe(arr) {
  return [...new Set(arr)];
}

function truncate(s, n = 300) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}
