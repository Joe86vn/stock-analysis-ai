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

export interface BreadthChartProps {
  isDashboard?: boolean;
  height?: number | string;
}

export type BreadthTimeRange = '6M' | '1Y' | '2Y';

export const BreadthChart: React.FC<BreadthChartProps> = ({ isDashboard = false, height = 135 }) => {
  const [data, setData] = useState<CombinedPoint[]>([]);
  const [timeRange, setTimeRange] = useState<BreadthTimeRange>('1Y');
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
          .slice(-500);

        setData(combined);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayData = useMemo(() => {
    if (data.length === 0) return [];
    if (timeRange === '2Y') return data;

    const lastDateStr = data[data.length - 1].date;
    const lastDate = new Date(lastDateStr);
    const cutoff = new Date(lastDate);
    if (timeRange === '6M') {
      cutoff.setMonth(cutoff.getMonth() - 6);
    } else if (timeRange === '1Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    }
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = data.filter((d) => d.date >= cutoffStr);
    if (filtered.length >= 10) return filtered;
    return timeRange === '6M' ? data.slice(-126) : data.slice(-252);
  }, [data, timeRange]);

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

  const yDomain = useMemo(() => {
    if (displayData.length === 0) return [0, 100];
    const vals: number[] = [];
    displayData.forEach((d) => {
      if (visible.ema20 && typeof d.ema20 === 'number') vals.push(d.ema20);
      if (visible.ema50 && typeof d.ema50 === 'number') vals.push(d.ema50);
      if (visible.ema200 && typeof d.ema200 === 'number') vals.push(d.ema200);
    });
    if (vals.length === 0) return [0, 100];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    // Ensure bounds encompass at least 20% to 80% so 30% and 70% reference lines have breathing room
    const yMin = Math.max(0, Math.min(20, Math.floor((min - 5) / 10) * 10));
    const yMax = Math.min(100, Math.max(80, Math.ceil((max + 5) / 10) * 10));
    return [yMin, yMax];
  }, [displayData, visible]);

  const yTicks = useMemo(() => {
    const [min, max] = yDomain;
    const candidates = [min, 30, 50, 70, max].filter((v) => v >= min && v <= max);
    return Array.from(new Set(candidates)).sort((a, b) => a - b);
  }, [yDomain]);

  return (
    <div className={`w-full font-sans select-none flex flex-col ${isDashboard ? 'h-full' : ''}`}>
      {/* Header & Legend Toggles for EMA20, EMA50, EMA200 + TimeRange Selector */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* EMA20 */}
          <button
            onClick={() => toggleLine('ema20')}
            className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition ${visible.ema20
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
            className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition ${visible.ema50
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
            className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition ${visible.ema200
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

        {/* TimeRange Selector: 6M | 1Y | 2Y */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 text-[9px] font-mono shrink-0">
          {(['6M', '1Y', '2Y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                timeRange === r
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className={`flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white ${isDashboard ? 'h-[120px]' : 'h-[140px]'}`}>Đang tải 3 đường độ rộng...</div>}
      {error && !loading && <div className={`flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white ${isDashboard ? 'h-[120px]' : 'h-[140px]'}`}>Không có dữ liệu độ rộng</div>}
      {!loading && !error && displayData.length > 0 && (
        <div className={`relative w-full ${isDashboard ? 'flex-1 min-h-[110px] bg-transparent border-none p-0' : 'bg-white dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-gray-800 shadow-xs'}`}>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={displayData} margin={{ top: 8, right: 0, left: 0, bottom: 4 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                interval="preserveStartEnd"
                minTickGap={45}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis
                orientation="right"
                domain={yDomain}
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                width={36}
                ticks={yTicks}
                tickFormatter={(val) => `${val}%`}
              />
              {/* Reference Line 70% (Mốc 70% Quá mua / Hưng phấn) */}
              {70 >= yDomain[0] && 70 <= yDomain[1] && (
                <ReferenceLine
                  y={70}
                  stroke="rgba(244, 63, 94, 0.4)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: '70%',
                    position: 'insideRight',
                    fill: '#f43f5e',
                    fontSize: 8.5,
                    opacity: 0.8,
                  }}
                />
              )}

              {/* Reference Line 50% (Đường trung vị cân bằng) */}
              {50 >= yDomain[0] && 50 <= yDomain[1] && (
                <ReferenceLine y={50} stroke="rgba(148, 163, 184, 0.3)" strokeDasharray="2 3" strokeWidth={0.8} />
              )}

              {/* Reference Line 30% (Mốc 30% Quá bán / Cơ hội) */}
              {30 >= yDomain[0] && 30 <= yDomain[1] && (
                <ReferenceLine
                  y={30}
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: '30%',
                    position: 'insideRight',
                    fill: '#10b981',
                    fontSize: 8.5,
                    opacity: 0.8,
                  }}
                />
              )}

              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.94)',
                  border: '1px solid rgba(255,255,255,0.1)',
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
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {visible.ema50 && (
                <Line
                  type="monotone"
                  dataKey="ema50"
                  name="EMA50"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {visible.ema200 && (
                <Line
                  type="monotone"
                  dataKey="ema200"
                  name="EMA200"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
