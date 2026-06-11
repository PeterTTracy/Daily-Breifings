// On-site management contacts for a House View: address (maps link) plus each
// chef / FOH manager with a tappable tel: phone and mailto: email. Server
// component — tel:/mailto: are plain anchors, no client JS needed. Inline SVGs
// keep it independent of the shared Icon set.

const PIN = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const PHONE = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
  </svg>
);
const MAIL = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export default function ManagementCard({ address, contacts = [] }) {
  if (!address && contacts.length === 0) return null;
  const telHref = (phone) => `tel:+1${phone.replace(/\D/g, '')}`;
  const mapHref = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null;

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Management</h2>
      <div className="rounded-xl border border-line bg-surface p-4">
        {address && (
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13px] text-muted hover:text-accent"
          >
            {PIN}
            <span>{address}</span>
          </a>
        )}

        <div className={`flex flex-col gap-3 ${address ? 'mt-3 border-t border-line pt-3' : ''}`}>
          {contacts.map((c) => (
            <div key={c.email}>
              <div className="text-[13px] font-medium text-ink">
                {c.name} <span className="font-normal text-muted">· {c.role}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                <a href={telHref(c.phone)} className="flex items-center gap-1.5 text-accent">
                  {PHONE}
                  <span className="tabular-nums">{c.phone}</span>
                </a>
                <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-1.5 text-accent">
                  {MAIL}
                  <span className="truncate">{c.email}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
