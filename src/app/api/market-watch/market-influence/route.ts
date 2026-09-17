import { NextRequest, NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// GraphQL-style endpoint from MasTrade
const buildUrl = (sortType: 'DESC' | 'ASC', fetchCount = 10) =>
  `https://mastrade.masvn.com/api/v2/vs/stockInfluence?query=query{vsStockInfluenceList(IndexCode:%22VN-INDEX%22,fetchCount:${fetchCount},SortType:%22${sortType}%22,SortBy:%22InfluenceIndex%22){_id,StockCode,InfluencePercent,InfluenceIndex,OrderType,Change,PerChange}}`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sortType = (searchParams.get('sort') ?? 'DESC').toUpperCase() as 'DESC' | 'ASC';
  const fetchCount = parseInt(searchParams.get('count') ?? '10', 10);

  try {
    const res = await fetch(buildUrl(sortType, fetchCount), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 30 },
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Market influence fetch failed:', err);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}

