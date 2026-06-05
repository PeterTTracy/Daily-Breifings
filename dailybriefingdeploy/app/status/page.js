import Link from 'next/link';
import StatusDot from '../components/StatusDot';
import TrendArrow from '../components/TrendArrow';
import SeverityBadge from '../components/SeverityBadge';
import { getStatusData, CURRENT_PERIOD } from '../../lib/data';
import { getOpenIssues } from '../../lib/mock-issues';

// Always render fresh from the database (no static caching of live scores).
export const dynamic = 'force-dynamic';

const YELLOW_LIMIT = 12;

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

function IssueRow({ issue }) {
  return (
    <Link
      href={`/issue/${issue.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent"
    >
      <div className="min-w-0">
        <div className="truncate text-sm text-ink">{issue.title}</div>
        <div className="text-[11px] text-muted">
          {issue.houseName} · {issue.category}
        </div>
      </div>
      <SeverityBadge severity={issue.severity} />
    </Link>
  );
}

export default async function StatusPage() {
  const { reds, yellows } = await getStatusData();
  const issues = getOpenIssues();
  const shownYellows = yellows.slice(0, YELLOW_LIMIT);
  const extraYellows = yellows.length - shownYellows.length;
  const allClear = issues.length === 0 && reds.length === 0 && yellows.length === 0;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <h1 className="m-0 text-[22px] font-medium text-heading">Campus Status</h1>
        <div className="text-[11px] text-muted">
          {CURRENT_PERIOD} · <span className="text-ink">{issues.length}</span> issues ·{' '}
          <span className="text-ink">{reds.length}</span> red · <span className="text-ink">{yellows.length}</span>{' '}
          yellow
        </div>
      </div>

      {allClear && (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-muted">
          All green across campus — nothing needs attention right now.
        </div>
      )}

      {issues.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Open issues · {issues.length}</h2>
          <div className="flex flex-col gap-2">
            {issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        </section>
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
