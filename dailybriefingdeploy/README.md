# Daily Briefing

Pete's mobile-first morning briefing — prioritized action items, FYIs, and the
next meeting, synthesized from Outlook email/calendar by scheduled Cowork tasks.

This folder is the **Root Directory** of the original Vercel project
(daily-briefings-eight.vercel.app). The MIT Dining ops platform that used to
share this app now lives in `../ops-platform` with its own deployment.

## How it works

- `/` — the briefing (client page; also installable as a PWA)
- `GET /api/briefing` — current briefing JSON from Vercel KV (the single source of truth), falling back to sample data when KV is empty/unconfigured.
- `POST /api/briefing` — the scheduled routine pushes the assembled briefing here (requires `x-api-key` header); this write is what the GET serves.
- `POST /api/complete` — toggles an item's completed flag in KV
- `/login` + `middleware.js` — site password gate (fails open until `SITE_PASSWORD` is set)

Manual items, dismissed/promoted FYIs, and the theme persist in localStorage.

## Posting a briefing (the scheduled pipeline)

The briefing is produced by a scheduled Cowork/claude.ai routine
(`continuous-briefing-pull`): it reads Outlook email + calendar, assembles the
briefing JSON, then **POSTs it to `/api/briefing`**, which writes it to Vercel KV.
The pull and build steps are reliable; the **POST step is the one that has failed
repeatedly** and left the live app stale.

> A brief detour (2026-07-22) had the routine write to Supabase instead, with the
> app reading Supabase-first. That never landed — the `briefings` table has RLS
> default-deny, so the read needed a service-role key that was never wired, and the
> app silently fell back to stale KV. **That approach was abandoned: KV is again the
> single source of truth, and the routine POSTs here directly.** Don't reintroduce
> the Supabase read.

**Root cause of the earlier POST misses:** the POST was attempted through a path
that does not exist in a headless/cron run — a browser / Chrome-extension fetch, or
a sandbox whose network egress differs from an interactive session. A plain
server-side HTTPS POST reaches the endpoint fine (both GET and POST verified
reachable, and `proxy.js` correctly bypasses the site gate for `POST /api/briefing`).

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

## Environment variables

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Auto-set when Vercel KV is attached |
| `BRIEFING_API_KEY` | Secret for the POST endpoint (exact name, case-sensitive) |
| `SITE_PASSWORD` | Activates the password gate (fails open while unset) |
| `AUTH_SECRET` | Secret mixed into the auth cookie hash |
