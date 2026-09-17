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

const median = (arr: number[]) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const formatDateLabel = (dStr: string) => {
  if (!dStr) return '';
  const clean = dStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
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
        setPeData(pe.slice(-120));
        setPbData(pb.slice(-120));
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

    const currentVal = values[values.length - 1];
    const medianVal = median(values);
    const meanVal = parseFloat(mean.toFixed(2));
    const plus1SD = parseFloat((mean + stdDev).toFixed(2));
    const minus1SD = parseFloat((mean - stdDev).toFixed(2));

    const range = maxVal - minVal || 1;
    // Dynamic Y-Domain to make the chart curve visually clear and steep enough
    const yMin = Math.max(0, parseFloat((Math.min(minVal, minus1SD) - range * 0.12).toFixed(2)));
    const yMax = parseFloat((Math.max(maxVal, plus1SD) + range * 0.12).toFixed(2));

    return {
      currentVal,
      medianVal,
      meanVal,
      plus1SD,
      minus1SD,
      minVal,
      maxVal,
      yMin,
      yMax,
    };
  }, [activeData]);

  const startDateStr = activeData.length > 0 ? formatDateLabel(activeData[0].date) : '';
  const midDateStr = activeData.length > 0 ? formatDateLabel(activeData[Math.floor(activeData.length / 2)].date) : '';
  const endDateStr = activeData.length > 0 ? formatDateLabel(activeData[activeData.length - 1].date) : '';

  const isAboveMedian = stats !== null && stats.currentVal > stats.medianVal;

  return (
    <div className="w-full font-sans select-none">
      {/* Toggle PE / PB & Stats Summary */}
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <div className="flex gap-1">
          {(['pe', 'pb'] as ValType[]).map((t) => (
            <button
              key={t}
              onClick={() => setValType(t)}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded transition cursor-pointer uppercase ${
                valType === t
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {stats !== null && (
          <div className="flex items-center gap-2 text-[9.5px] font-mono">
            <span className={`font-extrabold ${isAboveMedian ? 'text-red-500' : 'text-emerald-500'}`}>
              {stats.currentVal.toFixed(1)}x
            </span>
            <span className="text-gray-400 dark:text-gray-500" title="Trung bình (Mean)">
              TB: {stats.meanVal}x
            </span>
            <span className="text-red-500/90 hidden sm:inline" title="Độ lệch chuẩn +1SD (Vùng đắt)">
              +1SD: {stats.plus1SD}x
            </span>
            <span className="text-emerald-500/90 hidden sm:inline" title="Độ lệch chuẩn -1SD (Vùng rẻ)">
              -1SD: {stats.minus1SD}x
            </span>
          </div>
        )}
      </div>

      {loading && <div className="h-[120px] flex items-center justify-center text-xs text-gray-400">Đang tải...</div>}
      {error && !loading && <div className="h-[120px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>}
      {!loading && !error && activeData.length > 0 && stats !== null && (
        <div className="relative w-full bg-gray-50/50 dark:bg-black/20 rounded-lg p-2 border border-gray-100 dark:border-gray-800/60 overflow-hidden">
          <ResponsiveContainer width="100%" height={105}>
            <LineChart data={activeData} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[stats.yMin, stats.yMax]} />

              {/* +1 Standard Deviation Line (Rose/Red) */}
              <ReferenceLine
                y={stats.plus1SD}
                stroke="rgba(239, 68, 68, 0.65)"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: `+1SD: ${stats.plus1SD}x`, fill: 'rgba(239, 68, 68, 0.75)', fontSize: 8, position: 'insideTopLeft' }}
              />

              {/* Mean / Median Line (Amber/Gold) */}
              <ReferenceLine
                y={stats.medianVal}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: `TB: ${stats.medianVal}x`, fill: '#f59e0b', fontSize: 8, position: 'insideBottomLeft' }}
              />

              {/* -1 Standard Deviation Line (Emerald/Green) */}
              <ReferenceLine
                y={stats.minus1SD}
                stroke="rgba(34, 197, 94, 0.65)"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: `-1SD: ${stats.minus1SD}x`, fill: 'rgba(34, 197, 94, 0.75)', fontSize: 8, position: 'insideBottomLeft' }}
              />

              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#e2e8f0',
                }}
                formatter={(val: number) => [`${val.toFixed(2)}x`, `VNINDEX ${valType.toUpperCase()}`]}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Bottom Time Axis */}
          <div className="flex justify-between items-center text-[9.5px] text-gray-400 font-sans font-medium px-1 mt-1 border-t border-gray-100 dark:border-gray-800/60 pt-0.5">
            <span>{startDateStr}</span>
            <span>{midDateStr}</span>
            <span>{endDateStr}</span>
          </div>
        </div>
      )}
    </div>
  );
};
