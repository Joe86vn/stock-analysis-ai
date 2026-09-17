import { NextRequest, NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// type: 'buy' | 'sell'
const TOP_PARAMS = {
  buy: 'TOP_FOREIGN_NET_BUY_VALUE',
  sell: 'TOP_FOREIGN_NET_SELL_VALUE',
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') ?? 'buy') as 'buy' | 'sell';
  const fetchCount = searchParams.get('count') ?? '10';

  const topParam = TOP_PARAMS[type] ?? TOP_PARAMS.buy;
  const url = `https://mastrade.masvn.com/api/v1/market/top?top=${topParam}&fetchCount=${fetchCount}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Foreign flow fetch failed:', err);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}

