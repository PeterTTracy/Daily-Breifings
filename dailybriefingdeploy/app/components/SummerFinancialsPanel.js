'use client';
import { useEffect, useState } from 'react';
import SidePanel from './SidePanel';

// Summer Session financials, read from Supabase via /api/summer-financials.
// Shows the current week's headline P&L against budget + FY25, a compact P/L
// trend across surrounding weeks, and summer-to-date totals. Replaces the old
// .eml-sourced FinancialsPanel in the left pane; the operational ScorecardPanel
// still sits below it.

const FOOD_COST_BUDGET = 5.85; // per-meal target (door-rate driven)
const SUMMER_WEEKS = 13;

// Traffic-light tones, matched to the dashboard's existing palette (see
// FinancialsPanel / ScorecardPanel).
const GOOD = 'text-[#3B6D11] dark:text-[#9FD08A]';
const BAD = 'text-highlight';
const BAR_GOOD = 'bg-[#3B6D11] dark:bg-[#9FD08A]';
const BAR_BAD = 'bg-highlight';

const num = (n) => Number(n || 0);

const fmtInt = (n) => Math.round(num(n)).toLocaleString('en-US');

// Compact money for the tight 2-col cards: $12.3k / $980 / −$1.2k.
function fmtMoneyK(n) {
  const v = num(n);
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

const fmtMoney2 = (n) => `$${num(n).toFixed(2)}`;
const signedK = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtMoneyK(Math.abs(n))}`;
const signedInt = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtInt(Math.abs(n))}`;
const signedMoney2 = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtMoney2(Math.abs(n))}`;

// "2026-07-30" → "Jul 30" (subtitle) / "7/30" (bar labels). Parsed as a local
// date so a date-only string never slips back a day across the UTC boundary.
function parseDate(str) {
  const m = String(str || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtMonthDay(str) {
  const d = parseDate(str);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : String(str || '');
}
function fmtShort(str) {
  const d = parseDate(str);
  return d ? `${d.getMonth() + 1}/${d.getDate()}` : String(str || '');
}

// One headline metric card. `favorable` (when provided) colors the value; the
// sub-line shows the comparison against budget / prior year.
function MetricCard({ label, value, sub, favorable }) {
  const tone = favorable == null ? 'text-ink' : favorable ? GOOD : BAD;
  return (
    <div className="rounded-lg border border-line bg-pagebg/50 px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-subtletext">{label}</div>
      <div className={`mt-0.5 text-[17px] font-semibold leading-none tabular-nums ${tone}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] tabular-nums text-muted">{sub}</div>}
    </div>
  );
}

// One column in the P/L trend: a bar above (positive) or below (negative) a
// shared baseline, with the week-ending label beneath. Past weeks render solid
// (actuals), future weeks faded (projections), and the current week is boxed.
function TrendBar({ week, maxAbs, state }) {
  const pl = num(week.profit_loss);
  const pos = pl >= 0;
  const frac = maxAbs > 0 ? Math.min(1, Math.abs(pl) / maxAbs) : 0;
  const h = Math.max(2, Math.round(frac * 18));
  const barColor = pos ? BAR_GOOD : BAR_BAD;
  const future = state === 'future';
  const current = state === 'current';
  return (
    <div className={`flex flex-1 flex-col items-center gap-1 rounded-md pt-1 ${current ? 'bg-subtle' : ''}`}>
      <div className="flex w-full flex-col items-center">
        <div className="flex h-[19px] w-full items-end justify-center">
          {pos && <div className={`w-2.5 rounded-t-sm ${barColor} ${future ? 'opacity-40' : ''}`} style={{ height: h }} />}
        </div>
        <div className="h-px w-full bg-line" />
        <div className="flex h-[19px] w-full items-start justify-center">
          {!pos && <div className={`w-2.5 rounded-b-sm ${barColor} ${future ? 'opacity-40' : ''}`} style={{ height: h }} />}
        </div>
      </div>
      <span className={`text-[9px] leading-none tabular-nums ${current ? 'font-semibold text-ink' : 'text-subtletext'}`}>
        {fmtShort(week.week_ending)}
      </span>
    </div>
  );
}

// One summer-to-date total row.
function TotalRow({ label, value, sub, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="min-w-0 truncate text-ink">{label}</span>
      <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
        {sub && <span className="text-[10px] text-muted">{sub}</span>}
        <span className={`font-semibold ${tone || 'text-ink'}`}>{value}</span>
      </span>
    </div>
  );
}

export default function SummerFinancialsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/summer-financials')
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ configured: true, error: 'Failed to load summer financials' }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const weeks = Array.isArray(data?.weeklyData) ? data.weeklyData : [];
  const summary = data?.summary || null;
  const budget = summary?.fy26_budget || {};
  const fy25 = summary?.fy25_actual || {};

  // Current week: trust the snapshot's index, else fall back to 8 (week ending
  // 2026-07-30). Clamp into the array so a stale index never reads out of bounds.
  const rawIdx = Number.isInteger(summary?.current_week_index) ? summary.current_week_index : 8;
  const cwi = weeks.length ? Math.max(0, Math.min(weeks.length - 1, rawIdx)) : -1;
  const current = cwi >= 0 ? weeks[cwi] : null;

  // Budget/FY25 weekly pace = summer total ÷ 13.
  const revPace = num(budget.total_revenue) / SUMMER_WEEKS;
  const fy25Meals = num(fy25.meals_served || fy25.projected_meals);
  const mealsPace = fy25Meals / SUMMER_WEEKS;

  // Summer-to-date = sum over completed weeks (everything before the current
  // in-progress week, i.e. the weeks that have actuals).
  const completed = cwi >= 0 ? weeks.slice(0, cwi) : [];
  const ytdRevenue = completed.reduce((a, w) => a + num(w.total_revenue), 0);
  const ytdPL = completed.reduce((a, w) => a + num(w.profit_loss), 0);
  const ytdMeals = completed.reduce((a, w) => a + num(w.projected_meals), 0);
  const ytdRevBudget = revPace * completed.length;
  const ytdRevVar = ytdRevenue - ytdRevBudget;

  // Trend window: 4 completed weeks + current + 1 projection (clamped).
  const start = cwi >= 0 ? Math.max(0, cwi - 4) : 0;
  const end = cwi >= 0 ? Math.min(weeks.length, cwi + 2) : Math.min(weeks.length, 6);
  const trend = weeks.slice(start, end).map((w, i) => {
    const idx = start + i;
    return { week: w, state: idx < cwi ? 'past' : idx === cwi ? 'current' : 'future' };
  });
  const trendMaxAbs = trend.reduce((m, t) => Math.max(m, Math.abs(num(t.week.profit_loss))), 0);

  const subhead = current
    ? `FY26 Summer Session · Week ending ${fmtMonthDay(current.week_ending || summary?.current_week_ending)}`
    : 'FY26 Summer Session';

  return (
    <SidePanel icon="dollar" title="Summer Financials">
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-subtle" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-subtle" />
            ))}
          </div>
        </div>
      ) : data?.configured === false ? (
        <div className="space-y-1.5 text-[11px] leading-snug text-muted">
          <p className="text-ink">Summer financials not configured.</p>
          <p>
            Set <code className="text-subtletext">SUPABASE_URL</code> and{' '}
            <code className="text-subtletext">SUPABASE_SERVICE_ROLE_KEY</code> in the Vercel project to load the summer
            session data from Supabase.
          </p>
        </div>
      ) : data?.error ? (
        <div className="space-y-1.5 text-[11px] leading-snug text-muted">
          <p className="text-highlight">Couldn&rsquo;t load summer financials.</p>
          <p>{data.error}</p>
        </div>
      ) : !current ? (
        <p className="text-[11px] text-muted">No summer financial data available yet.</p>
      ) : (
        <>
          <div className="mb-2.5 text-[11px] text-muted">{subhead}</div>

          {/* Headline metrics for the current week */}
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Revenue"
              value={fmtMoneyK(current.total_revenue)}
              sub={revPace > 0 ? `${signedK(num(current.total_revenue) - revPace)} vs pace` : 'current week'}
              favorable={revPace > 0 ? num(current.total_revenue) >= revPace : null}
            />
            <MetricCard
              label="Food Cost / Meal"
              value={fmtMoney2(current.food_cost_per_meal)}
              sub={`${signedMoney2(num(current.food_cost_per_meal) - FOOD_COST_BUDGET)} vs ${fmtMoney2(FOOD_COST_BUDGET)}`}
              favorable={num(current.food_cost_per_meal) <= FOOD_COST_BUDGET}
            />
            <MetricCard
              label="Meals Served"
              value={fmtInt(current.projected_meals)}
              sub={mealsPace > 0 ? `${signedInt(num(current.projected_meals) - mealsPace)} vs FY25` : 'current week'}
              favorable={mealsPace > 0 ? num(current.projected_meals) >= mealsPace : null}
            />
            <MetricCard
              label="P / L"
              value={fmtMoneyK(current.profit_loss)}
              sub={num(current.profit_loss) >= 0 ? 'profit this week' : 'loss this week'}
              favorable={num(current.profit_loss) >= 0}
            />
          </div>

          {/* Weekly P/L trend */}
          {trend.length > 0 && (
            <div className="mt-3.5">
              <div className="mb-1.5 flex items-baseline justify-between text-[10px] font-medium uppercase tracking-wide text-subtletext">
                <span>Weekly P/L</span>
                <span className="normal-case tracking-normal text-muted">actual · projected</span>
              </div>
              <div className="flex items-stretch gap-1">
                {trend.map((t) => (
                  <TrendBar key={t.week.week_ending} week={t.week} maxAbs={trendMaxAbs} state={t.state} />
                ))}
              </div>
            </div>
          )}

          {/* Summer-to-date totals */}
          <div className="mt-3.5 space-y-1.5 border-t border-line pt-2.5">
            <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-subtletext">
              Summer to date · {completed.length} {completed.length === 1 ? 'wk' : 'wks'}
            </div>
            <TotalRow
              label="Revenue"
              value={fmtMoneyK(ytdRevenue)}
              sub={ytdRevBudget > 0 ? `${signedK(ytdRevVar)} vs bgt` : null}
              tone={ytdRevBudget > 0 ? (ytdRevVar >= 0 ? GOOD : BAD) : undefined}
            />
            <TotalRow label="P / L" value={fmtMoneyK(ytdPL)} tone={ytdPL >= 0 ? GOOD : BAD} />
            <TotalRow label="Meals served" value={fmtInt(ytdMeals)} />
          </div>

          <div className="mt-3 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
            <p>Summer session financials · Supabase</p>
          </div>
        </>
      )}
    </SidePanel>
  );
}
