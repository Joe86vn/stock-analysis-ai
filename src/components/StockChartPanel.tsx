'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  Settings,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { ChartUtilitySidebar } from './chart/sidebar/ChartUtilitySidebar';
import { StockRankingItem } from '@/lib/filter-rs-data';
import { useTheme } from '@/components/ThemeProvider';
import { DrawingToolType } from './chart/drawing-types';
import { DrawingToolbar } from './chart/DrawingToolbar';
import { registerSwingHighLowIndicator } from './chart/indicators/custom-swing-hl';
import { registerMeasureOverlay } from './chart/overlays/measure-overlay';
import { registerDividendMarkerOverlay } from './chart/overlays/dividend-marker-overlay';
import { registerFundamentalIndicators } from './chart/indicators/fundamental-indicators';
import { enrichKLineWithFundamentals } from '@/lib/fundamental-indicator-helper';
import type { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';
import { resampleDailyToWeekly, resampleDailyToMonthly } from '@/lib/resample-ohlc';
import {
  ChartColorTheme,
  StatusLineConfig,
  CanvasConfig,
  loadSavedTheme,
  saveTheme,
  loadSavedStatusLineConfig,
  saveStatusLineConfig,
  loadSavedCanvasConfig,
  saveCanvasConfig,
  getKLineThemeFromCustom,
  hexToRgba,
  DEFAULT_CHART_THEME,
  getVolIndicatorStyles,
  getEmaIndicatorStyles,
  getBollIndicatorStyles,
  getRsiIndicatorStyles,
  getMacdIndicatorStyles,
} from './chart/chart-theme-types';
import { ChartSettingsModal } from './chart/ChartSettingsModal';
import { IndicatorSettingsDialog, IndicatorPlotConfig } from './chart/IndicatorSettingsDialog';

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

function getKLineTheme(isDark: boolean, customTheme?: ChartColorTheme, canvasConfig?: CanvasConfig): any {
  return getKLineThemeFromCustom(customTheme || DEFAULT_CHART_THEME, isDark, canvasConfig);
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

  const effectiveStockData: StockRankingItem = (
    internalStockData?.ticker === ticker
      ? internalStockData
      : stockData?.ticker === ticker
      ? stockData
      : {
          ticker: ticker || 'CP',
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
        }
  ) as StockRankingItem;

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
  const dividendOverlayIdsRef = useRef<string[]>([]);
  const [hoveredDividend, setHoveredDividend] = useState<{
    data: any;
    x: number;
    y: number;
  } | null>(null);

  // Lắng nghe sự kiện rê chuột vào / rời khỏi Marker Cổ tức từ KLineCharts Overlay
  useEffect(() => {
    const handleMarkerHover = (e: any) => {
      if (e.detail && e.detail.data) {
        setHoveredDividend({
          data: e.detail.data,
          x: e.detail.x ?? 0,
          y: e.detail.y ?? 0,
        });
      }
    };
    const handleMarkerLeave = () => {
      setHoveredDividend(null);
    };

    window.addEventListener('dividend-marker-hover', handleMarkerHover);
    window.addEventListener('dividend-marker-leave', handleMarkerLeave);

    return () => {
      window.removeEventListener('dividend-marker-hover', handleMarkerHover);
      window.removeEventListener('dividend-marker-leave', handleMarkerLeave);
    };
  }, []);

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
    pe: false,
    pb: false,
    coreEps: false,
    revenue: false,
  });
  const [quarterlyFinancials, setQuarterlyFinancials] = useState<ParsedVietcapQuarter[]>([]);
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
  const subPanesRef = useRef<{
    vol?: string;
    rsi?: string;
    macd?: string;
    pe?: string;
    pb?: string;
    coreEps?: string;
    revenue?: string;
  }>({});

  // ─── Theme & Settings State ────────────────────────────────────────────────
  const [chartTheme, setChartTheme] = useState<ChartColorTheme>(() => loadSavedTheme());
  const [statusLineConfig, setStatusLineConfig] = useState<StatusLineConfig>(() => loadSavedStatusLineConfig());
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(() => loadSavedCanvasConfig());
  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'symbol' | 'status' | 'canvas'>('symbol');

  const [indicatorDialogState, setIndicatorDialogState] = useState<{
    isOpen: boolean;
    indicatorId: string;
    title: string;
    plots: IndicatorPlotConfig[];
    initialTab?: 'params' | 'format';
  }>({
    isOpen: false,
    indicatorId: '',
    title: '',
    plots: [],
    initialTab: 'params',
  });

  // ─── Utility Sidebar State ────────────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('stock_chart_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('stock_chart_sidebar_open', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Phím tắt bàn phím \ để bật/tắt sidebar tiện ích
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Tự động resize KLineCharts khi container hoặc sidebar thay đổi
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    });
    ro.observe(chartContainerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    }, 120);
    return () => clearTimeout(t);
  }, [showSidebar]);

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

  const currentTickerRef = useRef<string | null>(ticker);
  useEffect(() => {
    currentTickerRef.current = ticker;
  }, [ticker]);

  // ─── Poll live price ─────────────────────────────────────────────────────

  const pollLivePrice = useCallback(async (t: string) => {
    try {
      const res = await fetch(`/api/stocks/${t}/price`);
      if (!res.ok) return;
      const data = await res.json();
      // Ngăn chặn ghi đè giá nếu user đã chuyển sang ticker khác trong lúc chờ fetch
      if (currentTickerRef.current !== t) return;
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

    // Chỉ gán livePrice ban đầu nếu stockData truyền vào khớp với ticker hiện tại
    if (stockData && stockData.ticker === ticker) {
      setLivePrice(stockData.currentPrice || null);
      if (typeof stockData.priceChangePercent === 'number') {
        setPriceChange({ abs: stockData.priceChange || 0, pct: stockData.priceChangePercent });
      } else {
        setPriceChange(null);
      }
    } else {
      setLivePrice(null);
      setPriceChange(null);
      setInternalStockData(null);
    }

    setCrosshairData(null);
    setActiveTool('cursor');

    Promise.all([fetchPriceHistory(ticker, 'D'), pollLivePrice(ticker)]);

    fetch(`/api/stocks/${ticker}/events`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setDividendEvents(json.data);
        }
      })
      .catch(() => {});

    fetch(`/api/stocks/${ticker}/financials`)
      .then((res) => res.json())
      .then((json) => {
        if (json.quarters && Array.isArray(json.quarters)) {
          setQuarterlyFinancials(json.quarters);
        }
      })
      .catch(() => {});

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
      registerDividendMarkerOverlay();
      registerFundamentalIndicators();

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
      chart.setStyles(getKLineTheme(isDark, chartTheme, canvasConfig));

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
      chartRef.current.setStyles(getKLineTheme(isDark, chartTheme, canvasConfig));
    }
  }, [isDark, chartTheme, canvasConfig]);

  // ─── Xử lý thay đổi Theme & Màu sắc động ──────────────────────────────────

  const handleThemeChange = (newTheme: ChartColorTheme) => {
    setChartTheme(newTheme);
    saveTheme(newTheme);

    const chart = chartRef.current;
    if (!chart) return;

    // 1. Áp dụng styles tổng cho nến & lưới & trục giá
    chart.setStyles(getKLineTheme(isDark, newTheme, canvasConfig));

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

  const handleCanvasConfigChange = (newConfig: CanvasConfig) => {
    setCanvasConfig(newConfig);
    saveCanvasConfig(newConfig);
    if (chartRef.current) {
      chartRef.current.setStyles(getKLineTheme(isDark, chartTheme, newConfig));
    }
  };

  const handleStatusLineConfigChange = (newConfig: StatusLineConfig) => {
    setStatusLineConfig(newConfig);
    saveStatusLineConfig(newConfig);
  };

  const openIndicatorSettings = (indicatorId: string, initialTab: 'params' | 'format' = 'params') => {
    setShowIndicatorMenu(false);
    if (indicatorId === 'ema') {
      setIndicatorDialogState({
        isOpen: true,
        indicatorId: 'ema',
        title: 'Đường trung bình EMA',
        initialTab,
        plots: [
          {
            id: 'ema1',
            name: `EMA 1 (${indicatorParams.emaShort})`,
            visible: true,
            color: chartTheme.ema.ema1Color,
            lineWidth: 1.5,
            lineStyle: 'solid',
          },
          {
            id: 'ema2',
            name: `EMA 2 (${indicatorParams.emaLong})`,
            visible: true,
            color: chartTheme.ema.ema2Color,
            lineWidth: 1.5,
            lineStyle: 'solid',
          },
        ],
      });
    } else if (indicatorId === 'boll') {
      setIndicatorDialogState({
        isOpen: true,
        indicatorId: 'boll',
        title: 'Bollinger Bands (BOLL)',
        initialTab,
        plots: [
          {
            id: 'up',
            name: 'Dải trên (Upper Band)',
            visible: true,
            color: chartTheme.boll.upColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
          {
            id: 'mid',
            name: 'Đường giữa (SMA 20)',
            visible: true,
            color: chartTheme.boll.midColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
          {
            id: 'down',
            name: 'Dải dưới (Lower Band)',
            visible: true,
            color: chartTheme.boll.downColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
        ],
      });
    } else if (indicatorId === 'swingHl') {
      setIndicatorDialogState({
        isOpen: true,
        indicatorId: 'swingHl',
        title: 'Cấu trúc SMC (Đỉnh - Đáy)',
        initialTab,
        plots: [
          {
            id: 'zigzag',
            name: 'Đường sóng Zigzag',
            visible: indicatorParams.swingHlShowLine,
            color: chartTheme.smc.zigzagColor,
            lineWidth: 1.5,
            lineStyle: 'solid',
          },
          {
            id: 'peak',
            name: 'Nhãn Đỉnh (HH, LH)',
            visible: true,
            color: chartTheme.smc.peakColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
          {
            id: 'trough',
            name: 'Nhãn Đáy (HL, LL)',
            visible: true,
            color: chartTheme.smc.troughColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
        ],
      });
    } else if (indicatorId === 'vol') {
      setIndicatorDialogState({
        isOpen: true,
        indicatorId: 'vol',
        title: 'Khối lượng (VOL)',
        initialTab,
        plots: [
          {
            id: 'volUp',
            name: 'Khối lượng tăng',
            visible: true,
            color: chartTheme.vol.upColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
          {
            id: 'volDown',
            name: 'Khối lượng giảm',
            visible: true,
            color: chartTheme.vol.downColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
          {
            id: 'volMa',
            name: 'Đường MA 20 Vol',
            visible: true,
            color: chartTheme.vol.maColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
        ],
      });
    } else if (indicatorId === 'rsi') {
      setIndicatorDialogState({
        isOpen: true,
        indicatorId: 'rsi',
        title: 'Chỉ số RSI',
        initialTab,
        plots: [
          {
            id: 'line',
            name: 'Đường RSI (14)',
            visible: true,
            color: chartTheme.rsi.lineColor,
            lineWidth: 1.2,
            lineStyle: 'solid',
          },
        ],
      });
    } else if (indicatorId === 'macd') {
      setIndicatorDialogState({
        isOpen: true,
        indicatorId: 'macd',
        title: 'Chỉ báo MACD',
        initialTab,
        plots: [
          {
            id: 'dif',
            name: 'Đường MACD (Fast)',
            visible: true,
            color: chartTheme.macd.difColor,
            lineWidth: 1.2,
            lineStyle: 'solid',
          },
          {
            id: 'dea',
            name: 'Đường Signal (Slow)',
            visible: true,
            color: chartTheme.macd.deaColor,
            lineWidth: 1.2,
            lineStyle: 'solid',
          },
          {
            id: 'hist',
            name: 'Cột Histogram',
            visible: true,
            color: chartTheme.macd.histUpColor,
            lineWidth: 1,
            lineStyle: 'solid',
          },
        ],
      });
    }
  };

  const handleSaveIndicatorPlots = (plots: IndicatorPlotConfig[]) => {
    const { indicatorId } = indicatorDialogState;
    if (indicatorId === 'ema') {
      const p1 = plots.find((p) => p.id === 'ema1');
      const p2 = plots.find((p) => p.id === 'ema2');
      const nextTheme = {
        ...chartTheme,
        ema: {
          ema1Color: p1 ? p1.color : chartTheme.ema.ema1Color,
          ema2Color: p2 ? p2.color : chartTheme.ema.ema2Color,
        },
      };
      handleThemeChange(nextTheme);
    } else if (indicatorId === 'boll') {
      const up = plots.find((p) => p.id === 'up');
      const mid = plots.find((p) => p.id === 'mid');
      const down = plots.find((p) => p.id === 'down');
      const nextTheme = {
        ...chartTheme,
        boll: {
          upColor: up ? up.color : chartTheme.boll.upColor,
          midColor: mid ? mid.color : chartTheme.boll.midColor,
          downColor: down ? down.color : chartTheme.boll.downColor,
        },
      };
      handleThemeChange(nextTheme);
    } else if (indicatorId === 'swingHl') {
      const zz = plots.find((p) => p.id === 'zigzag');
      const pk = plots.find((p) => p.id === 'peak');
      const tr = plots.find((p) => p.id === 'trough');
      const nextTheme = {
        ...chartTheme,
        smc: {
          ...chartTheme.smc,
          zigzagColor: zz ? zz.color : chartTheme.smc.zigzagColor,
          peakColor: pk ? pk.color : chartTheme.smc.peakColor,
          troughColor: tr ? tr.color : chartTheme.smc.troughColor,
        },
      };
      if (zz && zz.visible !== indicatorParams.swingHlShowLine) {
        handleToggleSwingHlLine(zz.visible);
      }
      handleThemeChange(nextTheme);
    } else if (indicatorId === 'vol') {
      const u = plots.find((p) => p.id === 'volUp');
      const d = plots.find((p) => p.id === 'volDown');
      const ma = plots.find((p) => p.id === 'volMa');
      const nextTheme = {
        ...chartTheme,
        vol: {
          upColor: u ? u.color : chartTheme.vol.upColor,
          downColor: d ? d.color : chartTheme.vol.downColor,
          noChangeColor: chartTheme.vol.noChangeColor,
          maColor: ma ? ma.color : chartTheme.vol.maColor,
        },
      };
      handleThemeChange(nextTheme);
    } else if (indicatorId === 'rsi') {
      const l = plots.find((p) => p.id === 'line');
      const nextTheme = {
        ...chartTheme,
        rsi: {
          lineColor: l ? l.color : chartTheme.rsi.lineColor,
        },
      };
      handleThemeChange(nextTheme);
    } else if (indicatorId === 'macd') {
      const dif = plots.find((p) => p.id === 'dif');
      const dea = plots.find((p) => p.id === 'dea');
      const hist = plots.find((p) => p.id === 'hist');
      const nextTheme = {
        ...chartTheme,
        macd: {
          difColor: dif ? dif.color : chartTheme.macd.difColor,
          deaColor: dea ? dea.color : chartTheme.macd.deaColor,
          histUpColor: hist ? hist.color : chartTheme.macd.histUpColor,
          histDownColor: hist ? hist.color : chartTheme.macd.histDownColor,
        },
      };
      handleThemeChange(nextTheme);
    }
  };

  const handleSaveIndicatorParams = (newParams: any) => {
    setIndicatorParams((prev) => {
      const next = { ...prev, ...newParams };
      const chart = chartRef.current;
      const { indicatorId } = indicatorDialogState;

      if (chart) {
        if (indicatorId === 'swingHl' && activeIndicators.swingHl) {
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
        } else if (indicatorId === 'ema' && activeIndicators.ema) {
          chart.overrideIndicator(
            { name: 'EMA', calcParams: [next.emaShort, next.emaLong] },
            'candle_pane'
          );
        } else if (indicatorId === 'boll' && activeIndicators.boll) {
          chart.overrideIndicator(
            { name: 'BOLL', calcParams: [next.bollPeriod, next.bollStdDev] },
            'candle_pane'
          );
        } else if (indicatorId === 'vol' && activeIndicators.vol && subPanesRef.current.vol) {
          chart.overrideIndicator(
            { name: 'VOL', calcParams: [next.volMaPeriod ?? 20] },
            subPanesRef.current.vol
          );
        } else if (indicatorId === 'rsi' && activeIndicators.rsi && subPanesRef.current.rsi) {
          chart.overrideIndicator(
            { name: 'RSI', calcParams: [next.rsiPeriod] },
            subPanesRef.current.rsi
          );
        } else if (indicatorId === 'macd' && activeIndicators.macd && subPanesRef.current.macd) {
          chart.overrideIndicator(
            { name: 'MACD', calcParams: [next.macdFast, next.macdSlow, next.macdSignal] },
            subPanesRef.current.macd
          );
        }
      }
      return next;
    });
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
        } else if (key === 'pe') {
          if (nextVal) {
            subPanesRef.current.pe =
              chart.createIndicator(
                { name: 'FUNDAMENTAL_PE' },
                false,
                { height: 110, dragEnabled: true }
              ) ?? undefined;
          } else if (subPanesRef.current.pe) {
            chart.removeIndicator(subPanesRef.current.pe);
            delete subPanesRef.current.pe;
          }
        } else if (key === 'pb') {
          if (nextVal) {
            subPanesRef.current.pb =
              chart.createIndicator(
                { name: 'FUNDAMENTAL_PB' },
                false,
                { height: 110, dragEnabled: true }
              ) ?? undefined;
          } else if (subPanesRef.current.pb) {
            chart.removeIndicator(subPanesRef.current.pb);
            delete subPanesRef.current.pb;
          }
        } else if (key === 'coreEps') {
          if (nextVal) {
            subPanesRef.current.coreEps =
              chart.createIndicator(
                { name: 'FUNDAMENTAL_CORE_EPS' },
                false,
                { height: 95, dragEnabled: true }
              ) ?? undefined;
          } else if (subPanesRef.current.coreEps) {
            chart.removeIndicator(subPanesRef.current.coreEps);
            delete subPanesRef.current.coreEps;
          }
        } else if (key === 'revenue') {
          if (nextVal) {
            subPanesRef.current.revenue =
              chart.createIndicator(
                { name: 'FUNDAMENTAL_REVENUE' },
                false,
                { height: 95, dragEnabled: true }
              ) ?? undefined;
          } else if (subPanesRef.current.revenue) {
            chart.removeIndicator(subPanesRef.current.revenue);
            delete subPanesRef.current.revenue;
          }
        }
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // ─── Nạp dữ liệu nến vào KLineCharts ──────────────────────────────────────

  useEffect(() => {
    if (!chartRef.current || allBars.length === 0) return;

    let klineData: KLineData[] = allBars.map((b) => {
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

    if (quarterlyFinancials.length > 0) {
      klineData = enrichKLineWithFundamentals(klineData, quarterlyFinancials);
    }

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

  // ─── Vẽ Marker Sự kiện Cổ tức & Phát hành (D / S) trên nến ────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 1. Xóa các overlay cũ trước
    if (dividendOverlayIdsRef.current.length > 0) {
      dividendOverlayIdsRef.current.forEach((id) => {
        try {
          chart.removeOverlay(id);
        } catch {}
      });
      dividendOverlayIdsRef.current = [];
    }

    // 2. Nếu nút toggle tắt, dừng lại
    if (!showDividendMarkers || dividendEvents.length === 0 || allBars.length === 0) {
      return;
    }

    // 3. Khớp sự kiện theo ngày không hưởng quyền (exrightDate) với nến
    const createdIds: string[] = [];

    dividendEvents.forEach((ev) => {
      if (!ev.exrightDate) return;
      const exDateStr = ev.exrightDate.slice(0, 10); // YYYY-MM-DD

      // Tìm nến tương ứng
      let matchedBar: OhlcBar | undefined;
      if (resolution === 'D') {
        matchedBar = allBars.find((b) => b.fullDate === exDateStr);
      } else {
        const exTime = new Date(exDateStr + 'T00:00:00Z').getTime();
        const maxDiff = resolution === 'W' ? 7 * 86400000 : 31 * 86400000;
        matchedBar = allBars.find((b) => {
          const bTime = new Date(b.fullDate + 'T00:00:00Z').getTime();
          return Math.abs(bTime - exTime) <= maxDiff;
        });
      }

      if (!matchedBar) return;

      const ts = new Date(matchedBar.fullDate + 'T00:00:00Z').getTime();
      const isCash =
        ev.eventTitleVi?.toLowerCase().includes('tiền mặt') ||
        ev.eventNameVi?.toLowerCase().includes('tiền mặt');

      let shortLabel = '';
      const ratioMatch = ev.eventTitleVi?.match(/(\d+(\.\d+)?%)/);
      if (ratioMatch) {
        shortLabel = ratioMatch[1];
      } else if (ev.exerciseRatio) {
        shortLabel = `${Math.round(ev.exerciseRatio * 100)}%`;
      }

      try {
        const overlayId = chart.createOverlay(
          {
            name: 'dividendMarker',
            lock: true,
            points: [{ timestamp: ts, value: matchedBar.lowestPrice }],
            extendData: {
              type: isCash ? 'cash' : 'stock',
              title: ev.eventTitleVi || ev.eventNameVi,
              dateStr: exDateStr,
              ratio: ev.exerciseRatio,
              shortLabel,
              rawEvent: {
                eventTitleVi: ev.eventTitleVi,
                eventNameVi: ev.eventNameVi,
                eventCode: ev.eventCode,
                exrightDate: ev.exrightDate,
                recordDate: ev.recordDate,
                publicDate: ev.publicDate,
                exerciseRatio: ev.exerciseRatio,
                isUpcoming: ev.isUpcoming,
                category: ev.category,
              },
            },
          },
          'candle_pane'
        );

        if (typeof overlayId === 'string') {
          createdIds.push(overlayId);
        }
      } catch (err) {
        console.warn('[StockChartPanel] Failed to create dividend overlay:', err);
      }
    });

    dividendOverlayIdsRef.current = createdIds;
  }, [showDividendMarkers, dividendEvents, allBars, resolution]);

  // ─── Cập nhật nến cuối với livePrice ──────────────────────────────────────

  useEffect(() => {
    if (!livePrice || !chartRef.current || allBars.length === 0) return;
    const lastBar = allBars[allBars.length - 1];

    // Kiểm tra an toàn: Nếu livePrice lệch trên 40% so với giá đóng cửa nến cuối của lịch sử,
    // đây là hiện tượng nốt giá cũ của mã khác hoặc sai số đòn bẩy -> Bỏ qua để tránh đột biến nến.
    if (lastBar.closePrice > 0) {
      const deviation = Math.abs(livePrice - lastBar.closePrice) / lastBar.closePrice;
      if (deviation > 0.4) return;
    }

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
    const clean = d.slice(0, 10);
    const parts = clean.split('-');
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

  const candleDividend = useMemo(() => {
    if (!activeOhlc?.date || dividendEvents.length === 0) return null;
    return dividendEvents.find((ev) => ev.exrightDate?.slice(0, 10) === activeOhlc.date);
  }, [activeOhlc?.date, dividendEvents]);

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
      {/* ─── HÀNG 1: Thông tin Doanh nghiệp & Chỉ số Cơ bản ─── */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200 dark:border-gray-800/80 bg-gray-50/80 dark:bg-gray-900/80 flex-shrink-0 gap-4 flex-wrap min-h-[42px]">
        {/* Block 1 (Trái): Mã CP, Sàn, Tên, Ngành */}
        <div className="flex items-center space-x-2.5 min-w-0">
          {/* Ticker Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowTickerSearch((v) => !v)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-200/80 dark:bg-gray-800 hover:bg-gray-300/80 dark:hover:bg-gray-700 transition cursor-pointer group"
              title="Bấm để chuyển sang mã cổ phiếu khác"
            >
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {ticker}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500 group-hover:text-slate-900 dark:group-hover:text-white transition" />
            </button>

            {showTickerSearch && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTickerSearch(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-3 select-none font-sans">
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
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 uppercase font-mono font-bold"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {tickerSearchInput.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const query = tickerSearchInput.trim().toUpperCase();
                          if (onSelectTicker) onSelectTicker(query);
                          setShowTickerSearch(false);
                          setTickerSearchInput('');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold transition mb-1.5"
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <Search className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                          <span>Xem mã <strong className="font-mono text-sm">{tickerSearchInput.trim().toUpperCase()}</strong></span>
                        </div>
                        <span className="text-[10px] bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded font-mono">↵ Enter</span>
                      </button>
                    )}

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
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-blue-50 dark:hover:bg-blue-950/60 transition ${
                              s.ticker === ticker ? 'bg-blue-50/80 dark:bg-blue-950/80 font-bold' : ''
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

          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-200/90 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
            {effectiveStockData.exchange}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-gray-200 truncate max-w-[240px] sm:max-w-[320px]">
            {effectiveStockData.companyName}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:inline truncate">
            • {effectiveStockData.industry}
          </span>
        </div>

        {/* Block 2 (Phải): Điểm RS, Điểm ValueX (Hạng/ điểm), EPS core YoY, LNST YoY + Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0 text-xs">
          {/* Điểm RS */}
          <div className="flex items-center space-x-1.5" title="Sức mạnh giá RS 1 Tháng">
            <span className="text-gray-400">RS (1T):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {effectiveStockData.rsRating}
            </span>
          </div>

          {/* Điểm ValueX (Hạng / Điểm) */}
          <div className="flex items-center space-x-1.5" title="Điểm xếp hạng ValueX">
            <span className="text-gray-400">ValueX:</span>
            <span className="font-bold text-slate-800 dark:text-gray-200 font-mono">
              Hạng {effectiveStockData.rankGrade} ({effectiveStockData.totalScore}/150đ)
            </span>
          </div>

          {/* EPS core YoY */}
          <div className="hidden sm:flex items-center space-x-1.5" title="Tăng trưởng EPS cốt lõi cùng kỳ">
            <span className="text-gray-400">EPS core:</span>
            <span className={`font-bold font-mono ${effectiveStockData.coreEpsGrowthYoY >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {effectiveStockData.coreEpsGrowthYoY > 0 ? `+${effectiveStockData.coreEpsGrowthYoY}%` : `${effectiveStockData.coreEpsGrowthYoY}%`}
            </span>
          </div>

          {/* LNST core YoY */}
          <div className="hidden md:flex items-center space-x-1.5" title="Tăng trưởng LNST cốt lõi cùng kỳ">
            <span className="text-gray-400">LNST core:</span>
            <span className={`font-bold font-mono ${effectiveStockData.coreNetProfitGrowthYoY >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {effectiveStockData.coreNetProfitGrowthYoY > 0 ? `+${effectiveStockData.coreNetProfitGrowthYoY}%` : `${effectiveStockData.coreNetProfitGrowthYoY}%`}
            </span>
          </div>

          {/* Action Buttons: Bộ lọc RS, Toàn màn hình, Thoát/Đóng */}
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-gray-800">
            {!isStandalone ? (
              <>
                <Link
                  href={`/chart?ticker=${ticker}`}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition flex items-center space-x-1 border border-gray-200 dark:border-gray-700/80 shadow-2xs"
                  title="Mở biểu đồ trong tab riêng"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tab riêng</span>
                </Link>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
                    aria-label="Đóng biểu đồ"
                    title="Đóng (ESC)"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/ranking"
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition flex items-center space-x-1.5 border border-gray-200 dark:border-gray-700/80 shadow-2xs"
                  title="Xem bộ lọc & xếp hạng RS"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Bộ Lọc RS</span>
                </Link>
                <button
                  onClick={toggleFullScreen}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
                  aria-label="Chế độ toàn màn hình"
                  title={isFullscreen ? 'Thu nhỏ (ESC)' : 'Toàn màn hình'}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── HÀNG 2: Dòng Trạng Thái Phiên & Công Cụ Kỹ Thuật ─── */}
      <div className="flex items-center justify-between px-5 py-1.5 border-b border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950 flex-shrink-0 gap-3 flex-wrap min-h-[36px]">
        {/* Block 1 (Trái): Ngày, OHLC, Chênh lệch tăng giảm, Vol, GTGD 20N */}
        <div className="flex items-center space-x-3 sm:space-x-4 text-xs tabular-nums font-mono overflow-x-auto no-scrollbar text-slate-700 dark:text-gray-200 min-w-0">
          {activeOhlc ? (
            <>
              {/* Ngày */}
              {statusLineConfig.showDate && (
                <span className="text-gray-500 dark:text-gray-400 font-sans font-medium text-[11px] flex-shrink-0">
                  {crosshairData ? (
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900/60">
                      {formatDateStr(activeOhlc.date) || 'Đang trỏ'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border border-gray-200 dark:border-gray-700">
                      {activeOhlc.date ? `${formatDateStr(activeOhlc.date)}` : 'Phiên gần nhất'}
                    </span>
                  )}
                </span>
              )}

              {/* OHLC */}
              {statusLineConfig.showOhlc && (
                <div className="flex items-center space-x-2.5 flex-shrink-0">
                  <span>O: <strong className="font-bold text-slate-900 dark:text-white">{fmt(activeOhlc.o)}</strong></span>
                  <span>H: <strong className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(activeOhlc.h)}</strong></span>
                  <span>L: <strong className="font-bold text-rose-600 dark:text-rose-400">{fmt(activeOhlc.l)}</strong></span>
                  <span>C: <strong className={`font-bold ${closeColor}`}>{fmt(activeOhlc.c)}</strong></span>
                </div>
              )}

              {/* Chênh lệch tăng/giảm */}
              {statusLineConfig.showChange && (
                <span className="flex-shrink-0">
                  <strong className={`font-bold ${closeColor}`}>
                    {candleDiff > 0 ? '+' : ''}{fmt(candleDiff)} ({candleDiff > 0 ? '+' : ''}{candleDiffPct.toFixed(2)}%)
                  </strong>
                </span>
              )}

              {/* Vol */}
              {statusLineConfig.showVolume && (
                <span className="flex-shrink-0 hidden sm:inline text-slate-600 dark:text-gray-300">
                  Vol: <strong className="font-bold text-slate-900 dark:text-white">{fmtVol(activeOhlc.v)}</strong>
                </span>
              )}

              {/* GTGD 20N */}
              {statusLineConfig.showAdtv20 && (
                <span className="flex-shrink-0 hidden md:inline text-gray-400 dark:text-gray-500 font-sans">
                  GTGD 20N: <strong className="font-bold text-slate-800 dark:text-gray-200 font-mono">{effectiveStockData.adtv20Billion.toFixed(1)} Tỷ</strong>
                </span>
              )}

              {/* Sự kiện quyền / cổ tức trùng ngày phiên đang trỏ - Dạng Popup Tooltip chống giật/dịch chuyển layout */}
              {candleDividend && (candleDividend.eventTitleVi || candleDividend.eventNameVi) && (
                <div className="relative group flex-shrink-0 font-sans">
                  <div
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px] font-bold shadow-2xs cursor-pointer hover:bg-amber-500/25 transition"
                    title="Rê chuột vào để xem thông tin cổ tức chi tiết"
                  >
                    <span className="text-xs">🎁</span>
                    <span>Cổ tức</span>
                  </div>

                  {/* Hover Popup Floating Tooltip */}
                  <div className="absolute left-0 top-full mt-1.5 z-50 hidden group-hover:flex flex-col gap-1 px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-gray-900/95 text-amber-300 text-xs shadow-2xl border border-amber-500/40 whitespace-nowrap backdrop-blur-md pointer-events-none">
                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                      <span>🎁 Sự kiện cổ tức / Quyền ({formatDateStr(activeOhlc.date)})</span>
                    </div>
                    <div className="text-[11px] text-gray-200">
                      {candleDividend.eventTitleVi || candleDividend.eventNameVi}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center space-x-2 text-gray-400 font-sans text-xs">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Đang tải thông số phiên...</span>
            </div>
          )}
        </div>

        {/* Block 2 (Phải): Chu kỳ D W M + Chỉ báo (fx), Cổ tức, Cài đặt ⚙️ */}
        <div className="flex items-center space-x-2.5 ml-auto flex-shrink-0">
          {/* Chu kỳ nến D W M */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800/90 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700/80 text-xs">
            {(['D', 'W', 'M'] as Resolution[]).map((res) => {
              const active = resolution === res;
              return (
                <button
                  key={res}
                  onClick={() => handleSelectResolution(res)}
                  className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {res}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Indicators Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu((v) => !v)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer shadow-2xs"
              title="Quản lý các chỉ báo kỹ thuật & tùy chỉnh thông số"
            >
              <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
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
                <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white dark:bg-[#1e222d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a2e39] p-3 text-xs space-y-2 select-none animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto font-sans">
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-gray-100 dark:border-[#2a2e39]">
                    <span className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                      Quản lý Chỉ báo
                    </span>
                    <button
                      onClick={() => setShowIndicatorMenu(false)}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Group 1: Trên nến */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider px-1">
                      Chỉ báo trên nến
                    </div>

                    {/* Đỉnh - Đáy cá nhân */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
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
                          openIndicatorSettings('swingHl');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition cursor-pointer"
                        title="Cài đặt tham số &amp; định dạng SMC"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Đường EMA */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.ema}
                          onChange={() => toggleIndicator('ema')}
                          className="rounded text-blue-500 focus:ring-blue-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">Đường trung bình EMA</span>
                        <span className="text-[10px] text-gray-400 font-mono">({indicatorParams.emaShort}, {indicatorParams.emaLong})</span>
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openIndicatorSettings('ema');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition cursor-pointer"
                        title="Cài đặt tham số &amp; định dạng EMA"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Bollinger Bands */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.boll}
                          onChange={() => toggleIndicator('boll')}
                          className="rounded text-purple-500 focus:ring-purple-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">Bollinger Bands (BOLL)</span>
                        <span className="text-[10px] text-gray-400 font-mono">({indicatorParams.bollPeriod}, {indicatorParams.bollStdDev})</span>
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openIndicatorSettings('boll');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition cursor-pointer"
                        title="Cài đặt tham số &amp; định dạng BOLL"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Group 2: Bảng phụ bên dưới */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-[#2a2e39]">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider px-1">
                      Bảng phụ bên dưới
                    </div>

                    {/* Khối lượng (VOL) */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
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
                          openIndicatorSettings('vol');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition cursor-pointer"
                        title="Cài đặt tham số &amp; định dạng Khối lượng"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* RSI */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.rsi}
                          onChange={() => toggleIndicator('rsi')}
                          className="rounded text-cyan-500 focus:ring-cyan-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">Chỉ số RSI</span>
                        <span className="text-[10px] text-gray-400 font-mono">({indicatorParams.rsiPeriod})</span>
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openIndicatorSettings('rsi');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition cursor-pointer"
                        title="Cài đặt tham số &amp; định dạng RSI"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* MACD */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.macd}
                          onChange={() => toggleIndicator('macd')}
                          className="rounded text-rose-500 focus:ring-rose-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">Đường MACD</span>
                        <span className="text-[10px] text-gray-400 font-mono">({indicatorParams.macdFast}, {indicatorParams.macdSlow}, {indicatorParams.macdSignal})</span>
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openIndicatorSettings('macd');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition cursor-pointer"
                        title="Cài đặt tham số &amp; định dạng MACD"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Group 3: Chỉ báo Dữ liệu Cơ bản */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-[#2a2e39]">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider px-1">
                      Chỉ báo Dữ liệu Cơ bản (Fundamental)
                    </div>

                    {/* P/E - TTM Band Chart */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.pe}
                          onChange={() => toggleIndicator('pe')}
                          className="rounded text-emerald-500 focus:ring-emerald-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">P/E - TTM Band Chart</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">(Mean, ±1SD, ±2SD)</span>
                      </label>
                    </div>

                    {/* P/B - TTM Band Chart */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.pb}
                          onChange={() => toggleIndicator('pb')}
                          className="rounded text-blue-500 focus:ring-blue-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">P/B - TTM Band Chart</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">(Mean, ±1SD, ±2SD)</span>
                      </label>
                    </div>

                    {/* EPS Cốt lõi TTM */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.coreEps}
                          onChange={() => toggleIndicator('coreEps')}
                          className="rounded text-purple-500 focus:ring-purple-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">EPS Cốt Lõi TTM</span>
                      </label>
                    </div>

                    {/* Doanh Thu TTM */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-100 dark:border-[#2a2e39] hover:border-gray-200 dark:hover:border-[#363a45] transition">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={activeIndicators.revenue}
                          onChange={() => toggleIndicator('revenue')}
                          className="rounded text-cyan-500 focus:ring-cyan-400 h-4 w-4 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-gray-100">Doanh Thu TTM</span>
                      </label>
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
              flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer
              ${showDividendMarkers
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 shadow-2xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'
              }
            `}
            title="Ẩn/hiện sự kiện cổ tức & chia tách"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cổ tức</span>
            <span className={`w-1.5 h-1.5 rounded-full ${showDividendMarkers ? 'bg-amber-500' : 'bg-gray-400'}`} />
          </button>

          {/* Cài đặt (⚙️) Button */}
          <button
            onClick={() => setShowChartSettingsModal(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/80 transition cursor-pointer"
            title="Cài đặt biểu đồ TradingView (Mã, Dòng trạng thái, Canvas)"
          >
            <Settings className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Tiện ích Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`
              flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer
              ${showSidebar
                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-2xs'
                : 'bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-gray-200 dark:border-gray-700/80'
              }
            `}
            title="Bật/tắt thanh tiện ích: Bảng giá mini, Tài chính 4 kỳ, Cổ tức, Tin tức (phím tắt \)"
          >
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Tiện ích</span>
            <span className={`w-1.5 h-1.5 rounded-full ${showSidebar ? 'bg-blue-500' : 'bg-gray-400'}`} />
          </button>
        </div>
      </div>

      {/* Main Chart Area with Sidebar */}
      <div className="relative flex-1 min-h-0 w-full h-full flex overflow-hidden">
        {/* TradingView Left Drawing Toolbar */}
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onClearAll={handleClearAllOverlays}
        />

        {/* Chart Canvas Area */}
        <div
          className="relative flex-1 min-h-0 w-full h-full overflow-hidden"
          onMouseLeave={() => setCrosshairData(null)}
        >
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

          {/* Floating Rich Tooltip for Dividend Marker Hover */}
          {hoveredDividend && (() => {
            const item = hoveredDividend.data || {};
            const raw = item.rawEvent || item;
            const title = item.title || raw.eventTitleVi || raw.eventNameVi || 'Sự kiện cổ tức';
            const isCash = item.type === 'cash' || title.toLowerCase().includes('tiền mặt');
            const exDate = item.dateStr || raw.exrightDate;
            const recordDate = raw.recordDate;
            const publicDate = raw.publicDate;
            const ratioStr = item.shortLabel || (raw.exerciseRatio ? `${Math.round(raw.exerciseRatio * 100)}%` : null);

            return (
              <div
                className="absolute z-40 pointer-events-none transition-all duration-100 ease-out transform -translate-x-1/2 select-none"
                style={{
                  left: Math.max(140, Math.min((chartContainerRef.current?.clientWidth || 500) - 140, hoveredDividend.x)),
                  top: hoveredDividend.y > 170 ? hoveredDividend.y - 155 : hoveredDividend.y + 32,
                }}
              >
                <div className="bg-gray-900/95 backdrop-blur-md text-gray-100 border border-amber-500/40 rounded-xl shadow-2xl p-3 w-64 text-xs font-sans ring-1 ring-black/60 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="flex items-start gap-2 border-b border-gray-800 pb-2 mb-2">
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {isCash ? '💵' : '📜'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-amber-400 text-xs leading-snug line-clamp-2">
                        {title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 font-mono">
                        <span className="px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 font-bold">
                          {ticker}
                        </span>
                        <span>•</span>
                        <span className={isCash ? 'text-emerald-400' : 'text-blue-400'}>
                          {isCash ? 'Cổ tức tiền mặt' : 'Cổ tức cổ phiếu / Thưởng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="text-gray-400">Ngày GDKHQ:</span>
                      <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                        {exDate ? formatDateStr(exDate) : '—'}
                      </span>
                    </div>

                    {recordDate && (
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="text-gray-400">Ngày ĐKCC:</span>
                        <span className="font-mono text-gray-200">
                          {formatDateStr(recordDate)}
                        </span>
                      </div>
                    )}

                    {publicDate && (
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="text-gray-400">Ngày công bố:</span>
                        <span className="font-mono text-gray-400">
                          {formatDateStr(publicDate)}
                        </span>
                      </div>
                    )}

                    {ratioStr && (
                      <div className="flex justify-between items-center text-gray-300 pt-1 border-t border-gray-800/80">
                        <span className="text-gray-400">Tỷ lệ:</span>
                        <span className="font-bold text-emerald-400 font-mono text-xs">
                          {ratioStr}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Collapsible Utility Sidebar */}
        <ChartUtilitySidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          currentTicker={ticker || 'FPT'}
          allStocks={allStocks}
          onSelectTicker={(newTicker) => {
            if (onSelectTicker) onSelectTicker(newTicker);
          }}
        />
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

      {/* Modal Cài đặt Biểu đồ Chuẩn TradingView (Mã, Dòng trạng thái, Canvas) */}
      <ChartSettingsModal
        isOpen={showChartSettingsModal}
        onClose={() => setShowChartSettingsModal(false)}
        theme={chartTheme}
        onThemeChange={handleThemeChange}
        statusLineConfig={statusLineConfig}
        onStatusLineConfigChange={handleStatusLineConfigChange}
        canvasConfig={canvasConfig}
        onCanvasConfigChange={handleCanvasConfigChange}
        initialTab={settingsModalTab}
      />

      {/* Hộp thoại Tham số & Định dạng Chỉ Báo Chuẩn TradingView (2 Tab: Các tham số & Định dạng) */}
      <IndicatorSettingsDialog
        isOpen={indicatorDialogState.isOpen}
        onClose={() => setIndicatorDialogState((prev) => ({ ...prev, isOpen: false }))}
        indicatorId={indicatorDialogState.indicatorId}
        title={indicatorDialogState.title}
        plots={indicatorDialogState.plots}
        onSavePlots={handleSaveIndicatorPlots}
        params={indicatorParams}
        onSaveParams={handleSaveIndicatorParams}
        initialTab={indicatorDialogState.initialTab || 'params'}
      />
    </div>
  );
}
