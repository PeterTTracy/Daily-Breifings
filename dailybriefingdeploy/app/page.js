'use client';
import { useState, useEffect, useCallback } from 'react';

const NAVY = '#1B3A5C';
const ACCENT = '#2E75B6';
const RED = '#E24B4A';
const AMBER = '#BA7517';
const GREEN = '#1D9E75';
const GRAY = '#888780';

function Badge({ type, children }) {
  const colors = {
    urgent: { bg: '#FCEBEB', color: '#A32D2D' },
    today: { bg: '#FAEEDA', color: '#854F0B' },
    week: { bg: '#E6F1FB', color: '#185FA5' },
    fyi: { bg: '#F1EFE8', color: '#5F5E5A' },
    done: { bg: '#EAF3DE', color: '#3B6D11' },
    alert: { bg: '#FCEBEB', color: '#A32D2D' },
  };
  const c = colors[type] || colors.fyi;
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500, background: c.bg, color: c.color }}>{children}</span>;
}

function ActionItem({ item, onToggle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
      borderRadius: 10, marginBottom: 6,
      background: item.completed ? '#f0f0ec' : '#fff',
      opacity: item.completed ? 0.5 : 1,
      border: '0.5px solid #e0ddd5',
      transition: 'all 0.2s',
    }}>
      <input type="checkbox" checked={item.completed} onChange={() => onToggle(item.id)}
        style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer', accentColor: ACCENT }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, color: '#2C2C2A', margin: 0, textDecoration: item.completed ? 'line-through' : 'none' }}>
          {item.description}
        </p>
        <p style={{ fontSize: 12, color: '#888780', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Badge type={item.priority}>{item.priorityLabel}</Badge>
          {item.sender && <span>{item.sender}</span>}
          {item.age && <span>· {item.age}</span>}
          {item.note && <span>· {item.note}</span>}
        </p>
      </div>
    </div>
  );
}

function CalendarItem({ event }) {
  const isHighlight = event.highlight;
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 4,
      background: '#fff', border: '0.5px solid #e0ddd5',
      borderLeft: isHighlight ? `3px solid ${RED}` : '0.5px solid #e0ddd5',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: ACCENT, minWidth: 100, whiteSpace: 'nowrap' }}>{event.time}</div>
      <div>
        <div style={{ fontSize: 14, color: '#2C2C2A', fontWeight: isHighlight ? 500 : 400 }}>{event.title}</div>
        <div style={{ fontSize: 12, color: '#888780' }}>{event.location}</div>
      </div>
    </div>
  );
}

function AlertCard({ alert }) {
  return (
    <div style={{ background: '#FCEBEB', borderLeft: '3px solid #E24B4A', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', margin: 0 }}>{alert.title}</p>
      <p style={{ fontSize: 12, color: '#791F1F', margin: '3px 0 0' }}>{alert.description}</p>
    </div>
  );
}

function PrepCard({ text }) {
  return (
    <div style={{ background: '#E6F1FB', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: '#185FA5', margin: 0 }}>Prep notes</p>
      <p style={{ fontSize: 12, color: '#185FA5', margin: '4px 0 0' }}>{text}</p>
    </div>
  );
}

function Section({ icon, title, badge, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid #e0ddd5' }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#2C2C2A' }}>{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}

function StatCard({ num, label }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', textAlign: 'center', border: '0.5px solid #e0ddd5' }}>
      <div style={{ fontSize: 26, fontWeight: 500, color: '#2C2C2A' }}>{num}</div>
      <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
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
      <div style={{ fontSize: 18, color: GRAY }}>Loading briefing...</div>
    </div>
  );

  if (error || !data) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, color: RED }}>No briefing available yet</div>
      <p style={{ fontSize: 14, color: GRAY, marginTop: 8 }}>The first briefing will appear after the scheduled task runs.</p>
      <button onClick={fetchBriefing} style={{ marginTop: 16, padding: '10px 24px', fontSize: 14, borderRadius: 8, border: `1px solid ${ACCENT}`, background: 'white', color: ACCENT, cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );

  const actionItems = (data.items || []).filter(i => i.type !== 'fyi');
  const fyi = (data.items || []).filter(i => i.type === 'fyi');
  const completed = actionItems.filter(i => i.completed).length;
  const pending = actionItems.filter(i => !i.completed).length;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 40px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: NAVY, margin: 0 }}>Daily briefing</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: GRAY }}>{data.date}</div>
          <div style={{ fontSize: 11, color: GRAY }}>{data.briefingType} briefing</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard num={pending} label="To do" />
        <StatCard num={data.calendar?.length || 0} label={data.briefingType === 'afternoon' ? 'Tomorrow' : 'Meetings'} />
        <StatCard num={completed} label="Done" />
      </div>

      {data.alerts?.length > 0 && (
        <Section icon="⚠️" title="Alerts">
          {data.alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
        </Section>
      )}

      {actionItems.length > 0 && (
        <Section icon="📬" title="Action items" badge={<Badge type="urgent">{pending} pending</Badge>}>
          {actionItems.filter(i => !i.completed).map(i => <ActionItem key={i.id} item={i} onToggle={toggleItem} />)}
          {actionItems.filter(i => i.completed).length > 0 && (
            <>
              <p style={{ fontSize: 12, color: GRAY, margin: '12px 0 6px', fontWeight: 500 }}>Completed</p>
              {actionItems.filter(i => i.completed).map(i => <ActionItem key={i.id} item={i} onToggle={toggleItem} />)}
            </>
          )}
        </Section>
      )}

      {data.calendar?.length > 0 && (
        <Section icon="📅" title={data.briefingType === 'afternoon' ? 'Tomorrow\'s schedule' : 'Today\'s schedule'}>
          {data.calendar.map((e, i) => <CalendarItem key={i} event={e} />)}
          {data.prepNotes && <PrepCard text={data.prepNotes} />}
        </Section>
      )}

      {data.tomorrowPreview && (
        <div style={{ background: '#f8f8f5', borderRadius: 10, padding: '12px 14px', marginBottom: 24, border: '0.5px solid #e0ddd5' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: GRAY, margin: 0 }}>Coming up</p>
          <p style={{ fontSize: 12, color: '#5F5E5A', margin: '4px 0 0' }}>{data.tomorrowPreview}</p>
        </div>
      )}

      {fyi.length > 0 && (
        <Section icon="ℹ️" title="FYI">
          {fyi.map(i => (
            <div key={i.id} style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 4, background: '#fff', border: '0.5px solid #e0ddd5', opacity: 0.8 }}>
              <p style={{ fontSize: 13, color: '#2C2C2A', margin: 0 }}>{i.description}</p>
              <p style={{ fontSize: 11, color: '#888780', margin: '3px 0 0' }}>
                <Badge type="fyi">{i.priorityLabel}</Badge> {i.sender && <span> · {i.sender}</span>} {i.age && <span> · {i.age}</span>}
              </p>
            </div>
          ))}
        </Section>
      )}

      <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '0.5px solid #e0ddd5' }}>
        <button onClick={fetchBriefing} style={{ padding: '10px 24px', fontSize: 13, borderRadius: 8, border: `1px solid ${ACCENT}`, background: 'white', color: ACCENT, cursor: 'pointer' }}>
          Refresh
        </button>
        {lastRefresh && <p style={{ fontSize: 11, color: GRAY, marginTop: 8 }}>Last updated {lastRefresh.toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}
