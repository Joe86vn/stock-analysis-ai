import fs from 'fs';
import path from 'path';

const FINANCIALS_DIR = path.join(process.cwd(), 'data', 'financials');
const EARNINGS_DIR = path.join(process.cwd(), 'data', 'earnings');
const CACHE_FILE_PATH = path.join(EARNINGS_DIR, 'prev_quarter_pat_cache.json');

export interface PrevQuarterInfo {
  prevQuy: number;
  prevNam: number;
  periodKey: string; // ví dụ "Q2_2026"
  label: string; // ví dụ "Q2/2026"
}

/**
 * Xác định Quý và Năm liền trước từ Quý và Năm hiện tại
 */
export function getPreviousQuarterInfo(quy: number, nam: number): PrevQuarterInfo {
  if (quy === 1) {
    return {
      prevQuy: 4,
      prevNam: nam - 1,
      periodKey: `Q4_${nam - 1}`,
      label: `Q4/${nam - 1}`,
    };
  }
  return {
    prevQuy: quy - 1,
    prevNam: nam,
    periodKey: `Q${quy - 1}_${nam}`,
    label: `Q${quy - 1}/${nam}`,
  };
}

/**
 * Đọc cache LNST quý trước từ đĩa nếu có
 */
function readPatCache(): Record<string, Record<string, number>> {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('[PrevQuarter] Lỗi đọc cache quý trước:', err);
  }
  return {};
}

/**
 * Lưu cache LNST quý trước vào đĩa
 */
function savePatCache(cache: Record<string, Record<string, number>>) {
  try {
    if (!fs.existsSync(EARNINGS_DIR)) {
      fs.mkdirSync(EARNINGS_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[PrevQuarter] Lỗi lưu cache quý trước:', err);
  }
}

/**
 * Tải map LNST (đơn vị VNĐ) của quý liền trước cho danh sách mã cổ phiếu
 * Thứ tự ưu tiên:
 * 1. Đọc từ local cache files data/financials/[TICKER].json (Ưu tiên isa22 - LNST Cổ đông công ty mẹ)
 * 2. Đọc từ file cache tổng data/earnings/prev_quarter_pat_cache.json
 * 3. Fallback: Gọi Vietcap IQ API BCTC (có timeout & batch, ưu tiên isa22)
 */
export async function getPreviousQuarterPatMap(
  tickers: string[],
  quy: number,
  nam: number,
  forceRefresh = false
): Promise<Record<string, number>> {
  const { prevQuy, prevNam, periodKey } = getPreviousQuarterInfo(quy, nam);
  const cacheAll = forceRefresh ? {} : readPatCache();
  const periodCache: Record<string, number> = cacheAll[periodKey] || {};
  const resultMap: Record<string, number> = { ...periodCache };

  const missingTickers: string[] = [];

  // Bước 1: Kiểm tra local data/financials/*.json
  for (const rawTicker of tickers) {
    const ticker = rawTicker.trim().toUpperCase();
    if (!forceRefresh && resultMap[ticker] !== undefined) continue;

    const filePath = path.join(FINANCIALS_DIR, `${ticker}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const match = list.find(
            (item: any) =>
              (item.year === prevNam && item.quarter === prevQuy) ||
              item.period === `Q${prevQuy}/${prevNam}`
          );
          if (match) {
            // QUAN TRỌNG: WiData & phân tích cổ phiếu luôn dùng LNST CỔ ĐÔNG CÔNG TY MẸ (isa22 / NPATMI)
            // Không được dùng isa20 (Tổng LNST hợp nhất gồm cả cổ đông thiểu số) vì sẽ gây sai lệch lớn (như MSN, ACV, APH...)
            let patVnd: number | null = null;
            if (match.rawIsItem?.isa22 != null && match.rawIsItem.isa22 !== 0) {
              patVnd = Number(match.rawIsItem.isa22);
            } else if (typeof match.netProfit === 'number') {
              // Trong schema ValueX: netProfit là LNST cổ đông công ty mẹ (Tỷ VNĐ)
              patVnd = Math.round(match.netProfit * 1_000_000_000);
            } else if (match.rawIsItem?.isa20 != null && match.rawIsItem.isa20 !== 0) {
              patVnd = Number(match.rawIsItem.isa20);
            } else if (typeof match.consolidatedNetProfit === 'number') {
              patVnd = Math.round(match.consolidatedNetProfit * 1_000_000_000);
            }

            if (patVnd !== null) {
              resultMap[ticker] = patVnd;
              periodCache[ticker] = patVnd;
              continue;
            }
          }
        }
      } catch {
        // Bỏ qua lỗi parse, chuyển sang fallback API
      }
    }

    missingTickers.push(ticker);
  }

  // Bước 2: Với các mã còn thiếu, gọi Vietcap IQ API theo batch (nếu có kết nối mạng)
  if (missingTickers.length > 0) {
    console.log(
      `[PrevQuarter] Đang tra cứu số liệu ${periodKey} cho ${missingTickers.length} mã còn thiếu từ Vietcap API...`
    );
    const BATCH_SIZE = 15;
    for (let i = 0; i < missingTickers.length; i += BATCH_SIZE) {
      const batch = missingTickers.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (t) => {
          try {
            const url = `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/${t}/financial-statement?section=INCOME_STATEMENT`;
            const timeoutSignal = AbortSignal.timeout(3000);
            const res = await fetch(url, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: 'https://iq.vietcap.com.vn/',
                Origin: 'https://iq.vietcap.com.vn',
                Accept: 'application/json',
              },
              signal: timeoutSignal,
            });
            if (res.ok) {
              const json = await res.json();
              const quarters: any[] = json?.data?.quarters || [];
              const match = quarters.find(
                (q: any) => q.yearReport === prevNam && q.lengthReport === prevQuy
              );
              if (match) {
                // Ưu tiên isa22 (LNST cổ đông công ty mẹ), nếu không có mới fallback sang isa20 (LNST tổng)
                const patVnd = match.isa22 ?? match.isa20;
                if (typeof patVnd === 'number') {
                  resultMap[t] = patVnd;
                  periodCache[t] = patVnd;
                }
              }
            }
          } catch {
            // Không chặn pipeline nếu một vài mã lỗi mạng
          }
        })
      );
    }
  }

  // Lưu lại cache đã cập nhật
  cacheAll[periodKey] = periodCache;
  savePatCache(cacheAll);

  return resultMap;
}

/**
 * Tính phần trăm tăng trưởng QoQ giữa LNST kỳ này và kỳ trước
 * Công thức: ((patCurrent - patPreviousQ) / |patPreviousQ|) * 100
 */
export function calculatePatQoQPercent(
  patCurrentVnd: number,
  patPrevQVnd?: number | null
): number | null {
  if (patPrevQVnd == null || patPrevQVnd === 0) return null;
  const growth = ((patCurrentVnd - patPrevQVnd) / Math.abs(patPrevQVnd)) * 100;
  return Number(growth.toFixed(2));
}

