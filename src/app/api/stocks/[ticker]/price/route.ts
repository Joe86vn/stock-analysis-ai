import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();
    
    // Gọi đến API Symbol Info của SSI iBoard kèm header giả lập trình duyệt để bypass 403
    const response = await fetch(`https://iboard.ssi.com.vn/dboard/api/db/getSymbolInfo?symbol=${ticker}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://iboard.ssi.com.vn/',
        'Accept': 'application/json',
      },
      next: { revalidate: 60 } // Cache trong 60 giây để tránh spam
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch price for ${ticker}, status: ${response.status}` }, { status: response.status });
    }

    const json = await response.json();
    
    if (json.status === 'ok' && json.data) {
      // Giá SSI trả về là đơn vị nghìn đồng (ví dụ 48.5 = 48,500đ)
      const lastPrice = json.data.lastPrice || json.data.refPrice || 0;
      const price = Math.round(lastPrice * 1000);
      
      if (price > 0) {
        return NextResponse.json({ price });
      }
    }
    
    return NextResponse.json({ error: 'Invalid data format from stock data provider' }, { status: 400 });
  } catch (err: any) {
    console.error('Error fetching stock price:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
