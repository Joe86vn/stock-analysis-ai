import { calculateHistoricalHealthScores, DayData, MarketStatus } from './canslim-health-calculator';

export interface VnindexInfo {
  close: number;
  healthScore: number;
  marketStatus: MarketStatus;
  distributionDays: number;
}

export let cachedVnindexMap: Map<string, VnindexInfo> | null = null;
let lastFetchTime = 0;

/**
 * Tải và cache danh sách lịch sử VN-Index kèm Health Score CANSLIM từng phiên
 * (Map: DateString YYYY-MM-DD -> VnindexInfo)
 */
export async function getVnindexHistoryMap(): Promise<Map<string, VnindexInfo>> {
  const now = Date.now();
  if (cachedVnindexMap && now - lastFetchTime < 5 * 60 * 1000) {
    return cachedVnindexMap;
  }

  try {
    const res = await fetch('/api/market-watch/vnindex-history?index=VNINDEX&page=0&size=2000');
    if (!res.ok) return cachedVnindexMap || new Map();
    const json = await res.json();
    const rawList = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.data?.content)
      ? json.data.content
      : [];

    if (rawList.length === 0) return cachedVnindexMap || new Map();

    // 1. Chuẩn hóa và sắp xếp nến VN-Index theo thời gian tăng dần
    const days: DayData[] = rawList
      .map((d: any) => {
        const close = Number(d.closeIndex ?? d.close ?? d.indexValue ?? 0);
        let dateStr = String(d.tradingDate ?? d.date ?? d.time ?? d.t ?? '').trim();
        if (dateStr.length === 8 && !dateStr.includes('-')) {
          dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        } else if (dateStr.includes('T')) {
          dateStr = dateStr.split('T')[0];
        }

        return {
          date: dateStr,
          close,
          low: Number(d.indexValue ?? d.lowestIndex ?? d.low ?? close),
          volume: Number(d.totalMatchVolume ?? d.totalVolume ?? d.volume ?? d.matchVolume ?? 0),
        };
      })
      .filter((d: DayData) => d.close > 0 && d.date !== '')
      .sort((a: DayData, b: DayData) => a.date.localeCompare(b.date));

    // 2. Tính toán điểm Health Score lịch sử từng phiên
    const healthScores = calculateHistoricalHealthScores(days);

    const map = new Map<string, VnindexInfo>();
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const hs = healthScores[i];
      map.set(d.date, {
        close: d.close,
        healthScore: hs.score,
        marketStatus: hs.status,
        distributionDays: hs.distributionDays,
      });
    }

    if (map.size > 0) {
      cachedVnindexMap = map;
      lastFetchTime = now;
    }
    return map;
  } catch (err) {
    console.warn('[vnindex-enricher] getVnindexHistoryMap error:', err);
    return cachedVnindexMap || new Map();
  }
}

/**
 * Ghép giá đóng cửa VNINDEX và thông tin Health Score tương ứng vào từng cây nến của cổ phiếu
 */
export function enrichKLineWithVnindex<T extends { date?: string; fullDate?: string; timestamp?: number; close: number }>(
  klineData: T[],
  vnindexMap: Map<string, VnindexInfo>
): (T & { vnindexClose?: number; healthScore?: number; marketStatus?: MarketStatus })[] {
  if (!klineData || klineData.length === 0 || !vnindexMap || vnindexMap.size === 0) {
    return klineData.map((d) => ({ ...d }));
  }

  const sortedVnDates = Array.from(vnindexMap.keys()).sort();

  return klineData.map((candle) => {
    let dateStr = candle.fullDate || candle.date || '';
    if (!dateStr && candle.timestamp) {
      const d = new Date(candle.timestamp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }

    if (dateStr.length === 8 && !dateStr.includes('-')) {
      dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }

    let vnInfo = vnindexMap.get(dateStr);

    // Fallback về ngày VN-Index gần nhất trước đó nếu lệch ngày giao dịch
    if (!vnInfo && sortedVnDates.length > 0) {
      for (let i = sortedVnDates.length - 1; i >= 0; i--) {
        if (sortedVnDates[i] <= dateStr) {
          vnInfo = vnindexMap.get(sortedVnDates[i]);
          break;
        }
      }
    }

    return {
      ...candle,
      vnindexClose: vnInfo?.close,
      healthScore: vnInfo?.healthScore,
      marketStatus: vnInfo?.marketStatus,
    };
  });
}
