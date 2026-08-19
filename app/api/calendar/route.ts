import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const now = new Date();
  const fromDate = from ? new Date(from) : now;
  const toDate = to ? new Date(to) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

  // Pull all rows, then filter with real Date comparisons (safe across timezones)
  const allRows = db.prepare(`SELECT * FROM calendar_events ORDER BY date ASC`).all() as { date: string }[];

  const rows = allRows.filter(row => {
    const eventDate = new Date(row.date);
    return eventDate >= fromDate && eventDate <= toDate;
  });

  return NextResponse.json(rows);
}