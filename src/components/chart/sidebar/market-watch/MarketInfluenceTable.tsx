'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface InfluenceItem {
  _id?: string;
  StockCode: string;
  InfluenceIndex: number;
  InfluencePercent: number;
  Change: number;
  PerChange: number;
}

interface InfluenceData {
  data?: { vsStockInfluenceList?: InfluenceItem[] };
}

const fetchInfluence = async (sort: 'DESC' | 'ASC'): Promise<InfluenceItem[]> => {
  try {
    const res = await fetch(`/api/market-watch/market-influence?sort=${sort}&count=10`);
    if (!res.ok) return [];
    const json: InfluenceData = await res.json();
    return json?.data?.vsStockInfluenceList ?? (Array.isArray(json) ? json : []);
  } catch {
    return [];
  }
};

export const MarketInfluenceTable: React.FC = () => {
  const [topUp, setTopUp] = useState<InfluenceItem[]>([]);
  const [topDown, setTopDown] = useState<InfluenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const [up, down] = await Promise.all([
          fetchInfluence('DESC'),
          fetchInfluence('ASC'),
        ]);
        if (up.length === 0 && down.length === 0) {
          setError(true);
          return;
        }
        setTopUp(up.slice(0, 10));
        setTopDown(down.slice(0, 10));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxVal = useMemo(() => {
    const allVals = [
      ...topUp.map((x) => Math.abs(x.InfluenceIndex ?? 0)),
      ...topDown.map((x) => Math.abs(x.InfluenceIndex ?? 0)),
    ];
    return allVals.length > 0 ? Math.max(...allVals, 0.1) : 1;
  }, [topUp, topDown]);

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center">Đang tải biểu đồ ảnh hưởng...</div>;
  if (error) return <div className="text-xs text-gray-400 py-4 text-center">Không có dữ liệu ảnh hưởng</div>;

  return (
    <div className="w-full font-sans select-none text-[10px]">
      {/* Header titles */}
      <div className="grid grid-cols-2 gap-2 mb-1.5 pb-1 border-b border-gray-100 dark:border-gray-800/80 font-extrabold uppercase tracking-tight text-[9.5px]">
        <div className="text-left text-emerald-700 dark:text-emerald-400">Top 10 đóng góp tăng</div>
        <div className="text-right text-red-700 dark:text-red-400">Top 10 đóng góp giảm</div>
      </div>

      {/* 2-Column Horizontal Bar Chart Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left Column: Top 10 Kéo Tăng */}
        <div className="flex flex-col gap-1">
          {topUp.map((item) => {
            const inf = item.InfluenceIndex ?? 0;
            const barWidthPct = Math.min((Math.abs(inf) / maxVal) * 100, 100);
            const perChg = item.PerChange !== undefined ? item.PerChange * (item.PerChange < 1 && item.PerChange > -1 ? 100 : 1) : 0;

            return (
              <div key={item.StockCode} className="flex items-center gap-1 h-5">
                {/* Ticker */}
                <span className="font-bold text-slate-800 dark:text-gray-100 w-7 shrink-0 text-[10px]">
                  {item.StockCode}
                </span>

                {/* Per Change % */}
                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 w-10 shrink-0 text-right">
                  +{perChg.toFixed(1)}%
                </span>

                {/* Horizontal Bar (grows left-to-right) */}
                <div className="flex-1 h-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded border border-emerald-100/80 dark:border-emerald-900/40 relative flex items-center min-w-0">
                  <div
                    className="h-full bg-emerald-500 rounded-xs transition-all duration-300"
                    style={{ width: `${Math.max(barWidthPct, 4)}%` }}
                  />
                  <span
                    className={`absolute left-1.5 text-[9px] font-bold pointer-events-none z-10 whitespace-nowrap ${
                      barWidthPct >= 45
                        ? 'text-white drop-shadow-2xs'
                        : 'text-emerald-800 dark:text-emerald-300 drop-shadow-2xs'
                    }`}
                  >
                    +{inf.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Top 10 Kéo Giảm */}
        <div className="flex flex-col gap-1">
          {topDown.map((item) => {
            const inf = item.InfluenceIndex ?? 0;
            const barWidthPct = Math.min((Math.abs(inf) / maxVal) * 100, 100);
            const perChg = item.PerChange !== undefined ? item.PerChange * (item.PerChange < 1 && item.PerChange > -1 ? 100 : 1) : 0;

            return (
              <div key={item.StockCode} className="flex items-center gap-1 h-5">
                {/* Horizontal Bar (grows right-to-left) */}
                <div className="flex-1 h-4 bg-red-50/80 dark:bg-red-950/30 rounded border border-red-100/80 dark:border-red-900/40 relative flex items-center justify-end min-w-0">
                  <div
                    className="h-full bg-red-500 rounded-xs transition-all duration-300"
                    style={{ width: `${Math.max(barWidthPct, 4)}%` }}
                  />
                  <span
                    className={`absolute right-1.5 text-[9px] font-bold pointer-events-none z-10 whitespace-nowrap ${
                      barWidthPct >= 45
                        ? 'text-white drop-shadow-2xs'
                        : 'text-red-800 dark:text-red-300 drop-shadow-2xs'
                    }`}
                  >
                    {inf.toFixed(2)}
                  </span>
                </div>

                {/* Per Change % */}
                <span className="text-[9px] font-bold text-red-700 dark:text-red-400 w-10 shrink-0 text-left">
                  {perChg.toFixed(1)}%
                </span>

                {/* Ticker */}
                <span className="font-bold text-slate-800 dark:text-gray-100 w-7 shrink-0 text-right text-[10px]">
                  {item.StockCode}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
