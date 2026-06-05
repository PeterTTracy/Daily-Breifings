import Link from 'next/link';
import StatusDot from '../../components/StatusDot';
import TrendArrow from '../../components/TrendArrow';
import HouseCategoryList from '../../components/HouseCategoryList';
import BiteCard from '../../components/BiteCard';
import AuditCard from '../../components/AuditCard';
import ChildLocations from '../../components/ChildLocations';
import { getHouseData, getChildren } from '../../../lib/data';
import { getBite, BITE_MONTH, BITE_CAMPUS_AVG } from '../../../lib/bite-data';
import { getChecklist } from '../../../lib/checklist-data';

export const dynamic = 'force-dynamic';

export default async function HousePage({ params }) {
  const view = await getHouseData(params.slug);

  if (!view.house) {
    return (
      <div className="py-12 text-center">
        <h1 className="m-0 text-xl font-medium text-heading">
          {view.inactive ? 'House offline' : 'Unknown house'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {view.inactive
            ? `${params.slug} is currently offline and hidden from the app.`
            : `“${params.slug}” isn’t a known house.`}
        </p>
        <Link href="/portfolio" className="mt-4 inline-block text-sm text-accent">
          ← Back to Portfolio
        </Link>
      </div>
    );
  }

  const h = view.house;
  const bite = getBite(h.slug);
  const audit = getChecklist(h.slug);
  const children = getChildren(h.slug);

  return (
    <div>
      <Link href="/portfolio" className="text-[13px] text-accent">
        ← Portfolio
      </Link>

      <div className="mb-4 mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StatusDot color={view.color} size="lg" />
          <div>
            <h1 className="m-0 text-[22px] font-medium text-heading">{h.name}</h1>
            <div className="text-xs text-muted">
              {h.type === 'cluster' ? 'Retail cluster' : 'Residential house'}
              {view.hasData && view.period ? (
                <>
                  {' '}
                  · {view.period}
                  {view.prev ? <span className="opacity-60"> vs {view.prev}</span> : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
        {view.hasData && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="tabular-nums text-muted">{view.score.toFixed(2)}</span>
            <TrendArrow trend={view.trend} />
          </div>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-line bg-subtle px-3.5 py-2.5 text-[13px]">
        <span className="text-muted">EC:</span> <span className="text-ink">{h.ec_name || 'TBD'}</span>
        <span className="text-muted"> · </span>
        <span className="text-ink">{h.contact || 'TBD'}</span>
      </div>

      {view.hasData ? (
        <div className="mb-6">
          <HouseCategoryList categories={view.categories} />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-line bg-surface p-8 text-center">
          <p className="m-0 text-sm text-ink">No scorecard data yet for {h.name}.</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">
            Scores will appear here once the latest scorecard is uploaded.
          </p>
        </div>
      )}

      {bite && <BiteCard bite={bite} month={BITE_MONTH} campusAvg={BITE_CAMPUS_AVG} />}
      {audit && <AuditCard audit={audit} />}

      {children.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Locations · {children.length}
          </h2>
          <ChildLocations locations={children} />
        </section>
      )}
    </div>
  );
}
