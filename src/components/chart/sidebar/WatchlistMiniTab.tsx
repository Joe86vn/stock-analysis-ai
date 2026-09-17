'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StockRankingItem } from '@/lib/filter-rs-data';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Search,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { LiveQuoteItem } from '@/app/api/stocks/live-quotes/route';

interface WatchlistMiniTabProps {
  currentTicker: string;
  allStocks?: StockRankingItem[];
  onSelectTicker: (ticker: string) => void;
}

type SortField = 'ticker' | 'currentPrice' | 'priceChangePercent' | 'volOrVal' | 'adtv20Billion';
type SortOrder = 'asc' | 'desc';
type IndustrySortMode = 'stock_count' | 'total_adtv' | 'performance' | 'alphabetical';

interface EnrichedStockItem extends StockRankingItem {
  sessionValueBillion?: number;
  sessionVolume?: number;
}

export const WatchlistMiniTab: React.FC<WatchlistMiniTabProps> = ({
  currentTicker,
  allStocks = [],
  onSelectTicker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [industrySortMode, setIndustrySortMode] = useState<IndustrySortMode>('stock_count');
  const [collapsedIndustries, setCollapsedIndustries] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>('adtv20Billion');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showValueMode, setShowValueMode] = useState<'val' | 'vol'>('val'); // GTGD (Tỷ) vs Khối lượng (Tr)

  // Bảng giá realtime MAS
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuoteItem>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Danh sách các mã cần lấy live quote
  const symbolList = useMemo(() => {
    return allStocks.map((s) => s.ticker).filter(Boolean);
  }, [allStocks]);

  // Polling lấy bảng giá live cho toàn bộ danh sách mã
  useEffect(() => {
    if (symbolList.length === 0) return;

    const fetchQuotes = async () => {
      try {
        const symbolsParam = symbolList.join(',');
        const res = await fetch(`/api/stocks/live-quotes?symbols=${symbolsParam}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.quotes) {
          setLiveQuotes((prev) => ({ ...prev, ...json.quotes }));
        }
      } catch (err) {
        console.warn('[WatchlistMiniTab] Live quote fetch failed:', err);
      }
    };

    fetchQuotes();
    pollIntervalRef.current = setInterval(fetchQuotes, 15000); // Cập nhật mỗi 15s

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [symbolList]);

  // Ghép dữ liệu realtime vào allStocks
  const enrichedStocks = useMemo((): EnrichedStockItem[] => {
    return allStocks.map((stock) => {
      const quote = liveQuotes[stock.ticker];
      if (!quote) return stock;

      const currentPrice = quote.price > 0 ? quote.price : stock.currentPrice;
      let priceChangePercent = quote.changePercent;
      if (
        priceChangePercent === 0 &&
        quote.price > 0 &&
        quote.refPrice > 0 &&
        quote.price !== quote.refPrice
      ) {
        priceChangePercent =
          Math.round((((quote.price - quote.refPrice) / quote.refPrice) * 100) * 100) / 100;
      }

      return {
        ...stock,
        currentPrice,
        priceChange: quote.change,
        priceChangePercent,
        refPrice: quote.refPrice > 0 ? quote.refPrice : stock.refPrice,
        sessionValueBillion: quote.sessionValueBillion,
        sessionVolume: quote.sessionVolume,
      };
    });
  }, [allStocks, liveQuotes]);

  // Lọc theo từ khóa tìm kiếm
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return enrichedStocks;
    const q = searchQuery.trim().toUpperCase();
    return enrichedStocks.filter(
      (s) => s.ticker.includes(q) || s.companyName.toLowerCase().includes(q.toLowerCase())
    );
  }, [enrichedStocks, searchQuery]);

  // Nhóm theo ngành
  const industryGroups = useMemo(() => {
    const map = new Map<string, EnrichedStockItem[]>();

    for (const stock of filteredStocks) {
      const ind = stock.industry?.trim() || 'Ngành khác';
      if (!map.has(ind)) {
        map.set(ind, []);
      }
      map.get(ind)!.push(stock);
    }

    // Sắp xếp mã bên trong từng ngành theo tiêu chí sortField
    const groups = Array.from(map.entries()).map(([industry, stocks]) => {
      const sortedStocks = [...stocks].sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortField === 'ticker') {
          return sortOrder === 'asc'
            ? a.ticker.localeCompare(b.ticker)
            : b.ticker.localeCompare(a.ticker);
        } else if (sortField === 'currentPrice') {
          valA = a.currentPrice || 0;
          valB = b.currentPrice || 0;
        } else if (sortField === 'priceChangePercent') {
          valA = a.priceChangePercent ?? 0;
          valB = b.priceChangePercent ?? 0;
        } else if (sortField === 'adtv20Billion') {
          valA = a.adtv20Billion || 0;
          valB = b.adtv20Billion || 0;
        } else if (sortField === 'volOrVal') {
          valA = a.sessionValueBillion ?? (a.adtv20Billion || 0);
          valB = b.sessionValueBillion ?? (b.adtv20Billion || 0);
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });

      const totalSessionVal = stocks.reduce(
        (sum, s) => sum + (s.sessionValueBillion ?? (s.adtv20Billion || 0)),
        0
      );
      const avgChange =
        stocks.length > 0
          ? stocks.reduce((sum, s) => sum + (s.priceChangePercent || 0), 0) / stocks.length
          : 0;

      return {
        industry,
        stocks: sortedStocks,
        count: stocks.length,
        totalSessionVal,
        avgChange,
      };
    });

    // Sắp xếp danh sách ngành theo industrySortMode
    groups.sort((a, b) => {
      if (industrySortMode === 'stock_count') {
        return b.count - a.count; // Ưu tiên ngành nhiều mã nhất lên trên
      } else if (industrySortMode === 'total_adtv') {
        return b.totalSessionVal - a.totalSessionVal;
      } else if (industrySortMode === 'performance') {
        return b.avgChange - a.avgChange;
      } else {
        return a.industry.localeCompare(b.industry);
      }
    });

    return groups;
  }, [filteredStocks, sortField, sortOrder, industrySortMode]);

  const toggleCollapse = (industry: string) => {
    setCollapsedIndustries((prev) => ({
      ...prev,
      [industry]: !prev[industry],
    }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const fmtPrice = (p: number) => {
    if (!p) return '-';
    const val = p >= 1000 ? p / 1000 : p;
    return val.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col h-full w-full select-none text-xs bg-white dark:bg-[#131722] font-sans">
      {/* ─── Thanh công cụ trên cùng: Tìm kiếm & Đổi ưu tiên ngành ─── */}
      <div className="p-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2 flex-shrink-0 bg-gray-50/50 dark:bg-[#1e222d]/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã hoặc tên công ty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e222d] text-slate-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1.5">
            <SlidersHorizontal className="w-3 h-3 text-blue-500" />
            <span>Ưu tiên:</span>
            <select
              value={industrySortMode}
              onChange={(e) => setIndustrySortMode(e.target.value as IndustrySortMode)}
              className="bg-transparent font-semibold text-slate-800 dark:text-gray-200 focus:outline-none cursor-pointer border-b border-dashed border-gray-300 dark:border-gray-600"
            >
              <option value="stock_count" className="dark:bg-gray-900">Nhiều mã nhất</option>
              <option value="total_adtv" className="dark:bg-gray-900">Tổng GTGD lớn</option>
              <option value="performance" className="dark:bg-gray-900">Tăng mạnh nhất</option>
              <option value="alphabetical" className="dark:bg-gray-900">Tên A-Z</option>
            </select>
          </div>

          <button
            onClick={() => setShowValueMode((m) => (m === 'val' ? 'vol' : 'val'))}
            className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[10px] font-mono text-gray-600 dark:text-gray-300 font-medium transition cursor-pointer"
            title="Đổi giữa GTGD phiên và Khối lượng phiên"
          >
            {showValueMode === 'val' ? 'GTGD (Tỷ)' : 'Khối lượng (Tr)'}
          </button>
        </div>
      </div>

      {/* ─── Header Cột dữ liệu (Sortable) ─── */}
      <div className="grid grid-cols-12 px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-100/90 dark:bg-[#1e222d] text-[10.5px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
        <div
          className="col-span-3 flex items-center space-x-1 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('ticker')}
        >
          <span>Mã</span>
          {sortField === 'ticker' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        <div
          className="col-span-2 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('currentPrice')}
        >
          <span>Giá</span>
          {sortField === 'currentPrice' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        <div
          className="col-span-2 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('priceChangePercent')}
        >
          <span>+/- %</span>
          {sortField === 'priceChangePercent' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        <div
          className="col-span-2 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('volOrVal')}
          title={showValueMode === 'val' ? 'Giá trị giao dịch phiên hôm nay' : 'Khối lượng giao dịch phiên hôm nay'}
        >
          <span>{showValueMode === 'val' ? 'GTGD' : 'KL'}</span>
          {sortField === 'volOrVal' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        <div
          className="col-span-3 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('adtv20Billion')}
          title="GTGD bình quân 20 phiên gần nhất"
        >
          <span>20N (Tỷ)</span>
          {sortField === 'adtv20Billion' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>
      </div>

      {/* ─── Danh sách Cổ phiếu Nhóm theo Ngành (Scrollable) ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-100 dark:divide-gray-800/60">
        {allStocks.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Đang tải danh mục cổ phiếu...</span>
          </div>
        ) : industryGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Không tìm thấy mã cổ phiếu nào
          </div>
        ) : (
          industryGroups.map((group) => {
            const isCollapsed = collapsedIndustries[group.industry];

            return (
              <div key={group.industry} className="group/ind">
                {/* Thanh Tiêu đề Ngành (Accordion) */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.industry)}
                  className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50/80 dark:bg-[#1a1e29] hover:bg-gray-100 dark:hover:bg-gray-800/80 text-left transition cursor-pointer"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                    <span className="font-bold text-slate-800 dark:text-gray-200 truncate">
                      {group.industry}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold font-mono">
                      {group.count}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] font-mono flex-shrink-0">
                    <span
                      className={`font-semibold ${
                        group.avgChange > 0
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : group.avgChange < 0
                          ? 'text-rose-500 dark:text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {group.avgChange > 0 ? '+' : ''}
                      {group.avgChange.toFixed(1)}%
                    </span>
                    <span className="text-gray-400 hidden sm:inline">
                      ({group.totalSessionVal.toFixed(0)} Tỷ)
                    </span>
                  </div>
                </button>

                {/* Danh sách mã trong ngành */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/30">
                    {group.stocks.map((s) => {
                      const isSelected = s.ticker === currentTicker;
                      const pct = s.priceChangePercent ?? 0;
                      const isUp = pct > 0;
                      const isDown = pct < 0;
                      const colorClass = isUp
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : isDown
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-amber-400';

                      // GTGD phiên hôm nay
                      const sessionVal = s.sessionValueBillion;
                      const sessionVol = s.sessionVolume;

                      return (
                        <div
                          key={s.ticker}
                          onClick={() => onSelectTicker(s.ticker)}
                          className={`grid grid-cols-12 px-3 py-1.5 items-center cursor-pointer transition text-xs font-mono ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/70 font-bold border-l-2 border-blue-600'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          {/* Mã */}
                          <div className="col-span-3 flex items-center space-x-1.5 truncate">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {s.ticker}
                            </span>
                            {s.rsRating >= 80 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold">
                                RS{s.rsRating}
                              </span>
                            )}
                          </div>

                          {/* Giá */}
                          <div className={`col-span-2 text-right font-bold ${colorClass}`}>
                            {fmtPrice(s.currentPrice)}
                          </div>

                          {/* +/- % */}
                          <div className={`col-span-2 text-right font-bold ${colorClass}`}>
                            {isUp ? '+' : ''}
                            {pct.toFixed(1)}%
                          </div>

                          {/* KL hoặc GTGD phiên */}
                          <div className="col-span-2 text-right text-slate-600 dark:text-gray-300 text-[11px]">
                            {showValueMode === 'val'
                              ? sessionVal !== undefined
                                ? `${sessionVal.toFixed(1)} T`
                                : s.adtv20Billion ? `${s.adtv20Billion.toFixed(1)} T` : '-'
                              : sessionVol !== undefined
                              ? `${(sessionVol / 1_000_000).toFixed(2)} tr`
                              : s.adtv20Billion && s.currentPrice
                              ? `${(s.adtv20Billion / (s.currentPrice / 1000)).toFixed(1)} tr`
                              : '-'}
                          </div>

                          {/* 20N (Tỷ) */}
                          <div className="col-span-3 text-right font-semibold text-gray-500 dark:text-gray-400 text-[11px]">
                            {s.adtv20Billion ? `${s.adtv20Billion.toFixed(1)} Tỷ` : '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── Chân bảng: Thống kê nhanh ─── */}
      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e222d] flex items-center justify-between text-[11px] text-gray-400 flex-shrink-0">
        <span>Tổng: <strong className="text-slate-700 dark:text-gray-200 font-mono">{filteredStocks.length}</strong> mã</span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          ● {Object.keys(liveQuotes).length > 0 ? `Realtime MAS (${Object.keys(liveQuotes).length} mã)` : 'Đang đồng bộ giá...'}
        </span>
      </div>
    </div>
  );
};
