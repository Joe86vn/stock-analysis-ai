import fs from 'fs';
import path from 'path';
import {
  EarningsRecord,
  EarningsStoreData,
  EarningsFilterParams,
  EarningsPeriod,
} from '@/types/earnings';

const DATA_DIR = path.join(process.cwd(), 'data', 'earnings');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
const STORE_FILE_PATH = path.join(DATA_DIR, 'latest_earnings_updates.json');

declare global {
  // eslint-disable-next-line no-var
  var __EARNINGS_STORE_CACHE__: EarningsStoreData | undefined;
}

function ensureDirectories(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[Earnings Store] Cannot create directory:', err);
  }
}

/**
 * Tạo dữ liệu store mặc định
 */
function createDefaultStore(): EarningsStoreData {
  return {
    activePeriod: 'Q3/2026',
    updatedAt: new Date().toISOString(),
    totalRecords: 0,
    records: [],
  };
}

/**
 * Tải dữ liệu store vào bộ nhớ cache
 */
export function getEarningsStore(): EarningsStoreData {
  if (globalThis.__EARNINGS_STORE_CACHE__) {
    return globalThis.__EARNINGS_STORE_CACHE__;
  }

  ensureDirectories();

  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed: EarningsStoreData = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.records)) {
        globalThis.__EARNINGS_STORE_CACHE__ = parsed;
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('[Earnings Store] Error reading store from disk:', err.message);
  }

  const def = createDefaultStore();
  globalThis.__EARNINGS_STORE_CACHE__ = def;
  return def;
}

/**
 * Lưu store xuống đĩa
 */
function persistStore(data: EarningsStoreData): void {
  try {
    ensureDirectories();
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    globalThis.__EARNINGS_STORE_CACHE__ = data;
  } catch (err: any) {
    console.warn('[Earnings Store] Error writing store to disk:', err.message);
  }
}

/**
 * Thêm mới hoặc cập nhật 1 bản ghi vào bảng kết quả kinh doanh mới nhất
 */
export function upsertEarningsRecord(record: EarningsRecord): void {
  const store = getEarningsStore();
  const existingIndex = store.records.findIndex((r) => r.id === record.id);

  if (existingIndex >= 0) {
    store.records[existingIndex] = {
      ...record,
      extractedAt: new Date().toISOString(),
    };
  } else {
    // Chèn lên đầu bảng (mới nhất lên trước)
    store.records.unshift(record);
  }

  // Tự động nhận diện kỳ hoạt động nếu kỳ của bản ghi chiếm ưu thế
  if (record.period && record.year) {
    store.activePeriod = `${record.period}/${record.year}`;
  }

  store.totalRecords = store.records.length;
  store.updatedAt = new Date().toISOString();

  persistStore(store);
}

/**
 * Thêm hoặc cập nhật hàng loạt bản ghi
 */
export function upsertMultipleEarningsRecords(records: EarningsRecord[]): void {
  if (!records || records.length === 0) return;

  const store = getEarningsStore();
  for (const record of records) {
    const existingIndex = store.records.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      store.records[existingIndex] = {
        ...record,
        extractedAt: new Date().toISOString(),
      };
    } else {
      store.records.unshift(record);
    }
  }

  const first = records[0];
  if (first.period && first.year) {
    store.activePeriod = `${first.period}/${first.year}`;
  }

  store.totalRecords = store.records.length;
  store.updatedAt = new Date().toISOString();

  persistStore(store);
}

/**
 * Truy vấn danh sách bản ghi với bộ lọc và sắp xếp
 */
export function queryEarningsRecords(filter: EarningsFilterParams = {}): {
  records: EarningsRecord[];
  total: number;
  activePeriod: string;
  updatedAt: string;
} {
  const store = getEarningsStore();
  let list = [...store.records];

  // Lọc theo kỳ
  if (filter.period) {
    list = list.filter((r) => r.period === filter.period);
  }

  // Lọc theo năm
  if (filter.year) {
    list = list.filter((r) => r.year === filter.year);
  }

  // Lọc theo sàn
  if (filter.exchange) {
    list = list.filter((r) => r.exchange === filter.exchange);
  }

  // Lọc tăng trưởng doanh thu tối thiểu
  if (typeof filter.minRevenueYoY === 'number') {
    list = list.filter((r) => r.revenueYoYPercent !== null && r.revenueYoYPercent >= filter.minRevenueYoY!);
  }

  // Lọc tăng trưởng LNST tối thiểu
  if (typeof filter.minPatYoY === 'number') {
    list = list.filter((r) => r.patYoYPercent !== null && r.patYoYPercent >= filter.minPatYoY!);
  }

  // Tìm kiếm theo mã hoặc tên công ty
  if (filter.search) {
    const q = filter.search.trim().toLowerCase();
    list = list.filter(
      (r) => r.ticker.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q)
    );
  }

  // Sắp xếp
  const sortBy = filter.sortBy || 'publishedAt';
  const sortOrder = filter.sortOrder || 'desc';

  list.sort((a, b) => {
    let valA: any = a[sortBy as keyof EarningsRecord];
    let valB: any = b[sortBy as keyof EarningsRecord];

    if (valA === null || valA === undefined) valA = -Infinity;
    if (valB === null || valB === undefined) valB = -Infinity;

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return {
    records: list,
    total: list.length,
    activePeriod: store.activePeriod,
    updatedAt: store.updatedAt,
  };
}

/**
 * Cơ chế Rollover theo Kỳ Báo Cáo:
 * Đóng gói bảng kỳ hiện tại lưu vào archive và làm mới bảng cho kỳ mới
 */
export function rolloverToNewPeriod(newPeriod: string): {
  archivedPeriod: string;
  archivedCount: number;
  newActivePeriod: string;
} {
  ensureDirectories();
  const store = getEarningsStore();

  const oldPeriod = store.activePeriod || 'OLD_PERIOD';
  const slug = oldPeriod.replace(/[^a-zA-Z0-9_-]/g, '_');
  const archiveFilePath = path.join(ARCHIVE_DIR, `earnings_${slug}.json`);

  // Lưu trữ dữ liệu kỳ cũ
  if (store.records.length > 0) {
    fs.writeFileSync(archiveFilePath, JSON.stringify(store, null, 2), 'utf-8');
    console.log(`[Earnings Store] Archived ${store.records.length} records of period ${oldPeriod} to ${archiveFilePath}`);
  }

  const archivedCount = store.records.length;

  // Khởi tạo bảng mới
  const freshStore: EarningsStoreData = {
    activePeriod: newPeriod,
    updatedAt: new Date().toISOString(),
    totalRecords: 0,
    records: [],
  };

  persistStore(freshStore);

  return {
    archivedPeriod: oldPeriod,
    archivedCount,
    newActivePeriod: newPeriod,
  };
}

/**
 * Xóa một bản ghi theo id
 */
export function deleteEarningsRecord(id: string): boolean {
  const store = getEarningsStore();
  const initialLen = store.records.length;
  store.records = store.records.filter((r) => r.id !== id);

  if (store.records.length !== initialLen) {
    store.totalRecords = store.records.length;
    store.updatedAt = new Date().toISOString();
    persistStore(store);
    return true;
  }

  return false;
}

/**
 * Dọn sạch các bản ghi không hợp lệ (mã không niêm yết, bán niên 6T, năm cũ, báo cáo riêng lẻ khi có hợp nhất)
 */
export function cleanInvalidEarningsRecords(): number {
  const store = getEarningsStore();
  const validPeriods = new Set(['Q1', 'Q2', 'Q3', 'Q4']);
  const validExchanges = new Set(['HOSE', 'HNX', 'UPCOM']);

  const initialCount = store.records.length;
  store.records = store.records.filter((r) => {
    // 1. Phải là mã niêm yết 3 ký tự
    if (!r.ticker || r.ticker === 'UNKNOWN' || !/^[A-Z0-9]{3}$/.test(r.ticker)) {
      return false;
    }
    // 2. Sàn giao dịch thuộc HOSE, HNX, UPCOM
    if (!validExchanges.has(r.exchange)) {
      return false;
    }
    // 3. Phải là báo cáo Quý (loại bỏ 6T bán niên hoặc báo cáo năm cũ)
    if (!validPeriods.has(r.period)) {
      return false;
    }
    // 4. Nếu có phân loại mẹ và hợp nhất: loại bỏ bản ghi PARENT nếu đã có CONSOLIDATED
    if (r.reportType === 'PARENT') {
      const hasConsolidated = store.records.some(
        (other) => other.ticker === r.ticker && other.year === r.year && other.period === r.period && other.reportType === 'CONSOLIDATED'
      );
      if (hasConsolidated) return false;
    }
    return true;
  });

  if (store.records.length !== initialCount) {
    store.totalRecords = store.records.length;
    store.updatedAt = new Date().toISOString();
    persistStore(store);
    console.log(`[Earnings Store] Cleaned up ${initialCount - store.records.length} invalid records.`);
  }

  return initialCount - store.records.length;
}

