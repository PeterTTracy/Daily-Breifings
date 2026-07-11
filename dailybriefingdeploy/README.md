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
- `POST /api/financials` — upload Ahmed's Weekly Food & Labor KPIs `.eml`
- `POST /api/catering` — upload the CaterTrax Invoice Report (saved HTML page, or PDF)
- `POST /api/meal-clicks` — upload the TechCash `MPClicksByLocandDay.XLSX`
- `POST /api/complete` — toggles an item's completed flag in KV
- `/login` + `proxy.js` — site password gate (fails open until `SITE_PASSWORD` is set)

### Posting data from a scheduled task (no browser cookie)

The three data-upload endpoints accept **either** the site cookie (browser
panels) **or** the `x-api-key: $BRIEFING_API_KEY` header (scheduled Claude /
Cowork tasks) — the proxy gate lets these POSTs through so the route can check
the key itself. Files can be sent as multipart (`-F file=@…`) or as the raw
body with an `x-filename` header:

```sh
# briefing JSON
curl -X POST https://daily-briefings-eight.vercel.app/api/briefing \
  -H "x-api-key: $BRIEFING_API_KEY" -H 'Content-Type: application/json' \
  -d @briefing.json

# weekly KPIs email (raw body)
curl -X POST https://daily-briefings-eight.vercel.app/api/financials \
  -H "x-api-key: $BRIEFING_API_KEY" -H 'x-filename: kpis.eml' \
  --data-binary @kpis.eml

# CaterTrax report (multipart also works)
curl -X POST https://daily-briefings-eight.vercel.app/api/catering \
  -H "x-api-key: $BRIEFING_API_KEY" -F 'file=@invoices.html'

# TechCash meal clicks
curl -X POST https://daily-briefings-eight.vercel.app/api/meal-clicks \
  -H "x-api-key: $BRIEFING_API_KEY" -F 'file=@MPClicksByLocandDay.XLSX'
```

Manual items, dismissed/promoted FYIs, and the theme persist in localStorage.

## Environment variables

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Auto-set when Vercel KV is attached |
| `BRIEFING_API_KEY` | Secret for the POST endpoint (exact name, case-sensitive) |
| `SITE_PASSWORD` | Activates the password gate (fails open while unset) |
| `AUTH_SECRET` | Secret mixed into the auth cookie hash |
