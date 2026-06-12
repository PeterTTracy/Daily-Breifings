'use client';
import SidePanel from './SidePanel';
import Icon from './Icon';

// Placeholder catering events. Replace EVENTS with a fetch from CaterTrax once
// that integration lands; the card shape (name/when/where/headcount/dietary)
// mirrors what we'll pull.
const EVENTS = [
  {
    name: 'MIT Corporation Luncheon',
    when: 'Tue · 12:00 PM',
    where: 'Morss Hall, Walker Memorial',
    headcount: 120,
    dietary: '14 vegetarian · 4 GF · 2 nut allergy',
  },
  {
    name: 'Sloan Exec Ed Breakfast',
    when: 'Wed · 8:00 AM',
    where: 'E62 Faculty Dining',
    headcount: 45,
    dietary: '6 vegan · 3 GF',
  },
  {
    name: 'Commencement Donor Reception',
    when: 'Fri · 5:30 PM',
    where: 'Samberg Conference Center',
    headcount: 200,
    dietary: 'Passed apps · 2 kosher meals',
  },
];

export default function CateringPanel() {
  return (
    <SidePanel
      icon="utensils"
      title="This Week's Catering"
      action={<span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted">Placeholder</span>}
    >
      <div className="space-y-2.5">
        {EVENTS.map((e) => (
          <div key={e.name} className="rounded-lg border border-line bg-pagebg p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[13px] font-medium leading-snug text-ink">{e.name}</div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-accent">
                <Icon name="users" size={12} strokeWidth={2} /> {e.headcount}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
              <Icon name="clock" size={11} strokeWidth={2} className="shrink-0" />
              <span>{e.when}</span>
            </div>
            <div className="text-[11px] text-muted">{e.where}</div>
            {e.dietary && <div className="mt-1 text-[10px] text-subtletext">{e.dietary}</div>}
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
        Data source: CaterTrax — integration pending.
      </p>
    </SidePanel>
  );
}
