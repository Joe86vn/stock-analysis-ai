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

type Timeframe = '1T' | '3T' | '6T' | '1N' | '3N' | '5N' | 'Tối đa';

// Số phiên giao dịch tương ứng mỗi timeframe
const TIMEFRAME_BARS: Record<Timeframe, number> = {
  '1T': 22,
  '3T': 65,
  '6T': 130,
  '1N': 260,
  '3N': 756,
  '5N': 1260,
  'Tối đa': 2000,
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
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('1N');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<{ abs: number; pct: number } | null>(null);
  const [liveVolume, setLiveVolume] = useState<number | null>(null);
  const [crosshairData, setCrosshairData] = useState<{
    o: number; h: number; l: number; c: number; v: number;
  } | null>(null);
  const [showDividendMarkers, setShowDividendMarkers] = useState(true);
  const [dividendMarkers, setDividendMarkers] = useState<SeriesMarker<Time>[]>([]);

  const isOpen = !!ticker;

  // ─── Fetch price history ─────────────────────────────────────────────────

  const fetchPriceHistory = useCallback(async (t: string) => {
    setIsLoadingChart(true);
    setAllBars([]);
    try {
      const res = await fetch(`/api/stocks/${t}/price-history?countBack=2000`);
      if (!res.ok) return;
      const json = await res.json();
      const bars: OhlcBar[] = json.history || [];
      setAllBars(bars);
      if (bars.length > 0) setLiveVolume(bars[bars.length - 1].volume);

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
      }
    } catch {}
  }, []);

  // ─── Khởi tạo khi ticker thay đổi ───────────────────────────────────────

  useEffect(() => {
    if (!ticker) {
      setAllBars([]);
      setLivePrice(null);
      setPriceChange(null);
      setLiveVolume(null);
      setCrosshairData(null);
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
      return;
    }

    setActiveTimeframe('1N');
    setLivePrice(null);
    setPriceChange(null);
    setCrosshairData(null);

    Promise.all([fetchPriceHistory(ticker), pollLivePrice(ticker)]);

    if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    priceIntervalRef.current = setInterval(() => pollLivePrice(ticker), 15000);

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [ticker, fetchPriceHistory, pollLivePrice]);

  // ─── Tính priceChange ────────────────────────────────────────────────────

  useEffect(() => {
    if (!livePrice || allBars.length < 2) return;
    const prevClose = allBars[allBars.length - 2].closePrice;
    if (prevClose > 0) {
      setPriceChange({ abs: livePrice - prevClose, pct: ((livePrice - prevClose) / prevClose) * 100 });
    }
  }, [livePrice, allBars]);

  // ─── Render chart ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chartContainerRef.current || allBars.length === 0 || !ticker) return;

    const barsCount = TIMEFRAME_BARS[activeTimeframe];
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
  }, [allBars, activeTimeframe, isDark, ticker, showDividendMarkers, dividendMarkers]);

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
    ? priceChange.pct > 0 ? 'text-emerald-500' : priceChange.pct < 0 ? 'text-red-500' : 'text-gray-400'
    : 'text-gray-400';

  const gradeColor = (grade: string) => {
    if (grade === 'A+') return 'text-emerald-500 bg-emerald-500/10';
    if (grade === 'A') return 'text-green-500 bg-green-500/10';
    if (grade === 'B+') return 'text-blue-500 bg-blue-500/10';
    if (grade === 'B') return 'text-indigo-400 bg-indigo-400/10';
    return 'text-gray-400 bg-gray-400/10';
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isOpen || !stockData) return null;

  const displayPrice = livePrice ?? stockData.currentPrice;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <aside
        className="
          fixed right-0 top-0 bottom-0 z-50
          w-full sm:w-[580px] lg:w-[640px]
          flex flex-col
          bg-white dark:bg-gray-950
          border-l border-gray-200 dark:border-gray-800
          shadow-2xl shadow-black/30
          overflow-hidden
        "
        aria-label={`Đồ thị ${ticker}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
              {ticker}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {stockData.exchange}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor(stockData.rankGrade)}`}>
              {stockData.rankGrade}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">
              {stockData.companyName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Price Scorecard */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/80 flex-shrink-0 space-y-1.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {fmt(displayPrice)}đ
            </span>
            {priceChange && (
              <span className={`text-sm font-bold tabular-nums ${priceColor}`}>
                {priceChange.abs >= 0 ? '+' : ''}{fmt(priceChange.abs)}đ
                ({priceChange.pct >= 0 ? '+' : ''}{priceChange.pct.toFixed(2)}%)
              </span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">⏱ 15s</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>RS <span className="font-semibold text-indigo-600 dark:text-indigo-400">{stockData.rsRating}</span></span>
            <span>ADTV <span className="font-semibold text-slate-700 dark:text-gray-200">{stockData.adtv20Billion.toFixed(1)} Tỷ</span></span>
            <span>Điểm <span className="font-semibold text-slate-700 dark:text-gray-200">{stockData.totalScore}/150</span></span>
            <span className="truncate">{stockData.industry}</span>
            {liveVolume !== null && (
              <span>Vol <span className="font-semibold text-slate-700 dark:text-gray-200">{fmtVol(liveVolume)}</span></span>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0 gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {(Object.keys(TIMEFRAME_BARS) as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`
                  px-2 py-1 rounded-md text-[11px] font-semibold transition
                  ${activeTimeframe === tf
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowDividendMarkers((v) => !v)}
            className={`
              flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex-shrink-0
              ${showDividendMarkers
                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'
              }
            `}
            title="Ẩn/hiện sự kiện cổ tức & chia tách"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Cổ tức</span>
            <span className={`w-1.5 h-1.5 rounded-full ${showDividendMarkers ? 'bg-amber-500' : 'bg-gray-400'}`} />
          </button>
        </div>

        {/* EMA Legend + Crosshair */}
        <div className="flex items-center space-x-4 px-4 py-1.5 flex-shrink-0 text-[11px] border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-4 h-[2px] bg-blue-500 rounded" />
            <span className="text-gray-500 dark:text-gray-400">EMA20</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-4 h-[2px] bg-amber-500 rounded" />
            <span className="text-gray-500 dark:text-gray-400">EMA200</span>
          </div>
          {crosshairData && (
            <div className="flex items-center space-x-3 ml-auto text-slate-700 dark:text-gray-200 tabular-nums font-mono text-[10px]">
              <span>O <span className="font-bold">{fmt(crosshairData.o)}</span></span>
              <span className="text-emerald-600">H <span className="font-bold">{fmt(crosshairData.h)}</span></span>
              <span className="text-red-500">L <span className="font-bold">{fmt(crosshairData.l)}</span></span>
              <span>C <span className="font-bold">{fmt(crosshairData.c)}</span></span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="relative flex-1 min-h-0">
          {isLoadingChart && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 dark:bg-gray-950/90">
              <RefreshCw className="h-7 w-7 text-indigo-500 animate-spin mb-2" />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Đang tải ~2.000 phiên (~8 năm)...
              </p>
            </div>
          )}
          {!isLoadingChart && allBars.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <TrendingUp className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm font-semibold text-gray-400">Không có dữ liệu giá cho {ticker}</p>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] text-gray-400">
            Nguồn: Vietcap Gap Chart · Đã điều chỉnh cổ tức &amp; chia tách
          </span>
          <span className="text-[10px] text-gray-400">
            {allBars.length > 0
              ? `${allBars[0].fullDate} – ${allBars[allBars.length - 1].fullDate} (${allBars.length} phiên)`
              : ''}
          </span>
        </div>
      </aside>
    </>
  );
}
