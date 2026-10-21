import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data', 'earnings');
const PDFS_DIR = path.join(DATA_DIR, 'pdfs', 'Q3_2026');
const STORE_PATH = path.join(DATA_DIR, 'latest_earnings_updates.json');

async function main() {
  console.log('=== VALUEX: DOWNLOAD MISSING EARNINGS PDFS ===');

  if (!fs.existsSync(PDFS_DIR)) {
    fs.mkdirSync(PDFS_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    console.error('Store file not found:', STORE_PATH);
    process.exit(1);
  }

  const rawStore = fs.readFileSync(STORE_PATH, 'utf-8');
  const store = JSON.parse(rawStore);
  const records = store.records || [];

  // Tìm các mã chưa có file PDF trên đĩa
  const missingRecords = records.filter((r: any) => {
    const targetFile = path.join(PDFS_DIR, `${r.id}.pdf`);
    return !fs.existsSync(targetFile);
  });

  console.log(`Tổng số mã trong bảng: ${records.length}`);
  console.log(`Số mã chưa có file PDF: ${missingRecords.length}`);

  if (missingRecords.length === 0) {
    console.log('Tất cả các mã đều đã có file PDF lưu trữ!');
    return;
  }

  const tickerToRecordMap = new Map<string, any>();
  for (const r of missingRecords) {
    tickerToRecordMap.set(r.ticker.trim().toUpperCase(), r);
  }

  console.log('Danh sách các mã cần tải PDF:', Array.from(tickerToRecordMap.keys()).join(', '));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  console.log('Đang kết nối tới Cổng UBCKNN NewsSearch...');
  await page.goto('https://congbothongtin.ssc.gov.vn/faces/NewsSearch', {
    waitUntil: 'networkidle',
    timeout: 35000,
  });

  await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });

  let downloadedCount = 0;
  const maxPages = 15;

  for (let p = 1; p <= maxPages; p++) {
    if (tickerToRecordMap.size === 0) {
      console.log('Đã tải đủ toàn bộ các mã cần thiết!');
      break;
    }

    console.log(`\n--- Đang quét trang SSC ${p} (còn thiếu ${tickerToRecordMap.size} mã) ---`);
    if (p > 1) {
      const nextPageBtn = page.locator('a[id="pt9:t1::nb_nx"]');
      if (await nextPageBtn.isVisible()) {
        await nextPageBtn.click();
        await page.waitForTimeout(2000);
        await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });
      } else {
        console.log('Đã đến trang cuối cùng của SSC.');
        break;
      }
    }

    const rows = (await page.evaluate(`
      (() => {
        const rowEls = Array.from(document.querySelectorAll('div[id="pt9:t1::db"] table tr[role="row"]'));
        return rowEls.map((row) => {
          const cells = Array.from(row.querySelectorAll('td'));
          const text = (i) => cells[i] ? cells[i].innerText.trim() : '';
          const downloadBtn = row.querySelector('[id*="cil4z"]');
          return {
            exchange: text(1),
            ticker: text(2),
            reportTitle: text(3),
            companyName: text(4),
            publishDate: text(5),
            downloadId: downloadBtn ? downloadBtn.id : null,
          };
        });
      })()
    `)) as any[];

    for (const row of rows) {
      const ticker = (row.ticker || '').trim().toUpperCase();
      if (!tickerToRecordMap.has(ticker)) continue;

      const title = (row.reportTitle || '').toLowerCase();
      // Phải là BCTC và không phải 6T bán niên
      const isBCTC = title.includes('báo cáo tài chính') || title.includes('bctc');
      const isSemiAnnual = /bán\s*niên|6\s*tháng/i.test(title);
      if (!isBCTC || isSemiAnnual) continue;

      const matchedRecord = tickerToRecordMap.get(ticker);
      if (!matchedRecord || !row.downloadId) continue;

      console.log(`Đang tải PDF cho ${ticker} [${row.publishDate}]: ${row.reportTitle}...`);
      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
        await page.locator(`[id="${row.downloadId}"]`).click();
        const download = await downloadPromise;

        const targetFilePath = path.join(PDFS_DIR, `${matchedRecord.id}.pdf`);
        await download.saveAs(targetFilePath);

        if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).size > 1024) {
          console.log(`=> Đã lưu thành công ${targetFilePath} (${Math.round(fs.statSync(targetFilePath).size / 1024)} KB)`);
          matchedRecord.hasPdf = true;
          matchedRecord.pdfPath = targetFilePath;
          tickerToRecordMap.delete(ticker);
          downloadedCount++;
        }
      } catch (dlErr: any) {
        console.warn(`Lỗi khi tải PDF của ${ticker}:`, dlErr.message);
      }
    }
  }

  await browser.close();

  // Cập nhật lại store
  for (const r of records) {
    const filePath = path.join(PDFS_DIR, `${r.id}.pdf`);
    if (fs.existsSync(filePath)) {
      r.hasPdf = true;
      r.pdfPath = filePath;
    }
  }

  store.records = records;
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');

  console.log(`\n=== KẾT THÚC: Đã tải thành công ${downloadedCount} file PDF lưu trữ vào ${PDFS_DIR} ===`);
  if (tickerToRecordMap.size > 0) {
    console.log(`Các mã chưa tải được (nằm quá sâu hoặc không tìm thấy nút PDF):`, Array.from(tickerToRecordMap.keys()).join(', '));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
