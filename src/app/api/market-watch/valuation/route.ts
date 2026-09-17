import { NextRequest, NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const VALID_TIMEFRAMES = new Set(['ONE_MONTH', 'ONE_YEAR', 'ALL']);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'pe'; // 'pe' | 'pb'
  const comGroupCode = searchParams.get('comGroupCode') ?? 'VNINDEX';
  let timeFrame = searchParams.get('timeFrame') ?? 'ALL';

  // Vietcap index-valuation API only accepts ONE_MONTH, ONE_YEAR, ALL. Map FIVE_YEAR/THREE_YEAR -> ALL
  if (!VALID_TIMEFRAMES.has(timeFrame)) {
    timeFrame = 'ALL';
  }

  const primaryUrl = `https://iq.vietcap.com.vn/api/iq-insight-service/v1/market-watch/index-valuation?type=${type}&comGroupCode=${comGroupCode}&timeFrame=${timeFrame}`;
  const secondaryUrl = `https://trading.vietcap.com.vn/api/iq-insight-service/v1/market-watch/index-valuation?type=${type}&comGroupCode=${comGroupCode}&timeFrame=${timeFrame}`;

  try {
    const res = await fetch(primaryUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.status === 200 || data.code === 0 || Array.isArray(data.data?.values))) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    console.error('Primary valuation fetch failed:', err);
  }

  try {
    const res2 = await fetch(secondaryUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });
    if (res2.ok) {
      const data2 = await res2.json();
      return NextResponse.json(data2);
    }
  } catch (err) {
    console.error('Secondary valuation fetch failed:', err);
  }

  return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
}

