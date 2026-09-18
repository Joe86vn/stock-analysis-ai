// ─── Chart Color Theme Types & Presets ────────────────────────────────────────

export interface CandleThemeColors {
  upColor: string;
  downColor: string;
  noChangeColor: string;
  upBorderColor: string;
  downBorderColor: string;
  noChangeBorderColor: string;
  upWickColor: string;
  downWickColor: string;
  noChangeWickColor: string;
  lastPriceColor?: string;
}

export interface VolumeThemeColors {
  upColor: string;
  downColor: string;
  noChangeColor: string;
  maColor: string;
}

export interface EmaThemeColors {
  ema1Color: string; // EMA ngắn (VD: 20)
  ema2Color: string; // EMA dài (VD: 200)
}

export interface BollThemeColors {
  upColor: string;
  midColor: string;
  downColor: string;
}

export interface SmcThemeColors {
  zigzagColor: string;
  peakColor: string;
  troughColor: string;
  bullishBreakColor: string;
  bearishBreakColor: string;
}

export interface RsiThemeColors {
  lineColor: string;
}

export interface MacdThemeColors {
  difColor: string;
  deaColor: string;
  histUpColor: string;
  histDownColor: string;
}

export interface ChartColorTheme {
  id: string;
  name: string;
  candle: CandleThemeColors;
  vol: VolumeThemeColors;
  ema: EmaThemeColors;
  boll: BollThemeColors;
  smc: SmcThemeColors;
  rsi: RsiThemeColors;
  macd: MacdThemeColors;
}

export interface StatusLineConfig {
  showTitle: boolean;
  showDate: boolean;
  showOhlc: boolean;
  showChange: boolean;
  showVolume: boolean;
  showAdtv20: boolean;
}

export interface CanvasConfig {
  backgroundType: 'solid';
  backgroundColorLight: string;
  backgroundColorDark: string;
  showVerticalGrid: boolean;
  showHorizontalGrid: boolean;
  gridColorLight: string;
  gridColorDark: string;
  crosshairStyle: 'dashed' | 'solid';
}

export interface IndicatorPlotFormat {
  visible: boolean;
  color: string;
  size: number;
  style: 'solid' | 'dashed';
  showPriceScaleLabel: boolean;
  showStatusValue: boolean;
}

export const DEFAULT_STATUS_LINE_CONFIG: StatusLineConfig = {
  showTitle: true,
  showDate: true,
  showOhlc: true,
  showChange: true,
  showVolume: true,
  showAdtv20: true,
};

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  backgroundType: 'solid',
  backgroundColorLight: '#ffffff',
  backgroundColorDark: '#030712',
  showVerticalGrid: true,
  showHorizontalGrid: true,
  gridColorLight: '#f1f5f9',
  gridColorDark: '#1f2937',
  crosshairStyle: 'dashed',
};

export type PresetThemeId = 'tradingview' | 'tv_classic' | 'vnmarket' | 'minimalist' | 'cyberpunk' | 'custom';

// ─── Helper Chuyển đổi HEX sang RGBA ──────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number = 0.5): string {
  if (!hex || typeof hex !== 'string') return `rgba(34, 197, 94, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (clean.length !== 6) return `rgba(34, 197, 94, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Các Bộ Presets Dựng Sẵn Chuẩn ───────────────────────────────────────────

export const THEME_PRESETS: Record<Exclude<PresetThemeId, 'custom'>, ChartColorTheme> = {
  tradingview: {
    id: 'tradingview',
    name: 'TradingView Trắng/Xanh (Ảnh 2)',
    candle: {
      upColor: '#ffffff', // Thân trắng/hollow
      downColor: '#2962ff', // Thân xanh dương
      noChangeColor: '#2962ff',
      upBorderColor: '#000000', // Viền đen
      downBorderColor: '#000000', // Viền đen
      noChangeBorderColor: '#000000',
      upWickColor: '#000000', // Râu đen
      downWickColor: '#000000', // Râu đen
      noChangeWickColor: '#000000',
    },
    vol: {
      upColor: '#22c55e',
      downColor: '#2962ff',
      noChangeColor: '#94a3b8',
      maColor: '#3b82f6',
    },
    ema: {
      ema1Color: '#2962ff', // Xanh dương
      ema2Color: '#f59e0b', // Vàng hổ phách
    },
    boll: {
      upColor: '#8b5cf6',
      midColor: '#f59e0b',
      downColor: '#8b5cf6',
    },
    smc: {
      zigzagColor: '#eab308',
      peakColor: '#ef4444',
      troughColor: '#10b981',
      bullishBreakColor: '#10b981',
      bearishBreakColor: '#ef4444',
    },
    rsi: {
      lineColor: '#a855f7',
    },
    macd: {
      difColor: '#2962ff',
      deaColor: '#f59e0b',
      histUpColor: '#22c55e',
      histDownColor: '#ef4444',
    },
  },

  tv_classic: {
    id: 'tv_classic',
    name: 'TradingView Xanh/Đỏ Classic',
    candle: {
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
    vol: {
      upColor: '#22c55e',
      downColor: '#ef4444',
      noChangeColor: '#f59e0b',
      maColor: '#3b82f6',
    },
    ema: {
      ema1Color: '#3b82f6',
      ema2Color: '#f59e0b',
    },
    boll: {
      upColor: '#8b5cf6',
      midColor: '#f59e0b',
      downColor: '#8b5cf6',
    },
    smc: {
      zigzagColor: '#eab308',
      peakColor: '#ef4444',
      troughColor: '#10b981',
      bullishBreakColor: '#10b981',
      bearishBreakColor: '#ef4444',
    },
    rsi: {
      lineColor: '#a855f7',
    },
    macd: {
      difColor: '#3b82f6',
      deaColor: '#f59e0b',
      histUpColor: '#22c55e',
      histDownColor: '#ef4444',
    },
  },

  vnmarket: {
    id: 'vnmarket',
    name: 'Bảng giá Việt Nam',
    candle: {
      upColor: '#00e676', // Xanh lá điện tử rực
      downColor: '#ff1744', // Đỏ điện tử rực
      noChangeColor: '#ffd600', // Vàng rực
      upBorderColor: '#00e676',
      downBorderColor: '#ff1744',
      noChangeBorderColor: '#ffd600',
      upWickColor: '#00e676',
      downWickColor: '#ff1744',
      noChangeWickColor: '#ffd600',
    },
    vol: {
      upColor: '#00e676',
      downColor: '#ff1744',
      noChangeColor: '#ffd600',
      maColor: '#00b0ff',
    },
    ema: {
      ema1Color: '#2979ff', // Xanh biển đậm
      ema2Color: '#ff9100', // Cam neon
    },
    boll: {
      upColor: '#d500f9', // Tím trần
      midColor: '#ffd600',
      downColor: '#00e5ff', // Lam sàn
    },
    smc: {
      zigzagColor: '#ffd600',
      peakColor: '#ff1744',
      troughColor: '#00e676',
      bullishBreakColor: '#00e676',
      bearishBreakColor: '#ff1744',
    },
    rsi: {
      lineColor: '#d500f9',
    },
    macd: {
      difColor: '#00e5ff',
      deaColor: '#ffd600',
      histUpColor: '#00e676',
      histDownColor: '#ff1744',
    },
  },

  minimalist: {
    id: 'minimalist',
    name: 'Minimalist Đơn sắc',
    candle: {
      upColor: '#f8fafc', // Trắng xám thanh lịch
      downColor: '#475569', // Xám than sâu
      noChangeColor: '#94a3b8',
      upBorderColor: '#e2e8f0',
      downBorderColor: '#64748b',
      noChangeBorderColor: '#94a3b8',
      upWickColor: '#cbd5e1',
      downWickColor: '#64748b',
      noChangeWickColor: '#94a3b8',
    },
    vol: {
      upColor: '#cbd5e1',
      downColor: '#64748b',
      noChangeColor: '#94a3b8',
      maColor: '#94a3b8',
    },
    ema: {
      ema1Color: '#38bdf8', // Sky nhẹ
      ema2Color: '#fbbf24', // Amber dịu
    },
    boll: {
      upColor: '#94a3b8',
      midColor: '#cbd5e1',
      downColor: '#94a3b8',
    },
    smc: {
      zigzagColor: '#cbd5e1',
      peakColor: '#f87171',
      troughColor: '#34d399',
      bullishBreakColor: '#34d399',
      bearishBreakColor: '#f87171',
    },
    rsi: {
      lineColor: '#e2e8f0',
    },
    macd: {
      difColor: '#cbd5e1',
      deaColor: '#94a3b8',
      histUpColor: '#94a3b8',
      histDownColor: '#475569',
    },
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    candle: {
      upColor: '#00f5d4', // Cyan neon
      downColor: '#f72585', // Magenta neon
      noChangeColor: '#fee440', // Vàng chanh neon
      upBorderColor: '#00f5d4',
      downBorderColor: '#f72585',
      noChangeBorderColor: '#fee440',
      upWickColor: '#00f5d4',
      downWickColor: '#f72585',
      noChangeWickColor: '#fee440',
    },
    vol: {
      upColor: '#00f5d4',
      downColor: '#f72585',
      noChangeColor: '#fee440',
      maColor: '#7209b7',
    },
    ema: {
      ema1Color: '#4cc9f0', // Neon Sky
      ema2Color: '#7209b7', // Neon Purple
    },
    boll: {
      upColor: '#b5179e',
      midColor: '#4cc9f0',
      downColor: '#b5179e',
    },
    smc: {
      zigzagColor: '#fee440',
      peakColor: '#f72585',
      troughColor: '#00f5d4',
      bullishBreakColor: '#00f5d4',
      bearishBreakColor: '#f72585',
    },
    rsi: {
      lineColor: '#f72585',
    },
    macd: {
      difColor: '#00f5d4',
      deaColor: '#f72585',
      histUpColor: '#00f5d4',
      histDownColor: '#f72585',
    },
  },
};

export const DEFAULT_CHART_THEME = THEME_PRESETS.tradingview;
export const LOCAL_STORAGE_THEME_KEY = 'stock_chart_color_theme';

// ─── Lưu & Đọc Theme từ LocalStorage ──────────────────────────────────────────

export function loadSavedTheme(): ChartColorTheme {
  if (typeof window === 'undefined') return DEFAULT_CHART_THEME;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (!raw) return DEFAULT_CHART_THEME;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.candle && parsed.ema) {
      // Merge với default để phòng trường hợp thiếu key mới bổ sung
      return {
        ...DEFAULT_CHART_THEME,
        ...parsed,
        candle: { ...DEFAULT_CHART_THEME.candle, ...parsed.candle },
        vol: { ...DEFAULT_CHART_THEME.vol, ...parsed.vol },
        ema: { ...DEFAULT_CHART_THEME.ema, ...parsed.ema },
        boll: { ...DEFAULT_CHART_THEME.boll, ...parsed.boll },
        smc: { ...DEFAULT_CHART_THEME.smc, ...parsed.smc },
        rsi: { ...DEFAULT_CHART_THEME.rsi, ...parsed.rsi },
        macd: { ...DEFAULT_CHART_THEME.macd, ...parsed.macd },
      };
    }
  } catch {
    // Ignore JSON error
  }
  return DEFAULT_CHART_THEME;
}

export function saveTheme(theme: ChartColorTheme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, JSON.stringify(theme));
  } catch (err) {
    console.error('Không thể lưu theme đồ thị vào localStorage:', err);
  }
}

export const LOCAL_STORAGE_STATUS_KEY = 'stock_chart_status_line_config';
export const LOCAL_STORAGE_CANVAS_KEY = 'stock_chart_canvas_config';

export function loadSavedStatusLineConfig(): StatusLineConfig {
  if (typeof window === 'undefined') return DEFAULT_STATUS_LINE_CONFIG;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STATUS_KEY);
    if (!raw) return DEFAULT_STATUS_LINE_CONFIG;
    return { ...DEFAULT_STATUS_LINE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATUS_LINE_CONFIG;
  }
}

export function saveStatusLineConfig(config: StatusLineConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_STATUS_KEY, JSON.stringify(config));
  } catch {}
}

export function loadSavedCanvasConfig(): CanvasConfig {
  if (typeof window === 'undefined') return DEFAULT_CANVAS_CONFIG;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CANVAS_KEY);
    if (!raw) return DEFAULT_CANVAS_CONFIG;
    return { ...DEFAULT_CANVAS_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CANVAS_CONFIG;
  }
}

export function saveCanvasConfig(config: CanvasConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CANVAS_KEY, JSON.stringify(config));
  } catch {}
}

// ─── Indicator Style Interfaces & Helper Functions ────────────────────────────

export interface IndicatorLineStyle {
  style: 'solid' | 'dashed';
  smooth: boolean;
  size: number;
  dashedValue: [number, number];
  color: string;
}

export interface IndicatorBarStyle {
  style: 'fill' | 'stroke' | 'stroke_fill';
  borderStyle: 'solid' | 'dashed';
  borderSize: number;
  borderDashedValue: [number, number];
  upColor: string;
  downColor: string;
  noChangeColor: string;
}

export function createIndicatorLine(
  color: string,
  size: number = 1,
  style: 'solid' | 'dashed' = 'solid',
  dashedValue: [number, number] = [2, 2],
  smooth: boolean = false
): IndicatorLineStyle {
  return {
    style,
    smooth,
    size,
    dashedValue,
    color,
  };
}

export function createIndicatorBar(
  upColor: string,
  downColor: string,
  noChangeColor: string,
  borderSize: number = 1
): IndicatorBarStyle {
  return {
    style: 'fill',
    borderStyle: 'solid',
    borderSize,
    borderDashedValue: [2, 2],
    upColor,
    downColor,
    noChangeColor,
  };
}

export function getVolIndicatorStyles(vol: VolumeThemeColors, isDark: boolean) {
  return {
    bars: [
      createIndicatorBar(
        isDark ? hexToRgba(vol.upColor, 0.45) : hexToRgba(vol.upColor, 0.55),
        isDark ? hexToRgba(vol.downColor, 0.45) : hexToRgba(vol.downColor, 0.55),
        hexToRgba(vol.noChangeColor, 0.5)
      ),
    ],
    lines: [createIndicatorLine(vol.maColor, 1)],
  };
}

export function getEmaIndicatorStyles(ema: EmaThemeColors) {
  return {
    lines: [
      createIndicatorLine(ema.ema1Color, 1.5),
      createIndicatorLine(ema.ema2Color, 1.5),
    ],
  };
}

export function getBollIndicatorStyles(boll: BollThemeColors) {
  return {
    lines: [
      createIndicatorLine(boll.upColor, 1),
      createIndicatorLine(boll.midColor, 1),
      createIndicatorLine(boll.downColor, 1),
    ],
  };
}

export function getRsiIndicatorStyles(rsi: RsiThemeColors) {
  return {
    lines: [createIndicatorLine(rsi.lineColor, 1.2)],
  };
}

export function getMacdIndicatorStyles(macd: MacdThemeColors) {
  return {
    lines: [
      createIndicatorLine(macd.difColor, 1.2),
      createIndicatorLine(macd.deaColor, 1.2),
    ],
    bars: [
      createIndicatorBar(
        macd.histUpColor,
        macd.histDownColor,
        '#94a3b8'
      ),
    ],
  };
}

export function getKLineThemeFromCustom(
  theme: ChartColorTheme,
  isDark: boolean,
  canvasConfig?: CanvasConfig
): any {
  const c = theme.candle;
  const v = theme.vol;
  const e = theme.ema;

  const showHGrid = canvasConfig ? canvasConfig.showHorizontalGrid : true;
  const showVGrid = canvasConfig ? canvasConfig.showVerticalGrid : true;
  const gridColor = canvasConfig
    ? (isDark ? canvasConfig.gridColorDark : canvasConfig.gridColorLight)
    : (isDark ? '#1f2937' : '#f3f4f6');
  const crosshairStyle = canvasConfig?.crosshairStyle || 'dashed';

  return {
    grid: {
      horizontal: {
        show: showHGrid,
        style: 'dashed' as const,
        size: 1,
        color: showHGrid ? gridColor : 'transparent',
        dashedValue: [4, 4],
      },
      vertical: {
        show: showVGrid,
        style: 'dashed' as const,
        size: 1,
        color: showVGrid ? gridColor : 'transparent',
        dashedValue: [4, 4],
      },
    },
    candle: {
      type: 'candle_solid' as const,
      bar: {
        upColor: c.upColor,
        downColor: c.downColor,
        noChangeColor: c.noChangeColor,
        upBorderColor: c.upBorderColor || c.upColor,
        downBorderColor: c.downBorderColor || c.downColor,
        noChangeBorderColor: c.noChangeBorderColor || c.noChangeColor,
        upWickColor: c.upWickColor || c.upColor,
        downWickColor: c.downWickColor || c.downColor,
        noChangeWickColor: c.noChangeWickColor || c.noChangeColor,
      },
      tooltip: {
        showRule: 'none' as const,
      },
      priceMark: {
        high: { show: false },
        low: { show: false },
        last: {
          show: true,
          upColor: c.upColor,
          downColor: c.downColor,
          noChangeColor: c.noChangeColor,
          line: {
            show: false,
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
        showRule: 'always' as const,
        showName: true,
        showParams: true,
      },
      lastValueMark: {
        show: true,
        text: {
          show: true,
          style: 'fill',
          color: '#ffffff',
          size: 11,
          paddingLeft: 4,
          paddingTop: 2,
          paddingRight: 4,
          paddingBottom: 2,
          borderRadius: 2,
        },
      },
      lines: [
        createIndicatorLine(e.ema1Color, 1.5), // EMA 1
        createIndicatorLine(e.ema2Color, 1.5), // EMA 2
        createIndicatorLine('#3b82f6', 1),
        createIndicatorLine('#eab308', 1),
        createIndicatorLine('#ef4444', 1),
      ],
      bars: [
        createIndicatorBar(
          isDark ? hexToRgba(v.upColor, 0.45) : hexToRgba(v.upColor, 0.55),
          isDark ? hexToRgba(v.downColor, 0.45) : hexToRgba(v.downColor, 0.55),
          hexToRgba(v.noChangeColor, 0.5)
        ),
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
        line: { color: isDark ? '#4b5563' : '#9ca3af', style: crosshairStyle as any, dashedValue: [4, 4] },
        text: { backgroundColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#ffffff' : '#111827' },
      },
      vertical: {
        line: { color: isDark ? '#4b5563' : '#9ca3af', style: crosshairStyle as any, dashedValue: [4, 4] },
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
