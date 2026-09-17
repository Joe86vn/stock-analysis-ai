'use client';

import React, { useEffect, useState } from 'react';

type FlowTab = 'foreign' | 'proprietary';

interface FlowItem {
  StockCode?: string;
  stockCode?: string;
  ticker?: string;
  netValue?: number;
  netBuyValue?: number;
  foreignNetValue?: number;
  value?: number;
  totalNetValue?: number;
}

const fmt = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return v.toFixed(0);
};

const getNetValue = (item: FlowItem): number =>
  item.netValue ?? item.netBuyValue ?? item.foreignNetValue ?? item.value ?? item.totalNetValue ?? 0;

const getTicker = (item: FlowItem): string =>
  item.StockCode ?? item.stockCode ?? item.ticker ?? '—';

const FlowRow: React.FC<{ item: FlowItem; rank: number }> = ({ item, rank }) => {
  const val = getNetValue(item);
  const isPos = val >= 0;
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{rank}</span>
      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex-1">
        {getTicker(item)}
      </span>
      <span className={`text-[11px] font-semibold ${isPos ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPos ? '+' : ''}{fmt(val)}
      </span>
    </div>
  );
};

export const NetFlowTable: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FlowTab>('foreign');
  const [foreignBuy, setForeignBuy] = useState<FlowItem[]>([]);
  const [foreignSell, setForeignSell] = useState<FlowItem[]>([]);
  const [proprietary, setProprietary] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [buyRes, sellRes, propRes] = await Promise.all([
          fetch('/api/market-watch/foreign-flow?type=buy&count=10'),
          fetch('/api/market-watch/foreign-flow?type=sell&count=10'),
          fetch('/api/market-watch/proprietary'),
        ]);

        const buyJson = await buyRes.json();
        const sellJson = await sellRes.json();
        const propJson = await propRes.json();

        const normalize = (j: unknown): FlowItem[] =>
          Array.isArray(j) ? j : Array.isArray((j as {data?: unknown})?.data) ? (j as {data: FlowItem[]}).data : [];

        setForeignBuy(normalize(buyJson).slice(0, 10));
        setForeignSell(normalize(sellJson).slice(0, 10));
        setProprietary(normalize(propJson).slice(0, 10));
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
    <div className="w-full">
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-2">
        {([['foreign', 'Nước ngoài'], ['proprietary', 'Tự doanh']] as [FlowTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
              activeTab === tab
                ? 'bg-violet-500 text-white'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'foreign' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-bold text-emerald-500 mb-1">▲ Mua ròng</div>
            {foreignBuy.map((item, i) => (
              <FlowRow key={getTicker(item)} item={item} rank={i + 1} />
            ))}
          </div>
          <div>
            <div className="text-[10px] font-bold text-red-500 mb-1">▼ Bán ròng</div>
            {foreignSell.map((item, i) => (
              <FlowRow key={getTicker(item)} item={item} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'proprietary' && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">30 ngày gần nhất</div>
          {proprietary.map((item, i) => (
            <FlowRow key={getTicker(item)} item={item} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
