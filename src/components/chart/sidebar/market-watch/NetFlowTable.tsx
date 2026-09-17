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
  if (abs >= 1e9) return `${(abs / 1e9).toFixed(1)}`;
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

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center font-sans">Đang tải giao dịch NN...</div>;
  if (error) return <div className="text-xs text-gray-400 py-4 text-center font-sans">Không có dữ liệu nước ngoài</div>;

  return (
    <div className="w-full font-sans select-none text-[10px]">
      {/* Title & Header titles (Vietcap style) */}
      <div className="mb-2">
        <div className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">
          Top cổ phiếu giao dịch (tỷ VNĐ)
        </div>
        <div className="grid grid-cols-2 gap-3 font-bold tracking-tight text-[10.5px]">
          <div className="text-center text-slate-900 dark:text-white">Mua ròng</div>
          <div className="text-center text-slate-900 dark:text-white">Bán ròng</div>
        </div>
      </div>

      {/* 2-Column Vietcap Horizontal Bar Chart Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Column: Mua Ròng Nước Ngoài */}
        <div className="flex flex-col gap-1.5">
          {foreignBuy.map((item, i) => {
            const val = getNetVal(item, true);
            const barWidthPct = Math.min((val / maxVal) * 100, 100);
            const ticker = getTicker(item);

            return (
              <div key={ticker + i} className="flex items-center gap-1.5 h-5">
                {/* Number on left + Green Bar growing to right */}
                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                  <span className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatBillion(val)}
                  </span>
                  <div className="flex-1 flex items-center justify-end h-3 min-w-0">
                    <div
                      className="h-2.5 bg-[#22c55e] dark:bg-emerald-500 rounded-full transition-all duration-300 min-w-[4px]"
                      style={{ width: `${Math.max(barWidthPct, 4)}%` }}
                    />
                  </div>
                </div>

                {/* Ticker on right - Regular font weight */}
                <span className="font-semibold text-slate-800 dark:text-slate-100 w-8 shrink-0 text-left text-[10px]">
                  {ticker}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Column: Bán Ròng Nước Ngoài */}
        <div className="flex flex-col gap-1.5">
          {foreignSell.map((item, i) => {
            const val = getNetVal(item, false);
            const barWidthPct = Math.min((val / maxVal) * 100, 100);
            const ticker = getTicker(item);

            return (
              <div key={ticker + i} className="flex items-center gap-1.5 h-5">
                {/* Ticker on left - Regular font weight */}
                <span className="font-semibold text-slate-800 dark:text-slate-100 w-8 shrink-0 text-right text-[10px]">
                  {ticker}
                </span>

                {/* Red Bar growing to right + Number on right */}
                <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                  <div className="flex-1 flex items-center justify-start h-3 min-w-0">
                    <div
                      className="h-2.5 bg-[#dc2626] dark:bg-red-500 rounded-full transition-all duration-300 min-w-[4px]"
                      style={{ width: `${Math.max(barWidthPct, 4)}%` }}
                    />
                  </div>
                  <span className="text-[9.5px] font-semibold text-red-600 dark:text-red-400 shrink-0">
                    -{formatBillion(val)}
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
