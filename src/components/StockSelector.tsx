'use client';

import React, { useState, useEffect } from 'react';
import { Search, Building2, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { POPULAR_STOCKS } from '@/lib/stock-data';
import { StockMarketData } from '@/types/analysis';

interface StockSelectorProps {
  selectedStock: StockMarketData;
  onSelectStock: (stock: StockMarketData) => void;
}

interface SavedReportItem {
  ticker: string;
  companyName: string;
  savedAt: string;
  generationModel?: string;
}

export function StockSelector({ selectedStock, onSelectStock }: StockSelectorProps) {
  const [customInput, setCustomInput] = useState('');
  const [savedReports, setSavedReports] = useState<SavedReportItem[]>([]);

  // Load danh sách các mã đã có báo cáo phân tích sẵn trên server
  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const data = await res.json();
          if (data && data.reports && Array.isArray(data.reports)) {
            setSavedReports(data.reports);
          }
        }
      } catch (err) {
        console.warn('Failed to load saved reports list:', err);
      }
    };
    loadSavedReports();
  }, [selectedStock.ticker]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const ticker = customInput.trim().toUpperCase();

    // Kiểm tra xem mã này đã có trong danh sách báo cáo lưu sẵn chưa
    const saved = savedReports.find((s) => s.ticker.toUpperCase() === ticker);
    const existing = POPULAR_STOCKS.find((s) => s.ticker === ticker);

    if (saved) {
      onSelectStock({
        ticker: saved.ticker,
        companyName: saved.companyName || `Công ty Cổ phần ${saved.ticker}`,
        industry: 'Doanh nghiệp Niêm yết',
        currentPrice: existing?.currentPrice || 0,
        pe5YearMin: existing?.pe5YearMin || 0,
        pe5YearMax: existing?.pe5YearMax || 0,
        pe5YearAvg: existing?.pe5YearAvg || 0,
        peIndustry: existing?.peIndustry || 0,
        pbIndustry: existing?.pbIndustry || 0,
        peCompetitors: existing?.peCompetitors || [],
        pbCompetitors: existing?.pbCompetitors || [],
      });
    } else if (existing) {
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

  const selectSavedStock = (item: SavedReportItem) => {
    const existing = POPULAR_STOCKS.find((s) => s.ticker === item.ticker.toUpperCase());
    onSelectStock({
      ticker: item.ticker.toUpperCase(),
      companyName: item.companyName || `Công ty Cổ phần ${item.ticker}`,
      industry: 'Doanh nghiệp Niêm yết',
      currentPrice: existing?.currentPrice || 0,
      pe5YearMin: existing?.pe5YearMin || 0,
      pe5YearMax: existing?.pe5YearMax || 0,
      pe5YearAvg: existing?.pe5YearAvg || 0,
      peIndustry: existing?.peIndustry || 0,
      pbIndustry: existing?.pbIndustry || 0,
      peCompetitors: existing?.peCompetitors || [],
      pbCompetitors: existing?.pbCompetitors || [],
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-5 shadow-sm dark:shadow-xl transition-colors duration-200 space-y-4">
      <div className="flex items-center justify-between">
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

      {/* Danh sách Báo cáo AI đã lưu trên máy chủ */}
      {savedReports.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center space-x-1.5 mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Báo cáo đã lưu trên máy chủ (Xem ngay • 0 Token):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedReports.map((saved) => {
              const isSelected = selectedStock.ticker.toUpperCase() === saved.ticker.toUpperCase();
              return (
                <button
                  key={saved.ticker}
                  type="button"
                  onClick={() => selectSavedStock(saved)}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition border ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/30'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                  }`}
                >
                  <Sparkles className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                  <span>{saved.ticker}</span>
                  <span className="opacity-80 text-[10px] font-normal truncate max-w-[140px]">
                    ({saved.companyName.replace('Công ty Cổ phần ', '')})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Pills Mẫu Tiêu Biểu */}
      <div>
        <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
          Mã phổ biến:
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_STOCKS.map((stock) => {
            const isSelected = selectedStock.ticker === stock.ticker;
            return (
              <button
                key={stock.ticker}
                type="button"
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
      </div>

      {/* Search or Custom Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2 pt-1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Nhập mã chứng khoán (Ví dụ: GMD, VHM, TCB, DGC...)"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 py-2.5 pl-9 pr-4 text-xs font-medium text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!customInput.trim()}
          className="flex items-center space-x-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 shadow-md shadow-emerald-600/20"
        >
          <span>Tìm / Xem</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
