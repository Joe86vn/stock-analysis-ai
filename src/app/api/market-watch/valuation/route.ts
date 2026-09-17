import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_BASE = 'https://trading.vietcap.com.vn/api/iq-insight-service/v1/market-watch/index-valuation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'pe'; // 'pe' | 'pb'
  const comGroupCode = searchParams.get('comGroupCode') ?? 'VNINDEX';
  const timeFrame = searchParams.get('timeFrame') ?? 'FIVE_YEAR';

  const url = `${UPSTREAM_BASE}?type=${type}&comGroupCode=${comGroupCode}&timeFrame=${timeFrame}`;

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
