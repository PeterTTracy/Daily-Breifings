import Link from 'next/link';
import StatusDot from '../components/StatusDot';
import { getPeriods } from '../../lib/data';
import { getActiveSafetyIssues, getCampusSafety, SAFETY_TOP_AREAS } from '../../lib/safety-data';
import { UNIT_RISK, RISK_CATEGORIES, TOP_RISK_FACTORS, getCampusRisk } from '../../lib/risk-scorecard-data';

// Always render fresh from the database (no static caching of live scores).
export const dynamic = 'force-dynamic';

const RAG_BADGE = {
  red: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
  yellow: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  green: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#1f3019] dark:text-[#9FD08A]',
};

function SafetyIssueCard({ issue }) {
  return (
    <Link
      href={`/issue/${issue.id}`}
      className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <StatusDot color="red" size="md" />
          <span className="truncate text-sm font-medium text-ink">{issue.title}</span>
        </span>
        <span className="shrink-0 rounded-md bg-[#FCEBEB] px-2 py-0.5 text-[11px] font-medium text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]">
          HIGH
        </span>
      </div>
      <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-muted">Facts</dt>
        <dd className="m-0 text-ink">{issue.facts}</dd>
        <dt className="text-muted">Impact</dt>
        <dd className="m-0 text-ink">{issue.impact}</dd>
        <dt className="text-muted">Action</dt>
        <dd className="m-0 text-ink">{issue.action}</dd>
        <dt className="text-muted">Owner</dt>
        <dd className="m-0 text-ink">
          {issue.houseName} · {issue.owner}
        </dd>
      </dl>
    </Link>
  );
}

const barColor = (pct) => (pct >= 60 ? 'bg-[#5a8f3c]' : pct >= 40 ? 'bg-[#C99A2E]' : 'bg-[#B5403F]');

export default async function StatusPage() {
  const { current: period } = getPeriods();

  const safetyIssues = getActiveSafetyIssues();
  const safety = getCampusSafety();
  const safetyPct = Math.round(safety.rate * 100);

  const risk = getCampusRisk();
  const maxCatRisk = Math.max(...RISK_CATEGORIES.map((c) => c.risk));

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <h1 className="m-0 text-[22px] font-medium text-heading">Campus Status</h1>
        <div className="text-[11px] text-muted">
          {period ? <>{period} · </> : null}
          <span className="text-ink">{risk.units}</span> units at risk ·{' '}
          <span className="text-ink">{risk.open}</span> open
        </div>
      </div>

      {/* Unit risk ranking — where to look first */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Risk scorecard · ranked by risk
        </h2>
        <div className="flex flex-col gap-2">
          {UNIT_RISK.map((u, i) => (
            <Link
              key={u.slug}
              href={`/house/${u.slug}`}
              className="block rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-muted">{i + 1}</span>
                  <StatusDot color={u.rag} size="md" />
                  <span className="truncate text-sm font-medium text-ink">{u.name}</span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${RAG_BADGE[u.rag]}`}>
                    {u.rag}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  <span className="font-semibold text-ink">{u.riskScore}</span>
                  <span className="text-[11px] text-muted"> risk</span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                  <div className={`h-full rounded-full ${barColor(u.closurePct)}`} style={{ width: `${u.closurePct}%` }} />
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">
                  {u.open} open · {u.high} high · {u.closurePct}% closed
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Corrective actions — open HIGH findings */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Corrective actions · {safety.high} open HIGH across campus
        </h2>

        <div className="mb-3 rounded-xl border border-line bg-surface p-4 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-ink">
              <span className="text-sm font-medium tabular-nums">{safety.open}</span> open
              <span className="text-muted"> · {safety.completed} resolved of {safety.total} findings</span>
            </span>
            <span className="tabular-nums text-muted">{safetyPct}% resolved</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-subtle">
            <div className={`h-full rounded-full ${barColor(safetyPct)}`} style={{ width: `${safetyPct}%` }} />
          </div>
          {safety.best && safety.worst && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
              <span>
                Best <span className="capitalize text-ink">{safety.best.slug.replace('-', ' ')}</span>{' '}
                {Math.round(safety.best.rate * 100)}%
              </span>
              <span>
                Worst <span className="capitalize text-ink">{safety.worst.slug.replace('-', ' ')}</span>{' '}
                {Math.round(safety.worst.rate * 100)}%
              </span>
            </div>
          )}
        </div>

        {safetyIssues.length > 0 && (
          <div className="flex flex-col gap-2">
            {safetyIssues.map((issue) => (
              <SafetyIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>

      {/* Risk by category — campus-wide */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Risk by category · campus</h2>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-2.5">
            {RISK_CATEGORIES.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="min-w-0 truncate text-ink">{c.name}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {c.open} open · {c.total} total
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-[#B5403F]"
                    style={{ width: `${Math.round((c.risk / maxCatRisk) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top risk factors — highest unit × category cells */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Top risk factors</h2>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            {TOP_RISK_FACTORS.map((f) => (
              <div key={`${f.unit}-${f.category}`} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="min-w-0 truncate text-ink">
                  {f.unit} <span className="text-muted">· {f.category}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium text-ink">{f.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Most common areas across campus */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Top areas of concern · campus</h2>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            {SAFETY_TOP_AREAS.map((a) => (
              <div key={a.area} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="min-w-0 truncate text-ink">{a.area}</span>
                <span className="shrink-0 tabular-nums text-muted">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
