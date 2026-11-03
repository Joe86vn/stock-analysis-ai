/**
 * Script Cào Toàn Bộ Lịch Sử Tối Đa (26 Năm EOD & 21 Năm BCTC) từ MAS-MCP
 * 
 * Cách chạy:
 *   npx tsx scripts/crawl-mas-universe-deep.ts --top=30       (Chỉ cào VN30)
 *   npx tsx scripts/crawl-mas-universe-deep.ts --tickers=REE,SAM,FPT,HPG
 *   npx tsx scripts/crawl-mas-universe-deep.ts --all          (Toàn thị trường)
 */

import fs from 'fs';
import path from 'path';

// Nạp biến môi trường từ .env.local
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnvLocal();

import { masDataProvider } from '../src/lib/data-providers/mas-provider';
import { FILTER_75_TICKERS } from '../src/lib/filter-rs-data';
import { putPriceHistoryToR2, putFinancialsToStorage, getR2Config } from '../src/lib/r2-storage';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const DATA_DIR = path.resolve(process.cwd(), 'data', 'deep-history');
const CHECKPOINT_FILE = path.join(DATA_DIR, 'checkpoint.json');

// Đảm bảo thư mục lưu trữ tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface CrawlCheckpoint {
  completedTickers: string[];
  lastUpdated: string;
}

function loadCheckpoint(): CrawlCheckpoint {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    }
  } catch {}
  return { completedTickers: [], lastUpdated: new Date().toISOString() };
}

function saveCheckpoint(completed: string[]) {
  try {
    const data: CrawlCheckpoint = {
      completedTickers: completed,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err: any) {
    console.warn('⚠️ Lỗi ghi checkpoint:', err.message);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ [MAS-MCP DEEP CRAWLER] CÀO DỮ LIỆU TỐI ĐA (26 NĂM EOD & 21 NĂM BCTC)');
  console.log('================================================================\n');

  const args = process.argv.slice(2);
  const tickersArg = args.find(a => a.startsWith('--tickers='));
  const isTop30 = args.includes('--top=30');

  let targetTickers: string[] = [];

  if (tickersArg) {
    targetTickers = tickersArg.replace(/^--tickers=/, '').split(/[,\s]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
  } else if (isTop30) {
    targetTickers = FILTER_75_TICKERS.slice(0, 30);
  } else {
    // Mặc định cào danh sách 75 cổ phiếu dẫn dắt thị trường
    targetTickers = FILTER_75_TICKERS;
  }

  const checkpoint = loadCheckpoint();
  const completedSet = new Set(checkpoint.completedTickers);

  const remainingTickers = targetTickers.filter(t => !completedSet.has(t));
  console.log(`📋 Tổng số mã cần xử lý: ${targetTickers.length} mã (${completedSet.size} mã đã xong, còn lại: ${remainingTickers.length} mã)`);

  let countSuccess = 0;
  let countFailed = 0;

  for (let i = 0; i < remainingTickers.length; i++) {
    const ticker = remainingTickers[i];
    console.log(`\n[${i + 1}/${remainingTickers.length}] ⏳ Đang thu thập trọn đời mã ${ticker}...`);

    try {
      // 1. Cào giá EOD từ 2000 đến nay (Tối đa 26 năm)
      const t0 = Date.now();
      const priceBars = await masDataProvider.getPriceHistory(ticker, {
        fromDate: '01/01/2000',
        toDate: undefined, // Đến hiện tại
      });
      console.log(`   ✅ Giá EOD: ${priceBars.length} phiên (${Date.now() - t0}ms)`);

      await delay(500); // Giãn cách 500ms

      // 2. Cào BCTC từ 2005 đến nay (Tối đa 21 năm ~ 84 quý)
      const t1 = Date.now();
      const financials = await masDataProvider.getFinancials(ticker, {
        maxQuarters: 84, // 21 năm
      });
      console.log(`   ✅ BCTC: ${financials.length} kỳ (${Date.now() - t1}ms)`);

      // 3. Lưu trữ vào tệp JSON cục bộ
      const record = {
        ticker,
        crawledAt: new Date().toISOString(),
        source: 'MASVN_MCP',
        priceHistoryCount: priceBars.length,
        financialQuarterCount: financials.length,
        priceHistory: priceBars,
        financials,
      };

      const filePath = path.join(DATA_DIR, `${ticker}.json`);
      fs.writeFileSync(filePath, JSON.stringify(record), 'utf8');

      // 4. Đồng bộ trực tiếp lên Cloudflare R2 (Đồng bộ tức thì cho VPS & Web Production)
      if (priceBars.length > 0) {
        const sortedBars = [...priceBars].reverse();
        const history = sortedBars.map((b) => {
          const dt = new Date(b.tradingDate);
          const day = String(dt.getDate()).padStart(2, '0');
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          return {
            date: `${day}/${month}`,
            fullDate: b.tradingDate,
            openPrice: b.openPrice,
            highestPrice: b.highestPrice,
            lowestPrice: b.lowestPrice,
            closePrice: b.closePrice,
            range: [b.lowestPrice, b.highestPrice] as [number, number],
            volume: b.totalVolume,
          };
        });
        const pRes = await putPriceHistoryToR2(ticker, {
          ticker,
          updatedAt: new Date().toISOString(),
          isAdjusted: true,
          source: 'mas-mcp-deep',
          count: history.length,
          history,
          events: [],
        });
        console.log(`   ☁️ Đã lưu ${history.length} nến (Đích: ${pRes.destination})!`);
      }

      if (financials.length > 0) {
        const fRes = await putFinancialsToStorage(ticker, financials);
        console.log(`   ☁️ Đã lưu ${financials.length} kỳ BCTC (Đích: ${fRes.destination})!`);
      }

      // Đánh dấu hoàn thành
      completedSet.add(ticker);
      saveCheckpoint(Array.from(completedSet));
      countSuccess++;

      // Nghỉ ngắn tránh nghẽn
      await delay(600);
    } catch (err: any) {
      console.error(`   ❌ Lỗi khi cào mã ${ticker}:`, err.message);
      countFailed++;
      await delay(1000);
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 [HOÀN TẤT] Thành công: ${countSuccess} mã, Thất bại: ${countFailed} mã`);
  console.log(`📁 Thư mục lưu trữ: ${DATA_DIR}`);
  console.log('================================================================\n');
}

main().catch(console.error);
