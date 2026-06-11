# Daily-Breifings

Two independent Next.js apps in one repo:

| Folder | App | Deployment |
|--------|-----|------------|
| `dailybriefingdeploy/` | **Daily Briefing** — Pete's morning briefing (action items, FYIs, next meeting), fed by scheduled Cowork tasks via Vercel KV | Original Vercel project → daily-briefings-eight.vercel.app (Root Directory: `dailybriefingdeploy`) |
| `ops-platform/` | **MIT Dining Operations Platform** — KPI scorecards, safety risk, audits, house views | Needs its own Vercel project (Root Directory: `ops-platform`) |

The apps share no code. Each folder has its own README with setup and env vars.
