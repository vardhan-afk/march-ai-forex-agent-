'use client';

import { useEffect, useState } from 'react';

type Price = {
  pair: string;
  price: number;
  change_pct: number;
};

export default function Ticker() {
  const [prices, setPrices] = useState<Price[]>([]);

  async function load() {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      setPrices(data);
    } catch (err) {
      console.error('Ticker load failed:', err);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (prices.length === 0) return null;

  const items = [...prices, ...prices]; // duplicate for seamless scroll

  return (
    <div style={{
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      border: '1px solid #333',
      borderRadius: 8,
      padding: '8px 0',
      background: '#111',
      marginBottom: 16,
    }}>
      <div style={{
        display: 'inline-block',
        animation: 'scrollTicker 25s linear infinite',
        fontFamily: 'monospace',
        fontSize: 13,
      }}>
        {items.map((p, i) => {
          const up = p.change_pct >= 0;
          const color = up ? '#0ca30c' : '#d03b3b';
          return (
            <span key={i} style={{ marginRight: 32 }}>
              <span style={{ color: '#eee', fontWeight: 500 }}>{p.pair}</span>{' '}
              <span style={{ color: '#999' }}>{p.price.toFixed(4)}</span>{' '}
              <span style={{ color }}>
                {up ? '▲' : '▼'} {Math.abs(p.change_pct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes scrollTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}