import Link from 'next/link';
import StatusDot from '../components/StatusDot';
import TrendArrow from '../components/TrendArrow';
import { getStatusData } from '../../lib/data';

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

export default async function StatusPage() {
  const { period, reds, yellows } = await getStatusData();
  const shownYellows = yellows.slice(0, YELLOW_LIMIT);
  const extraYellows = yellows.length - shownYellows.length;

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
