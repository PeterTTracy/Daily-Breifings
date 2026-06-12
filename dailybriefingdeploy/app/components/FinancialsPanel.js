'use client';
import { useEffect, useRef, useState } from 'react';
import SidePanel from './SidePanel';
import Icon from './Icon';

// Financial KPIs from Ahmed Mueed's weekly "Food & Labor KPIs" email. Upload the
// .eml (button in the panel header) → /api/financials parses it → renders here.
// Until a real email is uploaded, SAMPLE keeps the layout visible. Shape matches
// lib/financial-parser output.
const SAMPLE = {
  source: 'sample',
  sample: true,
  weekEndingLabel: 'May 14, 2026',
  period: 8,
  week: 2,
  summary: {
    cpm: { actual: 7.28, budget: 6.79 },
    swipes: { actual: 23688, budget: 23859 },
    participation: { actual: 72.3, budget: 70.1 },
    ot: { actual: 1182, budget: 797 },
  },
  houses: [
    { name: 'Baker', cpm: 7.1, budgetedCpm: 6.7, cpmVariance: 0.4 },
    { name: 'Next', cpm: 7.25, budgetedCpm: 6.78, cpmVariance: 0.47 },
    { name: 'Simmons', cpm: 7.36, budgetedCpm: 7.05, cpmVariance: 0.31 },
    { name: 'McCormick', cpm: 7.06, budgetedCpm: 7.15, cpmVariance: -0.09 },
    { name: 'Maseeh', cpm: 7.39, budgetedCpm: 6.71, cpmVariance: 0.68 },
    { name: 'New Vassar', cpm: 7.15, budgetedCpm: 7.09, cpmVariance: 0.06 },
  ],
};

const DAY_MS = 86400000;
const GOOD = 'text-[#3B6D11] dark:text-[#9FD08A]';
const BAD = 'text-highlight';

const fmtInt = (n) => Number(n || 0).toLocaleString('en-US');
const fmtMoney2 = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtPct = (n) => `${Number(n || 0)}%`;
const signed = (n, fmt) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`;

// One headline KPI. `lowerIsBetter` flips the favorable direction (CPM and OT
// are good when under budget; swipes and participation are good when at/over).
function KpiCard({ label, metric, fmt, lowerIsBetter }) {
  if (!metric) return null;
  const { actual, budget } = metric;
  const delta = Math.round((actual - budget) * 100) / 100;
  const favorable = lowerIsBetter ? actual <= budget : actual >= budget;
  const tone = delta === 0 ? 'text-ink' : favorable ? GOOD : BAD;
  return (
    <div className="rounded-lg border border-line bg-pagebg/50 px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-subtletext">{label}</div>
      <div className={`mt-0.5 text-[17px] font-semibold leading-none tabular-nums ${tone}`}>{fmt(actual)}</div>
      <div className="mt-1 text-[10px] tabular-nums text-muted">
        {delta === 0 ? 'on budget' : signed(delta, fmt)} vs {fmt(budget)}
      </div>
    </div>
  );
}

export default function FinancialsPanel() {
  const [data, setData] = useState(null); // { current, previous, uploadedAt } | null
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/financials')
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
      const res = await fetch('/api/financials', { method: 'POST', body: fd });
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
      <input ref={fileRef} type="file" accept=".eml,message/rfc822" onChange={onFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload Weekly Food & Labor KPIs .eml"
        aria-label="Upload financial KPIs email"
        className="rounded-md p-0.5 text-muted hover:text-accent disabled:opacity-50"
      >
        <Icon name="upload" size={15} strokeWidth={1.9} />
      </button>
    </>
  );

  const hasReal = Boolean(data?.current);
  const view = hasReal ? data.current : SAMPLE;
  const isSample = !hasReal;
  const stale = hasReal && data.uploadedAt && Date.now() - data.uploadedAt > 14 * DAY_MS;

  const s = view?.summary || {};
  const pw = view?.period != null && view?.week != null ? `P${view.period}W${view.week}` : null;
  const subhead = [view?.weekEndingLabel && `Week ending ${view.weekEndingLabel}`, pw].filter(Boolean).join(' · ');

  return (
    <SidePanel icon="dollar" title="Financial KPIs" action={uploadAction}>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-subtle" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-14 animate-pulse rounded bg-subtle" />
            <div className="h-14 animate-pulse rounded bg-subtle" />
            <div className="h-14 animate-pulse rounded bg-subtle" />
            <div className="h-14 animate-pulse rounded bg-subtle" />
          </div>
        </div>
      ) : (
        <>
          {subhead && <div className="mb-2.5 text-[11px] text-muted">{subhead}</div>}

          {/* Headline KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <KpiCard label="Cost / Meal" metric={s.cpm} fmt={fmtMoney2} lowerIsBetter />
            <KpiCard label="Total Swipes" metric={s.swipes} fmt={fmtInt} />
            <KpiCard label="Participation" metric={s.participation} fmt={fmtPct} />
            <KpiCard label="OT Hours" metric={s.ot} fmt={fmtInt} lowerIsBetter />
          </div>

          {/* Per-house CPM vs budget */}
          {view?.houses?.length > 0 && (
            <div className="mt-3.5">
              <div className="mb-1.5 flex items-baseline justify-between text-[10px] font-medium uppercase tracking-wide text-subtletext">
                <span>House · CPM</span>
                <span>vs budget</span>
              </div>
              <div className="space-y-1">
                {view.houses.map((h) => {
                  const over = h.cpmVariance > 0;
                  const tone = h.cpmVariance === 0 ? 'text-muted' : over ? BAD : GOOD;
                  return (
                    <div key={h.name} className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="min-w-0 truncate text-ink">{h.name}</span>
                      <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                        <span className="text-muted">{fmtMoney2(h.cpm)}</span>
                        <span className={`w-12 text-right font-medium ${tone}`}>
                          {h.cpmVariance === 0 ? '—' : signed(h.cpmVariance, fmtMoney2)}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes / attribution */}
          <div className="mt-3 space-y-1 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
            {isSample && <p className="text-muted">Sample data — upload the weekly KPIs email to replace.</p>}
            {stale && <p className="text-muted">Data may be stale — last upload over two weeks ago.</p>}
            {err && <p className="text-highlight">Upload failed: {err}</p>}
            {uploading && <p className="text-muted">Parsing email…</p>}
            <p>Food &amp; Labor KPIs · Ahmed Mueed</p>
          </div>
        </>
      )}
    </SidePanel>
  );
}
