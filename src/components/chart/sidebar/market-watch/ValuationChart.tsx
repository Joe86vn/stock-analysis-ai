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
    const res = await fetch(`/api/market-watch/valuation?type=${type}&comGroupCode=VNINDEX&timeFrame=FIVE_YEAR`);
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

  const { currentVal, medianVal } = useMemo(() => {
    if (activeData.length === 0) return { currentVal: null, medianVal: null };
    const values = activeData.map((d) => d.value);
    return { currentVal: values[values.length - 1], medianVal: median(values) };
  }, [activeData]);

  const isAboveMedian = currentVal !== null && medianVal !== null && currentVal > medianVal;

  return (
    <div className="w-full">
      {/* Toggle PE / PB */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex gap-1">
          {(['pe', 'pb'] as ValType[]).map((t) => (
            <button
              key={t}
              onClick={() => setValType(t)}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded transition cursor-pointer uppercase ${
                valType === t
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {currentVal !== null && medianVal !== null && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`font-bold ${isAboveMedian ? 'text-red-400' : 'text-emerald-500'}`}>
              {currentVal.toFixed(1)}x
            </span>
            <span className="text-gray-400">md: {medianVal.toFixed(1)}x</span>
          </div>
        )}
      </div>

      {loading && <div className="h-[110px] flex items-center justify-center text-xs text-gray-400">Đang tải...</div>}
      {error && !loading && <div className="h-[110px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>}
      {!loading && !error && activeData.length > 0 && (
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={activeData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            {medianVal !== null && (
              <ReferenceLine y={medianVal} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
            )}
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
      )}
    </div>
  );
};
