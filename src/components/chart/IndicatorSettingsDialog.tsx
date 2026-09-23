'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, RotateCcw, Info } from 'lucide-react';

export interface IndicatorPlotConfig {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed';
}

export interface IndicatorSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorId: string;
  title: string;
  plots: IndicatorPlotConfig[];
  onSavePlots: (
    plots: IndicatorPlotConfig[],
    extraConfig?: { showPriceScaleLabel?: boolean; showStatusValue?: boolean }
  ) => void;
  params?: any;
  onSaveParams?: (params: any) => void;
  initialTab?: 'params' | 'format';
  showPriceScaleLabel?: boolean;
  onTogglePriceScaleLabel?: (val: boolean) => void;
  showStatusValue?: boolean;
  onToggleStatusValue?: (val: boolean) => void;
  defaultPlots?: IndicatorPlotConfig[];
  defaultParams?: any;
  onResetDefaults?: () => void;
}

export function IndicatorSettingsDialog({
  isOpen,
  onClose,
  indicatorId,
  title,
  plots: initialPlots,
  onSavePlots,
  params: initialParams = {},
  onSaveParams,
  initialTab = 'params',
  showPriceScaleLabel = true,
  onTogglePriceScaleLabel,
  showStatusValue = true,
  onToggleStatusValue,
  defaultPlots,
  defaultParams,
  onResetDefaults,
}: IndicatorSettingsDialogProps) {
  const hasParams = ['swingHl', 'ema', 'boll', 'vol', 'rsi', 'macd', 'rsVsIndex'].includes(indicatorId);
  const [activeTab, setActiveTab] = useState<'params' | 'format'>(!hasParams ? 'format' : initialTab);
  const [plots, setPlots] = useState<IndicatorPlotConfig[]>(initialPlots);
  const [localParams, setLocalParams] = useState<any>(initialParams);
  const [priceScaleLabel, setPriceScaleLabel] = useState(showPriceScaleLabel);
  const [statusValue, setStatusValue] = useState(showStatusValue);
  const [showDefaultDropdown, setShowDefaultDropdown] = useState(false);

  // Chỉ đồng bộ state local khi mở dialog (khi isOpen từ false sang true)
  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setPlots(JSON.parse(JSON.stringify(initialPlots)));
      setLocalParams(JSON.parse(JSON.stringify(initialParams)));
      setPriceScaleLabel(showPriceScaleLabel);
      setStatusValue(showStatusValue);
      setActiveTab(initialTab);
    }
    prevIsOpenRef.current = isOpen;

    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, initialPlots, initialParams, initialTab, showPriceScaleLabel, showStatusValue, onClose]);

  if (!isOpen) return null;

  // Plot formatting handlers (Cập nhật realtime không làm mất tab hiện tại)
  const handleTogglePlot = (id: string) => {
    setPlots((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p));
      onSavePlots(next, { showPriceScaleLabel: priceScaleLabel, showStatusValue: statusValue });
      return next;
    });
  };

  const handleColorChange = (id: string, color: string) => {
    setPlots((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, color } : p));
      onSavePlots(next, { showPriceScaleLabel: priceScaleLabel, showStatusValue: statusValue });
      return next;
    });
  };

  const handleWidthChange = (id: string, lineWidth: number) => {
    setPlots((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, lineWidth } : p));
      onSavePlots(next, { showPriceScaleLabel: priceScaleLabel, showStatusValue: statusValue });
      return next;
    });
  };

  const handleStyleChange = (id: string, lineStyle: 'solid' | 'dashed') => {
    setPlots((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, lineStyle } : p));
      onSavePlots(next, { showPriceScaleLabel: priceScaleLabel, showStatusValue: statusValue });
      return next;
    });
  };

  const handleTogglePriceScaleLabel = (val: boolean) => {
    setPriceScaleLabel(val);
    onSavePlots(plots, { showPriceScaleLabel: val, showStatusValue: statusValue });
    if (onTogglePriceScaleLabel) onTogglePriceScaleLabel(val);
  };

  const handleToggleStatusValue = (val: boolean) => {
    setStatusValue(val);
    onSavePlots(plots, { showPriceScaleLabel: priceScaleLabel, showStatusValue: val });
    if (onToggleStatusValue) onToggleStatusValue(val);
  };

  // Param update handler (cập nhật realtime trên biểu đồ, revert khi bấm Hủy)
  const handleParamChange = (key: string, val: any) => {
    setLocalParams((prev: any) => {
      const next = { ...prev, [key]: val };
      if (onSaveParams) {
        if (typeof val === 'number') {
          if (!isNaN(val) && val > 0) {
            onSaveParams(next);
          }
        } else {
          onSaveParams(next);
        }
      }
      return next;
    });
  };

  const handleOk = () => {
    onSavePlots(plots, { showPriceScaleLabel: priceScaleLabel, showStatusValue: statusValue });
    if (onSaveParams) onSaveParams(localParams);
    if (onTogglePriceScaleLabel) onTogglePriceScaleLabel(priceScaleLabel);
    if (onToggleStatusValue) onToggleStatusValue(statusValue);
    onClose();
  };

  const handleCancel = () => {
    onSavePlots(initialPlots, { showPriceScaleLabel, showStatusValue });
    if (onSaveParams) onSaveParams(initialParams);
    onClose();
  };

  const handleResetDefaults = () => {
    if (onResetDefaults) {
      onResetDefaults();
      setShowDefaultDropdown(false);
      return;
    }
    const defP = defaultPlots || initialPlots;
    const defPar = defaultParams || initialParams;
    setPlots(defP);
    setLocalParams(defPar);
    setPriceScaleLabel(true);
    setStatusValue(true);
    onSavePlots(defP, { showPriceScaleLabel: true, showStatusValue: true });
    if (onSaveParams) onSaveParams(defPar);
    setShowDefaultDropdown(false);
  };

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#1e222d] text-slate-900 dark:text-[#d1d4dc] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a2e39] overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#2a2e39]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
            {title}
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded-lg text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition cursor-pointer flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs: "Các tham số" & "Định dạng" */}
        <div className="flex items-center space-x-6 border-b border-gray-200 dark:border-[#2a2e39] px-5 pt-1 bg-gray-50/50 dark:bg-[#171b26]/50">
          <button
            onClick={() => setActiveTab('params')}
            className={`pb-2.5 pt-1.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'params'
                ? 'border-blue-600 dark:border-[#2962ff] text-blue-600 dark:text-[#2962ff]'
                : 'border-transparent text-gray-500 dark:text-[#848e9c] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Các tham số
          </button>

          <button
            onClick={() => setActiveTab('format')}
            className={`pb-2.5 pt-1.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'format'
                ? 'border-blue-600 dark:border-[#2962ff] text-blue-600 dark:text-[#2962ff]'
                : 'border-transparent text-gray-500 dark:text-[#848e9c] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Định dạng
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs min-h-[260px] max-h-[400px] overflow-y-auto">
          {/* ══════════════ TAB 1: CÁC THAM SỐ ══════════════ */}
          {activeTab === 'params' && (
            <div className="space-y-4 text-slate-800 dark:text-[#d1d4dc]">
              {!hasParams && (
                <div className="py-8 px-4 text-center space-y-2.5">
                  <div className="inline-flex p-3 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-1">
                    <Info className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Chỉ báo Dữ liệu Cơ bản (Fundamental)
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                    Chỉ báo này được tính toán tự động từ Báo cáo tài chính (BCTC) niêm yết theo chu kỳ TTM, không sử dụng tham số chu kỳ nến. Bạn có thể tùy chỉnh màu sắc và đường nét vẽ ở tab <strong>Định dạng</strong>.
                  </p>
                </div>
              )}
              {/* SMC Swing HL */}
              {indicatorId === 'swingHl' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Số nến kiểm tra đỉnh đáy:</span>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={localParams.swingHlWindow ?? 9}
                        onChange={(e) => handleParamChange('swingHlWindow', Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[11px] text-gray-400 dark:text-[#787b86]">(nến)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Nến xác nhận CHoCH:</span>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={localParams.swingHlConfirmBars ?? 3}
                        onChange={(e) => handleParamChange('swingHlConfirmBars', Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[11px] text-gray-400 dark:text-[#787b86]">(đóng cửa)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-[#2a2e39] space-y-2.5">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={localParams.swingHlShowLine ?? true}
                        onChange={(e) => handleParamChange('swingHlShowLine', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Hiện đường nối Zigzag</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={localParams.swingHlShowChochBos ?? true}
                        onChange={(e) => handleParamChange('swingHlShowChochBos', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Hiện đường CHoCH &amp; BOS</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={localParams.swingHlShowPercent ?? true}
                        onChange={(e) => handleParamChange('swingHlShowPercent', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium">Hiện % tăng/giảm nhịp sóng</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Đường EMA */}
              {indicatorId === 'ema' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Chiều dài EMA 1 (Nhanh):</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={localParams.emaShort ?? 20}
                      onChange={(e) => handleParamChange('emaShort', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Chiều dài EMA 2 (Chậm):</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={localParams.emaLong ?? 200}
                      onChange={(e) => handleParamChange('emaLong', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-[#2a2e39] flex items-center justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                    <span>Nguồn tính toán:</span>
                    <span className="font-medium text-slate-700 dark:text-gray-300">Đóng cửa (Close)</span>
                  </div>
                </div>
              )}

              {/* Bollinger Bands */}
              {indicatorId === 'boll' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Chiều dài (Period):</span>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={localParams.bollPeriod ?? 20}
                      onChange={(e) => handleParamChange('bollPeriod', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Độ lệch chuẩn (StdDev):</span>
                    <input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.5}
                      value={localParams.bollStdDev ?? 2}
                      onChange={(e) => handleParamChange('bollStdDev', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Khối lượng (VOL) */}
              {indicatorId === 'vol' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Chiều dài MA Khối lượng:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={localParams.volMaPeriod ?? 20}
                      onChange={(e) => handleParamChange('volMaPeriod', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* RSI */}
              {indicatorId === 'rsi' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Chiều dài RSI:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={localParams.rsiPeriod ?? 14}
                      onChange={(e) => handleParamChange('rsiPeriod', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* MACD */}
              {indicatorId === 'macd' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Độ dài Nhanh (Fast Length):</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={localParams.macdFast ?? 12}
                      onChange={(e) => handleParamChange('macdFast', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Độ dài Chậm (Slow Length):</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={localParams.macdSlow ?? 26}
                      onChange={(e) => handleParamChange('macdSlow', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tín hiệu (Signal Smoothing):</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={localParams.macdSignal ?? 9}
                      onChange={(e) => handleParamChange('macdSignal', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* RS vs Index */}
              {indicatorId === 'rsVsIndex' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Số nến tính đỉnh RS (Window):</span>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={localParams.rsVsIndexWindow ?? 20}
                      onChange={(e) => handleParamChange('rsVsIndexWindow', Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-slate-900 dark:text-white font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ TAB 2: ĐỊNH DẠNG ══════════════ */}
          {activeTab === 'format' && (
            <div className="space-y-4">
              {/* List of Plots */}
              <div className="space-y-3">
                {plots.map((plot) => (
                  <div key={plot.id} className="flex items-center justify-between py-1">
                    {/* Visibility + Name */}
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={plot.visible}
                        onChange={() => handleTogglePlot(plot.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-medium text-slate-800 dark:text-[#d1d4dc]">
                        {plot.name}
                      </span>
                    </label>

                    {/* Color + Stroke control */}
                    <div className="flex items-center space-x-2">
                      {/* Color picker */}
                      <label className="relative flex items-center cursor-pointer" title="Chọn màu sắc">
                        <span
                          className="w-6 h-6 rounded border border-gray-300 dark:border-[#434651] shadow-2xs block"
                          style={{ backgroundColor: plot.color }}
                        />
                        <input
                          type="color"
                          value={plot.color}
                          onChange={(e) => handleColorChange(plot.id, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>

                      {/* Line Width select */}
                      <select
                        value={plot.lineWidth}
                        onChange={(e) => handleWidthChange(plot.id, Number(e.target.value))}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-xs font-mono"
                        title="Độ dày nét vẽ"
                      >
                        <option value={1}>1px</option>
                        <option value={1.5}>1.5px</option>
                        <option value={2}>2px</option>
                        <option value={3}>3px</option>
                      </select>

                      {/* Line Style select */}
                      <select
                        value={plot.lineStyle}
                        onChange={(e) => handleStyleChange(plot.id, e.target.value as 'solid' | 'dashed')}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-xs font-mono"
                        title="Kiểu nét vẽ"
                      >
                        <option value="solid">——</option>
                        <option value="dashed">----</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* GIÁ TRỊ ĐẦU RA */}
              <div className="pt-4 border-t border-gray-100 dark:border-[#2a2e39] space-y-3">
                <div className="text-[10px] font-bold text-gray-400 dark:text-[#787b86] uppercase tracking-wider">
                  Giá trị đầu ra
                </div>

                <div className="flex items-center justify-between">
                  <span>Độ chính xác</span>
                  <select className="px-2.5 py-1 rounded border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-xs">
                    <option value="default">Mặc định</option>
                  </select>
                </div>

                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={priceScaleLabel}
                    onChange={(e) => handleTogglePriceScaleLabel(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <span>Nhãn trên thang giá</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={statusValue}
                    onChange={(e) => handleToggleStatusValue(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <span>Giá trị trong dòng trạng thái</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-[#2a2e39] bg-gray-50/70 dark:bg-[#171b26]/70">
          <div className="relative">
            <button
              onClick={() => setShowDefaultDropdown((v) => !v)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] text-xs font-medium text-slate-700 dark:text-[#d1d4dc] transition cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
            >
              <span>Các mặc định...</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showDefaultDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDefaultDropdown(false)} />
                <div className="absolute left-0 bottom-full mb-1 z-20 w-44 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2a2e39] rounded-xl shadow-xl py-1 text-xs">
                  <button
                    onClick={handleResetDefaults}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39] text-left cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                    <span>Đặt lại cài đặt</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-[#434651] bg-white dark:bg-[#1e222d] hover:bg-gray-100 dark:hover:bg-[#2a2e39] text-xs font-semibold text-slate-700 dark:text-[#d1d4dc] transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleOk}
              className="px-4 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
