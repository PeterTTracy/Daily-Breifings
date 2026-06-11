# Daily Briefing

Pete's mobile-first morning briefing — prioritized action items, FYIs, and the
next meeting, synthesized from Outlook email/calendar by scheduled Cowork tasks.

This folder is the **Root Directory** of the original Vercel project
(daily-briefings-eight.vercel.app). The MIT Dining ops platform that used to
share this app now lives in `../ops-platform` with its own deployment.

## How it works

- `/` — the briefing (client page; also installable as a PWA)
- `GET /api/briefing` — current briefing JSON from Vercel KV (sample data when KV is empty/unconfigured)
- `POST /api/briefing` — scheduled task pushes a new briefing (requires `x-api-key` header)
- `POST /api/complete` — toggles an item's completed flag in KV
- `/login` + `middleware.js` — site password gate (fails open until `SITE_PASSWORD` is set)

Manual items, dismissed/promoted FYIs, and the theme persist in localStorage.

## Environment variables

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Auto-set when Vercel KV is attached |
| `BRIEFING_API_KEY` | Secret for the POST endpoint (exact name, case-sensitive) |
| `SITE_PASSWORD` | Activates the password gate (fails open while unset) |
| `AUTH_SECRET` | Secret mixed into the auth cookie hash |
