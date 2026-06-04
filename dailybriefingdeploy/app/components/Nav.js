'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Mobile-friendly bottom navigation. Theme-aware via semantic color classes.
const ITEMS = [
  { href: '/portfolio', label: 'Portfolio', icon: '📊' },
  { href: '/status', label: 'Status', icon: '📡' },
  { href: '/my-day', label: 'My Day', icon: '📬' },
  { href: '/house/maseeh', label: 'Houses', icon: '🏛️', match: '/house' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
];

export default function Nav() {
  const pathname = usePathname() || '';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-content items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.match
            ? pathname.startsWith(item.match)
            : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
