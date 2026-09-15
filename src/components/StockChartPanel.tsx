'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  ColorType,
  CrosshairMode,
  SeriesMarker,
  Time,
} from 'lightweight-charts';
import { X, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { StockRankingItem } from '@/lib/filter-rs-data';
import { useTheme } from '@/components/ThemeProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OhlcBar {
  date: string;
  fullDate: string;
  openPrice: number;
  highestPrice: number;
  lowestPrice: number;
  closePrice: number;
  volume: number;
}

interface StockChartPanelProps {
  ticker: string | null;
  stockData: StockRankingItem | null;
  onClose: () => void;
}

export type Resolution = 'D' | 'W' | 'M';

export const RESOLUTION_TIMEFRAME_BARS: Record<Resolution, Record<string, number>> = {
  D: {
    '1T': 22,
    '3T': 65,
    '6T': 130,
    '1N': 260,
    '3N': 756,
    '5N': 1260,
    'Tối đa': 2000,
  },
  W: {
    '3T': 13,
    '6T': 26,
    '1N': 52,
    '3N': 156,
    '5N': 260,
    'Tối đa': 1000,
  },
  M: {
    '1N': 12,
    '3N': 36,
    '5N': 60,
    'Tối đa': 500,
  },
};

// ─── EMA Calculation ──────────────────────────────────────────────────────────

function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return closes.map(() => NaN);
  const k = 2 / (period + 1);
  const result: number[] = new Array(closes.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  result[period - 1] = sum / period;
  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

// ─── Chart Theme ──────────────────────────────────────────────────────────────

function getChartTheme(isDark: boolean) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: isDark ? '#111827' : '#ffffff' },
      textColor: isDark ? '#9ca3af' : '#374151',
    },
    grid: {
      vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
      horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: isDark ? '#4b5563' : '#9ca3af',
        labelBackgroundColor: isDark ? '#374151' : '#e5e7eb',
      },
      horzLine: {
        color: isDark ? '#4b5563' : '#9ca3af',
        labelBackgroundColor: isDark ? '#374151' : '#e5e7eb',
      },
    },
    rightPriceScale: {
      borderColor: isDark ? '#1f2937' : '#e5e7eb',
    },
    timeScale: {
      borderColor: isDark ? '#1f2937' : '#e5e7eb',
      timeVisible: true,
      secondsVisible: false,
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StockChartPanel({ ticker, stockData, onClose }: StockChartPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersPrimitiveRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [allBars, setAllBars] = useState<OhlcBar[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [resolution, setResolution] = useState<Resolution>('D');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('1N');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<{ abs: number; pct: number } | null>(null);
  const [liveVolume, setLiveVolume] = useState<number | null>(null);
  const [crosshairData, setCrosshairData] = useState<{
    o: number; h: number; l: number; c: number; v: number;
  } | null>(null);
  const [showDividendMarkers, setShowDividendMarkers] = useState(true);
  const [dividendMarkers, setDividendMarkers] = useState<SeriesMarker<Time>[]>([]);

  const barsCacheRef = useRef<{ [key in Resolution]?: OhlcBar[] }>({});
  const isOpen = !!ticker;

  // ─── Fetch price history ─────────────────────────────────────────────────

  const fetchPriceHistory = useCallback(async (t: string, res: Resolution = 'D') => {
    // Nếu đã có cache cho chu kỳ này thì hiển thị tức thì
    if (barsCacheRef.current[res] && barsCacheRef.current[res]!.length > 0) {
      setAllBars(barsCacheRef.current[res]!);
      return;
    }

    setIsLoadingChart(true);
    setAllBars([]);
    try {
      const apiTf = res === 'W' ? 'ONE_WEEK' : res === 'M' ? 'ONE_MONTH' : 'ONE_DAY';
      const countBack = res === 'M' ? 500 : res === 'W' ? 1000 : 2000;
      const response = await fetch(`/api/stocks/${t}/price-history?countBack=${countBack}&timeFrame=${apiTf}`);
      if (!response.ok) return;
      const json = await response.json();
      const bars: OhlcBar[] = json.history || [];
      barsCacheRef.current[res] = bars;
      setAllBars(bars);
      if (bars.length > 0 && res === 'D') setLiveVolume(bars[bars.length - 1].volume);

      if (Array.isArray(json.events)) {
        const markers: SeriesMarker<Time>[] = json.events.map((ev: any) => ({
          time: ev.date as Time,
          position: 'aboveBar',
          color: ev.eventCode === 'DIV' ? '#f59e0b' : '#3b82f6',
          shape: 'arrowDown',
          text: ev.title || (ev.eventCode === 'DIV' ? 'Cổ tức' : 'Phát hành'),
        }));
        setDividendMarkers(markers);
      } else {
        setDividendMarkers([]);
      }
    } catch (e) {
      console.error('[StockChartPanel] fetchPriceHistory error:', e);
    } finally {
      setIsLoadingChart(false);
    }
  }, []);

  // ─── Poll live price ─────────────────────────────────────────────────────

  const pollLivePrice = useCallback(async (t: string) => {
    try {
      const res = await fetch(`/api/stocks/${t}/price`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data.price === 'number' && data.price > 0) {
        setLivePrice(data.price);
        if (typeof data.changePercent === 'number') {
          setPriceChange({ abs: data.change || 0, pct: data.changePercent });
        }
      }
    } catch {}
  }, []);

  // ─── Chuyển đổi chu kỳ nến (Ngày / Tuần / Tháng) ─────────────────────────

  const handleSelectResolution = (newRes: Resolution) => {
    if (newRes === resolution) return;
    setResolution(newRes);
    const defaultTf = newRes === 'M' ? '3N' : '1N';
    setActiveTimeframe(defaultTf);
    if (ticker) {
      fetchPriceHistory(ticker, newRes);
    }
  };

  // ─── Khởi tạo khi ticker thay đổi ───────────────────────────────────────

  useEffect(() => {
    barsCacheRef.current = {};
    if (!ticker) {
      setAllBars([]);
      setLivePrice(null);
      setPriceChange(null);
      setLiveVolume(null);
      setCrosshairData(null);
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
      return;
    }

    setResolution('D');
    setActiveTimeframe('1N');
    setLivePrice(stockData?.currentPrice || null);
    if (stockData && typeof stockData.priceChangePercent === 'number') {
      setPriceChange({ abs: stockData.priceChange || 0, pct: stockData.priceChangePercent });
    } else {
      setPriceChange(null);
    }
    setCrosshairData(null);

    Promise.all([fetchPriceHistory(ticker, 'D'), pollLivePrice(ticker)]);

    if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    priceIntervalRef.current = setInterval(() => pollLivePrice(ticker), 15000);

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [ticker, stockData, fetchPriceHistory, pollLivePrice]);

  // ─── Tính priceChange fallback ───────────────────────────────────────────

  useEffect(() => {
    if (!livePrice || allBars.length < 2) return;
    if (!priceChange) {
      const prevClose = allBars[allBars.length - 2].closePrice;
      if (prevClose > 0) {
        setPriceChange({ abs: livePrice - prevClose, pct: ((livePrice - prevClose) / prevClose) * 100 });
      }
    }
  }, [livePrice, allBars, priceChange]);

  // ─── Render chart ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chartContainerRef.current || allBars.length === 0 || !ticker) return;

    const currentTfBars = RESOLUTION_TIMEFRAME_BARS[resolution];
    const barsCount = currentTfBars[activeTimeframe] || allBars.length;
    const subset = allBars.slice(-barsCount);

    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        ...getChartTheme(isDark),
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        handleScroll: true,
        handleScale: true,
      });
      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      candleSeriesRef.current = candleSeries;
      markersPrimitiveRef.current = createSeriesMarkers(candleSeries, []);

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#3b82f6',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volumeSeriesRef.current = volumeSeries;

      const ema20 = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 1,
        title: 'EMA20',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema20SeriesRef.current = ema20;

      const ema200 = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        title: 'EMA200',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema200SeriesRef.current = ema200;

      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !candleSeriesRef.current) {
          setCrosshairData(null);
          return;
        }
        const candle = param.seriesData.get(candleSeriesRef.current) as any;
        const vol = param.seriesData.get(volumeSeriesRef.current!) as any;
        if (candle) {
          setCrosshairData({ o: candle.open, h: candle.high, l: candle.low, c: candle.close, v: vol?.value ?? 0 });
        }
      });

      const ro = new ResizeObserver((entries) => {
        if (entries[0] && chartRef.current) {
          const { width, height } = entries[0].contentRect;
          chartRef.current.applyOptions({ width, height });
        }
      });
      ro.observe(chartContainerRef.current);
      resizeObserverRef.current = ro;
    } else {
      chartRef.current.applyOptions(getChartTheme(isDark));
    }

    // Set candlestick data
    candleSeriesRef.current?.setData(
      subset.map((b) => ({
        time: b.fullDate as Time,
        open: b.openPrice,
        high: b.highestPrice,
        low: b.lowestPrice,
        close: b.closePrice,
      }))
    );

    // Set volume data
    volumeSeriesRef.current?.setData(
      subset.map((b) => ({
        time: b.fullDate as Time,
        value: b.volume,
        color: b.closePrice >= b.openPrice
          ? (isDark ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.5)')
          : (isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.5)'),
      }))
    );

    // EMA — tính từ toàn bộ allBars để chính xác, rồi lấy subset cuối
    const allCloses = allBars.map((b) => b.closePrice);

    const ema20Values = calculateEMA(allCloses, 20);
    ema20SeriesRef.current?.setData(
      allBars
        .map((b, i) => ({ time: b.fullDate as Time, value: ema20Values[i] }))
        .filter((d) => !isNaN(d.value))
        .slice(-barsCount)
    );

    const ema200Values = calculateEMA(allCloses, 200);
    ema200SeriesRef.current?.setData(
      allBars
        .map((b, i) => ({ time: b.fullDate as Time, value: ema200Values[i] }))
        .filter((d) => !isNaN(d.value))
        .slice(-barsCount)
    );

    // Markers
    if (showDividendMarkers && dividendMarkers.length > 0) {
      const firstTime = subset[0]?.fullDate ?? '';
      const lastTime = subset[subset.length - 1]?.fullDate ?? '';
      const visibleMarkers = dividendMarkers.filter(
        (m) => String(m.time) >= firstTime && String(m.time) <= lastTime
      );
      markersPrimitiveRef.current?.setMarkers(visibleMarkers);
    } else {
      markersPrimitiveRef.current?.setMarkers([]);
    }

    chartRef.current?.timeScale().fitContent();
  }, [allBars, activeTimeframe, resolution, isDark, ticker, showDividendMarkers, dividendMarkers]);

  // ─── Update nến cuối với livePrice ──────────────────────────────────────

  useEffect(() => {
    if (!livePrice || !candleSeriesRef.current || allBars.length === 0) return;
    const lastBar = allBars[allBars.length - 1];
    candleSeriesRef.current.update({
      time: lastBar.fullDate as Time,
      open: lastBar.openPrice,
      high: Math.max(lastBar.highestPrice, livePrice),
      low: Math.min(lastBar.lowestPrice, livePrice),
      close: livePrice,
    });
  }, [livePrice, allBars]);

  // ─── Cleanup chart khi unmount hoặc ticker đổi ───────────────────────────

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      markersPrimitiveRef.current?.setMarkers([]);
      markersPrimitiveRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema200SeriesRef.current = null;
    };
  }, [ticker]);

  // ─── ESC key ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const fmt = (n: number) => n >= 1000 ? n.toLocaleString('vi-VN') : n.toFixed(0);
  const fmtVol = (v: number) =>
    v >= 1_000_000 ? (v / 1_000_000).toFixed(2) + 'M' : v >= 1_000 ? (v / 1_000).toFixed(1) + 'K' : String(v);

  const priceColor = priceChange
    ? priceChange.pct > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : priceChange.pct < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-amber-500 dark:text-amber-400'
    : 'text-slate-900 dark:text-white';

  const priceBadgeBg = priceChange
    ? priceChange.pct > 0
      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
      : priceChange.pct < 0
      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
      : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-500 dark:text-amber-400'
    : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300';

  const gradeColor = (grade: string) => {
    if (grade === 'A+') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (grade === 'A') return 'text-green-500 bg-green-500/10 border-green-500/30';
    if (grade === 'B+') return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    if (grade === 'B') return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30';
    return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isOpen || !stockData) return null;

  const displayPrice = livePrice ?? stockData.currentPrice;

  return (
    <div
      className="
        fixed inset-0 z-50
        w-screen h-screen
        flex flex-col
        bg-white dark:bg-gray-950
        overflow-hidden
      "
      role="dialog"
      aria-modal="true"
      aria-label={`Đồ thị toàn màn hình ${ticker}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <span className="text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            {ticker}
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {stockData.exchange}
          </span>
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${gradeColor(stockData.rankGrade)}`}>
            Hạng {stockData.rankGrade}
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-gray-300 truncate max-w-[360px] hidden md:inline">
            {stockData.companyName}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden lg:inline">
            • {stockData.industry}
          </span>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden sm:inline">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[10px]">ESC</kbd> để đóng
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition flex-shrink-0"
            aria-label="Đóng toàn màn hình"
            title="Đóng (ESC)"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Price & KPI Scorecard Bar */}
      <div className="px-6 py-2.5 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-950 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        {/* Price & ROC */}
        <div className="flex items-baseline space-x-3">
          <span className={`text-3xl font-black tabular-nums tracking-tight ${priceColor}`}>
            {fmt(displayPrice)} <span className="text-base font-bold">đ</span>
          </span>
          {priceChange !== null && (
            <span className={`inline-flex items-center space-x-1 text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg border ${priceBadgeBg}`}>
              <span>{priceChange.abs > 0 ? '▲ +' : priceChange.abs < 0 ? '▼ ' : '● '}</span>
              <span>{fmt(Math.abs(priceChange.abs))}đ</span>
              <span>({priceChange.pct > 0 ? '+' : ''}{priceChange.pct.toFixed(2)}%)</span>
            </span>
          )}
          <span className="text-xs text-gray-400 font-medium ml-1">⏱ Cập nhật 15s</span>
        </div>

        {/* Key Metrics */}
        <div className="flex items-center gap-x-6 gap-y-1 flex-wrap text-xs text-gray-500 dark:text-gray-400">
          <div>
            <span className="text-gray-400">RS (1T): </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{stockData.rsRating}</span>
          </div>
          <div>
            <span className="text-gray-400">Điểm ValueX: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">{stockData.totalScore}/150đ</span>
          </div>
          <div>
            <span className="text-gray-400">GTGD 20N: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">{stockData.adtv20Billion.toFixed(1)} Tỷ</span>
          </div>
          <div>
            <span className="text-gray-400">EPS Core YoY: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">
              {stockData.coreEpsGrowthYoY > 0 ? `+${stockData.coreEpsGrowthYoY}%` : `${stockData.coreEpsGrowthYoY}%`}
            </span>
          </div>
          <div>
            <span className="text-gray-400">LNST Core YoY: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">
              {stockData.coreNetProfitGrowthYoY > 0 ? `+${stockData.coreNetProfitGrowthYoY}%` : `${stockData.coreNetProfitGrowthYoY}%`}
            </span>
          </div>
          {liveVolume !== null && (
            <div>
              <span className="text-gray-400">Khối lượng: </span>
              <span className="font-bold text-slate-800 dark:text-gray-200">{fmtVol(liveVolume)} cp</span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-900/30 flex-shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Chế độ biểu đồ (Chu kỳ nến: Ngày / Tuần / Tháng) */}
          <div className="flex items-center bg-gray-200/90 dark:bg-gray-800/90 p-1 rounded-xl border border-gray-300/70 dark:border-gray-700/70 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 px-2 select-none">
              Chu kỳ:
            </span>
            {(['D', 'W', 'M'] as Resolution[]).map((res) => {
              const label = res === 'D' ? 'Ngày (D)' : res === 'W' ? 'Tuần (W)' : 'Tháng (M)';
              const active = resolution === res;
              return (
                <button
                  key={res}
                  onClick={() => handleSelectResolution(res)}
                  className={`
                    px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer
                    ${active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-700/60'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Khung thời gian (Zoom Range) */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-bold text-gray-400 mr-1 hidden sm:inline">Phạm vi:</span>
            {Object.keys(RESOLUTION_TIMEFRAME_BARS[resolution]).map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`
                  px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer
                  ${activeTimeframe === tf
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }
                `}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators & Event toggles */}
        <div className="flex items-center space-x-4 ml-auto">
          {/* EMA Legend */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-4 h-[3px] bg-blue-500 rounded" />
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                EMA20 {resolution === 'W' ? '(20 tuần)' : resolution === 'M' ? '(20 tháng)' : '(20 ngày)'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-4 h-[3px] bg-amber-500 rounded" />
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                EMA200 {resolution === 'W' ? '(200 tuần)' : resolution === 'M' ? '(200 tháng)' : '(200 ngày)'}
              </span>
            </div>
          </div>

          {/* Dividend toggle */}
          <button
            onClick={() => setShowDividendMarkers((v) => !v)}
            className={`
              flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer
              ${showDividendMarkers
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 shadow-2xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'
              }
            `}
            title="Ẩn/hiện sự kiện cổ tức & chia tách"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Cổ tức</span>
            <span className={`w-2 h-2 rounded-full ${showDividendMarkers ? 'bg-amber-500' : 'bg-gray-400'}`} />
          </button>
        </div>
      </div>

      {/* Crosshair Bar (if active) */}
      {crosshairData && (
        <div className="flex items-center space-x-6 px-6 py-1 flex-shrink-0 text-xs bg-slate-100/80 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 tabular-nums font-mono">
          <span>Mở (O): <strong className="font-bold text-slate-900 dark:text-white">{fmt(crosshairData.o)}</strong></span>
          <span>Cao (H): <strong className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(crosshairData.h)}</strong></span>
          <span>Thấp (L): <strong className="font-bold text-rose-600 dark:text-rose-400">{fmt(crosshairData.l)}</strong></span>
          <span>Đóng (C): <strong className="font-bold text-slate-900 dark:text-white">{fmt(crosshairData.c)}</strong></span>
          <span>Vol: <strong className="font-bold text-slate-800 dark:text-gray-200">{fmtVol(crosshairData.v)}</strong></span>
        </div>
      )}

      {/* Main Chart Area */}
      <div className="relative flex-1 min-h-0 w-full h-full">
        {isLoadingChart && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-xs">
            <RefreshCw className="h-9 w-9 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
              Đang tải dữ liệu biểu đồ {resolution === 'W' ? 'tuần (Weekly)' : resolution === 'M' ? 'tháng (Monthly)' : 'ngày (Daily)'} ({ticker})...
            </p>
          </div>
        )}
        {!isLoadingChart && allBars.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <TrendingUp className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-base font-bold text-gray-400">Không có dữ liệu giá cho {ticker}</p>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">
          Nguồn dữ liệu: Vietcap Gap Chart · Biểu đồ {resolution === 'W' ? 'Tuần (Weekly)' : resolution === 'M' ? 'Tháng (Monthly)' : 'Ngày (Daily)'} · Giá điều chỉnh cổ tức &amp; chia tách
        </span>
        <span className="tabular-nums font-medium">
          {allBars.length > 0
            ? `${allBars[0].fullDate} → ${allBars[allBars.length - 1].fullDate} (${allBars.length} cây nến)`
            : ''}
        </span>
      </div>
    </div>
  );
}
