'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  RefreshCw,
  Info,
  Calendar,
} from 'lucide-react';
import { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';

interface FinancialMetricsTabProps {
  ticker: string;
}

type PeriodType = 'quarter' | 'year';

// ─── Hàm tính toán Tăng trưởng cùng kỳ (YoY Growth %) chuẩn hóa ──────────────
function getYoYGrowth(
  current: ParsedVietcapQuarter,
  allData: ParsedVietcapQuarter[],
  getValue: (q: ParsedVietcapQuarter) => number
): number | null {
  if (!current || !allData || allData.length === 0) return null;

  let prev: ParsedVietcapQuarter | undefined;
  // Nếu là xem theo quý: tìm quý cùng kỳ năm trước (ví dụ Q2/2026 so với Q2/2025)
  if (current.quarter && current.quarter >= 1 && current.quarter <= 4) {
    prev = allData.find(
      (item) => item.year === current.year - 1 && item.quarter === current.quarter
    );
  }
  // Nếu là xem theo năm: tìm năm trước (ví dụ 2025 so với 2024)
  if (!prev) {
    prev = allData.find((item) => item.year === current.year - 1);
  }

  if (!prev) return null;

  const prevVal = getValue(prev);
  const currVal = getValue(current);

  if (prevVal === 0 || isNaN(prevVal) || isNaN(currVal)) return null;

  return ((currVal - prevVal) / Math.abs(prevVal)) * 100;
}

interface MetricItem {
  id: string;
  label: string;
  unit: string;
  isPercent?: boolean;
  isRatio?: boolean;
  getValue: (q: ParsedVietcapQuarter, allData?: ParsedVietcapQuarter[]) => number | null;
}

interface MetricSection {
  title: string;
  metrics: MetricItem[];
}

// ─── Định nghĩa các nhóm chỉ tiêu tài chính chuẩn hóa ──────────────────────────

const FINANCIAL_SECTIONS: MetricSection[] = [
  {
    title: '1. Cơ cấu tài sản (Tỷ VNĐ)',
    metrics: [
      {
        id: 'totalAssets',
        label: 'Tổng tài sản',
        unit: 'Tỷ',
        getValue: (q) => q.totalAssets || 0,
      },
      {
        id: 'cashAndShortTermInv',
        label: 'Tiền mặt & ĐT ngắn hạn',
        unit: 'Tỷ',
        getValue: (q) => (q.cashAndEquivalents || 0) + (q.shortTermInvestments || 0),
      },
      {
        id: 'receivables',
        label: 'Khoản phải thu',
        unit: 'Tỷ',
        getValue: (q) => q.receivables || 0,
      },
      {
        id: 'inventories',
        label: 'Hàng tồn kho',
        unit: 'Tỷ',
        getValue: (q) => q.inventories || 0,
      },
      {
        id: 'fixedAssets',
        label: 'Tài sản cố định',
        unit: 'Tỷ',
        getValue: (q) => q.fixedAssets || 0,
      },
      {
        id: 'constructionInProgress',
        label: 'Tài sản dở dang dài hạn',
        unit: 'Tỷ',
        getValue: (q) => q.constructionInProgress || 0,
      },
      {
        id: 'longTermInvestments',
        label: 'Đầu tư dài hạn',
        unit: 'Tỷ',
        getValue: (q) => q.longTermInvestments || 0,
      },
      {
        id: 'otherAssets',
        label: 'Tài sản khác',
        unit: 'Tỷ',
        getValue: (q) => {
          const main =
            (q.cashAndEquivalents || 0) +
            (q.shortTermInvestments || 0) +
            (q.receivables || 0) +
            (q.inventories || 0) +
            (q.fixedAssets || 0) +
            (q.constructionInProgress || 0) +
            (q.longTermInvestments || 0);
          return Math.max(0, (q.totalAssets || 0) - main);
        },
      },
    ],
  },
  {
    title: '2. Cơ cấu vốn chủ & Nợ phải trả (Tỷ VNĐ)',
    metrics: [
      {
        id: 'shortTermLoans',
        label: 'Vay ngắn hạn',
        unit: 'Tỷ',
        getValue: (q) => q.shortTermLoans || 0,
      },
      {
        id: 'longTermLoans',
        label: 'Vay dài hạn',
        unit: 'Tỷ',
        getValue: (q) => q.longTermLoans || 0,
      },
      {
        id: 'totalDebt',
        label: 'Tổng nợ vay (ngắn + dài)',
        unit: 'Tỷ',
        getValue: (q) => (q.shortTermLoans || 0) + (q.longTermLoans || 0),
      },
      {
        id: 'ownerEquity',
        label: 'Vốn chủ sở hữu',
        unit: 'Tỷ',
        getValue: (q) => q.ownerEquity || 0,
      },
    ],
  },
  {
    title: '3. Lợi nhuận kinh doanh',
    metrics: [
      {
        id: 'revenue',
        label: 'Doanh thu',
        unit: 'Tỷ',
        getValue: (q) => q.revenue || 0,
      },
      {
        id: 'revenueGrowth',
        label: 'Tăng trưởng doanh thu',
        unit: '%',
        isPercent: true,
        getValue: (q, allData) => getYoYGrowth(q, allData || [], (x) => x.revenue || 0),
      },
      {
        id: 'grossProfit',
        label: 'Lợi nhuận gộp',
        unit: 'Tỷ',
        getValue: (q) => q.grossProfit || 0,
      },
      {
        id: 'grossMargin',
        label: 'Biên lợi nhuận gộp',
        unit: '%',
        isPercent: true,
        getValue: (q) => (q.revenue > 0 ? (q.grossProfit / q.revenue) * 100 : q.grossMargin || 0),
      },
      {
        id: 'grossProfitGrowth',
        label: 'Tăng trưởng LN gộp',
        unit: '%',
        isPercent: true,
        getValue: (q, allData) => getYoYGrowth(q, allData || [], (x) => x.grossProfit || 0),
      },
      {
        id: 'netProfit',
        label: 'Lợi nhuận ròng (LNST)',
        unit: 'Tỷ',
        getValue: (q) => q.netProfit || 0,
      },
      {
        id: 'coreNetProfit',
        label: 'Lợi nhuận ròng cốt lõi',
        unit: 'Tỷ',
        getValue: (q) => (q.netProfit || q.consolidatedNetProfit || 0) - (q.otherProfit || 0),
      },
      {
        id: 'coreNetProfitGrowth',
        label: 'Tăng trưởng LNST cốt lõi',
        unit: '%',
        isPercent: true,
        getValue: (q, allData) =>
          getYoYGrowth(
            q,
            allData || [],
            (x) => (x.netProfit || x.consolidatedNetProfit || 0) - (x.otherProfit || 0)
          ),
      },
      {
        id: 'coreNetMargin',
        label: 'Biên LN ròng cốt lõi',
        unit: '%',
        isPercent: true,
        getValue: (q) =>
          q.revenue > 0
            ? (((q.netProfit || q.consolidatedNetProfit || 0) - (q.otherProfit || 0)) / q.revenue) * 100
            : 0,
      },
      {
        id: 'coreEps',
        label: 'EPS cốt lõi',
        unit: 'đ/cp',
        getValue: (q) => {
          const coreProfit = (q.netProfit || q.consolidatedNetProfit || 0) - (q.otherProfit || 0);
          if (q.sharesOutstandingMillions > 0 && coreProfit !== 0) {
            return Math.round((coreProfit / q.sharesOutstandingMillions) * 1000);
          }
          return q.eps > 0 && q.eps < 500000 ? q.eps : 0;
        },
      },
      {
        id: 'coreEpsGrowth',
        label: 'Tăng trưởng EPS cốt lõi',
        unit: '%',
        isPercent: true,
        getValue: (q, allData) =>
          getYoYGrowth(q, allData || [], (x) => {
            const coreProfit = (x.netProfit || x.consolidatedNetProfit || 0) - (x.otherProfit || 0);
            if (x.sharesOutstandingMillions > 0 && coreProfit !== 0) {
              return Math.round((coreProfit / x.sharesOutstandingMillions) * 1000);
            }
            return x.eps > 0 && x.eps < 500000 ? x.eps : 0;
          }),
      },
    ],
  },
  {
    title: '4. Chỉ số tài chính & Định giá',
    metrics: [
      {
        id: 'epsMetric',
        label: 'EPS cốt lõi',
        unit: 'đ/cp',
        getValue: (q) => {
          const coreProfit = (q.netProfit || q.consolidatedNetProfit || 0) - (q.otherProfit || 0);
          if (q.sharesOutstandingMillions > 0 && coreProfit !== 0) {
            return Math.round((coreProfit / q.sharesOutstandingMillions) * 1000);
          }
          return q.eps > 0 && q.eps < 500000 ? q.eps : 0;
        },
      },
      {
        id: 'roe',
        label: 'ROE',
        unit: '%',
        isPercent: true,
        getValue: (q) => q.roe || 0,
      },
      {
        id: 'roa',
        label: 'ROA',
        unit: '%',
        isPercent: true,
        getValue: (q) => q.roa || 0,
      },
      {
        id: 'pe',
        label: 'P/E',
        unit: 'x',
        isRatio: true,
        getValue: (q) => q.pe || 0,
      },
      {
        id: 'pb',
        label: 'P/B',
        unit: 'x',
        isRatio: true,
        getValue: (q) => q.pb || 0,
      },
      {
        id: 'marketCap',
        label: 'Vốn hóa',
        unit: 'Tỷ',
        getValue: (q) => q.marketCapBillion || 0,
      },
      {
        id: 'shares',
        label: 'Số lượng CP lưu hành',
        unit: 'Tr',
        getValue: (q) => q.sharesOutstandingMillions || 0,
      },
      {
        id: 'currentRatio',
        label: 'Hệ số thanh toán hiện tại',
        unit: 'lần',
        isRatio: true,
        getValue: (q) => q.currentRatio || 0,
      },
      {
        id: 'assetTurnover',
        label: 'Vòng quay tài sản',
        unit: 'lần',
        isRatio: true,
        getValue: (q) => q.assetTurnover || 0,
      },
      {
        id: 'receivableDays',
        label: 'Vòng quay phải thu (ngày)',
        unit: 'ngày',
        getValue: (q) => q.receivableDays || 0,
      },
      {
        id: 'inventoryDays',
        label: 'Vòng quay hàng tồn kho (ngày)',
        unit: 'ngày',
        getValue: (q) => q.inventoryDays || 0,
      },
      {
        id: 'payableDays',
        label: 'Vòng quay thanh toán (ngày)',
        unit: 'ngày',
        getValue: (q) => q.payableDays || 0,
      },
      {
        id: 'debtToEquity',
        label: 'Nợ / Vốn chủ sở hữu',
        unit: 'lần',
        isRatio: true,
        getValue: (q) => (q.ownerEquity > 0 ? q.totalLiabilities / q.ownerEquity : 0),
      },
      {
        id: 'loansToEquity',
        label: 'Nợ vay (ngắn+dài) / VCSH',
        unit: '%',
        isPercent: true,
        getValue: (q) => {
          const loans = (q.shortTermLoans || 0) + (q.longTermLoans || 0);
          return q.ownerEquity > 0 ? (loans / q.ownerEquity) * 100 : 0;
        },
      },
    ],
  },
];

export const FinancialMetricsTab: React.FC<FinancialMetricsTabProps> = ({ ticker }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('quarter');
  const [quartersData, setQuartersData] = useState<ParsedVietcapQuarter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Vị trí cửa sổ 4 kỳ: windowEndIndex là chỉ số của kỳ mới nhất trong cửa sổ 4 kỳ
  const [windowEndIndex, setWindowEndIndex] = useState<number>(0);

  // Chỉ tiêu đang được chọn để vẽ Mini Trendline Chart
  const [selectedMetricId, setSelectedMetricId] = useState<string>('revenue');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Fetch dữ liệu tài chính — retryCount được dùng để kích hoạt retry
  useEffect(() => {
    if (!ticker) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/stocks/${ticker}/financials`)
      .then((res) => {
        if (!res.ok) throw new Error(`Lỗi ${res.status}: Không thể tải dữ liệu tài chính`);
        return res.json();
      })
      .then((json) => {
        if (isCancelled) return;
        const qList: ParsedVietcapQuarter[] = json.quarters || [];
        if (qList.length > 0) {
          qList.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.quarter - b.quarter;
          });
          setQuartersData(qList);
          setWindowEndIndex(qList.length - 1);
        } else {
          setQuartersData([]);
          setError('Không có dữ liệu tài chính cho mã này. Vietcap IQ có thể chưa cập nhật.');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[FinancialMetricsTab] fetch error:', err);
        setError(err.message || 'Lỗi kết nối đến nguồn dữ liệu Vietcap IQ');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [ticker, retryCount]);

  // Nhóm theo Năm nếu người dùng chọn "Theo năm"
  const aggregatedData = useMemo(() => {
    if (periodType === 'quarter') {
      return quartersData;
    }

    // Gộp dữ liệu các quý cùng năm thành 1 bản ghi Năm
    const yearMap = new Map<number, ParsedVietcapQuarter[]>();
    quartersData.forEach((q) => {
      if (!yearMap.has(q.year)) yearMap.set(q.year, []);
      yearMap.get(q.year)!.push(q);
    });

    const yearlyList: ParsedVietcapQuarter[] = [];
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);

    for (const yr of sortedYears) {
      const qInYear = yearMap.get(yr)!;
      const latestQ = qInYear[qInYear.length - 1];

      // Tổng hợp doanh thu, chi phí, lợi nhuận cả năm
      const sumRevenue = qInYear.reduce((s, it) => s + (it.revenue || 0), 0);
      const sumGrossProfit = qInYear.reduce((s, it) => s + (it.grossProfit || 0), 0);
      const sumNetProfit = qInYear.reduce((s, it) => s + (it.netProfit || 0), 0);
      const sumOtherProfit = qInYear.reduce((s, it) => s + (it.otherProfit || 0), 0);
      const sumCoreNetProfit = sumNetProfit - sumOtherProfit;
      const sumOperatingProfit = qInYear.reduce((s, it) => s + (it.operatingProfit || 0), 0);
      const latestShares = latestQ.sharesOutstandingMillions || 0;
      const yearlyCoreEps = latestShares > 0 ? Math.round((sumCoreNetProfit / latestShares) * 1000) : latestQ.eps;

      const yearlyItem: ParsedVietcapQuarter = {
        ...latestQ,
        period: `${yr}`,
        year: yr,
        quarter: 4,
        revenue: sumRevenue,
        grossProfit: sumGrossProfit,
        netProfit: sumNetProfit,
        operatingProfit: sumOperatingProfit,
        eps: yearlyCoreEps,
        grossMargin: sumRevenue > 0 ? (sumGrossProfit / sumRevenue) * 100 : latestQ.grossMargin,
        netMargin: sumRevenue > 0 ? (sumNetProfit / sumRevenue) * 100 : latestQ.netMargin,
      };

      yearlyList.push(yearlyItem);
    }

    return yearlyList;
  }, [quartersData, periodType]);

  // Cập nhật lại windowEndIndex khi đổi periodType hoặc khi aggregatedData thay đổi
  useEffect(() => {
    if (aggregatedData.length > 0) {
      setWindowEndIndex(aggregatedData.length - 1);
    }
  }, [aggregatedData.length, periodType]);

  // Tính toán 4 kỳ đang hiển thị trong Cửa sổ trượt
  const visibleQuarters = useMemo(() => {
    if (aggregatedData.length === 0) return [];
    const end = Math.min(aggregatedData.length - 1, windowEndIndex);
    const start = Math.max(0, end - 3);
    return aggregatedData.slice(start, end + 1);
  }, [aggregatedData, windowEndIndex]);

  const canGoBack = useMemo(() => {
    const end = Math.min(aggregatedData.length - 1, windowEndIndex);
    return end - 3 > 0;
  }, [aggregatedData.length, windowEndIndex]);

  const canGoForward = useMemo(() => {
    return windowEndIndex < aggregatedData.length - 1;
  }, [aggregatedData.length, windowEndIndex]);

  const handleSlideLeft = () => {
    if (!canGoBack) return;
    setWindowEndIndex((prev) => Math.max(3, prev - 1));
  };

  const handleSlideRight = () => {
    if (!canGoForward) return;
    setWindowEndIndex((prev) => Math.min(aggregatedData.length - 1, prev + 1));
  };

  // Tìm metric đang chọn để vẽ Biểu đồ mini
  const activeMetric = useMemo(() => {
    for (const sec of FINANCIAL_SECTIONS) {
      const found = sec.metrics.find((m) => m.id === selectedMetricId);
      if (found) return found;
    }
    return FINANCIAL_SECTIONS[2].metrics[0]; // Mặc định là Doanh thu
  }, [selectedMetricId]);

  // Dữ liệu vẽ Biểu đồ Xu hướng Mini (Toàn bộ chuỗi hoặc 12 kỳ gần nhất)
  const chartSeries = useMemo(() => {
    if (aggregatedData.length === 0) return [];
    // Lấy tối đa 12 kỳ để biểu đồ mini thoáng và mượt
    const slice = aggregatedData.slice(-12);
    return slice.map((it) => ({
      period: it.period,
      value: activeMetric.getValue(it, aggregatedData) ?? 0,
    }));
  }, [aggregatedData, activeMetric]);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const fmtVal = (val: number | null | undefined, isPercent?: boolean, isRatio?: boolean) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    if (isPercent) {
      return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
    }
    if (isRatio) {
      return val.toFixed(2);
    }
    // Số nguyên hoặc số thực nhỏ
    if (Math.abs(val) >= 1000) {
      return Math.round(val).toLocaleString('vi-VN');
    }
    return val.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  };

  // SVG dimensions for Mini Chart
  const svgW = 340;
  const svgH = 90;
  const padX = 25;
  const padY = 16;

  // Tính tọa độ SVG Polyline / Area
  const svgPathData = useMemo(() => {
    if (chartSeries.length < 2) return { linePath: '', areaPath: '', points: [] };

    const values = chartSeries.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min === 0 ? 1 : max - min;

    const points = chartSeries.map((d, i) => {
      const x = padX + (i / (chartSeries.length - 1)) * (svgW - padX * 2);
      const y = svgH - padY - ((d.value - min) / range) * (svgH - padY * 2);
      return { x, y, value: d.value, period: d.period };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    const bottomY = (svgH - 2).toFixed(1);
    const areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { linePath, areaPath, points };
  }, [chartSeries]);

  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; period: string } | null>(null);

  return (
    <div className="flex flex-col h-full w-full select-none text-xs bg-white dark:bg-[#131722] font-sans">
      {/* ─── Thanh Tabs Kỳ Thời Gian (Theo quý / Theo năm) ─── */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1e222d]/70 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Kỳ:</span>
          <div className="flex items-center bg-gray-200/80 dark:bg-gray-800 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => setPeriodType('quarter')}
              className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                periodType === 'quarter'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Theo quý
            </button>
            <button
              onClick={() => setPeriodType('year')}
              className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                periodType === 'year'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Theo năm
            </button>
          </div>
        </div>

        <span className="text-[10.5px] text-gray-400 font-mono">
          {error ? (
            <span className="text-rose-500 font-bold">Lỗi dữ liệu</span>
          ) : (
            `${aggregatedData.length} kỳ lịch sử`
          )}
        </span>
      </div>

      {/* ─── Biểu đồ Xu hướng Mini (Mini Trendline / Area Chart) ─── */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#131722] flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="truncate">
            <span className="text-[11.5px] font-extrabold text-slate-900 dark:text-white truncate">
              Biểu đồ {activeMetric.label} {periodType === 'quarter' ? 'Theo quý' : 'Theo năm'}
            </span>
            <p className="text-[9.5px] text-gray-400 truncate">
              Bấm vào mỗi chỉ tiêu bên dưới để xem biểu đồ tương ứng
            </p>
          </div>

          {chartSeries.length > 0 && (
            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex-shrink-0">
              {fmtVal(chartSeries[chartSeries.length - 1].value, activeMetric.isPercent, activeMetric.isRatio)} {activeMetric.unit}
            </span>
          )}
        </div>

        {/* Khung Canvas / SVG Mini Area Chart */}
        <div className="w-full h-[96px] relative bg-gray-50/60 dark:bg-[#181c27] rounded-xl border border-gray-100 dark:border-gray-800/80 overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="flex items-center space-x-2 text-gray-400 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Đang tải dữ liệu Vietcap IQ...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center space-y-2 px-4 text-center">
              <span className="text-rose-500 dark:text-rose-400 text-[11px] font-medium leading-snug">{error}</span>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : chartSeries.length < 2 ? (
            <span className="text-gray-400 text-[11px]">Chưa đủ dữ liệu để vẽ biểu đồ</span>
          ) : (
            <div className="relative w-full h-full">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Đường lưới mờ */}
                <line x1={padX} y1={padY} x2={svgW - padX} y2={padY} stroke="currentColor" strokeOpacity="0.08" />
                <line x1={padX} y1={svgH / 2} x2={svgW - padX} y2={svgH / 2} stroke="currentColor" strokeOpacity="0.08" />
                <line x1={padX} y1={svgH - padY} x2={svgW - padX} y2={svgH - padY} stroke="currentColor" strokeOpacity="0.08" />

                {/* Area Gradient */}
                {svgPathData.areaPath && (
                  <path d={svgPathData.areaPath} fill="url(#metricGrad)" />
                )}

                {/* Đường biểu đồ (Line) */}
                {svgPathData.linePath && (
                  <path
                    d={svgPathData.linePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Điểm nốt (Data points) */}
                {svgPathData.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="2.5"
                    fill="#3b82f6"
                    className="hover:r-4 transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>

              {/* Tooltip khi hover nốt */}
              {hoveredPoint && (
                <div
                  className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full px-2 py-1 bg-gray-900 text-white rounded-md text-[10px] font-mono shadow-lg whitespace-nowrap"
                  style={{
                    left: `${(hoveredPoint.x / svgW) * 100}%`,
                    top: `${Math.max(20, (hoveredPoint.y / svgH) * 100 - 6)}%`,
                  }}
                >
                  <div className="font-bold text-amber-300">{hoveredPoint.period}</div>
                  <div>
                    {activeMetric.label}: {fmtVal(hoveredPoint.value, activeMetric.isPercent, activeMetric.isRatio)} {activeMetric.unit}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Header Bảng Số Liệu (Cửa sổ 4 kỳ trượt) ─── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-100/90 dark:bg-[#1e222d] text-[10px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
        <div className="w-[125px] sm:w-[135px] truncate pl-1 flex-shrink-0">Chỉ tiêu</div>

        <div className="flex-1 flex items-center justify-between min-w-0">
          {/* Nút lùi về quá khứ (<) */}
          <button
            onClick={handleSlideLeft}
            disabled={!canGoBack}
            className={`p-1 rounded transition flex-shrink-0 cursor-pointer ${
              canGoBack
                ? 'text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                : 'text-gray-300 dark:text-gray-600 opacity-30 cursor-not-allowed'
            }`}
            title="Xem các kỳ trước đó (lùi quá khứ)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* 4 Cột Kỳ Thời Gian */}
          <div className="flex-1 grid grid-cols-4 text-center font-mono font-bold text-slate-700 dark:text-gray-200 px-1">
            {visibleQuarters.map((q) => (
              <div key={q.period} className="truncate text-[10.5px]" title={q.period}>
                {q.period.replace('20', "'")}
              </div>
            ))}
          </div>

          {/* Nút tiến về hiện tại (>) */}
          <button
            onClick={handleSlideRight}
            disabled={!canGoForward}
            className={`p-1 rounded transition flex-shrink-0 cursor-pointer ${
              canGoForward
                ? 'text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                : 'text-gray-300 dark:text-gray-600 opacity-30 cursor-not-allowed'
            }`}
            title="Xem các kỳ mới hơn (tiến hiện tại)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Nội Dung Bảng Số Liệu (Scrollable) ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-100 dark:divide-gray-800/60">
        {FINANCIAL_SECTIONS.map((sec) => {
          const isCollapsed = collapsedSections[sec.title];

          return (
            <div key={sec.title} className="group/sec">
              {/* Tiêu đề nhóm chỉ tiêu (Accordion) */}
              <button
                type="button"
                onClick={() => toggleSection(sec.title)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50/80 dark:bg-[#1a1e29] hover:bg-gray-100 dark:hover:bg-gray-800/80 text-left transition cursor-pointer"
              >
                <span className="font-extrabold text-[11px] text-slate-800 dark:text-gray-200 truncate">
                  {sec.title}
                </span>
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                )}
              </button>

              {/* Danh sách các dòng chỉ tiêu */}
              {!isCollapsed && (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/30">
                  {sec.metrics.map((metric) => {
                    const isSelected = metric.id === selectedMetricId;

                    return (
                      <div
                        key={metric.id}
                        onClick={() => setSelectedMetricId(metric.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition text-[10.5px] font-mono ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/70 font-bold border-l-2 border-blue-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {/* Tên chỉ tiêu */}
                        <div className="w-[125px] sm:w-[135px] font-sans font-medium text-slate-800 dark:text-gray-200 truncate pr-1 flex items-center space-x-1 flex-shrink-0">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                          <span className="truncate">{metric.label}</span>
                        </div>

                        {/* 4 Giá trị tương ứng 4 kỳ */}
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="w-5 flex-shrink-0" />
                          <div className="flex-1 grid grid-cols-4 text-right px-1">
                            {visibleQuarters.map((q) => {
                              const val = metric.getValue(q, aggregatedData);
                              const isGrowth =
                                metric.isPercent &&
                                (metric.id.toLowerCase().includes('growth') || metric.id.includes('Growth'));
                              const colorCls = isGrowth
                                ? val !== null && val > 0
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : val !== null && val < 0
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-gray-400'
                                : 'text-slate-700 dark:text-gray-300';

                              return (
                                <div
                                  key={q.period}
                                  className={`truncate px-0.5 ${colorCls}`}
                                  title={`${q.period}: ${fmtVal(val, metric.isPercent, metric.isRatio)}`}
                                >
                                  {fmtVal(val, metric.isPercent, metric.isRatio)}
                                </div>
                              );
                            })}
                          </div>
                          <div className="w-5 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Chân Tab: Hướng dẫn ─── */}
      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e222d] flex items-center justify-between text-[10.5px] text-gray-400 flex-shrink-0">
        <span>Bấm dòng để xem biểu đồ xu hướng</span>
        <span className="font-mono text-[10px]">Vietcap IQ Data</span>
      </div>
    </div>
  );
};
