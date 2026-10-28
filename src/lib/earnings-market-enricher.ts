import { executeVietcapScreener } from './vietcap-screener-service';
import { FILTER_75_RS_MAP } from './filter-rs-data';
import { EarningsRecord } from '@/types/earnings';

interface StockMarketSnapshot {
  adtv20Billion: number | null;
  rsRating: number | null;
  currentPrice: number | null;
  companyNameVi?: string;
}

let cachedMarketMap: Map<string, StockMarketSnapshot> | null = null;
let lastMarketFetchTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút

/**
 * Lấy bản đồ chỉ số thị trường (GTGD 20P, RS Rating, Giá hiện tại) cho toàn bộ cổ phiếu
 */
export async function getMarketMetricsMap(forceRefresh = false): Promise<Map<string, StockMarketSnapshot>> {
  const now = Date.now();
  if (!forceRefresh && cachedMarketMap && now - lastMarketFetchTime < CACHE_TTL_MS) {
    return cachedMarketMap;
  }

  const map = new Map<string, StockMarketSnapshot>();

  try {
    const stocks = await executeVietcapScreener({});
    if (stocks && Array.isArray(stocks) && stocks.length > 0) {
      for (const s of stocks) {
        if (!s.ticker) continue;
        const cleanTicker = s.ticker.trim().toUpperCase();
        const rs = s.rs1Month ?? s.stockStrength ?? (FILTER_75_RS_MAP[cleanTicker] ?? null);
        map.set(cleanTicker, {
          adtv20Billion: typeof s.adtv20Billion === 'number' ? s.adtv20Billion : null,
          rsRating: typeof rs === 'number' ? Math.round(rs) : null,
          currentPrice: typeof s.marketPrice === 'number' ? s.marketPrice : null,
          companyNameVi: s.companyNameVi,
        });
      }
      cachedMarketMap = map;
      lastMarketFetchTime = now;
      console.log(`[Market Enricher] Cached metrics for ${map.size} stocks.`);
      return map;
    }
  } catch (err: any) {
    console.warn('[Market Enricher] Could not fetch market screener metrics:', err.message);
  }

  // Fallback: nếu lỗi API, sử dụng dữ liệu tĩnh có sẵn
  for (const [t, rs] of Object.entries(FILTER_75_RS_MAP)) {
    if (!map.has(t)) {
      map.set(t, {
        adtv20Billion: null,
        rsRating: rs,
        currentPrice: null,
      });
    }
  }

  cachedMarketMap = map;
  lastMarketFetchTime = now;
  return map;
}

/**
 * Bổ sung các chỉ số thị trường (GTGD 20P, RS Rating) vào danh sách BCTC
 */
export async function enrichEarningsWithMarketMetrics(
  records: EarningsRecord[]
): Promise<EarningsRecord[]> {
  if (!records || records.length === 0) return [];

  const marketMap = await getMarketMetricsMap();

  return records.map((record) => {
    const market = marketMap.get(record.ticker.toUpperCase());
    const companyName =
      market?.companyNameVi &&
      (!record.companyName ||
        record.companyName === record.ticker ||
        record.companyName.startsWith('CTCP ') ||
        record.companyName.startsWith('Công ty Cổ phần '))
        ? market.companyNameVi
        : record.companyName;

    return {
      ...record,
      companyName,
      rsRating: market?.rsRating ?? record.rsRating ?? (FILTER_75_RS_MAP[record.ticker.toUpperCase()] ?? null),
      adtv20Billion: market?.adtv20Billion ?? record.adtv20Billion ?? null,
      currentPrice: market?.currentPrice ?? record.currentPrice ?? null,
    };
  });
}
