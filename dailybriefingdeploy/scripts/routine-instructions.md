# `continuous-briefing-pull` — routine instructions (KV pipeline)

Paste this into the claude.ai routine that generates the Daily Briefing. It
replaces any Supabase step (`execute_sql` ingest / `trigger_recap()` / writing to
the `briefings` table). **The routine's job ends with a verified POST to KV** — the
live app reads only KV.

> Why the change: the Supabase path never reached the live app. The `briefings`
> table has RLS default-deny, so `GET /api/briefing` (even with a service-role key
> that was never wired) fell back to stale KV. KV is now the single source of truth.

## What the routine must do

1. **Pull** — read the last ~24h of Outlook email + today/tomorrow calendar (unchanged
   from before).
2. **Build** — assemble ONE JSON object in exactly this shape and write it to
   `briefing.json`:

   ```json
   {
     "date": "Thursday, July 23, 2026",
     "briefingType": "morning",
     "alerts": [],
     "items": [
       {
         "id": "short-stable-slug-0723",
         "type": "action",
         "priority": "urgent",
         "priorityLabel": "URGENT",
         "description": "One-line what-to-do",
         "sender": "person@example.com",
         "age": "2h ago",
         "note": "optional context",
         "completed": false
       }
     ],
     "calendar": [
       { "time": "10:00 AM", "title": "…", "location": "…", "highlight": true }
     ],
     "prepNotes": "…",
     "tomorrowPreview": "…"
   }
   ```

   Field rules:
   - `date`: `"Weekday, Month D, YYYY"` (today).
   - `briefingType`: `"morning"` before 11:00, `"midday"` 11:00–15:00, else `"afternoon"`.
   - `items[].type`: `"action"` or `"fyi"`. `priority`: `"urgent"` | `"today"` | `"week"` | `"fyi"`.
     `priorityLabel` is the uppercase badge text (`URGENT`, `TODAY`, `THIS WEEK`, `FYI`, or a specific one like `DUE 7/25`).
   - `id`: stable, human-readable slug + date suffix, so the same item keeps its id across runs.
   - `completed` is always `false` on write (the app owns the toggle, in KV, via `/api/complete`).
   - `sender`/`age`/`note` may be `null`. `alerts` may be `[]`.

3. **Post to KV — with a plain HTTP client, NEVER the browser / Chrome extension.**
   The browser tool is not available in a headless/cron run; that is what caused the
   6+ silent misses. Use ONE of these:

   **A) The repo helper (preferred — retries + verifies + fails loud):**
   ```bash
   BRIEFING_API_KEY="$BRIEFING_API_KEY" node dailybriefingdeploy/scripts/post-briefing.mjs briefing.json
   ```

   **B) Plain curl (if the repo isn't checked out in the run):**
   ```bash
   curl -fsS -X POST https://daily-briefings-eight.vercel.app/api/briefing \
     -H "Content-Type: application/json" \
     -H "x-api-key: $BRIEFING_API_KEY" \
     --data @briefing.json
   ```

4. **Verify — do not report success until the live app shows the new briefing:**
   ```bash
   curl -fsS https://daily-briefings-eight.vercel.app/api/briefing | grep -o '"date":"[^"]*"'
   ```
   The printed date MUST equal the `date` you posted. (Helper A does this check
   automatically and exits non-zero on mismatch.)

5. **On any failure** (non-200 POST, non-zero helper exit, or date mismatch): treat
   the run as FAILED and surface it — never report the briefing as delivered.

## Requirements

- `BRIEFING_API_KEY` must be available to the routine as an env var, matching the
  Vercel value exactly (case-sensitive). It's the only secret the routine needs now.
- No Supabase credentials, `execute_sql`, or `trigger_recap()` — remove them.

## Exit codes (helper A)

`0` ok · `1` POST failed after retries · `2` bad input · `3` 401 key mismatch ·
`4` posted but live app didn't reflect it. Any non-zero = failed delivery.
