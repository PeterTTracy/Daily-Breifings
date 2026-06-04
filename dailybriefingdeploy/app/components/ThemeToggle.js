'use client';
import { useEffect, useState } from 'react';

// Toggles the `.dark` class on <html> and persists the choice. Initial class is
// already set pre-paint by the no-flash script in layout.js; this just syncs the
// button icon after hydration.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const el = document.documentElement;
    const next = !el.classList.contains('dark');
    el.classList.toggle('dark', next);
    try {
      localStorage.setItem('briefing-theme', next ? 'dark' : 'light');
    } catch (e) {}
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="rounded-lg border border-line px-2.5 py-1.5 text-[15px] leading-none text-ink transition-colors hover:bg-subtle"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
