import Link from 'next/link';
import StatusDot from '../components/StatusDot';
import TrendArrow from '../components/TrendArrow';
import { getStatusData } from '../../lib/data';
import { getActiveSafetyIssues, getCampusSafety, SAFETY_TOP_AREAS } from '../../lib/safety-data';

// Always render fresh from the database (no static caching of live scores).
export const dynamic = 'force-dynamic';

const YELLOW_LIMIT = 12;

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

function KpiRow({ item }) {
  return (
    <Link
      href={`/house/${item.houseSlug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <StatusDot color={item.color} size="md" />
        <div className="min-w-0">
          <div className="truncate text-sm text-ink">{item.kpi}</div>
          <div className="text-[11px] text-muted">
            {item.houseName} · {item.category}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm">
        <span className="tabular-nums text-muted">{item.score.toFixed(1)}</span>
        <TrendArrow trend={item.trend} />
      </div>
    </Link>
  );
}

export default async function StatusPage() {
  const { period, reds, yellows } = await getStatusData();
  const shownYellows = yellows.slice(0, YELLOW_LIMIT);
  const extraYellows = yellows.length - shownYellows.length;

  const safetyIssues = getActiveSafetyIssues();
  const safety = getCampusSafety();
  const safetyPct = Math.round(safety.rate * 100);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <h1 className="m-0 text-[22px] font-medium text-heading">Campus Status</h1>
        {period && (
          <div className="text-[11px] text-muted">
            {period} · <span className="text-ink">{reds.length}</span> red ·{' '}
            <span className="text-ink">{yellows.length}</span> yellow
          </div>
        )}
      </div>

      {/* Safety — open HIGH findings from the 2026 Safety Tracker */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Safety · {safety.high} open HIGH across campus
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
            <div
              className={`h-full rounded-full ${safety.rate >= 0.6 ? 'bg-[#5a8f3c]' : safety.rate >= 0.4 ? 'bg-[#C99A2E]' : 'bg-[#B5403F]'}`}
              style={{ width: `${safetyPct}%` }}
            />
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
          <div className="mb-3 flex flex-col gap-2">
            {safetyIssues.map((issue) => (
              <SafetyIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}

        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            Top areas of concern · campus
          </div>
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

      {!period && (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="m-0 text-sm text-ink">No scorecard data yet.</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">
            Once the latest scorecard is uploaded, items needing attention will surface here.
          </p>
        </div>
      )}

      {period && reds.length === 0 && yellows.length === 0 && (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-muted">
          All green across campus — nothing needs attention right now.
        </div>
      )}

      {reds.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            KPIs needing attention · {reds.length}
          </h2>
          <div className="flex flex-col gap-2">
            {reds.map((item, i) => (
              <KpiRow key={`r${i}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {shownYellows.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Watch · {yellows.length}</h2>
          <div className="flex flex-col gap-2">
            {shownYellows.map((item, i) => (
              <KpiRow key={`y${i}`} item={item} />
            ))}
          </div>
          {extraYellows > 0 && (
            <p className="mt-3 text-center text-[11px] text-muted">
              + {extraYellows} more watch items — see the house views for detail.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
