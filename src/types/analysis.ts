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
  adtv1MonthBillion?: number;
  rsRating?: number;
  rs1Month?: number;
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

// Tab D: Chất Lượng Tăng Trưởng (60 Điểm - 7 Nhóm A đến G)
export interface SectionD_GrowthQuality {
  totalScore?: number;                       // Điểm số tổng hợp (/60.0)
  rankGrade?: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D'; // Hạng tăng trưởng ValueX
  rankTitle?: string;                        // Tiêu đề xếp hạng (VD: Tăng trưởng bứt phá)
  partA_CurrentGrowth?: string;              // A. Chất lượng tăng trưởng hiện tại (10.0đ)
  partB_VisibilityNext2To4Q?: string;        // B. Độ chắc chắn 2–4 quý tới (16.0đ)
  partC_MarginDurability?: string;           // C. Độ bền biên lợi nhuận (10.0đ)
  partD_GrowthRunway?: string;               // D. Dư địa tăng trưởng (10.0đ)
  partE_GrowthToCash?: string;               // E. Tăng trưởng chuyển thành tiền (6.0đ)
  partF_MediumTermGrowth?: string;           // F. Tăng trưởng trung hạn CAGR 3Y (5.0đ)
  partG_RiskAdjustedSustainability?: string; // G. Bền vững sau điều chỉnh rủi ro (3.0đ)
}

// Tab E: Chất Lượng Doanh Nghiệp (40 Điểm - 7 Nhóm A đến G)
export interface SectionE_BusinessQuality {
  partA_EconomicMoat?: string;               // A. Lợi thế cạnh tranh kinh tế - Moat (8.0đ)
  partB_IndustryPosition?: string;           // B. Vị thế ngành & Thị phần (5.0đ)
  partC_BusinessModel?: string;              // C. Mô hình kinh doanh & Hiệu quả (6.0đ)
  partD_ManagementAndCapitalAllocation?: string; // D. Ban lãnh đạo & Phân bổ vốn (7.0đ)
  partE_CorporateGovernance?: string;        // E. Quản trị công ty & Cổ đông (5.0đ)
  partF_RoicSustenance?: string;             // F. Duy trì ROIC cao & Tái đầu tư (5.0đ)
  partG_ShockResilience?: string;            // G. Khả năng chống chịu & Thích ứng (4.0đ)
}

// Tab F: Triển Vọng Kinh Doanh & Định Giá (Chuyển từ Tab D cũ)
export interface SectionF_Valuation {
  growthDriversRevenueAndCost: string;
  quarterlyForecastReasoning: string;
  valuation: ValuationAssumptions;
  valuationHub?: ValuationHubState;
}

// Tab H: ValueX Valuation Hub (Định Giá Đa Phương Pháp & 3 Kịch Bản)
export type ValuationMethod = 'P_E' | 'EV_EBITDA' | 'P_B' | 'DCF' | 'RNAV' | 'SOTP';
export type ValuationRole = 'MAIN_1' | 'MAIN_2' | 'CROSS_CHECK' | 'DISABLED';

export interface ValuationMethodConfig {
  method: ValuationMethod;
  name: string; // Tên hiển thị (P/E, EV/EBITDA, P/B, DCF, RNAV, SOTP)
  role: ValuationRole;
  weight: number; // 0 - 100 (%)
  targetBear: number;
  targetBase: number;
  targetBull: number;
  fairValueBear: number;
  fairValueBase: number;
  fairValueBull: number;
  narrativeBear?: string;
  narrativeBase?: string;
  narrativeBull?: string;
  // Dành riêng cho DCF
  dcfInputs?: {
    waccBase: number;
    terminalGrowthBase: number;
    sensitivityMatrix?: number[][]; // 3x3 matrix
  };
  // Dành riêng cho EV/EBITDA
  evInputs?: {
    ebitdaForward: number;
    netDebt: number;
    sharesOutstanding: number;
  };
  // Dành riêng cho P/B
  pbInputs?: {
    bvpsForward: number;
    roe: number;
    costOfEquity: number;
  };
}

export interface ValuationScenario {
  name: 'THẬN TRỌNG' | 'CƠ SỞ' | 'TÍCH CỰC';
  fairValue: number;
  updownPct: number;
  probability: number; // 20, 55, 25 ...
  narrative: string;
}

export interface PeerData {
  ticker: string;
  name?: string;
  marketCap?: number;
  pe?: number;
  pb?: number;
  evEbitda?: number;
  rsRating?: number;
}

export interface ValuationQuarterPoint {
  period: string; // VD: Q1/24
  fullPeriod: string; // VD: Q1/2024
  pe: number | null;
  pb: number | null;
  roe?: number | null;
  eps?: number | null;
  bvps?: number | null;
}

export interface ValuationHubState {
  sectorType: string;
  icbCode?: string;
  currentPrice: number;
  sharesOutstanding: number;
  netDebt?: number;
  methods: ValuationMethodConfig[];
  peerStats: PeerData[];
  peerMedians?: {
    pe?: number;
    pb?: number;
    evEbitda?: number;
  };
  historicalStats: {
    peMean?: number;
    peMedian?: number;
    peStd?: number;
    peMinus1Sigma?: number;
    pePlus1Sigma?: number;
    pbMean?: number;
    pbMedian?: number;
    pbStd?: number;
    pbMinus1Sigma?: number;
    pbPlus1Sigma?: number;
    validQuarters: number;
    quarterlySeries?: ValuationQuarterPoint[];
  };
  bear: ValuationScenario;
  base: ValuationScenario;
  bull: ValuationScenario;
  rrRatio: number;
  dispersion: number;
  expectedValue: number;
  opportunityScorecard?: {
    thesisStatus?: 'INTACT' | 'MONITOR' | 'BROKEN';
    manualOverrides?: Record<string, { overrideScore?: number; reason?: string }>;
    scoreA?: number;
    scoreC?: number;
  };
  lastUpdated?: string;
}


// Cầu Nối Dự Phóng KQKD 8 Quý (4 Quý Thực Tế Q-3..Q0 & 4 Quý Dự Phóng Q+1..Q+4)
export interface ForecastQuarterMetrics {
  period: string; // VD: Q1/2025, Q2/2025, ..., Q1/2026F
  isActual?: boolean; // true = số thực tế từ Vietcap IQ API, false = số dự phóng

  // 1. Doanh thu & Cầu nối
  revenue: number; // Doanh thu thuần (tỷ đồng)
  abnormalRevenue?: number; // Khoản bất thường không lặp lại (tỷ đồng)
  normalizedRevenue: number; // Doanh thu chuẩn hóa (tỷ đồng)
  revenueGrowthQoQ?: number; // Tăng trưởng doanh thu QoQ (%)
  impactVolumeCapacity?: number; // Ảnh hưởng Sản lượng / Công suất (%)
  impactAverageSellingPrice?: number; // Ảnh hưởng Giá bán bình quân (%)
  impactMixDemandShare?: number; // Ảnh hưởng Cơ cấu / Thị phần / Nhu cầu (%)
  impactSeasonalityOther?: number; // Ảnh hưởng Mùa vụ / Khác (%)
  revenueBridgeGrowth?: number; // Tăng trưởng theo cầu nối (%)

  // 2. Biên lợi nhuận & Lợi nhuận
  grossMargin: number; // Biên gộp (%)
  grossProfit?: number; // Lợi nhuận gộp (tỷ đồng)
  ebitdaMargin: number; // Biên EBITDA (%)
  ebitda: number; // EBITDA (tỷ đồng)
  netProfit: number; // LNST cốt lõi (tỷ đồng)
  netMargin: number; // Biên LNST cốt lõi (%)

  // 3. Dòng tiền & Cổ phiếu
  cfo: number; // CFO (tỷ đồng)
  cfoToNetProfit?: number; // CFO / LNST cốt lõi (%)
  sharesOutstanding: number; // Số CP pha loãng (triệu cp)
  eps: number; // EPS cốt lõi (đ/cp)
  epsTTM?: number; // EPS TTM (đ/cp)
  bvps?: number; // Giá trị sổ sách / CP (đ/cp)

  // 4. Định giá
  pe?: number; // P/E (lần)
  pb?: number; // P/B (lần)
  evEbitda?: number; // EV/EBITDA (lần)
}

// Mô-đun Phân tích Công suất Mở rộng (phan-tich-cong-suat.md)
export interface CapacityExpansionData {
  hasNewFactory: boolean; // Có nhà máy/dây chuyền mới?
  existingDesignCapacity: number; // Công suất thiết kế hiện hữu (đơn vị/năm)
  existingUtilizationRateQ0: number; // Tỷ lệ sử dụng hiện hữu ở Q0 (%)
  capacityUnit: string; // Đơn vị tính: tấn, MW, TEU, cửa hàng...
  newDesignCapacity: number; // Công suất thiết kế mới (đơn vị/năm)
  commercialOperationQuarter: string; // Quý bắt đầu vận hành (VD: Q1/2026)
  quartersToTargetCapacity: number; // Số quý dự kiến đạt CS mục tiêu
  totalInvestmentCapital?: number; // Tổng vốn đầu tư (tỷ đồng)
  mainFundingSource?: string; // Vốn chủ / Nợ vay / Kết hợp
  progressNote?: string; // Ghi chú tiến độ, pháp lý, thiết bị

  // Quá trình nâng dần công suất 4 quý tới
  rampUpSchedule?: {
    quarter: string; // Q0, Q+1, Q+2, Q+3, Q+4
    existingUtilization: number; // Tỷ lệ sử dụng CS hiện hữu (%)
    existingOutput: number; // Sản lượng từ CS hiện hữu
    technicalOperatingRate: number; // Tỷ lệ vận hành kỹ thuật CS mới (%)
    marketAbsorptionRate: number; // Khả năng thị trường hấp thụ (%)
    actualOperatingRate: number; // Tỷ lệ thực tế tạo sản lượng = min(kỹ thuật, hấp thụ)
    newOutput: number; // Sản lượng từ CS mới
    totalOutput: number; // Tổng sản lượng
    outputGrowthVsQ0: number; // Tăng trưởng tổng sản lượng so với Q0 (%)
  }[];
}

// Bộ xác định nền doanh thu & 6 điều kiện kiểm tra Q0
export interface BaselineDetermination {
  growthScore: number; // Điểm chất lượng tăng trưởng (/60)
  growthTier: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  suggestedMode: 'NÂNG NỀN' | 'PHA TRỘN' | 'THẬN TRỌNG';
  q0NormalizedRevenue: number; // Q0 chuẩn hóa (tỷ đồng)
  avg3QRevenue: number; // TB 3 quý gần nhất (tỷ đồng)
  avg4QRevenue: number; // TB 4 quý (tỷ đồng)
  suggestedBaselineQ1: number; // Nền gợi ý (tỷ đồng)
  manualAdjustmentQ1?: number; // Điều chỉnh thủ công (nếu có)
  finalBaselineQ1: number; // Nền Q+1 sử dụng (tỷ đồng)

  // 6 Điều kiện Nền mới Q0 (true = đạt, false = chưa đạt)
  conditionsCheck: {
    coreOperationDriven: boolean; // 1) Doanh thu/LNST tăng do HĐKD cốt lõi
    orderAndDemandConfirmed: boolean; // 2) Đơn hàng/công suất xác nhận >= 2 quý
    factoryRampUpAligned: boolean; // 3) Vận hành kỹ thuật & hấp thụ phù hợp
    marginNotAnomaly: boolean; // 4) Biên LN không phải đột biến khó lặp lại
    workingCapitalHealthy: boolean; // 5) Vốn lưu động & CFO không xấu bất thường
    notLowBaseDependent: boolean; // 6) Không phụ thuộc nền thấp / bất thường
  };
}

// Bảng Dự phóng 8 Quý toàn diện
export interface SectionForecast8Q {
  baseline: BaselineDetermination;
  capacity: CapacityExpansionData;
  quarters: ForecastQuarterMetrics[]; // 8 quý: Q-3, Q-2, Q-1, Q0, Q+1, Q+2, Q+3, Q+4
  ttmForward: {
    revenue: number;
    ebitda: number;
    netProfit: number;
    eps: number;
    cfo: number;
    revenueGrowthYoY: number;
    netProfitGrowthYoY: number;
  };
  consistencyCheck: {
    growthScoreVsForecast: string;
    isQ0BaselineValid: boolean;
    marginEvaluation: string;
    cfoConversionEvaluation: string;
    finalConclusion: string;
  };
}

// Tab G: Chất Xúc Tác & Tái Định Giá (25 Điểm ValueX)
export interface CatalystItem {
  id: string;
  name: string; // Tên chất xúc tác cụ thể
  type: 'Lợi nhuận' | 'Dự án / Mở rộng' | 'M&A / Sự kiện' | 'Chính sách / Ngành' | 'Cổ tức / Tái cấu trúc';
  expectedTiming: string; // Mốc thời gian kỳ vọng (VD: Q1/2026, 6-12 tháng)
  probability: number; // Xác suất (%)
  impactLevel: 'Rất lớn' | 'Lớn' | 'Vừa' | 'Nhỏ'; // Mức tác động
  pricedInStatus: 'Chưa phản ánh' | 'Phản ánh một phần' | 'Đã phản ánh hết'; // Đã phản ánh vào giá?
  evidenceSource: string; // Bằng chứng / Nguồn (NQ ĐHCĐ, BCTC, CTCK...)
  verificationKPI: string; // KPI xác nhận (sản lượng, COD, giá bán...)
  status: 'on_track' | 'delayed' | 'broken'; // 🟢 Đúng hạn | 🟡 Chậm tiến độ | 🔴 Bị hủy
}

export interface CatalystScorecardData {
  earningsCatalystScore: number; // Chất xúc tác lợi nhuận (tối đa 8.0đ)
  corporateEventScore: number; // Chất xúc tác doanh nghiệp/sự kiện (tối đa 4.0đ)
  certaintyScore: number; // Độ chắc chắn & bằng chứng (tối đa 5.0đ)
  timingScore: number; // Thời điểm 6-12 tháng (tối đa 4.0đ)
  unpricedScore: number; // Mức chưa phản ánh vào giá (tối đa 4.0đ)
  totalScore: number; // Tổng điểm /25.0
  tier: 'Rất mạnh' | 'Khá' | 'Trung bình' | 'Yếu';
}

export interface TimingCriterionData {
  id: string;
  code: string;
  name: string;
  maxScore: number;
  autoScore: number;
  overrideScore?: number;
  finalScore: number;
  grade: 'RẤT TỐT' | 'TỐT' | 'TRUNG BÌNH' | 'YẾU';
  displayValue: string;
  note: string;
  manualReason?: string;
  warning?: string;
}

export interface TimingScorecardData {
  items: TimingCriterionData[];
  totalScore: number; // /10.0
  maxScore: 10.0;
  tier: 'Rất thuận lợi' | 'Khá' | 'Trung bình' | 'Chưa thuận lợi';
  manualOverrides?: Record<string, { overrideScore?: number; reason?: string }>;
  technicalSummary?: {
    trendStatus: 'Tăng mạnh' | 'Tích lũy bứt phá' | 'Đi ngang' | 'Phân phối / Gãy xu hướng';
    priceVsMa20Pct: number;
    priceVsMa50Pct: number;
    volVsVol20Pct: number;
    rsi14?: number;
    rs1Month?: number;
  };
}

export type ThesisStatus = 'INTACT' | 'MONITOR' | 'BROKEN';

export interface PostInvestmentFramework {
  positionTier?: 'THĂM DÒ' | 'CHUẨN' | 'TẬP TRUNG' | 'QUAN SÁT';
  targetWeightPct?: number;
  currentWeightPct?: number;
  buyZone?: string;
  takeProfitZone?: string;
  nextReviewDate?: string;
  kpiTrackingList?: Array<{
    id: string;
    kpiName: string;
    currentValue: string;
    targetValue: string;
    warningThreshold: string;
    status: 'on_track' | 'warning' | 'alert';
    notes?: string;
  }>;
  thesisBreakers?: Array<{
    id: string;
    variableName: string;
    warningThreshold: string;
    probability: number;
    impact: 'Rất lớn' | 'Lớn' | 'Vừa';
    actionIfViolated: string;
    status: 'safe' | 'warning' | 'broken';
  }>;
  preTradeChecklist?: Array<{
    id: string;
    question: string;
    passed: boolean;
    note?: string;
  }>;
}

export interface SectionCatalysts {
  growthDriversAnalysis: string; // Phân tích các yếu tố ảnh hưởng tăng trưởng (Sản lượng, Giá bán, Chi phí)
  catalystList: CatalystItem[]; // Danh sách ma trận theo dõi 6-12 tháng
  scorecard: CatalystScorecardData; // Bảng điểm 25 điểm ValueX
  timingScorecard?: TimingScorecardData; // Bảng điểm 10 điểm Thời Điểm & Điểm Vào
}

// Giữ lại alias SectionD để tương thích ngược nếu cần
export type SectionD = SectionD_GrowthQuality;

export interface AnalysisReport {
  ticker: string;
  companyName: string;
  createdDate: string;
  sectionA: SectionA;
  sectionB: SectionB;
  sectionC: SectionC;
  sectionD: SectionD_GrowthQuality;
  sectionE: SectionE_BusinessQuality;
  sectionForecast8Q?: SectionForecast8Q;
  sectionCatalysts?: SectionCatalysts;
  sectionF: SectionF_Valuation;
  valuationHub?: ValuationHubState;
  marketData: StockMarketData;
  generationModel?: string;
  qualitativeInsights?: import('@/types/qualitative').QualitativeInsights;
  isR2Synchronized?: boolean;
  postInvestmentFramework?: PostInvestmentFramework;
}
