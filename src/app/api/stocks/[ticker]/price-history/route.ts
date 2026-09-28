import { NextRequest, NextResponse } from 'next/server';
import { fetchVietcapGapChart, fetchVietcapPriceHistory, fetchVietcapEvents } from '@/lib/vietcap-field-mapping';
import { getPriceHistoryFromR2, putPriceHistoryToR2 } from '@/lib/r2-storage';

interface TodayExrightCache {
  date: string;
  tickers: Set<string>;
  fetchedAt: number;
}

let cachedTodayEvents: TodayExrightCache | null = null;

/**
 * Lấy danh sách các mã cổ phiếu có sự kiện GDKHQ (cổ tức / phát hành) hôm nay
 * Cache RAM 10 phút, chỉ gọi đúng 1 request nhẹ cho toàn thị trường
 */
async function getTodayExrightTickers(todayStr: string): Promise<Set<string>> {
  const now = Date.now();
  if (
    cachedTodayEvents &&
    cachedTodayEvents.date === todayStr &&
    now - cachedTodayEvents.fetchedAt < 10 * 60 * 1000
  ) {
    return cachedTodayEvents.tickers;
  }

  const todayCompact = todayStr.replace(/-/g, '');
  const tickers = new Set<string>();

  try {
    const res = await fetch(
      `https://iq.vietcap.com.vn/api/iq-insight-service/v2/events?fromDate=${todayCompact}&toDate=${todayCompact}&eventCodes=DIV,ISS&page=0&size=100`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Origin': 'https://iq.vietcap.com.vn',
          'Referer': 'https://iq.vietcap.com.vn/',
        },
        next: { revalidate: 600 },
      }
    );
    if (res.ok) {
      const json = await res.json();
      const list = json.data?.content || json.data || [];
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item.ticker) tickers.add(item.ticker.trim().toUpperCase());
        }
      }
    }
  } catch (err: any) {
    console.warn('[Price History API] Warning checking today ex-right events:', err.message);
  }

  cachedTodayEvents = { date: todayStr, tickers, fetchedAt: now };
  return tickers;
}

/**
 * Kiểm tra xem dữ liệu trong R2 Cache có bị lỗi thời do sự kiện chia tách quyền chưa
 */
function isR2CacheStaleDueToCorporateAction(
  r2Data: any,
  todayStr: string,
  todayExrightSet: Set<string>,
  ticker: string
): boolean {
  const cacheDateStr = r2Data.updatedAt ? r2Data.updatedAt.slice(0, 10) : '';

  // 1. Kiểm tra nếu mã này nằm trong danh sách GDKHQ của thị trường hôm nay
  // mà cache được tạo trước ngày hôm nay
  if (todayExrightSet.has(ticker) && cacheDateStr < todayStr) {
    return true;
  }

  // 2. Kiểm tra nếu trong danh sách events của mã có ngày GDKHQ từ ngày nến cuối đến hôm nay
  if (Array.isArray(r2Data.events)) {
    const lastBar = r2Data.history?.[r2Data.history.length - 1];
    const lastBarDate = lastBar?.fullDate || cacheDateStr;

    for (const ev of r2Data.events) {
      if (!ev.date) continue;
      // Sự kiện diễn ra từ ngày nến cuối tới hôm nay
      if (ev.date >= lastBarDate && ev.date <= todayStr) {
        if (cacheDateStr < ev.date) {
          return true;
        }
      }
    }
  }

  return false;
}

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

  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    // 0. Kiểm tra kho nến Cloudflare R2 (Áp dụng cho nến Ngày ONE_DAY)
    if (timeFrame === 'ONE_DAY') {
      const r2Data = await getPriceHistoryFromR2(cleanTicker, 18);
      if (r2Data && Array.isArray(r2Data.history) && r2Data.history.length >= 10) {
        // Kiểm tra chủ động: Mã này có sự kiện GDKHQ phát sinh mà cache chưa cập nhật không?
        const todayExrightSet = await getTodayExrightTickers(todayStr);
        const isStale = isR2CacheStaleDueToCorporateAction(r2Data, todayStr, todayExrightSet, cleanTicker);

        if (!isStale) {
          // Cache hoàn toàn sạch và mới -> Trả về 15ms
          const sliced = countBack ? r2Data.history.slice(-countBack) : r2Data.history;
          return NextResponse.json({
            ticker: cleanTicker,
            isAdjusted: r2Data.isAdjusted ?? true,
            source: 'cloudflare-r2',
            timeFrame,
            count: sliced.length,
            history: sliced,
            events: r2Data.events || [],
            updatedAt: r2Data.updatedAt,
          });
        }

        console.log(`[Price History API] 🔄 Phát hiện ${cleanTicker} có GDKHQ chưa điều chỉnh! Tiến hành tự động tải lại full nến điều chỉnh...`);
      }
    }

    // 1. Lấy song song dữ liệu nến Nhật và sự kiện doanh nghiệp (cổ tức / chia tách) từ Vietcap
    const vietcapCountBack = timeFrame === 'ONE_DAY' ? Math.max(countBack, 2000) : countBack;
    const [gapBars, rawEvents] = await Promise.all([
      fetchVietcapGapChart(cleanTicker, { countBack: vietcapCountBack, timeFrame }),
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

      // Tự động lưu ngầm vào Cloudflare R2 để các lần gọi sau đạt tốc độ 15ms
      if (timeFrame === 'ONE_DAY' && history.length >= 100) {
        putPriceHistoryToR2(cleanTicker, {
          ticker: cleanTicker,
          updatedAt: new Date().toISOString(),
          isAdjusted: true,
          source: 'vietcap-gap-chart',
          count: history.length,
          history,
          events,
        }).catch((err) => console.warn(`[R2 Auto-Warm] Error caching ${cleanTicker}:`, err.message));
      }

      const slicedHistory = (countBack && countBack < history.length) ? history.slice(-countBack) : history;

      return NextResponse.json({
        ticker: cleanTicker,
        isAdjusted: true,
        source: 'vietcap-gap-chart',
        timeFrame,
        count: slicedHistory.length,
        history: slicedHistory,
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
