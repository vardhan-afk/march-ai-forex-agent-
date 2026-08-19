import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../lib/db';

// Map a pair symbol to the currency codes relevant to it, for filtering events/news
function getCurrenciesForPair(pair: string): string[] {
  if (pair === 'XAUUSD') return ['XAU', 'GOLD', 'USD'];
  if (pair.length === 6) {
    return [pair.slice(0, 3), pair.slice(3, 6)];
  }
  return [pair];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const pair = symbol.toUpperCase();

  const currencies = getCurrenciesForPair(pair);

  // Current price snapshot
  const currentPrice = db
    .prepare('SELECT * FROM prices WHERE pair = ?')
    .get(pair);

  // Historical OHLC series, oldest to newest
  const historical = db
    .prepare('SELECT date, open, high, low, close, volume FROM historical_prices WHERE pair = ? ORDER BY date ASC')
    .all(pair);

  // Calendar events matching this pair's currencies
  const currencyPlaceholders = currencies.map(() => '?').join(',');
  const events = db
    .prepare(`SELECT * FROM calendar_events WHERE currency IN (${currencyPlaceholders}) ORDER BY date ASC LIMIT 20`)
    .all(...currencies);

  // News matching this pair's currencies (basic text match on headline/summary)
  const newsLikeClauses = currencies
    .map(() => '(headline LIKE ? OR summary LIKE ?)')
    .join(' OR ');
  const newsParams = currencies.flatMap((c) => [`%${c}%`, `%${c}%`]);
  const news = db
    .prepare(`SELECT * FROM news_articles WHERE ${newsLikeClauses} ORDER BY published_at DESC LIMIT 20`)
    .all(...newsParams);

  return NextResponse.json({
    pair,
    currentPrice: currentPrice || null,
    historical,
    events,
    news,
  });
}