'use client';

import { useEffect, useState } from 'react';

type Price = {
  pair: string;
  price: number;
  change_pct: number;
};

interface PriceCardsProps {
  onSelectPair: (pair: string) => void;
  onAskMarch?: (text: string) => void;
}

export default function PriceCards({ onSelectPair, onAskMarch }: PriceCardsProps) {
  const [prices, setPrices] = useState<Price[]>([]);

  async function load() {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      setPrices(data);
    } catch (err) {
      console.error('PriceCards load failed:', err);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  function askAboutPrice(e: React.MouseEvent, p: Price) {
    e.stopPropagation();
    const up = p.change_pct >= 0;
    const text = `What's going on with ${p.pair}? It's currently at ${p.price} with a ${up ? '+' : ''}${p.change_pct.toFixed(2)}% change.`;
    onAskMarch?.(text);
  }

  if (prices.length === 0) {
    return <div style={{ padding: 16, color: '#888' }}>Loading prices...</div>;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 10,
      marginBottom: 20,
    }}>
      {prices.map((p) => {
        const up = p.change_pct >= 0;
        const color = up ? '#0ca30c' : '#d03b3b';
        return (
          <div
            key={p.pair}
            onClick={() => onSelectPair(p.pair)}
            style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: 8,
              padding: 12,
              fontFamily: 'monospace',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#eee' }}>{p.pair}</span>
              <span style={{ fontSize: 12, color }}>
                {up ? '+' : ''}{p.change_pct.toFixed(2)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 16, color: '#fff' }}>{p.price.toFixed(4)}</div>
              {onAskMarch && (
                <button
                  onClick={(e) => askAboutPrice(e, p)}
                  title="Ask March about this"
                  style={{
                    background: 'transparent',
                    border: '1px solid #333',
                    color: '#0ff5c9',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Ask
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}