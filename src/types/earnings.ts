/**
 * Types & Contracts cho hệ thống thu thập & số hóa BCTC từ SSC (UBCKNN)
 */

export type EarningsPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | '6T' | '9T' | 'NAM';

export type EarningsReportType = 'CONSOLIDATED' | 'PARENT';

export type ExchangeType = 'HOSE' | 'HNX' | 'UPCOM' | 'OTHER';

export type CrawlManifestStatus = 'PROCESSED' | 'SKIPPED_SECTOR' | 'FAILED' | 'PENDING';

/**
 * Mục tin tức thu thập được từ trang SSC NewsSearch
 */
export interface SscNewsItem {
  id: string;
  ticker: string;
  companyName?: string;
  title: string;
  publishDate: string; // YYYY-MM-DD hoặc DD/MM/YYYY HH:mm
  articleUrl: string;
  pdfUrls: string[];
}

/**
 * Bản ghi trạng thái trong Manifest chống trùng lặp
 */
export interface CrawlManifestItem {
  reportKey: string;
  ticker: string;
  title: string;
  publishDate: string;
  pdfUrl: string;
  status: CrawlManifestStatus;
  processedAt: string;
  failureReason?: string;
}

/**
 * Dữ liệu số hóa thô từ Gemini Flash sau khi đọc trang KQKD
 */
export interface ExtractedEarningsRaw {
  ticker: string;
  companyName?: string;
  reportPeriod: EarningsPeriod;
  reportYear: number;
  reportType: EarningsReportType;
  currencyUnit: number; // Hệ số nhân về VNĐ (ví dụ 1, 1000, 1000000, 1000000000)
  currentPeriod: {
    netRevenue: number;
    costOfGoodsSold?: number;
    grossProfit: number;
    netProfitAfterTax: number;
  };
  previousPeriod: {
    netRevenue: number;
    costOfGoodsSold?: number;
    grossProfit: number;
    netProfitAfterTax: number;
  };
  confidenceScore?: number;
  notes?: string;
}

/**
 * Bản ghi hoàn chỉnh đưa vào Bảng "Cập nhật Kết Quả Kinh Doanh Mới Nhất"
 */
export interface EarningsRecord {
  id: string; // ${ticker}_${year}_${period}_${reportType}
  ticker: string;
  companyName: string;
  exchange: ExchangeType;
  year: number;
  period: EarningsPeriod;
  reportType: EarningsReportType;

  // Doanh thu thuần
  revenueCurrent: number;
  revenuePrevious: number;
  revenueYoYPercent: number | null; // Tăng trưởng doanh thu %

  // Lợi nhuận gộp & Biên lãi gộp
  grossProfitCurrent: number;
  grossProfitPrevious: number;
  grossMarginCurrent: number | null; // Biên lãi gộp kỳ này (%)
  grossMarginPrevious: number | null; // Biên lãi gộp cùng kỳ (%)
  grossMarginDelta: number | null; // Thay đổi biên lãi gộp (+/- % point)

  // Lợi nhuận sau thuế
  patCurrent: number;
  patPrevious: number;
  patYoYPercent: number | null; // Tăng trưởng LNST %

  publishedAt: string;
  sourceUrl: string;
  extractedAt: string;
  note?: string;

  // Chỉ số thị trường & Kỹ thuật (tích hợp từ Screener)
  rsRating?: number | null; // Sức mạnh giá tương đối RS (0 - 99)
  adtv20Billion?: number | null; // Giá trị giao dịch bình quân 20 phiên (Tỷ VNĐ)
  currentPrice?: number | null; // Thị giá hiện tại (VNĐ)

  // Liên kết file PDF BCTC gốc
  hasPdf?: boolean;
  pdfPath?: string;
}

/**
 * Bộ lọc dữ liệu bảng KQKD
 */
export interface EarningsFilterParams {
  period?: EarningsPeriod;
  year?: number;
  minRevenueYoY?: number;
  minRevenueAbsolute?: number; // Doanh thu tối thiểu kỳ này (VNĐ, ví dụ 50 tỷ = 50_000_000_000)
  minPatYoY?: number;
  minPatAbsolute?: number; // LNST tối thiểu kỳ này (VNĐ, ví dụ 10 tỷ = 10_000_000_000)
  minAdtv20?: number; // GTGD bình quân 20 phiên tối thiểu (Tỷ VNĐ, ví dụ 5)
  minRs?: number; // Sức mạnh giá RS Rating tối thiểu (ví dụ 70)
  exchange?: ExchangeType;
  search?: string;
  sortBy?: 'publishedAt' | 'patYoYPercent' | 'revenueYoYPercent' | 'ticker' | 'patCurrent' | 'revenueCurrent' | 'adtv20Billion' | 'rsRating';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Trạng thái bộ nhớ lưu trữ KQKD (theo kỳ)
 */
export interface EarningsStoreData {
  activePeriod: string; // Ví dụ: "Q1/2026" hoặc "6T/2026"
  updatedAt: string;
  totalRecords: number;
  records: EarningsRecord[];
}

/**
 * Trạng thái tiến trình quét SSC toàn cục
 */
export interface SscScanProgress {
  isScanning: boolean;
  currentStep: string;
  page: number;
  totalScanned: number;
  foundNewCount: number;
  processedCount: number;
  currentTicker?: string;
  startedAt?: string;
  updatedAt?: string;
  finishedAt?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __SSC_SCAN_PROGRESS__: SscScanProgress | undefined;
}
