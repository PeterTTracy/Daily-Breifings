import Link from 'next/link';
import StatusDot from '../components/StatusDot';
import TrendArrow from '../components/TrendArrow';
import { getPortfolioView, CURRENT_PERIOD, PREVIOUS_PERIOD } from '../../lib/mock-scores';

export default function PortfolioPage() {
  const houses = getPortfolioView();

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <h1 className="m-0 text-[22px] font-medium text-heading">Portfolio</h1>
        <div className="text-[11px] text-muted">
          {CURRENT_PERIOD} <span className="opacity-60">vs {PREVIOUS_PERIOD}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {houses.map((h) => (
          <Link
            key={h.slug}
            href={`/house/${h.slug}`}
            className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StatusDot color={h.color} size="lg" title={`Overall ${h.score.toFixed(2)}`} />
                <div>
                  <div className="text-[15px] font-medium text-ink">{h.name}</div>
                  <div className="text-[11px] text-muted">{h.type === 'cluster' ? 'Retail' : 'Residential'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="tabular-nums text-muted">{h.score.toFixed(2)}</span>
                <TrendArrow trend={h.trend} />
              </div>
            </div>

            <div className="mt-3.5 flex items-start justify-between gap-1 border-t border-line pt-3">
              {h.categories.map((c) => (
                <div
                  key={c.key}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${c.name}: ${c.score.toFixed(2)}`}
                >
                  <StatusDot color={c.color} size="sm" />
                  <span className="text-[9px] leading-none text-muted">{c.short}</span>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <StatusDot color="green" size="sm" /> Green ≥ 2.5
        </span>
        <span className="flex items-center gap-1.5">
          <StatusDot color="yellow" size="sm" /> Yellow 1.5–2.49
        </span>
        <span className="flex items-center gap-1.5">
          <StatusDot color="red" size="sm" /> Red &lt; 1.5
        </span>
      </div>
    </div>
  );
}
