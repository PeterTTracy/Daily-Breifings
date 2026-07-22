# Daily Briefing

Pete's mobile-first morning briefing — prioritized action items, FYIs, and the
next meeting, synthesized from Outlook email/calendar by scheduled Cowork tasks.

This folder is the **Root Directory** of the original Vercel project
(daily-briefings-eight.vercel.app). The MIT Dining ops platform that used to
share this app now lives in `../ops-platform` with its own deployment.

## How it works

- `/` — the briefing (client page; also installable as a PWA)
- `GET /api/briefing` — current briefing JSON. **Reads Supabase first** (the `briefings` table, where the scheduled routine now assembles the briefing via `execute_sql` + `trigger_recap()`), then falls back to Vercel KV, then to sample data. See "Where the briefing is read from" below.
- `POST /api/briefing` — legacy push path: writes a briefing into Vercel KV (requires `x-api-key` header). Still works as a manual override; the primary pipeline now writes to Supabase directly.
- `POST /api/complete` — toggles an item's completed flag in KV
- `/login` + `middleware.js` — site password gate (fails open until `SITE_PASSWORD` is set)

Manual items, dismissed/promoted FYIs, and the theme persist in localStorage.

## Posting a briefing (the scheduled pipeline)

The briefing is produced by a scheduled Cowork/claude.ai routine
(`continuous-briefing-pull`): it reads Outlook email + calendar, assembles the
briefing JSON, then **POSTs it to `/api/briefing`**. The pull and build steps are
reliable; the **POST step is the one that has failed repeatedly** and left the
live app stale.

**Root cause of the misses:** the POST was attempted through a path that does not
exist in a headless/cron run — a browser / Chrome-extension fetch, or a sandbox
whose network egress differs from an interactive session. A plain server-side
HTTPS POST reaches the endpoint fine (both GET and POST verified reachable, and
`proxy.js` correctly bypasses the site gate for `POST /api/briefing`).

**Rule: always post with a plain HTTP client, never the browser.** Use the
helper, which retries, verifies the write landed, and exits non-zero on failure
(the old failure mode was *silent* — the run "finished" but nothing landed):

```bash
BRIEFING_API_KEY=xxx node scripts/post-briefing.mjs briefing.json
# or:  cat briefing.json | BRIEFING_API_KEY=xxx node scripts/post-briefing.mjs
```

Equivalent one-liner if the script isn't available in the run environment:

```bash
curl -fsS -X POST https://daily-briefings-eight.vercel.app/api/briefing \
  -H "Content-Type: application/json" -H "x-api-key: $BRIEFING_API_KEY" \
  --data @briefing.json
# then GET the endpoint back and confirm the "date" field matches before calling it done.
```

Exit codes from `post-briefing.mjs`: `0` ok, `1` POST failed after retries,
`2` bad input, `3` 401 (API-key mismatch), `4` posted but the live app didn't
reflect it (wrong URL / KV lag). A run must treat any non-zero exit as a failed
post and surface it — do not report the briefing as delivered.

## Where the briefing is read from

The scheduled routine stopped POSTing to KV and now writes the briefing straight
into **Supabase** (project `tblzkwjfpiokulnjvgcv`): it ingests email/calendar with
`execute_sql`, then `trigger_recap()` assembles the briefing into the `briefings`
table. That's why the live app went stale — it was still only reading KV.

`GET /api/briefing` now reads in this order:

1. **Supabase** (`lib/supabase-briefing.js`) — newest row of the `briefings` table,
   via the PostgREST REST API with plain `fetch` (no `@supabase/supabase-js`
   dependency). Schema-tolerant: the assembled briefing is picked up whether it
   sits in a JSONB payload column (`payload`/`briefing`/`recap`/`data`/…) or the
   row itself already carries the `{date, items, calendar, …}` shape.
2. **Vercel KV** — legacy store; also the mirror target so the KV-backed
   `/api/complete` toggle keeps working. A Supabase read is mirrored into KV, but
   only overwrites when a *newer* briefing arrives (so per-item "completed"
   toggles on the current briefing aren't clobbered on the next load).
3. **Sample data** — when neither is configured/available.

Any Supabase failure (unset env, RLS denial, bad key, network) is caught and the
route falls back — it can never make the endpoint worse than KV-only.

> **To activate the Supabase read, set the env vars below on the Vercel project.**
> Without them the app silently keeps serving KV/sample (i.e. stays stale). If the
> `briefings` table has row-level security that denies anon SELECT, use the
> **service-role** key (`SUPABASE_SERVICE_ROLE_KEY`) — it only runs server-side in
> this route and is never sent to the browser.

## Environment variables

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Auto-set when Vercel KV is attached |
| `BRIEFING_API_KEY` | Secret for the POST endpoint (exact name, case-sensitive) |
| `SITE_PASSWORD` | Activates the password gate (fails open while unset) |
| `AUTH_SECRET` | Secret mixed into the auth cookie hash |
| `SUPABASE_URL` | Supabase project URL, e.g. `https://tblzkwjfpiokulnjvgcv.supabase.co` (also accepts `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Preferred key for the server-side briefing read (bypasses RLS). Falls back to `SUPABASE_KEY` / `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_BRIEFING_TABLE` | *(optional)* Override the table name (default `briefings`) |
| `SUPABASE_BRIEFING_ORDER` | *(optional)* Override the "latest" ordering column (default tries `created_at`, `inserted_at`, `updated_at`, `id`) |
| `SUPABASE_BRIEFING_COLUMN` | *(optional)* Force the JSONB column that holds the assembled briefing |
