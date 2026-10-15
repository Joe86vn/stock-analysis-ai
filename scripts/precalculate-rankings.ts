/**
 * Script Tính Toán Trước Bảng Xếp Hạng & Điểm Cơ Bản Toàn Thị Trường (Precalculate Rankings Pipeline)
 * Thiết kế tối ưu chạy tự động trên Oracle Cloud VPS (Ampere A1 24GB RAM, NVMe SSD)
 * 
 * Cách chạy:
 *   npx tsx scripts/precalculate-rankings.ts                 (Chế độ mặc định: Top 250+ cổ phiếu thanh khoản & vốn hóa)
 *   npx tsx scripts/precalculate-rankings.ts --quick        (Chế độ nhanh: 75 mã trọng điểm ValueX)
 *   npx tsx scripts/precalculate-rankings.ts --force        (Ép buộc tính lại toàn bộ kể cả khi đã có cache)
 *   npx tsx scripts/precalculate-rankings.ts --min-adtv=2   (Lọc theo ngưỡng thanh khoản tối thiểu Tỷ VNĐ)
 */

import fs from 'fs';
import path from 'path';
import { executeVietcapScreener, VietcapScreenerMatchedStock } from '../src/lib/vietcap-screener-service';
import {
  calculateStockFundamentalScore,
  calculateStockRankingItem,
  ensureFundamentalScoresLoaded,
  FILTER_75_TICKERS,
  StockFundamentalScore,
  StockRankingItem,
} from '../src/lib/filter-rs-data';
import {
  putRankingsToStorage,
  putFundamentalScoresToStorage,
  getFundamentalScoresFromStorage,
  getLocalRankingsFilePath,
} from '../src/lib/r2-storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('⚡ [PRECALCULATE RANKINGS] TÍNH TOÁN BẢNG XẾP HẠNG TRƯỚC TRÊN VPS');
  console.log('   Cấu hình: Oracle Cloud VPS 24GB RAM & NVMe SSD Storage');
  console.log('================================================================\n');

  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isForce = args.includes('--force');
  const adtvArg = args.find((a) => a.startsWith('--min-adtv='));
  const minAdtv = adtvArg ? parseFloat(adtvArg.replace('--min-adtv=', '')) : 1.5; // Mặc định >= 1.5 tỷ

  // 1. Thu thập Universe Cổ phiếu mục tiêu từ Vietcap Screener
  console.log(`📡 1. Đang truy vấn dữ liệu thị trường từ Vietcap Screener Engine (1.600+ mã)...`);
  let screenerStocks: VietcapScreenerMatchedStock[] = [];
  try {
    screenerStocks = await executeVietcapScreener({
      exchanges: ['HSX', 'HNX', 'UPCOM'],
    });
    console.log(`   👉 Vietcap Screener trả về dữ liệu giá & tên của ${screenerStocks.length} mã.`);
  } catch (err: any) {
    console.warn(`   ⚠️ Lỗi gọi Vietcap Screener (${err.message}). Chuyển sang fallback danh mục.`);
  }

  // Lập bản đồ tra cứu metadata thị trường toàn diện
  const screenerMap = new Map<string, VietcapScreenerMatchedStock>();
  for (const s of screenerStocks) {
    if (s.ticker && s.ticker.length === 3) {
      screenerMap.set(s.ticker.toUpperCase(), s);
    }
  }

  // Tập hợp danh sách mã Universe cần tính toán
  const targetTickerSet = new Set<string>();

  if (isQuick) {
    FILTER_75_TICKERS.forEach((t) => targetTickerSet.add(t));
    console.log(`🎯 Chế độ: Quick Sync 75 mã trọng điểm ValueX.`);
  } else {
    // 1. Toàn bộ mã từ Screener đạt ADTV tối thiểu
    screenerStocks.forEach((s) => {
      if (s.adtv20Billion >= minAdtv) {
        targetTickerSet.add(s.ticker.toUpperCase());
      }
    });

    // 2. Đảm bảo toàn bộ 75 mã chiến lược ValueX luôn có mặt
    FILTER_75_TICKERS.forEach((t) => targetTickerSet.add(t));

    console.log(`🎯 Chế độ: Quét Toàn Diện (${targetTickerSet.size} mã đạt chuẩn thanh khoản >= ${minAdtv} Tỷ trên 3 sàn).`);
  }

  const targetTickers = Array.from(targetTickerSet).sort();
  console.log(`\n📊 2. Bắt đầu xử lý Điểm Cơ Bản (150đ) & Dữ liệu Thị Trường cho ${targetTickers.length} mã...\n`);

  // 2. Nạp sẵn Fundamental Scores hiện có từ SSD / R2
  const existingScoresMap = (await getFundamentalScoresFromStorage()) || {};
  const updatedScoresMap: Record<string, StockFundamentalScore> = { ...existingScoresMap };

  // Nạp vào RAM
  await ensureFundamentalScoresLoaded();

  let newlyCalculatedFundamental = 0;
  let cachedFundamentalCount = 0;
  let failedCount = 0;

  const rankedItems: StockRankingItem[] = [];

  // Xử lý theo batches 8 mã song song để tận dụng 4 OCPU ARM64
  const batchSize = 8;
  for (let i = 0; i < targetTickers.length; i += batchSize) {
    const batch = targetTickers.slice(i, i + batchSize);
    const progress = `[${Math.min(i + batchSize, targetTickers.length)}/${targetTickers.length}]`;

    const batchPromises = batch.map(async (ticker) => {
      const matchedMeta = screenerMap.get(ticker);

      // Kiểm tra xem đã có điểm cơ bản chưa
      let fundamental: StockFundamentalScore | null = updatedScoresMap[ticker] || null;
      if (!fundamental || isForce) {
        fundamental = await calculateStockFundamentalScore(ticker);
        if (fundamental) {
          updatedScoresMap[ticker] = fundamental;
          newlyCalculatedFundamental++;
        }
      } else {
        cachedFundamentalCount++;
      }

      if (!fundamental) {
        failedCount++;
        return null;
      }

      // Ghép điểm cơ bản với dữ liệu giá/thị trường
      return calculateStockRankingItem(ticker, matchedMeta, false);
    });

    const batchResults = await Promise.all(batchPromises);

    for (const item of batchResults) {
      if (item) {
        rankedItems.push(item);
      }
    }

    process.stdout.write(`   ⏳ ${progress} Đang chấm điểm và ghép nối dữ liệu...\r`);
    // Delay nhỏ giữa các batch để tránh spam Vietcap API
    if (newlyCalculatedFundamental > 0 && i % (batchSize * 3) === 0) {
      await delay(200);
    }
  }

  console.log('\n\n📈 3. Sắp xếp thứ hạng và lưu trữ bền vững...');

  // Sắp xếp tổng điểm từ cao xuống thấp
  rankedItems.sort((a, b) => b.totalScore - a.totalScore);

  // Gán STT thứ hạng 1..N
  rankedItems.forEach((item, index) => {
    item.stt = index + 1;
  });

  // 4. Lưu Bản đồ Điểm Cơ Bản (Fundamental Scores) xuống SSD NVMe & Cloudflare R2
  console.log(`💾 4. Ghi Điểm Cơ Bản (${Object.keys(updatedScoresMap).length} mã) vào SSD & R2...`);
  await putFundamentalScoresToStorage(updatedScoresMap);

  // 5. Lưu Bảng Xếp Hạng Hoàn Chỉnh (Rankings) xuống SSD NVMe & Cloudflare R2
  console.log(`💾 5. Ghi Bảng Xếp Hạng (${rankedItems.length} mã) vào SSD & R2...`);
  await putRankingsToStorage(rankedItems, 'latest');

  // Thống kê phân loại hạng
  const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0 };
  rankedItems.forEach((r) => {
    gradeCounts[r.rankGrade] = (gradeCounts[r.rankGrade] || 0) + 1;
  });

  const totalTimeSec = Math.round((Date.now() - startTime) / 100) / 10;

  console.log('\n================================================================');
  console.log('🎉 TỔNG KẾT HOÀN TẤT PRECALCULATION:');
  console.log(`   ⏱️ Tổng thời gian thực hiện: ${totalTimeSec} giây`);
  console.log(`   📦 Tổng số mã được xếp hạng: ${rankedItems.length} mã`);
  console.log(`   ⚡ Điểm cơ bản dùng lại từ Cache: ${cachedFundamentalCount} mã`);
  console.log(`   🆕 Điểm cơ bản mới tính toán: ${newlyCalculatedFundamental} mã`);
  console.log(`   ❌ Mã thiếu dữ liệu BCTC: ${failedCount} mã`);
  console.log('----------------------------------------------------------------');
  console.log('🏆 PHÂN BỐ HẠNG VALUE-X:');
  console.log(`   🥇 Hạng A+ (>= 125đ - Siêu cổ phiếu): ${gradeCounts['A+']} mã`);
  console.log(`   🥈 Hạng A  (110 - 124đ - Vượt trội):   ${gradeCounts['A']} mã`);
  console.log(`   🥉 Hạng B+ (95 - 109đ - Tốt & Ổn định): ${gradeCounts['B+']} mã`);
  console.log(`   🔹 Hạng B  (80 - 94đ - Khá):           ${gradeCounts['B']} mã`);
  console.log(`   🔸 Hạng C  (65 - 79đ - Trung bình):     ${gradeCounts['C']} mã`);
  console.log(`   ⚠️ Hạng D  (< 65đ - Rủi ro cao):       ${gradeCounts['D']} mã`);
  console.log('----------------------------------------------------------------');
  console.log(`📁 File lưu trữ SSD: ${getLocalRankingsFilePath('latest')}`);
  console.log('🚀 API /api/screening/live & /api/ranking hiện sẽ trả về ngay trong < 5ms!');
  console.log('================================================================\n');

  // In Top 10 cổ phiếu dẫn đầu
  console.log('🔥 TOP 10 CỔ PHIẾU DẪN ĐẦU THỊ TRƯỜNG:');
  rankedItems.slice(0, 10).forEach((item) => {
    console.log(
      `   #${item.stt} [${item.ticker}] ${item.companyName.padEnd(35)} | Điểm: ${item.totalScore}/150 (${item.rankGrade}) | RS: ${item.rsRating} | Giá: ${item.currentPrice.toLocaleString()} (${(item.priceChangePercent ?? 0) > 0 ? '+' : ''}${item.priceChangePercent ?? 0}%)`
    );
  });
  console.log('\n');
}

main().catch((err) => {
  console.error('Fatal error in precalculate-rankings:', err);
  process.exit(1);
});
