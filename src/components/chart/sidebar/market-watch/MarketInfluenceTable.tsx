'use client';

import React, { useEffect, useState } from 'react';

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
  const res = await fetch(`/api/market-watch/market-influence?sort=${sort}&count=5`);
  if (!res.ok) return [];
  const json: InfluenceData = await res.json();
  return json?.data?.vsStockInfluenceList ?? (Array.isArray(json) ? json : []);
};

const InfluenceRow: React.FC<{ item: InfluenceItem; isUp: boolean }> = ({ item, isUp }) => {
  const color = isUp ? 'text-emerald-500' : 'text-red-500';
  const bg = isUp ? 'bg-emerald-500/8' : 'bg-red-500/8';
  return (
    <div className={`flex items-center justify-between px-1.5 py-0.5 rounded ${bg}`}>
      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 w-10 shrink-0">
        {item.StockCode}
      </span>
      <span className={`text-[10px] font-semibold ${color}`}>
        {item.PerChange > 0 ? '+' : ''}{item.PerChange?.toFixed(1)}%
      </span>
      <span className={`text-[10px] font-medium ${color} w-12 text-right`}>
        {item.InfluenceIndex > 0 ? '+' : ''}{item.InfluenceIndex?.toFixed(2)}
      </span>
    </div>
  );
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
        const [up, down] = await Promise.all([
          fetchInfluence('DESC'),
          fetchInfluence('ASC'),
        ]);
        if (up.length === 0 && down.length === 0) setError(true);
        setTopUp(up.slice(0, 5));
        setTopDown(down.slice(0, 5));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-xs text-gray-400 py-3 text-center">Đang tải...</div>;
  if (error) return <div className="text-xs text-gray-400 py-3 text-center">Không có dữ liệu</div>;

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Kéo tăng */}
      <div>
        <div className="text-[10px] font-bold text-emerald-500 mb-1 px-1">▲ Kéo tăng</div>
        <div className="flex flex-col gap-0.5">
          {topUp.map((item) => (
            <InfluenceRow key={item.StockCode} item={item} isUp={true} />
          ))}
        </div>
      </div>
      {/* Kéo giảm */}
      <div>
        <div className="text-[10px] font-bold text-red-500 mb-1 px-1">▼ Kéo giảm</div>
        <div className="flex flex-col gap-0.5">
          {topDown.map((item) => (
            <InfluenceRow key={item.StockCode} item={item} isUp={false} />
          ))}
        </div>
      </div>
    </div>
  );
};
