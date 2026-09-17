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

interface BreadthPoint {
  date?: string;
  tradingDate?: string;
  time?: string;
  t?: string | number;
  value?: number;
  ratio?: number;
  percent?: number;
  aboveCount?: number;
  totalCount?: number;
}

interface CombinedPoint {
  date: string;
  ema20?: number;
  ema50?: number;
  ema200?: number;
}

const formatDateLabel = (dStr: string) => {
  if (!dStr) return '';
  const clean = dStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
  }
  return clean;
};

const fetchBreadthCond = async (cond: string): Promise<{ date: string; value: number }[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const from = new Date();
    from.setFullYear(from.getFullYear() - 2);
    const fromStr = from.toISOString().split('T')[0];

    const res = await fetch(
      `/api/market-watch/breadth?condition=${cond}&exchange=HSX,HNX,UPCOM&fromDate=${fromStr}&toDate=${today}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    const raw: BreadthPoint[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    return raw
      .map((d) => {
        let val: number = d.value ?? d.percent ?? d.ratio ?? 0;
        if (val <= 1 && val > 0) val = val * 100;
        if (d.aboveCount && d.totalCount && d.totalCount > 0) {
          val = (d.aboveCount / d.totalCount) * 100;
        }
        const dStr = String(d.tradingDate ?? d.date ?? d.time ?? d.t ?? '');
        return { date: dStr, value: parseFloat(val.toFixed(1)) };
      })
      .filter((p) => p.date !== '');
  } catch {
    return [];
  }
};

export const BreadthChart: React.FC = () => {
  const [data, setData] = useState<CombinedPoint[]>([]);
  const [visible, setVisible] = useState({ ema20: true, ema50: true, ema200: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const [e20, e50, e200] = await Promise.all([
          fetchBreadthCond('EMA20'),
          fetchBreadthCond('EMA50'),
          fetchBreadthCond('EMA200'),
        ]);

        if (e20.length === 0 && e50.length === 0 && e200.length === 0) {
          setError(true);
          return;
        }

        const dateMap = new Map<string, CombinedPoint>();

        e20.forEach((p) => {
          dateMap.set(p.date, { date: p.date, ema20: p.value });
        });
        e50.forEach((p) => {
          const existing = dateMap.get(p.date) ?? { date: p.date };
          existing.ema50 = p.value;
          dateMap.set(p.date, existing);
        });
        e200.forEach((p) => {
          const existing = dateMap.get(p.date) ?? { date: p.date };
          existing.ema200 = p.value;
          dateMap.set(p.date, existing);
        });

        const combined = Array.from(dateMap.values())
          .filter((p) => p.date !== '')
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-180);

        setData(combined);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentVals = useMemo(() => {
    if (data.length === 0) return { ema20: null, ema50: null, ema200: null };
    const last = data[data.length - 1];
    return {
      ema20: last.ema20 ?? null,
      ema50: last.ema50 ?? null,
      ema200: last.ema200 ?? null,
    };
  }, [data]);

  const toggleLine = (key: 'ema20' | 'ema50' | 'ema200') => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full font-sans select-none">
      {/* Header & Legend Toggles for EMA20, EMA50, EMA200 */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* EMA20 */}
          <button
            onClick={() => toggleLine('ema20')}
            className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition ${
              visible.ema20
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through opacity-60'
            }`}
            title="Bật/tắt đường % cổ phiếu trên EMA20"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
            <span>EMA20</span>
            {currentVals.ema20 !== null && <span className="font-mono">({currentVals.ema20.toFixed(1)}%)</span>}
          </button>

          {/* EMA50 */}
          <button
            onClick={() => toggleLine('ema50')}
            className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition ${
              visible.ema50
                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through opacity-60'
            }`}
            title="Bật/tắt đường % cổ phiếu trên EMA50"
          >
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
            <span>EMA50</span>
            {currentVals.ema50 !== null && <span className="font-mono">({currentVals.ema50.toFixed(1)}%)</span>}
          </button>

          {/* EMA200 */}
          <button
            onClick={() => toggleLine('ema200')}
            className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition ${
              visible.ema200
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through opacity-60'
            }`}
            title="Bật/tắt đường % cổ phiếu trên EMA200"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>EMA200</span>
            {currentVals.ema200 !== null && <span className="font-mono">({currentVals.ema200.toFixed(1)}%)</span>}
          </button>
        </div>
      </div>

      {loading && <div className="h-[140px] flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white">Đang tải 3 đường độ rộng...</div>}
      {error && !loading && <div className="h-[140px] flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white">Không có dữ liệu độ rộng</div>}
      {!loading && !error && data.length > 0 && (
        <div className="relative w-full bg-white dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-gray-800 shadow-xs">
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={data} margin={{ top: 8, right: 30, left: 4, bottom: 4 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                interval="preserveStartEnd"
                minTickGap={35}
              />
              <YAxis
                orientation="right"
                domain={[0, 100]}
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <ReferenceLine y={75} stroke="rgba(239, 68, 68, 0.45)" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={50} stroke="rgba(148, 163, 184, 0.5)" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={25} stroke="rgba(34, 197, 94, 0.45)" strokeDasharray="3 3" strokeWidth={1} />

              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.92)',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#ffffff',
                }}
                formatter={(val: number, name: string) => [`${val.toFixed(1)}%`, `% mã trên ${name.toUpperCase()}`]}
                labelFormatter={(label) => formatDateLabel(String(label))}
              />

              {visible.ema20 && (
                <Line
                  type="monotone"
                  dataKey="ema20"
                  name="EMA20"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3.5 }}
                />
              )}
              {visible.ema50 && (
                <Line
                  type="monotone"
                  dataKey="ema50"
                  name="EMA50"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3.5 }}
                />
              )}
              {visible.ema200 && (
                <Line
                  type="monotone"
                  dataKey="ema200"
                  name="EMA200"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3.5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
