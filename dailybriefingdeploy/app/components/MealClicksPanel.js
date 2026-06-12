'use client';
import { useEffect, useRef, useState } from 'react';
import SidePanel from './SidePanel';
import Icon from './Icon';

// Sample week shown until a real export is uploaded — so the panel design is
// visible even with no data in KV. Shape matches lib/meal-clicks-parser output.
const SAMPLE = {
  source: 'MPClicksByLocandDay.XLSX',
  weekLabel: 'Apr 28 – May 4',
  weekTotal: 24890,
  sample: true,
  dailyTrend: [
    { label: 'Mon 4/28', total: 4120 },
    { label: 'Tue 4/29', total: 4360 },
    { label: 'Wed 4/30', total: 4290 },
    { label: 'Thu 5/1', total: 4010 },
    { label: 'Fri 5/2', total: 3380 },
    { label: 'Sat 5/3', total: 2330 },
    { label: 'Sun 5/4', total: 2400 },
  ],
  byLocation: [
    { name: 'Maseeh Hall', total: 5980 },
    { name: 'Next House Dining', total: 4870 },
    { name: 'Simmons Dining', total: 4120 },
    { name: 'Baker Dining', total: 3640 },
    { name: 'New Vassar Dining', total: 3510 },
    { name: 'Deans Beans Stata', total: 2770 },
  ],
  byMealPeriod: [
    { name: 'Lunch', total: 8230 },
    { name: 'Dinner', total: 7960 },
    { name: 'Breakfast', total: 5210 },
    { name: 'Brunch', total: 2140 },
    { name: 'LateNight', total: 1350 },
  ],
};

const SAMPLE_PREV = { weekTotal: 23110 };

const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const DAY_MS = 86400000;

function pct(cur, prev) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

// Horizontal bar list (locations / meal periods), sorted descending by caller.
function BarList({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate text-ink">{r.name}</span>
            <span className="shrink-0 tabular-nums text-muted">{fmt(r.total)}</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Daily trend as small vertical bars with weekday initials.
function DailyTrend({ days }) {
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="flex items-end justify-between gap-1" style={{ height: 44 }}>
      {days.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${fmt(d.total)}`}>
          <div
            className="w-full rounded-sm bg-accent/70"
            style={{ height: `${Math.max(3, (d.total / max) * 34)}px` }}
          />
          <span className="text-[9px] leading-none text-subtletext">{(d.label || '').charAt(0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MealClicksPanel() {
  const [data, setData] = useState(null); // { current, previous, uploadedAt } | null
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/meal-clicks')
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/meal-clicks', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Upload failed');
      setData({ current: json.current, previous: json.previous, uploadedAt: json.uploadedAt });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const uploadAction = (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload MPClicksByLocandDay.XLSX"
        aria-label="Upload meal-clicks XLSX"
        className="rounded-md p-0.5 text-muted hover:text-accent disabled:opacity-50"
      >
        <Icon name="upload" size={15} strokeWidth={1.9} />
      </button>
    </>
  );

  const hasReal = Boolean(data?.current);
  const view = hasReal ? data.current : SAMPLE;
  const prevTotal = hasReal ? data.previous?.weekTotal : SAMPLE_PREV.weekTotal;
  const change = view ? pct(view.weekTotal, prevTotal) : null;
  const isSample = !hasReal;

  // "Stale" when the latest upload is more than ~10 days old.
  const stale = hasReal && data.uploadedAt && Date.now() - data.uploadedAt > 10 * DAY_MS;

  return (
    <SidePanel icon="chart" title="Meal Plan Clicks" action={uploadAction}>
      {loading ? (
        <div className="space-y-2">
          <div className="h-6 w-1/2 animate-pulse rounded bg-subtle" />
          <div className="h-16 animate-pulse rounded bg-subtle" />
        </div>
      ) : (
        <>
          {/* Week total + week-over-week change */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[22px] font-semibold leading-none tabular-nums text-ink">{fmt(view.weekTotal)}</div>
              <div className="mt-1 text-[10px] text-muted">clicks · {view.weekLabel || 'this week'}</div>
            </div>
            {change != null && (
              <span
                className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium ${
                  change >= 0 ? 'text-[#3B6D11] dark:text-[#9FD08A]' : 'text-highlight'
                }`}
              >
                <Icon name={change >= 0 ? 'trendUp' : 'trendDown'} size={12} strokeWidth={2} />
                {change >= 0 ? '+' : ''}
                {change}% WoW
              </span>
            )}
          </div>

          {/* Daily trend */}
          {view.dailyTrend?.length > 0 && (
            <div className="mt-3">
              <DailyTrend days={view.dailyTrend} />
            </div>
          )}

          {/* By location */}
          {view.byLocation?.length > 0 && (
            <div className="mt-3.5">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-subtletext">By location</div>
              <BarList rows={view.byLocation} />
            </div>
          )}

          {/* By meal period */}
          {view.byMealPeriod?.length > 0 && (
            <div className="mt-3.5">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-subtletext">By meal period</div>
              <BarList rows={view.byMealPeriod} />
            </div>
          )}

          {/* Notes / attribution */}
          <div className="mt-3 space-y-1 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
            {isSample && <p className="text-muted">Sample data — upload an export to replace.</p>}
            {stale && <p className="text-muted">Data may be stale — likely no clicks during summer break.</p>}
            {err && <p className="text-highlight">Upload failed: {err}</p>}
            {uploading && <p className="text-muted">Parsing upload…</p>}
            <p>TechCash · {view.source || 'MPClicksByLocandDay.XLSX'}</p>
          </div>
        </>
      )}
    </SidePanel>
  );
}
