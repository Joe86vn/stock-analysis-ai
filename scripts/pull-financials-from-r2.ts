/**
 * Script tải toàn bộ dữ liệu tài chính từ Cloudflare R2 về ổ cứng SSD VPS
 * 
 * Cách chạy:
 *   npx tsx --env-file=.env.local scripts/pull-financials-from-r2.ts
 */

import fs from 'fs';
import path from 'path';
import { getFinancialsFromStorage, getLocalFinancialsFilePath } from '../src/lib/r2-storage';
import { executeVietcapScreener } from '../src/lib/vietcap-screener-service';
import { FILTER_75_TICKERS } from '../src/lib/filter-rs-data';

async function main() {
  console.log('================================================================');
  console.log('📥 [R2 -> SSD SYNC] TẢI DỮ LIỆU TÀI CHÍNH TỪ R2 VỀ Ổ CỨNG SSD');
  console.log('================================================================');

  const dir = path.join(process.cwd(), 'data', 'financials');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Thu thập danh sách các mã trong Watchlist
  const tickerSet = new Set<string>();
  FILTER_75_TICKERS.forEach((t) => tickerSet.add(t));

  try {
    const screenerData = await executeVietcapScreener();
    const valid = screenerData.filter((s) => s.ticker && s.ticker.length === 3);
    valid.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)).slice(0, 150).forEach((s) => tickerSet.add(s.ticker));
    valid.sort((a, b) => (b.averageMatchValue20Days || 0) - (a.averageMatchValue20Days || 0)).slice(0, 150).forEach((s) => tickerSet.add(s.ticker));
  } catch {}

  // Lấy thêm các file đã có trên local nếu chạy ở local
  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      files.forEach((f) => tickerSet.add(f.replace('.json', '')));
    }
  } catch {}

  const tickers = Array.from(tickerSet);
  console.log(`🚀 Bắt đầu kiểm tra và kéo ${tickers.length} mã từ Cloudflare R2 về SSD...\n`);

  let downloadedCount = 0;
  let alreadyLocalCount = 0;
  let notFoundCount = 0;

  // Tải đồng thời theo batches 10 mã
  const batchSize = 10;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (t) => {
        const localPath = getLocalFinancialsFilePath(t);
        if (fs.existsSync(localPath)) {
          alreadyLocalCount++;
          return;
        }

        try {
          const quarters = await getFinancialsFromStorage(t, 999999);
          if (quarters && quarters.length > 0) {
            downloadedCount++;
          } else {
            notFoundCount++;
          }
        } catch {
          notFoundCount++;
        }
      })
    );
    process.stdout.write(`Đã xử lý: ${Math.min(i + batchSize, tickers.length)}/${tickers.length} mã...\r`);
  }

  console.log('\n================================================================');
  console.log(`🎉 HOÀN THÀNH:`);
  console.log(`   - Mới kéo từ R2 về SSD: ${downloadedCount} mã`);
  console.log(`   - Đã có sẵn trên SSD: ${alreadyLocalCount} mã`);
  console.log(`   - Chưa có trên R2: ${notFoundCount} mã`);
  console.log(`   - Tổng số file trên SSD: ${fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length} file.`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
