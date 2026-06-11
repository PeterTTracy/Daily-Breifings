'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Read the original destination (set by the middleware redirect).
        let dest = '/portfolio';
        try {
          const from = new URLSearchParams(window.location.search).get('from');
          if (from && from.startsWith('/') && !from.startsWith('//')) dest = from;
        } catch (e) {}
        router.replace(dest);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Incorrect password');
      }
    } catch (e) {
      setError('Something went wrong — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 text-center shadow-sm"
      >
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="h-4 w-4 rounded-[3px] bg-accent" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-ink">MIT Dining Operations</span>
        </div>
        <h1 className="m-0 text-lg font-medium text-heading">Sign in</h1>
        <p className="mb-5 mt-1 text-[13px] text-muted">Enter the team password to continue.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          className="mb-3 w-full rounded-lg border border-line bg-pagebg px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
        />

        {error && <p className="mb-3 text-[13px] text-[#E24B4A]">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
