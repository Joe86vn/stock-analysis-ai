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
  item.s ?? item.StockCode ?? item.stockCode ?? item.ticker ?? '-';

const getNetVal = (item: FlowItem, isBuy: boolean): number => {
  if (item.frBva !== undefined && item.frSva !== undefined) {
    return isBuy ? item.frBva - item.frSva : item.frSva - item.frBva;
  }
  const val = item.netValue ?? item.netBuyValue ?? item.foreignNetValue ?? item.value ?? 0;
  return Math.abs(val);
};

export interface NetFlowTableProps {
  isDashboard?: boolean;
  maxItems?: number;
}

export const NetFlowTable: React.FC<NetFlowTableProps> = ({ isDashboard = false, maxItems = 10 }) => {
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

        const buyItems = normalize(buyJson).slice(0, maxItems);
        const sellItems = normalize(sellJson).slice(0, maxItems);

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
  }, [maxItems]);

  const maxVal = useMemo(() => {
    const buyVals = foreignBuy.map((x) => getNetVal(x, true));
    const sellVals = foreignSell.map((x) => getNetVal(x, false));
    const all = [...buyVals, ...sellVals];
    return all.length > 0 ? Math.max(...all, 1e6) : 1e9;
  }, [foreignBuy, foreignSell]);

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center font-sans">Đang tải giao dịch NN...</div>;
  if (error) return <div className="text-xs text-gray-400 py-4 text-center font-sans">Không có dữ liệu nước ngoài</div>;

  return (
    <div className={`w-full font-sans select-none text-[10px] ${isDashboard ? 'h-full flex flex-col overflow-hidden' : ''}`}>
      {/* Title & Header titles (Vietcap style) */}
      <div className="mb-1.5 shrink-0">
        {!isDashboard && (
          <div className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">
            Top cổ phiếu giao dịch (tỷ VNĐ)
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 font-bold tracking-tight text-[10.5px] border-b border-slate-100 dark:border-slate-800/60 pb-1">
          <div className="text-center text-emerald-600 dark:text-emerald-400">Mua ròng</div>
          <div className="text-center text-rose-600 dark:text-rose-400">Bán ròng</div>
        </div>
      </div>

      {/* 2-Column Vietcap Horizontal Bar Chart Grid */}
      <div className={`grid grid-cols-2 gap-3 ${isDashboard ? 'flex-1 min-h-0 overflow-y-auto pr-0.5' : ''}`}>
        {/* Left Column: Mua Ròng Nước Ngoài */}
        <div className="flex flex-col gap-1.5">
          {foreignBuy.map((item, i) => {
            const val = getNetVal(item, true);
            const barWidthPct = Math.min((val / maxVal) * 100, 100);
            const ticker = getTicker(item);

            return (
              <div key={ticker + i} className="flex items-center gap-1.5 h-5 group">
                {/* Number on left + Green Bar growing to right */}
                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                  <span className="text-[9.5px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatBillion(val)}
                  </span>
                  <div className="flex-1 flex items-center justify-end h-2 bg-slate-100 dark:bg-slate-800/60 rounded-full min-w-0 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300 min-w-[3px]"
                      style={{ width: `${Math.max(barWidthPct, 3)}%` }}
                    />
                  </div>
                </div>

                {/* Ticker on right */}
                <span className="font-bold text-slate-800 dark:text-slate-200 w-8 shrink-0 text-left text-[10px] font-mono">
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
              <div key={ticker + i} className="flex items-center gap-1.5 h-5 group">
                {/* Ticker on left */}
                <span className="font-bold text-slate-800 dark:text-slate-200 w-8 shrink-0 text-right text-[10px] font-mono">
                  {ticker}
                </span>

                {/* Red Bar growing to right + Number on right */}
                <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                  <div className="flex-1 flex items-center justify-start h-2 bg-slate-100 dark:bg-slate-800/60 rounded-full min-w-0 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300 min-w-[3px]"
                      style={{ width: `${Math.max(barWidthPct, 3)}%` }}
                    />
                  </div>
                  <span className="text-[9.5px] font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0">
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
