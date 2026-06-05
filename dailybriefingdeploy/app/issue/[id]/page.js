import Link from 'next/link';
import SeverityBadge from '../../components/SeverityBadge';
import { getIssue } from '../../../lib/mock-issues';

export const dynamic = 'force-dynamic';

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <p className="m-0 text-sm leading-relaxed text-ink">{children}</p>
    </div>
  );
}

export default function IssuePage({ params }) {
  const issue = getIssue(params.id);

  if (!issue) {
    return (
      <div className="py-12 text-center">
        <h1 className="m-0 text-xl font-medium text-heading">Issue not found</h1>
        <p className="mt-2 text-sm text-muted">No issue with id &ldquo;{params.id}&rdquo;.</p>
        <Link href="/status" className="mt-4 inline-block text-sm text-accent">
          ← Campus Status
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/status" className="text-[13px] text-accent">
        ← Campus Status
      </Link>

      <div className="mb-4 mt-2">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <span className="text-[11px] uppercase text-muted">
            {issue.id} · {issue.status}
          </span>
          {issue.sensitive && (
            <span className="rounded-md bg-subtle px-2 py-0.5 text-[10px] font-medium uppercase text-subtletext">
              Sensitive
            </span>
          )}
        </div>
        <h1 className="m-0 text-[20px] font-medium leading-snug text-heading">{issue.title}</h1>
        <div className="mt-1 text-[13px] text-muted">
          <Link href={`/house/${issue.houseSlug}`} className="text-accent">
            {issue.houseName}
          </Link>{' '}
          · {issue.category} · {issue.source}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <Field label="Facts">{issue.facts}</Field>
        <Field label="Impact">{issue.impact}</Field>
        <Field label="Action">{issue.action}</Field>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-[13px]">
          <div>
            <span className="text-muted">Owner: </span>
            <span className="text-ink">{issue.owner}</span>
          </div>
          <div>
            <span className="text-muted">Opened: </span>
            <span className="text-ink">{issue.openedAt}</span>
          </div>
          {issue.dueAt && (
            <div>
              <span className="text-muted">Due: </span>
              <span className="text-ink">{issue.dueAt}</span>
            </div>
          )}
          {issue.escalationLevel > 0 && (
            <div>
              <span className="text-muted">Escalation: </span>
              <span className="text-ink">L{issue.escalationLevel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
