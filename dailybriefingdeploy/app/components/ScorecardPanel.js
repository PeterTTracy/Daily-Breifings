'use client';
import { useEffect, useState } from 'react';
import SidePanel from './SidePanel';
import Icon from './Icon';

// Operational KPI scorecard, read from Supabase via /api/scorecard. Shows each
// house's overall weighted score (0–3) with a green/yellow/red rating, a period
// selector, and expandable per-category / per-KPI breakdowns. Sits in the left
// pane alongside FinancialsPanel — this is the operational scorecard, distinct
// from the .eml-sourced financial KPIs.

// Traffic-light styling. Green/red reuse the dashboard's existing tones; yellow
// is an amber tuned for legibility in both light and dark.
const COLOR = {
  green: { dot: 'bg-[#3B6D11] dark:bg-[#9FD08A]', text: 'text-[#3B6D11] dark:text-[#9FD08A]' },
  yellow: { dot: 'bg-[#B8860B] dark:bg-[#E8C15A]', text: 'text-[#8A6D0B] dark:text-[#E8C15A]' },
  red: { dot: 'bg-highlight', text: 'text-highlight' },
  gray: { dot: 'bg-subtletext', text: 'text-subtletext' },
};

const tone = (c) => COLOR[c] || COLOR.gray;
const fmtScore = (n) => (n == null ? '—' : Number(n).toFixed(2));

function Dot({ color, size = 8 }) {
  return <span className={`inline-block shrink-0 rounded-full ${tone(color).dot}`} style={{ width: size, height: size }} />;
}

// One KPI row inside an expanded category.
function KpiRow({ kpi }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-[11px]">
      <span className="flex min-w-0 items-center gap-1.5">
        <Dot color={kpi.color} size={6} />
        <span className="min-w-0 truncate text-ink">{kpi.name}</span>
      </span>
      <span className={`shrink-0 tabular-nums font-medium ${tone(kpi.color).text}`}>{fmtScore(kpi.score)}</span>
    </div>
  );
}

// One house: header row (name + weighted score + dot) that expands to show its
// category → KPI breakdown.
function HouseRow({ house }) {
  const [open, setOpen] = useState(false);
  const t = tone(house.color);
  return (
    <div className="rounded-lg border border-line bg-pagebg/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <Dot color={house.color} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{house.name}</span>
        <span className={`shrink-0 text-[14px] font-semibold leading-none tabular-nums ${t.text}`}>
          {fmtScore(house.weightedScore)}
        </span>
        <Icon
          name="chevron"
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-line px-2.5 pb-2.5 pt-2">
          {house.categories?.length ? (
            house.categories.map((c) => (
              <div key={c.name}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-subtletext">
                    <Dot color={c.color} size={5} />
                    <span className="min-w-0 truncate">{c.name}</span>
                  </span>
                  <span className={`shrink-0 tabular-nums text-[10px] font-semibold ${tone(c.color).text}`}>
                    {fmtScore(c.score)}
                  </span>
                </div>
                <div className="pl-1">
                  {c.kpis?.map((k) => (
                    <KpiRow key={k.id ?? k.name} kpi={k} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted">No KPI detail for this house.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScorecardPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(null); // selected period label, or null = server default

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const qs = period ? `?period=${encodeURIComponent(period)}` : '';
    fetch(`/api/scorecard${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setData(d);
        // Adopt the server's chosen period so the dropdown reflects reality.
        if (d?.period && period == null) setPeriod(d.period);
      })
      .catch(() => alive && setData({ configured: true, error: 'Failed to load scorecard' }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period]);

  const periods = data?.periods || [];

  const periodSelector =
    periods.length > 0 ? (
      <select
        value={period || data?.period || ''}
        onChange={(e) => setPeriod(e.target.value)}
        aria-label="Scorecard period"
        className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {periods.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    ) : null;

  const configured = data?.configured;
  const houses = data?.houses || [];

  return (
    <SidePanel icon="chart" title="Ops Scorecard" action={periodSelector}>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-subtle" />
          <div className="h-9 animate-pulse rounded bg-subtle" />
          <div className="h-9 animate-pulse rounded bg-subtle" />
          <div className="h-9 animate-pulse rounded bg-subtle" />
        </div>
      ) : configured === false ? (
        <div className="space-y-1.5 text-[11px] leading-snug text-muted">
          <p className="text-ink">Scorecard not configured.</p>
          <p>
            Set <code className="text-subtletext">SUPABASE_URL</code> and{' '}
            <code className="text-subtletext">SUPABASE_SERVICE_ROLE_KEY</code> in the Vercel project to load operational
            KPIs from Supabase.
          </p>
        </div>
      ) : data?.error ? (
        <div className="space-y-1.5 text-[11px] leading-snug text-muted">
          <p className="text-highlight">Couldn't load scorecard.</p>
          <p>{data.error}</p>
        </div>
      ) : houses.length === 0 ? (
        <p className="text-[11px] text-muted">No scorecard data for {data?.period || 'this period'}.</p>
      ) : (
        <>
          {/* Overall rating for the selected period */}
          {data?.overall && (
            <div className="mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-subtletext">
                  {data.period} · Overall
                </div>
                <div className="mt-0.5 text-[10px] text-muted">weighted · 0–3 scale</div>
              </div>
              <span className="flex items-center gap-1.5">
                <Dot color={data.overall.color} size={10} />
                <span className={`text-[20px] font-semibold leading-none tabular-nums ${tone(data.overall.color).text}`}>
                  {fmtScore(data.overall.weightedScore)}
                </span>
              </span>
            </div>
          )}

          {/* Per-house rows (tap to expand) */}
          <div className="space-y-1.5">
            {houses.map((h) => (
              <HouseRow key={h.id ?? h.name} house={h} />
            ))}
          </div>

          {/* Legend / attribution */}
          <div className="mt-3 space-y-1.5 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <Dot color="green" size={6} /> ≥ 2.5
              </span>
              <span className="flex items-center gap-1">
                <Dot color="yellow" size={6} /> 1.5–2.49
              </span>
              <span className="flex items-center gap-1">
                <Dot color="red" size={6} /> &lt; 1.5
              </span>
            </div>
            <p>Operational scorecard · Supabase</p>
          </div>
        </>
      )}
    </SidePanel>
  );
}
