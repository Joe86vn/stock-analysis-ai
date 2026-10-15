/**
 * Script Đồng bộ Báo Cáo Tài Chính (Financial Statements Sync) lên Cloudflare R2 & Local Disk
 * 
 * Cách chạy:
 *   npx tsx --env-file=.env.local scripts/sync-financials.ts --watchlist       (Đồng bộ toàn bộ mã trong các danh mục: Top Vốn hóa + Top ADTV + Filter 75)
 *   npx tsx --env-file=.env.local scripts/sync-financials.ts --quick           (Đồng bộ 75 mã trọng điểm)
 *   npx tsx --env-file=.env.local scripts/sync-financials.ts --tickers=HPG,SSI,MWG (Mã chỉ định)
 */

import { fetchFullVietcapData } from '../src/lib/vietcap-field-mapping';
import { FILTER_75_TICKERS } from '../src/lib/filter-rs-data';
import { executeVietcapScreener } from '../src/lib/vietcap-screener-service';
import { getFinancialsFromStorage } from '../src/lib/r2-storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('================================================================');
  console.log('📊 [FINANCIALS SYNC] ĐỒNG BỘ DỮ LIỆU TÀI CHÍNH LÊN R2 & SSD');
  console.log('================================================================');

  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isForce = args.includes('--force');
  const tickersArg = args.find((a) => a.startsWith('--tickers='));
  const customTickers = tickersArg
    ? tickersArg.replace(/^--tickers=/, '').replace(/["']/g, '').split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean)
    : null;

  const tickerSet = new Set<string>();

  if (customTickers && customTickers.length > 0) {
    customTickers.forEach((t) => tickerSet.add(t));
    console.log(`🎯 Chế độ: Đồng bộ theo danh sách chỉ định (${tickerSet.size} mã): ${Array.from(tickerSet).join(', ')}`);
  } else if (isQuick) {
    FILTER_75_TICKERS.forEach((t) => tickerSet.add(t));
    console.log(`⚡ Chế độ: Quick Sync 75 mã trọng điểm (${tickerSet.size} mã)`);
  } else {
    // Chế độ mặc định (--watchlist): Gom toàn bộ các mã trong Watchlist
    console.log(`📈 Đang tải danh sách cổ phiếu từ Vietcap Screener...`);
    try {
      const screenerData = await executeVietcapScreener();
      const valid = screenerData.filter((s) => s.ticker && s.ticker.length === 3);

      // 1. Top 150 Vốn hóa lớn nhất
      const topCap = [...valid].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)).slice(0, 150);
      topCap.forEach((s) => tickerSet.add(s.ticker));

      // 2. Top 150 Thanh khoản 20 phiên lớn nhất (ADTV)
      const topAdtv = [...valid].sort((a, b) => (b.adtv20Days || 0) - (a.adtv20Days || 0)).slice(0, 150);
      topAdtv.forEach((s) => tickerSet.add(s.ticker));

      // 3. Toàn bộ Filter 75 mã chiến lược
      FILTER_75_TICKERS.forEach((t) => tickerSet.add(t));

      console.log(`✅ Đã tổng hợp toàn bộ các danh mục Watchlist (Top Vốn Hóa + Top ADTV + Filter ValueX):`);
      console.log(`   👉 Tổng số mã duy nhất cần đồng bộ: ${tickerSet.size} mã.`);
    } catch (err: any) {
      console.warn(`⚠️ Screener không phản hồi (${err.message}), fallback danh mục 75 mã.`);
      FILTER_75_TICKERS.forEach((t) => tickerSet.add(t));
    }
  }

  const targetTickers = Array.from(tickerSet);
  console.log(`\n🚀 Bắt đầu đồng bộ dữ liệu tài chính cho ${targetTickers.length} mã...\n`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetTickers.length; i++) {
    const ticker = targetTickers[i];
    const progress = `[${i + 1}/${targetTickers.length}]`;

    // Nếu không có cờ --force, kiểm tra xem đã có cache trong 7 ngày chưa
    if (!isForce) {
      try {
        const existing = await getFinancialsFromStorage(ticker, 168); // 7 ngày
        if (existing && Array.isArray(existing) && existing.length > 0) {
          console.log(`${progress} ⏩ ${ticker}: Đã có cache sẵn (${existing.length} quý) -> Bỏ qua`);
          skippedCount++;
          continue;
        }
      } catch {}
    }

    try {
      // Force refresh = true để kéo dữ liệu mới nhất từ Vietcap và ghi đè vào R2 + SSD
      const quarters = await fetchFullVietcapData(ticker, { forceRefresh: true });
      if (quarters && quarters.length > 0) {
        console.log(`${progress} ✅ ${ticker}: Đồng bộ thành công ${quarters.length} quý lịch sử (từ ${quarters[0].period} đến ${quarters[quarters.length - 1].period})`);
        successCount++;
      } else {
        console.log(`${progress} ⚠️ ${ticker}: Vietcap không có dữ liệu quý.`);
        failCount++;
      }
    } catch (err: any) {
      console.error(`${progress} ❌ ${ticker} Lỗi:`, err.message);
      failCount++;
    }

    // Delay 300ms giữa các request để mượt mà và tránh rate limit
    await delay(300);
  }

  console.log('\n================================================================');
  console.log(`🎉 HOÀN THÀNH:`);
  console.log(`   - Mới tải & Đồng bộ thành công: ${successCount} mã`);
  console.log(`   - Đã có sẵn trên SSD/R2: ${skippedCount} mã`);
  console.log(`   - Thất bại / Thiếu dữ liệu: ${failCount} mã`);
  console.log(`   - Tổng số mã được đảm bảo: ${successCount + skippedCount}/${targetTickers.length}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error in sync-financials script:', err);
  process.exit(1);
});
