'use client';

import React, { useEffect, useState } from 'react';

interface FlowItem {
  s?: string;
  StockCode?: string;
  stockCode?: string;
  ticker?: string;
  frBva?: number;
  frSva?: number;
  netValue?: number;
  netBuyValue?: number;
  foreignNetValue?: number;
  value?: number;
}

const formatBillion = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)} Tỷ`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(0)} Tr`;
  return v.toFixed(0);
};

const getTicker = (item: FlowItem): string =>
  item.s ?? item.StockCode ?? item.stockCode ?? item.ticker ?? '—';

const getNetVal = (item: FlowItem, isBuy: boolean): number => {
  if (item.frBva !== undefined && item.frSva !== undefined) {
    return isBuy ? item.frBva - item.frSva : item.frSva - item.frBva;
  }
  const val = item.netValue ?? item.netBuyValue ?? item.foreignNetValue ?? item.value ?? 0;
  return Math.abs(val);
};

const FlowRow: React.FC<{ item: FlowItem; rank: number; isBuy: boolean }> = ({ item, rank, isBuy }) => {
  const val = getNetVal(item, isBuy);
  return (
    <div className="flex items-center gap-1.5 py-0.5 border-b border-gray-50 dark:border-gray-800/40 last:border-none">
      <span className="text-[9px] font-semibold text-gray-400 w-3.5 text-right shrink-0">{rank}</span>
      <span className="text-[10.5px] font-bold text-gray-800 dark:text-gray-100 flex-1">
        {getTicker(item)}
      </span>
      <span className={`text-[10.5px] font-extrabold ${isBuy ? 'text-emerald-500' : 'text-red-500'}`}>
        {isBuy ? '+' : '-'}{formatBillion(val)}
      </span>
    </div>
  );
};

export const NetFlowTable: React.FC = () => {
  const [foreignBuy, setForeignBuy] = useState<FlowItem[]>([]);
  const [foreignSell, setForeignSell] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const [buyRes, sellRes] = await Promise.all([
          fetch('/api/market-watch/foreign-flow?type=buy&count=10'),
          fetch('/api/market-watch/foreign-flow?type=sell&count=10'),
        ]);

        if (!buyRes.ok && !sellRes.ok) throw new Error('upstream');

        const buyJson = await buyRes.json();
        const sellJson = await sellRes.json();

        const normalize = (j: unknown): FlowItem[] =>
          Array.isArray(j) ? j : Array.isArray((j as { data?: unknown })?.data) ? (j as { data: FlowItem[] }).data : [];

        const buyItems = normalize(buyJson).slice(0, 10);
        const sellItems = normalize(sellJson).slice(0, 10);

        if (buyItems.length === 0 && sellItems.length === 0) {
          setError(true);
          return;
        }

        setForeignBuy(buyItems);
        setForeignSell(sellItems);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-xs text-gray-400 py-3 text-center">Đang tải dòng tiền nước ngoài...</div>;
  if (error) return <div className="text-xs text-gray-400 py-3 text-center">Không có dữ liệu nước ngoài</div>;

  return (
    <div className="w-full font-sans select-none">
      <div className="grid grid-cols-2 gap-3">
        {/* Mua ròng nước ngoài */}
        <div>
          <div className="text-[10px] font-bold text-emerald-500 mb-1 px-0.5 flex items-center gap-1">
            <span>▲ Top Mua Ròng Nước Ngoài</span>
          </div>
          <div className="flex flex-col">
            {foreignBuy.map((item, i) => (
              <FlowRow key={getTicker(item) + i} item={item} rank={i + 1} isBuy={true} />
            ))}
          </div>
        </div>

        {/* Bán ròng nước ngoài */}
        <div>
          <div className="text-[10px] font-bold text-red-500 mb-1 px-0.5 flex items-center gap-1">
            <span>▼ Top Bán Ròng Nước Ngoài</span>
          </div>
          <div className="flex flex-col">
            {foreignSell.map((item, i) => (
              <FlowRow key={getTicker(item) + i} item={item} rank={i + 1} isBuy={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
