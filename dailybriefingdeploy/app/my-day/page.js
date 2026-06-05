'use client';
import { useState, useEffect, useCallback } from 'react';

// Badge palettes keep the exact original colors, with explicit dark: variants
// since these are accent chips (not the CSS-variable-backed semantic surfaces).
const BADGE = {
  urgent: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
  today: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  week: 'bg-[#E6F1FB] text-[#185FA5] dark:bg-[#1c2c3e] dark:text-[#8FB8E6]',
  fyi: 'bg-[#F1EFE8] text-[#5F5E5A] dark:bg-[#2a2a26] dark:text-[#B5B5AE]',
  done: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#1f3019] dark:text-[#9FD08A]',
};

function Badge({ type, children }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${BADGE[type] || BADGE.fyi}`}>
      {children}
    </span>
  );
}

function ActionItem({ item, onToggle }) {
  return (
    <div
      className={`mb-1.5 flex items-start gap-2.5 rounded-[10px] border border-line p-3 transition-all ${
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

// Compact single-meeting card for the "Next up" section at the bottom.
function NextUpCard({ event }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[10px] border border-line bg-surface p-4"
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
        <span className="text-lg">{icon}</span>
        <span className="text-base font-medium text-ink">{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}

function StatCard({ num, label }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface px-4 py-3.5 text-center">
      <div className="text-2xl font-medium text-ink">{num}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export default function MyDay() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

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

  const actionItems = (data.items || []).filter((i) => i.type !== 'fyi');
  const fyi = (data.items || []).filter((i) => i.type === 'fyi');
  const completed = actionItems.filter((i) => i.completed).length;
  const pending = actionItems.filter((i) => !i.completed).length;
  const nextEvent = (data.calendar || [])[0];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="m-0 text-[22px] font-medium text-heading">Daily briefing</h1>
        <div className="text-right">
          <div className="text-[13px] text-muted">{data.date}</div>
          <div className="text-[11px] text-muted">{data.briefingType} briefing</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <StatCard num={pending} label="To do" />
        <StatCard num={completed} label="Done" />
      </div>

      {actionItems.length > 0 && (
        <Section icon="📬" title="Action items" badge={<Badge type="urgent">{pending} pending</Badge>}>
          {actionItems
            .filter((i) => !i.completed)
            .map((i) => (
              <ActionItem key={i.id} item={i} onToggle={toggleItem} />
            ))}
          {actionItems.filter((i) => i.completed).length > 0 && (
            <>
              <p className="mb-1.5 mt-3 text-xs font-medium text-muted">Completed</p>
              {actionItems
                .filter((i) => i.completed)
                .map((i) => (
                  <ActionItem key={i.id} item={i} onToggle={toggleItem} />
                ))}
            </>
          )}
        </Section>
      )}

      {data.tomorrowPreview && (
        <div className="mb-6 rounded-[10px] border border-line bg-subtle p-3.5">
          <p className="m-0 text-[13px] font-medium text-muted">Coming up</p>
          <p className="mt-1 text-xs text-subtletext">{data.tomorrowPreview}</p>
        </div>
      )}

      {fyi.length > 0 && (
        <Section icon="ℹ️" title="FYI">
          {fyi.map((i) => (
            <div key={i.id} className="mb-1 rounded-[10px] border border-line bg-surface p-3.5 opacity-80">
              <p className="m-0 text-[13px] text-ink">{i.description}</p>
              <p className="mt-1 text-[11px] text-muted">
                <Badge type="fyi">{i.priorityLabel}</Badge> {i.sender && <span> · {i.sender}</span>}{' '}
                {i.age && <span> · {i.age}</span>}
              </p>
            </div>
          ))}
        </Section>
      )}

      {nextEvent && (
        <Section icon="📅" title="Next up">
          <NextUpCard event={nextEvent} />
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
