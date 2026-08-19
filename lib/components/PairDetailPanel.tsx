'use client';

import { useEffect, useState } from 'react';

interface PairDetailPanelProps {
  symbol: string | null;
  onClose: () => void;
  onAskMarch?: (text: string) => void;
}

type HistoricalPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
};

type EventItem = {
  id: string;
  date: string;
  currency: string;
  event: string;
  impact: string;
  actual: string;
  forecast: string;
  previous: string;
};

type PairData = {
  pair: string;
  currentPrice: { pair: string; price: number; prev_price: number; change_pct: number; updated_at: string } | null;
  historical: HistoricalPoint[];
  events: EventItem[];
  news: NewsItem[];
};

export default function PairDetailPanel({ symbol, onClose, onAskMarch }: PairDetailPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [data, setData] = useState<PairData | null>(null);
  const [loading, setLoading] = useState(false);
  const [rangeYears, setRangeYears] = useState<1 | 10>(1);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch('/api/pair/' + symbol)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error('PairDetailPanel load failed:', err))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (!symbol) return null;

  const filteredHistorical = (data?.historical ?? []).filter((point) => {
    if (rangeYears === 10) return true;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    return new Date(point.date) >= cutoff;
  });

  function askAboutPair() {
    if (!data) return;
    const price = data.currentPrice;
    const priceLine = price
      ? `currently at ${price.price} with a ${price.change_pct >= 0 ? '+' : ''}${price.change_pct.toFixed(2)}% change`
      : 'no live price data available right now';

    const topEvent = data.events[0];
    const eventLine = topEvent
      ? ` The most relevant upcoming event is ${topEvent.currency} - ${topEvent.event} on ${topEvent.date} (impact: ${topEvent.impact}).`
      : '';

    const topNews = data.news[0];
    const newsLine = topNews ? ` Related news: "${topNews.headline}" from ${topNews.source}.` : '';

    onAskMarch?.(`Tell me about ${symbol}. It's ${priceLine}.${eventLine}${newsLine}`);
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', zIndex: 1000 }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: isFullscreen ? '100%' : '480px',
          maxWidth: '100%',
          background: '#0a0a0a',
          borderLeft: '1px solid #222',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
          transition: 'width 0.2s ease',
        }}
      >
        <PanelHeader
          symbol={symbol}
          data={data}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          onClose={onClose}
          onAskMarch={onAskMarch ? askAboutPair : undefined}
        />

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading && <p style={{ color: '#888' }}>Loading {symbol} data...</p>}

          {!loading && data && (
            <PanelBody
              data={data}
              rangeYears={rangeYears}
              setRangeYears={setRangeYears}
              filteredHistorical={filteredHistorical}
            />
          )}
        </div>
      </div>
    </>
  );
}

function PanelHeader(props: {
  symbol: string;
  data: PairData | null;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  onClose: () => void;
  onAskMarch?: () => void;
}) {
  const { symbol, data, isFullscreen, setIsFullscreen, onClose, onAskMarch } = props;
  const price = data && data.currentPrice;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #222',
      }}
    >
      <div>
        <h2 style={{ color: '#fff', fontSize: 18, margin: 0 }}>{symbol}</h2>
        {price && (
          <div style={{ marginTop: 4, display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ color: '#fff', fontSize: 20 }}>{price.price.toFixed(4)}</span>
            <span style={{ color: price.change_pct >= 0 ? '#0ca30c' : '#d03b3b', fontSize: 13 }}>
              {price.change_pct >= 0 ? '+' : ''}
              {price.change_pct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {onAskMarch && (
          <button onClick={onAskMarch} style={{ ...buttonStyle, color: '#0ff5c9', borderColor: '#0ff5c9' }}>
            Ask March
          </button>
        )}
        <button onClick={() => setIsFullscreen(!isFullscreen)} style={buttonStyle}>
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
        <button onClick={onClose} style={buttonStyle}>
          Close
        </button>
      </div>
    </div>
  );
}

function PanelBody(props: {
  data: PairData;
  rangeYears: 1 | 10;
  setRangeYears: (v: 1 | 10) => void;
  filteredHistorical: HistoricalPoint[];
}) {
  const { data, rangeYears, setRangeYears, filteredHistorical } = props;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ color: '#aaa', fontSize: 13, margin: 0 }}>Historical Price</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setRangeYears(1)} style={rangeButtonStyle(rangeYears === 1)}>
              1Y
            </button>
            <button onClick={() => setRangeYears(10)} style={rangeButtonStyle(rangeYears === 10)}>
              10Y
            </button>
          </div>
        </div>
        <SimpleLineChart points={filteredHistorical} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: '#aaa', fontSize: 13, marginBottom: 10 }}>Related Events</h3>
        {data.events.length === 0 && <p style={{ color: '#555', fontSize: 12 }}>No related events found.</p>}
        {data.events.map((e) => (
          <EventRow key={e.id} item={e} />
        ))}
      </div>

      <div>
        <h3 style={{ color: '#aaa', fontSize: 13, marginBottom: 10 }}>Related News</h3>
        {data.news.length === 0 && <p style={{ color: '#555', fontSize: 12 }}>No related news found.</p>}
        {data.news.map((n) => (
          <NewsRow key={n.id} item={n} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ item }: { item: EventItem }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 12 }}>
      <div style={{ color: '#666' }}>
        {item.date} - {item.currency} - {item.impact}
      </div>
      <div style={{ color: '#ddd' }}>{item.event}</div>
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  const linkStyle = {
    display: 'block',
    padding: '8px 0',
    borderBottom: '1px solid #1a1a1a',
    textDecoration: 'none',
  };
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      <div style={{ color: '#ddd', fontSize: 13 }}>{item.headline}</div>
      <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
        {item.source} - {item.published_at}
      </div>
    </a>
  );
}

function SimpleLineChart({ points }: { points: HistoricalPoint[] }) {
  if (points.length === 0) {
    return <p style={{ color: '#555', fontSize: 12 }}>No historical data available.</p>;
  }

  const width = 440;
  const height = 160;
  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const pathParts: string[] = [];
  points.forEach((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.close - min) / range) * height;
    pathParts.push((i === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + y.toFixed(1));
  });
  const pathD = pathParts.join(' ');

  const isUp = points[points.length - 1].close >= points[0].close;

  return (
    <svg width="100%" viewBox={'0 0 ' + width + ' ' + height} style={{ display: 'block' }}>
      <path d={pathD} fill="none" stroke={isUp ? '#0ca30c' : '#d03b3b'} strokeWidth="1.5" />
    </svg>
  );
}

const buttonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #333',
  color: '#aaa',
  padding: '4px 10px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
};

function rangeButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#222' : 'transparent',
    border: '1px solid #333',
    color: '#ccc',
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
}