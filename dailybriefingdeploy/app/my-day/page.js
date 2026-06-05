'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../components/Icon';

// Badge palettes keep the exact original colors, with explicit dark: variants
// since these are accent chips (not the CSS-variable-backed semantic surfaces).
const BADGE = {
  urgent: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
  today: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  week: 'bg-[#E6F1FB] text-[#185FA5] dark:bg-[#1c2c3e] dark:text-[#8FB8E6]',
  fyi: 'bg-[#F1EFE8] text-[#5F5E5A] dark:bg-[#2a2a26] dark:text-[#B5B5AE]',
  done: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#1f3019] dark:text-[#9FD08A]',
};

const SWIPE_THRESHOLD = 80; // px before a swipe commits
const PROMOTE_COLOR = '#2E75B6';
const DISMISS_COLOR = '#E24B4A';

const PRIORITY_PILLS = [
  { key: 'urgent', label: 'Urgent', cls: BADGE.urgent },
  { key: 'today', label: 'Today', cls: BADGE.today },
  { key: 'week', label: 'This week', cls: BADGE.week },
];
const PRIORITY_LABELS = { urgent: 'URGENT', today: 'TODAY', week: 'THIS WEEK' };

function Badge({ type, children }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${BADGE[type] || BADGE.fyi}`}>
      {children}
    </span>
  );
}

// Relative age for manually-added items (from their createdAt timestamp).
function relAge(ts) {
  if (!ts) return 'just now';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Parse the START time of a calendar event into a Date on `base`'s day.
// Handles "9:00 AM", "1:00 PM", ranges like "11:45 AM – 1:30 PM", and
// "5:00 – 7:00 PM" (AM/PM on the end applies to the start).
function parseEventStart(timeStr, base) {
  if (!timeStr) return null;
  const full = String(timeStr);
  const start = full.split(/[–-]|\bto\b/i)[0].trim();
  const ampm = (start.match(/([ap])\.?m/i) || full.match(/([ap])\.?m/i) || [])[1];
  const hm = start.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!hm) return null;
  let hour = parseInt(hm[1], 10);
  const min = hm[2] ? parseInt(hm[2], 10) : 0;
  const ap = ampm ? ampm.toLowerCase() : null;
  if (ap === 'p' && hour !== 12) hour += 12;
  if (ap === 'a' && hour === 12) hour = 0;
  const d = new Date(base.getTime());
  d.setHours(hour, min, 0, 0);
  return d;
}

function ActionItem({ item, onToggle }) {
  return (
    <div
      className={`mb-1.5 flex items-start gap-2.5 rounded-xl border border-line p-3 transition-all ${
        item.completed ? 'bg-completed opacity-50' : 'bg-surface'
      }`}
    >
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => onToggle(item.id)}
        className="mt-[3px] h-[18px] w-[18px] cursor-pointer accent-accent"
      />
      <div className="flex-1">
        <p className={`m-0 text-sm text-ink ${item.completed ? 'line-through' : ''}`}>{item.description}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Badge type={item.priority}>{item.priorityLabel}</Badge>
          {item.sender && <span>{item.sender}</span>}
          {item.age && <span>· {item.age}</span>}
          {item.note && <span>· {item.note}</span>}
        </p>
      </div>
    </div>
  );
}

// A user-added action item: checkbox to complete, swipe-left (or hover ✕) to
// dismiss, and a small "manual" indicator.
function ManualActionItem({ item, onToggle, onDismiss }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    setDx(Math.min(0, e.touches[0].clientX - startX.current)); // dismiss is left-only
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (dx <= -SWIPE_THRESHOLD) {
      setDx(-600);
      setTimeout(() => onDismiss(item.id), 180);
    } else {
      setDx(0);
    }
  };

  return (
    <div className="relative mb-1.5 overflow-hidden rounded-xl">
      <div className="absolute inset-0 rounded-xl" style={{ background: dx < 0 ? `${DISMISS_COLOR}1a` : 'transparent' }} />
      <div className="pointer-events-none absolute inset-0 flex items-center px-4 text-[12px] font-medium">
        {dx < 0 && (
          <span className="ml-auto" style={{ color: DISMISS_COLOR }}>
            Dismiss ✕
          </span>
        )}
      </div>

      <div
        className={`group flex items-start gap-2.5 rounded-xl border border-line p-3 ${
          item.completed ? 'bg-completed opacity-50' : 'bg-surface'
        }`}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.18s ease-out',
          touchAction: 'pan-y',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <input
          type="checkbox"
          checked={item.completed}
          onChange={() => onToggle(item.id)}
          className="mt-[3px] h-[18px] w-[18px] cursor-pointer accent-accent"
        />
        <div className="min-w-0 flex-1">
          <p className={`m-0 text-sm text-ink ${item.completed ? 'line-through' : ''}`}>{item.description}</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Badge type={item.priority}>{item.priorityLabel}</Badge>
            <span className="inline-flex items-center gap-1" title="Added manually">✎ manual</span>
            <span>· {relAge(item.createdAt)}</span>
          </p>
        </div>
        <button
          onClick={() => onDismiss(item.id)}
          title="Dismiss"
          aria-label="Dismiss"
          className="hidden shrink-0 self-center rounded-md border border-line bg-pagebg px-1.5 py-0.5 text-[12px] font-semibold leading-none group-hover:block"
          style={{ color: DISMISS_COLOR }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Inline "+ Add item" → expands to a single-field form with priority pills.
function AddItemForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('today');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setText('');
    setPriority('today');
  };
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t, priority);
    close();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span className="text-base leading-none">+</span> Add item
      </button>
    );
  }

  return (
    <div className="mb-1.5 rounded-xl border border-line bg-surface p-3">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') close();
        }}
        placeholder="What needs to get done?"
        enterKeyHint="done"
        aria-label="New action item"
        className="w-full rounded-lg border border-line bg-pagebg px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
      />
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {PRIORITY_PILLS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPriority(p.key)}
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-all ${p.cls} ${
              priority === p.key ? 'ring-2 ring-inset ring-accent' : 'opacity-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={close} className="text-[13px] text-muted hover:text-ink">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// FYI row with swipe-to-act: swipe left to dismiss, right to promote.
function SwipeableFyi({ item, onDismiss, onPromote }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    setDx(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (dx <= -SWIPE_THRESHOLD) {
      setDx(-600);
      setTimeout(() => onDismiss(item.id), 180);
    } else if (dx >= SWIPE_THRESHOLD) {
      setDx(600);
      setTimeout(() => onPromote(item.id), 180);
    } else {
      setDx(0);
    }
  };

  const promoting = dx > 0;
  const dismissing = dx < 0;

  return (
    <div className="relative mb-1 overflow-hidden rounded-xl">
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: promoting ? `${PROMOTE_COLOR}1a` : dismissing ? `${DISMISS_COLOR}1a` : 'transparent' }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center px-4 text-[12px] font-medium">
        {promoting && <span style={{ color: PROMOTE_COLOR }}>→ Promote to action</span>}
        {dismissing && (
          <span className="ml-auto" style={{ color: DISMISS_COLOR }}>
            Dismiss ✕
          </span>
        )}
      </div>

      <div
        className="group relative rounded-xl border border-line bg-surface p-3.5 opacity-90"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.18s ease-out',
          touchAction: 'pan-y',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <p className="m-0 pr-14 text-[13px] text-ink">{item.description}</p>
        <p className="mt-1 text-[11px] text-muted">
          <Badge type="fyi">{item.priorityLabel}</Badge> {item.sender && <span> · {item.sender}</span>}{' '}
          {item.age && <span> · {item.age}</span>}
        </p>

        <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
          <button
            onClick={() => onPromote(item.id)}
            title="Promote to action item"
            aria-label="Promote to action item"
            className="rounded-md border border-line bg-pagebg px-1.5 py-0.5 text-[12px] font-semibold leading-none hover:bg-subtle"
            style={{ color: PROMOTE_COLOR }}
          >
            →
          </button>
          <button
            onClick={() => onDismiss(item.id)}
            title="Dismiss"
            aria-label="Dismiss"
            className="rounded-md border border-line bg-pagebg px-1.5 py-0.5 text-[12px] font-semibold leading-none hover:bg-subtle"
            style={{ color: DISMISS_COLOR }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function NextUpCard({ event }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4"
      style={event.highlight ? { borderLeft: '3px solid var(--highlight)' } : undefined}
    >
      <div className="min-w-[100px] whitespace-nowrap text-[13px] font-medium text-accent">{event.time}</div>
      <div>
        <div className="text-sm font-medium text-ink">{event.title}</div>
        <div className="text-xs text-muted">{event.location}</div>
      </div>
    </div>
  );
}

function Section({ icon, title, badge, children }) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center gap-2 border-b border-line pb-1.5">
        <Icon name={icon} size={17} strokeWidth={1.9} className="text-accent" />
        <span className="text-base font-medium text-ink">{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}

function StatCard({ num, label }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5 text-center">
      <div className="text-2xl font-medium text-ink">{num}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

function loadIdSet(key) {
  if (typeof window === 'undefined') return new Set();
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}
function saveIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch (e) {}
}
function loadManual() {
  if (typeof window === 'undefined') return [];
  try {
    const arr = JSON.parse(localStorage.getItem('manual-items') || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter((i) => i && i.id && typeof i.description === 'string');
  } catch (e) {
    return [];
  }
}
function saveManual(items) {
  try {
    localStorage.setItem('manual-items', JSON.stringify(items));
  } catch (e) {}
}

export default function MyDay() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // FYI items the user has acted on (persisted so they survive briefing refreshes).
  const [dismissedIds, setDismissedIds] = useState(() => loadIdSet('fyi-dismissed'));
  const [promotedIds, setPromotedIds] = useState(() => loadIdSet('fyi-promoted'));
  // User-added action items (persisted; roll over across briefings).
  const [manualItems, setManualItems] = useState(() => loadManual());

  const dismissFyi = useCallback((id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev).add(id);
      saveIdSet('fyi-dismissed', next);
      return next;
    });
  }, []);
  const promoteFyi = useCallback((id) => {
    setPromotedIds((prev) => {
      const next = new Set(prev).add(id);
      saveIdSet('fyi-promoted', next);
      return next;
    });
  }, []);

  const addManual = useCallback((description, priority) => {
    setManualItems((prev) => {
      const next = [
        ...prev,
        {
          id: `manual-${Date.now()}`,
          type: 'action',
          description,
          priority,
          priorityLabel: PRIORITY_LABELS[priority] || 'TODAY',
          createdAt: Date.now(),
          completed: false,
          manual: true,
        },
      ];
      saveManual(next);
      return next;
    });
  }, []);
  const toggleManual = useCallback((id) => {
    setManualItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i));
      saveManual(next);
      return next;
    });
  }, []);
  const dismissManual = useCallback((id) => {
    setManualItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveManual(next);
      return next;
    });
  }, []);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing');
      if (!res.ok) throw new Error('Failed to load briefing');
      const d = await res.json();
      setData(d);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  const toggleItem = async (id) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)),
    }));
    try {
      await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (e) {}
  };

  if (loading)
    return (
      <div className="py-16 text-center">
        <div className="text-lg text-muted">Loading briefing...</div>
      </div>
    );

  if (error || !data)
    return (
      <div className="py-16 text-center">
        <div className="text-lg text-highlight">No briefing available yet</div>
        <p className="mt-2 text-sm text-muted">The first briefing will appear after the scheduled task runs.</p>
        <button
          onClick={fetchBriefing}
          className="mt-4 rounded-lg border border-accent bg-surface px-6 py-2.5 text-sm text-accent"
        >
          Retry
        </button>
      </div>
    );

  const allItems = data.items || [];
  const rawActions = allItems.filter((i) => i.type !== 'fyi');
  // FYI items the user promoted become "today" action items.
  const promotedFromFyi = allItems
    .filter((i) => i.type === 'fyi' && promotedIds.has(i.id))
    .map((i) => ({ ...i, type: 'action', priority: 'today', priorityLabel: 'TODAY' }));
  const actionItems = [...rawActions, ...promotedFromFyi, ...manualItems];
  const fyi = allItems.filter((i) => i.type === 'fyi' && !dismissedIds.has(i.id) && !promotedIds.has(i.id));
  const completed = actionItems.filter((i) => i.completed).length;
  const pending = actionItems.filter((i) => !i.completed).length;

  // Time-aware next meeting: show the first event still in the future. Afternoon
  // briefings show tomorrow's calendar, so the first event is always upcoming.
  const calendar = data.calendar || [];
  const now = new Date();
  let nextEvent = null;
  let noMoreToday = false;
  if (calendar.length > 0) {
    if (data.briefingType === 'afternoon') {
      nextEvent = calendar[0];
    } else {
      nextEvent = calendar.find((e) => {
        const t = parseEventStart(e.time, now);
        return t && t.getTime() >= now.getTime();
      }) || null;
      noMoreToday = !nextEvent;
    }
  }

  const renderActionRow = (i) =>
    i.manual ? (
      <ManualActionItem key={i.id} item={i} onToggle={toggleManual} onDismiss={dismissManual} />
    ) : (
      <ActionItem key={i.id} item={i} onToggle={toggleItem} />
    );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="m-0 text-[22px] font-medium text-heading">Daily briefing</h1>
        <div className="text-right">
          <div className="text-[13px] text-muted">{data.date}</div>
          <div className="text-[11px] text-muted">{data.briefingType} briefing</div>
        </div>
      </div>

      {(nextEvent || noMoreToday) && (
        <Section icon="calendar" title="Next up">
          {nextEvent ? (
            <NextUpCard event={nextEvent} />
          ) : (
            <div className="rounded-xl border border-line bg-surface p-4 text-center text-[13px] text-muted">
              No more meetings today.
            </div>
          )}
        </Section>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <StatCard num={pending} label="To do" />
        <StatCard num={completed} label="Done" />
      </div>

      <Section icon="inbox" title="Action items" badge={<Badge type="urgent">{pending} pending</Badge>}>
        {actionItems.filter((i) => !i.completed).map(renderActionRow)}
        <AddItemForm onAdd={addManual} />
        {actionItems.filter((i) => i.completed).length > 0 && (
          <>
            <p className="mb-1.5 mt-3 text-xs font-medium text-muted">Completed</p>
            {actionItems.filter((i) => i.completed).map(renderActionRow)}
          </>
        )}
      </Section>

      {data.tomorrowPreview && (
        <div className="mb-6 rounded-xl border border-line bg-subtle p-3.5">
          <p className="m-0 text-[13px] font-medium text-muted">Coming up</p>
          <p className="mt-1 text-xs text-subtletext">{data.tomorrowPreview}</p>
        </div>
      )}

      {fyi.length > 0 && (
        <Section icon="info" title="FYI">
          {fyi.map((i) => (
            <SwipeableFyi key={i.id} item={i} onDismiss={dismissFyi} onPromote={promoteFyi} />
          ))}
          <p className="mt-2 text-center text-[11px] text-muted">Swipe left to dismiss · right to promote</p>
        </Section>
      )}

      <div className="border-t border-line py-5 text-center">
        <button
          onClick={fetchBriefing}
          className="rounded-lg border border-accent bg-surface px-6 py-2.5 text-[13px] text-accent"
        >
          Refresh
        </button>
        {lastRefresh && <p className="mt-2 text-[11px] text-muted">Last updated {lastRefresh.toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}
