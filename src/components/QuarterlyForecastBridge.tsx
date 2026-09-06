'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AnalysisReport,
  ForecastQuarterMetrics,
  CapacityExpansionData,
  BaselineDetermination,
  SectionForecast8Q,
} from '@/types/analysis';
import {
  calculateGrowthQualityScore,
  GrowthQualityScorecardResult,
} from '@/lib/growth-quality-calculator';
import {
  TrendingUp,
  Factory,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  PieChart,
} from 'lucide-react';

interface QuarterlyForecastBridgeProps {
  report: AnalysisReport;
  realQuarterlyFinancials: any[];
  onUpdateReport: (updatedReport: AnalysisReport) => void;
  onNavigateToValuation?: () => void;
  isEditingGlobal?: boolean;
}

// Helper: tính quý kế tiếp dựa vào chuỗi Qx/YYYY
function getNextQuarter(periodStr: string): string {
  const match = periodStr.match(/Q([1-4])\/(\d{4})/i);
  if (!match) return 'Q1/2026';
  let q = parseInt(match[1], 10);
  let y = parseInt(match[2], 10);
  q += 1;
  if (q > 4) {
    q = 1;
    y += 1;
  }
  return `Q${q}/${y}`;
}

// Helper: tính 4 quý lịch sử Q-3..Q0 từ dữ liệu Vietcap
function extractHistoricalQuarters(
  ticker: string,
  realQuarterlyFinancials: any[],
  currentPrice: number,
  sharesCount: number
): ForecastQuarterMetrics[] {
  const validReal = (realQuarterlyFinancials || []).filter(
    (q) => q && (typeof q.revenue === 'number' || typeof q.netProfit === 'number')
  );

  // Fallback data nếu chưa có dữ liệu thực tế
  let baseQuarters: any[] = [];
  if (validReal.length >= 4) {
    baseQuarters = validReal.slice(-4);
  } else {
    // Dữ liệu mẫu chuẩn hóa cho các mã phổ biến
    const t = ticker.toUpperCase();
    if (t === 'HPG') {
      baseQuarters = [
        { period: 'Q3/2024', revenue: 34103, netProfit: 3022, grossMargin: 13.5, ebitda: 4650, cfo: 2850, shares: 5815 },
        { period: 'Q4/2024', revenue: 34800, netProfit: 3150, grossMargin: 13.8, ebitda: 4800, cfo: 3100, shares: 5815 },
        { period: 'Q1/2025', revenue: 37622, netProfit: 3344, grossMargin: 14.1, ebitda: 5120, cfo: 3300, shares: 5815 },
        { period: 'Q2/2025', revenue: 39500, netProfit: 3850, grossMargin: 14.6, ebitda: 5600, cfo: 3900, shares: 5815 },
      ];
    } else if (t === 'FPT') {
      baseQuarters = [
        { period: 'Q3/2024', revenue: 15300, netProfit: 2150, grossMargin: 38.5, ebitda: 3100, cfo: 2200, shares: 1460 },
        { period: 'Q4/2024', revenue: 16800, netProfit: 2320, grossMargin: 38.2, ebitda: 3350, cfo: 2400, shares: 1460 },
        { period: 'Q1/2025', revenue: 16058, netProfit: 2174, grossMargin: 39.0, ebitda: 3150, cfo: 2100, shares: 1460 },
        { period: 'Q2/2025', revenue: 17200, netProfit: 2450, grossMargin: 39.4, ebitda: 3500, cfo: 2500, shares: 1460 },
      ];
    } else {
      baseQuarters = [
        { period: 'Q3/2024', revenue: 1000, netProfit: 120, grossMargin: 20.0, ebitda: 180, cfo: 110, shares: sharesCount || 100 },
        { period: 'Q4/2024', revenue: 1150, netProfit: 140, grossMargin: 20.5, ebitda: 210, cfo: 130, shares: sharesCount || 100 },
        { period: 'Q1/2025', revenue: 1100, netProfit: 135, grossMargin: 21.0, ebitda: 200, cfo: 125, shares: sharesCount || 100 },
        { period: 'Q2/2025', revenue: 1250, netProfit: 160, grossMargin: 21.5, ebitda: 240, cfo: 150, shares: sharesCount || 100 },
      ];
    }
  }

  const shares = sharesCount > 0 ? sharesCount : 1000;

  return baseQuarters.map((q, idx) => {
    const rev = q.revenue > 1e6 ? Math.round(q.revenue / 1e9) : Math.round(q.revenue || 0);
    const np = q.netProfit > 1e6 ? Math.round(q.netProfit / 1e9) : Math.round(q.netProfit || 0);
    const gm = q.grossMargin || 15.0;
    const eb = q.ebitda ? (q.ebitda > 1e6 ? Math.round(q.ebitda / 1e9) : Math.round(q.ebitda)) : Math.round(np * 1.4);
    const ebMargin = rev > 0 ? Math.round((eb / rev) * 1000) / 10 : 18.0;
    const netM = rev > 0 ? Math.round((np / rev) * 1000) / 10 : 10.0;
    const cfoVal = q.cfo ? (q.cfo > 1e6 ? Math.round(q.cfo / 1e9) : Math.round(q.cfo)) : Math.round(np * 0.9);
    const epsVal = shares > 0 ? Math.round((np * 1e9) / (shares * 1e6)) : 0;
    const bvpsVal = Math.round(epsVal * 6.5);
    const peVal = epsVal > 0 && currentPrice > 0 ? Math.round((currentPrice / (epsVal * 4)) * 10) / 10 : 12.5;
    const pbVal = bvpsVal > 0 && currentPrice > 0 ? Math.round((currentPrice / bvpsVal) * 100) / 100 : 1.8;
    const evVal = eb > 0 ? Math.round(((currentPrice * shares * 1e6) / (eb * 4 * 1e9)) * 10) / 10 : 8.5;

    const prevRev = idx > 0 ? (baseQuarters[idx - 1].revenue > 1e6 ? baseQuarters[idx - 1].revenue / 1e9 : baseQuarters[idx - 1].revenue) : rev;
    const qoq = prevRev > 0 ? Math.round(((rev - prevRev) / prevRev) * 1000) / 10 : 0;

    return {
      period: q.period || `Q${idx + 1}/2025`,
      isActual: true,
      revenue: rev,
      abnormalRevenue: 0,
      normalizedRevenue: rev,
      revenueGrowthQoQ: qoq,
      impactVolumeCapacity: idx === 0 ? 0 : qoq > 0 ? Math.round(qoq * 0.6 * 10) / 10 : 0,
      impactAverageSellingPrice: idx === 0 ? 0 : qoq > 0 ? Math.round(qoq * 0.2 * 10) / 10 : 0,
      impactMixDemandShare: idx === 0 ? 0 : qoq > 0 ? Math.round(qoq * 0.15 * 10) / 10 : 0,
      impactSeasonalityOther: idx === 0 ? 0 : qoq > 0 ? Math.round(qoq * 0.05 * 10) / 10 : 0,
      revenueBridgeGrowth: qoq,
      grossMargin: gm,
      grossProfit: Math.round(rev * (gm / 100)),
      ebitdaMargin: ebMargin,
      ebitda: eb,
      netProfit: np,
      netMargin: netM,
      cfo: cfoVal,
      cfoToNetProfit: np > 0 ? Math.round((cfoVal / np) * 100) : 90,
      sharesOutstanding: shares,
      eps: epsVal,
      bvps: bvpsVal,
      pe: peVal,
      pb: pbVal,
      evEbitda: evVal,
    };
  });
}

export const QuarterlyForecastBridge: React.FC<QuarterlyForecastBridgeProps> = ({
  report,
  realQuarterlyFinancials,
  onUpdateReport,
  onNavigateToValuation,
}) => {
  const currentPrice = report.marketData.currentPrice || 0;
  const sharesCount = report.marketData.sharesOutstanding || report.sectionF?.valuation?.sharesOutstanding || 1000;

  // 1. Tính toán điểm chất lượng tăng trưởng từ Tab D (/60đ)
  const growthScorecard: GrowthQualityScorecardResult = useMemo(() => {
    return calculateGrowthQualityScore(realQuarterlyFinancials || []);
  }, [realQuarterlyFinancials]);

  const growthScore = growthScorecard.totalScore || 45;
  const growthTier = growthScorecard.rankGrade || 'B+';

  // 2. Trích xuất 4 quý lịch sử Q-3..Q0 từ Vietcap IQ API
  const historical4Q: ForecastQuarterMetrics[] = useMemo(() => {
    return extractHistoricalQuarters(report.ticker, realQuarterlyFinancials, currentPrice, sharesCount);
  }, [report.ticker, realQuarterlyFinancials, currentPrice, sharesCount]);

  const q0Item = historical4Q[historical4Q.length - 1] || {
    period: 'Q2/2026',
    revenue: 1000,
    normalizedRevenue: 1000,
    grossMargin: 20.0,
    ebitdaMargin: 22.0,
    netMargin: 15.0,
    netProfit: 150,
    ebitda: 220,
    cfo: 140,
  };

  // Tính trung bình 3 quý và 4 quý
  const avg3QRevenue = Math.round(
    historical4Q.slice(-3).reduce((s, q) => s + q.normalizedRevenue, 0) / Math.max(1, historical4Q.slice(-3).length)
  );
  const avg4QRevenue = Math.round(
    historical4Q.reduce((s, q) => s + q.normalizedRevenue, 0) / Math.max(1, historical4Q.length)
  );

  // 3. Xác định Nền gợi ý theo quy tắc ValueX (1.1)
  const suggestedMode: 'NÂNG NỀN' | 'PHA TRỘN' | 'THẬN TRỌNG' = useMemo(() => {
    if (growthScore >= 48) return 'NÂNG NỀN';
    if (growthScore >= 36) return 'PHA TRỘN';
    return 'THẬN TRỌNG';
  }, [growthScore]);

  const suggestedBaselineQ1 = useMemo(() => {
    if (suggestedMode === 'NÂNG NỀN') return q0Item.normalizedRevenue;
    if (suggestedMode === 'PHA TRỘN') return Math.round(0.6 * q0Item.normalizedRevenue + 0.4 * avg3QRevenue);
    return avg4QRevenue;
  }, [suggestedMode, q0Item.normalizedRevenue, avg3QRevenue, avg4QRevenue]);

  // State 6 điều kiện nền Q0
  const [conditionsCheck, setConditionsCheck] = useState({
    coreOperationDriven: true,
    orderAndDemandConfirmed: true,
    factoryRampUpAligned: true,
    marginNotAnomaly: true,
    workingCapitalHealthy: true,
    notLowBaseDependent: true,
  });

  const [manualAdjustmentQ1, setManualAdjustmentQ1] = useState<number>(0);
  const [manualAdjustmentNote, setManualAdjustmentNote] = useState<string>('');
  const [isCapacityExpanded, setIsCapacityExpanded] = useState<boolean>(false);

  // State Phân tích công suất mở rộng
  const [capacityData, setCapacityData] = useState<CapacityExpansionData>({
    hasNewFactory: report.ticker.toUpperCase() === 'HPG' || report.ticker.toUpperCase() === 'PHP',
    existingDesignCapacity: report.ticker.toUpperCase() === 'HPG' ? 8.5 : 100,
    existingUtilizationRateQ0: 92,
    capacityUnit: report.ticker.toUpperCase() === 'HPG' ? 'triệu tấn thép thô/năm' : 'triệu đơn vị/năm',
    newDesignCapacity: report.ticker.toUpperCase() === 'HPG' ? 5.6 : 30,
    commercialOperationQuarter: 'Q1/2026',
    quartersToTargetCapacity: 4,
    totalInvestmentCapital: report.ticker.toUpperCase() === 'HPG' ? 85000 : 2500,
    mainFundingSource: 'Vốn tự có (60%) + Nợ vay thương mại dài hạn (40%)',
    progressNote: report.ticker.toUpperCase() === 'HPG'
      ? 'Dung Quất 2 phân kỳ 1 chạy thử lò cao Q1/2026, phân kỳ 2 chạy thử Q3/2026; thiết bị công nghệ hiện đại từ Ý/Đức.'
      : 'Dự án mở rộng bến bãi và cầu tàu mới đúng kế hoạch, chuẩn bị nghiệm thu đưa vào khai thác.',
  });

  // State 4 Quý Dự Phóng Q+1..Q+4
  const q0Period = q0Item.period || 'Q2/2026';
  const q1Period = getNextQuarter(q0Period);
  const q2Period = getNextQuarter(q1Period);
  const q3Period = getNextQuarter(q2Period);
  const q4Period = getNextQuarter(q3Period);

  // Helper: tạo 4 quý dự phóng tự động dựa trên chính số liệu nền q0Item của cổ phiếu đang phân tích
  const buildDefaultForecastQuarters = (
    baseQ0: ForecastQuarterMetrics,
    shares: number
  ): ForecastQuarterMetrics[] => {
    const q0P = baseQ0.period || 'Q2/2026';
    const p1 = getNextQuarter(q0P);
    const p2 = getNextQuarter(p1);
    const p3 = getNextQuarter(p2);
    const p4 = getNextQuarter(p3);
    const periods = [p1, p2, p3, p4];

    // Lấy nền biên thực tế từ Q0 của chính doanh nghiệp
    const initGM = baseQ0.grossMargin > 0 ? baseQ0.grossMargin : 20.0;
    const initEbitdaM = baseQ0.ebitdaMargin > 0 ? baseQ0.ebitdaMargin : 22.0;
    const initNetM = baseQ0.netMargin > 0 ? baseQ0.netMargin : 15.0;

    const growthSteps = [0.04, 0.06, 0.07, 0.05];

    return periods.map((period, idx) => {
      const step = growthSteps[idx] || 0.05;
      const volImpact = Math.round(step * 0.6 * 1000) / 10;
      const aspImpact = Math.round(step * 0.25 * 1000) / 10;
      const mixImpact = Math.round(step * 0.15 * 1000) / 10;
      const bridgeGrowth = Math.round((volImpact + aspImpact + mixImpact) * 10) / 10;

      return {
        period: `${period}F`,
        isActual: false,
        revenue: 0,
        abnormalRevenue: 0,
        normalizedRevenue: 0,
        revenueGrowthQoQ: bridgeGrowth,
        impactVolumeCapacity: volImpact,
        impactAverageSellingPrice: aspImpact,
        impactMixDemandShare: mixImpact,
        impactSeasonalityOther: 0,
        revenueBridgeGrowth: bridgeGrowth,
        grossMargin: Math.round((initGM + idx * 0.3) * 10) / 10,
        ebitdaMargin: Math.round((initEbitdaM + idx * 0.2) * 10) / 10,
        ebitda: 0,
        netProfit: 0,
        netMargin: Math.round((initNetM + idx * 0.15) * 10) / 10,
        cfo: 0,
        cfoToNetProfit: 90,
        sharesOutstanding: shares,
        eps: 0,
        bvps: 0,
        pe: 11.5,
        pb: 1.7,
        evEbitda: 8.0,
      };
    });
  };

  // Khởi tạo các quý dự phóng ban đầu
  const [forecastQuarters, setForecastQuarters] = useState<ForecastQuarterMetrics[]>(() => {
    if (
      report.sectionForecast8Q?.quarters &&
      report.sectionForecast8Q.quarters.length >= 8 &&
      report.sectionForecast8Q.quarters[3]?.period === q0Item.period &&
      Math.abs((report.sectionForecast8Q.quarters[4]?.grossMargin || 0) - q0Item.grossMargin) < 15
    ) {
      return report.sectionForecast8Q.quarters.slice(4, 8);
    }
    return buildDefaultForecastQuarters(q0Item, sharesCount);
  });

  // Tự động đồng bộ lại khi q0Item (dữ liệu thực tế từ Vietcap IQ API) tải xong hoặc khi đổi mã
  useEffect(() => {
    if (q0Item && q0Item.grossMargin > 0) {
      const expectedQ1 = `${getNextQuarter(q0Item.period || 'Q2/2026')}F`;
      const isPeriodMismatch = forecastQuarters[0]?.period !== expectedQ1;
      const isMarginStale = Math.abs((forecastQuarters[0]?.grossMargin || 0) - q0Item.grossMargin) > 15;
      const isSharesStale = Math.abs((forecastQuarters[0]?.sharesOutstanding || 0) - sharesCount) > 100;

      if (isPeriodMismatch || isMarginStale || isSharesStale) {
        setForecastQuarters(buildDefaultForecastQuarters(q0Item, sharesCount));
      }
    }
  }, [report.ticker, q0Item.period, q0Item.grossMargin, q0Item.ebitdaMargin, q0Item.netMargin, sharesCount]);

  // Tự động tính toán Doanh thu, EBITDA, LNST, CFO, EPS theo Cầu Nối
  const computedForecastQuarters = useMemo(() => {
    let prevRev = suggestedBaselineQ1 + (manualAdjustmentQ1 || 0);
    const result: ForecastQuarterMetrics[] = [];

    forecastQuarters.forEach((fq, idx) => {
      // 1. Tăng trưởng cầu nối = Tổng 4 yếu tố
      const bridgeGrowth =
        Math.round(
          ((fq.impactVolumeCapacity || 0) +
            (fq.impactAverageSellingPrice || 0) +
            (fq.impactMixDemandShare || 0) +
            (fq.impactSeasonalityOther || 0)) *
            10
        ) / 10;

      // 2. Doanh thu tính từ Nền + Cầu nối
      let rev = 0;
      if (idx === 0) {
        rev = Math.round((suggestedBaselineQ1 + (manualAdjustmentQ1 || 0)) * (1 + bridgeGrowth / 100));
      } else {
        rev = Math.round(prevRev * (1 + bridgeGrowth / 100));
      }
      prevRev = rev;

      const normRev = rev - (fq.abnormalRevenue || 0);
      const gm = fq.grossMargin || 14.5;
      const ebM = fq.ebitdaMargin || 14.0;
      const netM = fq.netMargin || 9.5;

      const gpVal = Math.round(normRev * (gm / 100));
      const ebitdaVal = Math.round(normRev * (ebM / 100));
      const npVal = Math.round(normRev * (netM / 100));
      const cfoVal = Math.round(npVal * ((fq.cfoToNetProfit || 90) / 100));
      const epsVal = sharesCount > 0 ? Math.round((npVal * 1e9) / (sharesCount * 1e6)) : 0;
      const bvpsVal = Math.round((q0Item.bvps || 24000) + (epsVal * 0.7 * (idx + 1)));
      const peVal = epsVal > 0 && currentPrice > 0 ? Math.round((currentPrice / (epsVal * 4)) * 10) / 10 : 12.0;
      const pbVal = bvpsVal > 0 && currentPrice > 0 ? Math.round((currentPrice / bvpsVal) * 100) / 100 : 1.6;
      const evVal = ebitdaVal > 0 ? Math.round(((currentPrice * sharesCount * 1e6) / (ebitdaVal * 4 * 1e9)) * 10) / 10 : 7.8;

      result.push({
        ...fq,
        revenue: rev,
        normalizedRevenue: normRev,
        revenueBridgeGrowth: bridgeGrowth,
        revenueGrowthQoQ: bridgeGrowth,
        grossMargin: gm,
        grossProfit: gpVal,
        ebitdaMargin: ebM,
        ebitda: ebitdaVal,
        netProfit: npVal,
        netMargin: netM,
        cfo: cfoVal,
        eps: epsVal,
        bvps: bvpsVal,
        pe: peVal,
        pb: pbVal,
        evEbitda: evVal,
      });
    });

    return result;
  }, [forecastQuarters, suggestedBaselineQ1, manualAdjustmentQ1, sharesCount, currentPrice, q0Item.bvps]);

  // Bảng 8 Quý hoàn chỉnh: 4 Quá khứ + 4 Dự phóng
  const full8Quarters = useMemo(() => {
    return [...historical4Q, ...computedForecastQuarters];
  }, [historical4Q, computedForecastQuarters]);

  // Tổng hợp 4 quý tới (TTM Forward) vs TTM Thực tế
  const ttmHistorical = useMemo(() => {
    const rev = historical4Q.reduce((s, q) => s + q.revenue, 0);
    const gp = historical4Q.reduce((s, q) => s + (q.grossProfit || Math.round(q.revenue * (q.grossMargin / 100))), 0);
    const np = historical4Q.reduce((s, q) => s + q.netProfit, 0);
    const eb = historical4Q.reduce((s, q) => s + q.ebitda, 0);
    const cfo = historical4Q.reduce((s, q) => s + q.cfo, 0);
    const eps = sharesCount > 0 ? Math.round((np * 1e9) / (sharesCount * 1e6)) : 0;
    return { revenue: rev, grossProfit: gp, netProfit: np, ebitda: eb, cfo, eps };
  }, [historical4Q, sharesCount]);

  const ttmForward = useMemo(() => {
    const rev = computedForecastQuarters.reduce((s, q) => s + q.revenue, 0);
    const gp = computedForecastQuarters.reduce((s, q) => s + (q.grossProfit || 0), 0);
    const np = computedForecastQuarters.reduce((s, q) => s + q.netProfit, 0);
    const eb = computedForecastQuarters.reduce((s, q) => s + q.ebitda, 0);
    const cfo = computedForecastQuarters.reduce((s, q) => s + q.cfo, 0);
    const eps = sharesCount > 0 ? Math.round((np * 1e9) / (sharesCount * 1e6)) : 0;
    const revGrowth = ttmHistorical.revenue > 0 ? Math.round(((rev - ttmHistorical.revenue) / ttmHistorical.revenue) * 1000) / 10 : 0;
    const npGrowth = ttmHistorical.netProfit > 0 ? Math.round(((np - ttmHistorical.netProfit) / ttmHistorical.netProfit) * 1000) / 10 : 0;
    const gpGrowth = ttmHistorical.grossProfit > 0 ? Math.round(((gp - ttmHistorical.grossProfit) / ttmHistorical.grossProfit) * 1000) / 10 : 0;
    return { revenue: rev, grossProfit: gp, netProfit: np, ebitda: eb, cfo, eps, revenueGrowthYoY: revGrowth, netProfitGrowthYoY: npGrowth, grossProfitGrowthYoY: gpGrowth };
  }, [computedForecastQuarters, ttmHistorical, sharesCount]);

  // Kiểm tra tính nhất quán & Thống kê 3 Biên lợi nhuận (Nền lịch sử vs Dự phóng)
  const isQ0BaselineValid = Object.values(conditionsCheck).every(Boolean);
  const avgHistGrossMargin = Math.round((historical4Q.reduce((s, q) => s + q.grossMargin, 0) / Math.max(1, historical4Q.length)) * 10) / 10;
  const avgHistEbitdaMargin = Math.round((historical4Q.reduce((s, q) => s + q.ebitdaMargin, 0) / Math.max(1, historical4Q.length)) * 10) / 10;
  const avgHistNetMargin = Math.round((historical4Q.reduce((s, q) => s + q.netMargin, 0) / Math.max(1, historical4Q.length)) * 10) / 10;

  const avgForeGrossMargin = Math.round((computedForecastQuarters.reduce((s, q) => s + q.grossMargin, 0) / Math.max(1, computedForecastQuarters.length)) * 10) / 10;
  const avgForeEbitdaMargin = Math.round((computedForecastQuarters.reduce((s, q) => s + q.ebitdaMargin, 0) / Math.max(1, computedForecastQuarters.length)) * 10) / 10;
  const avgForeNetMargin = Math.round((computedForecastQuarters.reduce((s, q) => s + q.netMargin, 0) / Math.max(1, computedForecastQuarters.length)) * 10) / 10;
  const marginExpansion = Math.round((avgForeGrossMargin - avgHistGrossMargin) * 10) / 10;

  const cfoToNpRatioForward = ttmForward.netProfit > 0 ? Math.round((ttmForward.cfo / ttmForward.netProfit) * 100) : 90;

  // Xác định cơ cấu doanh thu theo sản phẩm/mảng từ Tab B (Chuỗi giá trị - Đầu ra) hoặc fallback mã
  const productMix = useMemo(() => {
    if (report.sectionB?.revenueBreakdown && report.sectionB.revenueBreakdown.length > 0) {
      return report.sectionB.revenueBreakdown;
    }
    const t = report.ticker.toUpperCase();
    if (t === 'HPG') {
      return [
        { name: 'Thép xây dựng', value: 62 },
        { name: 'Thép cuộn cán nóng (HRC)', value: 28 },
        { name: 'Ống thép & Tôn mạ', value: 8 },
        { name: 'Nông nghiệp & Khác', value: 2 },
      ];
    }
    if (t === 'FPT') {
      return [
        { name: 'Xuất khẩu phần mềm (Global IT)', value: 55 },
        { name: 'Dịch vụ Viễn thông', value: 35 },
        { name: 'Giáo dục & Khác', value: 10 },
      ];
    }
    if (t === 'MWG') {
      return [
        { name: 'Điện Máy Xanh', value: 48 },
        { name: 'Bách Hóa Xanh', value: 28 },
        { name: 'Thế Giới Di Động', value: 20 },
        { name: 'Khác', value: 4 },
      ];
    }
    if (t === 'PHP') {
      return [
        { name: 'Dịch vụ Cảng & Xếp dỡ container (Tân Vũ, Hoàng Diệu, Chùa Vẽ)', value: 78 },
        { name: 'Dịch vụ Logistics & Kho bãi (CFS, Depot)', value: 14 },
        { name: 'Dịch vụ Hoa tiêu, Lai dắt tàu & Khác', value: 8 },
      ];
    }
    return [
      { name: 'Mảng kinh doanh cốt lõi 1', value: 60 },
      { name: 'Mảng kinh doanh cốt lõi 2', value: 25 },
      { name: 'Mảng khác', value: 15 },
    ];
  }, [report.ticker, report.sectionB?.revenueBreakdown]);

  const coreSegments = useMemo(() => {
    const sorted = [...productMix].sort((a, b) => b.value - a.value);
    const top1 = sorted[0];
    const top2 = sorted[1];
    if (top1 && top1.value >= 75) return [top1];
    if (top1 && top2) return [top1, top2];
    return sorted.slice(0, 2);
  }, [productMix]);

  const coreRevenueShare = useMemo(() => {
    return coreSegments.reduce((sum, s) => sum + s.value, 0);
  }, [coreSegments]);

  // Cập nhật giá trị ô dự phóng
  const handleUpdateForecastCell = (quarterIdx: number, field: keyof ForecastQuarterMetrics, value: number) => {
    setForecastQuarters((prev) => {
      const next = [...prev];
      next[quarterIdx] = {
        ...next[quarterIdx],
        [field]: value,
      };
      return next;
    });
  };

  // Đồng bộ số liệu sang Tab Định Giá (ValuationCalculator)
  const handleSyncToValuation = () => {
    const updatedReport: AnalysisReport = {
      ...report,
      sectionForecast8Q: {
        baseline: {
          growthScore,
          growthTier,
          suggestedMode,
          q0NormalizedRevenue: q0Item.normalizedRevenue,
          avg3QRevenue,
          avg4QRevenue,
          suggestedBaselineQ1,
          manualAdjustmentQ1,
          finalBaselineQ1: suggestedBaselineQ1 + manualAdjustmentQ1,
          conditionsCheck,
        },
        capacity: capacityData,
        quarters: full8Quarters,
        ttmForward,
        consistencyCheck: {
          growthScoreVsForecast: `${growthScore}/60 (${growthTier}) tương thích với mức tăng trưởng LNST ${ttmForward.netProfitGrowthYoY}%`,
          isQ0BaselineValid,
          marginEvaluation: `Biên gộp dự phóng ${avgForeGrossMargin}% so với lịch sử ${avgHistGrossMargin}% (chênh lệch ${marginExpansion > 0 ? '+' : ''}${marginExpansion}%)`,
          cfoConversionEvaluation: `Tỷ lệ chuyển đổi dòng tiền CFO/LNST đạt ${cfoToNpRatioForward}% (yêu cầu >= 80%)`,
          finalConclusion: isQ0BaselineValid ? 'Kế hoạch dự phóng Hợp lệ & Nhất quán' : 'Cần thận trọng - Nền Q0 chưa đạt đủ 6 điều kiện',
        },
      },
      sectionF: {
        ...report.sectionF,
        valuation: {
          ...report.sectionF?.valuation,
          year1: parseInt(q1Period.split('/')[1] || '2026', 10),
          year2: parseInt(q4Period.split('/')[1] || '2027', 10),
          sharesOutstanding: sharesCount,
          forecastNetProfitQ1: computedForecastQuarters[0]?.netProfit || 0,
          forecastNetProfitQ2: computedForecastQuarters[1]?.netProfit || 0,
          forecastNetProfitQ3: computedForecastQuarters[2]?.netProfit || 0,
          forecastNetProfitQ4: computedForecastQuarters[3]?.netProfit || 0,
          totalForecastProfit: ttmForward.netProfit,
          epsForward: ttmForward.eps,
          forecastYear1Data: {
            q1: { revenue: computedForecastQuarters[0]?.revenue || 0, grossMargin: computedForecastQuarters[0]?.grossMargin || 0, netProfit: computedForecastQuarters[0]?.netProfit || 0 },
            q2: { revenue: computedForecastQuarters[1]?.revenue || 0, grossMargin: computedForecastQuarters[1]?.grossMargin || 0, netProfit: computedForecastQuarters[1]?.netProfit || 0 },
            q3: { revenue: computedForecastQuarters[2]?.revenue || 0, grossMargin: computedForecastQuarters[2]?.grossMargin || 0, netProfit: computedForecastQuarters[2]?.netProfit || 0 },
            q4: { revenue: computedForecastQuarters[3]?.revenue || 0, grossMargin: computedForecastQuarters[3]?.grossMargin || 0, netProfit: computedForecastQuarters[3]?.netProfit || 0 },
          },
        },
      },
    };

    onUpdateReport(updatedReport);
    if (onNavigateToValuation) {
      onNavigateToValuation();
    }
  };

  return (
    <div className="space-y-8 font-sans text-slate-800 dark:text-gray-200">
      {/* 📌 KHỐI 1: XÁC ĐỊNH MẢNG KINH DOANH CHÍNH (>75% DOANH THU) & NỀN THAM CHIẾU */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900/40 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span>📌 KHỐI 1: XÁC ĐỊNH MẢNG KINH DOANH CHÍNH (&gt;75% DOANH THU) &amp; NỀN THAM CHIẾU</span>
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="text-slate-800 dark:text-gray-200">
                • <strong>Mảng chính:</strong>{' '}
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                  {coreSegments.map((s) => `${s.name} (Tỷ trọng: ${s.value}%)`).join(' | ')}
                </span>{' '}
                | Mảng khác: <span className="text-slate-500 font-medium">{100 - coreRevenueShare}%</span>
              </div>
              <div className="text-slate-800 dark:text-gray-200">
                • <strong>Nền Doanh thu Q0 chuẩn hóa:</strong>{' '}
                <span className="font-extrabold text-slate-900 dark:text-white">{q0Item.normalizedRevenue.toLocaleString('vi-VN')} tỷ</span> |{' '}
                Chế độ:{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{suggestedMode}</span>{' '}
                (Chất lượng tăng trưởng: <strong>{growthScore}/60đ</strong> - Xếp Hạng{' '}
                <strong className="text-emerald-600">{growthTier}</strong>)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-gray-400 block">Nền Tham Chiếu Q+1</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                {suggestedBaselineQ1.toLocaleString('vi-VN')} tỷ đồng
              </span>
            </div>
            <button
              onClick={handleSyncToValuation}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Đồng Bộ Sang Định Giá</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>
        </div>

        {/* Khối Checklist 6 Điều Kiện Nền Mới Q0 */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800 dark:text-gray-200">
              Kiểm tra 6 điều kiện để Q0 được coi là &ldquo;Nền Mới&rdquo;
            </span>
            <span className={`text-[11px] font-medium ${isQ0BaselineValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isQ0BaselineValid ? '✓ Đạt đủ 6/6 điều kiện' : '⚠ Thiếu điều kiện → Khuyến nghị hạ về Pha Trộn/Thận Trọng'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {[
              { id: 'coreOperationDriven', label: '1. Tăng trưởng từ HĐKD cốt lõi' },
              { id: 'orderAndDemandConfirmed', label: '2. Đơn hàng/công suất xác nhận ≥ 2 quý' },
              { id: 'factoryRampUpAligned', label: '3. Nhà máy mới vận hành & hấp thụ phù hợp' },
              { id: 'marginNotAnomaly', label: '4. Biên LN không đột biến khó lặp lại' },
              { id: 'workingCapitalHealthy', label: '5. Vốn lưu động & CFO không xấu bất thường' },
              { id: 'notLowBaseDependent', label: '6. Không phụ thuộc nền thấp / bất thường' },
            ].map((cond) => (
              <label
                key={cond.id}
                className="flex items-center space-x-2.5 cursor-pointer select-none py-1 hover:text-slate-900 dark:hover:text-white transition"
              >
                <input
                  type="checkbox"
                  checked={conditionsCheck[cond.id as keyof typeof conditionsCheck]}
                  onChange={(e) =>
                    setConditionsCheck((prev) => ({
                      ...prev,
                      [cond.id]: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-slate-700 dark:text-gray-300">{cond.label}</span>
              </label>
            ))}
          </div>

          {/* Điều chỉnh thủ công nền Q+1 */}
          <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
            <span className="text-slate-600 dark:text-gray-400 font-medium shrink-0">
              Điều chỉnh thủ công nền Q+1 (nếu có mùa vụ/xúc tác đặc thù):
            </span>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={manualAdjustmentQ1 || ''}
                onChange={(e) => setManualAdjustmentQ1(parseFloat(e.target.value) || 0)}
                placeholder="± tỷ VNĐ"
                className="w-28 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500 text-[11px]">tỷ đồng</span>
            </div>
            <input
              type="text"
              value={manualAdjustmentNote}
              onChange={(e) => setManualAdjustmentNote(e.target.value)}
              placeholder="Ghi chú lý do điều chỉnh thủ công..."
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Phân tích công suất hiện hữu & Nhà máy mới */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Factory className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                Phân tích công suất hiện hữu &amp; Dự án mở rộng
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={capacityData.hasNewFactory}
                  onChange={(e) => setCapacityData({ ...capacityData, hasNewFactory: e.target.checked })}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-slate-700 dark:text-gray-300 font-medium">Có nhà máy / bến cảng mới</span>
              </label>
              <button
                onClick={() => setIsCapacityExpanded(!isCapacityExpanded)}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
              >
                <span>{isCapacityExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                {isCapacityExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {capacityData.hasNewFactory && isCapacityExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Công suất thiết kế hiện hữu</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={capacityData.existingDesignCapacity}
                      onChange={(e) => setCapacityData({ ...capacityData, existingDesignCapacity: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-500 shrink-0 text-[11px]">{capacityData.capacityUnit}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Tỷ lệ sử dụng công suất ở Q0</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={capacityData.existingUtilizationRateQ0}
                      onChange={(e) => setCapacityData({ ...capacityData, existingUtilizationRateQ0: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-500 shrink-0 text-[11px]">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Công suất mới bổ sung</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={capacityData.newDesignCapacity}
                      onChange={(e) => setCapacityData({ ...capacityData, newDesignCapacity: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-500 shrink-0 text-[11px]">{capacityData.capacityUnit}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Quý COD dự kiến</label>
                  <input
                    type="text"
                    value={capacityData.commercialOperationQuarter}
                    onChange={(e) => setCapacityData({ ...capacityData, commercialOperationQuarter: e.target.value })}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Tổng vốn đầu tư (tỷ VNĐ)</label>
                  <input
                    type="number"
                    value={capacityData.totalInvestmentCapital || ''}
                    onChange={(e) => setCapacityData({ ...capacityData, totalInvestmentCapital: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Nguồn tài trợ chính</label>
                  <input
                    type="text"
                    value={capacityData.mainFundingSource || ''}
                    onChange={(e) => setCapacityData({ ...capacityData, mainFundingSource: e.target.value })}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {capacityData.progressNote && (
                <p className="text-[11px] text-slate-600 dark:text-gray-400 italic">
                  * Ghi chú tiến độ &amp; pháp lý: {capacityData.progressNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 📌 KHỐI 2: MA TRẬN 8 QUÝ (Q-3 → Q0 THỰC TẾ | Q+1 → Q+4 DỰ PHÓNG) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              KHỐI 2: MA TRẬN 8 QUÝ (Q-3 → Q0 THỰC TẾ | Q+1 → Q+4 DỰ PHÓNG)
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-gray-400">
            <span>Dự phóng 3 biên: TB 4Q lịch sử ± Triển vọng ngành</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-850/80 font-semibold text-slate-700 dark:text-gray-300">
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[220px]">Chỉ tiêu (tỷ đồng / %)</th>
                <th className="py-2.5 px-2 text-center w-12">ĐVT</th>
                {/* 4 Quý thực tế */}
                {historical4Q.map((q, i) => (
                  <th key={i} className="py-2.5 px-3 text-right bg-slate-100/50 dark:bg-slate-950/20 whitespace-nowrap">
                    {i === historical4Q.length - 1 ? 'Q0' : `Q-${historical4Q.length - 1 - i}`}
                    <span className="block text-[9px] font-normal text-slate-500">
                      {q.period} {i === historical4Q.length - 1 ? '(Thực tế)' : ''}
                    </span>
                  </th>
                ))}
                {/* 4 Quý dự phóng */}
                {computedForecastQuarters.map((q, i) => (
                  <th key={i} className="py-2.5 px-3 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    Q+{i + 1}(F)
                    <span className="block text-[9px] font-normal text-emerald-600/80">
                      {q.period}
                    </span>
                  </th>
                ))}
                {/* 2 Cột tổng hợp */}
                <th className="py-2.5 px-3 text-right bg-gray-100/70 dark:bg-gray-850 whitespace-nowrap">
                  TTM 4Q Tới
                  <span className="block text-[9px] font-normal text-slate-500">Forward</span>
                </th>
                <th className="py-2.5 px-3 text-right bg-gray-100/70 dark:bg-gray-850 whitespace-nowrap">
                  Tăng trưởng
                  <span className="block text-[9px] font-normal text-slate-500">YoY %</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {/* ==================== 1. DOANH THU THUẦN ==================== */}
              <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-850/50 font-bold text-slate-900 dark:text-white">
                <td className="py-2 px-3">1. Doanh thu thuần</td>
                <td className="py-2 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/30 dark:bg-slate-950/10">
                    {q.revenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50/30 dark:bg-emerald-950/15">
                    {q.revenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-extrabold bg-gray-50/60 dark:bg-gray-850/40">
                  {ttmForward.revenue.toLocaleString('vi-VN')}
                </td>
                <td className={`py-2 px-3 text-right tabular-nums font-extrabold ${ttmForward.revenueGrowthYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ttmForward.revenueGrowthYoY > 0 ? `+${ttmForward.revenueGrowthYoY}%` : `${ttmForward.revenueGrowthYoY}%`}
                </td>
              </tr>

              {/* Điều chỉnh DT bất thường không lặp lại */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-1.5 px-3 pl-6 text-[11px]">- Điều chỉnh DT bất thường không lặp lại</td>
                <td className="py-1.5 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.abnormalRevenue ? `-${q.abnormalRevenue}` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      value={q.abnormalRevenue || ''}
                      onChange={(e) => handleUpdateForecastCell(i, 'abnormalRevenue', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 text-right rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* Doanh thu chuẩn hóa */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-800 dark:text-gray-300 font-medium">
                <td className="py-1.5 px-3 pl-6">- Doanh thu chuẩn hóa</td>
                <td className="py-1.5 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.normalizedRevenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums font-semibold bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400">
                    {q.normalizedRevenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right tabular-nums font-semibold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.revenue.toLocaleString('vi-VN')}
                </td>
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Ảnh hưởng Sản lượng % */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-8 text-slate-700 dark:text-gray-300">• Ảnh hưởng Sản lượng %</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums text-slate-400">
                    {i === historical4Q.length - 1 && q.impactVolumeCapacity ? `+${q.impactVolumeCapacity}%` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      step="0.1"
                      value={q.impactVolumeCapacity || 0}
                      onChange={(e) => handleUpdateForecastCell(i, 'impactVolumeCapacity', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Ảnh hưởng Giá bán ASP % */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-8 text-slate-700 dark:text-gray-300">• Ảnh hưởng Giá bán ASP %</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums text-slate-400">
                    {i === historical4Q.length - 1 && q.impactAverageSellingPrice ? `+${q.impactAverageSellingPrice}%` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      step="0.1"
                      value={q.impactAverageSellingPrice || 0}
                      onChange={(e) => handleUpdateForecastCell(i, 'impactAverageSellingPrice', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Ảnh hưởng Cơ cấu/Cầu % */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-8 text-slate-700 dark:text-gray-300">• Ảnh hưởng Cơ cấu/Cầu %</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums text-slate-400">
                    {i === historical4Q.length - 1 && q.impactMixDemandShare ? `+${q.impactMixDemandShare}%` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      step="0.1"
                      value={q.impactMixDemandShare || 0}
                      onChange={(e) => handleUpdateForecastCell(i, 'impactMixDemandShare', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Ảnh hưởng Mùa vụ % */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-8 text-slate-700 dark:text-gray-300">• Ảnh hưởng Mùa vụ %</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums text-slate-400">
                    {i === historical4Q.length - 1 && q.impactSeasonalityOther ? `+${q.impactSeasonalityOther}%` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      step="0.1"
                      value={q.impactSeasonalityOther || 0}
                      onChange={(e) => handleUpdateForecastCell(i, 'impactSeasonalityOther', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* = Tăng trưởng QoQ % */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/25 dark:bg-emerald-950/20">
                <td className="py-2 px-3 pl-6">= Tăng trưởng QoQ %</td>
                <td className="py-2 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10 text-slate-700 dark:text-gray-300">
                    {q.revenueGrowthQoQ ? `${q.revenueGrowthQoQ > 0 ? '+' : ''}${q.revenueGrowthQoQ}%` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums font-extrabold text-emerald-700 dark:text-emerald-300">
                    {(q.revenueBridgeGrowth ?? 0) > 0 ? `+${q.revenueBridgeGrowth}%` : `${q.revenueBridgeGrowth ?? 0}%`}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* ==================== 2. BIÊN LỢI NHUẬN (%) ==================== */}
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-gray-200">
                <td colSpan={12} className="py-2 px-3 text-xs tracking-wider uppercase font-bold text-slate-800 dark:text-gray-100">
                  2. Biên Lợi Nhuận (%)
                </td>
              </tr>

              {/* - Biên Lợi Nhuận Gộp */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-800 dark:text-gray-200">
                <td className="py-2 px-3 pl-6 font-medium">- Biên Lợi Nhuận Gộp</td>
                <td className="py-2 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.grossMargin}%
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      step="0.1"
                      value={q.grossMargin || 0}
                      onChange={(e) => handleUpdateForecastCell(i, 'grossMargin', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-semibold bg-gray-50/50 dark:bg-gray-850/30">
                  {avgForeGrossMargin}%
                </td>
                <td className={`py-2 px-3 text-right tabular-nums font-semibold ${marginExpansion >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {marginExpansion > 0 ? `+${marginExpansion}%` : `${marginExpansion}%`}
                </td>
              </tr>

              {/* - Biên EBITDA */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3 pl-6 font-medium">- Biên EBITDA</td>
                <td className="py-2 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.ebitdaMargin}%
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      step="0.1"
                      value={q.ebitdaMargin || 0}
                      onChange={(e) => handleUpdateForecastCell(i, 'ebitdaMargin', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums bg-gray-50/50 dark:bg-gray-850/30">
                  {avgForeEbitdaMargin}%
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Biên LNST Cốt Lõi */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3 pl-6 font-medium">- Biên LNST Cốt Lõi</td>
                <td className="py-2 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.netMargin}%
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      step="0.1"
                      value={q.netMargin || 0}
                      onChange={(e) => handleUpdateForecastCell(i, 'netMargin', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums bg-gray-50/50 dark:bg-gray-850/30">
                  {avgForeNetMargin}%
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* ==================== 3. LỢI NHUẬN & DÒNG TIỀN ==================== */}
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-gray-200">
                <td colSpan={12} className="py-2 px-3 text-xs tracking-wider uppercase font-bold text-slate-800 dark:text-gray-100">
                  3. Lợi Nhuận &amp; Dòng Tiền (tỷ đồng / đồng/cp)
                </td>
              </tr>

              {/* - Lợi nhuận gộp */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-semibold text-slate-900 dark:text-white">
                <td className="py-2 px-3 pl-6">- Lợi nhuận gộp</td>
                <td className="py-2 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {(q.grossProfit || Math.round(q.revenue * (q.grossMargin / 100))).toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300 font-bold">
                    {(q.grossProfit || 0).toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-bold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.grossProfit.toLocaleString('vi-VN')}
                </td>
                <td className={`py-2 px-3 text-right tabular-nums font-bold ${ttmForward.grossProfitGrowthYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ttmForward.grossProfitGrowthYoY > 0 ? `+${ttmForward.grossProfitGrowthYoY}%` : `${ttmForward.grossProfitGrowthYoY}%`}
                </td>
              </tr>

              {/* - EBITDA */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-semibold text-slate-900 dark:text-white">
                <td className="py-2 px-3 pl-6">- EBITDA</td>
                <td className="py-2 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.ebitda.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300">
                    {q.ebitda.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-bold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.ebitda.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - LNST Cốt Lõi */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-extrabold text-slate-900 dark:text-white bg-slate-100/30 dark:bg-slate-900/30">
                <td className="py-2.5 px-3 pl-6 text-emerald-900 dark:text-emerald-300">- LNST Cốt Lõi</td>
                <td className="py-2.5 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.netProfit.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2.5 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    {q.netProfit.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right tabular-nums font-extrabold text-emerald-700 dark:text-emerald-400 bg-gray-100/70 dark:bg-gray-850">
                  {ttmForward.netProfit.toLocaleString('vi-VN')}
                </td>
                <td className={`py-2.5 px-3 text-right tabular-nums font-extrabold ${ttmForward.netProfitGrowthYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ttmForward.netProfitGrowthYoY > 0 ? `+${ttmForward.netProfitGrowthYoY}%` : `${ttmForward.netProfitGrowthYoY}%`}
                </td>
              </tr>

              {/* - Dòng tiền KD (CFO) */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3 pl-6">- Dòng tiền KD (CFO)</td>
                <td className="py-2 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.cfo.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-600">
                    {q.cfo.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-semibold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.cfo.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* Tỷ lệ CFO / LNST cốt lõi */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-1.5 px-3 pl-8 text-[11px]">• Tỷ lệ CFO / LNST cốt lõi</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.cfoToNetProfit}%
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      value={q.cfoToNetProfit || 90}
                      onChange={(e) => handleUpdateForecastCell(i, 'cfoToNetProfit', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right tabular-nums bg-gray-50/50 dark:bg-gray-850/30">
                  {cfoToNpRatioForward}%
                </td>
                <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Số CP pha loãng */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-2 px-3 pl-6">- Số CP pha loãng</td>
                <td className="py-2 px-2 text-center text-slate-500">triệu</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.sharesOutstanding.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-emerald-50/20 dark:bg-emerald-950/10">
                    {q.sharesOutstanding.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums bg-gray-50/50 dark:bg-gray-850/30">
                  {sharesCount.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - EPS Cốt Lõi (đồng/cp) */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-extrabold text-slate-900 dark:text-white">
                <td className="py-2 px-3 pl-6">- EPS Cốt Lõi</td>
                <td className="py-2 px-2 text-center text-slate-500">đ/cp</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.eps.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/20 dark:bg-emerald-950/10">
                    {q.eps.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400 bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.eps.toLocaleString('vi-VN')}
                </td>
                <td className={`py-2 px-3 text-right tabular-nums font-bold ${ttmForward.netProfitGrowthYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ttmForward.netProfitGrowthYoY > 0 ? `+${ttmForward.netProfitGrowthYoY}%` : `${ttmForward.netProfitGrowthYoY}%`}
                </td>
              </tr>

              {/* ==================== 4. HỆ SỐ ĐỊNH GIÁ & BỘI SỐ ==================== */}
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-gray-200">
                <td colSpan={12} className="py-2 px-3 text-xs tracking-wider uppercase font-bold text-slate-800 dark:text-gray-100">
                  4. Hệ Số Định Giá &amp; Bội Số Theo Kỳ
                </td>
              </tr>

              {/* - BVPS */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-2 px-3 pl-6">- Giá trị sổ sách / CP (BVPS)</td>
                <td className="py-2 px-2 text-center text-slate-500">đ/cp</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.bvps?.toLocaleString('vi-VN') || '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-emerald-50/20 dark:bg-emerald-950/10">
                    {q.bvps?.toLocaleString('vi-VN') || '-'}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums bg-gray-50/50 dark:bg-gray-850/30">
                  {computedForecastQuarters[3]?.bvps?.toLocaleString('vi-VN') || '-'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Hệ số P/E */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3 pl-6">- Hệ số P/E</td>
                <td className="py-2 px-2 text-center text-slate-500">lần</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.pe}x
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                    {q.pe}x
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-bold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.eps > 0 && currentPrice > 0 ? `${Math.round((currentPrice / ttmForward.eps) * 10) / 10}x` : '11.2x'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Hệ số P/B */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3 pl-6">- Hệ số P/B</td>
                <td className="py-2 px-2 text-center text-slate-500">lần</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.pb}x
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                    {q.pb}x
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-bold bg-gray-50/50 dark:bg-gray-850/30">
                  {computedForecastQuarters[3]?.bvps && currentPrice > 0
                    ? `${Math.round((currentPrice / computedForecastQuarters[3].bvps!) * 100) / 100}x`
                    : '1.5x'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* - Hệ số EV/EBITDA */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3 pl-6">- Hệ số EV/EBITDA</td>
                <td className="py-2 px-2 text-center text-slate-500">lần</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.evEbitda}x
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                    {q.evEbitda}x
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-bold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.ebitda > 0 && currentPrice > 0
                    ? `${Math.round(((currentPrice * sharesCount * 1e6) / (ttmForward.ebitda * 1e9)) * 10) / 10}x`
                    : '7.5x'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 📌 KHỐI 4: HỆ SỐ ĐỊNH GIÁ FORWARD (BẢNG TỔNG KẾT VALUEX STANDARD) */}
      <div className="border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>4. HỆ SỐ ĐỊNH GIÁ FORWARD (TTM 4 QUÝ TỚI)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-white dark:bg-gray-900 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-slate-500 dark:text-gray-400 block text-[11px] font-medium">TTM LNST 4 quý tới:</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              {ttmForward.netProfit.toLocaleString('vi-VN')} tỷ{' '}
              <span className={`text-xs font-bold ${ttmForward.netProfitGrowthYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ({ttmForward.netProfitGrowthYoY > 0 ? `+${ttmForward.netProfitGrowthYoY}%` : `${ttmForward.netProfitGrowthYoY}%`} YoY so với TTM thực tế {ttmHistorical.netProfit.toLocaleString('vi-VN')} tỷ)
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-white dark:bg-gray-900 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-slate-500 dark:text-gray-400 block text-[11px] font-medium">TTM EPS 4 quý tới &amp; P/E Forward:</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              {ttmForward.eps.toLocaleString('vi-VN')} đ/cp{' '}
              <span className="text-xs font-bold text-emerald-600">
                | P/E Forward: {ttmForward.eps > 0 && currentPrice > 0 ? `${Math.round((currentPrice / ttmForward.eps) * 10) / 10}x` : '10.5x'}{' '}
                (so với Trailing {ttmHistorical.eps > 0 && currentPrice > 0 ? `${Math.round((currentPrice / ttmHistorical.eps) * 10) / 10}x` : '12.5x'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TỔNG HỢP 4 QUÝ DỰ PHÓNG & KIỂM TRA TÍNH NHẤT QUÁN */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Kiểm Tra Tính Nhất Quán &amp; Đánh Giá Mức Độ Khả Thi
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Kiểm tra 1 */}
          <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <span className="text-[11px] text-slate-500 block mb-1">Điểm Tăng Trưởng vs Dự Báo</span>
            <div className="font-semibold text-slate-900 dark:text-white">
              {growthScore}/60 ({growthTier})
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-1">
              LNST forward tăng {ttmForward.netProfitGrowthYoY}%: {growthScore >= 36 ? 'Phù hợp với nền tảng tăng trưởng.' : 'Cần thận trọng vì điểm dưới 36.'}
            </p>
          </div>

          {/* Kiểm tra 2 */}
          <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <span className="text-[11px] text-slate-500 block mb-1">Tính Hợp Lệ Nền Q0</span>
            <div className={`font-semibold ${isQ0BaselineValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
              {isQ0BaselineValid ? '✓ Nền Mới Hợp Lệ' : '⚠ Chưa Đạt Đủ 6 Điều Kiện'}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-1">
              {isQ0BaselineValid ? 'Đã kiểm tra chéo HĐKD cốt lõi và đơn hàng.' : 'Nên hạ về Pha Trộn hoặc Thận Trọng.'}
            </p>
          </div>

          {/* Kiểm tra 3 */}
          <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <span className="text-[11px] text-slate-500 block mb-1">Độ Bền Biên Lợi Nhuận</span>
            <div className="font-semibold text-slate-900 dark:text-white">
              Biên gộp: {avgForeGrossMargin}% ({marginExpansion > 0 ? `+${marginExpansion}%` : `${marginExpansion}%`})
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-1">
              {Math.abs(marginExpansion) <= 2.5 ? 'Biên ổn định, nằm trong dung sai cho phép.' : 'Biên thay đổi lớn, cần giải trình động lực.'}
            </p>
          </div>

          {/* Kiểm tra 4 */}
          <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <span className="text-[11px] text-slate-500 block mb-1">Chuyển Đổi Lợi Nhuận Ra Tiền</span>
            <div className={`font-semibold ${cfoToNpRatioForward >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
              CFO / LNST: {cfoToNpRatioForward}%
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-1">
              {cfoToNpRatioForward >= 80 ? '✓ Đạt chuẩn chuyển đổi dòng tiền (≥80%).' : 'Cảnh báo: Dòng tiền chưa bắt kịp lợi nhuận.'}
            </p>
          </div>
        </div>

        {/* Nút hành động cuối trang */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 italic">
            * Dữ liệu TTM Forward sẽ được tự động truyền sang mô hình Định giá (P/E, P/B, EV/EBITDA, DCF) tại Tab Định Giá.
          </p>
          <button
            onClick={handleSyncToValuation}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-sm"
          >
            <span>Lưu &amp; Chuyển Sang Tab Định Giá</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
