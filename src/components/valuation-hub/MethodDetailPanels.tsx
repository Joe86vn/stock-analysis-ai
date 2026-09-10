import React, { useState } from 'react';
import {
  ValuationMethodConfig,
  ValuationMethod,
} from '@/types/analysis';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { calculateDCFFairValue } from '@/lib/dcf-engine';

interface MethodDetailPanelsProps {
  methods: ValuationMethodConfig[];
  onUpdateMethodConfig: (updated: ValuationMethodConfig) => void;
  inputs: {
    epsForward: number;
    ebitdaForward: number;
    netDebt: number;
    sharesOutstanding: number;
    bvpsForward: number;
    currentPrice: number;
    growthTier?: string;
    cfoForward?: number;
    capexForward?: number;
    netProfitForward?: number;
    revenueGrowthForecast?: number;
  };
  historicalStats: {
    peMean?: number;
    peMedian?: number;
    peStd?: number;
    peMinus1Sigma?: number;
    pePlus1Sigma?: number;
    pbMean?: number;
    pbMedian?: number;
    pbStd?: number;
    pbMinus1Sigma?: number;
    pbPlus1Sigma?: number;
  };
  peerMedians?: {
    pe?: number;
    pb?: number;
    evEbitda?: number;
    maxPe?: number;
  };
}

export const MethodDetailPanels: React.FC<MethodDetailPanelsProps> = ({
  methods,
  onUpdateMethodConfig,
  inputs,
  historicalStats,
  peerMedians,
}) => {
  // Quản lý trạng thái mở/đóng của từng panel accordion
  const [expandedMethods, setExpandedMethods] = useState<Record<string, boolean>>({
    P_E: true,
    EV_EBITDA: true,
    P_B: true,
    DCF: true,
    RNAV: true,
    SOTP: true,
  });

  const toggleExpand = (methodKey: string) => {
    setExpandedMethods((prev) => ({
      ...prev,
      [methodKey]: !prev[methodKey],
    }));
  };

  const activeMethods = methods.filter((m) => m.role !== 'DISABLED');

  if (activeMethods.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
        <p className="text-sm font-medium">Chưa có phương pháp định giá nào được bật.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Vui lòng chọn ít nhất 1 phương pháp từ cột bên trái để bắt đầu định giá.
        </p>
      </div>
    );
  }

  // Render từng panel chi tiết
  return (
    <div className="space-y-3">
      {activeMethods.map((m) => {
        const isExpanded = !!expandedMethods[m.method];

        return (
          <div
            key={m.method}
            className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs dark:shadow-none transition-all"
          >
            {/* Header Accordion */}
            <div
              onClick={() => toggleExpand(m.method)}
              className="flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-950/70 cursor-pointer transition-colors border-b border-slate-200 dark:border-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{m.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium">
                  {m.role === 'MAIN_1' ? 'Chính 1' : m.role === 'MAIN_2' ? 'Chính 2' : 'Kiểm tra chéo'}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
                  Trọng số: {m.weight}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1.5 font-medium">Giá Base:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {m.fairValueBase ? `${m.fairValueBase.toLocaleString('vi-VN')} đ` : '—'}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                )}
              </div>
            </div>

            {/* Panel Body */}
            {isExpanded && (
              <div className="p-4 space-y-4">
                {/* Method Specific Formula & Inputs Note */}
                <MethodFormulaBanner
                  method={m.method}
                  inputs={inputs}
                  historicalStats={historicalStats}
                  peerMedians={peerMedians}
                />

                {/* 3 Scenario Cards */}
                {m.method === 'DCF' ? (
                  /* Giao diện Học thuật Riêng cho Phương pháp DCF: Loại bỏ Bội số, Hiển thị WACC & g */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* DCF Thận Trọng (Bear) */}
                    <div className="bg-rose-50/40 dark:bg-slate-950/60 border border-rose-200 dark:border-red-900/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-600 dark:text-red-400 uppercase tracking-wider">
                          Thận Trọng (Bear)
                        </span>
                        <span className="text-[10px] text-slate-500">Chiết khấu cao</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>Chiết khấu WACC:</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-red-400">13.0%</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>Tăng trưởng dài hạn (g):</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">3.0%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-rose-200/60 dark:border-slate-800/60">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Giá trị hợp lý:</div>
                        <div className="text-base font-bold text-rose-600 dark:text-red-400 font-mono mt-0.5">
                          {m.fairValueBear ? `${m.fairValueBear.toLocaleString('vi-VN')} đ` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* DCF Cơ Sở (Base) */}
                    <div className="bg-sky-50/40 dark:bg-slate-950/60 border border-sky-200 dark:border-slate-700/80 rounded-lg p-3 space-y-2 ring-1 ring-sky-200 dark:ring-slate-700/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-700 dark:text-slate-200 uppercase tracking-wider">
                          Cơ Sở (Base)
                        </span>
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">Trung tâm mô hình</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>Chiết khấu WACC:</span>
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">12.0%</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>Tăng trưởng dài hạn (g):</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">4.0%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-sky-200/60 dark:border-slate-800/60">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                          Giá trị hợp lý Base (đ):
                        </label>
                        <input
                          type="number"
                          step="500"
                          value={m.fairValueBase || ''}
                          placeholder={inputs.currentPrice ? `${Math.round(inputs.currentPrice * 1.15)}` : '50000'}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            onUpdateMethodConfig({
                              ...m,
                              fairValueBase: val,
                              fairValueBear: Math.round(val * 0.81),
                              fairValueBull: Math.round(val * 1.26),
                              targetBase: val,
                            });
                          }}
                          className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* DCF Tích Cực (Bull) */}
                    <div className="bg-emerald-50/40 dark:bg-slate-950/60 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Tích Cực (Bull)
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Tăng trưởng cao</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>Chiết khấu WACC:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">11.0%</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>Tăng trưởng dài hạn (g):</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">5.0%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-emerald-200/60 dark:border-slate-800/60">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Giá trị hợp lý:</div>
                        <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                          {m.fairValueBull ? `${m.fairValueBull.toLocaleString('vi-VN')} đ` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Giao diện Tiêu Chuẩn cho các phương pháp P/E, EV/EBITDA, P/B, RNAV, SOTP */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Kịch bản Thận Trọng (Bear) */}
                    <div className="bg-rose-50/40 dark:bg-slate-950/60 border border-rose-200 dark:border-red-900/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-600 dark:text-red-400 uppercase tracking-wider">
                          Thận Trọng (Bear)
                        </span>
                        <span className="text-[10px] text-slate-500">μ - 1σ</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                          Hệ số mục tiêu:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={m.targetBear}
                          onChange={(e) =>
                            onUpdateMethodConfig({
                              ...m,
                              targetBear: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono font-semibold border border-slate-300 dark:border-slate-700/70 rounded px-2 py-1 text-sm focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="pt-1.5 border-t border-rose-200/60 dark:border-slate-800/60">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Giá trị hợp lý:</div>
                        <div className="text-base font-bold text-rose-600 dark:text-red-400 font-mono mt-0.5">
                          {m.fairValueBear ? `${m.fairValueBear.toLocaleString('vi-VN')} đ` : '—'}
                        </div>
                      </div>

                      {/* Quick Preset Chips */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {historicalStats.peMinus1Sigma && m.method === 'P_E' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMethodConfig({ ...m, targetBear: historicalStats.peMinus1Sigma! })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-medium"
                          >
                            -1σ: {historicalStats.peMinus1Sigma}x
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Kịch bản Cơ Sở (Base) */}
                    <div className="bg-sky-50/40 dark:bg-slate-950/60 border border-sky-200 dark:border-slate-700/80 rounded-lg p-3 space-y-2 ring-1 ring-sky-200 dark:ring-slate-700/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-700 dark:text-slate-200 uppercase tracking-wider">
                          Cơ Sở (Base)
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Trung vị + Hạng</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                          Hệ số mục tiêu:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={m.targetBase}
                          onChange={(e) =>
                            onUpdateMethodConfig({
                              ...m,
                              targetBase: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-semibold border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="pt-1.5 border-t border-sky-200/60 dark:border-slate-800/60">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Giá trị hợp lý:</div>
                        <div className="text-base font-bold text-sky-700 dark:text-slate-100 font-mono mt-0.5">
                          {m.fairValueBase ? `${m.fairValueBase.toLocaleString('vi-VN')} đ` : '—'}
                        </div>
                      </div>

                      {/* Quick Preset Chips */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {historicalStats.peMedian && m.method === 'P_E' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMethodConfig({ ...m, targetBase: historicalStats.peMedian! })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-medium"
                          >
                            μ: {historicalStats.peMedian}x
                          </button>
                        )}
                        {peerMedians?.pe && m.method === 'P_E' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMethodConfig({ ...m, targetBase: peerMedians.pe! })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-medium"
                          >
                            Peer: {peerMedians.pe}x
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Kịch bản Tích Cực (Bull) */}
                    <div className="bg-emerald-50/40 dark:bg-slate-950/60 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Tích Cực (Bull)
                        </span>
                        <span className="text-[10px] text-slate-500">μ + 1σ</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                          Hệ số mục tiêu:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={m.targetBull}
                          onChange={(e) =>
                            onUpdateMethodConfig({
                              ...m,
                              targetBull: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono font-semibold border border-slate-300 dark:border-slate-700/70 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="pt-1.5 border-t border-emerald-200/60 dark:border-slate-800/60">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Giá trị hợp lý:</div>
                        <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                          {m.fairValueBull ? `${m.fairValueBull.toLocaleString('vi-VN')} đ` : '—'}
                        </div>
                      </div>

                      {/* Quick Preset Chips */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {historicalStats.pePlus1Sigma && m.method === 'P_E' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMethodConfig({ ...m, targetBull: historicalStats.pePlus1Sigma! })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-medium"
                          >
                            +1σ: {historicalStats.pePlus1Sigma}x
                          </button>
                        )}
                        {peerMedians?.maxPe && m.method === 'P_E' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMethodConfig({ ...m, targetBull: peerMedians.maxPe! })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-medium"
                          >
                            Trần Peer: {peerMedians.maxPe}x
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Guard Warning: Bull Multiple > Peer Max */}
                {m.method === 'P_E' &&
                  peerMedians?.maxPe &&
                  m.targetBull > peerMedians.maxPe && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-2.5 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        P/E Bull ({m.targetBull}x) đang cao hơn đối thủ cao nhất ({peerMedians.maxPe}x). ValueX khuyến nghị không vượt trần ngành nếu chưa có lợi thế độc quyền vượt trội.
                      </span>
                    </div>
                  )}

                {/* DCF Sensitivity Matrix preview if method === 'DCF' */}
                {m.method === 'DCF' && (() => {
                  const np = inputs.netProfitForward || Math.round((inputs.epsForward * inputs.sharesOutstanding) / 1000);
                  const cfo = inputs.cfoForward || Math.round(np * 0.8);
                  const capex = inputs.capexForward || Math.max(50, Math.round(cfo * 0.22));

                  const dcfCalc = calculateDCFFairValue({
                    cfoForward: cfo,
                    capexForward: capex,
                    netProfitForward: np,
                    netDebt: inputs.netDebt,
                    sharesOutstanding: inputs.sharesOutstanding,
                    currentPrice: inputs.currentPrice,
                    revenueGrowthForecast: inputs.revenueGrowthForecast || 12,
                    wacc: 12.0,
                    terminalGrowth: 4.0,
                  });

                  const matrix = dcfCalc.sensitivityMatrix;

                  const handleSelectCell = (selectedVal: number, bearVal: number, bullVal: number) => {
                    onUpdateMethodConfig({
                      ...m,
                      fairValueBase: selectedVal,
                      fairValueBear: bearVal,
                      fairValueBull: bullVal,
                      targetBase: selectedVal,
                    });
                  };

                  return (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      {/* Bảng phân rã các tham số định giá FCFF */}
                      <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-lg p-3 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Chi tiết Mô hình Chiết Khấu Dòng Tiền Tự Do (FCFF DCF)</span>
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            WACC: 12.0% | g: 4.0%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">CFO 4 Quý:</span>
                            <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {cfo.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">CAPEX 4 Quý:</span>
                            <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {capex.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">FCFF Năm 1:</span>
                            <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                              {dcfCalc.fcffBaseYear1.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">PV FCFF 5 Năm:</span>
                            <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {dcfCalc.pvOf5YearCashFlows.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">PV Terminal Value:</span>
                            <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {dcfCalc.pvOfTerminalValue.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">Enterprise Value (EV):</span>
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {dcfCalc.enterpriseValue.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">Trừ Nợ Vay Ròng:</span>
                            <div className="font-mono font-semibold text-rose-600 dark:text-red-400">
                              - {dcfCalc.netDebt.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400">Vốn Chủ Sở Hữu (Equity):</span>
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {dcfCalc.equityValue.toLocaleString('vi-VN')} tỷ
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ma trận độ nhạy 3x3 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-800 dark:text-slate-300 font-bold">
                            Ma Trận Độ Nhạy DCF (WACC ± 1% × Tăng trưởng vĩnh viễn g ± 1%)
                          </span>
                          <span className="text-[11px] text-sky-600 dark:text-sky-400 italic">
                            💡 Click ô để chọn làm Giá trị Cơ sở (Base)
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-center border border-slate-200 dark:border-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[11px]">
                              <tr>
                                <th className="p-2 border border-slate-200 dark:border-slate-800 font-medium">WACC \ g</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-800 font-medium">g = 3.0%</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">g = 4.0% (Chuẩn)</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-800 font-medium">g = 5.0%</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
                              {matrix.map((row, rIdx) => (
                                <tr key={row.wacc}>
                                  <td className={`p-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-sans ${rIdx === 1 ? 'font-bold text-slate-900 dark:text-slate-200' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                                    {row.waccLabel}
                                  </td>
                                  {row.columns.map((col, cIdx) => {
                                    const val = col.fairValue;
                                    const isSelected = m.fairValueBase === val || (m.fairValueBase === 0 && rIdx === 1 && cIdx === 1);
                                    const isCenterBase = rIdx === 1 && cIdx === 1;
                                    const bearVal = matrix[2]?.columns[0]?.fairValue || Math.round(val * 0.81);
                                    const bullVal = matrix[0]?.columns[2]?.fairValue || Math.round(val * 1.26);

                                    return (
                                      <td
                                        key={cIdx}
                                        onClick={() => handleSelectCell(val, bearVal, bullVal)}
                                        className={`p-2 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all hover:bg-sky-100 dark:hover:bg-slate-800 ${
                                          isSelected
                                            ? 'bg-sky-100/90 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold ring-2 ring-sky-500 rounded-xs'
                                            : isCenterBase
                                            ? 'bg-slate-100/50 dark:bg-slate-800/30 font-bold text-slate-900 dark:text-slate-100'
                                            : rIdx === 0 && cIdx === 2
                                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                            : rIdx === 2 && cIdx === 0
                                            ? 'text-rose-600 dark:text-red-400'
                                            : ''
                                        }`}
                                        title="Click để chọn mức giá này làm kịch bản Base DCF"
                                      >
                                        {val.toLocaleString('vi-VN')} đ
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Helper component hiển thị công thức và lưu ý cho từng phương pháp
function MethodFormulaBanner({
  method,
  inputs,
  historicalStats,
  peerMedians,
}: {
  method: ValuationMethod;
  inputs: {
    epsForward: number;
    ebitdaForward: number;
    netDebt: number;
    sharesOutstanding: number;
    bvpsForward: number;
    currentPrice: number;
    growthTier?: string;
  };
  historicalStats: {
    peMedian?: number;
    pbMedian?: number;
  };
  peerMedians?: {
    pe?: number;
    pb?: number;
    evEbitda?: number;
  };
}) {
  switch (method) {
    case 'P_E':
      return (
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50 space-y-1">
          <div className="text-slate-800 dark:text-slate-300 font-bold">Công thức: Giá mục tiêu = EPS Forward × P/E Mục Tiêu</div>
          <div className="text-slate-600 dark:text-slate-400">
            EPS Forward TTM: <span className="text-slate-900 dark:text-slate-200 font-mono font-bold">{inputs.epsForward.toLocaleString('vi-VN')} đ</span> | Hạng tăng trưởng Tab D: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{inputs.growthTier || 'B+'}</span>
          </div>
        </div>
      );

    case 'EV_EBITDA':
      return (
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50 space-y-1">
          <div className="text-slate-800 dark:text-slate-300 font-bold">Công thức: Giá/cp = (EBITDA Forward × Multiple - Nợ Ròng) / Số Cổ Phiếu</div>
          <div className="text-slate-600 dark:text-slate-400">
            EBITDA Forward: <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">{inputs.ebitdaForward.toLocaleString('vi-VN')} Tỷ</span> | Nợ ròng: <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">{inputs.netDebt.toLocaleString('vi-VN')} Tỷ</span> | Số CP: <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">{inputs.sharesOutstanding.toLocaleString('vi-VN')} Tr</span>
          </div>
        </div>
      );

    case 'P_B':
      return (
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50 space-y-1">
          <div className="text-slate-800 dark:text-slate-300 font-bold">Công thức: Giá mục tiêu = BVPS Dự Phóng × P/B Mục Tiêu</div>
          <div className="text-slate-600 dark:text-slate-400">
            BVPS Dự Phóng: <span className="text-slate-900 dark:text-slate-200 font-mono font-bold">{inputs.bvpsForward.toLocaleString('vi-VN')} đ</span> | P/B trung vị lịch sử: <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">{historicalStats.pbMedian ? `${historicalStats.pbMedian}x` : '—'}</span>
          </div>
        </div>
      );

    case 'DCF':
      return (
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50 space-y-1">
          <div className="text-slate-800 dark:text-slate-300 font-bold">Phương pháp Chiết Khấu Dòng Tiền Tự Do (DCF / FCFF)</div>
          <div className="text-slate-600 dark:text-slate-400">
            Không dùng bội số P/E. Định giá dựa trên cặp tham số chiết khấu WACC (11% - 13%) và tốc độ tăng trưởng vĩnh viễn g (3% - 5%). Bạn có thể click trực tiếp vào ô tương ứng trong ma trận độ nhạy bên dưới để chọn kịch bản Base.
          </div>
        </div>
      );

    case 'RNAV':
      return (
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50 space-y-1">
          <div className="text-slate-800 dark:text-slate-300 font-bold">Phương pháp Giá Trị Tài Sản Ròng Đã Điều Chỉnh (RNAV)</div>
          <div className="text-slate-600 dark:text-slate-400">
            Định giá quỹ đất và các dự án theo giá thị trường hiện tại trừ đi chi phí đầu tư và nghĩa vụ nợ.
          </div>
        </div>
      );

    case 'SOTP':
      return (
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50 space-y-1">
          <div className="text-slate-800 dark:text-slate-300 font-bold">Phương pháp Định Giá Từng Phần (Sum-of-the-Parts)</div>
          <div className="text-slate-600 dark:text-slate-400">
            Áp dụng bội số định giá riêng biệt cho từng mảng kinh doanh và tổng hợp lại trừ chiết khấu tập đoàn (10-15%).
          </div>
        </div>
      );

    default:
      return null;
  }
}
