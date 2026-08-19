'use client';

import { useEffect, useState } from 'react';

type CalendarEvent = {
  id: string;
  date: string;
  currency: string;
  event: string;
  impact: string;
  actual: string;
  forecast: string;
  previous: string;
};

interface CalendarWidgetProps {
  onAskMarch?: (text: string) => void;
}

export default function CalendarWidget({ onAskMarch }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  const impactColor: Record<string, string> = {
    High: '#d03b3b',
    Medium: '#eda100',
    Low: '#0ca30c',
    Holiday: '#888888',
  };

  function askAboutEvent(e: CalendarEvent) {
    const text = `Tell me about this calendar event: ${e.currency} - ${e.event} on ${new Date(e.date).toLocaleString()}. Impact: ${e.impact}. Forecast: ${e.forecast || 'N/A'}, Previous: ${e.previous || 'N/A'}.`;
    onAskMarch?.(text);
  }

  if (loading) return <div style={{ padding: 16, color: '#888' }}>Loading calendar...</div>;

  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, overflow: 'hidden', fontFamily: 'monospace' }}>
      {events.slice(0, 30).map((e, i) => (
        <div
          key={e.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            fontSize: 13,
            borderBottom: i < 29 ? '1px solid #222' : 'none',
          }}
        >
          <span style={{ width: 3, height: 16, background: impactColor[e.impact] || '#555', borderRadius: 2 }} />
          <span style={{ color: '#888', minWidth: 140 }}>{new Date(e.date).toLocaleString()}</span>
          <span style={{ color: '#aaa', minWidth: 36 }}>{e.currency}</span>
          <span style={{ flex: 1 }}>{e.event}</span>
          {onAskMarch && (
            <button
              onClick={() => askAboutEvent(e)}
              title="Ask March about this"
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#0ff5c9',
                fontFamily: 'monospace',
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ask March
            </button>
          )}
        </div>
      ))}
    </div>
  );
}