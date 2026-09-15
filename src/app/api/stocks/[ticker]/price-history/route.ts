import { NextRequest, NextResponse } from 'next/server';
import { fetchVietcapGapChart, fetchVietcapPriceHistory, fetchVietcapEvents } from '@/lib/vietcap-field-mapping';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await context.params;
  const cleanTicker = (ticker || '').trim().toUpperCase();

  if (!cleanTicker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  // Hỗ trợ countBack query param (mặc định 260, tối đa 2000)
  const rawCountBack = request.nextUrl.searchParams.get('countBack');
  const countBack = rawCountBack
    ? Math.min(Math.max(1, parseInt(rawCountBack, 10)), 2000)
    : 260;

  // Hỗ trợ timeFrame query param ('ONE_DAY' | 'ONE_WEEK' | 'ONE_MONTH')
  const rawTimeFrame = request.nextUrl.searchParams.get('timeFrame') || 'ONE_DAY';
  const timeFrame = ['ONE_DAY', 'ONE_WEEK', 'ONE_MONTH'].includes(rawTimeFrame)
    ? rawTimeFrame
    : 'ONE_DAY';

  try {
    // 1. Lấy song song dữ liệu nến Nhật và sự kiện doanh nghiệp (cổ tức / chia tách)
    const [gapBars, rawEvents] = await Promise.all([
      fetchVietcapGapChart(cleanTicker, { countBack, timeFrame }),
      fetchVietcapEvents(cleanTicker, { fromDate: '20160101', toDate: '20261231' }).catch(() => []),
    ]);

    const events = (rawEvents || [])
      .filter((ev) => ev.eventCode === 'DIV' || ev.eventCode === 'ISS')
      .map((ev) => {
        let dateStr = ev.exrightDate || ev.recordDate || ev.publicDate || '';
        if (dateStr.length === 8 && !dateStr.includes('-')) {
          dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        }
        let desc = 'Cổ tức';
        if (ev.eventCode === 'DIV') {
          if (ev.valuePerShare && ev.valuePerShare > 0) {
            desc = `Cổ tức tiền: ${ev.valuePerShare.toLocaleString('vi-VN')}đ`;
          } else if (ev.exerciseRatio && ev.exerciseRatio > 0) {
            desc = `Cổ tức CP: ${(ev.exerciseRatio * 100).toFixed(0)}%`;
          }
        } else if (ev.eventCode === 'ISS') {
          desc = `Phát hành${ev.exerciseRatio ? ` ${(ev.exerciseRatio * 100).toFixed(0)}%` : ''}`;
        }
        return {
          date: dateStr,
          eventCode: ev.eventCode,
          title: desc,
          valuePerShare: ev.valuePerShare,
          exerciseRatio: ev.exerciseRatio,
        };
      })
      .filter((ev) => ev.date.length === 10);

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
        timeFrame,
        count: history.length,
        history,
        events,
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
