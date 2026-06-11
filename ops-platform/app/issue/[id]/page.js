import Link from 'next/link';
import StatusDot from '../../components/StatusDot';
import { getSafetyIssue } from '../../../lib/safety-data';

export const dynamic = 'force-dynamic';

export default function IssuePage({ params }) {
  const issue = getSafetyIssue(params.id);

  if (!issue) {
    return (
      <div className="py-12 text-center">
        <h1 className="m-0 text-xl font-medium text-heading">Issue not found</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          “{params.id}” isn&rsquo;t a known issue, or it has been resolved.
        </p>
        <Link href="/status" className="mt-4 inline-block text-sm text-accent">
          ← Campus Status
        </Link>
      </div>
    );
  }

  const ROW = [
    ['Facts', issue.facts],
    ['Impact', issue.impact],
    ['Action', issue.action],
    ['Owner', `${issue.houseName} · ${issue.owner}`],
    ['Area', issue.area],
    ['Target', issue.target],
  ];

  return (
    <div>
      <Link href="/status" className="text-[13px] text-accent">
        ← Campus Status
      </Link>

      <div className="mb-4 mt-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot color="red" size="lg" />
          <div className="min-w-0">
            <h1 className="m-0 text-[20px] font-medium text-heading">{issue.title}</h1>
            <div className="text-xs text-muted">
              <Link href={`/house/${issue.house}`} className="text-accent">
                {issue.houseName}
              </Link>{' '}
              · 2026 Safety Tracker
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#FCEBEB] px-2 py-0.5 text-[12px] font-medium text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]">
          HIGH · open
        </span>
      </div>

      <dl className="overflow-hidden rounded-xl border border-line bg-surface">
        {ROW.map(([label, value], i) => (
          <div
            key={label}
            className={`grid grid-cols-[72px_1fr] gap-3 px-4 py-3 text-[13px] ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <dt className="text-muted">{label}</dt>
            <dd className="m-0 text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
