import React from 'react';
import { StockMarketData } from '@/types/analysis';
import { BarChart3, Activity, PieChart, ShieldAlert } from 'lucide-react';

interface MarketDataSummaryProps {
  marketData: StockMarketData;
}

export function MarketDataSummary({ marketData }: MarketDataSummaryProps) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white font-heading">{marketData.ticker}</h2>
            <span className="text-sm text-gray-400 font-medium">{marketData.companyName}</span>
          </div>
          <p className="text-xs text-emerald-400 mt-0.5 font-medium">{marketData.industry}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-emerald-400 font-heading">
            {marketData.currentPrice.toLocaleString('vi-VN')} <span className="text-xs text-gray-400 font-normal">VNĐ</span>
          </div>
          <span className="text-[11px] text-gray-500">Giá thị trường hiện tại</span>
        </div>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>P/E 5 Năm Bình Quân</span>
            <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="mt-1 text-base font-bold text-blue-400 font-heading">{marketData.pe5YearAvg}x</div>
          <div className="text-[10px] text-gray-500">Min: {marketData.pe5YearMin}x | Max: {marketData.pe5YearMax}x</div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>P/E Ngành Hiện Tại</span>
            <Activity className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-base font-bold text-amber-400 font-heading">{marketData.peIndustry}x</div>
          <div className="text-[10px] text-gray-500">P/B Ngành: {marketData.pbIndustry}x</div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>P/E Cao Nhất (Bull)</span>
            <PieChart className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 text-base font-bold text-emerald-400 font-heading">{marketData.pe5YearMax}x</div>
          <div className="text-[10px] text-gray-500">Kịch bản Tăng trưởng</div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>P/E Thấp Nhất (Bear)</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="mt-1 text-base font-bold text-rose-400 font-heading">{marketData.pe5YearMin}x</div>
          <div className="text-[10px] text-gray-500">Kịch bản Thận trọng</div>
        </div>
      </div>
    </div>
  );
}
