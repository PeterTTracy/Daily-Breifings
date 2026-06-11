'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Shown in the header only when a session cookie is present (the server layout
// decides). Clears the cookie and returns to /login.
export default function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  if (pathname === '/login') return null;

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    router.replace('/login');
    router.refresh();
  };

  return (
    <button
      onClick={logout}
      disabled={loading}
      aria-label="Sign out"
      title="Sign out"
      className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:bg-subtle hover:text-ink disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
