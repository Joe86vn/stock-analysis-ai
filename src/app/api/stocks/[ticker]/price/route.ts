import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();

    // Nguồn 1: Bảng giá MAS (Mirae Asset Vietnam) - siêu nhanh & không bị chặn Cloudflare
    try {
      const masRes = await fetch(
        `https://masboard.masvn.com/api/v1/market/symbolLatest?symbolList=${ticker}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://masboard.masvn.com/',
            Accept: 'application/json, text/plain, */*',
          },
          next: { revalidate: 60 },
        }
      );

      if (masRes.ok) {
        const contentType = masRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const masData = await masRes.json();
          if (Array.isArray(masData) && masData.length > 0) {
            const item = masData[0];
            // 'c' là giá đóng cửa / khớp lệnh mới nhất (đơn vị VNĐ chuẩn, ví dụ 21700đ hoặc 48500đ)
            const price = item.c || item.odC || item.a || 0;
            if (price > 0) {
              return NextResponse.json({ price, source: 'MAS' });
            }
          }
        }
      }
    } catch (masErr) {
      console.warn('MAS API fetch failed, attempting SSI fallback:', masErr);
    }

    // Nguồn 2 (Dự phòng): Bảng giá SSI iBoard
    try {
      const ssiRes = await fetch(
        `https://iboard.ssi.com.vn/dboard/api/db/getSymbolInfo?symbol=${ticker}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://iboard.ssi.com.vn/',
            Accept: 'application/json',
          },
          next: { revalidate: 60 },
        }
      );

      if (ssiRes.ok) {
        const contentType = ssiRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await ssiRes.json();
          if (json.status === 'ok' && json.data) {
            const lastPrice = json.data.lastPrice || json.data.refPrice || 0;
            const price = Math.round(lastPrice * 1000);
            if (price > 0) {
              return NextResponse.json({ price, source: 'SSI' });
            }
          }
        }
      }
    } catch (ssiErr) {
      console.warn('SSI API fetch failed:', ssiErr);
    }

    return NextResponse.json(
      { error: `Could not fetch live stock price for ${ticker}` },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('Error in stock price API route:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
