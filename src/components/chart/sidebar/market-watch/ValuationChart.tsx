'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type ValType = 'pe' | 'pb';

interface ValPoint {
  date?: string;
  time?: string;
  t?: string | number;
  value?: number;
  pe?: number;
  pb?: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

const fetchValuation = async (type: ValType): Promise<ChartPoint[]> => {
  try {
    const res = await fetch(`/api/market-watch/valuation?type=${type}&comGroupCode=VNINDEX&timeFrame=ALL`);
    if (!res.ok) return [];
    const json = await res.json();
    const raw: ValPoint[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.data?.values)
      ? json.data.values
      : [];
    return raw
      .map((d) => ({
        date: String(d.date ?? d.time ?? d.t ?? ''),
        value: Number(d.value ?? d.pe ?? d.pb ?? 0),
      }))
      .filter((p) => p.value > 0);
  } catch {
    return [];
  }
};

const formatDateLabel = (dStr: string) => {
  if (!dStr) return '';
  const clean = dStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[0]}`;
  }
  return clean;
};

export const ValuationChart: React.FC = () => {
  const [valType, setValType] = useState<ValType>('pe');
  const [peData, setPeData] = useState<ChartPoint[]>([]);
  const [pbData, setPbData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [pe, pb] = await Promise.all([fetchValuation('pe'), fetchValuation('pb')]);
        if (pe.length === 0 && pb.length === 0) { setError(true); return; }
        setPeData(pe.slice(-250));
        setPbData(pb.slice(-250));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeData = valType === 'pe' ? peData : pbData;

  const stats = useMemo(() => {
    if (activeData.length === 0) return null;
    const values = activeData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const decimals = valType === 'pb' ? 2 : 1;
    const currentVal = values[values.length - 1];
    const meanVal = parseFloat(mean.toFixed(decimals));
    const plus2SD = parseFloat((mean + 2 * stdDev).toFixed(decimals));
    const plus1SD = parseFloat((mean + stdDev).toFixed(decimals));
    const minus1SD = parseFloat((mean - stdDev).toFixed(decimals));
    const minus2SD = parseFloat((mean - 2 * stdDev).toFixed(decimals));

    const rawMin = Math.min(minVal, minus2SD);
    const rawMax = Math.max(maxVal, plus2SD);
    const valRange = rawMax - rawMin || 1;
    const padding = valRange * 0.08;

    const yMin = Math.max(0, parseFloat((rawMin - padding).toFixed(decimals)));
    const yMax = parseFloat((rawMax + padding).toFixed(decimals));

    return {
      decimals,
      currentVal,
      meanVal,
      plus2SD,
      plus1SD,
      minus1SD,
      minus2SD,
      yMin,
      yMax,
    };
  }, [activeData, valType]);

  return (
    <div className="w-full font-sans select-none">
      {/* Header with PE / PB Selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
            {valType === 'pe' ? 'P/E - TTM' : 'P/B'}
          </span>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-md">
            {(['pe', 'pb'] as ValType[]).map((t) => (
              <button
                key={t}
                onClick={() => setValType(t)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer uppercase ${
                  valType === t
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {stats !== null && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
              {stats.currentVal.toFixed(stats.decimals)}x
            </span>
          </div>
        )}
      </div>

      {/* Legend Header */}
      {stats !== null && (
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 dark:text-gray-300 mb-1 px-1 flex-wrap gap-y-1">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span>
            <span>{valType.toUpperCase()} - TTM</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 border-b border-dashed border-blue-500 inline-block"></span>
            <span>+2 SD</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-700 inline-block"></span>
            <span>+1 SD</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-slate-900 dark:bg-slate-200 inline-block"></span>
            <span>Mean</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-rose-600 inline-block"></span>
            <span>-1 SD</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 border-b border-dashed border-rose-500 inline-block"></span>
            <span>-2 SD</span>
          </div>
        </div>
      )}

      {loading && <div className="h-[140px] flex items-center justify-center text-xs text-slate-900 dark:text-white">Đang tải biểu đồ định giá...</div>}
      {error && !loading && <div className="h-[140px] flex items-center justify-center text-xs text-slate-900 dark:text-white">Không có dữ liệu định giá</div>}
      {!loading && !error && activeData.length > 0 && stats !== null && (
        <div className="relative w-full bg-white dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-gray-800 shadow-xs">
          <ResponsiveContainer width="100%" height={135}>
            <LineChart data={activeData} margin={{ top: 8, right: 0, left: 0, bottom: 4 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                interval="preserveStartEnd"
                minTickGap={35}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis
                orientation="right"
                domain={[stats.yMin, stats.yMax]}
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                width={32}
                ticks={[stats.minus2SD, stats.minus1SD, stats.meanVal, stats.plus1SD, stats.plus2SD]}
                tickFormatter={(val) => `${val.toFixed(stats.decimals)}`}
              />

              {/* +2 SD Line (Blue Dashed) */}
              <ReferenceLine y={stats.plus2SD} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} />

              {/* +1 SD Line (Blue Solid) */}
              <ReferenceLine y={stats.plus1SD} stroke="#1d4ed8" strokeWidth={1.2} />

              {/* Mean Line (Black/White Solid) */}
              <ReferenceLine y={stats.meanVal} stroke="#334155" strokeWidth={1.2} />

              {/* -1 SD Line (Rose/Red Solid) */}
              <ReferenceLine y={stats.minus1SD} stroke="#ef4444" strokeWidth={1.2} />

              {/* -2 SD Line (Red Dashed) */}
              <ReferenceLine y={stats.minus2SD} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={1} />

              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.92)',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#ffffff',
                }}
                formatter={(val: number) => [`${val.toFixed(stats.decimals)}x`, `VNINDEX ${valType.toUpperCase()}`]}
                labelFormatter={(label) => formatDateLabel(String(label))}
              />

              {/* Main P/E or P/B Line (Green) */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3.5, fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
