# Pete's Daily Briefing Dashboard

A mobile-first web dashboard that synthesizes Outlook email and calendar data into prioritized action items. Deployed on Vercel, updated by scheduled Cowork tasks.

## Setup

1. Deploy to Vercel (connect this repo)
2. Add Vercel KV store (free tier) in project settings
3. Set environment variable `BRIEFING_API_KEY` to a random secret string
4. Scheduled Cowork tasks POST briefing data to `/api/briefing`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` | Auto-set when you add Vercel KV |
| `KV_REST_API_TOKEN` | Auto-set when you add Vercel KV |
| `BRIEFING_API_KEY` | Secret key for the POST endpoint |
| `ANTHROPIC_API_KEY` | (Future) For Claude Haiku email synthesis |

## API

- `GET /api/briefing` — Returns current briefing JSON
- `POST /api/briefing` — Push new briefing data (requires `x-api-key` header)
- `POST /api/complete` — Toggle item completion by id
