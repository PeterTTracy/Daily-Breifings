# MIT Dining Operations Platform

KPI scorecards, safety risk, audits, and house views for MIT residential dining.
Split out of the Daily Briefing app (which lives in `../dailybriefingdeploy` and
keeps the original Vercel project).

## Views

- `/portfolio` — all houses: overall R/Y/G score, trend, category dots
- `/house/[slug]` — one house: category/KPI breakdown, BITE survey, audit, safety findings, contacts
- `/status` — campus status: risk scorecard ranking, corrective actions, risk by category
- `/issue/[id]` — safety issue detail
- `/admin` — system health shell (read-only until SSO)

## Data

Scores are **hardcoded** in `lib/` (scorecard-data, safety-data, risk-scorecard-data,
bite-data, checklist-data) so the deployed app needs no database. Supabase wiring
exists (`lib/supabase.ts`, `supabase/migration.sql`, `scripts/`) but is dormant until
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

To ingest a new scorecard period: `node scripts/seed-scorecard.mjs <period> <xlsx>`
(see `lib/scorecard-parser.ts`), or edit `lib/scorecard-data.ts` directly and push.

## Deploy

Create a Vercel project pointed at this folder as the **Root Directory**.

| Variable | Description |
|----------|-------------|
| `SITE_PASSWORD` | Activates the site password gate (fails open while unset) |
| `AUTH_SECRET` | Secret mixed into the auth cookie hash |
