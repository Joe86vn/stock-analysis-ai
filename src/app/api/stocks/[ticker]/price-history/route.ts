import { NextRequest, NextResponse } from 'next/server';
import { fetchVietcapGapChart, fetchVietcapPriceHistory } from '@/lib/vietcap-field-mapping';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await context.params;
  const cleanTicker = (ticker || '').trim().toUpperCase();

  if (!cleanTicker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    // 1. Ưu tiên lấy dữ liệu nến Nhật ĐÃ ĐIỀU CHỈNH CỔ TỨC (Adjusted OHLC) từ Vietcap Gap Chart API
    // 260 phiên giao dịch ~ 12 tháng tròn
    const gapBars = await fetchVietcapGapChart(cleanTicker, { countBack: 260 });

    if (gapBars && gapBars.length > 0) {
      const history = gapBars.map((bar) => {
        const dt = new Date(bar.time * 1000);
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const dateStr = `${day}/${month}`;

        return {
          date: dateStr,
          fullDate: bar.tradingDate,
          openPrice: bar.openPrice,
          highestPrice: bar.highestPrice,
          lowestPrice: bar.lowestPrice,
          closePrice: bar.closePrice,
          range: [bar.lowestPrice, bar.highestPrice] as [number, number],
          volume: bar.volume,
        };
      }).filter((item) => item.closePrice > 0);

      return NextResponse.json({
        ticker: cleanTicker,
        isAdjusted: true,
        source: 'vietcap-gap-chart',
        count: history.length,
        history,
      });
    }

    // 2. Fallback sang raw price history nếu gap-chart không có dữ liệu
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 375); // 12 tháng lịch sử
    const fromDate = pastDate.toISOString().slice(0, 10).replace(/-/g, '');
    const toDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const rawList = await fetchVietcapPriceHistory(cleanTicker, { fromDate, toDate, size: 260 });

    if (!rawList || rawList.length === 0) {
      return NextResponse.json({
        ticker: cleanTicker,
        isAdjusted: false,
        count: 0,
        history: [],
      });
    }

    // Sort chronologically (oldest -> newest)
    const sorted = [...rawList].sort((a, b) => {
      return new Date(a.tradingDate).getTime() - new Date(b.tradingDate).getTime();
    });

    const history = sorted.map((item) => {
      const dt = new Date(item.tradingDate);
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const dateStr = `${day}/${month}`;
      const fullDate = dt.toISOString().slice(0, 10);

      const closePrice = Number(item.closePrice || item.matchPrice || 0);
      const openPrice = Number(item.openPrice || closePrice);
      const rawHigh = Number(item.highestPrice || 0);
      const rawLow = Number(item.lowestPrice || 0);
      const highestPrice = rawHigh > 0 ? Math.max(rawHigh, openPrice, closePrice) : Math.max(openPrice, closePrice);
      const lowestPrice = rawLow > 0 ? Math.min(rawLow, openPrice, closePrice) : Math.min(openPrice, closePrice);
      const volume = Number(item.totalMatchVolume || 0);

      return {
        date: dateStr,
        fullDate,
        openPrice,
        highestPrice,
        lowestPrice,
        closePrice,
        range: [lowestPrice, highestPrice] as [number, number],
        volume,
      };
    }).filter((item) => item.closePrice > 0);

    return NextResponse.json({
      ticker: cleanTicker,
      isAdjusted: false,
      count: history.length,
      history,
    });
  } catch (error: any) {
    console.error(`[API /price-history] Error for ${cleanTicker}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch price history', message: error.message },
      { status: 500 }
    );
  }
}
