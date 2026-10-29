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
const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
const STORE_FILE_PATH = path.join(DATA_DIR, 'latest_earnings_updates.json');

declare global {
  // eslint-disable-next-line no-var
  var __EARNINGS_STORE_CACHE__: EarningsStoreData | undefined;
  // eslint-disable-next-line no-var
  var __EARNINGS_STORE_MTIME__: number | undefined;
}

function ensureDirectories(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
    if (!fs.existsSync(PDFS_DIR)) {
      fs.mkdirSync(PDFS_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[Earnings Store] Cannot create directory:', err);
  }
}

/**
 * Xác định kỳ báo cáo tài chính mặc định theo mốc thời gian thực:
 * - Từ 01/01 - 31/03: báo cáo Quý 4 năm trước (ví dụ 15/02/2027 -> Q4/2026, từ 01/01/2027)
 * - Từ 01/04 - 30/06: báo cáo Quý 1 năm nay (ví dụ 15/05/2026 -> Q1/2026, từ 01/04/2026)
 * - Từ 01/07 - 30/09: báo cáo Quý 2 năm nay (ví dụ 15/08/2026 -> Q2/2026, từ 01/07/2026)
 * - Từ 01/10 - 31/12: báo cáo Quý 3 năm nay (ví dụ 20/10/2026 -> Q3/2026, từ 01/10/2026)
 */
export function calculateCurrentReportPeriod(date: Date = new Date()): {
  period: EarningsPeriod;
  year: number;
  label: string; // "Q3/2026"
  fromDate: string; // "01/10/2026"
} {
  const month = date.getMonth() + 1; // 1-12
  const fullYear = date.getFullYear();

  if (month >= 1 && month <= 3) {
    // Quý 4 năm trước
    const targetYear = fullYear - 1;
    return {
      period: 'Q4',
      year: targetYear,
      label: `Q4/${targetYear}`,
      fromDate: `01/01/${fullYear}`,
    };
  } else if (month >= 4 && month <= 6) {
    // Quý 1 năm nay
    return {
      period: 'Q1',
      year: fullYear,
      label: `Q1/${fullYear}`,
      fromDate: `01/04/${fullYear}`,
    };
  } else if (month >= 7 && month <= 9) {
    // Quý 2 năm nay
    return {
      period: 'Q2',
      year: fullYear,
      label: `Q2/${fullYear}`,
      fromDate: `01/07/${fullYear}`,
    };
  } else {
    // Quý 3 năm nay (tháng 10 - 12)
    return {
      period: 'Q3',
      year: fullYear,
      label: `Q3/${fullYear}`,
      fromDate: `01/10/${fullYear}`,
    };
  }
}

/**
 * Tạo dữ liệu store mặc định
 */
function createDefaultStore(periodLabel?: string): EarningsStoreData {
  const currentPeriod = calculateCurrentReportPeriod();
  return {
    activePeriod: periodLabel || currentPeriod.label,
    updatedAt: new Date().toISOString(),
    totalRecords: 0,
    records: [],
  };
}

/**
 * Tải dữ liệu store vào bộ nhớ cache, tự động đọc lại đĩa nếu file có thay đổi mtime.
 * Đồng thời tự động kiểm tra nếu đã bước sang giai đoạn/kỳ tiếp theo thì tự động rollover & lưu trữ kỳ cũ!
 */
export function getEarningsStore(): EarningsStoreData {
  ensureDirectories();

  const currentPeriodInfo = calculateCurrentReportPeriod();

  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const mtime = fs.statSync(STORE_FILE_PATH).mtimeMs;
      if (globalThis.__EARNINGS_STORE_CACHE__ && globalThis.__EARNINGS_STORE_MTIME__ === mtime) {
        // Kiểm tra xem store trong bộ nhớ có khớp với kỳ hiện tại không
        if (globalThis.__EARNINGS_STORE_CACHE__.activePeriod === currentPeriodInfo.label) {
          return globalThis.__EARNINGS_STORE_CACHE__;
        }
      }
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed: EarningsStoreData = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.records)) {
        // Kiểm tra tự động chuyển kỳ nếu thời gian đã sang kỳ mới (tránh đệ quy bằng rolloverToNewPeriodInternal)
        if (parsed.activePeriod && parsed.activePeriod !== currentPeriodInfo.label) {
          console.log(`[Earnings Store] Tự động chuyển kỳ: ${parsed.activePeriod} -> ${currentPeriodInfo.label}`);
          return rolloverToNewPeriodInternal(parsed, currentPeriodInfo.label);
        }

        globalThis.__EARNINGS_STORE_CACHE__ = parsed;
        globalThis.__EARNINGS_STORE_MTIME__ = mtime;
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('[Earnings Store] Error reading store from disk:', err.message);
  }

  const def = createDefaultStore();
  persistStore(def);
  return def;
}

/**
 * Lưu store xuống đĩa
 */
function persistStore(data: EarningsStoreData): void {
  try {
    ensureDirectories();
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    const mtime = fs.existsSync(STORE_FILE_PATH) ? fs.statSync(STORE_FILE_PATH).mtimeMs : Date.now();
    globalThis.__EARNINGS_STORE_CACHE__ = data;
    globalThis.__EARNINGS_STORE_MTIME__ = mtime;
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

  // Luôn đảm bảo kỳ hoạt động của bảng khớp với kỳ thị trường hiện tại
  const currentPeriodInfo = calculateCurrentReportPeriod();
  store.activePeriod = currentPeriodInfo.label;

  store.totalRecords = store.records.length;
  store.updatedAt = new Date().toISOString();

  persistStore(store);
}

/**
 * Trộn dữ liệu từ nguồn WiData vào bảng kết quả kinh doanh:
 * - Nếu mã nào bên SSC đã có (sourceType === 'SSC' hoặc hasPdf === true), GIỮ NGUYÊN nguồn SSC.
 * - Nếu mã nào bên SSC chưa có, chèn hoặc cập nhật từ nguồn WiData.
 */
export function mergeWiDataRecords(widataRecords: EarningsRecord[]): {
  added: number;
  updated: number;
  skippedExistingSsc: number;
} {
  if (!widataRecords || widataRecords.length === 0) {
    return { added: 0, updated: 0, skippedExistingSsc: 0 };
  }

  const store = getEarningsStore();
  let added = 0;
  let updated = 0;
  let skippedExistingSsc = 0;

  for (const record of widataRecords) {
    const existingIndex = store.records.findIndex(
      (r) =>
        r.ticker.toUpperCase() === record.ticker.toUpperCase() &&
        r.period === record.period &&
        r.year === record.year
    );

    if (existingIndex >= 0) {
      const existing = store.records[existingIndex];
      // Kiểm tra xem bản ghi hiện tại có bị rỗng số liệu không (do PDF SSC chỉ là văn bản thông báo công bố)
      const isExistingEmpty =
        (!existing.revenueCurrent && !existing.patCurrent) ||
        (existing.revenueCurrent === 0 && existing.patCurrent === 0);
      const widataHasData = record.revenueCurrent !== 0 || record.patCurrent !== 0;

      // Nếu đã có nguồn SSC hợp lệ (có dữ liệu kinh doanh thực tế), ưu tiên giữ nguyên nguồn SSC -> Bổ sung thêm QoQ và chỉ số kỹ thuật từ WiData
      if ((existing.sourceType === 'SSC' || existing.hasPdf) && !isExistingEmpty) {
        let changed = false;
        if (record.patQoQPercent !== undefined && record.patQoQPercent !== null && existing.patQoQPercent !== record.patQoQPercent) {
          existing.patQoQPercent = record.patQoQPercent;
          changed = true;
        }
        if (existing.rsRating == null && record.rsRating != null) {
          existing.rsRating = record.rsRating;
          changed = true;
        }
        if (existing.adtv20Billion == null && record.adtv20Billion != null) {
          existing.adtv20Billion = record.adtv20Billion;
          changed = true;
        }
        if (changed) updated++;
        skippedExistingSsc++;
        continue;
      }

      // Nếu bản ghi SSC trước đó bị rỗng (PDF chỉ là thông báo) HOẶC là bản ghi WiData cũ:
      // Cập nhật số liệu chuẩn từ WiData
      store.records[existingIndex] = {
        ...record,
        id: existing.id || record.id,
        companyName:
          existing.companyName && !existing.companyName.startsWith('CTCP ') && existing.companyName !== record.ticker
            ? existing.companyName
            : record.companyName,
        // Nếu có PDF thông báo từ SSC thì vẫn giữ lại để người dùng có thể mở xem văn bản gốc
        hasPdf: existing.hasPdf || false,
        pdfPath: existing.pdfPath || undefined,
        sourceType: isExistingEmpty && widataHasData ? 'WIDATA' : (existing.sourceType || 'WIDATA'),
        note:
          isExistingEmpty && widataHasData
            ? 'Số liệu đồng bộ từ WiData (File PDF SSC là thông báo công bố thông tin)'
            : existing.note || record.note,
        extractedAt: new Date().toISOString(),
      };
      updated++;
    } else {
      store.records.push({
        ...record,
        sourceType: 'WIDATA',
        hasPdf: false,
      });
      added++;
    }
  }

  const currentPeriodInfo = calculateCurrentReportPeriod();
  if (!store.activePeriod) {
    store.activePeriod = currentPeriodInfo.label;
  }

  store.totalRecords = store.records.length;
  store.updatedAt = new Date().toISOString();

  persistStore(store);

  return { added, updated, skippedExistingSsc };
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

  const currentPeriodInfo = calculateCurrentReportPeriod();
  store.activePeriod = currentPeriodInfo.label;

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

  // Lọc doanh thu tối thiểu tuyệt đối (VNĐ)
  if (typeof filter.minRevenueAbsolute === 'number') {
    list = list.filter((r) => r.revenueCurrent >= filter.minRevenueAbsolute!);
  }

  // Lọc tăng trưởng doanh thu tối thiểu
  if (typeof filter.minRevenueYoY === 'number') {
    list = list.filter((r) => r.revenueYoYPercent !== null && r.revenueYoYPercent >= filter.minRevenueYoY!);
  }

  // Lọc tăng trưởng LNST tối thiểu (%)
  if (typeof filter.minPatYoY === 'number') {
    list = list.filter((r) => r.patYoYPercent !== null && r.patYoYPercent >= filter.minPatYoY!);
  }

  // Lọc LNST tối thiểu tuyệt đối (VNĐ)
  if (typeof filter.minPatAbsolute === 'number') {
    list = list.filter((r) => r.patCurrent >= filter.minPatAbsolute!);
  }

  // Lọc thanh khoản GTGD 20 phiên tối thiểu (Tỷ VNĐ)
  if (typeof filter.minAdtv20 === 'number') {
    list = list.filter((r) => (r.adtv20Billion ?? 0) >= filter.minAdtv20!);
  }

  // Lọc sức mạnh giá RS tối thiểu (0-99)
  if (typeof filter.minRs === 'number') {
    list = list.filter((r) => (r.rsRating ?? 0) >= filter.minRs!);
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
 * Hàm nội bộ thực hiện rollover từ store hiện có sang kỳ mới (không gây đệ quy)
 */
function rolloverToNewPeriodInternal(
  oldStore: EarningsStoreData,
  newPeriod: string
): EarningsStoreData {
  ensureDirectories();
  const oldPeriod = oldStore.activePeriod || 'OLD_PERIOD';
  const slug = oldPeriod.replace(/[^a-zA-Z0-9_-]/g, '_');
  const archiveFilePath = path.join(ARCHIVE_DIR, `earnings_${slug}.json`);

  // Lưu trữ dữ liệu kỳ cũ
  if (oldStore.records && oldStore.records.length > 0) {
    try {
      fs.writeFileSync(archiveFilePath, JSON.stringify(oldStore, null, 2), 'utf-8');
      console.log(`[Earnings Store] Archived ${oldStore.records.length} records of period ${oldPeriod} to ${archiveFilePath}`);
    } catch (err: any) {
      console.warn('[Earnings Store] Failed to write archive:', err.message);
    }
  }

  // Dọn dẹp thư mục PDF của kỳ cũ để tiết kiệm dung lượng SSD
  try {
    const oldPdfDir = path.join(PDFS_DIR, slug);
    if (fs.existsSync(oldPdfDir)) {
      fs.rmSync(oldPdfDir, { recursive: true, force: true });
      console.log(`[Earnings Store] Cleaned up old PDFs directory for period ${oldPeriod}: ${oldPdfDir}`);
    }
  } catch (err: any) {
    console.warn('[Earnings Store] Failed to clean old PDFs directory:', err.message);
  }

  // Khởi tạo bảng mới
  const freshStore: EarningsStoreData = {
    activePeriod: newPeriod,
    updatedAt: new Date().toISOString(),
    totalRecords: 0,
    records: [],
  };

  persistStore(freshStore);
  return freshStore;
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
  let currentStore: EarningsStoreData;
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      currentStore = JSON.parse(raw);
    } else {
      currentStore = createDefaultStore();
    }
  } catch {
    currentStore = createDefaultStore();
  }

  const oldPeriod = currentStore.activePeriod || 'OLD_PERIOD';
  const archivedCount = currentStore.records?.length || 0;

  rolloverToNewPeriodInternal(currentStore, newPeriod);

  return {
    archivedPeriod: oldPeriod,
    archivedCount,
    newActivePeriod: newPeriod,
  };
}

/**
 * Lưu file PDF BCTC gốc vào thư mục lưu trữ theo kỳ: data/earnings/pdfs/[periodSlug]/[recordId].pdf
 */
export function saveEarningsPdf(
  recordId: string,
  periodLabel: string,
  sourcePdfPath: string
): string | null {
  try {
    ensureDirectories();
    const periodSlug = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetDir = path.join(PDFS_DIR, periodSlug);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFilename = `${recordId}.pdf`;
    const targetPath = path.join(targetDir, safeFilename);

    fs.copyFileSync(sourcePdfPath, targetPath);
    console.log(`[Earnings Store] Saved full BCTC PDF for ${recordId} at: ${targetPath}`);
    return targetPath;
  } catch (err: any) {
    console.warn(`[Earnings Store] Failed to save BCTC PDF for ${recordId}:`, err.message);
    return null;
  }
}

/**
 * Lấy đường dẫn file PDF của một bản ghi để mở đọc trực tiếp trên trình duyệt
 */
export function getEarningsPdfPath(recordId: string): string | null {
  try {
    ensureDirectories();
    // 1. Kiểm tra trong kỳ hiện tại
    const currentPeriod = calculateCurrentReportPeriod();
    const currentSlug = currentPeriod.label.replace(/[^a-zA-Z0-9_-]/g, '_');
    const directPath = path.join(PDFS_DIR, currentSlug, `${recordId}.pdf`);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    // 2. Tìm kiếm trong tất cả thư mục kỳ con của PDFS_DIR
    if (fs.existsSync(PDFS_DIR)) {
      const subdirs = fs.readdirSync(PDFS_DIR);
      for (const dir of subdirs) {
        const candidate = path.join(PDFS_DIR, dir, `${recordId}.pdf`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Earnings Store] Error finding PDF path for ${recordId}:`, err.message);
  }
  return null;
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

