'use client';
import { useState } from 'react';
import StatusDot from './StatusDot';
import TrendArrow from './TrendArrow';

// Expandable category cards: tap a category to reveal its individual KPI scores.
export default function HouseCategoryList({ categories }) {
  const [open, setOpen] = useState({});
  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="flex flex-col gap-2.5">
      {categories.map((c) => {
        const isOpen = !!open[c.key];
        return (
          <div key={c.key} className="overflow-hidden rounded-xl border border-line bg-surface">
            <button
              onClick={() => toggle(c.key)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
            >
              <div className="flex items-center gap-2.5">
                <StatusDot color={c.color} size="md" />
                <span className="text-sm font-medium text-ink">{c.name}</span>
                <span className="text-[10px] text-muted">{c.weight}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="tabular-nums text-muted">{c.score.toFixed(2)}</span>
                <TrendArrow trend={c.trend} />
                <span className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-line px-3.5 py-1.5">
                {c.kpis.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <StatusDot color={k.color} size="sm" />
                      <span className="truncate text-[13px] text-ink">{k.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="tabular-nums text-muted">{k.score.toFixed(1)}</span>
                      <TrendArrow trend={k.trend} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
