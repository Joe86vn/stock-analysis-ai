import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_BASE = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/market-watch/breadth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const condition = searchParams.get('condition') ?? 'EMA50';
  const exchange = searchParams.get('exchange') ?? 'HSX,HNX,UPCOM';
  const fromDate = searchParams.get('fromDate') ?? '2015-01-01';
  const toDate = searchParams.get('toDate') ?? new Date().toISOString().split('T')[0];

  const url = `${UPSTREAM_BASE}?condition=${condition}&exchange=${encodeURIComponent(exchange)}&fromDate=${fromDate}&toDate=${toDate}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
