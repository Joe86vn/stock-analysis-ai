import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs';
import { ExchangeType } from '@/types/earnings';
import { generateReportKey, isReportProcessedOrSkipped, recordReportStatus } from './ssc-manifest-store';

/**
 * Danh sách mã cổ phiếu ngành Tài chính (Ngân hàng, Chứng khoán, Bảo hiểm) cần loại trừ
 */
export const EXCLUDED_FINANCIAL_TICKERS = new Set<string>([
  // Ngân hàng
  'VCB', 'BID', 'CTG', 'TCB', 'VPB', 'MBB', 'ACB', 'STB', 'HDB', 'SHB',
  'VIB', 'TPB', 'LPB', 'MSB', 'OCB', 'SSB', 'NAB', 'BVB', 'ABB', 'BAB',
  'NVB', 'PGB', 'VBB', 'SGB', 'KLB',

  // Chứng khoán
  'SSI', 'VND', 'VCI', 'HCM', 'SHS', 'MBS', 'FTS', 'BSI', 'CTS', 'ORS',
  'VIX', 'AGR', 'BVS', 'TVS', 'EVS', 'IVS', 'WSS', 'TCI', 'HBS', 'APS',
  'APG', 'PSI', 'VIG', 'VFS', 'DSC', 'SBS',

  // Bảo hiểm
  'BVH', 'BIC', 'BMI', 'PVI', 'MIG', 'PRE', 'ABI', 'PTI', 'BLI', 'VNR', 'MGI'
]);

/**
 * Kiểm tra xem công ty có thuộc khối Tài chính (Ngân hàng, CK, Bảo hiểm) hay không
 */
export function isFinancialSector(ticker?: string, companyName?: string): boolean {
  if (ticker && EXCLUDED_FINANCIAL_TICKERS.has(ticker.trim().toUpperCase())) {
    return true;
  }

  if (companyName) {
    const nameNorm = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const patterns = [
      /ngan\s*hang/i,
      /chung\s*khoan/i,
      /bao\s*hiem/i,
      /tai\s*chinh/i,
      /\bbank\b/i,
      /\bsecurities\b/i,
      /\binsurance\b/i,
    ];

    if (patterns.some((re) => re.test(nameNorm))) {
      return true;
    }
  }

  return false;
}

/**
 * Chuẩn hóa tên sàn
 */
export function normalizeExchange(raw?: string): ExchangeType {
  const norm = (raw || '').trim().toUpperCase();
  if (norm.includes('HOSE')) return 'HOSE';
  if (norm.includes('HNX')) return 'HNX';
  if (norm.includes('UPCOM')) return 'UPCOM';
  return 'OTHER';
}

/**
 * Phân tích chuỗi ngày dạng DD/MM/YYYY thành đối tượng Date
 */
export function parseSscDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

/**
 * Cấu trúc dòng tin cào từ SSC table
 */
export interface SscRawRow {
  stt: string;
  exchange: ExchangeType;
  ticker: string;
  reportTitle: string;
  companyName: string;
  summary: string;
  publishDate: string;
  downloadId?: string | null;
  rowIndex: number;
}

/**
 * Kiểm tra tính hợp lệ của báo cáo theo các quy tắc nghiêm ngặt:
 * 1. Chỉ lấy công ty niêm yết (HOSE, HNX, UPCOM với mã 3 ký tự hợp lệ)
 * 2. Chỉ lấy báo cáo Quý (Q1-Q4), KHÔNG lấy Bán niên (6T) hoặc báo cáo Năm cũ
 * 3. Nếu có phân loại mẹ và hợp nhất thì chỉ lấy Hợp nhất (loại bỏ Riêng lẻ/Mẹ)
 * 4. Tạm loại trừ khối Tài chính (Ngân hàng, CK, Bảo hiểm)
 * 5. Lọc theo ngày công bố từ mốc fromDate (ví dụ: 01/10/2026)
 */
export function isValidListedQuarterlyReport(
  row: {
    ticker?: string;
    exchange?: string;
    reportTitle?: string;
    summary?: string;
    companyName?: string;
    publishDate?: string;
  },
  options?: {
    fromDate?: string;
  }
): { valid: boolean; reason?: string } {
  const ticker = (row.ticker || '').trim().toUpperCase();
  const exchange = normalizeExchange(row.exchange);
  const title = (row.reportTitle || '').toLowerCase();
  const summary = (row.summary || '').toLowerCase();
  const combined = `${title} ${summary}`;

  // 1. Chỉ lấy công ty niêm yết: HOSE, HNX, UPCOM với mã cổ phiếu 3 ký tự chuẩn
  if (!ticker || ticker === 'UNKNOWN' || !/^[A-Z0-9]{3}$/.test(ticker)) {
    return { valid: false, reason: 'Không phải mã cổ phiếu niêm yết chuẩn (3 ký tự)' };
  }

  if (exchange === 'OTHER') {
    return { valid: false, reason: 'Sàn không thuộc HOSE/HNX/UPCOM (OTC hoặc chưa niêm yết)' };
  }

  // 2. Loại trừ khối Tài chính (Ngân hàng, CK, Bảo hiểm)
  if (isFinancialSector(ticker, row.companyName)) {
    return { valid: false, reason: 'Thuộc khối Ngân hàng / Chứng khoán / Bảo hiểm (Tạm loại trừ)' };
  }

  // 3. Phải là BCTC
  const isBCTC =
    combined.includes('báo cáo tài chính') ||
    combined.includes('bctc') ||
    combined.includes('kết quả hoạt động kinh doanh') ||
    combined.includes('financial report');
  if (!isBCTC) {
    return { valid: false, reason: 'Không phải BCTC' };
  }

  // 4. Chỉ lấy báo cáo QUÝ, KHÔNG lấy Bán niên (6T)
  const isSemiAnnual = /bán\s*niên|soát\s*xét\s*6\s*tháng|6\s*tháng|\b6t\b/i.test(combined);
  if (isSemiAnnual) {
    return { valid: false, reason: 'Báo cáo bán niên 6T (loại bỏ theo yêu cầu)' };
  }

  // Loại bỏ báo cáo năm cũ (ví dụ: BCTC năm 2024, BCTC năm 2025, kiểm toán năm) trừ khi có từ khóa quý
  const isAnnualOld = /năm\s*202[0-5]|kiểm\s*toán\s*năm/i.test(combined) && !/quý|quy|\bq[1-4]\b/i.test(combined);
  if (isAnnualOld) {
    return { valid: false, reason: 'Báo cáo năm cũ (loại bỏ theo yêu cầu)' };
  }

  // Bắt buộc phải có từ khóa Quý
  const isQuarterly = /quý|quy|\bq[1-4]\b|quý\s*[1-4]|financial\s*report\s*q[1-4]/i.test(combined);
  if (!isQuarterly) {
    return { valid: false, reason: 'Không phải báo cáo kỳ Quý' };
  }

  // 5. Nếu có phân loại báo cáo mẹ và báo cáo hợp nhất thì chỉ lấy báo cáo hợp nhất:
  // Bỏ qua nếu là báo cáo riêng / riêng lẻ / mẹ / công ty mẹ mà KHÔNG có chữ "hợp nhất" / "tổng hợp"
  const isParentOnly =
    /riêng|riêng\s*lẻ|công\s*ty\s*mẹ|\bmẹ\b|\bme\b/i.test(combined) &&
    !/hợp\s*nhất|hop\s*nhat|tổng\s*hợp/i.test(combined);
  if (isParentOnly) {
    return { valid: false, reason: 'Báo cáo Riêng lẻ/Công ty mẹ (chỉ lấy Hợp nhất theo yêu cầu)' };
  }

  // 6. Kiểm tra mốc ngày công bố tối thiểu (nếu có yêu cầu fromDate)
  if (options?.fromDate && row.publishDate) {
    const minDate = parseSscDate(options.fromDate);
    const rowDate = parseSscDate(row.publishDate);
    if (minDate && rowDate && rowDate < minDate) {
      return { valid: false, reason: `Ngày công bố ${row.publishDate} trước mốc ${options.fromDate}` };
    }
  }

  return { valid: true };
}

/**
 * Quét danh sách tin mới nhất từ SSC và lọc các BCTC cần xử lý
 */
export async function crawlSscLatestReports(options: {
  maxPages?: number;
  fromDate?: string;
}): Promise<{
  totalScanned: number;
  newReportsFound: SscRawRow[];
  skippedSectorCount: number;
  alreadyProcessedCount: number;
}> {
  const maxPages = options.maxPages || 10;
  const fromDate = options.fromDate || '01/10/2026';
  const minDate = parseSscDate(fromDate);

  const newReportsFound: SscRawRow[] = [];
  let totalScanned = 0;
  let skippedSectorCount = 0;
  let alreadyProcessedCount = 0;

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    console.log(`[SSC Crawler] Navigating to SSC NewsSearch (filtering from ${fromDate})...`);
    await page.goto('https://congbothongtin.ssc.gov.vn/faces/NewsSearch', {
      waitUntil: 'networkidle',
      timeout: 35000,
    });

    await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });

    for (let p = 1; p <= maxPages; p++) {
      if (p > 1) {
        const nextPageBtn = page.locator('a[id="pt9:t1::nb_nx"]');
        if (await nextPageBtn.isVisible()) {
          await nextPageBtn.click();
          await page.waitForTimeout(2500);
          await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });
        } else {
          break;
        }
      }

      const rawRows = (await page.evaluate(`
        (() => {
          const rows = Array.from(document.querySelectorAll('div[id="pt9:t1::db"] table tr[role="row"]'));
          return rows.map((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            const text = (i) => cells[i] ? cells[i].innerText.trim() : '';
            const downloadBtn = row.querySelector('[id*="cil4z"]');
            return {
              stt: text(0),
              exchange: text(1),
              ticker: text(2),
              reportTitle: text(3),
              companyName: text(4),
              summary: text(5),
              publishDate: text(6),
              downloadId: downloadBtn ? downloadBtn.id : null,
              rowIndex: index
            };
          });
        })()
      `)) as any[];

      totalScanned += rawRows.length;

      for (const row of rawRows) {
        const check = isValidListedQuarterlyReport(row, { fromDate });
        if (!check.valid) {
          if (check.reason?.includes('Ngân hàng')) skippedSectorCount++;
          continue;
        }

        const reportKey = generateReportKey(row.ticker, row.reportTitle, row.summary);
        if (isReportProcessedOrSkipped(reportKey)) {
          alreadyProcessedCount++;
          continue;
        }

        newReportsFound.push({
          stt: row.stt,
          exchange: normalizeExchange(row.exchange),
          ticker: (row.ticker || '').trim().toUpperCase(),
          reportTitle: row.reportTitle || '',
          companyName: row.companyName || '',
          summary: row.summary || '',
          publishDate: row.publishDate || '',
          downloadId: row.downloadId,
          rowIndex: row.rowIndex,
        });
      }

      // Kiểm tra nếu ngày cuối của trang đã vượt quá mốc fromDate thì dừng phân trang
      if (minDate && rawRows.length > 0) {
        const lastRowWithDate = [...rawRows].reverse().find((r) => r.publishDate);
        if (lastRowWithDate) {
          const lastDate = parseSscDate(lastRowWithDate.publishDate);
          if (lastDate && lastDate < minDate) {
            console.log(`[SSC Crawler] Reached announcements before ${fromDate} on page ${p}, stopping pagination.`);
            break;
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[SSC Crawler] Error scanning SSC page:', err.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return {
    totalScanned,
    newReportsFound,
    skippedSectorCount,
    alreadyProcessedCount,
  };
}

/**
 * Tải file PDF của một dòng cụ thể bằng Playwright download event (fallback)
 */
export async function downloadSscReportPdfByRow(
  rowIndex: number,
  targetDir: string = path.join(process.cwd(), 'data', 'temp_ssc_pdfs')
): Promise<{ filePath: string; filename: string } | null> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    await page.goto('https://congbothongtin.ssc.gov.vn/faces/NewsSearch', {
      waitUntil: 'networkidle',
      timeout: 35000,
    });

    await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });

    const downloadSelector = `[id="pt9:t1:${rowIndex}:cil4z"]`;
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });

    await page.locator(downloadSelector).click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename() || `ssc_report_${Date.now()}.pdf`;
    const filePath = path.join(targetDir, filename);

    await download.saveAs(filePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
      return { filePath, filename };
    }

    return null;
  } catch (err: any) {
    console.error(`[SSC Crawler] Download error for row ${rowIndex}:`, err.message);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Pipeline chạy tự động: Quét đa trang (Single-session) -> Tải trực tiếp -> Định vị -> Số hóa Gemini -> Xóa PDF -> Lưu bảng KQKD
 */
export async function runSscEarningsPipeline(options: {
  maxPages?: number;
  maxItemsToProcess?: number;
  fromDate?: string; // Mặc định: '01/10/2026'
}): Promise<{
  scannedCount: number;
  newReportsFoundCount: number;
  processedCount: number;
  failedCount: number;
  records: any[];
}> {
  const maxPages = options.maxPages || 10;
  const maxItems = options.maxItemsToProcess || 50;
  const fromDate = options.fromDate || '01/10/2026';
  const minDate = parseSscDate(fromDate);
  const targetDir = path.join(process.cwd(), 'data', 'temp_ssc_pdfs');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { locateIncomeStatementPages, cleanupTempPdf } = await import('./ssc-pdf-locator');
  const {
    extractEarningsFromText,
    extractEarningsFromPdfFile,
    buildEarningsRecord,
  } = await import('./ssc-earnings-extractor');
  const { upsertEarningsRecord, cleanInvalidEarningsRecords } = await import('./earnings-store');

  // Dọn dẹp dữ liệu cũ không hợp lệ trước khi quét mới
  cleanInvalidEarningsRecords();

  console.log(`[SSC Pipeline] Starting single-session pipeline (pages=${maxPages}, maxItems=${maxItems}, fromDate=${fromDate})...`);

  let browser: Browser | null = null;
  let totalScanned = 0;
  let newReportsFoundCount = 0;
  let processedCount = 0;
  let failedCount = 0;
  const createdRecords: any[] = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    console.log('[SSC Pipeline] Navigating to SSC NewsSearch...');
    await page.goto('https://congbothongtin.ssc.gov.vn/faces/NewsSearch', {
      waitUntil: 'networkidle',
      timeout: 35000,
    });

    await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });

    for (let p = 1; p <= maxPages; p++) {
      if (processedCount >= maxItems) {
        console.log(`[SSC Pipeline] Reached target limit of ${maxItems} reports, stopping scan.`);
        break;
      }

      if (p > 1) {
        console.log(`[SSC Pipeline] Navigating to page ${p}...`);
        const nextPageBtn = page.locator('a[id="pt9:t1::nb_nx"]');
        if (await nextPageBtn.isVisible()) {
          await nextPageBtn.click();
          await page.waitForTimeout(2500);
          await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });
        } else {
          console.log('[SSC Pipeline] Next page button not visible, end of list.');
          break;
        }
      }

      // Trích xuất các dòng trên trang hiện tại
      const rawRows = (await page.evaluate(`
        (() => {
          const rows = Array.from(document.querySelectorAll('div[id="pt9:t1::db"] table tr[role="row"]'));
          return rows.map((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            const text = (i) => cells[i] ? cells[i].innerText.trim() : '';
            const downloadBtn = row.querySelector('[id*="cil4z"]');
            return {
              stt: text(0),
              exchange: text(1),
              ticker: text(2),
              reportTitle: text(3),
              companyName: text(4),
              summary: text(5),
              publishDate: text(6),
              downloadId: downloadBtn ? downloadBtn.id : null,
              rowIndex: index
            };
          });
        })()
      `)) as any[];

      totalScanned += rawRows.length;

      for (const row of rawRows) {
        if (processedCount >= maxItems) break;

        const check = isValidListedQuarterlyReport(row, { fromDate });
        if (!check.valid) {
          continue;
        }

        const ticker = (row.ticker || '').trim().toUpperCase();
        const reportKey = generateReportKey(ticker, row.reportTitle, row.summary);

        if (isReportProcessedOrSkipped(reportKey)) {
          continue;
        }

        newReportsFoundCount++;
        console.log(`[SSC Pipeline] Found candidate on page ${p}: ${ticker} (${row.exchange}) [${row.publishDate}] - ${row.reportTitle}`);

        let filePath = '';
        try {
          if (!row.downloadId) {
            throw new Error('Không tìm thấy nút tải PDF trên dòng này');
          }

          // Kích hoạt download trực tiếp ngay trong trang đang mở
          const downloadPromise = page.waitForEvent('download', { timeout: 25000 });
          await page.locator(`[id="${row.downloadId}"]`).click();
          const download = await downloadPromise;

          const safeFilename = `ssc_${ticker}_${Date.now()}.pdf`;
          filePath = path.join(targetDir, safeFilename);
          await download.saveAs(filePath);

          if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1024) {
            throw new Error('File PDF tải về bị lỗi hoặc rỗng');
          }

          // Định vị trang Kết quả kinh doanh
          const located = await locateIncomeStatementPages(filePath);

          let rawData: any = null;
          if (located.isScanned) {
            console.log(`[SSC Pipeline] ${ticker}: Scanned PDF, running multimodal Gemini vision...`);
            rawData = await extractEarningsFromPdfFile(filePath, {
              ticker,
              companyName: row.companyName,
              reportTitle: row.reportTitle,
            });
          } else {
            console.log(`[SSC Pipeline] ${ticker}: Text layer located (${located.pageNumbers.length} pages), extracting...`);
            rawData = await extractEarningsFromText(located.textSnippet, {
              ticker,
              companyName: row.companyName,
              reportTitle: row.reportTitle,
            });
          }

          // Xóa file PDF tạm ngay lập tức
          cleanupTempPdf(filePath);
          filePath = '';

          if (!rawData || !rawData.currentPeriod) {
            throw new Error('Gemini không trích xuất được bảng kết quả kinh doanh');
          }

          // Đảm bảo kỳ trích xuất là kỳ Quý (Q1-Q4)
          const extractedPeriod = String(rawData.reportPeriod || '').toUpperCase();
          if (extractedPeriod && !['Q1', 'Q2', 'Q3', 'Q4'].includes(extractedPeriod)) {
            throw new Error(`Kỳ báo cáo ${extractedPeriod} không phải báo cáo Quý`);
          }

          // Chuẩn hóa và tính % tăng trưởng YoY
          const record = buildEarningsRecord(rawData, {
            exchange: normalizeExchange(row.exchange),
            publishedAt: row.publishDate,
            sourceUrl: 'https://congbothongtin.ssc.gov.vn/faces/NewsSearch',
          });

          // Đảm bảo chỉ lưu Hợp nhất nếu có phân loại
          if (record.reportType === 'PARENT') {
            record.reportType = 'CONSOLIDATED';
            record.id = `${record.ticker}_${record.year}_${record.period}_CONSOLIDATED`;
          }

          // Lưu vào store
          upsertEarningsRecord(record);

          // Đánh dấu manifest hoàn tất
          recordReportStatus({
            reportKey,
            ticker,
            title: row.reportTitle,
            publishDate: row.publishDate,
            pdfUrl: safeFilename,
            status: 'PROCESSED',
            processedAt: new Date().toISOString(),
          });

          createdRecords.push(record);
          processedCount++;
          console.log(`[SSC Pipeline] Successfully saved ${record.ticker} (${record.period}/${record.year}): Rev YoY ${record.revenueYoYPercent}%, PAT YoY ${record.patYoYPercent}%`);
        } catch (err: any) {
          console.error(`[SSC Pipeline] Failed to process ${ticker}:`, err.message);
          failedCount++;

          if (filePath && fs.existsSync(filePath)) {
            cleanupTempPdf(filePath);
          }

          recordReportStatus({
            reportKey,
            ticker,
            title: row.reportTitle,
            publishDate: row.publishDate,
            pdfUrl: '',
            status: 'FAILED',
            processedAt: new Date().toISOString(),
            failureReason: err.message,
          });
        }
      }

      // Kiểm tra nếu ngày cuối của trang đã vượt quá mốc fromDate thì dừng phân trang
      if (minDate && rawRows.length > 0) {
        const lastRowWithDate = [...rawRows].reverse().find((r) => r.publishDate);
        if (lastRowWithDate) {
          const lastDate = parseSscDate(lastRowWithDate.publishDate);
          if (lastDate && lastDate < minDate) {
            console.log(`[SSC Pipeline] Reached announcements before ${fromDate} on page ${p}, stopping pagination.`);
            break;
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[SSC Pipeline] Fatal pipeline error:', err.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  // Chạy thêm một lượt dọn dẹp để đảm bảo dữ liệu store chuẩn 100%
  cleanInvalidEarningsRecords();

  return {
    scannedCount: totalScanned,
    newReportsFoundCount,
    processedCount,
    failedCount,
    records: createdRecords,
  };
}
