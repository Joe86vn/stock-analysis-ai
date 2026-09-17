'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  BarChart3,
  Calendar,
  Newspaper,
  ChevronRight,
} from 'lucide-react';
import { StockRankingItem } from '@/lib/filter-rs-data';
import { WatchlistMiniTab } from './WatchlistMiniTab';
import { FinancialMetricsTab } from './FinancialMetricsTab';
import { DividendHistoryTab } from './DividendHistoryTab';
import { CompanyInfoTab } from './CompanyInfoTab';

export type SidebarTabType = 'watchlist' | 'financials' | 'dividends' | 'company';

interface ChartUtilitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicker: string;
  allStocks?: StockRankingItem[];
  onSelectTicker: (ticker: string) => void;
}

export const ChartUtilitySidebar: React.FC<ChartUtilitySidebarProps> = ({
  isOpen,
  onClose,
  currentTicker,
  allStocks = [],
  onSelectTicker,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTabType>('watchlist');

  // Load last active tab from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stock_chart_sidebar_tab') as SidebarTabType;
      if (saved && ['watchlist', 'financials', 'dividends', 'company'].includes(saved)) {
        setActiveTab(saved);
      }
    } catch {}
  }, []);

  const handleSelectTab = (tab: SidebarTabType) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('stock_chart_sidebar_tab', tab);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <aside
      className="w-[380px] sm:w-[400px] h-full flex flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131722] flex-shrink-0 z-20 shadow-xl font-sans transition-all duration-200 overflow-hidden"
      aria-label="Thanh tiện ích biểu đồ"
    >
      {/* ─── Header Tiện Ích & Thanh Chọn Tabs ─── */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 dark:border-gray-800/80 bg-gray-50 dark:bg-[#1e222d] flex-shrink-0 select-none">
        {/* 4 Tabs Phân hệ */}
        <div className="flex items-center space-x-1 overflow-x-auto min-w-0 pr-1">
          {/* Tab 1: Danh mục / Bộ lọc */}
          <button
            onClick={() => handleSelectTab('watchlist')}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === 'watchlist'
                ? 'bg-white dark:bg-[#131722] text-blue-600 dark:text-blue-400 shadow-2xs border border-gray-200/80 dark:border-gray-700/80'
                : 'text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Bảng giá mini từ Bộ lọc theo ngành"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Danh mục</span>
          </button>

          {/* Tab 2: Tài chính 4 kỳ */}
          <button
            onClick={() => handleSelectTab('financials')}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === 'financials'
                ? 'bg-white dark:bg-[#131722] text-emerald-600 dark:text-emerald-400 shadow-2xs border border-gray-200/80 dark:border-gray-700/80'
                : 'text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Chỉ số tài chính 4 kỳ trượt & Biểu đồ xu hướng"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tài chính</span>
          </button>

          {/* Tab 3: Cổ tức */}
          <button
            onClick={() => handleSelectTab('dividends')}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === 'dividends'
                ? 'bg-white dark:bg-[#131722] text-amber-600 dark:text-amber-400 shadow-2xs border border-gray-200/80 dark:border-gray-700/80'
                : 'text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Lịch sử chi trả cổ tức"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Cổ tức</span>
          </button>

          {/* Tab 4: Tin tức & Hồ sơ */}
          <button
            onClick={() => handleSelectTab('company')}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === 'company'
                ? 'bg-white dark:bg-[#131722] text-cyan-600 dark:text-cyan-400 shadow-2xs border border-gray-200/80 dark:border-gray-700/80'
                : 'text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Tin tức & Hồ sơ doanh nghiệp"
          >
            <Newspaper className="w-3.5 h-3.5 text-cyan-500" />
            <span>Tin tức</span>
          </button>
        </div>

        {/* Nút Đóng Sidebar */}
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/80 dark:hover:bg-gray-800 transition cursor-pointer flex-shrink-0 ml-1"
          title="Thu gọn tiện ích (phím tắt \)"
          aria-label="Đóng tiện ích"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Nội Dung Của Tab Đang Active ─── */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden">
        {activeTab === 'watchlist' && (
          <WatchlistMiniTab
            currentTicker={currentTicker}
            allStocks={allStocks}
            onSelectTicker={onSelectTicker}
          />
        )}

        {activeTab === 'financials' && (
          <FinancialMetricsTab ticker={currentTicker} />
        )}

        {activeTab === 'dividends' && (
          <DividendHistoryTab ticker={currentTicker} />
        )}

        {activeTab === 'company' && (
          <CompanyInfoTab ticker={currentTicker} />
        )}
      </div>
    </aside>
  );
};
