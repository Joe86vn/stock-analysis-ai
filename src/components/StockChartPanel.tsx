'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Chart, KLineData } from 'klinecharts';
import { X, RefreshCw, Calendar, TrendingUp, Activity, Check, ChevronDown } from 'lucide-react';
import { StockRankingItem } from '@/lib/filter-rs-data';
import { useTheme } from '@/components/ThemeProvider';
import { DrawingToolType } from './chart/drawing-types';
import { DrawingToolbar } from './chart/DrawingToolbar';
import { registerSwingHighLowIndicator } from './chart/indicators/custom-swing-hl';

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

// ─── KLineCharts Styles & Theme ───────────────────────────────────────────────

function getKLineTheme(isDark: boolean): any {
  return {
    grid: {
      horizontal: {
        style: 'dashed' as const,
        size: 1,
        color: isDark ? '#1f2937' : '#f3f4f6',
        dashedValue: [4, 4],
      },
      vertical: {
        style: 'dashed' as const,
        size: 1,
        color: isDark ? '#1f2937' : '#f3f4f6',
        dashedValue: [4, 4],
      },
    },
    candle: {
      type: 'candle_solid' as const,
      bar: {
        upColor: '#22c55e',
        downColor: '#ef4444',
        noChangeColor: '#f59e0b',
        upBorderColor: '#22c55e',
        downBorderColor: '#ef4444',
        noChangeBorderColor: '#f59e0b',
        upWickColor: '#22c55e',
        downWickColor: '#ef4444',
        noChangeWickColor: '#f59e0b',
      },
      tooltip: {
        showRule: 'none' as const,
      },
      priceMark: {
        high: { color: isDark ? '#9ca3af' : '#64748b' },
        low: { color: isDark ? '#9ca3af' : '#64748b' },
        last: {
          show: true,
          upColor: '#22c55e',
          downColor: '#ef4444',
          noChangeColor: '#f59e0b',
          line: {
            style: 'dashed' as const,
            dashedValue: [4, 4],
            size: 1,
          },
          text: {
            color: '#ffffff',
            size: 11,
          },
        },
      },
    },
    indicator: {
      tooltip: {
        showRule: 'none' as const,
      },
      lines: [
        { color: '#3b82f6', size: 1.5 }, // EMA20
        { color: '#f59e0b', size: 1.5 }, // EMA200
      ],
      bars: [
        {
          upColor: isDark ? 'rgba(34,197,94,0.45)' : 'rgba(34,197,94,0.55)',
          downColor: isDark ? 'rgba(239,68,68,0.45)' : 'rgba(239,68,68,0.55)',
          noChangeColor: 'rgba(245,158,11,0.5)',
        },
      ],
    },
    xAxis: {
      axisLine: { color: isDark ? '#1f2937' : '#e5e7eb' },
      tickLine: { color: isDark ? '#1f2937' : '#e5e7eb' },
      tickText: { color: isDark ? '#9ca3af' : '#64748b', size: 11 },
    },
    yAxis: {
      axisLine: { color: isDark ? '#1f2937' : '#e5e7eb' },
      tickLine: { color: isDark ? '#1f2937' : '#e5e7eb' },
      tickText: { color: isDark ? '#9ca3af' : '#64748b', size: 11 },
    },
    separator: {
      color: isDark ? '#1f2937' : '#e5e7eb',
    },
    crosshair: {
      horizontal: {
        line: { color: isDark ? '#4b5563' : '#9ca3af', style: 'dashed' as const, dashedValue: [4, 4] },
        text: { backgroundColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#ffffff' : '#111827' },
      },
      vertical: {
        line: { color: isDark ? '#4b5563' : '#9ca3af', style: 'dashed' as const, dashedValue: [4, 4] },
        text: { backgroundColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#ffffff' : '#111827' },
      },
    },
    overlay: {
      point: {
        color: '#3b82f6',
        borderColor: '#ffffff',
        borderSize: 2,
        radius: 5,
        activeColor: '#6366f1',
        activeBorderColor: '#ffffff',
        activeBorderSize: 2,
        activeRadius: 6,
      },
      line: {
        color: '#3b82f6',
        size: 1.5,
      },
      rect: {
        style: 'stroke_fill' as const,
        color: 'rgba(59, 130, 246, 0.15)',
        borderColor: '#3b82f6',
        borderSize: 1.5,
      },
      polygon: {
        style: 'stroke_fill' as const,
        color: 'rgba(59, 130, 246, 0.15)',
        borderColor: '#3b82f6',
        borderSize: 1.5,
      },
      text: {
        color: isDark ? '#ffffff' : '#111827',
        size: 12,
      },
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StockChartPanel({ ticker, stockData, onClose }: StockChartPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
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
    o: number; h: number; l: number; c: number; v: number; date?: string;
  } | null>(null);
  const [showDividendMarkers, setShowDividendMarkers] = useState(true);
  const [dividendEvents, setDividendEvents] = useState<any[]>([]);

  // ─── Drawing Tools State ──────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<DrawingToolType>('cursor');

  // ─── Indicators State ─────────────────────────────────────────────────────
  const [activeIndicators, setActiveIndicators] = useState({
    swingHl: true,
    ema: true,
    boll: false,
    vol: true,
    rsi: false,
    macd: false,
  });
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const subPanesRef = useRef<{ vol?: string; rsi?: string; macd?: string }>({});

  const barsCacheRef = useRef<{ [key in Resolution]?: OhlcBar[] }>({});
  const isOpen = !!ticker;

  // ─── Fetch price history ─────────────────────────────────────────────────

  const fetchPriceHistory = useCallback(async (t: string, res: Resolution = 'D') => {
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
        setDividendEvents(json.events);
      } else {
        setDividendEvents([]);
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
    setActiveTool('cursor');

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

  // ─── Khởi tạo KLineCharts instance ────────────────────────────────────────

  useEffect(() => {
    if (!chartContainerRef.current || !ticker) return;

    let isDisposed = false;

    async function initKLineChart() {
      const klinecharts = await import('klinecharts');
      if (isDisposed || !chartContainerRef.current) return;

      // Dispose instance cũ nếu có
      if (chartRef.current) {
        klinecharts.dispose(chartContainerRef.current);
        chartRef.current = null;
      }

      registerSwingHighLowIndicator();

      const chart = klinecharts.init(chartContainerRef.current, {
        timezone: 'Asia/Ho_Chi_Minh',
      });
      if (!chart) return;

      chartRef.current = chart;

      // Định dạng số nguyên đồng VNĐ (bỏ .00 trên trục giá và nhãn High/Low)
      chart.setPriceVolumePrecision(0, 0);

      // Áp dụng styles theme
      chart.setStyles(getKLineTheme(isDark));

      // Đặt khoảng trống lề phải (right offset) cho cây nến cuối cùng
      chart.setOffsetRightDistance(80);

      // Reset sub-panes
      subPanesRef.current = {};

      // Tạo các chỉ báo theo activeIndicators
      if (activeIndicators.vol) {
        subPanesRef.current.vol = chart.createIndicator('VOL', false, { height: 85, dragEnabled: true }) ?? undefined;
      }
      if (activeIndicators.ema) {
        chart.createIndicator({ name: 'EMA', calcParams: [20, 200] }, false, { id: 'candle_pane' });
      }
      if (activeIndicators.boll) {
        chart.createIndicator('BOLL', false, { id: 'candle_pane' });
      }
      if (activeIndicators.swingHl) {
        chart.createIndicator('SWING_HL', false, { id: 'candle_pane' });
      }
      if (activeIndicators.rsi) {
        subPanesRef.current.rsi = chart.createIndicator('RSI', false, { height: 90, dragEnabled: true }) ?? undefined;
      }
      if (activeIndicators.macd) {
        subPanesRef.current.macd = chart.createIndicator('MACD', false, { height: 95, dragEnabled: true }) ?? undefined;
      }

      // Lắng nghe sự kiện di chuyển chuột / crosshair
      chart.subscribeAction('onCrosshairChange' as any, (data: any) => {
        if (!data || !data.kLineData) {
          setCrosshairData(null);
          return;
        }
        const kd = data.kLineData as KLineData;
        const d = new Date(kd.timestamp);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        setCrosshairData({
          o: kd.open,
          h: kd.high,
          l: kd.low,
          c: kd.close,
          v: kd.volume ?? 0,
          date: dateStr,
        });
      });

      // Tự động resize theo container
      const ro = new ResizeObserver(() => {
        chart.resize();
      });
      ro.observe(chartContainerRef.current);
      resizeObserverRef.current = ro;
    }

    initKLineChart();

    return () => {
      isDisposed = true;
      resizeObserverRef.current?.disconnect();
      if (chartContainerRef.current) {
        import('klinecharts').then((kc) => {
          if (chartContainerRef.current) kc.dispose(chartContainerRef.current);
        });
      }
      chartRef.current = null;
    };
  }, [ticker]);

  // ─── Cập nhật Theme khi đổi Dark / Light ───────────────────────────────────

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setStyles(getKLineTheme(isDark));
    }
  }, [isDark]);

  // ─── Bật / Tắt Chỉ Báo Kỹ Thuật ───────────────────────────────────────────

  const toggleIndicator = (key: keyof typeof activeIndicators) => {
    setActiveIndicators((prev) => {
      const nextVal = !prev[key];
      const chart = chartRef.current;
      if (chart) {
        if (key === 'swingHl') {
          if (nextVal) chart.createIndicator('SWING_HL', false, { id: 'candle_pane' });
          else chart.removeIndicator('candle_pane', 'SWING_HL');
        } else if (key === 'ema') {
          if (nextVal) chart.createIndicator({ name: 'EMA', calcParams: [20, 200] }, false, { id: 'candle_pane' });
          else chart.removeIndicator('candle_pane', 'EMA');
        } else if (key === 'boll') {
          if (nextVal) chart.createIndicator('BOLL', false, { id: 'candle_pane' });
          else chart.removeIndicator('candle_pane', 'BOLL');
        } else if (key === 'vol') {
          if (nextVal) {
            subPanesRef.current.vol = chart.createIndicator('VOL', false, { height: 85, dragEnabled: true }) ?? undefined;
          } else if (subPanesRef.current.vol) {
            chart.removeIndicator(subPanesRef.current.vol);
            delete subPanesRef.current.vol;
          }
        } else if (key === 'rsi') {
          if (nextVal) {
            subPanesRef.current.rsi = chart.createIndicator('RSI', false, { height: 90, dragEnabled: true }) ?? undefined;
          } else if (subPanesRef.current.rsi) {
            chart.removeIndicator(subPanesRef.current.rsi);
            delete subPanesRef.current.rsi;
          }
        } else if (key === 'macd') {
          if (nextVal) {
            subPanesRef.current.macd = chart.createIndicator('MACD', false, { height: 95, dragEnabled: true }) ?? undefined;
          } else if (subPanesRef.current.macd) {
            chart.removeIndicator(subPanesRef.current.macd);
            delete subPanesRef.current.macd;
          }
        }
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // ─── Nạp dữ liệu nến vào KLineCharts ──────────────────────────────────────

  useEffect(() => {
    if (!chartRef.current || allBars.length === 0) return;

    const currentTfBars = RESOLUTION_TIMEFRAME_BARS[resolution];
    const barsCount = currentTfBars[activeTimeframe] || allBars.length;
    const subset = allBars.slice(-barsCount);

    const klineData: KLineData[] = subset.map((b) => {
      const ts = new Date(b.fullDate + 'T00:00:00Z').getTime();
      return {
        timestamp: isNaN(ts) ? Date.now() : ts,
        open: b.openPrice,
        high: b.highestPrice,
        low: b.lowestPrice,
        close: b.closePrice,
        volume: b.volume,
      };
    });

    chartRef.current.applyNewData(klineData);
    chartRef.current.setOffsetRightDistance(80);
  }, [allBars, activeTimeframe, resolution]);

  // ─── Cập nhật nến cuối với livePrice ──────────────────────────────────────

  useEffect(() => {
    if (!livePrice || !chartRef.current || allBars.length === 0) return;
    const lastBar = allBars[allBars.length - 1];
    const ts = new Date(lastBar.fullDate + 'T00:00:00Z').getTime();
    chartRef.current.updateData({
      timestamp: isNaN(ts) ? Date.now() : ts,
      open: lastBar.openPrice,
      high: Math.max(lastBar.highestPrice, livePrice),
      low: Math.min(lastBar.lowestPrice, livePrice),
      close: livePrice,
      volume: liveVolume ?? lastBar.volume,
    });
  }, [livePrice, allBars, liveVolume]);

  // ─── Xử lý chọn công cụ vẽ KLineCharts ───────────────────────────────────

  const handleSelectTool = (tool: DrawingToolType) => {
    setActiveTool(tool);
    if (!chartRef.current) return;
    if (tool === 'cursor') {
      return;
    }
    // KLineCharts native createOverlay kích hoạt chế độ vẽ trực tiếp trên canvas
    chartRef.current.createOverlay(tool);
  };

  const handleClearAllOverlays = () => {
    if (window.confirm(`Xóa toàn bộ các nét vẽ trên biểu đồ ${ticker}?`)) {
      chartRef.current?.removeOverlay();
      setActiveTool('cursor');
    }
  };

  // ─── ESC key ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeTool !== 'cursor') {
          setActiveTool('cursor');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, activeTool]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const fmt = (n: number) => (n >= 1000 ? n.toLocaleString('vi-VN') : n.toFixed(0));
  const fmtVol = (v: number) =>
    v >= 1_000_000 ? (v / 1_000_000).toFixed(2) + 'M' : v >= 1_000 ? (v / 1_000).toFixed(1) + 'K' : String(v);

  const formatDateStr = (d?: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

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

  const latestBar = allBars.length > 0 ? allBars[allBars.length - 1] : null;
  const activeOhlc = crosshairData ?? (latestBar ? {
    o: latestBar.openPrice,
    h: livePrice ? Math.max(latestBar.highestPrice, livePrice) : latestBar.highestPrice,
    l: livePrice ? Math.min(latestBar.lowestPrice, livePrice) : latestBar.lowestPrice,
    c: livePrice ?? latestBar.closePrice,
    v: liveVolume ?? latestBar.volume,
    date: latestBar.fullDate,
  } : null);

  const candleDiff = activeOhlc ? activeOhlc.c - activeOhlc.o : 0;
  const candleDiffPct = activeOhlc && activeOhlc.o > 0 ? (candleDiff / activeOhlc.o) * 100 : 0;
  const closeColor = activeOhlc
    ? activeOhlc.c > activeOhlc.o
      ? 'text-emerald-600 dark:text-emerald-400'
      : activeOhlc.c < activeOhlc.o
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-amber-500 dark:text-amber-400'
    : 'text-slate-900 dark:text-white';

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

          {/* SWING_HL Legend */}
          {activeIndicators.swingHl && (
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="inline-block w-3.5 h-[2px] border-b-2 border-dashed border-amber-500" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Đỉnh Đáy (9-9)
              </span>
            </div>
          )}

          {/* Indicators Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu((v) => !v)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer shadow-2xs"
              title="Quản lý các chỉ báo kỹ thuật (RSI, MACD, BOLL, Đỉnh Đáy...)"
            >
              <Activity className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Chỉ báo (fx)</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {showIndicatorMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowIndicatorMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 text-xs space-y-1 select-none">
                  <div className="px-2 py-1 font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                    Chỉ báo trên nến
                  </div>

                  {/* Đỉnh - Đáy cá nhân */}
                  <button
                    onClick={() => toggleIndicator('swingHl')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-800 dark:text-gray-200 cursor-pointer text-left transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="font-semibold">Đỉnh - Đáy (9-9)</span>
                    </div>
                    {activeIndicators.swingHl && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>

                  {/* Bollinger Bands */}
                  <button
                    onClick={() => toggleIndicator('boll')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-800 dark:text-gray-200 cursor-pointer text-left transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                      <span className="font-semibold">Bollinger Bands (BOLL)</span>
                    </div>
                    {activeIndicators.boll && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>

                  {/* EMA 20 & 200 */}
                  <button
                    onClick={() => toggleIndicator('ema')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-800 dark:text-gray-200 cursor-pointer text-left transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="font-semibold">Đường EMA 20 / 200</span>
                    </div>
                    {activeIndicators.ema && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>

                  <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                  <div className="px-2 py-1 font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                    Bảng phụ bên dưới
                  </div>

                  {/* Volume */}
                  <button
                    onClick={() => toggleIndicator('vol')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-800 dark:text-gray-200 cursor-pointer text-left transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="font-semibold">Khối lượng (VOL)</span>
                    </div>
                    {activeIndicators.vol && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>

                  {/* RSI */}
                  <button
                    onClick={() => toggleIndicator('rsi')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-800 dark:text-gray-200 cursor-pointer text-left transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
                      <span className="font-semibold">RSI (14)</span>
                    </div>
                    {activeIndicators.rsi && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>

                  {/* MACD */}
                  <button
                    onClick={() => toggleIndicator('macd')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-800 dark:text-gray-200 cursor-pointer text-left transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                      <span className="font-semibold">MACD (12, 26, 9)</span>
                    </div>
                    {activeIndicators.macd && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                </div>
              </>
            )}
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

      {/* OHLC Bar - Luôn luôn hiển thị */}
      <div className="flex items-center space-x-4 sm:space-x-6 px-6 py-1.5 flex-shrink-0 text-xs bg-slate-100/80 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 tabular-nums font-mono overflow-x-auto min-h-[34px]">
        {activeOhlc ? (
          <>
            <span className="text-gray-500 dark:text-gray-400 font-sans font-medium text-[11px] flex items-center gap-1.5">
              {crosshairData ? (
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
                  {formatDateStr(activeOhlc.date) || 'Đang chọn'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-gray-200/90 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
                  Phiên gần nhất {activeOhlc.date ? `(${formatDateStr(activeOhlc.date)})` : ''}
                </span>
              )}
            </span>
            <span>Mở (O): <strong className="font-bold text-slate-900 dark:text-white">{fmt(activeOhlc.o)}</strong></span>
            <span>Cao (H): <strong className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(activeOhlc.h)}</strong></span>
            <span>Thấp (L): <strong className="font-bold text-rose-600 dark:text-rose-400">{fmt(activeOhlc.l)}</strong></span>
            <span>Đóng (C): <strong className={`font-bold ${closeColor}`}>{fmt(activeOhlc.c)}</strong></span>
            <span className="hidden md:inline">
              Biên độ: <strong className={`font-bold ${closeColor}`}>
                {candleDiff > 0 ? '+' : ''}{fmt(candleDiff)} ({candleDiff > 0 ? '+' : ''}{candleDiffPct.toFixed(2)}%)
              </strong>
            </span>
            <span>Vol: <strong className="font-bold text-slate-800 dark:text-gray-200">{fmtVol(activeOhlc.v)}</strong></span>
          </>
        ) : (
          <div className="flex items-center space-x-2 text-gray-400 font-sans text-xs">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Đang tải thông số giá OHLC...</span>
          </div>
        )}
      </div>

      {/* Main Chart Area */}
      <div
        className="relative flex-1 min-h-0 w-full h-full"
        onMouseLeave={() => setCrosshairData(null)}
      >
        {/* TradingView Left Drawing Toolbar */}
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onClearAll={handleClearAllOverlays}
        />

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

        {/* KLineCharts canvas container */}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">
          Động cơ KLineCharts TradingView · Biểu đồ {resolution === 'W' ? 'Tuần (Weekly)' : resolution === 'M' ? 'Tháng (Monthly)' : 'Ngày (Daily)'} · Giá điều chỉnh cổ tức &amp; chia tách
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
