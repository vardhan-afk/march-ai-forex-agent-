import axios from 'axios';
import Parser from 'rss-parser';
import db from './db';

const rssParser = new Parser();

export async function refreshCalendar() {
  const res = await axios.get('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
  const events = res.data;

  const stmt = db.prepare(`
    INSERT INTO calendar_events (id, date, currency, event, impact, actual, forecast, previous, updated_at)
    VALUES (@id, @date, @currency, @event, @impact, @actual, @forecast, @previous, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      actual=excluded.actual, forecast=excluded.forecast, updated_at=excluded.updated_at
  `);

  const insertMany = db.transaction((rows: any[]) => {
    for (const e of rows) {
      stmt.run({
        id: `${e.date}-${e.currency}-${e.title}`,
        date: e.date,
        currency: e.country,
        event: e.title,
        impact: e.impact,
        actual: e.actual ?? '',
        forecast: e.forecast ?? '',
        previous: e.previous ?? '',
        updated_at: new Date().toISOString(),
      });
    }
  });

  insertMany(events);
  console.log(`Refreshed ${events.length} calendar events`);
}export async function refreshNews() {
  const apiKey = process.env.FINNHUB_API_KEY;console.log('Finnhub key present:', !!apiKey, 'length:', apiKey?.length ?? 0);
  const res = await axios.get('https://finnhub.io/api/v1/news', {
    params: { category: 'forex', token: apiKey },
  });
  const articles = res.data;

  const stmt = db.prepare(`
    INSERT INTO news_articles (id, headline, summary, source, url, published_at, updated_at)
    VALUES (@id, @headline, @summary, @source, @url, @published_at, @updated_at)
    ON CONFLICT(id) DO NOTHING
  `);

  const insertMany = db.transaction((rows: any[]) => {
    for (const a of rows) {
      stmt.run({
        id: String(a.id),
        headline: a.headline,
        summary: a.summary,
        source: a.source,
        url: a.url,
        published_at: new Date(a.datetime * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  });

  insertMany(articles);
  console.log(`Refreshed ${articles.length} news articles`);
}const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];

export async function refreshPrices() {
  const getPrice = db.prepare('SELECT price FROM prices WHERE pair = ?');
  const upsert = db.prepare(`
    INSERT INTO prices (pair, price, prev_price, change_pct, updated_at)
    VALUES (@pair, @price, @prev_price, @change_pct, @updated_at)
    ON CONFLICT(pair) DO UPDATE SET
      price=excluded.price, prev_price=excluded.prev_price,
      change_pct=excluded.change_pct, updated_at=excluded.updated_at
  `);

  for (const pair of PAIRS) {
    const base = pair.slice(0, 3);
    const quote = pair.slice(3, 6);
    try {
      let price: number | undefined;

      if (pair === 'XAUUSD') {
        const goldRes = await axios.get('https://api.gold-api.com/price/XAU');
        price = goldRes.data?.price;
      } else {
        const res = await axios.get(`https://open.er-api.com/v6/latest/${base}`);
        price = res.data?.rates?.[quote];
      }

      if (!price) continue;

      const old = getPrice.get(pair) as { price: number } | undefined;
      const prevPrice = old?.price ?? price;
      const changePct = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;

      upsert.run({
        pair,
        price,
        prev_price: prevPrice,
        change_pct: changePct,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`Price fetch failed for ${pair}:`, (err as Error).message);
    }
  }
  console.log(`Refreshed prices for ${PAIRS.length} pairs`);
}
const SPEECH_FEEDS = [
  { source: 'Fed', url: 'https://www.federalreserve.gov/feeds/speeches_and_testimony.xml' },
  { source: 'ECB', url: 'https://www.ecb.europa.eu/rss/press.xml' },
  { source: 'BOE', url: 'https://www.bankofengland.co.uk/rss/speeches' },
];

function extractSpeaker(source: string, title: string): string {
  if (source === 'BOE') {
    const m = title.match(/speech by (.+)$/i) || title.match(/slides by (.+)$/i);
    return m ? m[1].trim() : '';
  }
  if (source === 'ECB') {
    const m = title.match(/^([^:]+):/);
    return m ? m[1].trim() : '';
  }
  if (source === 'Fed') {
    const m = title.match(/^([^,]+),/);
    return m ? m[1].trim() : '';
  }
  return '';
}

export async function refreshSpeeches() {
  const upsert = db.prepare(`
    INSERT INTO speeches (id, source, speaker, title, url, published_at, updated_at)
    VALUES (@id, @source, @speaker, @title, @url, @published_at, @updated_at)
    ON CONFLICT(id) DO NOTHING
  `);

  const insertMany = db.transaction((rows: any[]) => {
    for (const row of rows) upsert.run(row);
  });

  let totalCount = 0;

 for (const feed of SPEECH_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      let items = parsed.items || [];

      // ECB's feed mixes press releases, data releases, and speeches together —
      // real speeches live under a /press/key/ URL path, so filter to just those
      if (feed.source === 'ECB') {
        items = items.filter((item) => (item.link ?? '').includes('/press/key/'));
      }

      const rows = items.map((item) => {
        const title = item.title ?? '';
        return {
          id: item.guid || item.link || `${feed.source}-${title}-${item.pubDate}`,
          source: feed.source,
          speaker: extractSpeaker(feed.source, title),
          title,
          url: item.link ?? '',
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      insertMany(rows);
      totalCount += rows.length;
    } catch (err) {
      console.error(`Speech fetch failed for ${feed.source}:`, (err as Error).message);
    }
  }

  console.log(`Refreshed ${totalCount} speeches across ${SPEECH_FEEDS.length} sources`);
}