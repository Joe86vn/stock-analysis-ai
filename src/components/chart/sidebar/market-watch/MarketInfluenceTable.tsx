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

export interface MarketInfluenceTableProps {
  isDashboard?: boolean;
  maxItems?: number;
}

export const MarketInfluenceTable: React.FC<MarketInfluenceTableProps> = ({ isDashboard = false, maxItems = 10 }) => {
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
        setTopUp(up.slice(0, maxItems));
        setTopDown(down.slice(0, maxItems));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [maxItems]);

  const maxVal = useMemo(() => {
    const allVals = [
      ...topUp.map((x) => Math.abs(x.InfluenceIndex ?? 0)),
      ...topDown.map((x) => Math.abs(x.InfluenceIndex ?? 0)),
    ];
    return allVals.length > 0 ? Math.max(...allVals, 0.1) : 1;
  }, [topUp, topDown]);

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center font-sans">Đang tải đóng góp điểm số...</div>;
  if (error) return <div className="text-xs text-gray-400 py-4 text-center font-sans">Không có dữ liệu ảnh hưởng</div>;

  return (
    <div className={`w-full font-sans select-none text-[10px] ${isDashboard ? 'h-full flex flex-col overflow-hidden' : ''}`}>
      {/* Header titles (Vietcap style) */}
      <div className="grid grid-cols-2 gap-3 mb-1.5 font-bold tracking-tight text-[10.5px] shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-1 pr-3.5">
        <div className="text-center text-emerald-600 dark:text-emerald-400">Đóng góp tăng</div>
        <div className="text-center text-rose-600 dark:text-rose-400">Đóng góp giảm</div>
      </div>

      {/* 2-Column Vietcap Horizontal Bar Chart Grid */}
      <div className={`grid grid-cols-2 gap-3 ${isDashboard ? 'flex-1 min-h-0 overflow-y-auto pr-3.5' : 'pr-3'}`}>
        {/* Left Column: Top Đóng Góp Tăng */}
        <div className="flex flex-col gap-1.5">
          {topUp.map((item) => {
            const inf = item.InfluenceIndex ?? 0;
            const barWidthPct = Math.min((Math.abs(inf) / maxVal) * 100, 100);

            return (
              <div key={item.StockCode} className="flex items-center gap-1.5 h-5 group">
                {/* Number on left + Green Bar growing to right */}
                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                  <span className="text-[9.5px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 w-10 text-right">
                    {inf > 0 ? `+${inf.toFixed(2)}` : inf.toFixed(2)}
                  </span>
                  <div className="flex-1 flex items-center justify-end h-2 bg-slate-100 dark:bg-slate-800/60 rounded-full min-w-0 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300 min-w-[3px]"
                      style={{ width: `${Math.max(barWidthPct, 3)}%` }}
                    />
                  </div>
                </div>

                {/* Ticker on right */}
                <span className="font-bold text-slate-800 dark:text-slate-200 w-7 shrink-0 text-left text-[10px] font-mono">
                  {item.StockCode}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Column: Top Đóng Góp Giảm */}
        <div className="flex flex-col gap-1.5">
          {topDown.map((item) => {
            const inf = item.InfluenceIndex ?? 0;
            const barWidthPct = Math.min((Math.abs(inf) / maxVal) * 100, 100);

            return (
              <div key={item.StockCode} className="flex items-center gap-1.5 h-5 group pr-1">
                {/* Ticker on left */}
                <span className="font-bold text-slate-800 dark:text-slate-200 w-7 shrink-0 text-right text-[10px] font-mono">
                  {item.StockCode}
                </span>

                {/* Red Bar growing to right + Number on right */}
                <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                  <div className="flex-1 flex items-center justify-start h-2 bg-slate-100 dark:bg-slate-800/60 rounded-full min-w-0 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300 min-w-[3px]"
                      style={{ width: `${Math.max(barWidthPct, 3)}%` }}
                    />
                  </div>
                  <span className="text-[9.5px] font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0 w-10 text-right">
                    {inf.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
