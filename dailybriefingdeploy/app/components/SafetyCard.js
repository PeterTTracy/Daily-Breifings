import Link from 'next/link';
import { completionRate } from '../../lib/safety-data';

// Safety Findings card for a House View. Surfaces the 2026 Safety Tracker counts
// for this house: open vs resolved, HIGH-priority load, and any flagged HIGH
// findings with detail. This is the real evidence behind the QA KPIs.
const RAG_BADGE = {
  red: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
  yellow: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  green: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#1f3019] dark:text-[#9FD08A]',
};

export default function SafetyCard({ safety, issues = [], risk = null }) {
  const rate = completionRate(safety); // 0–1
  const pct = Math.round(rate * 100);
  const resolvedColor = rate >= 0.6 ? 'bg-[#5a8f3c]' : rate >= 0.4 ? 'bg-[#C99A2E]' : 'bg-[#B5403F]';

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Safety findings · 2026 Safety Tracker
      </h2>
      <div className="rounded-xl border border-line bg-surface p-4">
        {risk && (
          <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
            <span className="flex items-center gap-2">
              <span className="text-[13px] text-muted">Risk score</span>
              <span className="text-base font-semibold tabular-nums text-ink">{risk.riskScore}</span>
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium uppercase ${RAG_BADGE[risk.rag]}`}>
              {risk.rag}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-ink">
            <span className="text-sm font-medium tabular-nums">{safety.open}</span> open
            <span className="text-muted"> · </span>
            <span className="tabular-nums">{safety.completed}</span> resolved
            <span className="text-muted"> of {safety.total}</span>
          </div>
          {safety.high > 0 ? (
            <span className="rounded-md bg-[#FCEBEB] px-2 py-0.5 text-[12px] font-medium text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]">
              {safety.high} HIGH
            </span>
          ) : null}
        </div>

        {/* resolved progress */}
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
            <div className={`h-full rounded-full ${resolvedColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
            <span>{pct}% resolved</span>
            <span className="flex items-center gap-2 tabular-nums">
              {safety.high > 0 ? <span className="text-[#A32D2D] dark:text-[#F0A3A3]">{safety.high} high</span> : null}
              {safety.med > 0 ? <span>{safety.med} med</span> : null}
              {safety.low > 0 ? <span>{safety.low} low</span> : null}
            </span>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="mt-3 border-t border-line pt-3">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Flagged HIGH</div>
            <div className="flex flex-col gap-1.5">
              {issues.map((i) => (
                <Link
                  key={i.id}
                  href={`/issue/${i.id}`}
                  className="flex items-center justify-between gap-2 text-[13px] text-ink hover:text-accent"
                >
                  <span className="min-w-0 truncate">{i.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">{i.target} ›</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] text-muted">
          Backs the QA KPIs (Sanitation, Hygiene/PPE, Logs). Most common across campus: sanitation,
          food storage, facilities.
        </p>
      </div>
    </section>
  );
}
