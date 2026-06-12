'use client';
import Icon from './Icon';

// Card wrapper for the left/right dashboard panes. The body is always shown:
// on desktop the panes sit beside the briefing, and on mobile each pane is a
// full-screen swipe frame (see Dashboard), so there's nothing to collapse.
// `action` renders an extra control (e.g. an upload button) in the header.
export default function SidePanel({ icon, title, action, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        {icon && <Icon name={icon} size={15} strokeWidth={1.9} className="shrink-0 text-accent" />}
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        {action && <div className="ml-auto flex items-center gap-1">{action}</div>}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}
