'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Mobile-friendly bottom navigation. Briefing leads — it's the home view.
const ITEMS = [
  { href: '/my-day', label: 'Briefing', icon: '📰' },
  { href: '/portfolio', label: 'Portfolio', icon: '📊' },
  { href: '/status', label: 'Status', icon: '📡' },
  { href: '/house/maseeh', label: 'Houses', icon: '🏛️', match: '/house' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
];

export default function Nav() {
  const pathname = usePathname() || '';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-content items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.match ? pathname.startsWith(item.match) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-accent" aria-hidden="true" />
              )}
              <span className="text-[17px] leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
