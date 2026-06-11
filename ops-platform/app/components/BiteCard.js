import { starsTo03 } from '../../lib/bite-data';

function SubBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums">{value.toFixed(2)}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Student BITE survey card for a House View.
export default function BiteCard({ bite, month, campusAvg }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Student satisfaction · BITE {month}</h2>
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-medium tabular-nums text-ink">{bite.stars.toFixed(2)}</span>
              <span className="text-lg text-accent">★</span>
              <span className="text-[12px] text-muted">/ 5</span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {bite.responses} responses · campus avg {campusAvg.toFixed(2)}
            </div>
          </div>
          <div className="text-right text-[11px] text-muted">
            <div className="text-sm tabular-nums text-ink">{starsTo03(bite.stars).toFixed(1)}</div>
            <div>on 0–3 scale</div>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-x-5 gap-y-2.5">
          <SubBar label="Taste" value={bite.taste} />
          <SubBar label="Texture" value={bite.texture} />
          <SubBar label="Aroma" value={bite.aroma} />
          <SubBar label="Presentation" value={bite.presentation} />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[12px]">
          <span className="text-muted">Balanced / nourishing</span>
          <span className="tabular-nums text-ink">{bite.balanced.toFixed(2)} / 5</span>
        </div>
      </div>
    </section>
  );
}
