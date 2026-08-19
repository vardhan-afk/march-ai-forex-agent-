import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const rows = db.prepare(`SELECT * FROM prices`).all();
  return NextResponse.json(rows);
}