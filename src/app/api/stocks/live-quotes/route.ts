import { NextRequest, NextResponse } from 'next/server';

export interface LiveQuoteItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  sessionVolume: number;
  sessionValueBillion: number;
  refPrice: number;
  open: number;
  high: number;
  low: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
      return NextResponse.json({ error: 'Symbols parameter is required' }, { status: 400 });
    }

    const symbolsArray = symbolsParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (symbolsArray.length === 0) {
      return NextResponse.json({ success: true, count: 0, quotes: {} });
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://masboard.masvn.com/',
      Accept: 'application/json, text/plain, */*',
    };

    // Chia nhỏ thành các nhóm 40 mã để gửi đồng thời, tránh URL quá dài và đảm bảo tốc độ tối đa
    const chunkSize = 40;
    const chunks: string[][] = [];
    for (let i = 0; i < symbolsArray.length; i += chunkSize) {
      chunks.push(symbolsArray.slice(i, i + chunkSize));
    }

    const quotes: Record<string, LiveQuoteItem> = {};

    await Promise.all(
      chunks.map(async (chunk) => {
        const symbolList = chunk.join(',');
        try {
          const res = await fetch(
            `https://masboard.masvn.com/api/v1/market/symbolLatest?symbolList=${symbolList}`,
            {
              headers,
              next: { revalidate: 10 }, // Cache 10 giây
            }
          );

          if (!res.ok) return;
          const data = await res.json();
          if (!Array.isArray(data)) return;

          data.forEach((item: any) => {
            if (!item || !item.s) return;
            const s = String(item.s).toUpperCase();
            const price = item.c || item.odC || item.a || 0;
            const change = typeof item.ch === 'number' ? item.ch : 0;
            const changePercent =
              typeof item.r === 'number' ? Math.round(item.r * 10000) / 100 : 0;
            const sessionValueBillion =
              typeof item.va === 'number'
                ? Math.round((item.va / 1_000_000_000) * 10) / 10
                : 0;
            const sessionVolume = typeof item.vo === 'number' ? item.vo : (item.v || 0);
            const refPrice = price && change !== undefined ? price - change : 0;

            quotes[s] = {
              symbol: s,
              price,
              change,
              changePercent,
              sessionVolume,
              sessionValueBillion,
              refPrice,
              open: item.o || price,
              high: item.h || price,
              low: item.l || price,
            };
          });
        } catch (chunkErr) {
          console.warn('[API LiveQuotes] Error fetching chunk:', symbolList, chunkErr);
        }
      })
    );

    return NextResponse.json({
      success: true,
      count: Object.keys(quotes).length,
      quotes,
    });
  } catch (error: any) {
    console.error('[API LiveQuotes] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
