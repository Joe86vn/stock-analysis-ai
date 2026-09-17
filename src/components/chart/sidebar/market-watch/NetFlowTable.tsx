'use client';

import React, { useEffect, useState, useMemo } from 'react';

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
  if (abs >= 1e9) return `${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(abs / 1e6).toFixed(0)}M`;
  return abs.toFixed(0);
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

  const maxVal = useMemo(() => {
    const buyVals = foreignBuy.map((x) => getNetVal(x, true));
    const sellVals = foreignSell.map((x) => getNetVal(x, false));
    const all = [...buyVals, ...sellVals];
    return all.length > 0 ? Math.max(...all, 1e6) : 1e9;
  }, [foreignBuy, foreignSell]);

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center">Đang tải dòng tiền nước ngoài...</div>;
  if (error) return <div className="text-xs text-gray-400 py-4 text-center">Không có dữ liệu nước ngoài</div>;

  return (
    <div className="w-full font-sans select-none text-[10px]">
      {/* Header titles */}
      <div className="grid grid-cols-2 gap-2 mb-1.5 pb-1 border-b border-gray-100 dark:border-gray-800/80 font-bold text-gray-400 uppercase tracking-tight text-[9px]">
        <div className="text-left text-emerald-500">▲ Top Mua ròng (Tỷ đ)</div>
        <div className="text-right text-red-500">▼ Top Bán ròng (Tỷ đ)</div>
      </div>

      {/* 2-Column Horizontal Bar Chart Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left Column: Top Mua Ròng Nước Ngoài */}
        <div className="flex flex-col gap-1">
          {foreignBuy.map((item, i) => {
            const val = getNetVal(item, true);
            const barWidthPct = Math.min((val / maxVal) * 100, 100);
            const ticker = getTicker(item);

            return (
              <div key={ticker + i} className="flex items-center gap-1.5 h-5">
                {/* Ticker */}
                <span className="font-bold text-gray-800 dark:text-gray-100 w-8 shrink-0 text-[10px]">
                  {ticker}
                </span>

                {/* Horizontal Bar (grows left-to-right) */}
                <div className="flex-1 h-3.5 bg-gray-100 dark:bg-gray-800/60 rounded-xs relative overflow-hidden flex items-center">
                  <div
                    className="h-full bg-emerald-500/80 dark:bg-emerald-500/90 rounded-xs transition-all duration-300"
                    style={{ width: `${Math.max(barWidthPct, 8)}%` }}
                  />
                  <span className="absolute left-1 text-[8.5px] font-black text-white drop-shadow-xs z-10">
                    +{formatBillion(val)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Top Bán Ròng Nước Ngoài */}
        <div className="flex flex-col gap-1">
          {foreignSell.map((item, i) => {
            const val = getNetVal(item, false);
            const barWidthPct = Math.min((val / maxVal) * 100, 100);
            const ticker = getTicker(item);

            return (
              <div key={ticker + i} className="flex items-center gap-1.5 h-5">
                {/* Horizontal Bar (grows right-to-left) */}
                <div className="flex-1 h-3.5 bg-gray-100 dark:bg-gray-800/60 rounded-xs relative overflow-hidden flex items-center justify-end">
                  <div
                    className="h-full bg-red-500/80 dark:bg-red-500/90 rounded-xs transition-all duration-300"
                    style={{ width: `${Math.max(barWidthPct, 8)}%` }}
                  />
                  <span className="absolute right-1 text-[8.5px] font-black text-white drop-shadow-xs z-10">
                    -{formatBillion(val)}
                  </span>
                </div>

                {/* Ticker */}
                <span className="font-bold text-gray-800 dark:text-gray-100 w-8 shrink-0 text-right text-[10px]">
                  {ticker}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
