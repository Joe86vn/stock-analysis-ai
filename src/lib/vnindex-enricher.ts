export let cachedVnindexMap: Map<string, number> | null = null;
let lastFetchTime = 0;

/**
 * Tải và cache danh sách lịch sử giá đóng cửa VN-Index (dạng Map: DateString YYYY-MM-DD -> ClosePrice)
 */
export async function getVnindexHistoryMap(): Promise<Map<string, number>> {
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

    const map = new Map<string, number>();
    for (const item of rawList) {
      const close = Number(item.closeIndex ?? item.close ?? 0);
      let dateStr = String(item.tradingDate ?? item.date ?? item.time ?? '').trim();
      if (!dateStr || close <= 0) continue;

      // Chuẩn hóa định dạng dateStr về YYYY-MM-DD
      if (dateStr.length === 8 && !dateStr.includes('-')) {
        dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      } else if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }

      map.set(dateStr, close);
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
 * Ghép giá đóng cửa VNINDEX tương ứng vào từng cây nến của cổ phiếu
 */
export function enrichKLineWithVnindex<T extends { date?: string; fullDate?: string; timestamp?: number; close: number }>(
  klineData: T[],
  vnindexMap: Map<string, number>
): (T & { vnindexClose?: number })[] {
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

    let vnClose = vnindexMap.get(dateStr);

    // Fallback về ngày VN-Index gần nhất trước đó nếu lệch ngày giao dịch
    if (!vnClose && sortedVnDates.length > 0) {
      for (let i = sortedVnDates.length - 1; i >= 0; i--) {
        if (sortedVnDates[i] <= dateStr) {
          vnClose = vnindexMap.get(sortedVnDates[i]);
          break;
        }
      }
    }

    return {
      ...candle,
      vnindexClose: vnClose,
    };
  });
}
