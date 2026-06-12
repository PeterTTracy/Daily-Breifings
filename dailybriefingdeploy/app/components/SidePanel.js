'use client';
import { useState } from 'react';
import Icon from './Icon';

// Card wrapper for the left/right dashboard panes. On wide screens (xl) the
// body is always shown; below xl a chevron collapses it so the side panes don't
// crowd the briefing on phones/tablets. `action` renders an extra control
// (e.g. an upload button) in the header.
export default function SidePanel({ icon, title, action, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        {icon && <Icon name={icon} size={15} strokeWidth={1.9} className="shrink-0 text-accent" />}
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <div className="ml-auto flex items-center gap-1">
          {action}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            aria-expanded={open}
            className="rounded-md p-0.5 text-muted hover:text-ink xl:hidden"
          >
            <Icon name="chevron" size={16} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
          </button>
        </div>
      </div>
      <div className={`${open ? 'block' : 'hidden'} p-3.5 xl:!block`}>{children}</div>
    </section>
  );
}
