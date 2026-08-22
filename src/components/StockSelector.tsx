'use client';

import React, { useState } from 'react';
import { Search, Building2, ChevronRight, Sparkles } from 'lucide-react';
import { POPULAR_STOCKS } from '@/lib/stock-data';
import { StockMarketData } from '@/types/analysis';

interface StockSelectorProps {
  selectedStock: StockMarketData;
  onSelectStock: (stock: StockMarketData) => void;
}

export function StockSelector({ selectedStock, onSelectStock }: StockSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');

  const filtered = POPULAR_STOCKS.filter(
    (s) =>
      s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const ticker = customInput.trim().toUpperCase();
    const mockData: StockMarketData = {
      ticker,
      companyName: `Công ty Cổ phần ${ticker}`,
      industry: 'Doanh nghiệp sản xuất / Niêm yết',
      currentPrice: 28000,
      pe5YearMin: 8.0,
      pe5YearMax: 18.0,
      pe5YearAvg: 12.5,
      peIndustry: 14.0,
      pbIndustry: 1.6,
      peCompetitors: [{ name: 'Ngành', pe: 14.0 }],
      pbCompetitors: [{ name: 'Ngành', pb: 1.6 }],
    };
    onSelectStock(mockData);
    setCustomInput('');
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-semibold text-white">Chọn Mã Cổ Phiếu Phân Tích</h2>
        </div>
        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400">
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
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
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
            className="w-full rounded-xl border border-gray-700 bg-gray-900/80 py-2.5 pl-9 pr-4 text-xs font-medium text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <button
          type="submit"
          disabled={!customInput.trim()}
          className="flex items-center space-x-1 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50 disabled:hover:bg-sky-500"
        >
          <span>Tạo Mã</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
