import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Issue tracking is not connected to live data yet (the mock issues were removed
// with the rest of the demo data). This route stays in place so links resolve;
// it will render real issues once the issues feed is wired up.
export default function IssuePage({ params }) {
  return (
    <div className="py-12 text-center">
      <h1 className="m-0 text-xl font-medium text-heading">Issue {params.id}</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
        Issue tracking isn&rsquo;t connected to live data yet — issues will appear here once the feed is wired up.
      </p>
      <Link href="/status" className="mt-4 inline-block text-sm text-accent">
        ← Campus Status
      </Link>
    </div>
  );
}
