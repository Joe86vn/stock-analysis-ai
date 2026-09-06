import React, { useState, useMemo } from 'react';
import { ValuationQuarterPoint } from '@/types/analysis';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface MetricStatGroup {
  mean?: number;
  median?: number;
  std?: number;
  minus1Sigma?: number;
  plus1Sigma?: number;
}

interface HistoricalValuationChartProps {
  ticker: string;
  quarterlySeries: ValuationQuarterPoint[];
  peStats: MetricStatGroup;
  pbStats: MetricStatGroup;
  isLoading?: boolean;
}

export const HistoricalValuationChart: React.FC<HistoricalValuationChartProps> = ({
  ticker,
  quarterlySeries = [],
  peStats,
  pbStats,
  isLoading = false,
}) => {
  const [metric, setMetric] = useState<'PE' | 'PB'>('PE');

  const activeStats = metric === 'PE' ? peStats : pbStats;
  const isPE = metric === 'PE';

  const chartData = useMemo(() => {
    return (quarterlySeries || [])
      .map((item) => {
        const val = isPE ? item.pe : item.pb;
        return {
          period: item.period,
          fullPeriod: item.fullPeriod,
          value: typeof val === 'number' && val > 0 ? Number(val.toFixed(isPE ? 1 : 2)) : null,
          roe: item.roe,
        };
      })
      .filter((d) => d.value !== null);
  }, [quarterlySeries, isPE]);

  const latestPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const currentVal = latestPoint?.value ?? null;
  const medianVal = activeStats.median ?? null;
  const minus1Val = activeStats.minus1Sigma ?? null;
  const plus1Val = activeStats.plus1Sigma ?? null;

  // Tính độ lệch so với trung vị lịch sử
  const deviationFromMedian = useMemo(() => {
    if (currentVal === null || medianVal === null || medianVal === 0) return null;
    const diff = currentVal - medianVal;
    const pct = (diff / medianVal) * 100;
    return { diff, pct };
  }, [currentVal, medianVal]);

  // Xác định Vị thế Chu kỳ Định giá (Valuation Zone)
  const zoneInfo = useMemo(() => {
    if (currentVal === null || medianVal === null) {
      return {
        label: 'Đang cập nhật',
        bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        barPosPct: 50,
      };
    }

    const m1 = minus1Val ?? medianVal * 0.8;
    const p1 = plus1Val ?? medianVal * 1.2;

    const spanMin = Math.max(0.1, m1 - (medianVal - m1) * 0.6);
    const spanMax = p1 + (p1 - medianVal) * 0.6;
    const clampedVal = Math.min(Math.max(currentVal, spanMin), spanMax);
    const barPosPct = Math.round(((clampedVal - spanMin) / (spanMax - spanMin || 1)) * 100);

    if (currentVal < m1) {
      return {
        label: 'Vùng Định Giá Hấp Dẫn (< -1σ)',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        barPosPct,
      };
    }
    if (currentVal > p1) {
      return {
        label: 'Vùng Định Giá Cao (> +1σ)',
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        barPosPct,
      };
    }
    return {
      label: 'Vùng Định Giá Hợp Lý (Quanh μ)',
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      barPosPct,
    };
  }, [currentVal, medianVal, minus1Val, plus1Val]);

  // Y-Domain cho Recharts
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 20];
    const vals = chartData.map((d) => d.value as number);
    if (medianVal) vals.push(medianVal);
    if (minus1Val) vals.push(minus1Val);
    if (plus1Val) vals.push(plus1Val);

    const min = Math.max(0, Math.floor(Math.min(...vals) * 0.85));
    const max = Math.ceil(Math.max(...vals) * 1.15);
    return [min, max];
  }, [chartData, medianVal, minus1Val, plus1Val]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xs dark:shadow-none transition-colors">
      {/* 1. Header & Metric Switcher */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-heading">
              Định Giá Lịch Sử
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              ({chartData.length} quý)
            </span>
          </div>
        </div>

        {/* Tab switch P/E vs P/B */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setMetric('PE')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              isPE
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            P/E Lịch Sử
          </button>
          <button
            type="button"
            onClick={() => setMetric('PB')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              !isPE
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            P/B Lịch Sử
          </button>
        </div>
      </div>

      {/* 2. Key Multiples Ribbon */}
      <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
        {/* Hiện tại */}
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Hiện tại ({latestPoint?.period || 'Gần nhất'})
          </span>
          <div className="flex items-baseline justify-center gap-1 mt-0.5">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
              {currentVal !== null ? `${currentVal}x` : '—'}
            </span>
            {deviationFromMedian && (
              <span
                className={`text-[10px] font-medium flex items-center ${
                  deviationFromMedian.pct > 5
                    ? 'text-rose-600 dark:text-rose-400'
                    : deviationFromMedian.pct < -5
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {deviationFromMedian.pct > 0 ? '+' : ''}
                {deviationFromMedian.pct.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Trung vị Median */}
        <div className="border-x border-slate-200 dark:border-slate-800/60">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider block font-semibold">
            Trung vị 5 năm (μ)
          </span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
            {medianVal !== null ? `${medianVal}x` : '—'}
          </span>
        </div>

        {/* Vùng dao động ±1σ */}
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Biên Thường Gặp (±1σ)
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5 block">
            {minus1Val !== null && plus1Val !== null
              ? `${minus1Val}x – ${plus1Val}x`
              : '—'}
          </span>
        </div>
      </div>

      {/* 3. Valuation Zone Badge & Visual Spectrum Track */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Vị thế định giá hiện tại:</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${zoneInfo.bg}`}>
            {zoneInfo.label}
          </span>
        </div>

        {/* Custom Track: Low (< -1σ) | Fair (-1σ đến +1σ) | High (> +1σ) */}
        <div className="relative pt-1 pb-2">
          <div className="h-2 w-full rounded-full flex overflow-hidden bg-slate-200 dark:bg-slate-800">
            <div
              className="bg-emerald-500/80 dark:bg-emerald-600/80 h-full"
              style={{ width: '25%' }}
              title="Vùng Thấp (< -1σ)"
            />
            <div
              className="bg-amber-400/80 dark:bg-amber-500/80 h-full"
              style={{ width: '50%' }}
              title="Vùng Hợp Lý (μ ± 1σ)"
            />
            <div
              className="bg-rose-500/80 dark:bg-rose-600/80 h-full"
              style={{ width: '25%' }}
              title="Vùng Cao (> +1σ)"
            />
          </div>

          {/* Indicator Pin */}
          {currentVal !== null && (
            <div
              className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
              style={{ left: `${Math.max(5, Math.min(95, zoneInfo.barPosPct))}%` }}
            >
              <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white rounded-full border-2 border-white dark:border-slate-900 shadow-xs" />
              <div className="w-0.5 h-1 bg-slate-900 dark:bg-white" />
            </div>
          )}

          <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>{minus1Val ? `-1σ (${minus1Val}x)` : 'Thấp'}</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {medianVal ? `μ (${medianVal}x)` : 'Trung vị'}
            </span>
            <span>{plus1Val ? `+1σ (${plus1Val}x)` : 'Cao'}</span>
          </div>
        </div>
      </div>

      {/* 4. Interactive Area Chart */}
      {chartData.length > 0 ? (
        <div className="h-[210px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="valAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPE ? '#0284c7' : '#0d9488'} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={isPE ? '#0284c7' : '#0d9488'} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />

              <XAxis
                dataKey="period"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                domain={yDomain}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}x`}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const val = d.value;
                    const pctMed = medianVal ? ((val - medianVal) / medianVal) * 100 : 0;

                    return (
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-lg text-xs space-y-1 z-50">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800">
                          {d.fullPeriod || d.period}
                        </div>
                        <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                          <span>{metric} Lịch sử:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {val}x
                          </span>
                        </div>
                        {medianVal && (
                          <div className="flex justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>So với Trung vị (μ):</span>
                            <span
                              className={`font-mono font-medium ${
                                pctMed > 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {pctMed > 0 ? '+' : ''}
                              {pctMed.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {typeof d.roe === 'number' && (
                          <div className="flex justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>ROE quý:</span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                              {d.roe}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Đường Trung Vị Median (Gold) */}
              {medianVal !== null && (
                <ReferenceLine
                  y={medianVal}
                  stroke="#eab308"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `μ: ${medianVal}x`,
                    position: 'insideTopRight',
                    fill: '#ca8a04',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Đường +1σ (Upper Band) */}
              {plus1Val !== null && (
                <ReferenceLine
                  y={plus1Val}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  strokeOpacity={0.7}
                  label={{
                    value: `+1σ: ${plus1Val}x`,
                    position: 'insideTopLeft',
                    fill: '#ef4444',
                    fontSize: 9,
                  }}
                />
              )}

              {/* Đường -1σ (Lower Band) */}
              {minus1Val !== null && (
                <ReferenceLine
                  y={minus1Val}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  strokeOpacity={0.7}
                  label={{
                    value: `-1σ: ${minus1Val}x`,
                    position: 'insideBottomLeft',
                    fill: '#10b981',
                    fontSize: 9,
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="value"
                stroke={isPE ? '#0284c7' : '#0d9488'}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#valAreaGradient)"
                activeDot={{ r: 4, fill: isPE ? '#0284c7' : '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-500 dark:text-slate-400 text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-slate-400 mb-1" />
          <span>Chưa có đủ dữ liệu chuỗi thời gian định giá quý từ Vietcap IQ</span>
        </div>
      )}

      {/* 5. Ghi chú phương pháp */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>Nguồn: Vietcap IQ (Thống kê theo quý)</span>
        <span className="font-mono">μ: Trung vị • σ: Độ lệch chuẩn</span>
      </div>
    </div>
  );
};
