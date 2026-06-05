import Link from 'next/link';
import StatusDot from '../../components/StatusDot';
import TrendArrow from '../../components/TrendArrow';
import HouseCategoryList from '../../components/HouseCategoryList';
import { getHouseView } from '../../../lib/mock-scores';

export default function HousePage({ params }) {
  const view = getHouseView(params.slug);

  if (!view.house) {
    return (
      <div className="py-12 text-center">
        <h1 className="m-0 text-xl font-medium text-heading">Unknown house</h1>
        <p className="mt-2 text-sm text-muted">&ldquo;{params.slug}&rdquo; isn&rsquo;t a known house.</p>
        <Link href="/portfolio" className="mt-4 inline-block text-sm text-accent">
          ← Back to Portfolio
        </Link>
      </div>
    );
  }

  const h = view.house;

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
              {h.type === 'cluster' ? 'Retail cluster' : 'Residential house'} · {view.period}{' '}
              <span className="opacity-60">vs {view.prev}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="tabular-nums text-muted">{view.score.toFixed(2)}</span>
          <TrendArrow trend={view.trend} />
        </div>
      </div>

      <div className="mb-5 rounded-[10px] border border-line bg-subtle px-3.5 py-2.5 text-[13px]">
        <span className="text-muted">EC:</span> <span className="text-ink">{h.ec_name || 'TBD'}</span>
        <span className="text-muted"> · </span>
        <span className="text-ink">{h.contact || 'TBD'}</span>
      </div>

      <HouseCategoryList categories={view.categories} />
    </div>
  );
}
