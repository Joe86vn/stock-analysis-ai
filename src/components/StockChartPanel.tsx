'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Chart, KLineData } from 'klinecharts';
import {
  X,
  RefreshCw,
  Calendar,
  TrendingUp,
  Activity,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  ExternalLink,
  Trophy,
  Search,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import { StockRankingItem } from '@/lib/filter-rs-data';
import { useTheme } from '@/components/ThemeProvider';
import { DrawingToolType } from './chart/drawing-types';
import { DrawingToolbar } from './chart/DrawingToolbar';
import { registerSwingHighLowIndicator } from './chart/indicators/custom-swing-hl';
import { registerMeasureOverlay } from './chart/overlays/measure-overlay';
import { resampleDailyToWeekly, resampleDailyToMonthly } from '@/lib/resample-ohlc';
import {
  ChartColorTheme,
  loadSavedTheme,
  saveTheme,
  getKLineThemeFromCustom,
  hexToRgba,
  DEFAULT_CHART_THEME,
  getVolIndicatorStyles,
  getEmaIndicatorStyles,
  getBollIndicatorStyles,
  getRsiIndicatorStyles,
  getMacdIndicatorStyles,
} from './chart/chart-theme-types';
import { ChartColorSettingsModal } from './chart/ChartColorSettingsModal';

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

export interface StockChartPanelProps {
  ticker: string | null;
  stockData?: StockRankingItem | null;
  onClose?: () => void;
  onSelectTicker?: (ticker: string) => void;
  allStocks?: StockRankingItem[];
  isStandalone?: boolean;
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

function getKLineTheme(isDark: boolean, customTheme?: ChartColorTheme): any {
  return getKLineThemeFromCustom(customTheme || DEFAULT_CHART_THEME, isDark);
}

// ─── Global Client-Side RAM Cache for Chart Data ─────────────────────────────
interface CachedChartData {
  timestamp: number;
  events: any[];
  isFullHistory?: { [key in Resolution]?: boolean };
  resolutions: {
    [key in Resolution]?: OhlcBar[];
  };
}

const GLOBAL_CHART_CACHE = new Map<string, CachedChartData>();
const CACHE_MAX_ITEMS = 30;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes TTL

function getCachedData(ticker: string): CachedChartData | null {
  const item = GLOBAL_CHART_CACHE.get(ticker);
  if (!item) return null;
  return item;
}

function setCachedData(ticker: string, update: Partial<CachedChartData>) {
  let existing = GLOBAL_CHART_CACHE.get(ticker) || {
    timestamp: Date.now(),
    events: [],
    isFullHistory: {},
    resolutions: {},
  };

  const nextResolutions = { ...existing.resolutions, ...update.resolutions };
  const nextIsFull = { ...existing.isFullHistory, ...update.isFullHistory };

  existing = {
    timestamp: Date.now(),
    events: update.events ?? existing.events,
    isFullHistory: nextIsFull,
    resolutions: nextResolutions,
  };

  if (GLOBAL_CHART_CACHE.size >= CACHE_MAX_ITEMS && !GLOBAL_CHART_CACHE.has(ticker)) {
    const oldestKey = GLOBAL_CHART_CACHE.keys().next().value;
    if (oldestKey) GLOBAL_CHART_CACHE.delete(oldestKey);
  }

  GLOBAL_CHART_CACHE.set(ticker, existing);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StockChartPanel({
  ticker,
  stockData,
  onClose,
  onSelectTicker,
  allStocks,
  isStandalone,
}: StockChartPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drawingOverlayIdRef = useRef<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const [internalStockData, setInternalStockData] = useState<StockRankingItem | null>(stockData || null);

  useEffect(() => {
    if (stockData) {
      setInternalStockData(stockData);
    }
  }, [stockData]);

  // When ticker changes and current internalStockData doesn't match ticker:
  useEffect(() => {
    if (!ticker) return;
    if (internalStockData?.ticker === ticker) return;

    if (allStocks && allStocks.length > 0) {
      const match = allStocks.find((s) => s.ticker === ticker);
      if (match) {
        setInternalStockData(match);
        return;
      }
    }

    fetch(`/api/ranking?ticker=${ticker}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.item) {
          setInternalStockData(data.item);
        }
      })
      .catch(() => {});
  }, [ticker, allStocks, internalStockData]);

  const effectiveStockData: StockRankingItem = internalStockData || stockData || {
    ticker: ticker || 'FPT',
    companyName: ticker || 'Cổ phiếu',
    exchange: 'HOSE',
    industry: 'Cổ phiếu niêm yết',
    currentPrice: 0,
    rsRating: 80,
    totalScore: 100,
    maxScore: 150,
    totalPercentage: 67,
    rankGrade: 'B',
    rankTitle: 'Khá',
    financialHealthScore: 35,
    growthQualityScore: 40,
    businessQualityScore: 25,
    financialHealthGrade: 'Tốt',
    growthQualityGrade: 'Tốt',
    businessQualityGrade: 'Khá',
    adtv20Billion: 10,
    marketCapBillion: 1000,
    foreignPercentage: 0,
    freeFloatPercentage: 0,
    coreEpsGrowthYoY: 0,
    coreNetProfitGrowthYoY: 0,
    headlineNetProfitGrowthYoY: 0,
    q0RevenueGrowthYoY: 0,
    roic: 15,
    roe: 18,
    grossMargin: 20,
    netMargin: 10,
    netDebtToEbitda: 1.0,
    cfoBillion: 500,
    latestQuarter: 'Q2/2026',
    updatedAt: new Date().toISOString(),
  };

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

  // Ticker search switcher state
  const [showTickerSearch, setShowTickerSearch] = useState(false);
  const [tickerSearchInput, setTickerSearchInput] = useState('');

  // ─── Drawing Tools State ──────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<DrawingToolType>('cursor');

  // ─── Indicators State & Parameters ───────────────────────────────────────
  const [activeIndicators, setActiveIndicators] = useState({
    swingHl: true,
    ema: true,
    boll: false,
    vol: true,
    rsi: false,
    macd: false,
  });
  const [indicatorParams, setIndicatorParams] = useState({
    swingHlWindow: 9,
    swingHlShowLine: true,
    swingHlShowChochBos: true,
    swingHlConfirmBars: 3,
    swingHlShowPercent: true,
    emaShort: 20,
    emaLong: 200,
    bollPeriod: 20,
    bollStdDev: 2,
    rsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
  });
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const subPanesRef = useRef<{ vol?: string; rsi?: string; macd?: string }>({});

  // ─── Theme & Color Customization State ─────────────────────────────────────
  const [chartTheme, setChartTheme] = useState<ChartColorTheme>(() => loadSavedTheme());
  const [showColorModal, setShowColorModal] = useState(false);
  const [colorModalTab, setColorModalTab] = useState<'candle' | 'overlay' | 'subpanes'>('candle');

  const isOpen = !!ticker;

  // ─── Fetch price history (Option B: Pure Daily Fetch + Client Resampling) ──

  const fetchPhase2Background = useCallback(async (t: string, currentRes: Resolution) => {
    try {
      // Tải 2.000 nến Ngày đầy đủ (~8-9 năm lịch sử)
      const res2 = await fetch(`/api/stocks/${t}/price-history?countBack=2000&timeFrame=ONE_DAY`);
      if (!res2.ok) return;
      const json2 = await res2.json();
      const dailyBarsFull: OhlcBar[] = json2.history || [];

      if (dailyBarsFull.length > 0) {
        // Tự động gộp nến Tuần và Tháng từ nến Ngày sạch 100%
        const weeklyBarsFull = resampleDailyToWeekly(dailyBarsFull);
        const monthlyBarsFull = resampleDailyToMonthly(dailyBarsFull);

        const resolutionsFull: { [key in Resolution]?: OhlcBar[] } = {
          D: dailyBarsFull,
          W: weeklyBarsFull,
          M: monthlyBarsFull,
        };

        setCachedData(t, {
          resolutions: resolutionsFull,
          events: Array.isArray(json2.events) ? json2.events : [],
          isFullHistory: { D: true, W: true, M: true },
        });

        // Cập nhật nến của chu kỳ đang chọn mượt mà (không giật)
        const updatedBars = resolutionsFull[currentRes];
        if (updatedBars && updatedBars.length > 0) {
          setAllBars(updatedBars);
        }
      }
    } catch (e) {
      console.warn('[StockChartPanel] Phase 2 background fetch error:', e);
    }
  }, []);

  const fetchPriceHistory = useCallback(async (t: string, res: Resolution = 'D') => {
    const cached = getCachedData(t);

    // 1. Kiểm tra RAM Cache (Trả về 0ms nếu đã có)
    if (cached && cached.resolutions[res] && cached.resolutions[res]!.length > 0) {
      const bars = cached.resolutions[res]!;
      setAllBars(bars);
      if (bars.length > 0 && res === 'D') setLiveVolume(bars[bars.length - 1].volume);
      if (cached.events) setDividendEvents(cached.events);

      // Nếu mới nạp Tầng 1 (chưa đủ 2.000 nến Ngày), âm thầm tải Tầng 2 ngầm
      if (!cached.isFullHistory?.['D']) {
        fetchPhase2Background(t, res);
      }
      return;
    }

    // 2. Tải Tầng 1 (Phase 1) Siêu Nhanh (260 nến Ngày ~ 1 năm)
    setIsLoadingChart(true);

    try {
      const res1 = await fetch(`/api/stocks/${t}/price-history?countBack=260&timeFrame=ONE_DAY`);
      if (!res1.ok) return;
      const json1 = await res1.json();
      const dailyBars1: OhlcBar[] = json1.history || [];

      if (dailyBars1.length > 0) {
        // Sinh ngay nến Tuần và Tháng từ nến Ngày Tầng 1
        const weeklyBars1 = resampleDailyToWeekly(dailyBars1);
        const monthlyBars1 = resampleDailyToMonthly(dailyBars1);

        const resolutions1: { [key in Resolution]?: OhlcBar[] } = {
          D: dailyBars1,
          W: weeklyBars1,
          M: monthlyBars1,
        };

        const activeBars = resolutions1[res] || dailyBars1;
        setAllBars(activeBars);
        if (res === 'D') setLiveVolume(dailyBars1[dailyBars1.length - 1].volume);

        setCachedData(t, {
          resolutions: resolutions1,
          events: Array.isArray(json1.events) ? json1.events : [],
          isFullHistory: { D: false, W: false, M: false },
        });
        if (Array.isArray(json1.events)) setDividendEvents(json1.events);
      }

      // 3. Tải nốt Tầng 2 (Phase 2 - 2.000 nến Ngày trọn vẹn) ngầm ở chế độ background
      fetchPhase2Background(t, res);
    } catch (e) {
      console.error('[StockChartPanel] fetchPriceHistory error:', e);
    } finally {
      setIsLoadingChart(false);
    }
  }, [fetchPhase2Background]);

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
    
    // Đổi tab tức thì 0ms từ RAM nếu đã có
    const cached = getCachedData(ticker || '');
    if (cached && cached.resolutions[newRes] && cached.resolutions[newRes]!.length > 0) {
      setAllBars(cached.resolutions[newRes]!);
    } else if (ticker) {
      fetchPriceHistory(ticker, newRes);
    }
  };

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
      registerMeasureOverlay();

      const chart = klinecharts.init(chartContainerRef.current, {
        timezone: 'Asia/Ho_Chi_Minh',
      });
      if (!chart) return;

      chartRef.current = chart;

      // Định dạng số nguyên đồng VNĐ (bỏ .00 trên trục giá và nhãn High/Low)
      chart.setPriceVolumePrecision(0, 0);

      // Đảm bảo scroll và zoom luôn được bật
      chart.setScrollEnabled(true);
      chart.setZoomEnabled(true);

      // Áp dụng styles theme
      chart.setStyles(getKLineTheme(isDark, chartTheme));

      // Đặt khoảng trống lề phải (right offset) cho cây nến cuối cùng
      chart.setOffsetRightDistance(80);

      // Reset sub-panes
      subPanesRef.current = {};

      // Tạo các chỉ báo theo activeIndicators & indicatorParams kèm custom styles
      if (activeIndicators.vol) {
        subPanesRef.current.vol =
          chart.createIndicator(
            {
              name: 'VOL',
              calcParams: [20],
              styles: getVolIndicatorStyles(chartTheme.vol, isDark) as any,
            },
            false,
            { height: 85, dragEnabled: true }
          ) ?? undefined;
      }
      if (activeIndicators.ema) {
        chart.createIndicator(
          {
            name: 'EMA',
            calcParams: [indicatorParams.emaShort, indicatorParams.emaLong],
            styles: getEmaIndicatorStyles(chartTheme.ema) as any,
          },
          true,
          { id: 'candle_pane' }
        );
      }
      if (activeIndicators.boll) {
        chart.createIndicator(
          {
            name: 'BOLL',
            calcParams: [indicatorParams.bollPeriod, indicatorParams.bollStdDev],
            styles: getBollIndicatorStyles(chartTheme.boll) as any,
          },
          true,
          { id: 'candle_pane' }
        );
      }
      if (activeIndicators.swingHl) {
        chart.createIndicator(
          {
            name: 'SWING_HL',
            calcParams: [
              indicatorParams.swingHlWindow,
              indicatorParams.swingHlShowLine ? 1 : 0,
              indicatorParams.swingHlShowChochBos ? 1 : 0,
              indicatorParams.swingHlConfirmBars,
              indicatorParams.swingHlShowPercent ? 1 : 0,
            ],
            styles: chartTheme.smc as any,
          },
          true,
          { id: 'candle_pane' }
        );
      }
      if (activeIndicators.rsi) {
        subPanesRef.current.rsi =
          chart.createIndicator(
            {
              name: 'RSI',
              calcParams: [indicatorParams.rsiPeriod],
              styles: getRsiIndicatorStyles(chartTheme.rsi) as any,
            },
            false,
            { height: 90, dragEnabled: true }
          ) ?? undefined;
      }
      if (activeIndicators.macd) {
        subPanesRef.current.macd =
          chart.createIndicator(
            {
              name: 'MACD',
              calcParams: [indicatorParams.macdFast, indicatorParams.macdSlow, indicatorParams.macdSignal],
              styles: getMacdIndicatorStyles(chartTheme.macd) as any,
            },
            false,
            { height: 95, dragEnabled: true }
          ) ?? undefined;
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
      const handleResize = () => {
        chart.resize();
      };
      const ro = new ResizeObserver(handleResize);
      ro.observe(chartContainerRef.current);
      resizeObserverRef.current = ro;

      window.addEventListener('resize', handleResize);
      // Double check resize after DOM layout settles
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 500);

      return () => {
        window.removeEventListener('resize', handleResize);
        ro.disconnect();
      };
    }

    const cleanupResize = initKLineChart();

    return () => {
      isDisposed = true;
      resizeObserverRef.current?.disconnect();
      cleanupResize?.then?.((cleanup) => cleanup?.());
      if (chartContainerRef.current) {
        import('klinecharts').then((kc) => {
          if (chartContainerRef.current) kc.dispose(chartContainerRef.current);
        });
      }
      chartRef.current = null;
    };
  }, [ticker]);

  // ─── Cập nhật Theme khi đổi Dark / Light hoặc đổi chartTheme ───────────────

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setStyles(getKLineTheme(isDark, chartTheme));
    }
  }, [isDark, chartTheme]);

  // ─── Xử lý thay đổi Theme & Màu sắc động ──────────────────────────────────

  const handleThemeChange = (newTheme: ChartColorTheme) => {
    setChartTheme(newTheme);
    saveTheme(newTheme);

    const chart = chartRef.current;
    if (!chart) return;

    // 1. Áp dụng styles tổng cho nến & lưới & trục giá
    chart.setStyles(getKLineTheme(isDark, newTheme));

    // 2. Override styles cho các chỉ báo đang mở
    if (activeIndicators.vol && subPanesRef.current.vol) {
      chart.overrideIndicator(
        {
          name: 'VOL',
          styles: getVolIndicatorStyles(newTheme.vol, isDark) as any,
        },
        subPanesRef.current.vol
      );
    }
    if (activeIndicators.ema) {
      chart.overrideIndicator(
        {
          name: 'EMA',
          styles: getEmaIndicatorStyles(newTheme.ema) as any,
        },
        'candle_pane'
      );
    }
    if (activeIndicators.boll) {
      chart.overrideIndicator(
        {
          name: 'BOLL',
          styles: getBollIndicatorStyles(newTheme.boll) as any,
        },
        'candle_pane'
      );
    }
    if (activeIndicators.swingHl) {
      chart.overrideIndicator(
        {
          name: 'SWING_HL',
          styles: newTheme.smc as any,
        },
        'candle_pane'
      );
    }
    if (activeIndicators.rsi && subPanesRef.current.rsi) {
      chart.overrideIndicator(
        {
          name: 'RSI',
          styles: getRsiIndicatorStyles(newTheme.rsi) as any,
        },
        subPanesRef.current.rsi
      );
    }
    if (activeIndicators.macd && subPanesRef.current.macd) {
      chart.overrideIndicator(
        {
          name: 'MACD',
          styles: getMacdIndicatorStyles(newTheme.macd) as any,
        },
        subPanesRef.current.macd
      );
    }
  };

  // ─── Bật / Tắt & Đổi Tham Số Chỉ Báo ──────────────────────────────────────

  const handleToggleSwingHlLine = (show: boolean) => {
    setIndicatorParams((prev) => {
      const next = { ...prev, swingHlShowLine: show };
      const chart = chartRef.current;
      if (chart && activeIndicators.swingHl) {
        chart.overrideIndicator(
          {
            name: 'SWING_HL',
            calcParams: [
              next.swingHlWindow,
              next.swingHlShowLine ? 1 : 0,
              next.swingHlShowChochBos ? 1 : 0,
              next.swingHlConfirmBars,
              next.swingHlShowPercent ? 1 : 0,
            ],
          },
          'candle_pane'
        );
      }
      return next;
    });
  };

  const handleToggleChochBos = (show: boolean) => {
    setIndicatorParams((prev) => {
      const next = { ...prev, swingHlShowChochBos: show };
      const chart = chartRef.current;
      if (chart && activeIndicators.swingHl) {
        chart.overrideIndicator(
          {
            name: 'SWING_HL',
            calcParams: [
              next.swingHlWindow,
              next.swingHlShowLine ? 1 : 0,
              next.swingHlShowChochBos ? 1 : 0,
              next.swingHlConfirmBars,
              next.swingHlShowPercent ? 1 : 0,
            ],
          },
          'candle_pane'
        );
      }
      return next;
    });
  };

  const handleToggleSwingHlPercent = (show: boolean) => {
    setIndicatorParams((prev) => {
      const next = { ...prev, swingHlShowPercent: show };
      const chart = chartRef.current;
      if (chart && activeIndicators.swingHl) {
        chart.overrideIndicator(
          {
            name: 'SWING_HL',
            calcParams: [
              next.swingHlWindow,
              next.swingHlShowLine ? 1 : 0,
              next.swingHlShowChochBos ? 1 : 0,
              next.swingHlConfirmBars,
              next.swingHlShowPercent ? 1 : 0,
            ],
          },
          'candle_pane'
        );
      }
      return next;
    });
  };

  const handleParamChange = (key: keyof typeof indicatorParams, value: number) => {
    if (isNaN(value) || value <= 0) return;
    setIndicatorParams((prev) => {
      const next = { ...prev, [key]: value };
      const chart = chartRef.current;
      if (chart) {
        if ((key === 'swingHlWindow' || key === 'swingHlConfirmBars') && activeIndicators.swingHl) {
          chart.overrideIndicator(
            {
              name: 'SWING_HL',
              calcParams: [
                next.swingHlWindow,
                next.swingHlShowLine ? 1 : 0,
                next.swingHlShowChochBos ? 1 : 0,
                next.swingHlConfirmBars,
                next.swingHlShowPercent ? 1 : 0,
              ],
            },
            'candle_pane'
          );
        } else if ((key === 'emaShort' || key === 'emaLong') && activeIndicators.ema) {
          chart.overrideIndicator({ name: 'EMA', calcParams: [next.emaShort, next.emaLong] }, 'candle_pane');
        } else if ((key === 'bollPeriod' || key === 'bollStdDev') && activeIndicators.boll) {
          chart.overrideIndicator({ name: 'BOLL', calcParams: [next.bollPeriod, next.bollStdDev] }, 'candle_pane');
        } else if (key === 'rsiPeriod' && activeIndicators.rsi && subPanesRef.current.rsi) {
          chart.overrideIndicator({ name: 'RSI', calcParams: [next.rsiPeriod] }, subPanesRef.current.rsi);
        } else if ((key === 'macdFast' || key === 'macdSlow' || key === 'macdSignal') && activeIndicators.macd && subPanesRef.current.macd) {
          chart.overrideIndicator({ name: 'MACD', calcParams: [next.macdFast, next.macdSlow, next.macdSignal] }, subPanesRef.current.macd);
        }
      }
      return next;
    });
  };

  const toggleIndicator = (key: keyof typeof activeIndicators) => {
    setActiveIndicators((prev) => {
      const nextVal = !prev[key];
      const chart = chartRef.current;
      if (chart) {
        if (key === 'swingHl') {
          if (nextVal) {
            chart.createIndicator(
              {
                name: 'SWING_HL',
                calcParams: [
                  indicatorParams.swingHlWindow,
                  indicatorParams.swingHlShowLine ? 1 : 0,
                  indicatorParams.swingHlShowChochBos ? 1 : 0,
                  indicatorParams.swingHlConfirmBars,
                  indicatorParams.swingHlShowPercent ? 1 : 0,
                ],
                styles: chartTheme.smc as any,
              },
              true,
              { id: 'candle_pane' }
            );
          } else {
            chart.removeIndicator('candle_pane', 'SWING_HL');
          }
        } else if (key === 'ema') {
          if (nextVal) {
            chart.createIndicator(
              {
                name: 'EMA',
                calcParams: [indicatorParams.emaShort, indicatorParams.emaLong],
                styles: getEmaIndicatorStyles(chartTheme.ema) as any,
              },
              true,
              { id: 'candle_pane' }
            );
          } else {
            chart.removeIndicator('candle_pane', 'EMA');
          }
        } else if (key === 'boll') {
          if (nextVal) {
            chart.createIndicator(
              {
                name: 'BOLL',
                calcParams: [indicatorParams.bollPeriod, indicatorParams.bollStdDev],
                styles: getBollIndicatorStyles(chartTheme.boll) as any,
              },
              true,
              { id: 'candle_pane' }
            );
          } else {
            chart.removeIndicator('candle_pane', 'BOLL');
          }
        } else if (key === 'vol') {
          if (nextVal) {
            subPanesRef.current.vol =
              chart.createIndicator(
                {
                  name: 'VOL',
                  calcParams: [20],
                  styles: getVolIndicatorStyles(chartTheme.vol, isDark) as any,
                },
                false,
                { height: 85, dragEnabled: true }
              ) ?? undefined;
          } else if (subPanesRef.current.vol) {
            chart.removeIndicator(subPanesRef.current.vol);
            delete subPanesRef.current.vol;
          }
        } else if (key === 'rsi') {
          if (nextVal) {
            subPanesRef.current.rsi =
              chart.createIndicator(
                {
                  name: 'RSI',
                  calcParams: [indicatorParams.rsiPeriod],
                  styles: getRsiIndicatorStyles(chartTheme.rsi) as any,
                },
                false,
                { height: 90, dragEnabled: true }
              ) ?? undefined;
          } else if (subPanesRef.current.rsi) {
            chart.removeIndicator(subPanesRef.current.rsi);
            delete subPanesRef.current.rsi;
          }
        } else if (key === 'macd') {
          if (nextVal) {
            subPanesRef.current.macd =
              chart.createIndicator(
                {
                  name: 'MACD',
                  calcParams: [indicatorParams.macdFast, indicatorParams.macdSlow, indicatorParams.macdSignal],
                  styles: getMacdIndicatorStyles(chartTheme.macd) as any,
                },
                false,
                { height: 95, dragEnabled: true }
              ) ?? undefined;
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

    const klineData: KLineData[] = allBars.map((b) => {
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

    if (resolution === 'M') {
      const containerW = chartContainerRef.current?.clientWidth || 1200;
      const calcSpace = Math.max(12, Math.min(22, Math.floor((containerW - 100) / Math.max(klineData.length, 1))));
      chartRef.current.setBarSpace(calcSpace);
      chartRef.current.setOffsetRightDistance(60);
      chartRef.current.scrollToRealTime();
    } else if (resolution === 'W') {
      chartRef.current.setBarSpace(10);
      chartRef.current.setOffsetRightDistance(70);
      chartRef.current.scrollToRealTime();
    } else {
      chartRef.current.setBarSpace(8);
      chartRef.current.setOffsetRightDistance(80);
    }
  }, [allBars, resolution]);

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
      if (drawingOverlayIdRef.current) {
        try {
          chartRef.current.removeOverlay(drawingOverlayIdRef.current);
        } catch {}
        drawingOverlayIdRef.current = null;
      }
      return;
    }
    // KLineCharts native createOverlay kích hoạt chế độ vẽ trực tiếp trên canvas
    const overlayId = chartRef.current.createOverlay({
      name: tool,
      onDrawEnd: () => {
        setActiveTool('cursor');
        drawingOverlayIdRef.current = null;
        return true;
      },
    });
    drawingOverlayIdRef.current = typeof overlayId === 'string' ? overlayId : null;
  };

  const handleClearAllOverlays = () => {
    if (window.confirm(`Xóa toàn bộ các nét vẽ trên biểu đồ ${ticker}?`)) {
      chartRef.current?.removeOverlay();
      drawingOverlayIdRef.current = null;
      setActiveTool('cursor');
    }
  };

  // ─── ESC key ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeTool !== 'cursor') {
          if (drawingOverlayIdRef.current && chartRef.current) {
            try {
              chartRef.current.removeOverlay(drawingOverlayIdRef.current);
            } catch {}
            drawingOverlayIdRef.current = null;
          }
          setActiveTool('cursor');
        } else if (!isStandalone && onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, activeTool, isStandalone]);

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

  if (!isOpen) return null;

  const displayPrice = livePrice ?? (effectiveStockData.currentPrice || 0);

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
      className={
        isStandalone
          ? "w-full flex-1 flex flex-col bg-white dark:bg-gray-950 overflow-hidden relative"
          : "fixed inset-0 z-50 w-screen h-screen flex flex-col bg-white dark:bg-gray-950 overflow-hidden"
      }
      role={isStandalone ? "region" : "dialog"}
      aria-modal={isStandalone ? undefined : "true"}
      aria-label={`Biểu đồ kỹ thuật ${ticker}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Ticker Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowTickerSearch((v) => !v)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-gray-200/80 dark:bg-gray-800 hover:bg-gray-300/80 dark:hover:bg-gray-700 transition cursor-pointer group"
              title="Bấm để chuyển sang mã cổ phiếu khác"
            >
              <span className="text-xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
                {ticker}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-slate-900 dark:group-hover:text-white transition" />
            </button>

            {showTickerSearch && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTickerSearch(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-3 select-none">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Gõ mã cổ phiếu (VD: SSI, KBC, HPG)..."
                      value={tickerSearchInput}
                      onChange={(e) => setTickerSearchInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const query = tickerSearchInput.trim().toUpperCase();
                          if (query) {
                            if (onSelectTicker) onSelectTicker(query);
                            setShowTickerSearch(false);
                            setTickerSearchInput('');
                          }
                        }
                      }}
                      autoFocus
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 uppercase font-mono font-bold"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {/* Hiển thị nút nạp trực tiếp mã đã gõ nếu có input */}
                    {tickerSearchInput.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const query = tickerSearchInput.trim().toUpperCase();
                          if (onSelectTicker) onSelectTicker(query);
                          setShowTickerSearch(false);
                          setTickerSearchInput('');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold transition mb-1.5"
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <Search className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" />
                          <span>Xem biểu đồ mã <strong className="font-mono text-sm">{tickerSearchInput.trim().toUpperCase()}</strong></span>
                        </div>
                        <span className="text-[10px] bg-indigo-200 dark:bg-indigo-800 px-1.5 py-0.5 rounded font-mono">↵ Enter</span>
                      </button>
                    )}

                    {/* Danh sách các mã gợi ý */}
                    {allStocks && allStocks.length > 0 ? (
                      allStocks
                        .filter(
                          (s) =>
                            s.ticker.includes(tickerSearchInput.trim().toUpperCase()) ||
                            s.companyName.toLowerCase().includes(tickerSearchInput.trim().toLowerCase())
                        )
                        .slice(0, 10)
                        .map((s) => (
                          <button
                            key={s.ticker}
                            onClick={() => {
                              if (onSelectTicker) onSelectTicker(s.ticker);
                              setShowTickerSearch(false);
                              setTickerSearchInput('');
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition ${
                              s.ticker === ticker ? 'bg-indigo-50/80 dark:bg-indigo-950/80 font-bold' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-black text-slate-900 dark:text-white font-mono">{s.ticker}</span>
                              <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{s.companyName}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">RS {s.rsRating}</span>
                          </button>
                        ))
                    ) : (
                      !tickerSearchInput.trim() && (
                        <div className="text-center py-3 text-xs text-gray-400">
                          Nhập mã cổ phiếu để xem biểu đồ
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {effectiveStockData.exchange}
          </span>
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${gradeColor(effectiveStockData.rankGrade)}`}>
            Hạng {effectiveStockData.rankGrade}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-300 truncate max-w-[320px] hidden md:inline">
            {effectiveStockData.companyName}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden lg:inline">
            • {effectiveStockData.industry}
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {!isStandalone ? (
            <>
              <Link
                href={`/chart?ticker=${ticker}`}
                className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition flex items-center space-x-1.5 border border-gray-200 dark:border-gray-700/80 shadow-2xs"
                title="Mở biểu đồ trong tab riêng"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mở tab riêng</span>
              </Link>
              <span className="text-xs text-gray-400 hidden sm:inline">
                Nhấn <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[10px]">ESC</kbd> để đóng
              </span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition flex-shrink-0 cursor-pointer"
                  aria-label="Đóng toàn màn hình"
                  title="Đóng (ESC)"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </>
          ) : (
            <>
              <Link
                href="/ranking"
                className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition flex items-center space-x-1.5 border border-gray-200 dark:border-gray-700/80 shadow-2xs"
                title="Xem bộ lọc & xếp hạng RS"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Bộ Lọc RS</span>
              </Link>
              <button
                onClick={toggleFullScreen}
                className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition flex-shrink-0 cursor-pointer"
                aria-label="Chế độ toàn màn hình"
                title={isFullscreen ? 'Thu nhỏ (ESC)' : 'Toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Price & ROC Pill + Cycle Pill + Key Metrics */}
      <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-950 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Combined Price + ROC Pill */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-300/70 dark:border-gray-700/70 text-xs">
            <span className={`font-bold tabular-nums ${priceColor}`}>
              {fmt(displayPrice)} đ
            </span>
            {priceChange !== null && (
              <span className={`font-bold tabular-nums flex items-center space-x-1 ${priceColor}`}>
                <span className="text-gray-400 dark:text-gray-600 font-normal">|</span>
                <span>{priceChange.abs > 0 ? '▲ +' : priceChange.abs < 0 ? '▼ ' : '● '}</span>
                <span>{fmt(Math.abs(priceChange.abs))}đ</span>
                <span>({priceChange.pct > 0 ? '+' : ''}{priceChange.pct.toFixed(2)}%)</span>
              </span>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium border-l border-gray-300 dark:border-gray-700 pl-2">
              ⏱ 15s
            </span>
          </div>

          {/* Cycle (Resolution) Pill */}
          <div className="flex items-center bg-gray-200/90 dark:bg-gray-800/90 p-1 rounded-xl border border-gray-300/70 dark:border-gray-700/70 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 px-2 select-none">
              Chu kỳ:
            </span>
            {(['D', 'W', 'M'] as Resolution[]).map((res) => {
              const label = res;
              const active = resolution === res;
              return (
                <button
                  key={res}
                  onClick={() => handleSelectResolution(res)}
                  className={`
                    px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer
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
        </div>

        {/* Key Metrics */}
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500 dark:text-gray-400">
          <div>
            <span className="text-gray-400">RS (1T): </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{effectiveStockData.rsRating}</span>
          </div>
          <div>
            <span className="text-gray-400">Điểm ValueX: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">{effectiveStockData.totalScore}/150đ</span>
          </div>
          <div>
            <span className="text-gray-400">GTGD 20N: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">{effectiveStockData.adtv20Billion.toFixed(1)} Tỷ</span>
          </div>
          <div>
            <span className="text-gray-400">EPS Core YoY: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">
              {effectiveStockData.coreEpsGrowthYoY > 0 ? `+${effectiveStockData.coreEpsGrowthYoY}%` : `${effectiveStockData.coreEpsGrowthYoY}%`}
            </span>
          </div>
          <div>
            <span className="text-gray-400">LNST Core YoY: </span>
            <span className="font-bold text-slate-800 dark:text-gray-200">
              {effectiveStockData.coreNetProfitGrowthYoY > 0 ? `+${effectiveStockData.coreNetProfitGrowthYoY}%` : `${effectiveStockData.coreNetProfitGrowthYoY}%`}
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

      {/* Row 3: Combined Toolbar (OHLC left + fx & Dividend right) */}
      <div className="flex items-center justify-between px-6 py-1.5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-900/40 flex-shrink-0 gap-4 flex-wrap min-h-[36px]">
        {/* Left: OHLC Bar */}
        <div className="flex items-center space-x-3 sm:space-x-4 text-xs tabular-nums font-mono overflow-x-auto text-slate-700 dark:text-gray-200">
          {activeOhlc ? (
            <>
              <span className="text-gray-500 dark:text-gray-400 font-sans font-medium text-[11px] flex items-center gap-1.5">
                {crosshairData ? (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
                    {formatDateStr(activeOhlc.date) || 'Đang chọn'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-gray-200/90 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
                    Phiên {activeOhlc.date ? `${formatDateStr(activeOhlc.date)}` : 'gần nhất'}
                  </span>
                )}
              </span>
              <span>O: <strong className="font-bold text-slate-900 dark:text-white">{fmt(activeOhlc.o)}</strong></span>
              <span>H: <strong className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(activeOhlc.h)}</strong></span>
              <span>L: <strong className="font-bold text-rose-600 dark:text-rose-400">{fmt(activeOhlc.l)}</strong></span>
              <span>C: <strong className={`font-bold ${closeColor}`}>{fmt(activeOhlc.c)}</strong></span>
              <span className="hidden sm:inline">
                Diff: <strong className={`font-bold ${closeColor}`}>
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

        {/* Right: Indicators & Event toggles */}
        <div className="flex items-center space-x-3 ml-auto">
          {/* Theme & Color Settings Button */}
          <button
            onClick={() => {
              setColorModalTab('candle');
              setShowColorModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer shadow-2xs"
            title="Tùy biến bảng màu nến và chỉ báo kỹ thuật"
          >
            <Palette className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Màu sắc</span>
          </button>

          {/* Indicators Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu((v) => !v)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer shadow-2xs"
              title="Quản lý các chỉ báo kỹ thuật & tùy chỉnh thông số"
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
                <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-3 text-xs space-y-2 select-none animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-gray-100 dark:border-gray-800">
                    <span className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                      Quản lý & Cấu hình Chỉ báo
                    </span>
                    <button
                      onClick={() => setShowIndicatorMenu(false)}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Group 1: Trên nến */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                      Chỉ báo trên nến
                    </div>

                    {/* Đỉnh - Đáy cá nhân */}
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 transition">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeIndicators.swingHl}
                            onChange={() => toggleIndicator('swingHl')}
                            className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4 cursor-pointer"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-gray-100">Đỉnh - Đáy &amp; Cấu trúc SMC</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorModalTab('overlay');
                            setShowColorModal(true);
                            setShowIndicatorMenu(false);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition"
                          title="Cài đặt màu sắc cho SMC Đỉnh Đáy"
                        >
                          <Palette className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {activeIndicators.swingHl && (
                        <div className="mt-2 pl-6 flex flex-col space-y-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <div className="flex items-center justify-between">
                            <span>Số nến kiểm tra đỉnh đáy:</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={indicatorParams.swingHlWindow}
                                onChange={(e) => handleParamChange('swingHlWindow', Number(e.target.value))}
                                className="w-14 px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 text-center"
                              />
                              <span className="text-[10px] text-gray-400">(nến)</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Nến xác nhận CHoCH:</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={indicatorParams.swingHlConfirmBars}
                                onChange={(e) => handleParamChange('swingHlConfirmBars', Number(e.target.value))}
                                className="w-14 px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 text-center"
                              />
                              <span className="text-[10px] text-gray-400">(đóng cửa)</span>
                            </div>
                          </div>
                          <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={indicatorParams.swingHlShowLine}
                              onChange={(e) => handleToggleSwingHlLine(e.target.checked)}
                              className="rounded text-amber-500 focus:ring-amber-400 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="font-semibold text-slate-700 dark:text-gray-300">Hiện đường nối Zigzag</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={indicatorParams.swingHlShowChochBos}
                              onChange={(e) => handleToggleChochBos(e.target.checked)}
                              className="rounded text-emerald-500 focus:ring-emerald-400 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="font-semibold text-slate-700 dark:text-gray-300">Hiện đường CHoCH &amp; BOS</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={indicatorParams.swingHlShowPercent}
                              onChange={(e) => handleToggleSwingHlPercent(e.target.checked)}
                              className="rounded text-sky-500 focus:ring-sky-400 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="font-semibold text-slate-700 dark:text-gray-300">Hiện % tăng/giảm nhịp sóng</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Đường EMA */}
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 transition">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeIndicators.ema}
                            onChange={() => toggleIndicator('ema')}
                            className="rounded text-blue-500 focus:ring-blue-400 h-4 w-4 cursor-pointer"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-gray-100">Đường trung bình EMA</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorModalTab('overlay');
                            setShowColorModal(true);
                            setShowIndicatorMenu(false);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition"
                          title="Cài đặt màu sắc cho EMA"
                        >
                          <Palette className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {activeIndicators.ema && (
                        <div className="mt-2 pl-6 flex items-center space-x-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap gap-y-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-blue-500 font-bold">EMA 1:</span>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={indicatorParams.emaShort}
                              onChange={(e) => handleParamChange('emaShort', Number(e.target.value))}
                              className="w-14 px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-blue-500 text-center"
                            />
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-amber-500 font-bold">EMA 2:</span>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={indicatorParams.emaLong}
                              onChange={(e) => handleParamChange('emaLong', Number(e.target.value))}
                              className="w-14 px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 text-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bollinger Bands */}
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 transition">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeIndicators.boll}
                            onChange={() => toggleIndicator('boll')}
                            className="rounded text-purple-500 focus:ring-purple-400 h-4 w-4 cursor-pointer"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-gray-100">Bollinger Bands (BOLL)</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorModalTab('overlay');
                            setShowColorModal(true);
                            setShowIndicatorMenu(false);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition"
                          title="Cài đặt màu sắc cho BOLL"
                        >
                          <Palette className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {activeIndicators.boll && (
                        <div className="mt-2 pl-6 flex items-center space-x-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap gap-y-1">
                          <div className="flex items-center space-x-1">
                            <span>Chu kỳ:</span>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={indicatorParams.bollPeriod}
                              onChange={(e) => handleParamChange('bollPeriod', Number(e.target.value))}
                              className="w-14 px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-purple-500 text-center"
                            />
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Độ lệch:</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              step={0.5}
                              value={indicatorParams.bollStdDev}
                              onChange={(e) => handleParamChange('bollStdDev', Number(e.target.value))}
                              className="w-12 px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-purple-500 text-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group 2: Bảng phụ bên dưới */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                      Bảng phụ bên dưới
                    </div>

                    {/* Khối lượng (VOL) */}
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 transition">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeIndicators.vol}
                            onChange={() => toggleIndicator('vol')}
                            className="rounded text-emerald-500 focus:ring-emerald-400 h-4 w-4 cursor-pointer"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-gray-100">Khối lượng (VOL)</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorModalTab('candle');
                            setShowColorModal(true);
                            setShowIndicatorMenu(false);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition"
                          title="Cài đặt màu sắc cho Khối lượng"
                        >
                          <Palette className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* RSI */}
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 transition">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeIndicators.rsi}
                            onChange={() => toggleIndicator('rsi')}
                            className="rounded text-cyan-500 focus:ring-cyan-400 h-4 w-4 cursor-pointer"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-gray-100">Chỉ số RSI</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorModalTab('subpanes');
                            setShowColorModal(true);
                            setShowIndicatorMenu(false);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition"
                          title="Cài đặt màu sắc cho RSI"
                        >
                          <Palette className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {activeIndicators.rsi && (
                        <div className="mt-2 pl-6 flex items-center space-x-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <span>Chu kỳ:</span>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={indicatorParams.rsiPeriod}
                            onChange={(e) => handleParamChange('rsiPeriod', Number(e.target.value))}
                            className="w-14 px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-cyan-500 text-center"
                          />
                        </div>
                      )}
                    </div>

                    {/* MACD */}
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 transition">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeIndicators.macd}
                            onChange={() => toggleIndicator('macd')}
                            className="rounded text-rose-500 focus:ring-rose-400 h-4 w-4 cursor-pointer"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-gray-100">Đường MACD</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorModalTab('subpanes');
                            setShowColorModal(true);
                            setShowIndicatorMenu(false);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition"
                          title="Cài đặt màu sắc cho MACD"
                        >
                          <Palette className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {activeIndicators.macd && (
                        <div className="mt-2 pl-6 flex items-center space-x-2 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap gap-y-1">
                          <div className="flex items-center space-x-1">
                            <span>Nhanh:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={indicatorParams.macdFast}
                              onChange={(e) => handleParamChange('macdFast', Number(e.target.value))}
                              className="w-11 px-1 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-rose-500 text-center"
                            />
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Chậm:</span>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={indicatorParams.macdSlow}
                              onChange={(e) => handleParamChange('macdSlow', Number(e.target.value))}
                              className="w-11 px-1 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-rose-500 text-center"
                            />
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Signal:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={indicatorParams.macdSignal}
                              onChange={(e) => handleParamChange('macdSignal', Number(e.target.value))}
                              className="w-11 px-1 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-rose-500 text-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
        <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
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

      {/* Modal Cài đặt Màu sắc & Giao diện */}
      <ChartColorSettingsModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        theme={chartTheme}
        onThemeChange={handleThemeChange}
        initialTab={colorModalTab}
      />
    </div>
  );
}
