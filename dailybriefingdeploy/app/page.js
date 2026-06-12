'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './components/Icon';
import FinancialsPanel from './components/FinancialsPanel';
import MealClicksPanel from './components/MealClicksPanel';
import CateringPanel from './components/CateringPanel';

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
const PULL_TRIGGER = 64; // px of pull before release triggers a refresh

const PRIORITY_PILLS = [
  { key: 'urgent', label: 'Urgent', cls: BADGE.urgent },
  { key: 'today', label: 'Today', cls: BADGE.today },
  { key: 'week', label: 'This week', cls: BADGE.week },
];
const PRIORITY_LABELS = { urgent: 'URGENT', today: 'TODAY', week: 'THIS WEEK' };
// Triage order: urgent first, unknown priorities sink to the bottom.
const PRIORITY_RANK = { urgent: 0, today: 1, week: 2 };
const rank = (i) => (i.priority in PRIORITY_RANK ? PRIORITY_RANK[i.priority] : 3);

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

// "Thursday, June 11, 2026" → "Thu, Jun 11". Falls back to the raw string if
// the pipeline ever sends a format Date can't parse.
function shortDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// "Karen.Vaillancourt@trimarkusa.com" → "Karen Vaillancourt". Non-email senders
// (e.g. "MITChefs group") pass through unchanged.
function senderName(sender) {
  if (!sender || !sender.includes('@')) return sender;
  const local = sender.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Sender as a tappable mailto link (one-tap reply) showing just the name.
function SenderLink({ sender }) {
  if (!sender) return null;
  if (!sender.includes('@')) return <span>{sender}</span>;
  return (
    <a
      href={`mailto:${sender}`}
      onClick={(e) => e.stopPropagation()}
      className="underline decoration-dotted underline-offset-2 transition-colors hover:text-accent"
      title={`Email ${sender}`}
    >
      {senderName(sender)}
    </a>
  );
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

// True when a tap landed on an interactive child (checkbox, link, button) —
// the card-level toggle must not double-fire for those.
function tappedInteractive(e) {
  return Boolean(e.target.closest('input, a, button'));
}

// The whole card is the tap target for completing an item (the 18px checkbox
// alone is too small a target on the phone). The checkbox stays as the visual
// + keyboard/AT affordance.
function ActionItem({ item, onToggle }) {
  return (
    <div
      onClick={(e) => {
        if (!tappedInteractive(e)) onToggle(item.id);
      }}
      className={`mb-1.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3 transition-all active:scale-[0.99] ${
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
          {item.sender && <SenderLink sender={item.sender} />}
          {item.age && <span>· {item.age}</span>}
          {item.note && <span>· {item.note}</span>}
        </p>
      </div>
    </div>
  );
}

// A user-added action item: tap card/checkbox to complete, swipe-left (or
// hover ✕) to dismiss, and a small "manual" indicator.
function ManualActionItem({ item, onToggle, onDismiss }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const suppressTap = useRef(false); // a swipe must not also fire the tap-to-toggle

  const onTouchStart = (e) => {
    e.stopPropagation(); // don't let a row swipe also drive the mobile pane carousel
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    e.stopPropagation();
    const d = Math.min(0, e.touches[0].clientX - startX.current); // dismiss is left-only
    if (Math.abs(d) > 5) suppressTap.current = true;
    setDx(d);
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (dx <= -SWIPE_THRESHOLD) {
      setDx(-600);
      setTimeout(() => onDismiss(item.id), 180);
    } else {
      setDx(0);
    }
    setTimeout(() => {
      suppressTap.current = false;
    }, 350);
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
        onClick={(e) => {
          if (suppressTap.current || tappedInteractive(e)) return;
          onToggle(item.id);
        }}
        className={`group flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3 active:scale-[0.99] ${
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
    e.stopPropagation(); // don't let a row swipe also drive the mobile pane carousel
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    e.stopPropagation();
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
          <Badge type="fyi">{item.priorityLabel}</Badge>{' '}
          {item.sender && (
            <span>
              {' '}
              · <SenderLink sender={item.sender} />
            </span>
          )}{' '}
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

// Slim one-row "next meeting" card — replaces the old Section + tall card so
// action items start higher on the screen.
function NextUpCard({ event }) {
  return (
    <div
      className="mb-4 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5"
      style={event.highlight ? { borderLeft: '3px solid var(--highlight)' } : undefined}
    >
      <Icon name="calendar" size={15} strokeWidth={1.9} className="shrink-0 text-accent" />
      <span className="shrink-0 whitespace-nowrap text-[13px] font-medium text-accent">{event.time}</span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-ink">{event.title}</div>
        <div className="truncate text-[11px] text-muted">{event.location}</div>
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

// Loading skeleton: header line + three pulsing item cards.
function Skeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading briefing">
      <div className="mb-5 h-5 w-2/3 rounded-md bg-subtle" />
      <div className="mb-4 h-12 rounded-xl border border-line bg-subtle" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-1.5 h-[72px] rounded-xl border border-line bg-surface p-3">
          <div className="mb-2 h-3.5 w-5/6 rounded bg-subtle" />
          <div className="h-3 w-1/2 rounded bg-subtle" />
        </div>
      ))}
    </div>
  );
}

// Bottom toast with a 5s Undo window (for swipe-dismissals).
function UndoToast({ toast, onUndo }) {
  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 bottom-5 z-50 px-4">
      <div className="mx-auto flex max-w-content items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg">
        <span className="min-w-0 truncate text-[13px] text-ink">{toast.label}</span>
        <button onClick={onUndo} className="shrink-0 text-[13px] font-semibold text-accent">
          Undo
        </button>
      </div>
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
function loadFlag(key) {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(key) === '1';
  } catch (e) {
    return false;
  }
}
function saveFlag(key) {
  try {
    localStorage.setItem(key, '1');
  } catch (e) {}
}

// The center column — the daily briefing exactly as before. Wrapped by
// Dashboard below; its own logic (fetch, swipe, pull-to-refresh) is unchanged.
function BriefingColumn() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // FYI items the user has acted on (persisted so they survive briefing refreshes).
  const [dismissedIds, setDismissedIds] = useState(() => loadIdSet('fyi-dismissed'));
  const [promotedIds, setPromotedIds] = useState(() => loadIdSet('fyi-promoted'));
  // User-added action items (persisted; roll over across briefings).
  const [manualItems, setManualItems] = useState(() => loadManual());
  // The swipe hint disappears once the gesture has been used successfully.
  const [hintDone, setHintDone] = useState(() => loadFlag('swipe-hint-done'));

  // Undo toast for destructive swipes. { label, undo } — undo restores state.
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((label, undo) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ label, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  const runUndo = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast((t) => {
      if (t) t.undo();
      return null;
    });
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const markHintDone = useCallback(() => {
    setHintDone(true);
    saveFlag('swipe-hint-done');
  }, []);

  const dismissFyi = useCallback(
    (id) => {
      markHintDone();
      setDismissedIds((prev) => {
        const next = new Set(prev).add(id);
        saveIdSet('fyi-dismissed', next);
        return next;
      });
      showToast('FYI dismissed', () =>
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          saveIdSet('fyi-dismissed', next);
          return next;
        })
      );
    },
    [markHintDone, showToast]
  );
  const promoteFyi = useCallback(
    (id) => {
      markHintDone();
      setPromotedIds((prev) => {
        const next = new Set(prev).add(id);
        saveIdSet('fyi-promoted', next);
        return next;
      });
    },
    [markHintDone]
  );

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
  const dismissManual = useCallback(
    (id) => {
      let removed = null;
      let removedIndex = -1;
      setManualItems((prev) => {
        removedIndex = prev.findIndex((i) => i.id === id);
        removed = removedIndex >= 0 ? prev[removedIndex] : null;
        const next = prev.filter((i) => i.id !== id);
        saveManual(next);
        return next;
      });
      showToast('Item removed', () =>
        setManualItems((prev) => {
          if (!removed) return prev;
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removed);
          saveManual(next);
          return next;
        })
      );
    },
    [showToast]
  );

  const fetchBriefing = useCallback(async () => {
    setRefreshing(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Pull-to-refresh: drag down from the top of the page, release past the
  // threshold to refetch. globals.css sets overscroll-behavior-y so the
  // browser's native pull-to-refresh doesn't fight this.
  const [pull, setPull] = useState(0);
  const pullStart = useRef(null);
  const onPullStart = (e) => {
    pullStart.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
  };
  const onPullMove = (e) => {
    if (pullStart.current === null || refreshing) return;
    const dy = e.touches[0].clientY - pullStart.current;
    if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.45, 90));
    else setPull(0);
  };
  const onPullEnd = () => {
    if (pull >= PULL_TRIGGER && !refreshing) fetchBriefing();
    pullStart.current = null;
    setPull(0);
  };

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

  if (loading) return <Skeleton />;

  // Network failure and "no briefing yet" are different situations — say which.
  if (error)
    return (
      <div className="py-16 text-center">
        <div className="text-lg text-highlight">Couldn&rsquo;t load the briefing</div>
        <p className="mt-2 text-sm text-muted">Check your connection and try again.</p>
        <button
          onClick={fetchBriefing}
          disabled={refreshing}
          className="mt-4 rounded-lg border border-accent bg-surface px-6 py-2.5 text-sm text-accent disabled:opacity-50"
        >
          {refreshing ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="py-16 text-center">
        <div className="text-lg text-heading">No briefing available yet</div>
        <p className="mt-2 text-sm text-muted">The first briefing will appear after the scheduled task runs.</p>
        <button
          onClick={fetchBriefing}
          disabled={refreshing}
          className="mt-4 rounded-lg border border-accent bg-surface px-6 py-2.5 text-sm text-accent disabled:opacity-50"
        >
          {refreshing ? 'Checking…' : 'Check again'}
        </button>
      </div>
    );

  const allItems = data.items || [];
  const rawActions = allItems.filter((i) => i.type !== 'fyi');
  // FYI items the user promoted become "today" action items.
  const promotedFromFyi = allItems
    .filter((i) => i.type === 'fyi' && promotedIds.has(i.id))
    .map((i) => ({ ...i, type: 'action', priority: 'today', priorityLabel: 'TODAY' }));
  // Triage order: urgent → today → week (stable within each tier), regardless
  // of whether an item came from the pipeline, a promotion, or was added by hand.
  const actionItems = [...rawActions, ...promotedFromFyi, ...manualItems].sort((a, b) => rank(a) - rank(b));
  const fyi = allItems.filter((i) => i.type === 'fyi' && !dismissedIds.has(i.id) && !promotedIds.has(i.id));
  const completed = actionItems.filter((i) => i.completed).length;
  const pending = actionItems.filter((i) => !i.completed).length;

  // Time-aware next meeting: show the first event still in the future. Afternoon
  // briefings show tomorrow's calendar, so the first event is always upcoming.
  const calendar = data.calendar || [];
  const now = new Date();
  let nextEvent = null;
  if (calendar.length > 0) {
    if (data.briefingType === 'afternoon') {
      nextEvent = calendar[0];
    } else {
      nextEvent = calendar.find((e) => {
        const t = parseEventStart(e.time, now);
        return t && t.getTime() >= now.getTime();
      }) || null;
    }
  }

  const renderActionRow = (i) =>
    i.manual ? (
      <ManualActionItem key={i.id} item={i} onToggle={toggleManual} onDismiss={dismissManual} />
    ) : (
      <ActionItem key={i.id} item={i} onToggle={toggleItem} />
    );

  return (
    <div onTouchStart={onPullStart} onTouchMove={onPullMove} onTouchEnd={onPullEnd}>
      {/* Pull-to-refresh indicator (height follows the drag) */}
      <div
        className="flex items-end justify-center overflow-hidden text-[12px] text-muted"
        style={{ height: refreshing ? 32 : pull, transition: pullStart.current ? 'none' : 'height 0.18s ease-out' }}
      >
        <span className="pb-2">
          {refreshing ? 'Refreshing…' : pull >= PULL_TRIGGER ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>

      {/* Compact status line: date · type on the left, counts on the right. */}
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h1 className="m-0 text-[17px] font-semibold text-heading">
          {shortDate(data.date)}
          <span className="font-normal text-muted"> · {data.briefingType}</span>
        </h1>
        <div className="shrink-0 text-[13px] text-muted">
          <span className="font-semibold text-ink">{pending}</span> to do
          {completed > 0 && <span> · {completed} done</span>}
        </div>
      </div>

      {nextEvent && <NextUpCard event={nextEvent} />}

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
          {!hintDone && (
            <p className="mt-2 text-center text-[11px] text-muted">Swipe left to dismiss · right to promote</p>
          )}
        </Section>
      )}

      <div className="border-t border-line py-5 text-center">
        <button
          onClick={fetchBriefing}
          disabled={refreshing}
          className="rounded-lg border border-accent bg-surface px-6 py-2.5 text-[13px] text-accent disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        {lastRefresh && <p className="mt-2 text-[11px] text-muted">Last updated {lastRefresh.toLocaleTimeString()}</p>}
      </div>

      <UndoToast toast={toast} onUndo={runUndo} />
    </div>
  );
}

// xl is the desktop breakpoint (1280px) — at/above it the three panes sit side
// by side; below it they become a swipeable carousel.
const DESKTOP_MQ = '(min-width: 1280px)';

// Mobile carousel frames, in left→right reading order for the tab strip. `i` is
// the panel's position in the swipe track (see Dashboard): the track is laid out
// [Financials(0), Briefing(1), Catering(2)] — matching the desktop left→right
// order — so a finger-following swipe LEFT lands on Catering (the right pane)
// and a swipe RIGHT lands on Financials (the left pane), like a normal carousel.
const FRAMES = [
  { i: 0, label: 'Financials' },
  { i: 1, label: 'Briefing' },
  { i: 2, label: 'Catering' },
];
const CENTER = 1; // Briefing is the default frame on mobile.

function useIsDesktop() {
  // Lazily read the media query so the very first client render is correct (no
  // flash), while still defaulting to mobile during SSR where there's no window.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

// Mobile-only segmented control: shows the active frame and lets the user jump
// without swiping (also the accessible, discoverable affordance).
function FrameTabs({ index, onSelect }) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard panels"
      className="mb-4 flex items-center gap-1 rounded-xl border border-line bg-surface p-1 xl:hidden"
    >
      {FRAMES.map((f) => {
        const active = index === f.i;
        return (
          <button
            key={f.i}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(f.i)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors ${
              active ? 'bg-accent text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// Three-pane dashboard.
//   xl+  : left (260) · center briefing (680) · right (260), side by side.
//   < xl : a horizontal carousel of three full-width frames. Center (Briefing)
//          is the default; swipe left to reveal the right pane (Catering) and
//          swipe right to reveal the left pane (Financials/TechCash), like a
//          normal carousel. The track DOM order [Financials, Briefing, Catering]
//          already matches the desktop left→right order, so a finger-following
//          drag maps to that gesture with no re-sequencing needed.
export default function Dashboard() {
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(CENTER); // active frame, 0..2
  const [dx, setDx] = useState(0); // live horizontal drag offset (px)
  const [dragging, setDragging] = useState(false);
  const touch = useRef(null); // { x, y, axis: null | 'x' | 'y' }

  useEffect(() => setMounted(true), []);

  const onTouchStart = (e) => {
    if (isDesktop) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, axis: null };
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (isDesktop || !touch.current) return;
    const t = e.touches[0];
    const moveX = t.clientX - touch.current.x;
    const moveY = t.clientY - touch.current.y;
    // Lock to an axis on the first decisive movement so a vertical scroll (or
    // pull-to-refresh) never gets hijacked into a pane swipe, and vice versa.
    if (touch.current.axis === null && (Math.abs(moveX) > 8 || Math.abs(moveY) > 8)) {
      touch.current.axis = Math.abs(moveX) > Math.abs(moveY) ? 'x' : 'y';
    }
    if (touch.current.axis !== 'x') return;
    // Resist dragging past the first / last frame so the ends feel like walls.
    let d = moveX;
    if ((index === 0 && d > 0) || (index === FRAMES.length - 1 && d < 0)) d *= 0.3;
    setDx(d);
  };
  const onTouchEnd = () => {
    if (isDesktop || !touch.current) return;
    const axis = touch.current.axis;
    touch.current = null;
    setDragging(false);
    if (axis === 'x') {
      if (dx <= -SWIPE_THRESHOLD) setIndex((i) => Math.min(FRAMES.length - 1, i + 1));
      else if (dx >= SWIPE_THRESHOLD) setIndex((i) => Math.max(0, i - 1));
    }
    setDx(0);
  };

  // The transform only drives the mobile carousel; on desktop the `order-*` /
  // width utilities own the layout, so leave the track untouched there. It's
  // also left off until mount so SSR and the first client render agree (the
  // `-translate-x-full` class shows the center frame in the meantime).
  const trackStyle =
    mounted && !isDesktop
      ? {
          transform: `translateX(calc(${index * -100}% + ${dx}px))`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
          touchAction: 'pan-y',
        }
      : undefined;

  return (
    <>
      <FrameTabs index={index} onSelect={setIndex} />

      {/* Mobile clips the off-screen frames; desktop lets the three panes flow. */}
      <div className="overflow-hidden xl:overflow-visible">
        <div
          className="frame-track flex -translate-x-full xl:translate-x-0 xl:items-start xl:gap-5"
          style={trackStyle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Frame 0 — left pane (Financials + TechCash); desktop far left. */}
          <div className="w-full shrink-0 xl:w-[260px]">
            <div className="space-y-4">
              <FinancialsPanel />
              <MealClicksPanel />
            </div>
          </div>

          {/* Frame 1 — center briefing; desktop middle, at its 680px width. */}
          <div className="w-full shrink-0 xl:w-auto xl:flex-1">
            <div className="mx-auto w-full max-w-content">
              <BriefingColumn />
            </div>
          </div>

          {/* Frame 2 — right pane (Catering); desktop far right. */}
          <div className="w-full shrink-0 xl:w-[260px]">
            <CateringPanel />
          </div>
        </div>
      </div>
    </>
  );
}
