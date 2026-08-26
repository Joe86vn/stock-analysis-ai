'use client';

import React, { useState } from 'react';
import { Search, Building2, ChevronRight } from 'lucide-react';
import { POPULAR_STOCKS } from '@/lib/stock-data';
import { StockMarketData } from '@/types/analysis';

interface StockSelectorProps {
  selectedStock: StockMarketData;
  onSelectStock: (stock: StockMarketData) => void;
}

export function StockSelector({ selectedStock, onSelectStock }: StockSelectorProps) {
  const [customInput, setCustomInput] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const ticker = customInput.trim().toUpperCase();
    const existing = POPULAR_STOCKS.find((s) => s.ticker === ticker);
    if (existing) {
      onSelectStock(existing);
    } else {
      const initialStockData: StockMarketData = {
        ticker,
        companyName: `Công ty Cổ phần ${ticker}`,
        industry: 'Doanh nghiệp Niêm yết',
        currentPrice: 0,
        pe5YearMin: 0,
        pe5YearMax: 0,
        pe5YearAvg: 0,
        peIndustry: 0,
        pbIndustry: 0,
        peCompetitors: [],
        pbCompetitors: [],
      };
      onSelectStock(initialStockData);
    }
    setCustomInput('');
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-5 shadow-sm dark:shadow-xl transition-colors duration-200">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
            Chọn Mã Cổ Phiếu Phân Tích
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
          HOSE / HNX / UPCoM
        </span>
      </div>

      {/* Quick Pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {POPULAR_STOCKS.map((stock) => {
          const isSelected = selectedStock.ticker === stock.ticker;
          return (
            <button
              key={stock.ticker}
              onClick={() => onSelectStock(stock)}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{stock.ticker}</span>
              <span className="opacity-75 font-normal">({stock.currentPrice.toLocaleString('vi-VN')} đ)</span>
            </button>
          );
        })}
      </div>

      {/* Search or Custom Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Nhập mã chứng khoán khác (Ví dụ: VHM, TCB, DGC...)"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 py-2.5 pl-9 pr-4 text-xs font-medium text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!customInput.trim()}
          className="flex items-center space-x-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 shadow-md shadow-emerald-600/20"
        >
          <span>Tạo Mã</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
