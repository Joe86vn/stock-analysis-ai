export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: 'BCTC' | 'BCTN' | 'BROKER_REPORT' | 'NGHI_QUYET_DHCD' | 'OTHER';
  content?: string;
  sourceUrl?: string;
  isAutoFetched?: boolean;
}

export interface AnnualReportItem {
  type: 'BCTN';
  year: number;
  label: string;
  downloadUrl: string;
  source: 'cafef.vn';
  verified: boolean;
}

export interface QuarterlyBCTCItem {
  type: 'BCTC_HN';
  year: number;
  quarter: 1 | 2 | 3 | 4;
  label: string;
  downloadUrl: string;
  source: 'vietstock.vn';
  verified: boolean;
}

export interface AGMResolutionItem {
  type: 'NGHI_QUYET_DHCD';
  year: number;
  label: string;
  downloadUrl: string;
  source: 'vietstock.vn';
  verified: boolean;
}

export interface BrokerReportItem {
  type: 'BROKER_REPORT';
  id: number;
  source: string;
  title: string;
  issueDate: string;
  issueDateTimeAgo?: string;
  recommend: string;
  targetPrice?: number;
  downloadUrl: string;
  fileName: string;
}

export interface ReferenceDocumentCatalogData {
  ticker: string;
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  crawledAt: string;
  cacheExpiresAt: string;
  summary: {
    totalFound: number;
    annualReportsFound: number;
    quarterlyReportsFound: number;
    agmResolutionFound: boolean;
    brokerReportsFound: number;
  };
  documents: {
    annualReports: AnnualReportItem[];
    quarterlyFinancials: QuarterlyBCTCItem[];
    agmResolution: AGMResolutionItem | null;
    brokerReports: BrokerReportItem[];
  };
}

// Broad sector classification used by the flowchart and UI components
export type SectorType =
  | 'manufacturing'    // Sản xuất công nghiệp: thép, xi măng, hoá chất...
  | 'consumer_goods'  // FMCG / Hàng tiêu dùng: sữa, thực phẩm...
  | 'technology'      // CNTT, phần mềm, viễn thông
  | 'retail'          // Bán lẻ, thương mại
  | 'logistics_port'  // Cảng biển, logistics, vận tải
  | 'real_estate'     // Bất động sản, xây dựng
  | 'finance'         // Ngân hàng, chứng khoán, bảo hiểm
  | 'energy'          // Điện, dầu khí, khoáng sản
  | 'general';        // Mặc định / Đa ngành

export interface StockMarketData {
  ticker: string;
  companyName: string;
  industry: string;
  sectorType?: SectorType;
  currentPrice: number;
  sharesOutstanding?: number;
  pe5YearMin: number;
  pe5YearMax: number;
  pe5YearAvg: number;
  peIndustry: number;
  pbIndustry: number;
  peCompetitors: { name: string; pe: number }[];
  pbCompetitors: { name: string; pb: number }[];
}

export interface SectionA {
  historyAndOverview: string;
  shareholdersAndManagement: string;
  subsidiariesAndAffiliates: string;
}

export interface RevenueSegment {
  name: string;   // Tên mảng kinh doanh
  value: number;  // Tỷ trọng % doanh thu
  color?: string; // Màu hiển thị (do component tự gán nếu thiếu)
}

export interface SectionB {
  valueChainInput: string;
  valueChainProduction: string;
  valueChainOutput: string;
  // AI-generated revenue breakdown for the Pie Chart (may be absent for fallback mock)
  revenueBreakdown?: RevenueSegment[];
}

export interface SectionC {
  // 6 Phân mục Sức khỏe Tài chính Chuẩn ValueX (50 Điểm)
  partA_LiquidityAndDebt?: string;             // A. Thanh khoản & trả nợ (8.0đ)
  partB_CashFlowAndEarnings?: string;          // B. Dòng tiền & chuyển đổi lợi nhuận (10.0đ)
  partC_ProfitabilityAndROIC?: string;         // C. Sinh lời & hiệu quả vốn (10.0đ)
  partD_WorkingCapitalAndAssetQuality?: string;// D. Vốn lưu động & chất lượng tài sản (7.0đ)
  partE_CapitalStructureAndFunding?: string;   // E. Cơ cấu vốn & khả năng tài trợ (7.0đ)
  partF_EarningsQualityAndAccounting?: string; // F. Chất lượng lợi nhuận & kế toán (8.0đ)

  // Backward compatibility fields
  revenueHistory3Years?: string;
  profitabilityMargins?: string;
  financialHealthAndDebt?: string;
}

export interface ForecastQuarterData {
  revenue: number;      // Tỷ VNĐ
  grossMargin: number;  // %
  netProfit: number;    // Tỷ VNĐ
  isActual?: boolean;   // Đánh dấu số thực tế từ Vietcap IQ API
}

export interface ValuationAssumptions {
  year1?: number; // e.g. 2026 or 2027
  year2?: number; // e.g. 2027 or 2028
  forecastYear1Data?: {
    q1?: ForecastQuarterData;
    q2?: ForecastQuarterData;
    q3?: ForecastQuarterData;
    q4?: ForecastQuarterData;
  };
  forecastYear2Data?: {
    q1?: ForecastQuarterData;
    q2?: ForecastQuarterData;
    q3?: ForecastQuarterData;
    q4?: ForecastQuarterData;
  };
  forecast2026?: {
    q1?: ForecastQuarterData;
    q2?: ForecastQuarterData;
    q3?: ForecastQuarterData;
    q4?: ForecastQuarterData;
  };
  forecast2027?: {
    q1?: ForecastQuarterData;
    q2?: ForecastQuarterData;
    q3?: ForecastQuarterData;
    q4?: ForecastQuarterData;
  };
  forecastNetProfitQ1: number;
  forecastNetProfitQ2: number;
  forecastNetProfitQ3: number;
  forecastNetProfitQ4: number;
  totalForecastProfit: number;
  sharesOutstanding: number; // Triệu cổ phiếu
  epsForward: number;
  peBase: number;
  peBull: number;
  peBear: number;
}

export interface ValuationResults {
  targetPriceBase: number;
  targetPriceBull: number;
  targetPriceBear: number;
  upsideBasePct: number;
  upsideBullPct: number;
  upsideBearPct: number;
}

export interface SectionD {
  growthDriversRevenueAndCost: string;
  quarterlyForecastReasoning: string;
  valuation: ValuationAssumptions;
}

export interface AnalysisReport {
  ticker: string;
  companyName: string;
  createdDate: string;
  sectionA: SectionA;
  sectionB: SectionB;
  sectionC: SectionC;
  sectionD: SectionD;
  marketData: StockMarketData;
  generationModel?: string;
}
