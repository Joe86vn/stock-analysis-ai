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
}

/**
 * Bộ lọc dữ liệu bảng KQKD
 */
export interface EarningsFilterParams {
  period?: EarningsPeriod;
  year?: number;
  minRevenueYoY?: number;
  minPatYoY?: number;
  exchange?: ExchangeType;
  search?: string;
  sortBy?: 'publishedAt' | 'patYoYPercent' | 'revenueYoYPercent' | 'ticker';
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
