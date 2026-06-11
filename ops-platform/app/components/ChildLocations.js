'use client';

import { useState } from 'react';

// Expandable list of child locations for a cluster house (e.g. the retail cafés
// under /house/retail). Each row expands to a short note — individual cafés roll
// up into the cluster and don't have their own scorecard/survey data yet.
export default function ChildLocations({ locations }) {
  const [open, setOpen] = useState({});

  return (
    <div className="flex flex-col gap-2">
      {locations.map((loc) => {
        const isOpen = !!open[loc.slug];
        return (
          <div key={loc.slug} className="overflow-hidden rounded-xl border border-line bg-surface">
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [loc.slug]: !o[loc.slug] }))}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
            >
              <span className="text-sm font-medium text-ink">{loc.name}</span>
              <span className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
            </button>
            {isOpen ? (
              <div className="border-t border-line px-3.5 py-3 text-[13px] text-muted">
                Rolls up into the Retail cluster. No individual scorecard or BITE survey data
                for this café yet — see the aggregate audit above.
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
