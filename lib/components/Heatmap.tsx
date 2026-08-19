'use client';

import { useEffect, useState } from 'react';

type Price = {
  pair: string;
  change_pct: number;
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];

export default function Heatmap() {
  const [prices, setPrices] = useState<Price[]>([]);

  async function load() {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      setPrices(data);
    } catch (err) {
      console.error('Heatmap load failed:', err);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  // Rough per-currency strength: average change across pairs it appears in
  function strengthFor(code: string) {
    const related = prices.filter((p) => p.pair.includes(code));
    if (related.length === 0) return 0;
    const isBase = (pair: string) => pair.startsWith(code);
    const total = related.reduce((sum, p) => {
      const sign = isBase(p.pair) ? 1 : -1;
      return sum + p.change_pct * sign;
    }, 0);
    return total / related.length;
  }

  if (prices.length === 0) {
    return <div style={{ padding: 16, color: '#888' }}>Loading heatmap...</div>;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 4,
      fontFamily: 'monospace',
    }}>
      {CURRENCIES.map((c) => {
        const val = strengthFor(c);
        const up = val >= 0;
        const bg = up
          ? `rgba(12,163,12,${0.15 + Math.min(Math.abs(val), 2) * 0.15})`
          : `rgba(208,59,59,${0.15 + Math.min(Math.abs(val), 2) * 0.15})`;
        const textColor = up ? '#0ca30c' : '#d03b3b';
        return (
          <div key={c} style={{
            background: bg,
            borderRadius: 6,
            padding: '10px 4px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#eee' }}>{c}</div>
            <div style={{ fontSize: 11, color: textColor }}>
              {up ? '+' : ''}{val.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}