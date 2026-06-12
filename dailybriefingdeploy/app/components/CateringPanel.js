'use client';
import { useEffect, useRef, useState } from 'react';
import SidePanel from './SidePanel';
import Icon from './Icon';

// Catering events from Pete's weekly CaterTrax "Invoice Report". Save the report
// web page as HTML and upload it (button in the panel header) → /api/catering
// parses it → renders here. Until a real report is uploaded, SAMPLE keeps the
// layout visible. Shape matches lib/catering-parser output; each event carries
// the fields the card shows: dateLabel, department, guestCount, start/end time,
// building, room, orderTotal.
const SAMPLE = {
  source: 'sample',
  sample: true,
  dateRangeLabel: '6/14 – 6/20',
  weekRevenue: 35805.57,
  totalEvents: 9,
  totalGuests: 1221,
  days: [
    {
      dayLabel: 'Sunday',
      dateLabel: 'Sun, Jun 14',
      events: [
        { orderName: 'Prospect Hill Academy Graduation', department: 'Prospect Hill Academy', dateLabel: 'Sun, Jun 14', building: 'Kresge', room: 'Kresge Lobby', guestCount: 800, startTime: '6:30 PM', endTime: '7:30 PM', orderTotal: 10200 },
      ],
    },
    {
      dayLabel: 'Monday',
      dateLabel: 'Mon, Jun 15',
      events: [
        { orderName: 'Housing Meeting', department: 'Res Life', dateLabel: 'Mon, Jun 15', building: 'W1', room: 'Flowers', guestCount: 10, orderTotal: 0 },
      ],
    },
    {
      dayLabel: 'Wednesday',
      dateLabel: 'Wed, Jun 17',
      events: [
        { orderName: 'Meeting', department: 'Bon Appetit', dateLabel: 'Wed, Jun 17', building: 'W1', room: 'Flowers', guestCount: 25, startTime: '11:30 AM', endTime: '1:00 PM', orderTotal: 323.75 },
        { orderName: 'Housing Meeting', department: 'Res Life', dateLabel: 'Wed, Jun 17', building: 'W1', room: 'Flowers', guestCount: 10, orderTotal: 0 },
      ],
    },
    {
      dayLabel: 'Thursday',
      dateLabel: 'Thu, Jun 18',
      events: [
        { orderName: 'INTERPHASE', department: 'INTERPHASE EDGE', dateLabel: 'Thu, Jun 18', building: 'New Vassar', room: 'New Vassar', guestCount: 94, startTime: '5:30 PM', endTime: '7:30 PM', orderTotal: 13724 },
        { orderName: 'ID Tech', department: 'ID Tech', dateLabel: 'Thu, Jun 18', building: 'New Vassar', room: 'New Vassar', guestCount: 115, startTime: '12:00 PM', endTime: '1:00 PM', orderTotal: 8280 },
        { orderName: 'Springboard', department: 'Springboard', dateLabel: 'Thu, Jun 18', building: 'New Vassar', room: 'New Vassar', guestCount: 127, startTime: '6:00 PM', endTime: '7:00 PM', orderTotal: 2133 },
        { orderName: 'MITES Program Dinner', department: 'MITES PROGRAM', dateLabel: 'Thu, Jun 18', building: 'New Vassar', room: 'New Vassar', guestCount: 22, startTime: '6:00 PM', endTime: '7:00 PM', orderTotal: 803 },
      ],
    },
    {
      dayLabel: 'Saturday',
      dateLabel: 'Sat, Jun 20',
      events: [
        { orderName: 'Contl Breakfast', department: 'Springboard', dateLabel: 'Sat, Jun 20', building: 'Simmons', room: 'Simmons-entryway', guestCount: 18, startTime: '7:00 AM', endTime: '8:00 AM', orderTotal: 341.82 },
      ],
    },
  ],
};

const DAY_MS = 86400000;
const LARGE_EVENT = 100; // guests — events at/above this get highlighted

// "$10,200" but "$323.75" — drop the cents only when the amount is whole.
const fmtMoney = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};
const fmtInt = (n) => Number(n || 0).toLocaleString('en-US');

// "6:30 PM – 7:30 PM", or just the start, or the delivery time as a fallback.
function eventTime(e) {
  if (e.startTime && e.endTime) return `${e.startTime} – ${e.endTime}`;
  if (e.startTime) return e.startTime;
  if (e.deliveryTime) return `Delivery ${e.deliveryTime}`;
  return null;
}

// "Kresge · Kresge Lobby" — collapse when building and room are the same.
function eventWhere(e) {
  const parts = [e.building, e.room].map((s) => (s || '').trim()).filter(Boolean);
  const uniq = parts.filter((p, i) => parts.indexOf(p) === i);
  return uniq.join(' · ');
}

const eventTotal = (e) => Number((e.orderTotal != null ? e.orderTotal : e.balanceDue) || 0);

// One event card, standardized to the layout Pete asked for:
//   [Pick Up / Delivery Date]
//   [Department]                 [Guest Count]
//   [Event Start – End Time]
//   [Building · Room #]          [Order Total]
// 100+-guest events keep an accent left-border + tint so they stand out.
function EventCard({ e }) {
  const big = Number(e.guestCount || 0) >= LARGE_EVENT;
  const when = eventTime(e);
  const where = eventWhere(e);
  const total = eventTotal(e);
  // Department is the primary label; fall back to the order name if a report
  // doesn't carry a department so the card is never blank.
  const primary = e.department || e.orderName || '—';
  const dateText = e.dateLabel || e.eventDate || '—';
  return (
    <div
      className={`rounded-lg border border-line p-2.5 ${big ? '' : 'bg-pagebg'}`}
      // Tailwind's /opacity modifier can't add alpha to the hex --accent var, so
      // tint the big-event card with an inline color-mix instead.
      style={
        big
          ? { borderLeft: '3px solid var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }
          : undefined
      }
    >
      {/* Line 1 — pick up / delivery date */}
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-subtletext">
        <Icon name="calendar" size={11} strokeWidth={2} className="shrink-0" />
        <span>{dateText}</span>
      </div>

      {/* Line 2 — department + guest count */}
      <div className="mt-1 flex items-start justify-between gap-2">
        <span className="min-w-0 text-[13px] font-medium leading-snug text-ink">{primary}</span>
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${big ? 'text-accent' : 'text-muted'}`}
          title="Guest count"
        >
          <Icon name="users" size={12} strokeWidth={2} /> {fmtInt(e.guestCount)}
        </span>
      </div>

      {/* Line 3 — event start–end time */}
      {when && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Icon name="clock" size={11} strokeWidth={2} className="shrink-0" />
          <span>{when}</span>
        </div>
      )}

      {/* Line 4 — building · room + order total */}
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] text-muted">{where || '—'}</span>
        {total > 0 && <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink">{fmtMoney(total)}</span>}
      </div>
    </div>
  );
}

export default function CateringPanel() {
  const [data, setData] = useState(null); // { current, previous, uploadedAt } | null
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/catering')
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/catering', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Upload failed');
      setData({ current: json.current, previous: json.previous, uploadedAt: json.uploadedAt });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const uploadAction = (
    <>
      <input ref={fileRef} type="file" accept=".html,.htm,.mhtml,text/html,.pdf,application/pdf" onChange={onFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload the CaterTrax report saved as a web page (HTML)"
        aria-label="Upload catering report HTML"
        className="rounded-md p-0.5 text-muted hover:text-accent disabled:opacity-50"
      >
        <Icon name="upload" size={15} strokeWidth={1.9} />
      </button>
    </>
  );

  const hasReal = Boolean(data?.current);
  const view = hasReal ? data.current : SAMPLE;
  const isSample = !hasReal;
  const stale = hasReal && data.uploadedAt && Date.now() - data.uploadedAt > 14 * DAY_MS;

  // Flatten the day groups into one chronological list — each card now carries
  // its own date, so the per-day headers are redundant. `days` is already
  // date-sorted, and events within a day keep their report order.
  const days = (view?.days || []).filter((d) => d.events?.length > 0);
  const events = days.flatMap((d) => d.events || []);
  const weekRevenue =
    view?.weekRevenue != null ? view.weekRevenue : events.reduce((s, e) => s + eventTotal(e), 0);
  const totalEvents = view?.totalEvents != null ? view.totalEvents : events.length;
  const totalGuests =
    view?.totalGuests != null ? view.totalGuests : events.reduce((s, e) => s + Number(e.guestCount || 0), 0);

  return (
    <SidePanel icon="utensils" title="Catering Events" action={uploadAction}>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-subtle" />
          <div className="h-14 animate-pulse rounded bg-subtle" />
          <div className="h-14 animate-pulse rounded bg-subtle" />
        </div>
      ) : (
        <>
          {/* Date range + headline counts */}
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <div className="text-[11px] text-muted">{view?.dateRangeLabel || 'This week'}</div>
            <div className="text-[10px] tabular-nums text-subtletext">
              {totalEvents} {totalEvents === 1 ? 'event' : 'events'} · {fmtInt(totalGuests)} guests
            </div>
          </div>

          {events.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted">No catering events in this report.</p>
          ) : (
            <div className="space-y-1.5">
              {events.map((e, i) => (
                <EventCard key={`${e.invoiceNumber || e.orderName || 'evt'}-${i}`} e={e} />
              ))}
            </div>
          )}

          {/* Weekly revenue total */}
          {events.length > 0 && (
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-subtletext">Week revenue</span>
              <span className="text-[15px] font-semibold tabular-nums text-ink">{fmtMoney(weekRevenue)}</span>
            </div>
          )}

          {/* Notes / attribution */}
          <div className="mt-3 space-y-1 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
            {isSample && <p className="text-muted">Sample data — save the CaterTrax report page as HTML and upload it to replace.</p>}
            {!isSample && view?.warning && (
              <>
                <p className="text-highlight">{view.warning}</p>
                {view.sampleText && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted">Show extracted text (for debugging)</summary>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-pagebg p-1.5 text-[9px] leading-snug text-muted">
                      {view.sampleText || '(empty)'}
                    </pre>
                  </details>
                )}
              </>
            )}
            {stale && <p className="text-muted">Data may be stale — last upload over two weeks ago.</p>}
            {err && <p className="text-highlight">Upload failed: {err}</p>}
            {uploading && <p className="text-muted">Parsing report…</p>}
            <p>CaterTrax · Invoice Report (save the report page as HTML, then upload)</p>
          </div>
        </>
      )}
    </SidePanel>
  );
}
