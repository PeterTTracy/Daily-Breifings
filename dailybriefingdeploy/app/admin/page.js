import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import StatusDot from '../components/StatusDot';
import Icon from '../components/Icon';

export const dynamic = 'force-dynamic';

// Mock admin data (the users / ingestion_runs tables are RLS-locked until auth).
const INGESTION_RUNS = [
  { source: 'gmail-pull', startedAt: '2026-06-04 06:02', status: 'success', rows: 14, error: null },
  { source: 'calendar-pull', startedAt: '2026-06-04 06:02', status: 'success', rows: 3, error: null },
  { source: 'scorecard-xlsx', startedAt: '2026-06-04 05:40', status: 'failed', rows: 0, error: 'No file in intake folder' },
  { source: 'gmail-pull', startedAt: '2026-06-03 18:31', status: 'success', rows: 9, error: null },
];

// Pete's personal platform for now — single user.
const USERS = [
  { email: 'peter.tracy@cafebonappetit.com', name: 'Pete Tracy', role: 'admin', defaultView: '/my-day' },
];

const HEALTH = [
  { label: 'Supabase', ok: true, note: 'connected' },
  { label: 'Vercel KV', ok: true, note: 'connected' },
  { label: 'Last briefing pull', ok: true, note: '06:02 today' },
  { label: 'Scorecard ingestion', ok: false, note: 'P9 file pending' },
];

const runColor = (s) => (s === 'success' ? 'green' : s === 'failed' ? 'red' : 'yellow');

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <h1 className="m-0 mb-1 text-[22px] font-medium text-heading">Admin</h1>
      <p className="mb-4 text-[13px] text-muted">Ingestion health, users &amp; roles, and system status.</p>

      {!session && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line bg-subtle px-4 py-3 text-[13px] text-subtletext">
          <Icon name="lock" size={15} strokeWidth={1.9} className="mt-[2px] shrink-0 text-muted" />
          <div>
            <span className="font-medium text-ink">Requires login.</span> Azure AD sign-in isn&rsquo;t enabled yet, so
            this is a read-only preview. Once SSO is live, this page will require an admin session.
          </div>
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">System health</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HEALTH.map((h) => (
            <div key={h.label} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
              <StatusDot color={h.ok ? 'green' : 'red'} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-[13px] text-ink">{h.label}</div>
                <div className="truncate text-[11px] text-muted">{h.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ingestion runs</h2>
        <div className="flex flex-col gap-2">
          {INGESTION_RUNS.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <StatusDot color={runColor(r.status)} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-ink">{r.source}</div>
                  <div className="truncate text-[11px] text-muted">
                    {r.startedAt}
                    {r.error ? ` · ${r.error}` : ''}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-[12px] text-muted">
                {r.status === 'success' ? `${r.rows} rows` : r.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Users &amp; roles</h2>
        <div className="flex flex-col gap-2">
          {USERS.map((u, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] text-ink">{u.name}</div>
                <div className="truncate text-[11px] text-muted">{u.email}</div>
              </div>
              <span className="shrink-0 rounded-md bg-subtle px-2 py-0.5 text-[11px] text-subtletext">{u.role}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
