import { NextResponse } from 'next/server';

const UPSTREAM = 'https://mastrade.masvn.com/api/v1/market/minuteChart?symbol=VN-INDEX';

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
