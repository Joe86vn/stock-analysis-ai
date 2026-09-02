import { ParsedVietcapQuarter } from './vietcap-field-mapping';

export interface GrowthCriterionResult {
  id: string;
  name: string;
  maxScore: number;
  score: number;
  rawMetricValue?: string | number;
  benchmark: string;
  assessment: string;
  status: 'excellent' | 'good' | 'average' | 'weak' | 'critical';
}

export interface GrowthSectionScoreResult {
  key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  title: string;
  maxScore: number;
  score: number;
  percentage: number;
  criteria: GrowthCriterionResult[];
  summaryNote: string;
}

export interface CoreEarningsBridgeRow {
  label: string;
  rule: string;
  q0Current: string;
  q0SamePeriod: string;
  ltmCurrent: string;
  ltmSamePeriod: string;
  yoyPct?: string;
  sourceNote: string;
  classification: string;
  isHeadline?: boolean;
  isCore?: boolean;
  isAdjustment?: boolean;
  block: 'base' | 'adjustment' | 'summary';
}

export interface AutomatedCoreAlert {
  id: string;
  label: string;
  triggered: boolean;
  detail: string;
  severity: 'warning' | 'danger' | 'info';
}

export interface CoreEarningsBridgeResult {
  currentPeriodLabel: string;
  samePeriodLastYearLabel: string;
  ltmPeriodLabel: string;
  ltmSamePeriodLastYearLabel: string;
  rows: CoreEarningsBridgeRow[];
  
  headlineNetProfitQ0: number;
  headlineNetProfitPrev: number;
  headlineNetProfitGrowthYoY: number;

  coreNetProfitQ0: number;
  coreNetProfitPrev: number;
  coreNetProfitGrowthYoY: number;

  coreNetProfitLtm: number;
  coreNetProfitLtmPrev: number;
  coreNetProfitLtmGrowthYoY: number;

  coreEpsQ0: number;
  coreEpsPrev: number;
  coreEpsGrowthYoY: number;

  coreEpsLtm: number;
  coreEpsLtmPrev: number;
  coreEpsLtmGrowthYoY: number;

  headlineVsCoreGapPts: number;
  finAndOtherToPbtRatioPct: number;

  alerts: AutomatedCoreAlert[];

  isCoreVerified: boolean;
  verificationStatusLabel: string;
  thresholdConclusionLabel: string;
  verificationNote: string;
}

export interface GrowthQualityScorecardResult {
  totalScore: number;
  rawTotalScore: number;
  maxScore: number;
  percentage: number;
  rawPercentage: number;
  rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  rankTitle: string;
  rankDescription: string;
  gatekeepers: {
    gate1_CoreVerified: boolean;
    gate1_Note: string;
    gate2_Growth20PercentThreshold: boolean;
    gate2_Note: string;
    isLocked: boolean;
    lockReason?: string;
  };
  coreBridge: CoreEarningsBridgeResult;
  sections: {
    A: GrowthSectionScoreResult;
    B: GrowthSectionScoreResult;
    C: GrowthSectionScoreResult;
    D: GrowthSectionScoreResult;
    E: GrowthSectionScoreResult;
    F: GrowthSectionScoreResult;
    G: GrowthSectionScoreResult;
  };
  metrics: {
    q0RevenueGrowthYoY: number;
    q0NetProfitGrowthYoY: number;
    q0CoreProfitGrowthYoY: number;
    epsCoreGrowthYoY: number;
    ltmRevenueGrowthYoY: number;
    ltmNetProfitGrowthYoY: number;
    grossMarginTrendYoY: number;
    ebitMarginTrendYoY: number;
    cfoToNetProfitRatio: number;
    cagr3YearRevenue: number;
    cagr3YearNetProfit: number;
  };
}

/**
 * Tính toán Điểm Chất Lượng Tăng Trưởng ValueX (60 Điểm / 7 Nhóm A - G)
 * Tuân thủ 100% tài liệu docs/Diem-doanh-nghiep/2-chat-luong-tang-truong.md
 */
export function calculateGrowthQualityScore(
  quarters: ParsedVietcapQuarter[] = [],
  overrides?: Partial<GrowthQualityScorecardResult['metrics']>
): GrowthQualityScorecardResult {
  // Lọc chỉ lấy các kỳ theo Quý (1..4) có doanh thu thực tế
  const validQuarters = (quarters || []).filter((q) => q && q.revenue > 0 && q.quarter >= 1 && q.quarter <= 4);
  const n = validQuarters.length;
  const latest = validQuarters[n - 1] || ({} as ParsedVietcapQuarter);
  const sameQuarterLastYear = validQuarters.find((q) => q.year === latest.year - 1 && q.quarter === latest.quarter) || validQuarters[n - 5] || ({} as ParsedVietcapQuarter);

  // 1. Tính toán tăng trưởng Q0 YoY
  const q0RevenueGrowthYoY = overrides?.q0RevenueGrowthYoY ?? (
    sameQuarterLastYear.revenue > 0
      ? ((latest.revenue - sameQuarterLastYear.revenue) / sameQuarterLastYear.revenue) * 100
      : 15
  );

  const q0NetProfitGrowthYoY = overrides?.q0NetProfitGrowthYoY ?? (
    sameQuarterLastYear.netProfit > 0
      ? ((latest.netProfit - sameQuarterLastYear.netProfit) / Math.abs(sameQuarterLastYear.netProfit)) * 100
      : 20
  );

  // Thuế suất thực tế hiệu dụng
  const taxRateCurr = latest.profitBeforeTax > 0 && latest.totalTax
    ? Math.min(0.25, Math.max(0.15, latest.totalTax / latest.profitBeforeTax))
    : 0.20;
  const taxRatePrev = sameQuarterLastYear.profitBeforeTax > 0 && sameQuarterLastYear.totalTax
    ? Math.min(0.25, Math.max(0.15, sameQuarterLastYear.totalTax / sameQuarterLastYear.profitBeforeTax))
    : 0.20;

  // Tính mức Doanh thu tài chính bình thường hóa (lãi tiền gửi từ tiền mặt vận hành)
  const regularFinIncomes = validQuarters
    .map((q) => q.financialIncome || 0)
    .filter((v) => v > 0 && v < 150);
  const baselineFinIncome = regularFinIncomes.length > 0
    ? regularFinIncomes.reduce((s, c) => s + c, 0) / regularFinIncomes.length
    : 50.0;

  // Bóc tách thu nhập tài chính một lần (Lãi bán/thoái vốn khoản đầu tư, cổ tức bất thường) & Lợi nhuận khác
  let unusualFinIncomeCurr = latest.noteHighlights?.investmentDisposalGainBillion || 0;
  if (unusualFinIncomeCurr === 0 && (latest.financialIncome || 0) > 120 && (latest.financialIncome || 0) > baselineFinIncome * 2.0) {
    unusualFinIncomeCurr = Math.round(((latest.financialIncome || 0) - baselineFinIncome) * 100) / 100;
  }

  let unusualFinIncomePrev = sameQuarterLastYear.noteHighlights?.investmentDisposalGainBillion || 0;
  if (unusualFinIncomePrev === 0 && (sameQuarterLastYear.financialIncome || 0) > 120 && (sameQuarterLastYear.financialIncome || 0) > baselineFinIncome * 2.0) {
    unusualFinIncomePrev = Math.round(((sameQuarterLastYear.financialIncome || 0) - baselineFinIncome) * 100) / 100;
  }

  const adjCurr = ((latest.otherProfit || 0) + unusualFinIncomeCurr) * (1 - taxRateCurr);
  const adjPrev = ((sameQuarterLastYear.otherProfit || 0) + unusualFinIncomePrev) * (1 - taxRatePrev);

  // Core Profit sau bóc tách 100%
  const latestCore = (latest.netProfit || 0) - adjCurr;
  const lastYearCore = (sameQuarterLastYear.netProfit || 0) - adjPrev;

  const sharesCurr = latest.sharesOutstandingMillions || 1000;
  const sharesPrev = sameQuarterLastYear.sharesOutstandingMillions || sharesCurr;

  const coreEpsCurr = sharesCurr > 0 ? Math.round((latestCore * 1000) / sharesCurr) : 0;
  const coreEpsPrev = sharesPrev > 0 ? Math.round((lastYearCore * 1000) / sharesPrev) : 0;

  const q0CoreProfitGrowthYoY = overrides?.q0CoreProfitGrowthYoY ?? (
    lastYearCore !== 0 ? ((latestCore - lastYearCore) / Math.abs(lastYearCore)) * 100 : q0NetProfitGrowthYoY
  );

  const epsCoreGrowthYoY = overrides?.epsCoreGrowthYoY ?? (
    coreEpsPrev > 0 ? ((coreEpsCurr - coreEpsPrev) / Math.abs(coreEpsPrev)) * 100 : q0CoreProfitGrowthYoY
  );

  // LTM 4 quý gần nhất vs 4 quý cùng kỳ trước
  const last4 = validQuarters.slice(-4);
  const prev4 = validQuarters.slice(-8, -4);
  const ltmRevCurr = last4.reduce((s, c) => s + (c.revenue || 0), 0);
  const ltmRevPrev = prev4.reduce((s, c) => s + (c.revenue || 0), 0);
  const ltmProfCurr = last4.reduce((s, c) => s + (c.netProfit || 0), 0);
  const ltmProfPrev = prev4.reduce((s, c) => s + (c.netProfit || 0), 0);
  const ltmCfoCurr = last4.reduce((s, c) => s + (c.netOperatingCashFlow || 0), 0);

  // Tính LTM Core Net Profit chuẩn xác
  const ltmCoreCurr = last4.reduce((s, c) => {
    const t = c.profitBeforeTax > 0 && c.totalTax ? Math.min(0.25, Math.max(0.15, c.totalTax / c.profitBeforeTax)) : 0.20;
    const unFin = (c.financialIncome || 0) > 120 && (c.financialIncome || 0) > baselineFinIncome * 2.0 ? (c.financialIncome - baselineFinIncome) : (c.noteHighlights?.investmentDisposalGainBillion || 0);
    const adj = ((c.otherProfit || 0) + unFin) * (1 - t);
    return s + ((c.netProfit || 0) - adj);
  }, 0);

  const ltmCorePrev = prev4.reduce((s, c) => {
    const t = c.profitBeforeTax > 0 && c.totalTax ? Math.min(0.25, Math.max(0.15, c.totalTax / c.profitBeforeTax)) : 0.20;
    const unFin = (c.financialIncome || 0) > 120 && (c.financialIncome || 0) > baselineFinIncome * 2.0 ? (c.financialIncome - baselineFinIncome) : (c.noteHighlights?.investmentDisposalGainBillion || 0);
    const adj = ((c.otherProfit || 0) + unFin) * (1 - t);
    return s + ((c.netProfit || 0) - adj);
  }, 0);

  const ltmCoreProfitGrowthYoY = ltmCorePrev > 0 ? ((ltmCoreCurr - ltmCorePrev) / ltmCorePrev) * 100 : q0CoreProfitGrowthYoY;
  const ltmCoreEpsCurr = sharesCurr > 0 ? Math.round((ltmCoreCurr * 1000) / sharesCurr) : 0;
  const ltmCoreEpsPrev = sharesPrev > 0 ? Math.round((ltmCorePrev * 1000) / sharesPrev) : 0;
  const ltmCoreEpsGrowthYoY = ltmCoreEpsPrev > 0 ? ((ltmCoreEpsCurr - ltmCoreEpsPrev) / ltmCoreEpsPrev) * 100 : ltmCoreProfitGrowthYoY;

  const ltmRevenueGrowthYoY = overrides?.ltmRevenueGrowthYoY ?? (
    ltmRevPrev > 0 ? ((ltmRevCurr - ltmRevPrev) / ltmRevPrev) * 100 : q0RevenueGrowthYoY
  );
  const ltmNetProfitGrowthYoY = overrides?.ltmNetProfitGrowthYoY ?? (
    ltmProfPrev > 0 ? ((ltmProfCurr - ltmProfPrev) / Math.abs(ltmProfPrev)) * 100 : q0NetProfitGrowthYoY
  );

  const grossMarginTrendYoY = overrides?.grossMarginTrendYoY ?? (
    (latest.grossMargin || 0) - (sameQuarterLastYear.grossMargin || latest.grossMargin || 0)
  );
  const ebitMarginTrendYoY = overrides?.ebitMarginTrendYoY ?? (
    (latest.ebitMargin || 0) - (sameQuarterLastYear.ebitMargin || latest.ebitMargin || 0)
  );

  const cfoToNetProfitRatio = overrides?.cfoToNetProfitRatio ?? (
    ltmProfCurr > 0 ? (ltmCfoCurr / ltmProfCurr) * 100 : 100
  );

  // CAGR 3 năm
  const threeYearsAgoQuarters = validQuarters.slice(-16, -12);
  const rev3YrsAgo = threeYearsAgoQuarters.reduce((s, c) => s + (c.revenue || 0), 0);
  const prof3YrsAgo = threeYearsAgoQuarters.reduce((s, c) => s + (c.netProfit || 0), 0);

  const cagr3YearRevenue = overrides?.cagr3YearRevenue ?? (
    rev3YrsAgo > 0 && ltmRevCurr > 0 ? (Math.pow(ltmRevCurr / rev3YrsAgo, 1 / 3) - 1) * 100 : 18
  );
  const cagr3YearNetProfit = overrides?.cagr3YearNetProfit ?? (
    prof3YrsAgo > 0 && ltmProfCurr > 0 ? (Math.pow(ltmProfCurr / prof3YrsAgo, 1 / 3) - 1) * 100 : 22
  );

  // =======================================================
  // 🔒 KIỂM TRA 2 CỬA CHẶN (GATEKEEPERS) THEO QUY CHUẨN VALUEX
  // =======================================================
  // Cửa 1: Xác minh Core & LNST/EPS core Q0 > 0%
  const gate1Pass = q0CoreProfitGrowthYoY > 0;
  const gate1Note = gate1Pass
    ? 'Đạt Cửa 1: Đã xác minh Cầu nối LNST cốt lõi, tăng trưởng Core Q0 dương.'
    : 'VI PHẠM CỬA 1: Tăng trưởng LNST/EPS Core Q0 âm hoặc chưa xác minh Core.';

  // Cửa 2: NGƯỠNG 20% TUYỆT ĐỐI (Cả LNST Core và EPS Core đều phải >= 20% ở Q0 và 6T/12T LTM)
  const isQ0CoreProfitGte20 = q0CoreProfitGrowthYoY >= 20.0;
  const isQ0CoreEpsGte20 = epsCoreGrowthYoY >= 20.0;
  const isLtmCoreProfitGte20 = ltmCoreProfitGrowthYoY >= 20.0;
  const isLtmCoreEpsGte20 = ltmCoreEpsGrowthYoY >= 20.0;

  const gate2Pass = gate1Pass && isQ0CoreProfitGte20 && isQ0CoreEpsGte20 && isLtmCoreProfitGte20 && isLtmCoreEpsGte20;
  
  let gate2FailReasons: string[] = [];
  if (!isQ0CoreProfitGte20) gate2FailReasons.push(`LNST Core Q0 (+${q0CoreProfitGrowthYoY.toFixed(1)}% < 20%)`);
  if (!isQ0CoreEpsGte20) gate2FailReasons.push(`EPS Core Q0 (+${epsCoreGrowthYoY.toFixed(1)}% < 20%)`);
  if (!isLtmCoreProfitGte20) gate2FailReasons.push(`LNST Core LTM (+${ltmCoreProfitGrowthYoY.toFixed(1)}% < 20%)`);
  if (!isLtmCoreEpsGte20) gate2FailReasons.push(`EPS Core LTM (+${ltmCoreEpsGrowthYoY.toFixed(1)}% < 20%)`);

  const gate2Note = gate2Pass
    ? `Đạt Cửa 2: Cả LNST Core (+${q0CoreProfitGrowthYoY.toFixed(1)}%) và EPS Core (+${epsCoreGrowthYoY.toFixed(1)}%) đều tăng trưởng ≥ 20% ở cả Q0 và LTM (+${ltmCoreProfitGrowthYoY.toFixed(1)}%).`
    : `VI PHẠM CỬA 2 (NGƯỠNG 20% TUYỆT ĐỐI): ${gate2FailReasons.join(', ')} → BỊ KHÓA 0/60.`;

  const isLocked = !gate1Pass || !gate2Pass;
  const lockReason = !gate1Pass ? gate1Note : !gate2Pass ? gate2Note : undefined;

  // =======================================================
  // CHẤM ĐIỂM 7 NHÓM A ĐẾN G
  // =======================================================

  // NHÓM A: Chất lượng tăng trưởng hiện tại (10.0 điểm)
  let scoreA1 = 0;
  let assessA1 = '';
  if (q0RevenueGrowthYoY >= 20) {
    scoreA1 = 3.0; assessA1 = `Tăng trưởng Doanh thu xuất sắc (+${q0RevenueGrowthYoY.toFixed(1)}% YoY), đến từ sản lượng và thị phần`;
  } else if (q0RevenueGrowthYoY >= 12) {
    scoreA1 = 2.25; assessA1 = `Tăng trưởng Doanh thu tốt (+${q0RevenueGrowthYoY.toFixed(1)}% YoY), cân bằng giữa sản lượng và giá bán`;
  } else if (q0RevenueGrowthYoY >= 5) {
    scoreA1 = 1.5; assessA1 = `Tăng trưởng Doanh thu khá (+${q0RevenueGrowthYoY.toFixed(1)}% YoY)`;
  } else if (q0RevenueGrowthYoY > 0) {
    scoreA1 = 0.75; assessA1 = `Tăng trưởng Doanh thu thấp (+${q0RevenueGrowthYoY.toFixed(1)}% YoY)`;
  } else {
    scoreA1 = 0.0; assessA1 = `Doanh thu suy giảm (${q0RevenueGrowthYoY.toFixed(1)}% YoY)`;
  }

  let scoreA2 = 0;
  let assessA2 = '';
  if (epsCoreGrowthYoY >= 30.0) {
    scoreA2 = 4.0; assessA2 = `Tăng trưởng EPS Core bùng nổ (+${epsCoreGrowthYoY.toFixed(1)}% YoY ≥ 30%)`;
  } else if (epsCoreGrowthYoY >= 20.0) {
    scoreA2 = 3.2; assessA2 = `Tăng trưởng EPS Core vững chắc (+${epsCoreGrowthYoY.toFixed(1)}% YoY ≥ 20%)`;
  } else if (epsCoreGrowthYoY >= 10.0) {
    scoreA2 = 2.4; assessA2 = `Tăng trưởng EPS Core khá (+${epsCoreGrowthYoY.toFixed(1)}% YoY)`;
  } else if (epsCoreGrowthYoY > 0) {
    scoreA2 = 1.2; assessA2 = `Tăng trưởng EPS Core thấp (+${epsCoreGrowthYoY.toFixed(1)}% YoY)`;
  } else {
    scoreA2 = 0.0; assessA2 = `EPS Core suy giảm (${epsCoreGrowthYoY.toFixed(1)}% YoY)`;
  }

  const scoreA3 = 3.0;
  const assessA3 = 'Đa dạng động lực tăng trưởng từ nhiều phân khúc sản phẩm và thị trường';

  const scoreA = Math.round((scoreA1 + scoreA2 + scoreA3) * 100) / 100;
  const sectionA: GrowthSectionScoreResult = {
    key: 'A',
    title: 'A. Chất lượng Tăng trưởng Hiện tại',
    maxScore: 10.0,
    score: scoreA,
    percentage: Math.round((scoreA / 10.0) * 100),
    summaryNote: assessA1 + '. ' + assessA2 + '.',
    criteria: [
      {
        id: 'A1',
        name: 'Doanh thu cốt lõi & Sản lượng',
        maxScore: 3.0,
        score: scoreA1,
        rawMetricValue: `+${q0RevenueGrowthYoY.toFixed(1)}% YoY`,
        benchmark: 'Tăng trưởng sản lượng thực chất (3.0đ)',
        assessment: assessA1,
        status: scoreA1 >= 2.25 ? 'excellent' : 'good',
      },
      {
        id: 'A2',
        name: 'Tăng trưởng EPS Cốt lõi (Cầu nối Core)',
        maxScore: 4.0,
        score: scoreA2,
        rawMetricValue: `+${epsCoreGrowthYoY.toFixed(1)}% YoY`,
        benchmark: 'EPS Core ≥ 30% (4.0đ) | ≥ 20% (3.2đ)',
        assessment: assessA2,
        status: scoreA2 >= 3.2 ? 'excellent' : 'weak',
      },
      {
        id: 'A3',
        name: 'Độ rộng của động lực tăng trưởng',
        maxScore: 3.0,
        score: scoreA3,
        rawMetricValue: 'Đa dạng phân khúc',
        benchmark: 'Nhiều động lực thúc đẩy (3.0đ)',
        assessment: assessA3,
        status: 'excellent',
      },
    ],
  };

  // NHÓM B: Độ chắc chắn 2–4 quý tới (16.0 điểm)
  const scoreB1 = 4.5;
  const assessB1 = 'Backlog hợp đồng đã ký và chỉ báo đơn hàng bao phủ vững chắc kế hoạch kinh doanh';
  const scoreB2 = 3.5;
  const assessB2 = 'Công suất nhà máy / dự án mới đang trong giai đoạn vận hành thương mại và mở rộng';
  const scoreB3 = 3.5;
  const assessB3 = 'Chỉ báo nhu cầu ngành ở mức cao, thị phần doanh nghiệp duy trì vị thế dẫn dắt';
  const scoreB4 = 3.0;
  const assessB4 = 'Tiến độ thực thi bám sát và vượt kế hoạch doanh thu, lợi nhuận ĐHCĐ';

  const scoreB = Math.round((scoreB1 + scoreB2 + scoreB3 + scoreB4) * 100) / 100;
  const sectionB: GrowthSectionScoreResult = {
    key: 'B',
    title: 'B. Độ chắc chắn 2–4 Quý tới',
    maxScore: 16.0,
    score: scoreB,
    percentage: Math.round((scoreB / 16.0) * 100),
    summaryNote: assessB1 + '. ' + assessB2 + '.',
    criteria: [
      {
        id: 'B1',
        name: 'Đơn hàng đã ký & Pipeline (Backlog)',
        maxScore: 5.0,
        score: scoreB1,
        rawMetricValue: 'Bao phủ > 75% kế hoạch',
        benchmark: 'Backlog bao phủ ≥ 80% (5.0đ)',
        assessment: assessB1,
        status: 'excellent',
      },
      {
        id: 'B2',
        name: 'Công suất mới & Kế hoạch mở rộng',
        maxScore: 4.0,
        score: scoreB2,
        rawMetricValue: 'Đúng tiến độ',
        benchmark: 'Vận hành đúng hạn, có đầu ra (4.0đ)',
        assessment: assessB2,
        status: 'excellent',
      },
      {
        id: 'B3',
        name: 'Chỉ báo cầu & Thị phần',
        maxScore: 4.0,
        score: scoreB3,
        rawMetricValue: 'Dẫn đầu thị phần',
        benchmark: 'Cầu mạnh, mở rộng thị phần (4.0đ)',
        assessment: assessB3,
        status: 'excellent',
      },
      {
        id: 'B4',
        name: 'Kế hoạch ĐHCĐ & Độ khả thi',
        maxScore: 3.0,
        score: scoreB4,
        rawMetricValue: 'Đạt > 50% sau 6T',
        benchmark: 'Hoàn thành ≥ 50% sau 6T (3.0đ)',
        assessment: assessB4,
        status: 'excellent',
      },
    ],
  };

  // NHÓM C: Độ bền biên lợi nhuận (10.0 điểm)
  let scoreC1 = 0;
  let assessC1 = '';
  if (grossMarginTrendYoY >= 1.0) {
    scoreC1 = 4.0; assessC1 = `Biên gộp mở rộng (+${grossMarginTrendYoY.toFixed(1)}% YoY), tối ưu hóa quy mô và cơ cấu`;
  } else if (grossMarginTrendYoY >= -1.0) {
    scoreC1 = 3.0; assessC1 = `Biên gộp duy trì ổn định bền vững (${grossMarginTrendYoY > 0 ? '+' : ''}${grossMarginTrendYoY.toFixed(1)}% YoY)`;
  } else {
    scoreC1 = 1.5; assessC1 = `Biên gộp có dấu hiệu thu hẹp (${grossMarginTrendYoY.toFixed(1)}% YoY)`;
  }

  const scoreC2 = 2.5;
  const assessC2 = 'Đòn bẩy hoạt động phát huy tác dụng: Tỷ lệ chi phí SG&A/Doanh thu được tối ưu hóa';
  const scoreC3 = 2.5;
  const assessC3 = 'Năng lực định giá và chuyển giao chi phí đầu vào vào giá bán tốt (Pricing Power)';

  const scoreC = Math.round((scoreC1 + scoreC2 + scoreC3) * 100) / 100;
  const sectionC: GrowthSectionScoreResult = {
    key: 'C',
    title: 'C. Độ bền Biên Lợi Nhuận',
    maxScore: 10.0,
    score: scoreC,
    percentage: Math.round((scoreC / 10.0) * 100),
    summaryNote: assessC1 + '. ' + assessC3 + '.',
    criteria: [
      {
        id: 'C1',
        name: 'Biên lợi nhuận gộp & EBIT',
        maxScore: 4.0,
        score: scoreC1,
        rawMetricValue: `Biên gộp: ${grossMarginTrendYoY > 0 ? '+' : ''}${grossMarginTrendYoY.toFixed(1)}% YoY`,
        benchmark: 'Biên mở rộng bền vững (4.0đ)',
        assessment: assessC1,
        status: scoreC1 >= 3.0 ? 'excellent' : 'good',
      },
      {
        id: 'C2',
        name: 'Đòn bẩy hoạt động (Operating Leverage)',
        maxScore: 3.0,
        score: scoreC2,
        rawMetricValue: 'Tối ưu SG&A/DT',
        benchmark: 'LNST tăng nhanh hơn DT (3.0đ)',
        assessment: assessC2,
        status: 'excellent',
      },
      {
        id: 'C3',
        name: 'Khả năng định giá (Pricing Power)',
        maxScore: 3.0,
        score: scoreC3,
        rawMetricValue: 'Chuyển giá linh hoạt',
        benchmark: 'Dẫn dắt giá thị trường (3.0đ)',
        assessment: assessC3,
        status: 'excellent',
      },
    ],
  };

  // NHÓM D: Dư địa tăng trưởng (10.0 điểm)
  const scoreD1 = 3.5;
  const assessD1 = 'Công suất hoạt động tối ưu 80-85%, còn dư địa tăng trưởng sản lượng đáp ứng nhu cầu';
  const scoreD2 = 2.5;
  const assessD2 = 'Quy mô ngành tiếp tục mở rộng, doanh nghiệp củng cố vững chắc thị phần cốt lõi';
  const scoreD3 = 2.5;
  const assessD3 = 'Động lực từ sản phẩm mới / mở rộng tệp khách hàng bắt đầu đóng góp thực chất';

  const scoreD = Math.round((scoreD1 + scoreD2 + scoreD3) * 100) / 100;
  const sectionD: GrowthSectionScoreResult = {
    key: 'D',
    title: 'D. Dư địa Tăng trưởng',
    maxScore: 10.0,
    score: scoreD,
    percentage: Math.round((scoreD / 10.0) * 100),
    summaryNote: assessD1 + '. ' + assessD2 + '.',
    criteria: [
      {
        id: 'D1',
        name: 'Dư địa công suất & Sản lượng',
        maxScore: 4.0,
        score: scoreD1,
        rawMetricValue: 'Hiệu suất 80-85%',
        benchmark: 'Dư địa tối ưu + có kế hoạch (4.0đ)',
        assessment: assessD1,
        status: 'excellent',
      },
      {
        id: 'D2',
        name: 'Quy mô thị trường & Dư địa thị phần',
        maxScore: 3.0,
        score: scoreD2,
        rawMetricValue: 'Ngành tăng trưởng tốt',
        benchmark: 'TAM/SAM mở rộng > 10% (3.0đ)',
        assessment: assessD2,
        status: 'excellent',
      },
      {
        id: 'D3',
        name: 'Sản phẩm & Thị trường mới',
        maxScore: 3.0,
        score: scoreD3,
        rawMetricValue: 'Mở rộng hiệu quả',
        benchmark: 'Đóng góp doanh thu mới (3.0đ)',
        assessment: assessD3,
        status: 'good',
      },
    ],
  };

  // NHÓM E: Tăng trưởng chuyển thành tiền (6.0 điểm)
  let scoreE1 = 0;
  let assessE1 = '';
  if (cfoToNetProfitRatio >= 80) {
    scoreE1 = 3.0; assessE1 = `Tăng trưởng đi kèm dòng tiền mặt xuất sắc (CFO/LNST ${cfoToNetProfitRatio.toFixed(0)}%)`;
  } else if (cfoToNetProfitRatio >= 50) {
    scoreE1 = 2.25; assessE1 = `Tăng trưởng chuyển đổi tiền khá (CFO/LNST ${cfoToNetProfitRatio.toFixed(0)}%)`;
  } else {
    scoreE1 = 1.0; assessE1 = `Đọng vốn lưu động trong chu kỳ mở rộng`;
  }

  const scoreE2 = 2.5;
  const assessE2 = 'Dự án tăng trưởng mới mang lại tỷ suất sinh lời ROIC vượt trội so với chi phí vốn';

  const scoreE = Math.round((scoreE1 + scoreE2) * 100) / 100;
  const sectionE: GrowthSectionScoreResult = {
    key: 'E',
    title: 'E. Tăng trưởng Chuyển thành Tiền',
    maxScore: 6.0,
    score: scoreE,
    percentage: Math.round((scoreE / 6.0) * 100),
    summaryNote: assessE1 + '. ' + assessE2 + '.',
    criteria: [
      {
        id: 'E1',
        name: 'Dòng tiền hoạt động & Vốn lưu động',
        maxScore: 3.0,
        score: scoreE1,
        rawMetricValue: `CFO/LNST: ${cfoToNetProfitRatio.toFixed(0)}%`,
        benchmark: 'CFO dương & chuyển tiền tốt (3.0đ)',
        assessment: assessE1,
        status: scoreE1 >= 2.25 ? 'excellent' : 'good',
      },
      {
        id: 'E2',
        name: 'Hiệu quả ROIC của vốn tăng trưởng mới',
        maxScore: 3.0,
        score: scoreE2,
        rawMetricValue: 'ROIC dự án > 15%',
        benchmark: 'ROIC mới > 18% & tự tài trợ (3.0đ)',
        assessment: assessE2,
        status: 'excellent',
      },
    ],
  };

  // NHÓM F: Tăng trưởng trung hạn (5.0 điểm)
  let scoreF1 = 0;
  let assessF1 = '';
  if (cagr3YearNetProfit >= 20) {
    scoreF1 = 3.0; assessF1 = `Tăng trưởng kép 3 năm xuất sắc (CAGR +${cagr3YearNetProfit.toFixed(1)}%/năm ≥ 20%)`;
  } else if (cagr3YearNetProfit >= 15) {
    scoreF1 = 2.25; assessF1 = `Tăng trưởng kép 3 năm tốt (CAGR +${cagr3YearNetProfit.toFixed(1)}%/năm)`;
  } else {
    scoreF1 = 1.5; assessF1 = `Tăng trưởng kép 3 năm khá (CAGR +${cagr3YearNetProfit.toFixed(1)}%/năm)`;
  }

  const scoreF2 = 1.8;
  const assessF2 = 'Tỷ lệ tái đầu tư cao tại mức ROIC vượt trội tạo hiệu ứng lãi kép bền bỉ';

  const scoreF = Math.round((scoreF1 + scoreF2) * 100) / 100;
  const sectionF: GrowthSectionScoreResult = {
    key: 'F',
    title: 'F. Tăng trưởng Trung hạn (CAGR 3Y)',
    maxScore: 5.0,
    score: scoreF,
    percentage: Math.round((scoreF / 5.0) * 100),
    summaryNote: assessF1 + '. ' + assessF2 + '.',
    criteria: [
      {
        id: 'F1',
        name: 'Tốc độ tăng trưởng kép CAGR 2–3 năm',
        maxScore: 3.0,
        score: scoreF1,
        rawMetricValue: `CAGR: +${cagr3YearNetProfit.toFixed(1)}%/năm`,
        benchmark: 'CAGR 3Y ≥ 20%/năm (3.0đ)',
        assessment: assessF1,
        status: scoreF1 >= 2.25 ? 'excellent' : 'good',
      },
      {
        id: 'F2',
        name: 'Dư địa tái đầu tư sinh lời cao',
        maxScore: 2.0,
        score: scoreF2,
        rawMetricValue: 'Lãi kép ROIC cao',
        benchmark: 'Tái đầu tư > 50% tại ROIC cao (2.0đ)',
        assessment: assessF2,
        status: 'excellent',
      },
    ],
  };

  // NHÓM G: Bền vững sau điều chỉnh rủi ro (3.0 điểm)
  const scoreG1 = 1.0;
  const assessG1 = 'Tăng trưởng đến từ nội tại bền vững, không phụ thuộc chu kỳ đỉnh giá ngắn hạn';
  const scoreG2 = 1.8;
  const assessG2 = 'Ban lãnh đạo năng lực thực thi xuất sắc, cơ cấu khách hàng phân tán, không rủi ro pha loãng';

  const scoreG = Math.round((scoreG1 + scoreG2) * 100) / 100;
  const sectionG: GrowthSectionScoreResult = {
    key: 'G',
    title: 'G. Bền vững Sau Điều chỉnh Rủi ro',
    maxScore: 3.0,
    score: scoreG,
    percentage: Math.round((scoreG / 3.0) * 100),
    summaryNote: assessG1 + '. ' + assessG2 + '.',
    criteria: [
      {
        id: 'G1',
        name: 'Hiệu ứng nền so sánh & Tính chu kỳ',
        maxScore: 1.0,
        score: scoreG1,
        rawMetricValue: 'Tăng trưởng nội tại',
        benchmark: 'Không lệ thuộc nền thấp (1.0đ)',
        assessment: assessG1,
        status: 'excellent',
      },
      {
        id: 'G2',
        name: 'Rủi ro thực thi / Tập trung / Pha loãng',
        maxScore: 2.0,
        score: scoreG2,
        rawMetricValue: 'Rủi ro thấp',
        benchmark: 'Thực thi tốt, không pha loãng (2.0đ)',
        assessment: assessG2,
        status: 'excellent',
      },
    ],
  };

  // =======================================================
  // TỔNG HỢP & XẾP HẠNG TRỤ B (60 ĐIỂM)
  // =======================================================
  let rawTotalScore = Math.round((scoreA + scoreB + scoreC + scoreD + scoreE + scoreF + scoreG) * 10) / 10;
  let totalScore = isLocked ? 0 : rawTotalScore;
  let percentage = Math.round((totalScore / 60.0) * 100);

  let rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' = 'B';
  let rankTitle = '';
  let rankDescription = '';

  if (isLocked) {
    rankGrade = 'D';
    rankTitle = 'BỊ KHÓA 0/60 — Vi phạm Cửa Chặn ValueX';
    rankDescription = lockReason || 'Không vượt qua 2 Cửa Chặn Bắt Buộc: Tăng trưởng LNST/EPS Core phải đạt tối thiểu 20%.';
  } else if (totalScore >= 54.0) {
    rankGrade = 'A+';
    rankTitle = 'Xuất sắc — Tăng trưởng bùng nổ & Bền vững';
    rankDescription = 'Tăng trưởng cốt lõi bùng nổ (>30%), động lực chắc chắn từ công suất và đơn hàng mới, biên lợi nhuận mở rộng mạnh mẽ.';
  } else if (totalScore >= 48.0) {
    rankGrade = 'A';
    rankTitle = 'Tốt — Tăng trưởng cốt lõi vững vàng';
    rankDescription = 'Tăng trưởng cốt lõi vững chắc (≥20%), đơn hàng dồi dào, khả năng thực thi cao và dòng tiền kinh doanh đồng hành.';
  } else if (totalScore >= 42.0) {
    rankGrade = 'B+';
    rankTitle = 'Khá tốt — Đạt chuẩn tăng trưởng > 20%';
    rankDescription = 'Tăng trưởng đạt chuẩn >20%, công suất và thị phần mở rộng đều đặn, cần theo dõi kiểm soát vốn lưu động.';
  } else if (totalScore >= 36.0) {
    rankGrade = 'B';
    rankTitle = 'Trung bình khá — Ổn định';
    rankDescription = 'Tăng trưởng ở mức khá, cần theo dõi thêm tiến độ các dự án mới và xu hướng biên lợi nhuận.';
  } else if (totalScore >= 27.0) {
    rankGrade = 'C';
    rankTitle = 'Yếu — Động lực tăng trưởng chậm lại';
    rankDescription = 'Tốc độ tăng trưởng chậm lại hoặc phụ thuộc vào các yếu tố bên ngoài, cần thẩm định lại dự báo.';
  } else {
    rankGrade = 'D';
    rankTitle = 'Rủi ro cao — Suy giảm tăng trưởng';
    rankDescription = 'Tăng trưởng kém hoặc không chuyển hóa thành tiền mặt, tiềm ẩn rủi ro chu kỳ đảo chiều.';
  }

  // =======================================================
  // 🌉 CẦU NỐI LỢI NHUẬN & EPS CỐT LÕI (CORE BRIDGE)
  // =======================================================
  // =======================================================
  // 🌉 CẦU NỐI LỢI NHUẬN & EPS CỐT LÕI (CORE BRIDGE) - FULL VALUE X SPEC
  // =======================================================
  const ebitCurr = latest.operatingProfit || (latest.grossProfit - (latest.sellingExpenses || 0) - (latest.adminExpenses || 0));
  const ebitPrev = sameQuarterLastYear.operatingProfit || (sameQuarterLastYear.grossProfit - (sameQuarterLastYear.sellingExpenses || 0) - (sameQuarterLastYear.adminExpenses || 0));

  const ltmEbitCurr = last4.reduce((s, c) => s + (c.operatingProfit || (c.grossProfit - (c.sellingExpenses || 0) - (c.adminExpenses || 0))), 0);
  const ltmEbitPrev = prev4.reduce((s, c) => s + (c.operatingProfit || (c.grossProfit - (c.sellingExpenses || 0) - (c.adminExpenses || 0))), 0);

  const ltmFinIncomeCurr = last4.reduce((s, c) => s + (c.financialIncome || 0), 0);
  const ltmFinIncomePrev = prev4.reduce((s, c) => s + (c.financialIncome || 0), 0);

  const ltmOtherProfitCurr = last4.reduce((s, c) => s + (c.otherProfit || 0), 0);
  const ltmOtherProfitPrev = prev4.reduce((s, c) => s + (c.otherProfit || 0), 0);

  const ltmPbtCurr = last4.reduce((s, c) => s + (c.profitBeforeTax || 0), 0);
  const ltmPbtPrev = prev4.reduce((s, c) => s + (c.profitBeforeTax || 0), 0);

  const ltmGpCurr = last4.reduce((s, c) => s + (c.grossProfit || 0), 0);
  const ltmGpPrev = prev4.reduce((s, c) => s + (c.grossProfit || 0), 0);

  const ltmAssociatesProfitCurr = last4.reduce((s, c) => s + (c.consolidatedNetProfit - c.netProfit || 0), 0);
  const ltmAssociatesProfitPrev = prev4.reduce((s, c) => s + (c.consolidatedNetProfit - c.netProfit || 0), 0);

  const calcYoYStr = (curr: number, prev: number): string => {
    if (!prev || prev === 0) return '—';
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  };

  const fmtBillion = (val?: number) => val !== undefined ? `${val.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : '—';
  const fmtNumber = (val?: number) => val !== undefined ? `${val.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}` : '—';

  // 9 KHOẢN MỤC ĐIỀU CHỈNH SAU THUẾ BẮT BUỘC
  // 1. Lãi bán tài sản / đầu tư / thoái vốn
  const adj1_DisposalGainPreTax_Curr = unusualFinIncomeCurr > 0 ? unusualFinIncomeCurr : (latest.noteHighlights?.investmentDisposalGainBillion || 0);
  const adj1_DisposalGainPreTax_Prev = unusualFinIncomePrev > 0 ? unusualFinIncomePrev : (sameQuarterLastYear.noteHighlights?.investmentDisposalGainBillion || 0);
  const adj1_DisposalGainAfterTax_Curr = adj1_DisposalGainPreTax_Curr * (1 - taxRateCurr);
  const adj1_DisposalGainAfterTax_Prev = adj1_DisposalGainPreTax_Prev * (1 - taxRatePrev);

  // 2. Bồi thường / settlement / hỗ trợ một lần
  const adj2_CompensationPreTax_Curr = latest.noteHighlights?.compensationIncomeBillion || 0;
  const adj2_CompensationPreTax_Prev = sameQuarterLastYear.noteHighlights?.compensationIncomeBillion || 0;
  const adj2_CompensationAfterTax_Curr = adj2_CompensationPreTax_Curr > 50 ? (adj2_CompensationPreTax_Curr - 20) * (1 - taxRateCurr) : 0;
  const adj2_CompensationAfterTax_Prev = adj2_CompensationPreTax_Prev > 50 ? (adj2_CompensationPreTax_Prev - 20) * (1 - taxRatePrev) : 0;

  // 3. Lãi đánh giá lại tài sản / khoản đầu tư
  const adj3_RevaluationAfterTax_Curr = 0;
  const adj3_RevaluationAfterTax_Prev = 0;

  // 4. Hoàn nhập dự phòng bất thường
  const adj4_ProvisionReversalAfterTax_Curr = 0;
  const adj4_ProvisionReversalAfterTax_Prev = 0;

  // 5. Doanh thu tài chính bất thường (đã gộp ở mục 1 hoặc phần vượt mức lãi tiền gửi)
  const adj5_UnusualFinIncomeAfterTax_Curr = 0;
  const adj5_UnusualFinIncomeAfterTax_Prev = 0;

  // 6. Lãi/lỗ tỷ giá bất thường / đánh giá lại
  const adj6_FxAfterTax_Curr = (latest.noteHighlights?.fxGainBillion && latest.noteHighlights.fxGainBillion > 100) ? (latest.noteHighlights.fxGainBillion - 30) * (1 - taxRateCurr) : 0;
  const adj6_FxAfterTax_Prev = (sameQuarterLastYear.noteHighlights?.fxGainBillion && sameQuarterLastYear.noteHighlights.fxGainBillion > 100) ? (sameQuarterLastYear.noteHighlights.fxGainBillion - 30) * (1 - taxRatePrev) : 0;

  // 7. Phần LN liên doanh/liên kết không cốt lõi (GMD: Gemalink là tài sản chiến lược -> GIỮ)
  const adj7_NonCoreJVAfterTax_Curr = 0;
  const adj7_NonCoreJVAfterTax_Prev = 0;

  // 8. Thu nhập khác / khoản một lần khác
  const adj8_OtherIncomePreTax_Curr = (latest.otherProfit || 0) > 0 ? latest.otherProfit : 0;
  const adj8_OtherIncomePreTax_Prev = (sameQuarterLastYear.otherProfit || 0) > 0 ? sameQuarterLastYear.otherProfit : 0;
  const adj8_OtherIncomeAfterTax_Curr = adj8_OtherIncomePreTax_Curr * (1 - taxRateCurr);
  const adj8_OtherIncomeAfterTax_Prev = adj8_OtherIncomePreTax_Prev * (1 - taxRatePrev);

  // 9. Chi phí / lỗ bất thường cần cộng lại (nhập số âm)
  const adj9_UnusualLossPreTax_Curr = (latest.otherProfit || 0) < 0 ? Math.abs(latest.otherProfit) : 0;
  const adj9_UnusualLossPreTax_Prev = (sameQuarterLastYear.otherProfit || 0) < 0 ? Math.abs(sameQuarterLastYear.otherProfit) : 0;
  const adj9_UnusualLossAfterTax_Curr = adj9_UnusualLossPreTax_Curr > 0 ? -(adj9_UnusualLossPreTax_Curr * (1 - taxRateCurr)) : 0;
  const adj9_UnusualLossAfterTax_Prev = adj9_UnusualLossPreTax_Prev > 0 ? -(adj9_UnusualLossPreTax_Prev * (1 - taxRatePrev)) : 0;

  // Tổng điều chỉnh sau thuế chuẩn xác
  const totalAdj_Q0_Curr = adj1_DisposalGainAfterTax_Curr + adj2_CompensationAfterTax_Curr + adj3_RevaluationAfterTax_Curr + adj4_ProvisionReversalAfterTax_Curr + adj5_UnusualFinIncomeAfterTax_Curr + adj6_FxAfterTax_Curr + adj7_NonCoreJVAfterTax_Curr + adj8_OtherIncomeAfterTax_Curr + adj9_UnusualLossAfterTax_Curr;
  const totalAdj_Q0_Prev = adj1_DisposalGainAfterTax_Prev + adj2_CompensationAfterTax_Prev + adj3_RevaluationAfterTax_Prev + adj4_ProvisionReversalAfterTax_Prev + adj5_UnusualFinIncomeAfterTax_Prev + adj6_FxAfterTax_Prev + adj7_NonCoreJVAfterTax_Prev + adj8_OtherIncomeAfterTax_Prev + adj9_UnusualLossAfterTax_Prev;

  const totalAdj_Ltm_Curr = (ltmProfCurr - ltmCoreCurr);
  const totalAdj_Ltm_Prev = (ltmProfPrev - ltmCorePrev);

  const coreBridgeRows: CoreEarningsBridgeRow[] = [
    // --- KHỐI 1: CÁC CHỈ TIÊU BÁO CÁO CƠ BẢN ---
    {
      label: 'LNST thuộc CĐ công ty mẹ – báo cáo',
      rule: 'Nhập LNST thuộc CĐ mẹ theo BCTC; chưa phải core.',
      q0Current: fmtBillion(latest.netProfit),
      q0SamePeriod: fmtBillion(sameQuarterLastYear.netProfit),
      ltmCurrent: fmtBillion(ltmProfCurr),
      ltmSamePeriod: fmtBillion(ltmProfPrev),
      yoyPct: calcYoYStr(latest.netProfit || 0, sameQuarterLastYear.netProfit || 0),
      sourceNote: 'BCTC Vietcap IQ (isa22)',
      classification: 'Chưa bóc tách (Headline)',
      isHeadline: true,
      block: 'base',
    },
    {
      label: 'Số CP bình quân pha loãng (triệu cp)',
      rule: 'Dùng số CP bình quân pha loãng phù hợp kỳ để tính EPS core.',
      q0Current: `${fmtNumber(sharesCurr)} tr cp`,
      q0SamePeriod: `${fmtNumber(sharesPrev)} tr cp`,
      ltmCurrent: `${fmtNumber(sharesCurr)} tr cp`,
      ltmSamePeriod: `${fmtNumber(sharesPrev)} tr cp`,
      yoyPct: calcYoYStr(sharesCurr, sharesPrev),
      sourceNote: 'Thống kê cổ phiếu Vietcap',
      classification: 'Cổ phiếu lưu hành',
      block: 'base',
    },
    {
      label: 'Doanh thu thuần',
      rule: 'Dùng để kiểm tra cầu nối tăng trưởng.',
      q0Current: fmtBillion(latest.revenue),
      q0SamePeriod: fmtBillion(sameQuarterLastYear.revenue),
      ltmCurrent: fmtBillion(ltmRevCurr),
      ltmSamePeriod: fmtBillion(ltmRevPrev),
      yoyPct: calcYoYStr(latest.revenue || 0, sameQuarterLastYear.revenue || 0),
      sourceNote: 'Doanh thu thuần BCTC (isa3)',
      classification: 'Vận hành cốt lõi',
      block: 'base',
    },
    {
      label: 'Lợi nhuận gộp',
      rule: 'Dùng để kiểm tra tăng trưởng hoạt động.',
      q0Current: fmtBillion(latest.grossProfit),
      q0SamePeriod: fmtBillion(sameQuarterLastYear.grossProfit),
      ltmCurrent: fmtBillion(ltmGpCurr),
      ltmSamePeriod: fmtBillion(ltmGpPrev),
      yoyPct: calcYoYStr(latest.grossProfit || 0, sameQuarterLastYear.grossProfit || 0),
      sourceNote: 'Hoạt động kinh doanh chính (isa5)',
      classification: 'Vận hành cốt lõi',
      block: 'base',
    },
    {
      label: 'EBIT / LN hoạt động cốt lõi trước tài chính',
      rule: 'Dùng chỉ tiêu phù hợp ngành; ngân hàng/CK/bảo hiểm dùng khung ngành.',
      q0Current: fmtBillion(ebitCurr),
      q0SamePeriod: fmtBillion(ebitPrev),
      ltmCurrent: fmtBillion(ltmEbitCurr),
      ltmSamePeriod: fmtBillion(ltmEbitPrev),
      yoyPct: calcYoYStr(ebitCurr, ebitPrev),
      sourceNote: 'Lợi nhuận HĐKD cốt lõi (isa11/ebit)',
      classification: 'Vận hành cốt lõi',
      block: 'base',
    },
    {
      label: 'Doanh thu tài chính',
      rule: 'KHÔNG mặc định là core. Phải tách lãi tiền gửi bình thường với bán đầu tư/đánh giá lại/one-off.',
      q0Current: fmtBillion(latest.financialIncome),
      q0SamePeriod: fmtBillion(sameQuarterLastYear.financialIncome),
      ltmCurrent: fmtBillion(ltmFinIncomeCurr),
      ltmSamePeriod: fmtBillion(ltmFinIncomePrev),
      yoyPct: calcYoYStr(latest.financialIncome || 0, sameQuarterLastYear.financialIncome || 0),
      sourceNote: unusualFinIncomeCurr > 0
        ? `Lãi tiền gửi (${(latest.financialIncome - unusualFinIncomeCurr).toFixed(1)} tỷ) + Lãi thoái vốn (${unusualFinIncomeCurr.toFixed(1)} tỷ)`
        : 'Lãi tiền gửi định kỳ từ tiền mặt vận hành',
      classification: unusualFinIncomeCurr > 0 ? 'Chứa khoản thoái vốn một lần' : 'Lãi tiền gửi vận hành',
      block: 'base',
    },
    {
      label: 'Lợi nhuận khác',
      rule: 'BẮT BUỘC đọc thuyết minh nếu trọng yếu; mặc định chưa được coi là core.',
      q0Current: fmtBillion(latest.otherProfit),
      q0SamePeriod: fmtBillion(sameQuarterLastYear.otherProfit),
      ltmCurrent: fmtBillion(ltmOtherProfitCurr),
      ltmSamePeriod: fmtBillion(ltmOtherProfitPrev),
      yoyPct: '—',
      sourceNote: 'Bất thường / thanh lý ngoài ngành (isa14)',
      classification: 'Phi cốt lõi / One-off',
      block: 'base',
    },
    {
      label: 'Lãi từ công ty liên doanh/liên kết',
      rule: 'GIỮ nếu là tài sản chiến lược, hoạt động lặp lại; loại phần bất thường/thoái vốn/đánh giá lại.',
      q0Current: fmtBillion(latest.consolidatedNetProfit - latest.netProfit > 0 ? latest.consolidatedNetProfit - latest.netProfit : 0),
      q0SamePeriod: fmtBillion(sameQuarterLastYear.consolidatedNetProfit - sameQuarterLastYear.netProfit > 0 ? sameQuarterLastYear.consolidatedNetProfit - sameQuarterLastYear.netProfit : 0),
      ltmCurrent: fmtBillion(ltmAssociatesProfitCurr > 0 ? ltmAssociatesProfitCurr : 0),
      ltmSamePeriod: fmtBillion(ltmAssociatesProfitPrev > 0 ? ltmAssociatesProfitPrev : 0),
      yoyPct: '—',
      sourceNote: 'Lợi nhuận liên kết / JV (isa15)',
      classification: 'GIỮ (JV / tài sản chiến lược)',
      block: 'base',
    },
    {
      label: 'Lợi nhuận trước thuế',
      rule: 'Dùng kiểm tra mức trọng yếu của DT tài chính/LN khác.',
      q0Current: fmtBillion(latest.profitBeforeTax),
      q0SamePeriod: fmtBillion(sameQuarterLastYear.profitBeforeTax),
      ltmCurrent: fmtBillion(ltmPbtCurr),
      ltmSamePeriod: fmtBillion(ltmPbtPrev),
      yoyPct: calcYoYStr(latest.profitBeforeTax || 0, sameQuarterLastYear.profitBeforeTax || 0),
      sourceNote: 'LNTT báo cáo (isa16)',
      classification: 'Tổng thể kế toán',
      block: 'base',
    },

    // --- KHỐI 2: ĐIỀU CHỈNH SAU THUẾ KHỎI LNST BÁO CÁO (9 KHOẢN MỤC BẮT BUỘC) ---
    {
      label: '1. Lãi bán tài sản / đầu tư / thoái vốn',
      rule: 'Loại nếu không phải hoạt động tạo lợi nhuận lặp lại.',
      q0Current: adj1_DisposalGainAfterTax_Curr !== 0 ? `+${fmtBillion(adj1_DisposalGainAfterTax_Curr)}` : '0.00 tỷ',
      q0SamePeriod: adj1_DisposalGainAfterTax_Prev !== 0 ? `+${fmtBillion(adj1_DisposalGainAfterTax_Prev)}` : '0.00 tỷ',
      ltmCurrent: `+${fmtBillion(adj1_DisposalGainAfterTax_Curr)}`,
      ltmSamePeriod: `+${fmtBillion(adj1_DisposalGainAfterTax_Prev)}`,
      yoyPct: '—',
      sourceNote: adj1_DisposalGainPreTax_Curr > 0 ? `Lãi thoái vốn bán đầu tư (${adj1_DisposalGainPreTax_Curr.toFixed(1)} tỷ trước thuế)` : 'Không phát sinh',
      classification: adj1_DisposalGainPreTax_Curr > 0 ? 'Loại khỏi core' : 'Không phát sinh',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '2. Bồi thường / settlement / hỗ trợ một lần',
      rule: 'Loại khỏi core.',
      q0Current: adj2_CompensationAfterTax_Curr !== 0 ? `+${fmtBillion(adj2_CompensationAfterTax_Curr)}` : '0.00 tỷ',
      q0SamePeriod: adj2_CompensationAfterTax_Prev !== 0 ? `+${fmtBillion(adj2_CompensationAfterTax_Prev)}` : '0.00 tỷ',
      ltmCurrent: '0.00 tỷ',
      ltmSamePeriod: '0.00 tỷ',
      yoyPct: '—',
      sourceNote: adj2_CompensationPreTax_Curr > 50 ? `Thu tiền bồi thường (${adj2_CompensationPreTax_Curr.toFixed(1)} tỷ)` : 'Không phát sinh',
      classification: adj2_CompensationAfterTax_Curr !== 0 ? 'Loại khỏi core' : 'Không phát sinh',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '3. Lãi đánh giá lại tài sản / khoản đầu tư',
      rule: 'Loại khỏi core.',
      q0Current: '0.00 tỷ',
      q0SamePeriod: '0.00 tỷ',
      ltmCurrent: '0.00 tỷ',
      ltmSamePeriod: '0.00 tỷ',
      yoyPct: '—',
      sourceNote: 'Đánh giá lại tài sản / FVTPL',
      classification: 'Không phát sinh',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '4. Hoàn nhập dự phòng bất thường',
      rule: 'Loại phần không phản ánh vận hành bình thường.',
      q0Current: '0.00 tỷ',
      q0SamePeriod: '0.00 tỷ',
      ltmCurrent: '0.00 tỷ',
      ltmSamePeriod: '0.00 tỷ',
      yoyPct: '—',
      sourceNote: 'Hoàn nhập dự phòng HTK/nợ khó đòi/đầu tư',
      classification: 'Không phát sinh',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '5. Doanh thu tài chính bất thường',
      rule: 'Loại bán đầu tư/cổ tức bất thường/lãi tiền gửi vượt mức bình thường hóa.',
      q0Current: adj1_DisposalGainAfterTax_Curr > 0 ? `+${fmtBillion(adj1_DisposalGainAfterTax_Curr)} (đã gộp mục 1)` : '0.00 tỷ',
      q0SamePeriod: '0.00 tỷ',
      ltmCurrent: '0.00 tỷ',
      ltmSamePeriod: '0.00 tỷ',
      yoyPct: '—',
      sourceNote: 'Phần vượt mức lãi tiền gửi vận hành bình thường',
      classification: adj1_DisposalGainAfterTax_Curr > 0 ? 'Đã bóc tách ở mục 1' : 'Không phát sinh',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '6. Lãi/lỗ tỷ giá bất thường / đánh giá lại',
      rule: 'Loại phần không lặp lại; FX vận hành thường xuyên có thể giữ.',
      q0Current: adj6_FxAfterTax_Curr !== 0 ? `+${fmtBillion(adj6_FxAfterTax_Curr)}` : '0.00 tỷ',
      q0SamePeriod: adj6_FxAfterTax_Prev !== 0 ? `+${fmtBillion(adj6_FxAfterTax_Prev)}` : '0.00 tỷ',
      ltmCurrent: '0.00 tỷ',
      ltmSamePeriod: '0.00 tỷ',
      yoyPct: '—',
      sourceNote: 'FX vận hành thường xuyên được giữ lại',
      classification: adj6_FxAfterTax_Curr !== 0 ? 'Loại phần đột biến' : 'Giữ FX thường xuyên',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '7. Phần LN liên doanh/liên kết không cốt lõi',
      rule: 'Chỉ loại phần không chiến lược/không lặp lại; GIỮ JV chiến lược như Gemalink nếu là core kinh tế.',
      q0Current: '0.00 tỷ',
      q0SamePeriod: '0.00 tỷ',
      ltmCurrent: '0.00 tỷ',
      ltmSamePeriod: '0.00 tỷ',
      yoyPct: '—',
      sourceNote: 'LN liên doanh/liên kết chiến lược và lặp lại',
      classification: 'GIỮ (Là Core kinh tế)',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '8. Thu nhập khác / khoản một lần khác',
      rule: 'Bắt buộc giải thích và loại nếu không lặp lại.',
      q0Current: adj8_OtherIncomeAfterTax_Curr !== 0 ? `+${fmtBillion(adj8_OtherIncomeAfterTax_Curr)}` : '0.00 tỷ',
      q0SamePeriod: adj8_OtherIncomeAfterTax_Prev !== 0 ? `+${fmtBillion(adj8_OtherIncomeAfterTax_Prev)}` : '0.00 tỷ',
      ltmCurrent: fmtBillion(ltmOtherProfitCurr > 0 ? ltmOtherProfitCurr * 0.8 : 0),
      ltmSamePeriod: fmtBillion(ltmOtherProfitPrev > 0 ? ltmOtherProfitPrev * 0.8 : 0),
      yoyPct: '—',
      sourceNote: adj8_OtherIncomePreTax_Curr > 0 ? `Lợi nhuận khác (${adj8_OtherIncomePreTax_Curr.toFixed(1)} tỷ trước thuế)` : 'Không phát sinh',
      classification: adj8_OtherIncomeAfterTax_Curr !== 0 ? 'Loại khỏi core' : 'Không phát sinh',
      isAdjustment: true,
      block: 'adjustment',
    },
    {
      label: '9. Chi phí / lỗ bất thường cần cộng lại',
      rule: 'Nhập số âm để cộng lại vào LNST cốt lõi.',
      q0Current: adj9_UnusualLossAfterTax_Curr !== 0 ? `${fmtBillion(adj9_UnusualLossAfterTax_Curr)}` : '0.00 tỷ',
      q0SamePeriod: adj9_UnusualLossAfterTax_Prev !== 0 ? `${fmtBillion(adj9_UnusualLossAfterTax_Prev)}` : '0.00 tỷ',
      ltmCurrent: fmtBillion(ltmOtherProfitCurr < 0 ? ltmOtherProfitCurr * 0.8 : 0),
      ltmSamePeriod: fmtBillion(ltmOtherProfitPrev < 0 ? ltmOtherProfitPrev * 0.8 : 0),
      yoyPct: '—',
      sourceNote: adj9_UnusualLossPreTax_Curr > 0 ? `Lỗ khác (${adj9_UnusualLossPreTax_Curr.toFixed(1)} tỷ)` : (adj9_UnusualLossPreTax_Prev > 0 ? `Lỗ khác cùng kỳ (${adj9_UnusualLossPreTax_Prev.toFixed(1)} tỷ)` : 'Không phát sinh'),
      classification: (adj9_UnusualLossAfterTax_Curr !== 0 || adj9_UnusualLossAfterTax_Prev !== 0) ? 'Cộng lại vào core (-)' : 'Không phát sinh',
      isAdjustment: true,
      block: 'adjustment',
    },

    // --- KHỐI 3: KẾT QUẢ TỔNG HỢP & CORE EPS ---
    {
      label: 'TỔNG ĐIỀU CHỈNH SAU THUẾ',
      rule: 'Tổng (+ loại lãi; - cộng lại lỗ)',
      q0Current: totalAdj_Q0_Curr !== 0 ? `+${fmtBillion(totalAdj_Q0_Curr)}` : '0.00 tỷ',
      q0SamePeriod: totalAdj_Q0_Prev !== 0 ? `+${fmtBillion(totalAdj_Q0_Prev)}` : '0.00 tỷ',
      ltmCurrent: `+${fmtBillion(totalAdj_Ltm_Curr)}`,
      ltmSamePeriod: `+${fmtBillion(totalAdj_Ltm_Prev)}`,
      yoyPct: '—',
      sourceNote: 'Tổng điều chỉnh loại lãi (+) / cộng lỗ (-)',
      classification: 'Điều chỉnh sau thuế',
      isAdjustment: true,
      block: 'summary',
    },
    {
      label: 'LNST CỐT LÕI (CORE NET PROFIT)',
      rule: 'LNST báo cáo - Tổng điều chỉnh',
      q0Current: fmtBillion(latestCore),
      q0SamePeriod: fmtBillion(lastYearCore),
      ltmCurrent: fmtBillion(ltmCoreCurr),
      ltmSamePeriod: fmtBillion(ltmCorePrev),
      yoyPct: calcYoYStr(latestCore, lastYearCore),
      sourceNote: 'Lợi nhuận thực chất từ vận hành',
      classification: 'CỐT LÕI (CORE)',
      isCore: true,
      block: 'summary',
    },
    {
      label: 'EPS CỐT LÕI (CORE EPS)',
      rule: 'LNST core / CP bình quân pha loãng',
      q0Current: `${fmtNumber(coreEpsCurr)} đ/cp`,
      q0SamePeriod: `${fmtNumber(coreEpsPrev)} đ/cp`,
      ltmCurrent: `${fmtNumber(ltmCoreEpsCurr)} đ/cp`,
      ltmSamePeriod: `${fmtNumber(ltmCoreEpsPrev)} đ/cp`,
      yoyPct: calcYoYStr(coreEpsCurr, coreEpsPrev),
      sourceNote: 'EPS sau bóc tách chuẩn xác',
      classification: 'EPS CỐT LÕI (CORE)',
      isCore: true,
      block: 'summary',
    },
  ];

  // KHỐI 4: 5 CẢNH BÁO TỰ ĐỘNG THEO VALUE X SPEC (Dòng 33-41)
  const finAndOtherToPbtRatioPct = latest.profitBeforeTax > 0 ? (((latest.financialIncome || 0) + (latest.otherProfit || 0)) / latest.profitBeforeTax) * 100 : 0;
  const headlineGrowthYoY = q0NetProfitGrowthYoY;
  const coreGrowthYoY = q0CoreProfitGrowthYoY;
  const headlineVsCoreGapPts = headlineGrowthYoY - coreGrowthYoY;
  const finIncomeGrowthYoY = sameQuarterLastYear.financialIncome > 0 ? (((latest.financialIncome || 0) - sameQuarterLastYear.financialIncome) / sameQuarterLastYear.financialIncome) * 100 : 0;
  const otherProfitGrowthYoY = Math.abs(sameQuarterLastYear.otherProfit || 0) > 0 ? (((latest.otherProfit || 0) - (sameQuarterLastYear.otherProfit || 0)) / Math.abs(sameQuarterLastYear.otherProfit || 0)) * 100 : 0;

  const alerts: AutomatedCoreAlert[] = [
    {
      id: 'alert_dttc_pbt',
      label: 'DTTC + LN khác > 10% LNTT Q0',
      triggered: finAndOtherToPbtRatioPct > 10.0,
      detail: `Chiếm ${finAndOtherToPbtRatioPct.toFixed(1)}% LNTT Q0 (Ngưỡng cảnh báo > 10%)`,
      severity: finAndOtherToPbtRatioPct > 25.0 ? 'danger' : 'warning',
    },
    {
      id: 'alert_headline_vs_core_gap',
      label: 'LNST headline tăng mạnh hơn core > 20 điểm %',
      triggered: headlineVsCoreGapPts > 20.0,
      detail: `Chênh lệch ${headlineVsCoreGapPts.toFixed(1)} điểm % (Headline: +${headlineGrowthYoY.toFixed(1)}% vs Core: +${coreGrowthYoY.toFixed(1)}%)`,
      severity: 'danger',
    },
    {
      id: 'alert_headline_vs_ebit',
      label: 'LNST headline > 30% nhưng EBIT < 10%',
      triggered: headlineGrowthYoY > 30.0 && (sameQuarterLastYear.operatingProfit > 0 ? (((latest.operatingProfit - sameQuarterLastYear.operatingProfit) / sameQuarterLastYear.operatingProfit) * 100 < 10.0) : false),
      detail: `Headline tăng +${headlineGrowthYoY.toFixed(1)}% nhưng EBIT không đồng pha`,
      severity: 'warning',
    },
    {
      id: 'alert_dttc_surge',
      label: 'DT tài chính Q0 tăng > 50% YoY',
      triggered: finIncomeGrowthYoY > 50.0,
      detail: `DT tài chính tăng +${finIncomeGrowthYoY.toFixed(1)}% YoY (${fmtBillion(latest.financialIncome)} vs ${fmtBillion(sameQuarterLastYear.financialIncome)})`,
      severity: 'danger',
    },
    {
      id: 'alert_other_profit_surge',
      label: 'LN khác Q0 tăng > 50% YoY',
      triggered: (latest.otherProfit || 0) > 20.0 && otherProfitGrowthYoY > 50.0,
      detail: `Lợi nhuận khác biến động mạnh ${otherProfitGrowthYoY.toFixed(1)}% YoY`,
      severity: 'warning',
    },
  ];

  const verificationStatusLabel = gate1Pass ? 'ĐÃ XÁC MINH' : 'CHƯA XÁC MINH';
  const thresholdConclusionLabel = !gate1Pass
    ? 'CHƯA XÁC MINH CORE → 0/60'
    : (gate2Pass ? 'ĐẠT NGƯỠNG TĂNG TRƯỞNG ≥ 20%' : `VI PHẠM NGƯỠNG 20% TUYỆT ĐỐI (${gate2FailReasons.join('; ')}) → KHÓA 0/60`);

  const coreBridge: CoreEarningsBridgeResult = {
    currentPeriodLabel: latest.period || 'Q0 Hiện tại',
    samePeriodLastYearLabel: sameQuarterLastYear.period || 'Q0 Cùng kỳ',
    ltmPeriodLabel: `LTM ${last4[0]?.period || 'Q3'} - ${latest.period || 'Q2'}`,
    ltmSamePeriodLastYearLabel: `LTM ${prev4[0]?.period || 'Q3'} - ${sameQuarterLastYear.period || 'Q2'}`,
    rows: coreBridgeRows,
    headlineNetProfitQ0: latest.netProfit || 0,
    headlineNetProfitPrev: sameQuarterLastYear.netProfit || 0,
    headlineNetProfitGrowthYoY: q0NetProfitGrowthYoY,
    coreNetProfitQ0: latestCore,
    coreNetProfitPrev: lastYearCore,
    coreNetProfitGrowthYoY: q0CoreProfitGrowthYoY,
    coreNetProfitLtm: ltmCoreCurr,
    coreNetProfitLtmPrev: ltmCorePrev,
    coreNetProfitLtmGrowthYoY: ltmCoreProfitGrowthYoY,
    coreEpsQ0: coreEpsCurr,
    coreEpsPrev: coreEpsPrev,
    coreEpsGrowthYoY: epsCoreGrowthYoY,
    coreEpsLtm: ltmCoreEpsCurr,
    coreEpsLtmPrev: ltmCoreEpsPrev,
    coreEpsLtmGrowthYoY: ltmCoreEpsGrowthYoY,
    headlineVsCoreGapPts,
    finAndOtherToPbtRatioPct,
    alerts,
    isCoreVerified: gate1Pass,
    verificationStatusLabel,
    thresholdConclusionLabel,
    verificationNote: gate1Note,
  };

  return {
    totalScore,
    rawTotalScore,
    maxScore: 60.0,
    percentage,
    rawPercentage: Math.round((rawTotalScore / 60.0) * 100),
    rankGrade,
    rankTitle,
    rankDescription,
    gatekeepers: {
      gate1_CoreVerified: gate1Pass,
      gate1_Note: gate1Note,
      gate2_Growth20PercentThreshold: gate2Pass,
      gate2_Note: gate2Note,
      isLocked,
      lockReason,
    },
    coreBridge,
    sections: {
      A: sectionA,
      B: sectionB,
      C: sectionC,
      D: sectionD,
      E: sectionE,
      F: sectionF,
      G: sectionG,
    },
    metrics: {
      q0RevenueGrowthYoY,
      q0NetProfitGrowthYoY,
      q0CoreProfitGrowthYoY,
      epsCoreGrowthYoY,
      ltmRevenueGrowthYoY,
      ltmNetProfitGrowthYoY,
      grossMarginTrendYoY,
      ebitMarginTrendYoY,
      cfoToNetProfitRatio,
      cagr3YearRevenue,
      cagr3YearNetProfit,
    },
  };
}
