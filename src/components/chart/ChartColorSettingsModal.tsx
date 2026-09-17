'use client';

import React, { useState } from 'react';
import { X, RotateCcw, Palette, Sparkles, Check, ChevronRight } from 'lucide-react';
import {
  ChartColorTheme,
  PresetThemeId,
  THEME_PRESETS,
  DEFAULT_CHART_THEME,
} from './chart-theme-types';

interface ChartColorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ChartColorTheme;
  onThemeChange: (newTheme: ChartColorTheme) => void;
  initialTab?: 'candle' | 'overlay' | 'subpanes';
}

const COMMON_COLOR_SWATCHES = [
  '#22c55e', // Green
  '#00e676', // Bright Green
  '#10b981', // Emerald
  '#ef4444', // Red
  '#ff1744', // Bright Red
  '#f59e0b', // Amber
  '#ffd600', // Bright Yellow
  '#3b82f6', // Blue
  '#2979ff', // Bright Blue
  '#06b6d4', // Cyan
  '#00f5d4', // Neon Cyan
  '#8b5cf6', // Purple
  '#d500f9', // Magenta/Neon Purple
  '#f72585', // Hot Pink
  '#f8fafc', // White
  '#94a3b8', // Gray
  '#475569', // Dark Slate
];

interface ColorRowProps {
  label: string;
  description?: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorRow({ label, description, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-100/70 dark:hover:bg-gray-800/50 transition">
      <div className="flex flex-col pr-2">
        <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">{label}</span>
        {description && <span className="text-[10px] text-gray-400 dark:text-gray-500">{description}</span>}
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Color preview badge + native input trigger */}
        <div className="relative flex items-center">
          <label className="flex items-center space-x-1.5 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xs cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition">
            <span
              className="w-4 h-4 rounded-md border border-black/10 dark:border-white/20 shadow-xs flex-shrink-0"
              style={{ backgroundColor: value }}
            />
            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-gray-300 uppercase">
              {value}
            </span>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function ChartColorSettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  initialTab = 'candle',
}: ChartColorSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'candle' | 'overlay' | 'subpanes'>(initialTab);

  if (!isOpen) return null;

  // Xử lý chuyển Preset
  const handleApplyPreset = (presetId: Exclude<PresetThemeId, 'custom'>) => {
    const preset = THEME_PRESETS[presetId];
    if (preset) {
      onThemeChange({ ...preset });
    }
  };

  // Cập nhật từng thuộc tính
  const updateCandle = (key: keyof ChartColorTheme['candle'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      candle: {
        ...theme.candle,
        [key]: color,
        // Nếu đổi thân nến, đồng bộ luôn viền và râu nến cùng loại để tiện dụng
        ...(key === 'upColor' ? { upBorderColor: color, upWickColor: color } : {}),
        ...(key === 'downColor' ? { downBorderColor: color, downWickColor: color } : {}),
        ...(key === 'noChangeColor' ? { noChangeBorderColor: color, noChangeWickColor: color } : {}),
      },
    });
  };

  const updateVol = (key: keyof ChartColorTheme['vol'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      vol: { ...theme.vol, [key]: color },
    });
  };

  const updateEma = (key: keyof ChartColorTheme['ema'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      ema: { ...theme.ema, [key]: color },
    });
  };

  const updateBoll = (key: keyof ChartColorTheme['boll'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      boll: { ...theme.boll, [key]: color },
    });
  };

  const updateSmc = (key: keyof ChartColorTheme['smc'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      smc: { ...theme.smc, [key]: color },
    });
  };

  const updateRsi = (key: keyof ChartColorTheme['rsi'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      rsi: { ...theme.rsi, [key]: color },
    });
  };

  const updateMacd = (key: keyof ChartColorTheme['macd'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      macd: { ...theme.macd, [key]: color },
    });
  };

  const handleReset = () => {
    onThemeChange({ ...DEFAULT_CHART_THEME });
  };

  const presetList: { id: Exclude<PresetThemeId, 'custom'>; label: string; desc: string; sample: string[] }[] = [
    {
      id: 'tradingview',
      label: 'TradingView Classic',
      desc: 'Xanh lá / Đỏ chuẩn quốc tế',
      sample: ['#22c55e', '#ef4444', '#3b82f6'],
    },
    {
      id: 'vnmarket',
      label: 'Bảng giá Việt Nam',
      desc: 'Xanh mạ / Đỏ rực / Vàng tham chiếu',
      sample: ['#00e676', '#ff1744', '#ffd600'],
    },
    {
      id: 'minimalist',
      label: 'Minimalist Đơn sắc',
      desc: 'Tone xám trắng thanh lịch tối giản',
      sample: ['#f8fafc', '#475569', '#38bdf8'],
    },
    {
      id: 'cyberpunk',
      label: 'Cyberpunk Neon',
      desc: 'Neon Cyan & Magenta tương phản cao',
      sample: ['#00f5d4', '#f72585', '#fee440'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                Cài đặt Màu sắc &amp; Giao diện Đồ thị
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Tùy biến bảng màu nến và các chỉ báo kỹ thuật theo phong cách cá nhân
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-5 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100/60 dark:border-indigo-900/30">
          <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Bộ màu chủ đề nhanh (1-Click Theme)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presetList.map((p) => {
              const isSelected = theme.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`flex flex-col p-2 rounded-xl border text-left transition relative cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-white dark:bg-gray-800 shadow-xs ring-1 ring-indigo-500'
                      : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate">
                      {p.label.split(' ')[0]}
                    </span>
                    {isSelected && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  {/* Color dots sample */}
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    {p.sample.map((c, idx) => (
                      <span
                        key={idx}
                        className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 gap-2">
          <button
            onClick={() => setActiveTab('candle')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'candle'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Nến &amp; Khối lượng
          </button>
          <button
            onClick={() => setActiveTab('overlay')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'overlay'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Chỉ báo trên nến
          </button>
          <button
            onClick={() => setActiveTab('subpanes')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'subpanes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Chỉ báo phụ (RSI, MACD)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[55vh]">
          {/* TAB 1: Nến & Khối lượng */}
          {activeTab === 'candle' && (
            <div className="space-y-4">
              {/* Nhóm Nến */}
              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider px-1 pb-1">
                  Nến Nhật (Candlestick)
                </div>
                <ColorRow
                  label="Nến Tăng (Bullish)"
                  description="Màu thân nến, viền và râu nến khi giá tăng"
                  value={theme.candle.upColor}
                  onChange={(c) => updateCandle('upColor', c)}
                />
                <ColorRow
                  label="Nến Giảm (Bearish)"
                  description="Màu thân nến, viền và râu nến khi giá giảm"
                  value={theme.candle.downColor}
                  onChange={(c) => updateCandle('downColor', c)}
                />
                <ColorRow
                  label="Nến Tham chiếu (Doji / Không đổi)"
                  description="Màu nến khi giá đóng cửa bằng giá mở cửa"
                  value={theme.candle.noChangeColor}
                  onChange={(c) => updateCandle('noChangeColor', c)}
                />
              </div>

              {/* Nhóm Khối lượng */}
              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider px-1 pb-1">
                  Khối lượng giao dịch (VOL)
                </div>
                <ColorRow
                  label="Cột Vol Tăng"
                  description="Màu thanh volume phiên tăng"
                  value={theme.vol.upColor}
                  onChange={(c) => updateVol('upColor', c)}
                />
                <ColorRow
                  label="Cột Vol Giảm"
                  description="Màu thanh volume phiên giảm"
                  value={theme.vol.downColor}
                  onChange={(c) => updateVol('downColor', c)}
                />
                <ColorRow
                  label="Đường Vol MA(20)"
                  description="Đường trung bình khối lượng 20 phiên"
                  value={theme.vol.maColor}
                  onChange={(c) => updateVol('maColor', c)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Chỉ báo trên nến */}
          {activeTab === 'overlay' && (
            <div className="space-y-4">
              {/* Nhóm EMA */}
              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider px-1 pb-1">
                  Đường trung bình động EMA
                </div>
                <ColorRow
                  label="EMA 1 (Ngắn hạn - VD: EMA 20)"
                  value={theme.ema.ema1Color}
                  onChange={(c) => updateEma('ema1Color', c)}
                />
                <ColorRow
                  label="EMA 2 (Dài hạn - VD: EMA 200)"
                  value={theme.ema.ema2Color}
                  onChange={(c) => updateEma('ema2Color', c)}
                />
              </div>

              {/* Nhóm Bollinger Bands */}
              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider px-1 pb-1">
                  Bollinger Bands (BOLL)
                </div>
                <ColorRow
                  label="Dải trên (Upper Band)"
                  value={theme.boll.upColor}
                  onChange={(c) => updateBoll('upColor', c)}
                />
                <ColorRow
                  label="Dải giữa (Middle Band / MA20)"
                  value={theme.boll.midColor}
                  onChange={(c) => updateBoll('midColor', c)}
                />
                <ColorRow
                  label="Dải dưới (Lower Band)"
                  value={theme.boll.downColor}
                  onChange={(c) => updateBoll('downColor', c)}
                />
              </div>

              {/* Nhóm Đỉnh Đáy & SMC */}
              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider px-1 pb-1">
                  Đỉnh Đáy &amp; Cấu trúc SMC
                </div>
                <ColorRow
                  label="Đường nối Zigzag"
                  description="Đường nét đứt nối các đỉnh đáy quan trọng"
                  value={theme.smc.zigzagColor}
                  onChange={(c) => updateSmc('zigzagColor', c)}
                />
                <ColorRow
                  label="Nhãn Đỉnh &amp; Giá Đỉnh (HH, LH)"
                  description="Màu hiển thị đỉnh cao hơn hoặc đỉnh thấp hơn"
                  value={theme.smc.peakColor}
                  onChange={(c) => updateSmc('peakColor', c)}
                />
                <ColorRow
                  label="Nhãn Đáy &amp; Giá Đáy (HL, LL)"
                  description="Màu hiển thị đáy cao hơn hoặc đáy thấp hơn"
                  value={theme.smc.troughColor}
                  onChange={(c) => updateSmc('troughColor', c)}
                />
                <ColorRow
                  label="Đường &amp; Nhãn CHoCH / BOS Tăng"
                  description="Tín hiệu đảo chiều sang tăng hoặc tiếp diễn tăng"
                  value={theme.smc.bullishBreakColor}
                  onChange={(c) => updateSmc('bullishBreakColor', c)}
                />
                <ColorRow
                  label="Đường &amp; Nhãn CHoCH / BOS Giảm"
                  description="Tín hiệu đảo chiều sang giảm hoặc tiếp diễn giảm"
                  value={theme.smc.bearishBreakColor}
                  onChange={(c) => updateSmc('bearishBreakColor', c)}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Chỉ báo phụ */}
          {activeTab === 'subpanes' && (
            <div className="space-y-4">
              {/* Nhóm RSI */}
              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider px-1 pb-1">
                  Chỉ báo RSI
                </div>
                <ColorRow
                  label="Đường RSI"
                  description="Màu đường dao động sức mạnh tương đối"
                  value={theme.rsi.lineColor}
                  onChange={(c) => updateRsi('lineColor', c)}
                />
              </div>

              {/* Nhóm MACD */}
              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider px-1 pb-1">
                  Chỉ báo MACD
                </div>
                <ColorRow
                  label="Đường DIF (Nhanh)"
                  value={theme.macd.difColor}
                  onChange={(c) => updateMacd('difColor', c)}
                />
                <ColorRow
                  label="Đường DEA (Tín hiệu Signal)"
                  value={theme.macd.deaColor}
                  onChange={(c) => updateMacd('deaColor', c)}
                />
                <ColorRow
                  label="Cột Histogram Dương (+)"
                  description="Lực mua chiếm ưu thế trên mức 0"
                  value={theme.macd.histUpColor}
                  onChange={(c) => updateMacd('histUpColor', c)}
                />
                <ColorRow
                  label="Cột Histogram Âm (-)"
                  description="Lực bán chiếm ưu thế dưới mức 0"
                  value={theme.macd.histDownColor}
                  onChange={(c) => updateMacd('histDownColor', c)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer"
          >
            Hoàn tất &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
