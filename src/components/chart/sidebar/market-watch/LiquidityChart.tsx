'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface LiquidityPoint {
  date?: string;
  time?: string;
  t?: string | number;
  value?: number;
  totalValue?: number;
  matchValue?: number;
  liquidityValue?: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

const formatBillion = (v: number) => {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k tỷ`;
  return `${v.toFixed(0)} tỷ`;
};

export const LiquidityChart: React.FC = () => {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ma20, setMa20] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/market-watch/liquidity');
        if (!res.ok) throw new Error('upstream');
        const json = await res.json();

        const raw: LiquidityPoint[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        const points: ChartPoint[] = raw
          .slice(-60)
          .map((d) => ({
            date: String(d.date ?? d.time ?? d.t ?? ''),
            value: Number(d.value ?? d.totalValue ?? d.matchValue ?? d.liquidityValue ?? 0) / 1e9,
          }))
          .filter((p) => p.value > 0);

        if (points.length === 0) { setError(true); return; }

        // Calculate MA20
        if (points.length >= 20) {
          const last20 = points.slice(-20).map((p) => p.value);
          setMa20(last20.reduce((a, b) => a + b, 0) / 20);
        }

        setData(points);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxVal = data.length ? Math.max(...data.map((d) => d.value)) : 0;

  return (
    <div className="w-full">
      {loading && (
        <div className="h-[120px] flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
      )}
      {error && !loading && (
        <div className="h-[120px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
      )}
      {!loading && !error && (
        <>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 text-right">
            {ma20 !== null && <>MA20: {formatBillion(ma20)}</>}
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="liqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, maxVal * 1.1]} />
              {ma20 !== null && (
                <ReferenceLine
                  y={ma20}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#e2e8f0',
                }}
                formatter={(val: number) => [formatBillion(val), 'Thanh khoản']}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={1.5}
                fill="url(#liqGrad)"
                dot={false}
                activeDot={{ r: 3, fill: '#6366f1' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};
