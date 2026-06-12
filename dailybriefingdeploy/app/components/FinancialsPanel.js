'use client';
import SidePanel from './SidePanel';

// Placeholder financials. Sample numbers so Pete can see the layout; wire to
// real data later by replacing METRICS with a fetch from the financials report
// (Ahmed Mueed). `tone` drives the value color vs. its target.
const METRICS = [
  { label: 'Daily Revenue', value: '$42.8K', sub: 'Net sales · all locations', tone: 'neutral' },
  { label: 'Food Cost %', value: '31.4%', sub: 'Target ≤ 32%', tone: 'good' },
  { label: 'Labor %', value: '30.8%', sub: 'Target ≤ 30%', tone: 'warn' },
];

const TONE = {
  neutral: 'text-ink',
  good: 'text-[#3B6D11] dark:text-[#9FD08A]',
  warn: 'text-[#854F0B] dark:text-[#E5BC7E]',
  bad: 'text-highlight',
};

export default function FinancialsPanel() {
  return (
    <SidePanel
      icon="dollar"
      title="Financials"
      action={<span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted">Sample</span>}
    >
      <div className="space-y-2.5">
        {METRICS.map((m) => (
          <div key={m.label} className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[12px] text-muted">{m.label}</div>
              <div className="text-[10px] text-subtletext">{m.sub}</div>
            </div>
            <div className={`shrink-0 text-[15px] font-semibold tabular-nums ${TONE[m.tone]}`}>{m.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
        Data source: pending — financial reports from Ahmed Mueed.
      </p>
    </SidePanel>
  );
}
