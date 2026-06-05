// Compact safety-risk footer for a Portfolio card: risk score + RAG badge, open
// item count, and a closure-% bar. Reads from lib/risk-scorecard-data. Renders
// nothing when a house has no risk row (keeps cards clean). Server component.

const RAG_BADGE = {
  red: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
  yellow: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  green: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#1f3019] dark:text-[#9FD08A]',
};

const barColor = (pct) => (pct >= 60 ? 'bg-[#5a8f3c]' : pct >= 40 ? 'bg-[#C99A2E]' : 'bg-[#B5403F]');

export default function RiskStrip({ risk }) {
  if (!risk) return null;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="text-muted">Safety risk</span>
          <span className={`rounded-md px-1.5 py-0.5 font-medium uppercase ${RAG_BADGE[risk.rag]}`}>
            {risk.rag}
          </span>
        </span>
        <span className="tabular-nums text-muted">
          <span className="font-medium text-ink">{risk.riskScore}</span> score ·{' '}
          <span className="text-ink">{risk.open}</span> open
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
        <div className={`h-full rounded-full ${barColor(risk.closurePct)}`} style={{ width: `${risk.closurePct}%` }} />
      </div>
      <div className="mt-1 text-right text-[10px] tabular-nums text-muted">{risk.closurePct}% closed</div>
    </div>
  );
}
