/**
 * Script Đồng bộ Dữ liệu Nến Cuối Ngày (EOD OHLC Sync) lên Cloudflare R2
 * 
 * Cách chạy:
 *   npx tsx scripts/sync-eod-ohlc.ts
 *   npx tsx scripts/sync-eod-ohlc.ts --quick          (Chỉ đồng bộ danh mục 75 mã trọng điểm)
 *   npx tsx scripts/sync-eod-ohlc.ts --tickers=HPG,SSI,PHP  (Chỉ đồng bộ các mã chỉ định)
 *   npx tsx scripts/sync-eod-ohlc.ts --full           (Buộc tải lại 2.000 nến cho toàn bộ)
 */

import { executeVietcapScreener } from '../src/lib/vietcap-screener-service';
import { fetchVietcapGapChart, fetchVietcapEvents } from '../src/lib/vietcap-field-mapping';
import { getPriceHistoryFromR2, putPriceHistoryToR2, PriceHistoryCacheItem } from '../src/lib/r2-storage';
import { FILTER_75_TICKERS } from '../src/lib/filter-rs-data';

// Helper delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('================================================================');
  console.log('🚀 [EOD SYNC] BẮT ĐẦU ĐỒNG BỘ NẾN LỊCH SỬ LÊN CLOUDFLARE R2');
  console.log('================================================================');

  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isFullForce = args.includes('--full');
  const tickersArg = args.find((a) => a.startsWith('--tickers='));
  const customTickers = tickersArg
    ? tickersArg.replace(/^--tickers=/, '').replace(/["']/g, '').split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean)
    : null;

  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayCompact = todayStr.replace(/-/g, ''); // YYYYMMDD

  // 1. Kiểm tra sự kiện quyền hôm nay (Cổ tức, Phát hành thêm) trên toàn thị trường
  console.log(`\n📅 1. Kiểm tra sự kiện Giao dịch không hưởng quyền ngày ${todayStr}...`);
  const corporateActionTickers = new Set<string>();

  try {
    const eventsRes = await fetch(
      `https://iq.vietcap.com.vn/api/iq-insight-service/v2/events?fromDate=${todayCompact}&toDate=${todayCompact}&eventCodes=DIV,ISS&page=0&size=100`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Origin': 'https://iq.vietcap.com.vn',
          'Referer': 'https://iq.vietcap.com.vn/',
        },
      }
    );
    if (eventsRes.ok) {
      const eventsJson = await eventsRes.json();
      const eventsList = eventsJson.data?.content || eventsJson.data || [];
      if (Array.isArray(eventsList)) {
        for (const ev of eventsList) {
          if (ev.ticker) {
            corporateActionTickers.add(ev.ticker.trim().toUpperCase());
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Lỗi kiểm tra sự kiện quyền hôm nay:', err.message);
  }

  if (corporateActionTickers.size > 0) {
    console.log(`📌 Phát hiện ${corporateActionTickers.size} mã có sự kiện quyền hôm nay (sẽ tải lại full lịch sử):`, Array.from(corporateActionTickers).join(', '));
  } else {
    console.log('✅ Hôm nay không có mã nào chia quyền phát sinh điều chỉnh giá.');
  }

  // 2. Lấy danh sách mã cổ phiếu cần xử lý
  let targetTickers: string[] = [];

  if (customTickers && customTickers.length > 0) {
    targetTickers = customTickers;
    console.log(`\n🎯 Danh sách xử lý chỉ định (${targetTickers.length} mã):`, targetTickers.join(', '));
  } else if (isQuick) {
    targetTickers = FILTER_75_TICKERS;
    console.log(`\n⚡ Chế độ Quick: Đồng bộ ${targetTickers.length} mã trọng tâm.`);
  } else {
    console.log('\n🔍 Đang lấy danh sách toàn thị trường từ Vietcap Screener...');
    const screenerStocks = await executeVietcapScreener({});
    if (screenerStocks.length > 0) {
      targetTickers = screenerStocks.map((s) => s.ticker).filter((t) => t && t.length >= 3);
      console.log(`📊 Tìm thấy tổng cộng ${targetTickers.length} mã cổ phiếu đang giao dịch.`);
    } else {
      console.warn('⚠️ Không lấy được danh sách từ Screener, sử dụng danh sách 75 mã mục tiêu làm fallback.');
      targetTickers = FILTER_75_TICKERS;
    }
  }

  // 3. Tiến hành đồng bộ với Concurrency Control (Hàng đợi 5 luồng song song)
  const CONCURRENCY = 5;
  let successCount = 0;
  let errorCount = 0;
  let fullRebuildCount = 0;
  let incrementalCount = 0;
  const startTime = Date.now();

  console.log(`\n⚡ 3. Bắt đầu xử lý ${targetTickers.length} mã (Concurrency: ${CONCURRENCY})...\n`);

  async function processTicker(t: string, index: number) {
    try {
      const cleanTicker = t.trim().toUpperCase();
      const needsFullRebuild = isFullForce || corporateActionTickers.has(cleanTicker);

      // Kiểm tra file hiện tại trên R2
      const existing = needsFullRebuild ? null : await getPriceHistoryFromR2(cleanTicker, 720); // 30 ngày

      if (existing && Array.isArray(existing.history) && existing.history.length >= 100) {
        // Đã có lịch sử trên R2 -> Kiểm tra ngày nến cuối
        const lastBar = existing.history[existing.history.length - 1];
        if (lastBar && lastBar.fullDate === todayStr) {
          // Đã có nến hôm nay rồi, không cần làm gì thêm
          successCount++;
          return;
        }

        // Tải 1 nến mới nhất để nối vào đuôi
        const recentBars = await fetchVietcapGapChart(cleanTicker, { countBack: 5, timeFrame: 'ONE_DAY' });
        if (recentBars.length > 0) {
          const newTodayBar = recentBars.find((b) => b.tradingDate === todayStr);
          if (newTodayBar) {
            const dt = new Date(newTodayBar.time * 1000);
            const day = String(dt.getDate()).padStart(2, '0');
            const month = String(dt.getMonth() + 1).padStart(2, '0');

            existing.history.push({
              date: `${day}/${month}`,
              fullDate: newTodayBar.tradingDate,
              openPrice: newTodayBar.openPrice,
              highestPrice: newTodayBar.highestPrice,
              lowestPrice: newTodayBar.lowestPrice,
              closePrice: newTodayBar.closePrice,
              range: [newTodayBar.lowestPrice, newTodayBar.highestPrice],
              volume: newTodayBar.volume,
            });

            existing.count = existing.history.length;
            existing.updatedAt = new Date().toISOString();

            await putPriceHistoryToR2(cleanTicker, existing);
            incrementalCount++;
            successCount++;
            return;
          }
        }
      }

      // Chưa có trên R2 hoặc cần tải lại toàn bộ lịch sử (Full Rebuild)
      const [gapBars, rawEvents] = await Promise.all([
        fetchVietcapGapChart(cleanTicker, { countBack: 2000, timeFrame: 'ONE_DAY' }),
        fetchVietcapEvents(cleanTicker, { fromDate: '20160101', toDate: '20261231' }).catch(() => []),
      ]);

      if (gapBars && gapBars.length >= 10) {
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

        const history = gapBars.map((bar) => {
          const dt = new Date(bar.time * 1000);
          const day = String(dt.getDate()).padStart(2, '0');
          const month = String(dt.getMonth() + 1).padStart(2, '0');

          return {
            date: `${day}/${month}`,
            fullDate: bar.tradingDate,
            openPrice: bar.openPrice,
            highestPrice: bar.highestPrice,
            lowestPrice: bar.lowestPrice,
            closePrice: bar.closePrice,
            range: [bar.lowestPrice, bar.highestPrice] as [number, number],
            volume: bar.volume,
          };
        }).filter((item) => item.closePrice > 0);

        await putPriceHistoryToR2(cleanTicker, {
          ticker: cleanTicker,
          updatedAt: new Date().toISOString(),
          isAdjusted: true,
          source: 'vietcap-gap-chart',
          count: history.length,
          history,
          events,
        });

        fullRebuildCount++;
        successCount++;
      } else {
        errorCount++;
      }

      if ((index + 1) % 25 === 0 || index + 1 === targetTickers.length) {
        console.log(`[${index + 1}/${targetTickers.length}] Đã xử lý... (Thành công: ${successCount}, Tải mới: ${fullRebuildCount}, Nối nến: ${incrementalCount})`);
      }
    } catch (err: any) {
      errorCount++;
      console.warn(`[Lỗi] Không thể đồng bộ ${t}:`, err.message);
    }
  }

  // Chạy hàng đợi
  const queue = [...targetTickers];
  let processedIdx = 0;

  async function worker() {
    while (queue.length > 0) {
      const ticker = queue.shift();
      if (!ticker) break;
      const idx = processedIdx++;
      await processTicker(ticker, idx);
      await delay(80); // 80ms delay nhẹ nhàng tránh nghẽn
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n================================================================');
  console.log(`✅ [EOD SYNC HOÀN TẤT TRONG ${durationSec} GIÂY]`);
  console.log(`- Tổng số mã xử lý: ${targetTickers.length}`);
  console.log(`- Thành công: ${successCount}`);
  console.log(`- Tải full nến (lần đầu / có chia tách quyền): ${fullRebuildCount}`);
  console.log(`- Nối nến mới hôm nay (Incremental): ${incrementalCount}`);
  console.log(`- Thất bại / bỏ qua: ${errorCount}`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Fatal error during EOD sync:', err);
  process.exit(1);
});
