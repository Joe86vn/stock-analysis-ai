'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  BarChart2,
  Menu,
  LayoutGrid,
  ChevronDown,
  Check,
  Palette,
} from 'lucide-react';
import {
  ChartColorTheme,
  StatusLineConfig,
  CanvasConfig,
  THEME_PRESETS,
  DEFAULT_STATUS_LINE_CONFIG,
  DEFAULT_CANVAS_CONFIG,
  saveTheme,
  saveStatusLineConfig,
  saveCanvasConfig,
  PresetThemeId,
} from './chart-theme-types';

interface ChartSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ChartColorTheme;
  onThemeChange: (newTheme: ChartColorTheme) => void;
  statusLineConfig: StatusLineConfig;
  onStatusLineConfigChange: (newConfig: StatusLineConfig) => void;
  canvasConfig: CanvasConfig;
  onCanvasConfigChange: (newConfig: CanvasConfig) => void;
  initialTab?: 'symbol' | 'status' | 'canvas' | 'indicators';
}

type TabType = 'symbol' | 'status' | 'canvas' | 'indicators';

export function ChartSettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  statusLineConfig,
  onStatusLineConfigChange,
  canvasConfig,
  onCanvasConfigChange,
  initialTab = 'symbol',
}: ChartSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  // Snapshot để hỗ trợ nút "Hủy bỏ"
  const [initialSnapshot, setInitialSnapshot] = useState<{
    theme: ChartColorTheme;
    status: StatusLineConfig;
    canvas: CanvasConfig;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInitialSnapshot({
        theme: JSON.parse(JSON.stringify(theme)),
        status: JSON.parse(JSON.stringify(statusLineConfig)),
        canvas: JSON.parse(JSON.stringify(canvasConfig)),
      });
      setActiveTab(initialTab);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleCancel();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (initialSnapshot) {
      onThemeChange(initialSnapshot.theme);
      onStatusLineConfigChange(initialSnapshot.status);
      onCanvasConfigChange(initialSnapshot.canvas);
    }
    onClose();
  };

  const handleOk = () => {
    saveTheme(theme);
    saveStatusLineConfig(statusLineConfig);
    saveCanvasConfig(canvasConfig);
    onClose();
  };

  const handleSelectPreset = (presetId: Exclude<PresetThemeId, 'custom'>) => {
    const preset = THEME_PRESETS[presetId];
    if (preset) {
      onThemeChange({ ...preset });
    }
    setShowPresetDropdown(false);
  };

  const handleResetDefaults = () => {
    onThemeChange(THEME_PRESETS.tradingview);
    onStatusLineConfigChange(DEFAULT_STATUS_LINE_CONFIG);
    onCanvasConfigChange(DEFAULT_CANVAS_CONFIG);
    setShowPresetDropdown(false);
  };

  // Helper đổi màu nến
  const updateCandleColor = (key: keyof ChartColorTheme['candle'], color: string) => {
    onThemeChange({
      ...theme,
      id: 'custom',
      name: 'Tùy chỉnh',
      candle: {
        ...theme.candle,
        [key]: color,
      },
    });
  };

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1e222d] text-slate-900 dark:text-[#d1d4dc] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a2e39] overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2a2e39]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Cài đặt</h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded-lg text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex flex-1 min-h-[380px] max-h-[500px]">
          {/* Left Column: Tabs List */}
          <div className="w-48 sm:w-52 border-r border-gray-200 dark:border-[#2a2e39] bg-gray-50/50 dark:bg-[#171b26] p-2 space-y-1">
            <button
              onClick={() => setActiveTab('symbol')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === 'symbol'
                  ? 'bg-blue-50 dark:bg-[#2962ff]/15 text-blue-600 dark:text-[#2962ff]'
                  : 'text-gray-600 dark:text-[#848e9c] hover:bg-gray-100 dark:hover:bg-[#2a2e39]/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="h-4 w-4 flex-shrink-0" />
              <span>Mã</span>
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-blue-50 dark:bg-[#2962ff]/15 text-blue-600 dark:text-[#2962ff]'
                  : 'text-gray-600 dark:text-[#848e9c] hover:bg-gray-100 dark:hover:bg-[#2a2e39]/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Menu className="h-4 w-4 flex-shrink-0" />
              <span>Dòng trạng thái</span>
            </button>

            <button
              onClick={() => setActiveTab('canvas')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === 'canvas'
                  ? 'bg-blue-50 dark:bg-[#2962ff]/15 text-blue-600 dark:text-[#2962ff]'
                  : 'text-gray-600 dark:text-[#848e9c] hover:bg-gray-100 dark:hover:bg-[#2a2e39]/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4 flex-shrink-0" />
              <span>Canvas</span>
            </button>

            <button
              onClick={() => setActiveTab('indicators')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === 'indicators'
                  ? 'bg-blue-50 dark:bg-[#2962ff]/15 text-blue-600 dark:text-[#2962ff]'
                  : 'text-gray-600 dark:text-[#848e9c] hover:bg-gray-100 dark:hover:bg-[#2a2e39]/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette className="h-4 w-4 flex-shrink-0" />
              <span>Màu chỉ báo</span>
            </button>
          </div>

          {/* Right Column: Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-slate-800 dark:text-[#d1d4dc]">
            {/* ─── Tab 1: Mã (Symbol) ─────────────────────────────── */}
            {activeTab === 'symbol' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider mb-3">
                    Biểu đồ nến
                  </h3>

                  <div className="space-y-3.5">
                    {/* Checkbox: Các thanh màu dựa trên đóng cửa phiên trước */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={true}
                        readOnly
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Các thanh màu dựa trên đóng cửa phiên trước</span>
                    </label>

                    {/* Thân nến */}
                    <div className="flex items-center justify-between py-1">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-medium">Thân</span>
                      </label>
                      <div className="flex items-center space-x-3">
                        {/* Up body */}
                        <label className="relative flex items-center cursor-pointer" title="Màu thân nến Tăng">
                          <span
                            className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                            style={{ backgroundColor: theme.candle.upColor }}
                          />
                          <input
                            type="color"
                            value={theme.candle.upColor}
                            onChange={(e) => updateCandleColor('upColor', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        {/* Down body */}
                        <label className="relative flex items-center cursor-pointer" title="Màu thân nến Giảm">
                          <span
                            className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                            style={{ backgroundColor: theme.candle.downColor }}
                          />
                          <input
                            type="color"
                            value={theme.candle.downColor}
                            onChange={(e) => updateCandleColor('downColor', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Đường viền */}
                    <div className="flex items-center justify-between py-1">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-medium">Đường viền</span>
                      </label>
                      <div className="flex items-center space-x-3">
                        {/* Up border */}
                        <label className="relative flex items-center cursor-pointer" title="Màu viền nến Tăng">
                          <span
                            className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                            style={{ backgroundColor: theme.candle.upBorderColor }}
                          />
                          <input
                            type="color"
                            value={theme.candle.upBorderColor}
                            onChange={(e) => updateCandleColor('upBorderColor', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        {/* Down border */}
                        <label className="relative flex items-center cursor-pointer" title="Màu viền nến Giảm">
                          <span
                            className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                            style={{ backgroundColor: theme.candle.downBorderColor }}
                          />
                          <input
                            type="color"
                            value={theme.candle.downBorderColor}
                            onChange={(e) => updateCandleColor('downBorderColor', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Bóng nến (Râu) */}
                    <div className="flex items-center justify-between py-1">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-medium">Bóng nến</span>
                      </label>
                      <div className="flex items-center space-x-3">
                        {/* Up wick */}
                        <label className="relative flex items-center cursor-pointer" title="Màu râu nến Tăng">
                          <span
                            className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                            style={{ backgroundColor: theme.candle.upWickColor }}
                          />
                          <input
                            type="color"
                            value={theme.candle.upWickColor}
                            onChange={(e) => updateCandleColor('upWickColor', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        {/* Down wick */}
                        <label className="relative flex items-center cursor-pointer" title="Màu râu nến Giảm">
                          <span
                            className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                            style={{ backgroundColor: theme.candle.downWickColor }}
                          />
                          <input
                            type="color"
                            value={theme.candle.downWickColor}
                            onChange={(e) => updateCandleColor('downWickColor', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Điều chỉnh dữ liệu */}
                <div className="pt-4 border-t border-gray-100 dark:border-[#2a2e39]">
                  <h3 className="text-[11px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider mb-3">
                    Điều chỉnh dữ liệu
                  </h3>
                  <div className="flex items-center justify-between">
                    <span>Độ chính xác</span>
                    <select
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                      defaultValue="default"
                    >
                      <option value="default">Mặc định</option>
                      <option value="0">0 (Số nguyên)</option>
                      <option value="2">2 (0.01)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Dòng trạng thái (Status line) ──────────── */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider mb-3">
                    Công cụ &amp; Thông số Phiên (Hàng 2)
                  </h3>

                  <div className="space-y-3.5">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusLineConfig.showTitle}
                        onChange={(e) =>
                          onStatusLineConfigChange({
                            ...statusLineConfig,
                            showTitle: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Tiêu đề &amp; Tên mã</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusLineConfig.showDate}
                        onChange={(e) =>
                          onStatusLineConfigChange({
                            ...statusLineConfig,
                            showDate: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Ngày phiên giao dịch</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusLineConfig.showOhlc}
                        onChange={(e) =>
                          onStatusLineConfigChange({
                            ...statusLineConfig,
                            showOhlc: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Giá trị biểu đồ (Mở, Cao, Thấp, Đóng - OHLC)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusLineConfig.showChange}
                        onChange={(e) =>
                          onStatusLineConfigChange({
                            ...statusLineConfig,
                            showChange: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Các giá trị thay đổi thanh (Biên độ chênh lệch &amp; %)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusLineConfig.showVolume}
                        onChange={(e) =>
                          onStatusLineConfigChange({
                            ...statusLineConfig,
                            showVolume: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Khối lượng (Vol)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusLineConfig.showAdtv20}
                        onChange={(e) =>
                          onStatusLineConfigChange({
                            ...statusLineConfig,
                            showAdtv20: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Giá trị giao dịch trung bình 20N (GTGD 20N)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 3: Canvas ──────────────────────────────────── */}
            {activeTab === 'canvas' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider mb-3">
                    Kiểu cơ bản của biểu đồ
                  </h3>

                  <div className="space-y-3.5">
                    {/* Hình nền */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Hình nền</span>
                      <div className="flex items-center space-x-3">
                        <select className="px-3 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-xs">
                          <option value="solid">Solid</option>
                        </select>
                        <label className="relative flex items-center cursor-pointer" title="Màu nền sáng">
                          <span
                            className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                            style={{ backgroundColor: canvasConfig.backgroundColorLight }}
                          />
                          <input
                            type="color"
                            value={canvasConfig.backgroundColorLight}
                            onChange={(e) =>
                              onCanvasConfigChange({
                                ...canvasConfig,
                                backgroundColorLight: e.target.value,
                              })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Đường lưới dọc */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canvasConfig.showVerticalGrid}
                          onChange={(e) =>
                            onCanvasConfigChange({
                              ...canvasConfig,
                              showVerticalGrid: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-medium">Đường lưới dọc</span>
                      </label>
                      <label className="relative flex items-center cursor-pointer" title="Màu lưới">
                        <span
                          className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                          style={{ backgroundColor: canvasConfig.gridColorLight }}
                        />
                        <input
                          type="color"
                          value={canvasConfig.gridColorLight}
                          onChange={(e) =>
                            onCanvasConfigChange({
                              ...canvasConfig,
                              gridColorLight: e.target.value,
                            })
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    {/* Đường lưới ngang */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canvasConfig.showHorizontalGrid}
                          onChange={(e) =>
                            onCanvasConfigChange({
                              ...canvasConfig,
                              showHorizontalGrid: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-medium">Đường lưới ngang</span>
                      </label>
                      <label className="relative flex items-center cursor-pointer" title="Màu lưới">
                        <span
                          className="w-7 h-7 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                          style={{ backgroundColor: canvasConfig.gridColorLight }}
                        />
                        <input
                          type="color"
                          value={canvasConfig.gridColorLight}
                          onChange={(e) =>
                            onCanvasConfigChange({
                              ...canvasConfig,
                              gridColorLight: e.target.value,
                            })
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    {/* Đường chữ thập (Crosshair) */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Đường chữ thập (Crosshair)</span>
                      <select
                        value={canvasConfig.crosshairStyle}
                        onChange={(e) =>
                          onCanvasConfigChange({
                            ...canvasConfig,
                            crosshairStyle: e.target.value as 'dashed' | 'solid',
                          })
                        }
                        className="px-3 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-xs font-mono"
                      >
                        <option value="dashed">---- (Nét đứt)</option>
                        <option value="solid">—— (Nét liền)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-[#2a2e39]">
                  <h3 className="text-[11px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider mb-2">
                    Ký quỹ
                  </h3>
                  <div className="flex items-center justify-between">
                    <span>Trên đầu</span>
                    <span className="font-mono font-bold text-gray-600 dark:text-gray-300">10%</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 4: Màu sắc chỉ báo ─────────────────────────── */}
            {activeTab === 'indicators' && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider mb-2">
                  Tùy chỉnh màu sắc các chỉ báo
                </h3>

                {/* EMA */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-200 dark:border-[#2a2e39] space-y-2">
                  <div className="font-bold text-slate-800 dark:text-white">Đường EMA</div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-gray-500">EMA 1 (20):</span>
                      <label className="relative flex items-center cursor-pointer">
                        <span
                          className="w-5 h-5 rounded border border-gray-300 dark:border-[#434651] block"
                          style={{ backgroundColor: theme.ema.ema1Color }}
                        />
                        <input
                          type="color"
                          value={theme.ema.ema1Color}
                          onChange={(e) =>
                            onThemeChange({
                              ...theme,
                              ema: { ...theme.ema, ema1Color: e.target.value },
                            })
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-gray-500">EMA 2 (200):</span>
                      <label className="relative flex items-center cursor-pointer">
                        <span
                          className="w-5 h-5 rounded border border-gray-300 dark:border-[#434651] block"
                          style={{ backgroundColor: theme.ema.ema2Color }}
                        />
                        <input
                          type="color"
                          value={theme.ema.ema2Color}
                          onChange={(e) =>
                            onThemeChange({
                              ...theme,
                              ema: { ...theme.ema, ema2Color: e.target.value },
                            })
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* SMC Swing H/L */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#171b26] border border-gray-200 dark:border-[#2a2e39] space-y-2">
                  <div className="font-bold text-slate-800 dark:text-white">Cấu trúc SMC (Đỉnh - Đáy)</div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-gray-500">Đỉnh (HH/LH):</span>
                      <label className="relative flex items-center cursor-pointer">
                        <span
                          className="w-5 h-5 rounded border border-gray-300 dark:border-[#434651] block"
                          style={{ backgroundColor: theme.smc.peakColor }}
                        />
                        <input
                          type="color"
                          value={theme.smc.peakColor}
                          onChange={(e) =>
                            onThemeChange({
                              ...theme,
                              smc: { ...theme.smc, peakColor: e.target.value },
                            })
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-gray-500">Đáy (HL/LL):</span>
                      <label className="relative flex items-center cursor-pointer">
                        <span
                          className="w-5 h-5 rounded border border-gray-300 dark:border-[#434651] block"
                          style={{ backgroundColor: theme.smc.troughColor }}
                        />
                        <input
                          type="color"
                          value={theme.smc.troughColor}
                          onChange={(e) =>
                            onThemeChange({
                              ...theme,
                              smc: { ...theme.smc, troughColor: e.target.value },
                            })
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 dark:border-[#2a2e39] bg-gray-50/70 dark:bg-[#171b26]/70">
          {/* Preset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresetDropdown((v) => !v)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] hover:bg-gray-100 dark:hover:bg-[#2a2e39] text-xs font-semibold text-slate-700 dark:text-[#d1d4dc] transition cursor-pointer"
            >
              <span>Bản mẫu...</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showPresetDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPresetDropdown(false)} />
                <div className="absolute left-0 bottom-full mb-1.5 z-20 w-60 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2a2e39] rounded-xl shadow-xl py-1 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-[#787b86] uppercase">
                    Theme Presets 1-Click
                  </div>
                  {Object.entries(THEME_PRESETS).map(([id, p]) => (
                    <button
                      key={id}
                      onClick={() => handleSelectPreset(id as any)}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39] text-slate-800 dark:text-gray-200 text-left cursor-pointer"
                    >
                      <span>{p.name}</span>
                      {theme.id === id && <Check className="h-3.5 w-3.5 text-blue-500" />}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100 dark:border-[#2a2e39]" />
                  <button
                    onClick={handleResetDefaults}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Khôi phục mặc định</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] hover:bg-gray-100 dark:hover:bg-[#2a2e39] text-xs font-semibold text-slate-700 dark:text-[#d1d4dc] transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleOk}
              className="px-5 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
