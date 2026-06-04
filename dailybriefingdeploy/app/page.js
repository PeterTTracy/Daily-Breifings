'use client';
import { useState, useEffect, useCallback } from 'react';

// Full color tokens for light + dark mode. Every component reads from the
// active theme object (`t`) rather than hardcoded hex values.
const themes = {
  light: {
    name: 'light',
    icon: '🌙',
    pageBg: '#f5f5f0',
    cardBg: '#ffffff',
    cardBorder: '#e0ddd5',
    sectionBorder: '#e0ddd5',
    textPrimary: '#2C2C2A',
    textSecondary: '#888780',
    heading: '#1B3A5C',
    accent: '#2E75B6',
    completedBg: '#f0f0ec',
    subtleBg: '#f8f8f5',
    subtleText: '#5F5E5A',
    highlight: '#E24B4A',
    error: '#E24B4A',
    badges: {
      urgent: { bg: '#FCEBEB', color: '#A32D2D' },
      today: { bg: '#FAEEDA', color: '#854F0B' },
      week: { bg: '#E6F1FB', color: '#185FA5' },
      fyi: { bg: '#F1EFE8', color: '#5F5E5A' },
      done: { bg: '#EAF3DE', color: '#3B6D11' },
    },
  },
  dark: {
    name: 'dark',
    icon: '☀️',
    pageBg: '#141619',
    cardBg: '#1d2025',
    cardBorder: '#2d323a',
    sectionBorder: '#2d323a',
    textPrimary: '#e6e6e2',
    textSecondary: '#9a9a93',
    heading: '#8FB8E6',
    accent: '#5B9BD5',
    completedBg: '#23272d',
    subtleBg: '#191c20',
    subtleText: '#b5b5ae',
    highlight: '#E2706F',
    error: '#E2706F',
    badges: {
      urgent: { bg: '#3a2020', color: '#F0A3A3' },
      today: { bg: '#3a2e18', color: '#E5BC7E' },
      week: { bg: '#1c2c3e', color: '#8FB8E6' },
      fyi: { bg: '#2a2a26', color: '#B5B5AE' },
      done: { bg: '#1f3019', color: '#9FD08A' },
    },
  },
};

function Badge({ type, t, children }) {
  const c = t.badges[type] || t.badges.fyi;
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500, background: c.bg, color: c.color }}>{children}</span>;
}

function ActionItem({ item, onToggle, t }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
      borderRadius: 10, marginBottom: 6,
      background: item.completed ? t.completedBg : t.cardBg,
      opacity: item.completed ? 0.5 : 1,
      border: `0.5px solid ${t.cardBorder}`,
      transition: 'all 0.2s',
    }}>
      <input type="checkbox" checked={item.completed} onChange={() => onToggle(item.id)}
        style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer', accentColor: t.accent }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, color: t.textPrimary, margin: 0, textDecoration: item.completed ? 'line-through' : 'none' }}>
          {item.description}
        </p>
        <p style={{ fontSize: 12, color: t.textSecondary, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Badge type={item.priority} t={t}>{item.priorityLabel}</Badge>
          {item.sender && <span>{item.sender}</span>}
          {item.age && <span>· {item.age}</span>}
          {item.note && <span>· {item.note}</span>}
        </p>
      </div>
    </div>
  );
}

// Compact single-meeting card used by the "Next up" section at the bottom.
function NextUpCard({ event, t }) {
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', borderRadius: 10,
      background: t.cardBg,
      border: `0.5px solid ${t.cardBorder}`,
      borderLeft: event.highlight ? `3px solid ${t.highlight}` : `0.5px solid ${t.cardBorder}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: t.accent, minWidth: 100, whiteSpace: 'nowrap' }}>{event.time}</div>
      <div>
        <div style={{ fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{event.title}</div>
        <div style={{ fontSize: 12, color: t.textSecondary }}>{event.location}</div>
      </div>
    </div>
  );
}

function Section({ icon, title, badge, t, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `0.5px solid ${t.sectionBorder}` }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary }}>{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}

function StatCard({ num, label, t }) {
  return (
    <div style={{ background: t.cardBg, borderRadius: 10, padding: '14px 16px', textAlign: 'center', border: `0.5px solid ${t.cardBorder}` }}>
      <div style={{ fontSize: 26, fontWeight: 500, color: t.textPrimary }}>{num}</div>
      <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ThemeToggle({ t, onToggle }) {
  return (
    <button onClick={onToggle} aria-label="Toggle dark mode" title="Toggle dark mode"
      style={{
        background: 'transparent', border: `0.5px solid ${t.cardBorder}`, borderRadius: 8,
        padding: '6px 9px', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: t.textPrimary,
      }}>
      {t.icon}
    </button>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [theme, setTheme] = useState('light');

  // Restore saved theme preference on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('briefing-theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    } catch (e) {}
  }, []);

  // Keep the page background in sync with the active theme.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.background = themes[theme].pageBg;
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('briefing-theme', next); } catch (e) {}
      return next;
    });
  };

  const t = themes[theme];

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

  useEffect(() => { fetchBriefing(); }, [fetchBriefing]);

  const toggleItem = async (id) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, completed: !i.completed } : i),
    }));
    try {
      await fetch('/api/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    } catch (e) {}
  };

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, color: t.textSecondary }}>Loading briefing...</div>
    </div>
  );

  if (error || !data) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, color: t.error }}>No briefing available yet</div>
      <p style={{ fontSize: 14, color: t.textSecondary, marginTop: 8 }}>The first briefing will appear after the scheduled task runs.</p>
      <button onClick={fetchBriefing} style={{ marginTop: 16, padding: '10px 24px', fontSize: 14, borderRadius: 8, border: `1px solid ${t.accent}`, background: t.cardBg, color: t.accent, cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );

  const actionItems = (data.items || []).filter(i => i.type !== 'fyi');
  const fyi = (data.items || []).filter(i => i.type === 'fyi');
  const completed = actionItems.filter(i => i.completed).length;
  const pending = actionItems.filter(i => !i.completed).length;
  const nextEvent = (data.calendar || [])[0];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 40px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: t.heading, margin: 0 }}>Daily briefing</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: t.textSecondary }}>{data.date}</div>
            <div style={{ fontSize: 11, color: t.textSecondary }}>{data.briefingType} briefing</div>
          </div>
          <ThemeToggle t={t} onToggle={toggleTheme} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard num={pending} label="To do" t={t} />
        <StatCard num={completed} label="Done" t={t} />
      </div>

      {actionItems.length > 0 && (
        <Section icon="📬" title="Action items" t={t} badge={<Badge type="urgent" t={t}>{pending} pending</Badge>}>
          {actionItems.filter(i => !i.completed).map(i => <ActionItem key={i.id} item={i} onToggle={toggleItem} t={t} />)}
          {actionItems.filter(i => i.completed).length > 0 && (
            <>
              <p style={{ fontSize: 12, color: t.textSecondary, margin: '12px 0 6px', fontWeight: 500 }}>Completed</p>
              {actionItems.filter(i => i.completed).map(i => <ActionItem key={i.id} item={i} onToggle={toggleItem} t={t} />)}
            </>
          )}
        </Section>
      )}

      {data.tomorrowPreview && (
        <div style={{ background: t.subtleBg, borderRadius: 10, padding: '12px 14px', marginBottom: 24, border: `0.5px solid ${t.cardBorder}` }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: t.textSecondary, margin: 0 }}>Coming up</p>
          <p style={{ fontSize: 12, color: t.subtleText, margin: '4px 0 0' }}>{data.tomorrowPreview}</p>
        </div>
      )}

      {fyi.length > 0 && (
        <Section icon="ℹ️" title="FYI" t={t}>
          {fyi.map(i => (
            <div key={i.id} style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 4, background: t.cardBg, border: `0.5px solid ${t.cardBorder}`, opacity: 0.85 }}>
              <p style={{ fontSize: 13, color: t.textPrimary, margin: 0 }}>{i.description}</p>
              <p style={{ fontSize: 11, color: t.textSecondary, margin: '3px 0 0' }}>
                <Badge type="fyi" t={t}>{i.priorityLabel}</Badge> {i.sender && <span> · {i.sender}</span>} {i.age && <span> · {i.age}</span>}
              </p>
            </div>
          ))}
        </Section>
      )}

      {nextEvent && (
        <Section icon="📅" title="Next up" t={t}>
          <NextUpCard event={nextEvent} t={t} />
        </Section>
      )}

      <div style={{ textAlign: 'center', padding: '20px 0', borderTop: `0.5px solid ${t.sectionBorder}` }}>
        <button onClick={fetchBriefing} style={{ padding: '10px 24px', fontSize: 13, borderRadius: 8, border: `1px solid ${t.accent}`, background: t.cardBg, color: t.accent, cursor: 'pointer' }}>
          Refresh
        </button>
        {lastRefresh && <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 8 }}>Last updated {lastRefresh.toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}
