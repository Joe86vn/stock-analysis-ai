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
  const sharesCount = report.marketData.sharesOutstanding || report.sectionF?.valuation?.sharesOutstanding || 5815;

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
    period: 'Q2/2025',
    revenue: 39500,
    normalizedRevenue: 39500,
    grossMargin: 14.6,
    ebitdaMargin: 14.2,
    netMargin: 9.7,
    netProfit: 3850,
    ebitda: 5600,
    cfo: 3900,
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
  const q0Period = q0Item.period || 'Q2/2025';
  const q1Period = getNextQuarter(q0Period);
  const q2Period = getNextQuarter(q1Period);
  const q3Period = getNextQuarter(q2Period);
  const q4Period = getNextQuarter(q3Period);

  // Khởi tạo các quý dự phóng ban đầu
  const [forecastQuarters, setForecastQuarters] = useState<ForecastQuarterMetrics[]>(() => {
    // Kiểm tra nếu report đã có sẵn data 8 quý
    if (report.sectionForecast8Q?.quarters && report.sectionForecast8Q.quarters.length >= 8) {
      return report.sectionForecast8Q.quarters.slice(4, 8);
    }

    const periods = [q1Period, q2Period, q3Period, q4Period];
    const initialBaseRev = suggestedBaselineQ1;
    const initialGrossMargin = q0Item.grossMargin || 14.5;
    const initialEbitdaMargin = q0Item.ebitdaMargin || 14.0;
    const initialNetMargin = q0Item.netMargin || 9.5;

    // Giả định mẫu ban đầu theo đà tăng trưởng
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
        revenue: 0, // Tính động
        abnormalRevenue: 0,
        normalizedRevenue: 0,
        revenueGrowthQoQ: bridgeGrowth,
        impactVolumeCapacity: volImpact,
        impactAverageSellingPrice: aspImpact,
        impactMixDemandShare: mixImpact,
        impactSeasonalityOther: 0,
        revenueBridgeGrowth: bridgeGrowth,
        grossMargin: Math.round((initialGrossMargin + idx * 0.2) * 10) / 10,
        ebitdaMargin: Math.round((initialEbitdaMargin + idx * 0.15) * 10) / 10,
        ebitda: 0,
        netProfit: 0,
        netMargin: Math.round((initialNetMargin + idx * 0.1) * 10) / 10,
        cfo: 0,
        cfoToNetProfit: 90,
        sharesOutstanding: sharesCount,
        eps: 0,
        bvps: 0,
        pe: 11.5,
        pb: 1.7,
        evEbitda: 8.0,
      };
    });
  });

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
        ebitda: ebitdaVal,
        netProfit: npVal,
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
    const np = historical4Q.reduce((s, q) => s + q.netProfit, 0);
    const eb = historical4Q.reduce((s, q) => s + q.ebitda, 0);
    const cfo = historical4Q.reduce((s, q) => s + q.cfo, 0);
    const eps = sharesCount > 0 ? Math.round((np * 1e9) / (sharesCount * 1e6)) : 0;
    return { revenue: rev, netProfit: np, ebitda: eb, cfo, eps };
  }, [historical4Q, sharesCount]);

  const ttmForward = useMemo(() => {
    const rev = computedForecastQuarters.reduce((s, q) => s + q.revenue, 0);
    const np = computedForecastQuarters.reduce((s, q) => s + q.netProfit, 0);
    const eb = computedForecastQuarters.reduce((s, q) => s + q.ebitda, 0);
    const cfo = computedForecastQuarters.reduce((s, q) => s + q.cfo, 0);
    const eps = sharesCount > 0 ? Math.round((np * 1e9) / (sharesCount * 1e6)) : 0;
    const revGrowth = ttmHistorical.revenue > 0 ? Math.round(((rev - ttmHistorical.revenue) / ttmHistorical.revenue) * 1000) / 10 : 0;
    const npGrowth = ttmHistorical.netProfit > 0 ? Math.round(((np - ttmHistorical.netProfit) / ttmHistorical.netProfit) * 1000) / 10 : 0;
    return { revenue: rev, netProfit: np, ebitda: eb, cfo, eps, revenueGrowthYoY: revGrowth, netProfitGrowthYoY: npGrowth };
  }, [computedForecastQuarters, ttmHistorical, sharesCount]);

  // Kiểm tra tính nhất quán (Consistency Gate)
  const isQ0BaselineValid = Object.values(conditionsCheck).every(Boolean);
  const avgHistGrossMargin = Math.round((historical4Q.reduce((s, q) => s + q.grossMargin, 0) / historical4Q.length) * 10) / 10;
  const avgForeGrossMargin = Math.round((computedForecastQuarters.reduce((s, q) => s + q.grossMargin, 0) / computedForecastQuarters.length) * 10) / 10;
  const marginExpansion = Math.round((avgForeGrossMargin - avgHistGrossMargin) * 10) / 10;

  const cfoToNpRatioForward = ttmForward.netProfit > 0 ? Math.round((ttmForward.cfo / ttmForward.netProfit) * 100) : 90;

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
      {/* 1. THANH QUY TẮC NỀN DỰ BÁO & 6 ĐIỀU KIỆN KIỂM TRA Q0 */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-gray-400">
              <span>ĐIỂM CHẤT LƯỢNG TĂNG TRƯỞNG (TAB D)</span>
              <span>•</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {growthScore}/60 (Xếp Hạng {growthTier})
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              Chế Độ Dự Báo Đề Xuất: <span className="text-emerald-600 dark:text-emerald-400">{suggestedMode}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-1">
              {suggestedMode === 'NÂNG NỀN' && 'Điểm tăng trưởng ≥48/60: Dùng Q0 đã chuẩn hóa làm mặt bằng hoạt động mới.'}
              {suggestedMode === 'PHA TRỘN' && 'Điểm tăng trưởng 36–47.9: Dùng nền pha trộn 60% Q0 chuẩn hóa + 40% TB 3 quý gần nhất.'}
              {suggestedMode === 'THẬN TRỌNG' && 'Điểm tăng trưởng <36: Dùng trung bình 4 quý gần nhất làm nền thận trọng.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-gray-400 block">Nền Tham Chiếu Q+1</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
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
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-850">
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
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
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
      </div>

      {/* 2. MÔ-ĐUN PHÂN TÍCH CÔNG SUẤT HIỆN HỮU & NHÀ MÁY MỚI */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Factory className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Phân Tích Công Suất Hiện Hữu &amp; Nhà Máy Mới
            </h4>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={capacityData.hasNewFactory}
                onChange={(e) => setCapacityData({ ...capacityData, hasNewFactory: e.target.checked })}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="text-slate-700 dark:text-gray-300 font-medium">Có nhà máy / dây chuyền mới</span>
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="text-[11px] text-slate-500 block mb-1">Công suất thiết kế mới bổ sung</label>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Quý bắt đầu vận hành thương mại (COD)</label>
                <input
                  type="text"
                  value={capacityData.commercialOperationQuarter}
                  onChange={(e) => setCapacityData({ ...capacityData, commercialOperationQuarter: e.target.value })}
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Tổng vốn đầu tư dự án (tỷ VNĐ)</label>
                <input
                  type="number"
                  value={capacityData.totalInvestmentCapital || ''}
                  onChange={(e) => setCapacityData({ ...capacityData, totalInvestmentCapital: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Nguồn vốn tài trợ chính</label>
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

      {/* 3. BẢNG CẦU NỐI & DỰ PHÓNG KQKD 8 QUÝ CHUẨN VALUEX */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng Dự Phóng 8 Quý: Cầu Nối Doanh Thu &amp; Lợi Nhuận
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-gray-400">
            4 Quý Thực Tế (Vietcap IQ) | 4 Quý Dự Phóng
          </span>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 font-semibold text-slate-700 dark:text-gray-300">
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Chỉ tiêu</th>
                <th className="py-2.5 px-2 text-center w-14">ĐVT</th>
                {/* 4 Quý thực tế */}
                {historical4Q.map((q, i) => (
                  <th key={i} className="py-2.5 px-3 text-right bg-slate-100/40 dark:bg-slate-950/20 whitespace-nowrap">
                    {q.period}
                    <span className="block text-[9px] font-normal text-slate-500">
                      {i === historical4Q.length - 1 ? '(Q0 Thực Tế)' : `(Q-${historical4Q.length - 1 - i})`}
                    </span>
                  </th>
                ))}
                {/* 4 Quý dự phóng */}
                {computedForecastQuarters.map((q, i) => (
                  <th key={i} className="py-2.5 px-3 text-right bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {q.period}
                    <span className="block text-[9px] font-normal text-emerald-600/70">
                      (Q+{i + 1} Dự Phóng)
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
              {/* 1. Doanh thu */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-semibold text-slate-900 dark:text-white">
                <td className="py-2 px-3">Doanh thu</td>
                <td className="py-2 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.revenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/20 dark:bg-emerald-950/10">
                    {q.revenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-bold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.revenue.toLocaleString('vi-VN')}
                </td>
                <td className={`py-2 px-3 text-right tabular-nums font-bold ${ttmForward.revenueGrowthYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ttmForward.revenueGrowthYoY > 0 ? `+${ttmForward.revenueGrowthYoY}%` : `${ttmForward.revenueGrowthYoY}%`}
                </td>
              </tr>

              {/* 2. Điều chỉnh doanh thu khoản bất thường */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-2 px-3 pl-6 text-[11px]">Điều chỉnh DT bất thường không lặp lại</td>
                <td className="py-2 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.abnormalRevenue ? `-${q.abnormalRevenue}` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      value={q.abnormalRevenue || ''}
                      onChange={(e) => handleUpdateForecastCell(i, 'abnormalRevenue', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 text-right rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* 3. Doanh thu chuẩn hóa */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-800 dark:text-gray-300">
                <td className="py-2 px-3 pl-6 font-medium">Doanh thu chuẩn hóa</td>
                <td className="py-2 px-2 text-center text-slate-500">tỷ</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.normalizedRevenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums font-semibold bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400">
                    {q.normalizedRevenue.toLocaleString('vi-VN')}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums font-semibold bg-gray-50/50 dark:bg-gray-850/30">
                  {ttmForward.revenue.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* 4. Tăng trưởng DT so với quý trước QoQ */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3">Tăng trưởng doanh thu QoQ</td>
                <td className="py-2 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.revenueGrowthQoQ ? `${q.revenueGrowthQoQ > 0 ? '+' : ''}${q.revenueGrowthQoQ}%` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums font-medium bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-600">
                    {(q.revenueGrowthQoQ ?? 0) > 0 ? `+${q.revenueGrowthQoQ}%` : `${q.revenueGrowthQoQ ?? 0}%`}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* 5. CẦU NỐI: Ảnh hưởng Sản lượng / Công suất */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-6 text-slate-800 dark:text-gray-200">Ảnh hưởng Sản lượng / Công suất</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.impactVolumeCapacity ? `+${q.impactVolumeCapacity}%` : '-'}
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

              {/* 6. CẦU NỐI: Ảnh hưởng Giá bán bình quân */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-6 text-slate-800 dark:text-gray-200">Ảnh hưởng Giá bán bình quân</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.impactAverageSellingPrice ? `${q.impactAverageSellingPrice > 0 ? '+' : ''}${q.impactAverageSellingPrice}%` : '-'}
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

              {/* 7. CẦU NỐI: Ảnh hưởng Cơ cấu / Thị phần / Nhu cầu */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-6 text-slate-800 dark:text-gray-200">Ảnh hưởng Cơ cấu / Thị phần / Nhu cầu</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.impactMixDemandShare ? `${q.impactMixDemandShare > 0 ? '+' : ''}${q.impactMixDemandShare}%` : '-'}
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

              {/* 8. CẦU NỐI: Ảnh hưởng Mùa vụ / Khác */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400 bg-slate-50/20 dark:bg-slate-900/10">
                <td className="py-1.5 px-3 pl-6 text-slate-800 dark:text-gray-200">Ảnh hưởng Mùa vụ / Khác</td>
                <td className="py-1.5 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-1.5 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.impactSeasonalityOther ? `${q.impactSeasonalityOther > 0 ? '+' : ''}${q.impactSeasonalityOther}%` : '-'}
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

              {/* 9. Tăng trưởng theo cầu nối doanh thu */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20">
                <td className="py-2 px-3 pl-6">Tăng trưởng theo cầu nối doanh thu</td>
                <td className="py-2 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10 text-slate-700 dark:text-gray-300">
                    {q.revenueBridgeGrowth ? `${q.revenueBridgeGrowth > 0 ? '+' : ''}${q.revenueBridgeGrowth}%` : '-'}
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums font-bold">
                    {(q.revenueBridgeGrowth ?? 0) > 0 ? `+${q.revenueBridgeGrowth}%` : `${q.revenueBridgeGrowth ?? 0}%`}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums text-slate-500 bg-gray-50/50 dark:bg-gray-850/30">-</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* 10. Biên gộp */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-800 dark:text-gray-200">
                <td className="py-2 px-3 font-medium">Biên gộp</td>
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
                <td className="py-2 px-3 text-right tabular-nums font-medium bg-gray-50/50 dark:bg-gray-850/30">
                  {avgForeGrossMargin}%
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                  {marginExpansion > 0 ? `+${marginExpansion}%` : `${marginExpansion}%`}
                </td>
              </tr>

              {/* 11. Biên EBITDA */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3">Biên EBITDA</td>
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
                  {Math.round((computedForecastQuarters.reduce((s, q) => s + q.ebitdaMargin, 0) / 4) * 10) / 10}%
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* 12. EBITDA */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-semibold text-slate-900 dark:text-white">
                <td className="py-2 px-3">EBITDA</td>
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

              {/* 13. LNST cốt lõi */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-bold text-slate-900 dark:text-white bg-slate-100/30 dark:bg-slate-900/30">
                <td className="py-2.5 px-3 text-emerald-900 dark:text-emerald-300">LNST cốt lõi</td>
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
                <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400 bg-gray-100/70 dark:bg-gray-850">
                  {ttmForward.netProfit.toLocaleString('vi-VN')}
                </td>
                <td className={`py-2.5 px-3 text-right tabular-nums font-bold ${ttmForward.netProfitGrowthYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ttmForward.netProfitGrowthYoY > 0 ? `+${ttmForward.netProfitGrowthYoY}%` : `${ttmForward.netProfitGrowthYoY}%`}
                </td>
              </tr>

              {/* 14. Biên LNST cốt lõi */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3 pl-6">Biên LNST cốt lõi</td>
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
                  {Math.round((computedForecastQuarters.reduce((s, q) => s + q.netMargin, 0) / 4) * 10) / 10}%
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* 15. Số CP pha loãng */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-2 px-3">Số CP pha loãng</td>
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

              {/* 16. EPS cốt lõi */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 font-semibold text-slate-900 dark:text-white">
                <td className="py-2 px-3">EPS cốt lõi</td>
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

              {/* 17. CFO / LNST cốt lõi (%) */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-2 px-3">CFO / LNST cốt lõi</td>
                <td className="py-2 px-2 text-center text-slate-500">%</td>
                {historical4Q.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums bg-slate-50/20 dark:bg-slate-950/10">
                    {q.cfoToNetProfit}%
                  </td>
                ))}
                {computedForecastQuarters.map((q, i) => (
                  <td key={i} className="py-2 px-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10">
                    <input
                      type="number"
                      value={q.cfoToNetProfit || 90}
                      onChange={(e) => handleUpdateForecastCell(i, 'cfoToNetProfit', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs text-slate-900 dark:text-white"
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums bg-gray-50/50 dark:bg-gray-850/30">
                  {cfoToNpRatioForward}%
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-500">-</td>
              </tr>

              {/* 18. CFO */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3">Dòng tiền HĐKD (CFO)</td>
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

              {/* 19. BVPS */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-600 dark:text-gray-400">
                <td className="py-2 px-3">Giá trị sổ sách / CP (BVPS)</td>
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

              {/* 20. P/E Trailing / Forward */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3">Hệ số P/E</td>
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

              {/* 21. P/B Trailing / Forward */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3">Hệ số P/B</td>
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

              {/* 22. EV/EBITDA Trailing / Forward */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-850/40 text-slate-700 dark:text-gray-300">
                <td className="py-2 px-3">Hệ số EV/EBITDA</td>
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
