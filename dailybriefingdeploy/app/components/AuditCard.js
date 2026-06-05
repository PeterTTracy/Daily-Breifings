import StatusDot from './StatusDot';
import { scoreToColor } from '../../lib/scoring';
import { invertTo03, ratingColor, CHECKLIST_CATEGORIES } from '../../lib/checklist-data';

const RATING_BADGE = {
  green: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#1f3019] dark:text-[#9FD08A]',
  yellow: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  red: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
};

// Operational checklist-audit card for a House View.
// Audit scores are 1 (best) – 5 (worst); we color via the inverted 0–3 scale so
// high numbers read red.
export default function AuditCard({ audit }) {
  const color = ratingColor(audit.rating);
  let worstIdx = 0;
  audit.scores.forEach((s, i) => {
    if (s > audit.scores[worstIdx]) worstIdx = i;
  });

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Operational audit · Apr–May 2026</h2>
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${RATING_BADGE[color]}`}>{audit.rating}</span>
          <div className="text-right text-[11px] text-muted">
            <span className="text-sm tabular-nums text-ink">{audit.avgTotal.toFixed(1)}</span> avg total · {audit.audits}{' '}
            audits
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          {CHECKLIST_CATEGORIES.map((cat, i) => {
            const raw = audit.scores[i];
            const worst = i === worstIdx;
            return (
              <div key={cat} className="flex items-center justify-between gap-2 text-[12px]">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusDot color={scoreToColor(invertTo03(raw))} size="sm" />
                  <span className={`truncate ${worst ? 'font-medium text-ink' : 'text-muted'}`}>{cat}</span>
                </div>
                <span className={`tabular-nums ${worst ? 'text-ink' : 'text-muted'}`}>{raw.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] text-muted">
          Scored 1 (best) – 5 (worst). Worst area:{' '}
          <span className="text-ink">{CHECKLIST_CATEGORIES[worstIdx]}</span> ({audit.scores[worstIdx].toFixed(1)}).
        </p>
      </div>
    </section>
  );
}
