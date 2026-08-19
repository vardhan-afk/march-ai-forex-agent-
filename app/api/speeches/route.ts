import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const rows = db.prepare('SELECT * FROM speeches ORDER BY published_at DESC LIMIT 50').all();
  return NextResponse.json(rows);
}