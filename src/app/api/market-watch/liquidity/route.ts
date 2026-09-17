import { NextResponse } from 'next/server';

const UPSTREAM = 'https://trading.vietcap.com.vn/api/chart/v3/OHLCChart/gap-liquidity';

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
