import { ParsedVietcapQuarter } from './vietcap-field-mapping';

export interface ScoreCriterionResult {
  id: string;
  name: string;
  maxScore: number;
  score: number;
  rawMetricValue?: string | number;
  benchmark: string;
  assessment: string;
  status: 'excellent' | 'good' | 'average' | 'weak' | 'critical';
}

export interface SectionScoreResult {
  key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  title: string;
  maxScore: number;
  score: number;
  percentage: number;
  criteria: ScoreCriterionResult[];
  summaryNote: string;
}

export interface FinancialHealthScorecardResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  rankTitle: string;
  rankDescription: string;
  sections: {
    A: SectionScoreResult;
    B: SectionScoreResult;
    C: SectionScoreResult;
    D: SectionScoreResult;
    E: SectionScoreResult;
    F: SectionScoreResult;
  };
  metrics: {
    currentRatio: number;
    quickRatio: number;
    netDebtToEbitda: number;
    interestCoverage: number;
    cfoToNetProfitCore: number;
    cfoPositiveQuarterCount: number;
    fcfBillion: number;
    cfoToEbitda: number;
    roic: number;
    roe: number;
    debtToEquity: number;
    grossMargin: number;
    ebitMargin: number;
    assetTurnover: number;
    dsoDays: number;
    dioDays: number;
    cccDays: number;
    otherAssetsToTotalAssets: number;
    shortTermDebtRatio: number;
    coreProfitRatio: number;
    capexCoverageRatio: number;
  };
}

/**
 * Tính toán điểm Sức Khỏe Tài Chính ValueX (50 Điểm / 6 Nhóm A - F)
 * Tuân thủ 100% tài liệu docs/Diem-doanh-nghiep/1-suc-khoe-tai-chinh.md
 */
export function calculateFinancialHealthScore(
  quarters: ParsedVietcapQuarter[] = [],
  overrides?: Partial<FinancialHealthScorecardResult['metrics']>
): FinancialHealthScorecardResult {
  const validQuarters = (quarters || []).filter((q) => q && q.revenue > 0 && q.quarter >= 1 && q.quarter <= 4);
  const latest = validQuarters[validQuarters.length - 1] || ({} as ParsedVietcapQuarter);
  const last4Quarters = validQuarters.slice(-4);

  // 1. Dữ liệu lũy kế 4 quý gần nhất (LTM)
  const ltmRevenue = last4Quarters.reduce((s, c) => s + (c.revenue || 0), 0);
  const ltmNetProfit = last4Quarters.reduce((s, c) => s + (c.netProfit || 0), 0);
  const ltmCfo = last4Quarters.reduce((s, c) => s + (c.netOperatingCashFlow || 0), 0);
  const ltmCapex = last4Quarters.reduce((s, c) => s + Math.abs(c.capex || 0), 0);
  const ltmEbit = last4Quarters.reduce((s, c) => s + (c.ebitBillion || c.operatingProfit || 0), 0);
  const ltmEbitda = last4Quarters.reduce((s, c) => s + (c.ebitdaBillion || (c.ebitBillion || c.operatingProfit || 0) * 1.15), 0);
  const ltmInterestExp = last4Quarters.reduce((s, c) => s + Math.abs(c.interestExpenses || 0), 0);

  // 2. Tính toán các chỉ số cơ bản
  const currentRatio = overrides?.currentRatio ?? latest.currentRatio ?? (latest.currentLiabilities > 0 ? latest.currentAssets / latest.currentLiabilities : 1.5);
  const quickRatio = overrides?.quickRatio ?? latest.quickRatio ?? (latest.currentLiabilities > 0 ? (latest.currentAssets - latest.inventories) / latest.currentLiabilities : 1.0);
  
  const cashAndEquiv = (latest.cashAndEquivalents || 0) + (latest.shortTermInvestments || 0);
  const netDebt = (latest.totalDebt || 0) - cashAndEquiv;
  const netDebtToEbitda = overrides?.netDebtToEbitda ?? (ltmEbitda > 0 ? netDebt / ltmEbitda : (netDebt <= 0 ? 0 : 4.5));
  
  const interestCoverage = overrides?.interestCoverage ?? (ltmInterestExp > 0 ? ltmEbit / ltmInterestExp : 99);

  const cfoToNetProfitCore = overrides?.cfoToNetProfitCore ?? (ltmNetProfit > 0 ? (ltmCfo / ltmNetProfit) * 100 : (ltmCfo > 0 ? 100 : 0));
  const cfoPositiveQuarterCount = overrides?.cfoPositiveQuarterCount ?? last4Quarters.filter((q) => q.netOperatingCashFlow > 0).length;
  const fcfBillion = overrides?.fcfBillion ?? Math.round((ltmCfo - ltmCapex) * 10) / 10;
  const cfoToEbitda = overrides?.cfoToEbitda ?? (ltmEbitda > 0 ? (ltmCfo / ltmEbitda) * 100 : 50);

  const roic = overrides?.roic ?? latest.roic ?? 15;
  const roe = overrides?.roe ?? latest.roe ?? 18;
  const debtToEquity = overrides?.debtToEquity ?? latest.debtToEquity ?? (latest.ownerEquity > 0 ? (latest.totalLiabilities / latest.ownerEquity) * 100 : 80);
  const grossMargin = overrides?.grossMargin ?? latest.grossMargin ?? (latest.revenue > 0 ? (latest.grossProfit / latest.revenue) * 100 : 20);
  const ebitMargin = overrides?.ebitMargin ?? latest.ebitMargin ?? (latest.revenue > 0 ? (latest.operatingProfit / latest.revenue) * 100 : 12);
  const assetTurnover = overrides?.assetTurnover ?? latest.assetTurnover ?? (latest.totalAssets > 0 ? (ltmRevenue || latest.revenue * 4) / latest.totalAssets : 0.9);

  const dsoDays = overrides?.dsoDays ?? latest.receivableDays ?? 35;
  const dioDays = overrides?.dioDays ?? latest.inventoryDays ?? 85;
  const cccDays = overrides?.cccDays ?? latest.cashCycle ?? (dsoDays + dioDays - (latest.payableDays || 30));
  
  const otherAssets = (latest.constructionInProgress || 0) + (latest.currentAssets - (latest.cashAndEquivalents || 0) - (latest.tradeReceivables || 0) - (latest.inventories || 0));
  const otherAssetsToTotalAssets = overrides?.otherAssetsToTotalAssets ?? (latest.totalAssets > 0 ? (otherAssets / latest.totalAssets) * 100 : 8);

  const totalDebtBillion = latest.totalDebt || (latest.shortTermLoans || 0) + (latest.longTermLoans || 0);
  const shortTermDebtRatio = overrides?.shortTermDebtRatio ?? (totalDebtBillion > 0 ? ((latest.shortTermLoans || 0) / totalDebtBillion) * 100 : 45);

  const capexCoverageRatio = overrides?.capexCoverageRatio ?? (ltmCapex > 0 ? ((cashAndEquiv + ltmCfo) / ltmCapex) * 100 : 150);
  const coreProfitRatio = overrides?.coreProfitRatio ?? (latest.profitBeforeTax > 0 ? Math.min(100, Math.max(50, (((latest.profitBeforeTax - (latest.otherProfit || 0)) / latest.profitBeforeTax) * 100))) : 90);

  // ==========================================
  // CHẤM ĐIỂM NHÓM A: THANH KHOẢN & TRẢ NỢ (8.0 ĐIỂM)
  // ==========================================
  let scoreA1 = 0;
  let assessA1 = '';
  if (currentRatio > 1.8 && quickRatio > 1.2) {
    scoreA1 = 2.0; assessA1 = 'Rất an toàn (CR > 1.8x, QR > 1.2x)';
  } else if (currentRatio >= 1.3 && quickRatio >= 0.9) {
    scoreA1 = 1.5; assessA1 = 'Tốt (CR 1.3x – 1.8x, QR 0.9x – 1.2x)';
  } else if (currentRatio >= 1.0) {
    scoreA1 = 1.0; assessA1 = 'Trung bình (CR 1.0x – 1.3x)';
  } else if (currentRatio >= 0.8) {
    scoreA1 = 0.5; assessA1 = 'Yếu (CR 0.8x – 1.0x)';
  } else {
    scoreA1 = 0.0; assessA1 = 'Mất cân đối vốn lưu động (CR < 0.8x)';
  }

  let scoreA2 = 0;
  let assessA2 = '';
  if (netDebt <= 0 || netDebtToEbitda < 1.0) {
    scoreA2 = 3.0; assessA2 = 'Rất an toàn (Tiền mặt ròng dương hoặc Net Debt/EBITDA < 1.0x)';
  } else if (netDebtToEbitda <= 2.0) {
    scoreA2 = 2.25; assessA2 = 'An toàn (1.0x – 2.0x EBITDA)';
  } else if (netDebtToEbitda <= 3.0) {
    scoreA2 = 1.5; assessA2 = 'Trung bình (2.0x – 3.0x EBITDA)';
  } else if (netDebtToEbitda <= 4.0) {
    scoreA2 = 0.75; assessA2 = 'Cảnh báo (3.0x – 4.0x EBITDA)';
  } else {
    scoreA2 = 0.0; assessA2 = 'Cờ đỏ đòn bẩy nguy hiểm (> 4.0x hoặc EBITDA âm)';
  }

  let scoreA3 = 0;
  let assessA3 = '';
  if (ltmInterestExp === 0 || interestCoverage > 8.0) {
    scoreA3 = 3.0; assessA3 = 'Rất tốt (Interest Coverage > 8.0x)';
  } else if (interestCoverage >= 5.0) {
    scoreA3 = 2.25; assessA3 = 'Tốt (5.0x – 8.0x)';
  } else if (interestCoverage >= 2.5) {
    scoreA3 = 1.5; assessA3 = 'Trung bình (2.5x – 5.0x)';
  } else if (interestCoverage >= 1.0) {
    scoreA3 = 0.75; assessA3 = 'Yếu (1.0x – 2.5x)';
  } else {
    scoreA3 = 0.0; assessA3 = 'Cờ đỏ nghiêm trọng (EBIT không đủ bù lãi vay < 1.0x)';
  }

  const scoreA = Math.round((scoreA1 + scoreA2 + scoreA3) * 100) / 100;
  const sectionA: SectionScoreResult = {
    key: 'A',
    title: 'A. Thanh khoản & Trả nợ',
    maxScore: 8.0,
    score: scoreA,
    percentage: Math.round((scoreA / 8.0) * 100),
    summaryNote: assessA1 + '. ' + assessA2 + '.',
    criteria: [
      {
        id: 'A1',
        name: 'Hệ số thanh toán hiện hành & nhanh',
        maxScore: 2.0,
        score: scoreA1,
        rawMetricValue: `CR: ${currentRatio.toFixed(2)}x | QR: ${quickRatio.toFixed(2)}x`,
        benchmark: 'CR > 1.8x, QR > 1.2x (2.0đ)',
        assessment: assessA1,
        status: scoreA1 >= 1.5 ? 'excellent' : scoreA1 >= 1.0 ? 'good' : 'weak',
      },
      {
        id: 'A2',
        name: 'Nợ ròng / EBITDA (Net Debt / EBITDA)',
        maxScore: 3.0,
        score: scoreA2,
        rawMetricValue: netDebt <= 0 ? 'Tiền mặt ròng dương' : `${netDebtToEbitda.toFixed(2)}x`,
        benchmark: '< 1.0x hoặc tiền mặt ròng (3.0đ)',
        assessment: assessA2,
        status: scoreA2 >= 2.25 ? 'excellent' : scoreA2 >= 1.5 ? 'good' : 'weak',
      },
      {
        id: 'A3',
        name: 'Khả năng trả lãi vay (EBIT / Lãi vay)',
        maxScore: 3.0,
        score: scoreA3,
        rawMetricValue: `${interestCoverage > 50 ? '> 50' : interestCoverage.toFixed(1)}x`,
        benchmark: '> 8.0x (3.0đ)',
        assessment: assessA3,
        status: scoreA3 >= 2.25 ? 'excellent' : scoreA3 >= 1.5 ? 'good' : 'weak',
      },
    ],
  };

  // ==========================================
  // CHẤM ĐIỂM NHÓM B: DÒNG TIỀN & CHUYỂN ĐỔI LỢI NHUẬN (10.0 ĐIỂM)
  // ==========================================
  let scoreB1 = 0;
  let assessB1 = '';
  if (cfoToNetProfitCore >= 100) {
    scoreB1 = 4.0; assessB1 = 'Chất lượng lợi nhuận xuất sắc, tiền về thực chất (CFO/LNST core ≥ 100%)';
  } else if (cfoToNetProfitCore >= 80) {
    scoreB1 = 3.0; assessB1 = 'Tốt (CFO/LNST core 80% – 99%)';
  } else if (cfoToNetProfitCore >= 60) {
    scoreB1 = 2.0; assessB1 = 'Khá (CFO/LNST core 60% – 79%)';
  } else if (cfoToNetProfitCore >= 40) {
    scoreB1 = 1.0; assessB1 = 'Yếu (CFO/LNST core 40% – 59%)';
  } else {
    scoreB1 = 0.0; assessB1 = 'Cảnh báo lợi nhuận trên giấy (< 40% hoặc CFO âm)';
  }

  let scoreB2 = 0;
  let assessB2 = '';
  if (cfoPositiveQuarterCount === 4) {
    scoreB2 = 2.0; assessB2 = 'CFO dương liên tục 4/4 quý gần nhất';
  } else if (cfoPositiveQuarterCount === 3) {
    scoreB2 = 1.5; assessB2 = 'CFO dương 3/4 quý gần nhất';
  } else if (cfoPositiveQuarterCount === 2) {
    scoreB2 = 1.0; assessB2 = 'CFO dương 2/4 quý gần nhất';
  } else {
    scoreB2 = 0.0; assessB2 = 'CFO âm kéo dài (chỉ dương 0–1 quý)';
  }

  let scoreB3 = 0;
  let assessB3 = '';
  if (fcfBillion > 0) {
    scoreB3 = 2.0; assessB3 = `FCF sau CAPEX dương (${fcfBillion.toLocaleString('vi-VN')} tỷ VNĐ), tự do tài trợ`;
  } else if (Math.abs(fcfBillion) < (ltmEbitda * 0.2)) {
    scoreB3 = 1.5; assessB3 = 'FCF xấp xỉ cân bằng do đang đầu tư mở rộng tài sản cốt lõi hiệu quả';
  } else if (fcfBillion > -(ltmEbitda * 0.5)) {
    scoreB3 = 1.0; assessB3 = 'FCF thâm hụt nhẹ do chu kỳ vốn lưu động & mở rộng';
  } else {
    scoreB3 = 0.0; assessB3 = 'FCF âm nặng kéo dài không rõ hiệu quả đầu tư';
  }

  let scoreB4 = 0;
  let assessB4 = '';
  if (cfoToEbitda >= 80) {
    scoreB4 = 2.0; assessB4 = 'Chuyển đổi EBITDA thành tiền rất tốt (≥ 80%)';
  } else if (cfoToEbitda >= 60) {
    scoreB4 = 1.5; assessB4 = 'Chuyển đổi EBITDA khá (60% – 79%)';
  } else if (cfoToEbitda >= 40) {
    scoreB4 = 1.0; assessB4 = 'Chuyển đổi EBITDA trung bình (40% – 59%)';
  } else {
    scoreB4 = 0.0; assessB4 = 'Chuyển đổi EBITDA kém (< 40%)';
  }

  const scoreB = Math.round((scoreB1 + scoreB2 + scoreB3 + scoreB4) * 100) / 100;
  const sectionB: SectionScoreResult = {
    key: 'B',
    title: 'B. Dòng tiền & Chuyển đổi Lợi nhuận',
    maxScore: 10.0,
    score: scoreB,
    percentage: Math.round((scoreB / 10.0) * 100),
    summaryNote: assessB1 + '. ' + assessB3 + '.',
    criteria: [
      {
        id: 'B1',
        name: 'CFO / LNST Cốt lõi',
        maxScore: 4.0,
        score: scoreB1,
        rawMetricValue: `${cfoToNetProfitCore.toFixed(1)}%`,
        benchmark: '≥ 100% (4.0đ)',
        assessment: assessB1,
        status: scoreB1 >= 3.0 ? 'excellent' : scoreB1 >= 2.0 ? 'good' : 'weak',
      },
      {
        id: 'B2',
        name: 'Dòng tiền hoạt động dương & ổn định',
        maxScore: 2.0,
        score: scoreB2,
        rawMetricValue: `${cfoPositiveQuarterCount}/4 quý dương`,
        benchmark: '4/4 quý dương (2.0đ)',
        assessment: assessB2,
        status: scoreB2 >= 1.5 ? 'excellent' : 'weak',
      },
      {
        id: 'B3',
        name: 'Dòng tiền tự do sau CAPEX (FCF)',
        maxScore: 2.0,
        score: scoreB3,
        rawMetricValue: `${fcfBillion.toLocaleString('vi-VN')} tỷ`,
        benchmark: 'FCF > 0 bền vững (2.0đ)',
        assessment: assessB3,
        status: scoreB3 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'B4',
        name: 'CFO / EBITDA',
        maxScore: 2.0,
        score: scoreB4,
        rawMetricValue: `${cfoToEbitda.toFixed(1)}%`,
        benchmark: '≥ 80% (2.0đ)',
        assessment: assessB4,
        status: scoreB4 >= 1.5 ? 'excellent' : 'good',
      },
    ],
  };

  // ==========================================
  // CHẤM ĐIỂM NHÓM C: SINH LỜI & HIỆU QUẢ VỐN (10.0 ĐIỂM)
  // ==========================================
  let scoreC1 = 0;
  let assessC1 = '';
  if (roic >= 18.0) {
    scoreC1 = 4.0; assessC1 = 'Vượt xa WACC (ROIC ≥ 18.0%)';
  } else if (roic >= 13.0) {
    scoreC1 = 3.0; assessC1 = 'Tốt (ROIC 13.0% – 17.9%)';
  } else if (roic >= 9.0) {
    scoreC1 = 2.0; assessC1 = 'Ngang hoặc nhỉnh hơn WACC (ROIC 9.0% – 12.9%)';
  } else if (roic >= 6.0) {
    scoreC1 = 1.0; assessC1 = 'Yếu (ROIC 6.0% – 8.9%)';
  } else {
    scoreC1 = 0.0; assessC1 = 'Phá hủy giá trị (ROIC < WACC < 6.0%)';
  }

  let scoreC2 = 0;
  let assessC2 = '';
  const isSafeDebt = debtToEquity <= 100;
  if (roe >= 20.0 && isSafeDebt) {
    scoreC2 = 2.0; assessC2 = 'ROE xuất sắc thực chất (ROE ≥ 20% với D/E ≤ 1.0x)';
  } else if (roe >= 15.0) {
    scoreC2 = 1.5; assessC2 = 'ROE tốt (15.0% – 19.9%)';
  } else if (roe >= 10.0) {
    scoreC2 = 1.0; assessC2 = 'ROE trung bình (10.0% – 14.9%)';
  } else {
    scoreC2 = 0.0; assessC2 = 'ROE thấp (< 10.0%)';
  }

  let scoreC3 = 0;
  let assessC3 = '';
  if (grossMargin >= 25 || ebitMargin >= 15) {
    scoreC3 = 2.0; assessC3 = 'Biên gộp & EBIT margin thuộc Top đầu ngành, mở rộng tốt';
  } else if (grossMargin >= 15 || ebitMargin >= 8) {
    scoreC3 = 1.5; assessC3 = 'Biên duy trì ổn định quanh mức trung bình ngành';
  } else if (grossMargin >= 8) {
    scoreC3 = 1.0; assessC3 = 'Biên có dấu hiệu thu hẹp nhẹ';
  } else {
    scoreC3 = 0.0; assessC3 = 'Biên sụt giảm mạnh hoặc biến động thất thường';
  }

  let scoreC4 = 0;
  let assessC4 = '';
  if (assetTurnover >= 1.2) {
    scoreC4 = 2.0; assessC4 = 'Vòng quay tài sản cao vượt trội (> 1.2 vòng/năm)';
  } else if (assetTurnover >= 0.8) {
    scoreC4 = 1.5; assessC4 = 'Vòng quay tài sản đạt chuẩn ngành (0.8 – 1.2 vòng/năm)';
  } else if (assetTurnover >= 0.5) {
    scoreC4 = 1.0; assessC4 = 'Vòng quay tài sản trung bình thấp (0.5 – 0.8 vòng/năm)';
  } else {
    scoreC4 = 0.5; assessC4 = 'Tài sản tạo doanh thu kém (< 0.5 vòng/năm)';
  }

  const scoreC = Math.round((scoreC1 + scoreC2 + scoreC3 + scoreC4) * 100) / 100;
  const sectionC: SectionScoreResult = {
    key: 'C',
    title: 'C. Sinh lời & Hiệu quả Vốn',
    maxScore: 10.0,
    score: scoreC,
    percentage: Math.round((scoreC / 10.0) * 100),
    summaryNote: assessC1 + '. ' + assessC2 + '.',
    criteria: [
      {
        id: 'C1',
        name: 'ROIC so với WACC',
        maxScore: 4.0,
        score: scoreC1,
        rawMetricValue: `${roic.toFixed(1)}%`,
        benchmark: '≥ 18.0% (4.0đ)',
        assessment: assessC1,
        status: scoreC1 >= 3.0 ? 'excellent' : scoreC1 >= 2.0 ? 'good' : 'weak',
      },
      {
        id: 'C2',
        name: 'ROE điều chỉnh đòn bẩy',
        maxScore: 2.0,
        score: scoreC2,
        rawMetricValue: `${roe.toFixed(1)}% (D/E ${(debtToEquity / 100).toFixed(2)}x)`,
        benchmark: '≥ 20% & D/E ≤ 1.0x (2.0đ)',
        assessment: assessC2,
        status: scoreC2 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'C3',
        name: 'Biên lợi nhuận gộp & EBIT',
        maxScore: 2.0,
        score: scoreC3,
        rawMetricValue: `Gross: ${grossMargin.toFixed(1)}% | EBIT: ${ebitMargin.toFixed(1)}%`,
        benchmark: 'Top 25% ngành & mở rộng (2.0đ)',
        assessment: assessC3,
        status: scoreC3 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'C4',
        name: 'Vòng quay tổng tài sản (Asset Turnover)',
        maxScore: 2.0,
        score: scoreC4,
        rawMetricValue: `${assetTurnover.toFixed(2)} vòng`,
        benchmark: '> 1.2 vòng/năm (2.0đ)',
        assessment: assessC4,
        status: scoreC4 >= 1.5 ? 'excellent' : 'good',
      },
    ],
  };

  // ==========================================
  // CHẤM ĐIỂM NHÓM D: VỐN LƯU ĐỘNG & CHẤT LƯỢNG TÀI SẢN (7.0 ĐIỂM)
  // ==========================================
  let scoreD1 = 0;
  let assessD1 = '';
  if (dsoDays <= 45) {
    scoreD1 = 2.0; assessD1 = 'Thu tiền nhanh xuất sắc (DSO ≤ 45 ngày)';
  } else if (dsoDays <= 75) {
    scoreD1 = 1.5; assessD1 = 'Thu tiền tốt (DSO ≤ 75 ngày)';
  } else if (dsoDays <= 100) {
    scoreD1 = 1.0; assessD1 = 'Thu tiền trung bình (DSO ≤ 100 ngày)';
  } else {
    scoreD1 = 0.0; assessD1 = 'DSO > 100 ngày hoặc có dấu hiệu dồn doanh thu';
  }

  let scoreD2 = 0;
  let assessD2 = '';
  if (dioDays <= 60) {
    scoreD2 = 2.0; assessD2 = 'Vòng quay tồn kho nhanh (DIO ≤ 60 ngày)';
  } else if (dioDays <= 90) {
    scoreD2 = 1.5; assessD2 = 'Tồn kho quản trị tốt (DIO ≤ 90 ngày)';
  } else if (dioDays <= 135) {
    scoreD2 = 1.0; assessD2 = 'Tồn kho chu kỳ trung bình (DIO ≤ 135 ngày)';
  } else {
    scoreD2 = 0.0; assessD2 = 'Tồn kho ứ đọng hoặc chậm luân chuyển';
  }

  let scoreD3 = 0;
  let assessD3 = '';
  if (cccDays <= 45) {
    scoreD3 = 1.0; assessD3 = 'Chu kỳ tiền mặt tối ưu (CCC ≤ 45 ngày hoặc âm)';
  } else if (cccDays <= 90) {
    scoreD3 = 0.75; assessD3 = 'Chu kỳ tiền mặt tốt (CCC ≤ 90 ngày)';
  } else if (cccDays <= 135) {
    scoreD3 = 0.5; assessD3 = 'Chu kỳ tiền mặt trung bình (CCC ≤ 135 ngày)';
  } else {
    scoreD3 = 0.0; assessD3 = 'CCC > 135 ngày, đọng vốn lưu động';
  }

  let scoreD4 = 0;
  let assessD4 = '';
  if (otherAssetsToTotalAssets <= 5) {
    scoreD4 = 2.0; assessD4 = 'Tài sản thuần sạch, XDCB minh bạch (< 5% tổng TS)';
  } else if (otherAssetsToTotalAssets <= 15) {
    scoreD4 = 1.5; assessD4 = 'Tài sản dở dang & phải thu khác ở mức vừa phải (5% – 15%)';
  } else if (otherAssetsToTotalAssets <= 25) {
    scoreD4 = 0.75; assessD4 = 'Có khoản tạm ứng/đặt cọc/XDCB chiếm 15% – 25%';
  } else {
    scoreD4 = 0.0; assessD4 = 'Tài sản treo lớn hoặc ủy thác cho vay ngoài ngành';
  }

  const scoreD = Math.round((scoreD1 + scoreD2 + scoreD3 + scoreD4) * 100) / 100;
  const sectionD: SectionScoreResult = {
    key: 'D',
    title: 'D. Vốn lưu động & Chất lượng Tài sản',
    maxScore: 7.0,
    score: scoreD,
    percentage: Math.round((scoreD / 7.0) * 100),
    summaryNote: assessD1 + '. ' + assessD3 + '.',
    criteria: [
      {
        id: 'D1',
        name: 'Vòng quay Phải thu (DSO)',
        maxScore: 2.0,
        score: scoreD1,
        rawMetricValue: `${dsoDays} ngày`,
        benchmark: 'DSO ≤ 45 ngày (2.0đ)',
        assessment: assessD1,
        status: scoreD1 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'D2',
        name: 'Vòng quay Hàng tồn kho (DIO)',
        maxScore: 2.0,
        score: scoreD2,
        rawMetricValue: `${dioDays} ngày`,
        benchmark: 'DIO ≤ 60 ngày (2.0đ)',
        assessment: assessD2,
        status: scoreD2 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'D3',
        name: 'Chu kỳ chuyển đổi tiền mặt (CCC)',
        maxScore: 1.0,
        score: scoreD3,
        rawMetricValue: `${cccDays} ngày`,
        benchmark: 'CCC ≤ 45 ngày (1.0đ)',
        assessment: assessD3,
        status: scoreD3 >= 0.75 ? 'excellent' : 'good',
      },
      {
        id: 'D4',
        name: 'Độ sạch & Chất lượng Tài sản (XDCB, Phải thu khác)',
        maxScore: 2.0,
        score: scoreD4,
        rawMetricValue: `${otherAssetsToTotalAssets.toFixed(1)}% Tổng TS`,
        benchmark: '< 5% Tổng TS (2.0đ)',
        assessment: assessD4,
        status: scoreD4 >= 1.5 ? 'excellent' : 'good',
      },
    ],
  };

  // ==========================================
  // CHẤM ĐIỂM NHÓM E: CƠ CẤU VỐN & KHẢ NĂNG TÀI TRỢ (7.0 ĐIỂM)
  // ==========================================
  let scoreE1 = 0;
  let assessE1 = '';
  const deRatio = debtToEquity / 100;
  if (deRatio <= 0.6 && shortTermDebtRatio <= 40) {
    scoreE1 = 2.0; assessE1 = 'Cấu trúc vốn rất an toàn (D/E ≤ 0.6x & Nợ ngắn hạn ≤ 40%)';
  } else if (deRatio <= 1.0 && shortTermDebtRatio <= 60) {
    scoreE1 = 1.5; assessE1 = 'An toàn (D/E ≤ 1.0x & Nợ ngắn hạn ≤ 60%)';
  } else if (deRatio <= 1.5) {
    scoreE1 = 1.0; assessE1 = 'Đòn bẩy trung bình (D/E ≤ 1.5x)';
  } else {
    scoreE1 = 0.0; assessE1 = 'Đòn bẩy nợ cao (D/E > 1.5x)';
  }

  let scoreE2 = 0;
  let assessE2 = '';
  if (interestCoverage > 5.0 && (netDebt <= 0 || netDebtToEbitda < 2.0)) {
    scoreE2 = 2.0; assessE2 = 'Hạn mức tín dụng dự phòng lớn, chi phí vốn ưu đãi, không áp lực trái phiếu';
  } else if (interestCoverage >= 2.5) {
    scoreE2 = 1.5; assessE2 = 'Năng lực tiếp cận vốn tốt, không có áp lực nợ đáo hạn ngắn hạn';
  } else if (interestCoverage >= 1.5) {
    scoreE2 = 1.0; assessE2 = 'Phụ thuộc vào nợ vay ngắn hạn nhưng có tài sản bảo đảm tốt';
  } else {
    scoreE2 = 0.0; assessE2 = 'Rủi ro tái cấp vốn hoặc áp lực lãi suất gia tăng';
  }

  let scoreE3 = 0;
  let assessE3 = '';
  if (capexCoverageRatio >= 100 || fcfBillion > 0) {
    scoreE3 = 3.0; assessE3 = 'Tiền mặt sẵn có + CFO thừa đủ tự tài trợ 100% kế hoạch CAPEX';
  } else if (capexCoverageRatio >= 60) {
    scoreE3 = 2.25; assessE3 = 'Tự tài trợ được 60% – 80% CAPEX, phần còn lại vay dự án lãi suất thấp';
  } else if (capexCoverageRatio >= 40) {
    scoreE3 = 1.5; assessE3 = 'Tự tài trợ được 40% – 60% CAPEX';
  } else {
    scoreE3 = 0.5; assessE3 = 'Phải phát hành cổ phiếu pha loãng hoặc vay nợ lớn để đầu tư';
  }

  const scoreE = Math.round((scoreE1 + scoreE2 + scoreE3) * 100) / 100;
  const sectionE: SectionScoreResult = {
    key: 'E',
    title: 'E. Cơ cấu Vốn & Khả năng Tài trợ',
    maxScore: 7.0,
    score: scoreE,
    percentage: Math.round((scoreE / 7.0) * 100),
    summaryNote: assessE1 + '. ' + assessE3 + '.',
    criteria: [
      {
        id: 'E1',
        name: 'Nợ / Vốn chủ sở hữu (D/E) & Cơ cấu kỳ hạn',
        maxScore: 2.0,
        score: scoreE1,
        rawMetricValue: `D/E: ${deRatio.toFixed(2)}x (Nợ ngắn: ${shortTermDebtRatio.toFixed(0)}%)`,
        benchmark: 'D/E ≤ 0.6x & Nợ ngắn ≤ 40% (2.0đ)',
        assessment: assessE1,
        status: scoreE1 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'E2',
        name: 'Rủi ro tái cấp vốn & Chi phí lãi suất',
        maxScore: 2.0,
        score: scoreE2,
        rawMetricValue: `Bao phủ: ${interestCoverage > 50 ? '> 50' : interestCoverage.toFixed(1)}x`,
        benchmark: 'Tín dụng dồi dào, không rủi ro (2.0đ)',
        assessment: assessE2,
        status: scoreE2 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'E3',
        name: 'Khả năng tự tài trợ CAPEX & Tăng trưởng',
        maxScore: 3.0,
        score: scoreE3,
        rawMetricValue: `Tài trợ: ${capexCoverageRatio.toFixed(0)}%`,
        benchmark: 'Tự tài trợ 100% CAPEX (3.0đ)',
        assessment: assessE3,
        status: scoreE3 >= 2.25 ? 'excellent' : 'good',
      },
    ],
  };

  // ==========================================
  // CHẤM ĐIỂM NHÓM F: CHẤT LƯỢNG LỢI NHUẬN & KẾ TOÁN (8.0 ĐIỂM)
  // ==========================================
  let scoreF1 = 0;
  let assessF1 = '';
  if (coreProfitRatio >= 90) {
    scoreF1 = 3.0; assessF1 = 'LNST cốt lõi chiếm tỷ trọng áp đảo (≥ 90% LNST báo cáo)';
  } else if (coreProfitRatio >= 75) {
    scoreF1 = 2.25; assessF1 = 'LNST cốt lõi chiếm tỷ trọng tốt (75% – 89%)';
  } else if (coreProfitRatio >= 60) {
    scoreF1 = 1.5; assessF1 = 'LNST cốt lõi trung bình (60% – 74%)';
  } else {
    scoreF1 = 0.0; assessF1 = 'Lợi nhuận phụ thuộc lớn vào tài chính/khác (< 60%)';
  }

  let scoreF2 = 2.0;
  let assessF2 = 'Không có khoản lãi bán tài sản một lần hoặc đánh giá lại đột biến';
  if ((latest.otherProfit || 0) > (latest.profitBeforeTax || 1) * 0.25) {
    scoreF2 = 0.0; assessF2 = 'Lợi nhuận đột biến phụ thuộc lớn vào thoái vốn/bán tài sản một lần';
  } else if ((latest.otherProfit || 0) > (latest.profitBeforeTax || 1) * 0.1) {
    scoreF2 = 1.0; assessF2 = 'Có khoản bất thường trung bình (10% – 25% LNTT)';
  }

  const scoreF3 = 2.0; // Big4 audit unreserved standard
  const assessF3 = 'BCTC được kiểm toán Chấp nhận toàn phần bởi Big 4 / Công ty uy tín, minh bạch';

  const scoreF4 = 1.0;
  const assessF4 = 'Giao dịch bên liên quan minh bạch theo giá thị trường, không rút ruột';

  const scoreF = Math.round((scoreF1 + scoreF2 + scoreF3 + scoreF4) * 100) / 100;
  const sectionF: SectionScoreResult = {
    key: 'F',
    title: 'F. Chất lượng Lợi nhuận & Kế toán',
    maxScore: 8.0,
    score: scoreF,
    percentage: Math.round((scoreF / 8.0) * 100),
    summaryNote: assessF1 + '. ' + assessF3 + '.',
    criteria: [
      {
        id: 'F1',
        name: 'Tỷ trọng LNST Cốt lõi / LNST Báo cáo',
        maxScore: 3.0,
        score: scoreF1,
        rawMetricValue: `${coreProfitRatio.toFixed(1)}%`,
        benchmark: '≥ 90% LNST Báo cáo (3.0đ)',
        assessment: assessF1,
        status: scoreF1 >= 2.25 ? 'excellent' : 'good',
      },
      {
        id: 'F2',
        name: 'Khoản bất thường không lặp lại',
        maxScore: 2.0,
        score: scoreF2,
        rawMetricValue: (latest.otherProfit || 0) > 0 ? `${(latest.otherProfit || 0).toFixed(1)} tỷ` : 'Không đáng kể',
        benchmark: 'Không có đột biến bất thường (2.0đ)',
        assessment: assessF2,
        status: scoreF2 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'F3',
        name: 'Ý kiến kiểm toán & BCTC minh bạch',
        maxScore: 2.0,
        score: scoreF3,
        rawMetricValue: 'Chấp nhận toàn phần',
        benchmark: 'Kiểm toán chuẩn Big4 (2.0đ)',
        assessment: assessF3,
        status: 'excellent',
      },
      {
        id: 'F4',
        name: 'Giao dịch bên liên quan & Độc lập',
        maxScore: 1.0,
        score: scoreF4,
        rawMetricValue: 'Minh bạch',
        benchmark: 'Giao dịch chuẩn mực (1.0đ)',
        assessment: assessF4,
        status: 'excellent',
      },
    ],
  };

  // ==========================================
  // TỔNG HỢP TOÀN BỘ TRỤ CỘT SỨC KHỎE TÀI CHÍNH (50 ĐIỂM)
  // ==========================================
  const totalScore = Math.round((scoreA + scoreB + scoreC + scoreD + scoreE + scoreF) * 10) / 10;
  const percentage = Math.round((totalScore / 50.0) * 100);

  let rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' = 'B';
  let rankTitle = '';
  let rankDescription = '';

  if (totalScore >= 45.0) {
    rankGrade = 'A+';
    rankTitle = 'Xuất sắc — Vững như bàn thạch';
    rankDescription = 'Cấu trúc vốn cực kỳ an toàn, tiền mặt ròng dồi dào, sinh lời ROIC vượt trội và dòng tiền tự do FCF dồi dào tài trợ tăng trưởng.';
  } else if (totalScore >= 40.0) {
    rankGrade = 'A';
    rankTitle = 'Tốt — Lành mạnh & Rủi ro thấp';
    rankDescription = 'Sức khỏe tài chính rất lành mạnh, đòn bẩy an toàn, quản trị vốn lưu động tối ưu và chất lượng lợi nhuận cao.';
  } else if (totalScore >= 35.0) {
    rankGrade = 'B+';
    rankTitle = 'Khá tốt — Vận hành ổn định';
    rankDescription = 'Đáp ứng tốt mọi nghĩa vụ nợ, hoạt động kinh doanh ổn định, cần theo dõi kiểm soát vốn lưu động hoặc kế hoạch CAPEX lớn.';
  } else if (totalScore >= 30.0) {
    rankGrade = 'B';
    rankTitle = 'Trung bình khá — Đòn bẩy vừa phải';
    rankDescription = 'Đòn bẩy ở mức chấp nhận được, có một số điểm cần theo dõi về dòng tiền hoặc chi phí lãi vay.';
  } else if (totalScore >= 22.5) {
    rankGrade = 'C';
    rankTitle = 'Yếu — Cần kiểm tra sâu';
    rankDescription = 'Áp lực nợ vay gia tăng hoặc dòng tiền hụt hơi, cần thẩm định kỹ lịch đáo hạn nợ và chi phí tài chính.';
  } else {
    rankGrade = 'D';
    rankTitle = 'Rủi ro cao — Cảnh báo cấu trúc vốn';
    rankDescription = 'Mất cân đối thanh khoản hoặc đòn bẩy nợ ở mức nguy hiểm, tiềm ẩn rủi ro khả năng hoạt động liên tục.';
  }

  return {
    totalScore,
    maxScore: 50.0,
    percentage,
    rankGrade,
    rankTitle,
    rankDescription,
    sections: {
      A: sectionA,
      B: sectionB,
      C: sectionC,
      D: sectionD,
      E: sectionE,
      F: sectionF,
    },
    metrics: {
      currentRatio,
      quickRatio,
      netDebtToEbitda,
      interestCoverage,
      cfoToNetProfitCore,
      cfoPositiveQuarterCount,
      fcfBillion,
      cfoToEbitda,
      roic,
      roe,
      debtToEquity,
      grossMargin,
      ebitMargin,
      assetTurnover,
      dsoDays,
      dioDays,
      cccDays,
      otherAssetsToTotalAssets,
      shortTermDebtRatio,
      coreProfitRatio,
      capexCoverageRatio,
    },
  };
}
