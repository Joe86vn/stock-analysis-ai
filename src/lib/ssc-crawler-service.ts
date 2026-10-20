import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { SscNewsItem, ExchangeType } from '@/types/earnings';
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
  rowIndex: number;
}

/**
 * Quét danh sách tin mới nhất từ SSC và lọc các BCTC cần xử lý
 */
export async function crawlSscLatestReports(options: {
  maxPages?: number;
  tempDownloadDir?: string;
}): Promise<{
  totalScanned: number;
  newReportsFound: SscRawRow[];
  skippedSectorCount: number;
  alreadyProcessedCount: number;
}> {
  const maxPages = options.maxPages || 1;
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
    console.log('[SSC Crawler] Navigating to SSC NewsSearch...');
    await page.goto('https://congbothongtin.ssc.gov.vn/faces/NewsSearch', {
      waitUntil: 'networkidle',
      timeout: 35000,
    });

    await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 15000 });

    for (let p = 1; p <= maxPages; p++) {
      if (p > 1) {
        // Chuyển trang nếu có yêu cầu nhiều hơn 1 trang
        const nextPageBtn = page.locator('a[id="pt9:t1::nb_nx"]');
        if (await nextPageBtn.isVisible()) {
          await nextPageBtn.click();
          await page.waitForTimeout(2000);
          await page.waitForSelector('div[id="pt9:t1::db"] table tr[role="row"]', { timeout: 10000 });
        } else {
          break;
        }
      }

      // Trích xuất dữ liệu bảng HTML an toàn không dùng helper functions trong evaluate
      const rawRows = await page.evaluate(`
        (() => {
          const rows = Array.from(document.querySelectorAll('div[id="pt9:t1::db"] table tr[role="row"]'));
          return rows.map((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            const text = (i) => cells[i] ? cells[i].innerText.trim() : '';
            return {
              stt: text(0),
              exchange: text(1),
              ticker: text(2),
              reportTitle: text(3),
              companyName: text(4),
              summary: text(5),
              publishDate: text(6),
              rowIndex: index
            };
          });
        })()
      `) as any[];

      totalScanned += rawRows.length;

      for (const row of rawRows) {
        const rawTicker = (row.ticker || '').trim().toUpperCase();
        const rawTitle = row.reportTitle || '';
        const rawSummary = row.summary || '';
        const rawCompany = row.companyName || '';

        // Kiểm tra xem có phải BCTC không
        const combinedText = `${rawTitle} ${rawSummary}`.toLowerCase();
        const isBCTC =
          combinedText.includes('báo cáo tài chính') ||
          combinedText.includes('bctc') ||
          combinedText.includes('kết quả hoạt động kinh doanh');

        if (!isBCTC) {
          continue; // Bỏ qua nếu không phải tin BCTC
        }

        const reportKey = generateReportKey(rawTicker || 'NOTICKER', rawTitle, rawSummary);

        // Kiểm tra trùng lặp với Manifest
        if (isReportProcessedOrSkipped(reportKey)) {
          alreadyProcessedCount++;
          continue;
        }

        // Kiểm tra loại trừ khối Tài chính (Ngân hàng, CK, Bảo hiểm)
        if (isFinancialSector(rawTicker, rawCompany)) {
          skippedSectorCount++;
          recordReportStatus({
            reportKey,
            ticker: rawTicker,
            title: rawTitle,
            publishDate: row.publishDate || new Date().toISOString(),
            pdfUrl: '',
            status: 'SKIPPED_SECTOR',
            processedAt: new Date().toISOString(),
            failureReason: 'Thuộc khối Ngân hàng / Chứng khoán / Bảo hiểm (Tạm loại trừ)',
          });
          continue;
        }

        newReportsFound.push({
          stt: row.stt,
          exchange: normalizeExchange(row.exchange),
          ticker: rawTicker,
          reportTitle: rawTitle,
          companyName: rawCompany,
          summary: rawSummary,
          publishDate: row.publishDate,
          rowIndex: row.rowIndex,
        });
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
 * Tải file PDF của một dòng cụ thể bằng Playwright download event
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
 * Pipeline chạy tự động: Quét -> Tải -> Định vị -> Số hóa Gemini -> Xóa PDF -> Lưu bảng KQKD
 */
export async function runSscEarningsPipeline(options: {
  maxPages?: number;
  maxItemsToProcess?: number;
}): Promise<{
  scannedCount: number;
  newReportsFoundCount: number;
  processedCount: number;
  failedCount: number;
  records: any[];
}> {
  const maxPages = options.maxPages || 1;
  const maxItems = options.maxItemsToProcess || 5;

  const { locateIncomeStatementPages, cleanupTempPdf } = await import('./ssc-pdf-locator');
  const {
    extractEarningsFromText,
    extractEarningsFromPdfFile,
    buildEarningsRecord,
  } = await import('./ssc-earnings-extractor');
  const { upsertEarningsRecord } = await import('./earnings-store');

  console.log(`[SSC Pipeline] Starting pipeline (pages=${maxPages}, maxItems=${maxItems})...`);

  const crawlResult = await crawlSscLatestReports({ maxPages });
  const candidates = crawlResult.newReportsFound.slice(0, maxItems);

  let processedCount = 0;
  let failedCount = 0;
  const createdRecords: any[] = [];

  for (const item of candidates) {
    const reportKey = generateReportKey(item.ticker, item.reportTitle, item.summary);
    console.log(`[SSC Pipeline] Processing candidate: ${item.ticker} - ${item.reportTitle} (row ${item.rowIndex})...`);

    let downloadRes: { filePath: string; filename: string } | null = null;
    try {
      downloadRes = await downloadSscReportPdfByRow(item.rowIndex);
      if (!downloadRes) {
        throw new Error('Download PDF failed or file too small');
      }

      const { filePath } = downloadRes;

      // Định vị trang KQKD
      const located = await locateIncomeStatementPages(filePath);

      let rawData: any = null;
      if (located.isScanned) {
        console.log(`[SSC Pipeline] ${item.ticker}: Scanned PDF, running multimodal vision...`);
        rawData = await extractEarningsFromPdfFile(filePath, {
          ticker: item.ticker,
          companyName: item.companyName,
          reportTitle: item.reportTitle,
        });
      } else {
        console.log(`[SSC Pipeline] ${item.ticker}: Text layer located (pages: ${located.pageNumbers.join(', ')})...`);
        rawData = await extractEarningsFromText(located.textSnippet, {
          ticker: item.ticker,
          companyName: item.companyName,
          reportTitle: item.reportTitle,
        });
      }

      // Xóa file PDF tạm ngay lập tức
      cleanupTempPdf(filePath);

      if (!rawData || !rawData.currentPeriod) {
        throw new Error('Gemini could not extract income statement fields');
      }

      // Chuẩn hóa và tính % tăng trưởng YoY
      const record = buildEarningsRecord(rawData, {
        exchange: item.exchange,
        publishedAt: item.publishDate,
        sourceUrl: 'https://congbothongtin.ssc.gov.vn/faces/NewsSearch',
      });

      // Lưu vào store
      upsertEarningsRecord(record);

      // Đánh dấu manifest đã hoàn tất
      recordReportStatus({
        reportKey,
        ticker: item.ticker,
        title: item.reportTitle,
        publishDate: item.publishDate,
        pdfUrl: downloadRes.filename,
        status: 'PROCESSED',
        processedAt: new Date().toISOString(),
      });

      createdRecords.push(record);
      processedCount++;
      console.log(`[SSC Pipeline] Successfully saved ${record.ticker} (${record.period}/${record.year}): Rev YoY ${record.revenueYoYPercent}%, PAT YoY ${record.patYoYPercent}%`);
    } catch (err: any) {
      console.error(`[SSC Pipeline] Failed to process ${item.ticker}:`, err.message);
      failedCount++;

      if (downloadRes?.filePath) {
        cleanupTempPdf(downloadRes.filePath);
      }

      recordReportStatus({
        reportKey,
        ticker: item.ticker,
        title: item.reportTitle,
        publishDate: item.publishDate,
        pdfUrl: '',
        status: 'FAILED',
        processedAt: new Date().toISOString(),
        failureReason: err.message,
      });
    }
  }

  return {
    scannedCount: crawlResult.totalScanned,
    newReportsFoundCount: crawlResult.newReportsFound.length,
    processedCount,
    failedCount,
    records: createdRecords,
  };
}

