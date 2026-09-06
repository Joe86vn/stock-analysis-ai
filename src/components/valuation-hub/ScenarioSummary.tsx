import React, { useMemo } from 'react';
import { ValuationScenario, ValuationMethodConfig } from '@/types/analysis';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { ShieldAlert, TrendingUp, RotateCcw, Activity } from 'lucide-react';

export interface PriceHistoryPoint {
  date: string;
  fullDate?: string;
  openPrice: number;
  highestPrice: number;
  lowestPrice: number;
  closePrice: number;
  volume?: number;
  range?: [number, number];
}

interface ScenarioSummaryProps {
  bear: ValuationScenario;
  base: ValuationScenario;
  bull: ValuationScenario;
  currentPrice: number;
  rrRatio: number;
  dispersion: number;
  expectedValue: number;
  onUpdateProbability: (probs: { bear: number; base: number; bull: number }) => void;
  onUpdateNarrative: (scenario: 'bear' | 'base' | 'bull', narrative: string) => void;
  onResetNarrative?: (scenario: 'bear' | 'base' | 'bull') => void;
  priceHistory?: PriceHistoryPoint[];
  isLoadingPriceHistory?: boolean;
  methods?: ValuationMethodConfig[];
  inputs?: {
    epsForward?: number;
    growthTier?: string;
  };
  ticker?: string;
}

// Custom Shape vẽ Nến Nhật (Candlestick: Wick + Body)
interface CandlestickShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: PriceHistoryPoint;
}

const CandlestickBar: React.FC<CandlestickShapeProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;

  const { openPrice, closePrice, highestPrice, lowestPrice } = payload;
  const isBullish = closePrice >= openPrice;
  const candleColor = isBullish ? '#10b981' : '#ef4444'; // Xanh lá tăng, Đỏ giảm

  // Tỷ lệ pixel / VND dựa trên chiều cao Bar của Recharts (khoảng range từ Low đến High)
  const priceRange = highestPrice - lowestPrice;
  const scale = priceRange > 0 ? height / priceRange : 0;

  // Tính tọa độ Y của open và close
  const yOpen = y + (highestPrice - openPrice) * scale;
  const yClose = y + (highestPrice - closePrice) * scale;

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
  const centerX = x + width / 2;

  // Độ rộng thân nến: tối thiểu 1.5px, tối đa 5px để 250 nến hiển thị rõ ràng, không bị dính chùm
  const candleWidth = Math.max(1.5, Math.min(width * 0.85, 5));
  const bodyLeft = centerX - candleWidth / 2;

  return (
    <g className="candlestick-item">
      {/* Râu nến trên và dưới (Wick line từ HighestPrice tới LowestPrice) */}
      <line
        x1={centerX}
        y1={y}
        x2={centerX}
        y2={y + height}
        stroke={candleColor}
        strokeWidth={1}
        opacity={0.85}
      />
      {/* Thân nến (Candle Body) */}
      <rect
        x={bodyLeft}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={candleColor}
        stroke={candleColor}
        strokeWidth={0.5}
        rx={0.5}
      />
    </g>
  );
};

export const ScenarioSummary: React.FC<ScenarioSummaryProps> = ({
  bear,
  base,
  bull,
  currentPrice,
  rrRatio,
  dispersion,
  expectedValue,
  onUpdateProbability,
  onUpdateNarrative,
  onResetNarrative,
  priceHistory = [],
  isLoadingPriceHistory = false,
  methods = [],
  inputs = {},
  ticker = '',
}) => {
  const isRedFlagRR = rrRatio < 1.5;
  const epsForward = inputs.epsForward || 2500;

  // Lấy target P/E cho từng kịch bản
  const peMethod = methods.find((m) => m.method === 'P_E');
  const peBear = peMethod?.targetBear;
  const peBase = peMethod?.targetBase;
  const peBull = peMethod?.targetBull;

  // Chuẩn bị dữ liệu nến 12 tháng
  const chartData = useMemo(() => {
    if (priceHistory && priceHistory.length > 0) {
      return priceHistory.map((item) => ({
        ...item,
        range: [item.lowestPrice, item.highestPrice] as [number, number],
      }));
    }

    // Fallback nếu chưa tải xong dữ liệu API
    const pts: PriceHistoryPoint[] = [];
    const baseP = currentPrice > 0 ? currentPrice : 50000;
    for (let i = 50; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 5);
      const day = String(d.getDate()).padStart(2, '0');
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const noise = Math.sin(i * 0.4) * 0.08 + (Math.random() - 0.5) * 0.03;
      const close = Math.round(baseP * (1 + noise));
      const open = Math.round(close * (1 + (Math.random() - 0.5) * 0.015));
      const high = Math.max(open, close) + Math.round(baseP * 0.01);
      const low = Math.min(open, close) - Math.round(baseP * 0.01);
      pts.push({
        date: `${day}/${m}`,
        fullDate: d.toISOString().slice(0, 10),
        openPrice: open,
        highestPrice: high,
        lowestPrice: low,
        closePrice: close,
        range: [low, high],
      });
    }
    return pts;
  }, [priceHistory, currentPrice]);

  // Tính miền Y-axis để bao quát toàn bộ giá lịch sử + 4 mốc target
  const yDomain = useMemo(() => {
    const allPrices = [
      ...chartData.flatMap((d) => [d.lowestPrice, d.highestPrice]),
      bear.fairValue,
      base.fairValue,
      bull.fairValue,
      currentPrice,
    ].filter((p) => typeof p === 'number' && p > 0);

    if (allPrices.length === 0) return [0, 100000];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const paddingBottom = (max - min) * 0.08;
    const paddingTop = (max - min) * 0.12;

    const lower = Math.max(0, Math.floor((min - paddingBottom) / 1000) * 1000);
    const upper = Math.ceil((max + paddingTop) / 1000) * 1000;
    return [lower, upper];
  }, [chartData, bear.fairValue, base.fairValue, bull.fairValue, currentPrice]);

  // Bước nhảy X-axis nhãn ngày cho ~250 phiên giao dịch (khoảng 1 nhãn mỗi tháng)
  const xAxisInterval = useMemo(() => {
    if (chartData.length <= 30) return 3;
    if (chartData.length <= 80) return 8;
    if (chartData.length <= 150) return 14;
    return Math.floor(chartData.length / 12);
  }, [chartData.length]);

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-5 shadow-xs dark:shadow-none transition-colors">
      {/* 1. Header Title & Current Market Price */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-heading">
            Tổng Hợp 3 Kịch Bản &amp; Thước Đo Rủi Ro / Lợi Nhuận
          </span>
          {ticker && (
            <span className="text-[11px] px-1.5 py-0.5 font-mono font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {ticker}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Thị giá hiện tại:</span>
          <span className="text-slate-900 dark:text-slate-100 font-mono font-bold text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {currentPrice.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* 2. 3 Scenarios Cards (Executive Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* KỊCH BẢN THẬN TRỌNG (BEAR) */}
        <div className="bg-rose-50/40 dark:bg-slate-950/70 border border-rose-200 dark:border-red-900/40 rounded-xl p-3.5 space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Kịch Bản Thận Trọng
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Xác suất:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={bear.probability}
                onChange={(e) =>
                  onUpdateProbability({
                    bear: Number(e.target.value) || 0,
                    base: base.probability,
                    bull: bull.probability,
                  })
                }
                className="w-11 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center font-mono font-semibold border border-rose-200 dark:border-slate-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-rose-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-red-400 font-mono">
              {bear.fairValue.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs font-semibold text-rose-600 dark:text-red-400/90 font-mono mt-0.5">
              Mức giảm: {bear.updownPct}%
            </div>
          </div>

          {/* Giả định cốt lõi */}
          <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-2 border border-rose-100 dark:border-slate-800/80 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>EPS Dự phóng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                ~{Math.round(epsForward * 0.85).toLocaleString('vi-VN')} đ (-15%)
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Hệ số P/E áp dụng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {peBear ? `${peBear}x (-1σ)` : 'Thận trọng'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Biên độ rủi ro:</span>
              <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                {Math.abs(bear.updownPct)}% chiết khấu
              </span>
            </div>
          </div>

          {/* Lý luận phân tích */}
          <div className="pt-2 border-t border-rose-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Lý luận &amp; Giả định:
              </span>
              {onResetNarrative && (
                <button
                  type="button"
                  onClick={() => onResetNarrative('bear')}
                  className="text-[10px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-0.5 transition-colors"
                  title="Khôi phục câu lý luận chuẩn từ hệ thống"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Mặc định
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={bear.narrative || ''}
              onChange={(e) => onUpdateNarrative('bear', e.target.value)}
              className="w-full bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-rose-200 dark:border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-rose-400 dark:focus:border-red-500 leading-relaxed resize-none shadow-2xs"
              placeholder="Nhập lý luận, rủi ro và các kịch bản áp lực suy giảm..."
            />
          </div>
        </div>

        {/* KỊCH BẢN CƠ SỞ (BASE - MÀU GOLD NỔI BẬT) */}
        <div className="bg-amber-50/40 dark:bg-slate-950/70 border border-amber-300 dark:border-amber-500/50 rounded-xl p-3.5 space-y-3 ring-1 ring-amber-400/40 dark:ring-amber-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Kịch Bản Cơ Sở (Target Gold)
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Xác suất:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={base.probability}
                onChange={(e) =>
                  onUpdateProbability({
                    bear: bear.probability,
                    base: Number(e.target.value) || 0,
                    bull: bull.probability,
                  })
                }
                className="w-11 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center font-mono font-semibold border border-amber-300 dark:border-slate-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {base.fairValue.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400/90 font-mono mt-0.5">
              Dư địa: {base.updownPct > 0 ? `+${base.updownPct}` : base.updownPct}%
            </div>
          </div>

          {/* Giả định cốt lõi */}
          <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-2 border border-amber-100 dark:border-slate-800/80 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>EPS Dự phóng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {Math.round(epsForward).toLocaleString('vi-VN')} đ (chuẩn 4Q)
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Hệ số P/E áp dụng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {peBase ? `${peBase}x (Trung vị)` : 'Cơ sở'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Giá mục tiêu Gold:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {base.fairValue.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Lý luận phân tích */}
          <div className="pt-2 border-t border-amber-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Lý luận &amp; Giả định:
              </span>
              {onResetNarrative && (
                <button
                  type="button"
                  onClick={() => onResetNarrative('base')}
                  className="text-[10px] text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-0.5 transition-colors"
                  title="Khôi phục câu lý luận chuẩn từ hệ thống"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Mặc định
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={base.narrative || ''}
              onChange={(e) => onUpdateNarrative('base', e.target.value)}
              className="w-full bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-amber-200 dark:border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 leading-relaxed resize-none shadow-2xs"
              placeholder="Nhập cơ sở định giá, kỳ vọng tăng trưởng tự nhiên..."
            />
          </div>
        </div>

        {/* KỊCH BẢN TÍCH CỰC (BULL) */}
        <div className="bg-emerald-50/40 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3.5 space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Kịch Bản Tích Cực (Catalyst)
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Xác suất:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={bull.probability}
                onChange={(e) =>
                  onUpdateProbability({
                    bear: bear.probability,
                    base: base.probability,
                    bull: Number(e.target.value) || 0,
                  })
                }
                className="w-11 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center font-mono font-semibold border border-emerald-200 dark:border-slate-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {bull.fairValue.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400/90 font-mono mt-0.5">
              Dư địa: {bull.updownPct > 0 ? `+${bull.updownPct}` : bull.updownPct}%
            </div>
          </div>

          {/* Giả định cốt lõi */}
          <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-2 border border-emerald-100 dark:border-slate-800/80 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>EPS Dự phóng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                ~{Math.round(epsForward * 1.15).toLocaleString('vi-VN')} đ (+15%)
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Hệ số P/E áp dụng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {peBull ? `${peBull}x (+1σ Re-rating)` : 'Tích cực'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Dư địa tối đa:</span>
              <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
                +{bull.updownPct}% tiềm năng
              </span>
            </div>
          </div>

          {/* Lý luận phân tích */}
          <div className="pt-2 border-t border-emerald-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Lý luận &amp; Giả định:
              </span>
              {onResetNarrative && (
                <button
                  type="button"
                  onClick={() => onResetNarrative('bull')}
                  className="text-[10px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-0.5 transition-colors"
                  title="Khôi phục câu lý luận chuẩn từ hệ thống"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Mặc định
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={bull.narrative || ''}
              onChange={(e) => onUpdateNarrative('bull', e.target.value)}
              className="w-full bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-400 dark:focus:border-emerald-500 leading-relaxed resize-none shadow-2xs"
              placeholder="Nhập các động lực bứt phá công suất, thị trường và tái định giá..."
            />
          </div>
        </div>
      </div>

      {/* 3. 3 Metric Pills: R/R, Dispersion, Expected Value */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* R/R Ratio */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
            isRedFlagRR
              ? 'bg-rose-50/70 dark:bg-red-950/30 border-rose-200 dark:border-red-900/50 text-rose-900 dark:text-red-300'
              : rrRatio >= 3.0
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300'
              : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-85">Tỷ lệ Lợi Nhuận / Rủi Ro (R/R Ratio)</div>
          <div className="text-2xl font-black font-mono mt-1">
            {rrRatio >= 99 ? '∞ (Không rủi ro giảm)' : `${rrRatio}x`}
          </div>
          <div className="text-[10px] mt-1 font-medium">
            {rrRatio >= 3.0
              ? '✅ Cơ hội bất đối xứng xuất sắc (≥ 3.0x)'
              : rrRatio >= 2.0
              ? '✅ Tốt, biên an toàn cao (≥ 2.0x)'
              : rrRatio >= 1.5
              ? '🟡 Đạt ngưỡng tối thiểu chấp nhận được (1.5x)'
              : '🚩 CỜ ĐỎ: Rủi ro giảm giá lớn hơn lợi nhuận kỳ vọng (< 1.5x)'}
          </div>
        </div>

        {/* Dispersion */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between text-slate-800 dark:text-slate-300 transition-colors">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Độ Phân Tán Giữa Các Phương Pháp
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
            {dispersion}%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {dispersion <= 10
              ? '✅ Độ đồng thuận cao (≤ 10%)'
              : dispersion <= 20
              ? '🟡 Phân tán vừa phải (10% - 20%)'
              : '⚠️ Phân tán cao (> 20%) — nên kiểm tra lại các giả định chéo'}
          </div>
        </div>

        {/* Expected Value */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between text-slate-800 dark:text-slate-300 transition-colors">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Lợi Suất Kỳ Vọng Gia Quyền (Expected Return)
          </div>
          <div
            className={`text-2xl font-black font-mono mt-1 ${
              expectedValue > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {expectedValue > 0 ? `+${expectedValue}%` : `${expectedValue}%`}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Σ (Xác suất × Dư địa theo kịch bản)
          </div>
        </div>
      </div>

      {/* Red Flag Warning Banner */}
      {isRedFlagRR && (
        <div className="bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-900/60 rounded-xl p-3.5 flex items-start gap-3 text-rose-800 dark:text-red-300 text-xs transition-colors">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-rose-900 dark:text-red-200">
              Cảnh Báo Cờ Đỏ ValueX: Tỷ lệ Lợi Nhuận / Rủi Ro ({rrRatio}x) không đạt chuẩn tối thiểu 1.5x
            </div>
            <div className="text-rose-700 dark:text-red-300/90 leading-relaxed">
              Giá thị trường hiện tại đang giao dịch quá sát hoặc cao hơn kịch bản cơ sở, trong khi mức chiết khấu tiềm năng ở kịch bản thận trọng rất lớn. Nhà đầu tư nên kiên nhẫn chờ đợi vùng giá chiết khấu sâu hơn hoặc điều chỉnh giảm tỷ trọng danh mục.
            </div>
          </div>
        </div>
      )}

      {/* 4. 12-Month Candlestick Price Chart with 4 Dashed Reference Lines */}
      <div className="pt-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Biểu Đồ Nến Giá Cổ Phiếu 12 Tháng &amp; Các Mốc Mục Tiêu Định Giá (VNĐ)
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
              Giá Đã Điều Chỉnh (Adjusted)
            </span>
          </div>

          {/* Legend Guide */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-0.5">
                <span className="w-2 h-2.5 bg-emerald-500 rounded-2xs inline-block"></span>
                <span className="w-2 h-2.5 bg-rose-500 rounded-2xs inline-block"></span>
              </span>
              Nến Nhật (OHLC Đã Điều Chỉnh)
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-3 border-t-2 border-dashed border-emerald-500 inline-block"></span> Bull (+{bull.updownPct}%)
            </span>
            {/* BASE IN GOLD */}
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
              <span className="w-3.5 border-t-2 border-dashed border-amber-500 inline-block"></span> Base Gold ({base.updownPct > 0 ? `+${base.updownPct}` : base.updownPct}%)
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-3 border-t border-dashed border-slate-500 inline-block"></span> Hiện tại
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-red-400 font-medium">
              <span className="w-3 border-t-2 border-dashed border-rose-500 inline-block"></span> Bear ({bear.updownPct}%)
            </span>
          </div>
        </div>

        <div className="h-72 sm:h-80 w-full bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 35, left: 10, bottom: 5 }}
              barCategoryGap={1}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                domain={yDomain}
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as PriceHistoryPoint;
                    const diffBase = data.closePrice > 0 ? Math.round(((base.fairValue - data.closePrice) / data.closePrice) * 100) : 0;
                    const isUp = data.closePrice >= data.openPrice;
                    const priceChange = data.closePrice - data.openPrice;
                    const pctChange = data.openPrice > 0 ? ((priceChange / data.openPrice) * 100).toFixed(2) : '0';

                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {data.fullDate || data.date}
                          </span>
                          <span className={`font-mono font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isUp ? `+${pctChange}%` : `${pctChange}%`}
                          </span>
                        </div>

                        {/* OHLC Data Grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono">
                          <div className="text-slate-500 dark:text-slate-400">
                            Mở: <span className="text-slate-800 dark:text-slate-200 font-semibold">{data.openPrice.toLocaleString('vi-VN')}</span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            Cao: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{data.highestPrice.toLocaleString('vi-VN')}</span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            Đóng: <span className="text-slate-900 dark:text-slate-100 font-bold">{data.closePrice.toLocaleString('vi-VN')}</span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            Thấp: <span className="text-rose-600 dark:text-rose-400 font-semibold">{data.lowestPrice.toLocaleString('vi-VN')}</span>
                          </div>
                        </div>

                        {data.volume && data.volume > 0 && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            KL khớp: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{data.volume.toLocaleString('vi-VN')} cp</span>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                          <span>Cách Target Base (Gold):</span>
                          <span className={diffBase >= 0 ? 'text-amber-600 dark:text-amber-400 font-bold font-mono' : 'text-rose-600 font-bold font-mono'}>
                            {diffBase >= 0 ? `+${diffBase}%` : `${diffBase}%`}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* 4 Dashed Reference Target Lines */}
              {/* Bull Reference */}
              <ReferenceLine
                y={bull.fairValue}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Bull: ${(bull.fairValue / 1000).toFixed(1)}k (+${bull.updownPct}%)`,
                  position: 'insideTopRight',
                  fill: '#10b981',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Base Reference - ĐỔI SANG MÀU GOLD */}
              <ReferenceLine
                y={base.fairValue}
                stroke="#eab308"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Base Gold: ${(base.fairValue / 1000).toFixed(1)}k (${base.updownPct > 0 ? `+${base.updownPct}` : base.updownPct}%)`,
                  position: 'insideTopRight',
                  fill: '#d97706',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />

              {/* Current Price Reference */}
              <ReferenceLine
                y={currentPrice}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth={1.2}
                label={{
                  value: `Hiện tại: ${(currentPrice / 1000).toFixed(1)}k`,
                  position: 'insideBottomLeft',
                  fill: '#64748b',
                  fontSize: 10,
                  fontWeight: 500,
                }}
              />

              {/* Bear Reference */}
              <ReferenceLine
                y={bear.fairValue}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Bear: ${(bear.fairValue / 1000).toFixed(1)}k (${bear.updownPct}%)`,
                  position: 'insideBottomRight',
                  fill: '#ef4444',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Bar Candlestick với Custom Shape */}
              <Bar
                dataKey="range"
                shape={<CandlestickBar />}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
