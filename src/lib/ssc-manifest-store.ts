import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CrawlManifestItem, CrawlManifestStatus } from '@/types/earnings';

const DATA_DIR = path.join(process.cwd(), 'data', 'ssc-crawl');
const MANIFEST_FILE_PATH = path.join(DATA_DIR, 'manifest.json');

declare global {
  // eslint-disable-next-line no-var
  var __SSC_MANIFEST_CACHE__: Map<string, CrawlManifestItem> | undefined;
}

function ensureDirectory(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[SSC Manifest] Cannot create directory:', err);
  }
}

/**
 * Tải manifest vào bộ nhớ in-memory cache
 */
function loadManifestToCache(): Map<string, CrawlManifestItem> {
  if (globalThis.__SSC_MANIFEST_CACHE__) {
    return globalThis.__SSC_MANIFEST_CACHE__;
  }

  const map = new Map<string, CrawlManifestItem>();
  try {
    if (fs.existsSync(MANIFEST_FILE_PATH)) {
      const raw = fs.readFileSync(MANIFEST_FILE_PATH, 'utf-8');
      const list: CrawlManifestItem[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.reportKey) {
            map.set(item.reportKey, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SSC Manifest] Error reading manifest file:', err);
  }

  globalThis.__SSC_MANIFEST_CACHE__ = map;
  return map;
}

/**
 * Lưu bộ nhớ cache xuống tệp JSON
 */
function persistManifest(): void {
  const map = loadManifestToCache();
  try {
    ensureDirectory();
    const list = Array.from(map.values());
    fs.writeFileSync(MANIFEST_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SSC Manifest] Error persisting manifest file:', err);
  }
}

/**
 * Tạo reportKey chuẩn hóa từ ticker, title và url để nhận diện duy nhất bài báo cáo
 */
export function generateReportKey(ticker: string, title: string, pdfUrl: string): string {
  const cleanTicker = ticker.trim().toUpperCase();
  // Trích xuất kỳ nếu có trong tiêu đề (ví dụ Q1, Q2, Bán niên, 6 tháng)
  const normalizedTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let periodTag = 'UNKNOWN';
  if (/quy\s*1|q1/i.test(normalizedTitle)) periodTag = 'Q1';
  else if (/quy\s*2|q2/i.test(normalizedTitle)) periodTag = 'Q2';
  else if (/quy\s*3|q3/i.test(normalizedTitle)) periodTag = 'Q3';
  else if (/quy\s*4|q4/i.test(normalizedTitle)) periodTag = 'Q4';
  else if (/ban\s*nien|6\s*thang/i.test(normalizedTitle)) periodTag = '6T';
  else if (/nam/i.test(normalizedTitle)) periodTag = 'NAM';

  // Lấy năm nếu có
  const yearMatch = normalizedTitle.match(/202[0-9]/);
  const yearTag = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

  // Tạo hash ngắn từ PDF URL hoặc tiêu đề
  const urlHash = crypto.createHash('md5').update(pdfUrl || title).digest('hex').slice(0, 8);

  return `${cleanTicker}_${yearTag}_${periodTag}_${urlHash}`;
}

/**
 * Kiểm tra xem báo cáo đã được xử lý thành công hoặc đã bị loại bỏ trước đó chưa
 */
export function isReportProcessedOrSkipped(reportKey: string): boolean {
  const map = loadManifestToCache();
  const item = map.get(reportKey);
  if (!item) return false;
  if (item.status === 'SKIPPED_SECTOR') return true;

  if (item.status === 'PROCESSED') {
    try {
      const storeFile = path.join(process.cwd(), 'data', 'earnings', 'latest_earnings_updates.json');
      if (fs.existsSync(storeFile) && item.ticker) {
        const raw = fs.readFileSync(storeFile, 'utf-8');
        const store = JSON.parse(raw);
        const exists = (store.records || []).some((r: any) => r.ticker === item.ticker);
        if (!exists) {
          // Báo cáo ghi là PROCESSED nhưng trong bảng KQKD thực tế chưa có -> Cần cào và xử lý lại!
          return false;
        }
      }
    } catch {}
    return true;
  }

  return false;
}

/**
 * Lấy trạng thái của một báo cáo
 */
export function getReportManifestItem(reportKey: string): CrawlManifestItem | undefined {
  const map = loadManifestToCache();
  return map.get(reportKey);
}

/**
 * Cập nhật hoặc thêm mới trạng thái một báo cáo vào Manifest
 */
export function recordReportStatus(item: CrawlManifestItem): void {
  const map = loadManifestToCache();
  map.set(item.reportKey, {
    ...item,
    processedAt: item.processedAt || new Date().toISOString(),
  });
  persistManifest();
}

/**
 * Ghi nhận hàng loạt trạng thái
 */
export function recordMultipleReportStatuses(items: CrawlManifestItem[]): void {
  const map = loadManifestToCache();
  for (const item of items) {
    map.set(item.reportKey, {
      ...item,
      processedAt: item.processedAt || new Date().toISOString(),
    });
  }
  persistManifest();
}

/**
 * Lấy toàn bộ danh sách manifest
 */
export function getAllManifestItems(): CrawlManifestItem[] {
  const map = loadManifestToCache();
  return Array.from(map.values());
}

/**
 * Thống kê tổng quan số lượng báo cáo trong manifest
 */
export function getManifestStats() {
  const items = getAllManifestItems();
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let pending = 0;

  for (const it of items) {
    if (it.status === 'PROCESSED') processed++;
    else if (it.status === 'SKIPPED_SECTOR') skipped++;
    else if (it.status === 'FAILED') failed++;
    else if (it.status === 'PENDING') pending++;
  }

  return {
    total: items.length,
    processed,
    skipped,
    failed,
    pending,
  };
}
