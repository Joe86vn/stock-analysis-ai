/**
 * Script Đồng bộ Báo Cáo Tài Chính (Financial Statements Sync) lên Cloudflare R2 & Local Disk
 * 
 * Cách chạy:
 *   npx tsx --env-file=.env.local scripts/sync-financials.ts --quick          (Đồng bộ 75 mã trọng điểm)
 *   npx tsx --env-file=.env.local scripts/sync-financials.ts --tickers=HPG,SSI,MWG (Mã chỉ định)
 *   npx tsx --env-file=.env.local scripts/sync-financials.ts --top150        (Top 150 mã vốn hóa lớn)
 */

import { fetchFullVietcapData } from '../src/lib/vietcap-field-mapping';
import { FILTER_75_TICKERS } from '../src/lib/filter-rs-data';
import { executeVietcapScreener } from '../src/lib/vietcap-screener-service';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('================================================================');
  console.log('📊 [FINANCIALS SYNC] ĐỒNG BỘ DỮ LIỆU TÀI CHÍNH LÊN R2 & SSD');
  console.log('================================================================');

  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isTop150 = args.includes('--top150');
  const tickersArg = args.find((a) => a.startsWith('--tickers='));
  const customTickers = tickersArg
    ? tickersArg.replace(/^--tickers=/, '').replace(/["']/g, '').split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean)
    : null;

  let targetTickers: string[] = [];

  if (customTickers && customTickers.length > 0) {
    targetTickers = customTickers;
    console.log(`🎯 Chế độ: Đồng bộ theo danh sách chỉ định (${targetTickers.length} mã): ${targetTickers.join(', ')}`);
  } else if (isQuick) {
    targetTickers = [...FILTER_75_TICKERS];
    console.log(`⚡ Chế độ: Quick Sync 75 mã trọng điểm (${targetTickers.length} mã)`);
  } else {
    // Mặc định hoặc --top150: Lấy Top 150 mã vốn hóa lớn nhất từ Screener
    console.log(`📈 Đang tải danh sách Top 150 mã vốn hóa lớn nhất...`);
    try {
      const screenerData = await executeVietcapScreener();
      const sorted = screenerData
        .filter((s) => s.ticker && s.ticker.length === 3)
        .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      targetTickers = sorted.slice(0, isTop150 ? 150 : 75).map((s) => s.ticker);
      console.log(`✅ Đã lấy thành công ${targetTickers.length} mã cổ phiếu hàng đầu.`);
    } catch {
      targetTickers = [...FILTER_75_TICKERS];
      console.log(`⚠️ Không thể gọi Screener, sử dụng danh mục 75 mã mặc định.`);
    }
  }

  console.log(`\n🚀 Bắt đầu đồng bộ dữ liệu tài chính cho ${targetTickers.length} mã...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetTickers.length; i++) {
    const ticker = targetTickers[i];
    const progress = `[${i + 1}/${targetTickers.length}]`;

    try {
      // Force refresh = true để kéo dữ liệu mới nhất từ Vietcap và ghi đè vào R2 + SSD
      const quarters = await fetchFullVietcapData(ticker, { forceRefresh: true });
      if (quarters && quarters.length > 0) {
        console.log(`${progress} ✅ ${ticker}: Đồng bộ thành công ${quarters.length} quý lịch sử (từ ${quarters[0].period} đến ${quarters[quarters.length - 1].period})`);
        successCount++;
      } else {
        console.log(`${progress} ⚠️ ${ticker}: Vietcap không trả về dữ liệu quý.`);
        failCount++;
      }
    } catch (err: any) {
      console.error(`${progress} ❌ ${ticker} Lỗi:`, err.message);
      failCount++;
    }

    // Delay 400ms giữa các request để tôn trọng rate limit của Vietcap
    await delay(400);
  }

  console.log('\n================================================================');
  console.log(`🎉 HOÀN THÀNH: Thành công ${successCount}/${targetTickers.length} mã | Thất bại ${failCount} mã`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error in sync-financials script:', err);
  process.exit(1);
});
