import { NextRequest, NextResponse } from 'next/server';
import { getFullStockRankingList, calculateStockRankingItem, FILTER_75_TICKERS } from '@/lib/filter-rs-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const refresh = searchParams.get('refresh') === 'true';

    // Nếu yêu cầu tính riêng cho 1 mã cụ thể
    if (ticker) {
      const item = await calculateStockRankingItem(ticker.trim().toUpperCase());
      if (!item) {
        return NextResponse.json({ error: `Could not calculate score for ${ticker}` }, { status: 404 });
      }
      return NextResponse.json({ success: true, item });
    }

    // Lấy toàn bộ danh sách 75 mã đã xếp hạng
    const rankings = await getFullStockRankingList(refresh);

    return NextResponse.json({
      success: true,
      count: rankings.length,
      totalTracked: FILTER_75_TICKERS.length,
      updatedAt: new Date().toISOString(),
      data: rankings,
    });
  } catch (error: any) {
    console.error('[API Ranking] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
