'use client';
import { useEffect, useRef, useState } from 'react';
import SidePanel from './SidePanel';
import Icon from './Icon';

// Catering events from Pete's weekly CaterTrax "Invoice Report" PDF. Upload the
// PDF (button in the panel header) → /api/catering parses it → renders here.
// Until a real PDF is uploaded, SAMPLE keeps the layout visible. Shape matches
// lib/catering-parser output ({ dateRangeLabel, weekRevenue, days:[…] }).
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
        { orderName: 'Prospect Hill Academy Graduation', building: 'Kresge', room: 'Kresge Lobby', guestCount: 800, startTime: '6:30 PM', endTime: '7:30 PM', balanceDue: 10200, department: 'Prospect Hill Academy' },
      ],
    },
    {
      dayLabel: 'Monday',
      dateLabel: 'Mon, Jun 15',
      events: [
        { orderName: 'Housing Meeting', building: 'W1', room: 'Flowers', guestCount: 10, balanceDue: 0, department: 'Res Life' },
      ],
    },
    {
      dayLabel: 'Wednesday',
      dateLabel: 'Wed, Jun 17',
      events: [
        { orderName: 'Meeting', building: 'W1', room: 'Flowers', guestCount: 25, balanceDue: 323.75, department: 'Bon Appetit' },
        { orderName: 'Housing Meeting', building: 'W1', room: 'Flowers', guestCount: 10, balanceDue: 0, department: 'Res Life' },
      ],
    },
    {
      dayLabel: 'Thursday',
      dateLabel: 'Thu, Jun 18',
      events: [
        { orderName: 'INTERPHASE', building: 'New Vassar', room: 'New Vassar', guestCount: 94, startTime: '5:30 PM', balanceDue: 13724, department: 'INTERPHASE EDGE' },
        { orderName: 'ID Tech', building: 'New Vassar', room: 'New Vassar', guestCount: 115, balanceDue: 8280, department: 'ID Tech' },
        { orderName: 'Springboard', building: 'New Vassar', room: 'New Vassar', guestCount: 127, balanceDue: 2133, department: 'Springboard' },
        { orderName: 'MITES Program Dinner', building: 'New Vassar', room: 'New Vassar', guestCount: 22, balanceDue: 803, department: 'MITES PROGRAM' },
      ],
    },
    {
      dayLabel: 'Saturday',
      dateLabel: 'Sat, Jun 20',
      events: [
        { orderName: 'Contl Breakfast', building: 'Simmons', room: 'Simmons-entryway', guestCount: 18, startTime: '7:00 AM', balanceDue: 341.82, department: 'Springboard' },
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

const dayRevenue = (d) => d.events.reduce((s, e) => s + Number(e.balanceDue || 0), 0);
const dayGuests = (d) => d.events.reduce((s, e) => s + Number(e.guestCount || 0), 0);

// One event card. 100+ guests get an accent left-border + tinted background so
// the big events stand out at a glance.
function EventCard({ e }) {
  const big = Number(e.guestCount || 0) >= LARGE_EVENT;
  const when = eventTime(e);
  const where = eventWhere(e);
  return (
    <div
      className={`rounded-lg border p-2.5 ${big ? 'border-line' : 'border-line bg-pagebg'}`}
      // Tailwind's /opacity modifier can't add alpha to the hex --accent var, so
      // tint the big-event card with an inline color-mix instead.
      style={
        big
          ? { borderLeft: '3px solid var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[13px] font-medium leading-snug text-ink">{e.orderName}</div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${
            big ? 'text-accent' : 'text-muted'
          }`}
        >
          <Icon name="users" size={12} strokeWidth={2} /> {fmtInt(e.guestCount)}
        </span>
      </div>
      {when && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Icon name="clock" size={11} strokeWidth={2} className="shrink-0" />
          <span>{when}</span>
        </div>
      )}
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] text-muted">{where || e.department || '—'}</span>
        {Number(e.balanceDue || 0) > 0 && (
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink">{fmtMoney(e.balanceDue)}</span>
        )}
      </div>
    </div>
  );
}

// A collapsible day section: header (weekday + date + count/revenue), then its
// event cards. Defaults open so the whole week is visible on load.
function DayGroup({ day }) {
  const [open, setOpen] = useState(true);
  const rev = dayRevenue(day);
  const count = day.events.length;
  return (
    <div className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon name="chevron" size={13} className={`shrink-0 text-muted transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink">{day.dateLabel || day.dayLabel}</span>
        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-subtletext">
          {count} {count === 1 ? 'event' : 'events'}
          {rev > 0 && <> · {fmtMoney(rev)}</>}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 px-1.5 pb-1.5">
          {day.events.map((e, i) => (
            <EventCard key={`${e.invoiceNumber || e.orderName}-${i}`} e={e} />
          ))}
        </div>
      )}
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
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={onFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload CaterTrax Invoice Report PDF"
        aria-label="Upload catering invoices PDF"
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

  const days = (view?.days || []).filter((d) => d.events?.length > 0);
  const weekRevenue =
    view?.weekRevenue != null ? view.weekRevenue : days.reduce((s, d) => s + dayRevenue(d), 0);
  const totalEvents = view?.totalEvents != null ? view.totalEvents : days.reduce((s, d) => s + d.events.length, 0);
  const totalGuests = view?.totalGuests != null ? view.totalGuests : days.reduce((s, d) => s + dayGuests(d), 0);

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

          {days.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted">No catering events in this report.</p>
          ) : (
            <div className="space-y-2">
              {days.map((d, i) => (
                <DayGroup key={d.dateISO || d.dayLabel || i} day={d} />
              ))}
            </div>
          )}

          {/* Weekly revenue total */}
          {days.length > 0 && (
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-subtletext">Week revenue</span>
              <span className="text-[15px] font-semibold tabular-nums text-ink">{fmtMoney(weekRevenue)}</span>
            </div>
          )}

          {/* Notes / attribution */}
          <div className="mt-3 space-y-1 border-t border-line pt-2.5 text-[10px] leading-snug text-subtletext">
            {isSample && <p className="text-muted">Sample data — upload the weekly Invoice Report PDF to replace.</p>}
            {!isSample && view?.warning && <p className="text-highlight">{view.warning}</p>}
            {stale && <p className="text-muted">Data may be stale — last upload over two weeks ago.</p>}
            {err && <p className="text-highlight">Upload failed: {err}</p>}
            {uploading && <p className="text-muted">Parsing PDF…</p>}
            <p>CaterTrax · Invoice Report</p>
          </div>
        </>
      )}
    </SidePanel>
  );
}
