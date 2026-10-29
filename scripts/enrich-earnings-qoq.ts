import fs from 'fs';
import path from 'path';
import {
  fetchWiDataQuarterlyEarnings,
  WiDataFsItem,
} from '../src/lib/widata-crawler-service';
import {
  getPreviousQuarterPatMap,
  calculatePatQoQPercent,
} from '../src/lib/prev-quarter-service';
import { EarningsStoreData } from '../src/types/earnings';

const STORE_PATH = path.join(process.cwd(), 'data', 'earnings', 'latest_earnings_updates.json');

async function main() {
  console.log('[Enrich QoQ & YoY] Bắt đầu đồng bộ & chuẩn hóa số liệu...');

  if (!fs.existsSync(STORE_PATH)) {
    console.error('Không tìm thấy file store tại:', STORE_PATH);
    process.exit(1);
  }

  const rawStore = fs.readFileSync(STORE_PATH, 'utf-8');
  const store: EarningsStoreData = JSON.parse(rawStore);
  console.log(`Đã nạp ${store.records.length} bản ghi từ kỳ ${store.activePeriod}`);

  // Xác định Quý và Năm
  const matchPeriod = store.activePeriod.match(/Q(\d)\/(\d{4})/);
  const quy = matchPeriod ? parseInt(matchPeriod[1], 10) : 3;
  const nam = matchPeriod ? parseInt(matchPeriod[2], 10) : 2026;

  // Lấy dữ liệu mới nhất từ WiData để cập nhật lại YoY chuẩn (ttckq = Quarterly YoY)
  console.log(`[WiData] Tải dữ liệu BCTC Q${quy}/${nam} từ WiData...`);
  let widataMap: Record<string, WiDataFsItem> = {};
  try {
    const widataRes = await fetchWiDataQuarterlyEarnings({ quy, nam, limit: 1000 });
    widataRes.items.forEach((it) => {
      widataMap[it.mack.trim().toUpperCase()] = it;
    });
    console.log(`[WiData] Đã nạp ${Object.keys(widataMap).length} mã từ WiData.`);
  } catch (err: any) {
    console.warn('[WiData] Lỗi fetch WiData:', err.message);
  }

  // Tải map LNST quý trước (QoQ)
  const tickers = store.records.map((r) => r.ticker.trim().toUpperCase());
  console.log(`[PrevQuarter] Đang tra cứu số liệu quý trước cho ${tickers.length} mã...`);
  const prevPatMap = await getPreviousQuarterPatMap(tickers, quy, nam);
  console.log(`[PrevQuarter] Đã tìm thấy số liệu quý trước cho ${Object.keys(prevPatMap).length} mã.`);

  let updatedYoyCount = 0;
  let updatedQoqCount = 0;

  for (const record of store.records) {
    const ticker = record.ticker.trim().toUpperCase();
    const wiItem = widataMap[ticker];

    // Cập nhật YoY chuẩn nếu có dữ liệu từ WiData
    if (wiItem) {
      if (typeof wiItem.loinhuan_ttckq === 'number') {
        const truePatYoY = Number(wiItem.loinhuan_ttckq.toFixed(2));
        if (record.patYoYPercent !== truePatYoY) {
          record.patYoYPercent = truePatYoY;
          updatedYoyCount++;
        }
        if (truePatYoY !== -100) {
          record.patPrevious = Math.round(record.patCurrent / (1 + truePatYoY / 100));
        }
      }

      if (typeof wiItem.doanhthu_ttckq === 'number') {
        const trueRevYoY = Number(wiItem.doanhthu_ttckq.toFixed(2));
        record.revenueYoYPercent = trueRevYoY;
        if (trueRevYoY !== -100) {
          record.revenuePrevious = Math.round(record.revenueCurrent / (1 + trueRevYoY / 100));
        }
      }
    }

    // Cập nhật QoQ chuẩn từ quý liền kề
    const prevPatVnd = prevPatMap[ticker];
    const qoq = calculatePatQoQPercent(record.patCurrent, prevPatVnd);
    if (qoq !== null && record.patQoQPercent !== qoq) {
      record.patQoQPercent = qoq;
      updatedQoqCount++;
    }
  }

  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');

  console.log(`[Enrich Hoàn tất] Cập nhật YoY: ${updatedYoyCount} mã, Cập nhật QoQ: ${updatedQoqCount} mã.`);

  const dgw = store.records.find((r) => r.ticker === 'DGW');
  if (dgw) {
    console.log('--- Kiểm tra mã mẫu DGW ---');
    console.log('Mã:', dgw.ticker);
    console.log('LNST hiện tại (Q3/26):', (dgw.patCurrent / 1e9).toFixed(2), 'tỷ');
    console.log('LNST cùng kỳ (Q3/25):', (dgw.patPrevious / 1e9).toFixed(2), 'tỷ');
    console.log('Tăng trưởng YoY (svck):', dgw.patYoYPercent, '%');
    console.log('Tăng trưởng QoQ (quý trước):', dgw.patQoQPercent, '%');
    console.log('---------------------------');
  }
}

main().catch(console.error);
