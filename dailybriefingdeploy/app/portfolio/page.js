import Link from 'next/link';
import StatusDot from '../components/StatusDot';
import TrendArrow from '../components/TrendArrow';
import { getPortfolioData } from '../../lib/data';
import { getChecklist, ratingColor } from '../../lib/checklist-data';
import { getBite } from '../../lib/bite-data';
import { getUnitRisk } from '../../lib/risk-scorecard-data';
import RiskStrip from '../components/RiskStrip';

// Always render fresh from the database (no static caching of live scores).
export const dynamic = 'force-dynamic';

const RATING_BADGE = {
  green: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#1f3019] dark:text-[#9FD08A]',
  yellow: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  red: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
};

function typeLabel(type) {
  return type === 'cluster' ? 'Retail' : 'Residential';
}

// Card for a house that has full scorecard KPIs (overall light + 6 category dots).
function ScorecardCard({ h }) {
  const risk = getUnitRisk(h.slug);
  return (
    <Link
      href={`/house/${h.slug}`}
      className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StatusDot color={h.color} size="lg" title={`Overall ${h.score.toFixed(2)}`} />
          <div>
            <div className="text-[15px] font-medium text-ink">{h.name}</div>
            <div className="text-[11px] text-muted">{typeLabel(h.type)}</div>
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
            <span className="text-[10px] leading-none text-muted">{c.short}</span>
          </div>
        ))}
      </div>

      <RiskStrip risk={risk} />
    </Link>
  );
}

// Card for a house with no scorecard KPIs (e.g. Retail). Surfaces whatever we do
// have — the operational-audit rating and BITE stars — instead of hiding it.
function NoScorecardCard({ h }) {
  const audit = getChecklist(h.slug);
  const bite = getBite(h.slug);
  const risk = getUnitRisk(h.slug);
  const dot = audit ? ratingColor(audit.rating) : 'gray';

  return (
    <Link
      href={`/house/${h.slug}`}
      className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StatusDot color={dot} size="lg" title={audit ? `Audit: ${audit.rating}` : 'No data'} />
          <div>
            <div className="text-[15px] font-medium text-ink">{h.name}</div>
            <div className="text-[11px] text-muted">{typeLabel(h.type)}</div>
          </div>
        </div>
        {audit ? (
          <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${RATING_BADGE[dot]}`}>
            {audit.rating}
          </span>
        ) : null}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-muted">
        <span>No scorecard data</span>
        <span className="flex items-center gap-2.5 tabular-nums">
          {audit ? <span>audit {audit.avgTotal.toFixed(1)} avg</span> : null}
          {bite ? <span>{bite.stars.toFixed(1)}★ BITE</span> : null}
        </span>
      </div>

      <RiskStrip risk={risk} />
    </Link>
  );
}

export default async function PortfolioPage() {
  const { period, previous, houses } = await getPortfolioData();

  if (!houses.length) {
    return (
      <div>
        <h1 className="m-0 mb-5 text-[22px] font-medium text-heading">Portfolio</h1>
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="m-0 text-sm text-ink">No scorecard data yet.</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">
            Upload the latest scorecard to populate house lights and trends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <h1 className="m-0 text-[22px] font-medium text-heading">Portfolio</h1>
        {period ? (
          <div className="text-[11px] text-muted">
            {period}
            {previous ? <span className="opacity-60"> vs {previous}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {houses.map((h) =>
          h.hasScorecard ? <ScorecardCard key={h.slug} h={h} /> : <NoScorecardCard key={h.slug} h={h} />
        )}
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
