'use client';

import { useEffect, useState } from 'react';

type NewsArticle = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
};

interface NewsFeedProps {
  onAskMarch?: (text: string) => void;
}

export default function NewsFeed({ onAskMarch }: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNews() {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      setArticles(data);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 30000);
    return () => clearInterval(interval);
  }, []);

  function askAboutArticle(a: NewsArticle) {
    const text = `Tell me more about this news headline: "${a.headline}" from ${a.source}.`;
    onAskMarch?.(text);
  }

  if (loading) {
    return <div style={{ padding: 16, color: '#888' }}>Loading news...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'monospace' }}>
      {articles.slice(0, 15).map((a) => {
        return (
          <div key={a.id} style={{ padding: 12, border: '1px solid #333', borderRadius: 8 }}>
              <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 6 }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{a.headline}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{a.source} · {new Date(a.published_at).toLocaleString()}</div>
            </a>
            {onAskMarch && (
              <button
                onClick={() => askAboutArticle(a)}
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
                }}
              >
                Ask March
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}