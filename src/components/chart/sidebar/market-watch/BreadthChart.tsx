'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type EMACondition = 'EMA20' | 'EMA50' | 'EMA200';

interface BreadthPoint {
  date?: string;
  time?: string;
  t?: string | number;
  value?: number;
  ratio?: number;
  percent?: number;
  aboveCount?: number;
  totalCount?: number;
}

interface ChartPoint {
  date: string;
  value: number; // 0–100 percent
}

const CONDITIONS: EMACondition[] = ['EMA20', 'EMA50', 'EMA200'];

export const BreadthChart: React.FC = () => {
  const [condition, setCondition] = useState<EMACondition>('EMA50');
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentVal, setCurrentVal] = useState<number | null>(null);

  const load = useCallback(async (cond: EMACondition) => {
    try {
      setLoading(true);
      setError(false);
      const today = new Date().toISOString().split('T')[0];
      const from = new Date();
      from.setFullYear(from.getFullYear() - 2);
      const fromStr = from.toISOString().split('T')[0];

      const res = await fetch(
        `/api/market-watch/breadth?condition=${cond}&exchange=HSX,HNX,UPCOM&fromDate=${fromStr}&toDate=${today}`
      );
      if (!res.ok) throw new Error('upstream');
      const json = await res.json();

      const raw: BreadthPoint[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : [];

      const points: ChartPoint[] = raw.slice(-120).map((d) => {
        let val: number = d.value ?? d.ratio ?? d.percent ?? 0;
        // Normalize to percent if needed
        if (val <= 1) val = val * 100;
        if (d.aboveCount && d.totalCount) val = (d.aboveCount / d.totalCount) * 100;
        return { date: String(d.date ?? d.time ?? d.t ?? ''), value: parseFloat(val.toFixed(1)) };
      }).filter((p) => p.value >= 0);

      if (points.length === 0) { setError(true); return; }
      setCurrentVal(points[points.length - 1].value);
      setData(points);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(condition); }, [condition, load]);

  return (
    <div className="w-full">
      {/* Toggle EMA */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex gap-1">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCondition(c)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                condition === c
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {currentVal !== null && (
          <span className={`text-xs font-bold ${
            currentVal >= 70 ? 'text-emerald-500' : currentVal >= 50 ? 'text-amber-500' : 'text-red-500'
          }`}>
            {currentVal.toFixed(1)}%
          </span>
        )}
      </div>

      {loading && <div className="h-[110px] flex items-center justify-center text-xs text-gray-400">Đang tải...</div>}
      {error && !loading && <div className="h-[110px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>}
      {!loading && !error && (
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[0, 100]} />
            <ReferenceLine y={70} stroke="rgba(239, 68, 68, 0.45)" strokeDasharray="3 3" strokeWidth={1} label={{ value: '70%', fill: 'rgba(239, 68, 68, 0.6)', fontSize: 8, position: 'insideTopLeft' }} />
            <ReferenceLine y={50} stroke="rgba(255, 255, 255, 0.45)" strokeDasharray="3 3" strokeWidth={1} label={{ value: '50%', fill: 'rgba(255, 255, 255, 0.6)', fontSize: 8, position: 'insideTopLeft' }} />
            <ReferenceLine y={30} stroke="rgba(34, 197, 94, 0.45)" strokeDasharray="3 3" strokeWidth={1} label={{ value: '30%', fill: 'rgba(34, 197, 94, 0.6)', fontSize: 8, position: 'insideTopLeft' }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.9)',
                border: 'none',
                borderRadius: 6,
                fontSize: 11,
                color: '#e2e8f0',
              }}
              formatter={(val: number) => [`${val.toFixed(1)}%`, `% mã trên ${condition}`]}
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
