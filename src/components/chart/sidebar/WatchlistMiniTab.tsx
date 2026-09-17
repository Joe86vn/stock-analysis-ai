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
  Plus,
  Copy,
  Trash2,
  Edit2,
  FolderPlus,
  Check,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { LiveQuoteItem } from '@/app/api/stocks/live-quotes/route';

interface WatchlistMiniTabProps {
  currentTicker: string;
  allStocks?: StockRankingItem[];
  onSelectTicker: (ticker: string) => void;
}

export interface CustomWatchlist {
  id: string;
  name: string;
  tickers: string[];
  createdAt: number;
  updatedAt: number;
}

type SortField = 'ticker' | 'rsRating' | 'currentPrice' | 'priceChangePercent' | 'volOrVal' | 'adtv20Billion';
type SortOrder = 'asc' | 'desc';
type IndustrySortMode = 'stock_count' | 'total_adtv' | 'performance' | 'alphabetical';

interface EnrichedStockItem extends StockRankingItem {
  sessionValueBillion?: number;
  sessionVolume?: number;
}

const STORAGE_KEY_CUSTOM_LISTS = 'valuex_custom_watchlists';
const STORAGE_KEY_ACTIVE_LIST = 'valuex_active_watchlist';

export const WatchlistMiniTab: React.FC<WatchlistMiniTabProps> = ({
  currentTicker,
  allStocks = [],
  onSelectTicker,
}) => {
  // ─── Watchlist Presets & Universe State ───────────────────────────────────
  const [presets, setPresets] = useState<{
    top150_cap: StockRankingItem[];
    top150_adtv: StockRankingItem[];
    filter_valuex: StockRankingItem[];
    universe: StockRankingItem[];
  }>({
    top150_cap: [],
    top150_adtv: [],
    filter_valuex: [],
    universe: [],
  });
  const [isLoadingPresets, setIsLoadingPresets] = useState<boolean>(true);

  // Danh sách cổ phiếu vừa quét trực tiếp từ Tab "Bộ lọc & Xếp hạng RS"
  const [screenedRankings, setScreenedRankings] = useState<StockRankingItem[]>([]);

  // Lắng nghe và đồng bộ kết quả mới nhất từ Tab "Bộ lọc & Xếp hạng RS"
  useEffect(() => {
    try {
      const stored = localStorage.getItem('valuex_latest_screened_stocks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScreenedRankings(parsed);
        }
      }
    } catch {}

    const handleScreenedUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setScreenedRankings(e.detail);
      }
    };

    window.addEventListener('valuex-screened-updated', handleScreenedUpdated);
    return () => {
      window.removeEventListener('valuex-screened-updated', handleScreenedUpdated);
    };
  }, []);

  // ─── Custom Watchlists State (localStorage) ──────────────────────────────
  const [customLists, setCustomLists] = useState<CustomWatchlist[]>([]);
  const [activeListId, setActiveListId] = useState<string>('preset:top150_cap');

  // ─── Modal / Dropdown States ──────────────────────────────────────────────
  const [showWatchlistMenu, setShowWatchlistMenu] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAddTickerInput, setShowAddTickerInput] = useState<boolean>(false);
  const [addTickerQuery, setAddTickerQuery] = useState<string>('');
  const [newListName, setNewListName] = useState<string>('');
  const [newListSource, setNewListSource] = useState<string>('current');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // ─── Filtering & Sorting ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [industrySortMode, setIndustrySortMode] = useState<IndustrySortMode>('stock_count');
  const [collapsedIndustries, setCollapsedIndustries] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>('adtv20Billion');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showValueMode, setShowValueMode] = useState<'val' | 'vol'>('val');

  // ─── Realtime Quotes ──────────────────────────────────────────────────────
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuoteItem>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const addTickerInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Tải danh sách Watchlist Preset & Universe từ API
  useEffect(() => {
    let isCancelled = false;
    const loadPresets = async () => {
      try {
        setIsLoadingPresets(true);
        const res = await fetch('/api/stocks/watchlist-presets');
        if (!res.ok) return;
        const json = await res.json();
        if (!isCancelled && json.success && json.data) {
          setPresets({
            top150_cap: json.data.top150_cap || [],
            top150_adtv: json.data.top150_adtv || [],
            filter_valuex: json.data.filter_valuex || json.data.filter_75 || [],
            universe: json.data.universe || [],
          });
        }
      } catch (err) {
        console.warn('[WatchlistMiniTab] Error loading watchlist presets:', err);
      } finally {
        if (!isCancelled) setIsLoadingPresets(false);
      }
    };

    loadPresets();
    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Khởi tạo danh mục tự tạo từ localStorage
  useEffect(() => {
    try {
      const storedLists = localStorage.getItem(STORAGE_KEY_CUSTOM_LISTS);
      if (storedLists) {
        const parsed = JSON.parse(storedLists);
        if (Array.isArray(parsed)) {
          setCustomLists(parsed);
        }
      }
      const storedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_LIST);
      if (storedActive) {
        setActiveListId(storedActive);
      }
    } catch {}
  }, []);

  // Lưu Custom Watchlists vào localStorage khi thay đổi
  const saveCustomLists = (lists: CustomWatchlist[]) => {
    setCustomLists(lists);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_LISTS, JSON.stringify(lists));
    } catch {}
  };

  const handleSelectWatchlist = (id: string) => {
    setActiveListId(id);
    setShowWatchlistMenu(false);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_LIST, id);
    } catch {}
  };

  // 3. Xác định danh sách cổ phiếu hiện tại dựa vào activeListId
  const activeStocks: StockRankingItem[] = useMemo(() => {
    // Preset: Top 150 Vốn hóa
    if (activeListId === 'preset:top150_cap') {
      if (presets.top150_cap.length > 0) return presets.top150_cap;
      return allStocks.length > 0 ? allStocks : [];
    }
    // Preset: Top 150 Thanh khoản 20N
    if (activeListId === 'preset:top150_adtv') {
      if (presets.top150_adtv.length > 0) return presets.top150_adtv;
      return allStocks.length > 0 ? allStocks : [];
    }
    // Preset: Bộ lọc ValueX (Lấy trực tiếp kết quả từ tab Bộ lọc & Xếp hạng nếu có, fallback sang bộ lọc động từ API)
    if (activeListId === 'preset:filter_valuex' || activeListId === 'preset:filter_75') {
      if (screenedRankings.length > 0) return screenedRankings;
      if (presets.filter_valuex.length > 0) return presets.filter_valuex;
      return allStocks.length > 0 ? allStocks : [];
    }

    // Danh mục tự tạo của người dùng
    if (activeListId.startsWith('custom:')) {
      const customId = activeListId.replace('custom:', '');
      const currentCustom = customLists.find((cl) => cl.id === customId);
      if (!currentCustom) {
        return presets.top150_cap.length > 0 ? presets.top150_cap : allStocks;
      }

      // Tra cứu thông tin từng mã từ universe (hoặc allStocks)
      const stockMap = new Map<string, StockRankingItem>();
      presets.universe.forEach((s) => stockMap.set(s.ticker, s));
      allStocks.forEach((s) => {
        if (!stockMap.has(s.ticker)) stockMap.set(s.ticker, s);
      });

      return currentCustom.tickers
        .map((t) => {
          const found = stockMap.get(t);
          if (found) return found;
          // Fallback nếu mã mới thêm chưa có trong universe
          return {
            ticker: t,
            companyName: `Công ty Cổ phần ${t}`,
            exchange: 'HSX',
            industry: 'Danh mục của tôi',
            currentPrice: 0,
            adtv20Billion: 0,
            marketCapBillion: 0,
            rsRating: 50,
            totalScore: 50,
            maxScore: 150,
            totalPercentage: 33,
          } as StockRankingItem;
        })
        .filter(Boolean);
    }

    return presets.top150_cap.length > 0 ? presets.top150_cap : allStocks;
  }, [activeListId, presets, customLists, allStocks]);

  // Tên hiển thị của danh mục hiện tại
  const activeWatchlistInfo = useMemo(() => {
    if (activeListId === 'preset:top150_cap') {
      return { title: 'Top 150 Vốn hóa', isCustom: false, count: activeStocks.length, icon: '👑' };
    }
    if (activeListId === 'preset:top150_adtv') {
      return { title: 'Top 150 GTGD BQ 20P', isCustom: false, count: activeStocks.length, icon: '💧' };
    }
    if (activeListId === 'preset:filter_valuex' || activeListId === 'preset:filter_75') {
      return { title: 'Bộ lọc ValueX', isCustom: false, count: activeStocks.length, icon: '🎯' };
    }
    const customId = activeListId.replace('custom:', '');
    const found = customLists.find((c) => c.id === customId);
    return {
      title: found?.name || 'Danh mục tự tạo',
      isCustom: true,
      customId,
      count: activeStocks.length,
      icon: '⭐',
    };
  }, [activeListId, activeStocks.length, customLists]);

  // 4. Polling lấy bảng giá live cho toàn bộ danh sách mã active
  const symbolList = useMemo(() => {
    return activeStocks.map((s) => s.ticker).filter(Boolean);
  }, [activeStocks]);

  useEffect(() => {
    if (symbolList.length === 0) return;

    const fetchQuotes = async () => {
      try {
        const symbolsParam = symbolList.slice(0, 150).join(',');
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
    pollIntervalRef.current = setInterval(fetchQuotes, 15000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [symbolList]);

  // 5. Ghép dữ liệu realtime vào activeStocks
  const enrichedStocks = useMemo((): EnrichedStockItem[] => {
    return activeStocks.map((stock) => {
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
  }, [activeStocks, liveQuotes]);

  // Lọc theo từ khóa tìm kiếm
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return enrichedStocks;
    const q = searchQuery.trim().toUpperCase();
    return enrichedStocks.filter(
      (s) => s.ticker.includes(q) || s.companyName.toLowerCase().includes(q.toLowerCase())
    );
  }, [enrichedStocks, searchQuery]);

  // 6. Nhóm theo ngành (Luôn giữ phân chia theo ngành)
  const industryGroups = useMemo(() => {
    const map = new Map<string, EnrichedStockItem[]>();

    for (const stock of filteredStocks) {
      const ind = stock.industry?.trim() || 'Ngành khác';
      if (!map.has(ind)) {
        map.set(ind, []);
      }
      map.get(ind)!.push(stock);
    }

    const groups = Array.from(map.entries()).map(([industry, stocks]) => {
      const sortedStocks = [...stocks].sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortField === 'ticker') {
          return sortOrder === 'asc'
            ? a.ticker.localeCompare(b.ticker)
            : b.ticker.localeCompare(a.ticker);
        } else if (sortField === 'rsRating') {
          valA = a.rsRating || 0;
          valB = b.rsRating || 0;
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

    groups.sort((a, b) => {
      if (industrySortMode === 'stock_count') {
        return b.count - a.count;
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

  // ─── Các hàm thao tác Danh mục tự tạo ─────────────────────────────────────

  // Tạo danh mục mới (hoặc copy từ nguồn)
  const handleCreateWatchlist = () => {
    const trimmedName = newListName.trim();
    if (!trimmedName) return;

    let sourceTickers: string[] = [];
    if (newListSource === 'current') {
      sourceTickers = activeStocks.map((s) => s.ticker);
    } else if (newListSource === 'top150_cap') {
      sourceTickers = presets.top150_cap.map((s) => s.ticker);
    } else if (newListSource === 'top150_adtv') {
      sourceTickers = presets.top150_adtv.map((s) => s.ticker);
    } else if (newListSource === 'filter_valuex' || newListSource === 'filter_75') {
      const sourceList = screenedRankings.length > 0 ? screenedRankings : presets.filter_valuex;
      sourceTickers = sourceList.map((s) => s.ticker);
    } else if (newListSource.startsWith('custom:')) {
      const srcId = newListSource.replace('custom:', '');
      const src = customLists.find((c) => c.id === srcId);
      sourceTickers = src ? [...src.tickers] : [];
    } else {
      sourceTickers = []; // Trống
    }

    const newCustom: CustomWatchlist = {
      id: `cw_${Date.now()}`,
      name: trimmedName,
      tickers: Array.from(new Set(sourceTickers)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...customLists, newCustom];
    saveCustomLists(updated);
    handleSelectWatchlist(`custom:${newCustom.id}`);
    setShowCreateModal(false);
    setNewListName('');
  };

  // Xóa danh mục tự tạo
  const handleDeleteCustomWatchlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này không?')) return;

    const updated = customLists.filter((c) => c.id !== id);
    saveCustomLists(updated);
    if (activeListId === `custom:${id}`) {
      handleSelectWatchlist('preset:top150_cap');
    }
  };

  // Thêm 1 mã vào danh mục tự tạo hiện tại
  const handleAddTickerToActiveCustom = (tickerToAdd: string) => {
    const t = tickerToAdd.trim().toUpperCase();
    if (!t || !activeWatchlistInfo.isCustom || !activeWatchlistInfo.customId) return;

    const targetList = customLists.find((c) => c.id === activeWatchlistInfo.customId);
    if (!targetList) return;

    if (targetList.tickers.includes(t)) {
      setAddTickerQuery('');
      return;
    }

    const updated = customLists.map((c) => {
      if (c.id === activeWatchlistInfo.customId) {
        return {
          ...c,
          tickers: [t, ...c.tickers],
          updatedAt: Date.now(),
        };
      }
      return c;
    });

    saveCustomLists(updated);
    setAddTickerQuery('');
    setShowAddTickerInput(false);
  };

  // Xóa 1 mã khỏi danh mục tự tạo hiện tại
  const handleRemoveTickerFromActiveCustom = (tickerToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeWatchlistInfo.isCustom || !activeWatchlistInfo.customId) return;

    const updated = customLists.map((c) => {
      if (c.id === activeWatchlistInfo.customId) {
        return {
          ...c,
          tickers: c.tickers.filter((t) => t !== tickerToRemove),
          updatedAt: Date.now(),
        };
      }
      return c;
    });

    saveCustomLists(updated);
  };

  // Đổi tên danh mục
  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editingName.trim();
    if (!trimmed) return;

    const updated = customLists.map((c) => {
      if (c.id === id) {
        return { ...c, name: trimmed, updatedAt: Date.now() };
      }
      return c;
    });
    saveCustomLists(updated);
    setEditingListId(null);
  };

  // Gợi ý tìm kiếm mã khi gõ thêm mã
  const candidateTickersToAdd = useMemo(() => {
    if (!addTickerQuery.trim()) return [];
    const q = addTickerQuery.trim().toUpperCase();
    const source = presets.universe.length > 0 ? presets.universe : allStocks;
    return source
      .filter((s) => s.ticker.includes(q) || s.companyName.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8);
  }, [addTickerQuery, presets.universe, allStocks]);

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
    <div className="flex flex-col h-full w-full select-none text-xs bg-white dark:bg-[#131722] font-sans relative">
      {/* ─── Thanh Chọn Danh Mục Preset & Quản lý Danh Mục Cá Nhân ─── */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e222d] flex items-center justify-between gap-1.5 flex-shrink-0">
        {/* Nút mở menu chọn danh mục */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setShowWatchlistMenu((v) => !v)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131722] hover:border-blue-500 transition text-left cursor-pointer"
          >
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-sm">{activeWatchlistInfo.icon}</span>
              <span className="font-bold text-slate-800 dark:text-gray-100 truncate text-xs">
                {activeWatchlistInfo.title}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                {activeWatchlistInfo.count}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1" />
          </button>

          {/* Menu Dropdown Chọn & Quản lý Danh Mục */}
          {showWatchlistMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowWatchlistMenu(false)}
              />
              <div
                className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-[#1e222d] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 text-xs font-sans ring-1 ring-black/20 animate-in fade-in zoom-in-95 duration-100"
              >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                Danh mục Mẫu (Preset)
              </div>

              <button
                onClick={() => handleSelectWatchlist('preset:top150_cap')}
                className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer ${
                  activeListId === 'preset:top150_cap' ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40' : 'text-slate-700 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>👑</span>
                  <span>Top 150 Vốn hóa</span>
                </div>
                {activeListId === 'preset:top150_cap' && <Check className="w-3.5 h-3.5 text-blue-500" />}
              </button>

              <button
                onClick={() => handleSelectWatchlist('preset:top150_adtv')}
                className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer ${
                  activeListId === 'preset:top150_adtv' ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40' : 'text-slate-700 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>💧</span>
                  <span>Top 150 GTGD BQ 20P</span>
                </div>
                {activeListId === 'preset:top150_adtv' && <Check className="w-3.5 h-3.5 text-blue-500" />}
              </button>

              <button
                onClick={() => handleSelectWatchlist('preset:filter_valuex')}
                className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer ${
                  activeListId === 'preset:filter_valuex' || activeListId === 'preset:filter_75'
                    ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40'
                    : 'text-slate-700 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Bộ lọc ValueX</span>
                </div>
                {(activeListId === 'preset:filter_valuex' || activeListId === 'preset:filter_75') && (
                  <Check className="w-3.5 h-3.5 text-blue-500" />
                )}
              </button>

              <div className="px-3 py-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-t border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span>Danh mục của bạn ({customLists.length})</span>
              </div>

              {customLists.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-gray-400 italic text-center">
                  Chưa có danh mục tự tạo nào
                </div>
              ) : (
                customLists.map((cl) => {
                  const isCur = activeListId === `custom:${cl.id}`;
                  return (
                    <div
                      key={cl.id}
                      onClick={() => handleSelectWatchlist(`custom:${cl.id}`)}
                      className={`group flex items-center justify-between px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer ${
                        isCur ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40' : 'text-slate-700 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span>⭐</span>
                        <span className="truncate">{cl.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">({cl.tickers.length})</span>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => handleDeleteCustomWatchlist(cl.id, e)}
                          className="p-1 text-gray-400 hover:text-rose-500 cursor-pointer"
                          title="Xóa danh mục này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    setNewListSource('current');
                    setNewListName(`${activeWatchlistInfo.title} (Bản sao)`);
                    setShowCreateModal(true);
                    setShowWatchlistMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép danh mục này...</span>
                </button>

                <button
                  onClick={() => {
                    setNewListSource('empty');
                    setNewListName('Danh mục mới');
                    setShowCreateModal(true);
                    setShowWatchlistMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo danh mục mới...</span>
                </button>
              </div>
            </div>
          </>
          )}
        </div>

        {/* Các nút Hành động Nhanh */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {activeWatchlistInfo.isCustom && (
            <button
              onClick={() => {
                setShowAddTickerInput((v) => !v);
                setTimeout(() => addTickerInputRef.current?.focus(), 100);
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer ${
                showAddTickerInput
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800'
              }`}
              title="Thêm mã cổ phiếu vào danh mục này"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thêm mã</span>
            </button>
          )}

          <button
            onClick={() => {
              setNewListSource('current');
              setNewListName(`${activeWatchlistInfo.title} (Bản sao)`);
              setShowCreateModal(true);
            }}
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Nhân bản / Tạo danh mục mới từ danh mục này"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Khung Nhập & Tìm Thêm Mã (Dành riêng cho Custom Watchlist) ─── */}
      {activeWatchlistInfo.isCustom && showAddTickerInput && (
        <div className="p-2 border-b border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 relative flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500" />
            <input
              ref={addTickerInputRef}
              type="text"
              placeholder="Thêm mã (VD: HPG, SSI, VHM, MWG)..."
              value={addTickerQuery}
              onChange={(e) => setAddTickerQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && addTickerQuery.trim()) {
                  handleAddTickerToActiveCustom(addTickerQuery.trim());
                } else if (e.key === 'Escape') {
                  setShowAddTickerInput(false);
                }
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-[#131722] text-slate-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
            />
            {addTickerQuery && (
              <button
                onClick={() => setAddTickerQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Danh sách gợi ý mã */}
          {candidateTickersToAdd.length > 0 && (
            <div className="absolute left-2 right-2 top-full mt-1 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 font-sans">
              {candidateTickersToAdd.map((cand) => {
                const alreadyIn = activeStocks.some((s) => s.ticker === cand.ticker);
                return (
                  <button
                    key={cand.ticker}
                    disabled={alreadyIn}
                    onClick={() => handleAddTickerToActiveCustom(cand.ticker)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition cursor-pointer ${
                      alreadyIn
                        ? 'opacity-50 bg-gray-50 dark:bg-gray-800/40 cursor-not-allowed'
                        : 'hover:bg-blue-50 dark:hover:bg-blue-950/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-extrabold font-mono text-slate-900 dark:text-white">
                        {cand.ticker}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {cand.companyName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 text-[10px]">
                      <span className="text-gray-400 font-mono">{cand.industry}</span>
                      {alreadyIn ? (
                        <span className="text-gray-400">Đã thêm</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold font-mono">
                          + Thêm
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Thanh Tìm Kiếm & Ưu Tiên Sắp Xếp Ngành ─── */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-800/80 space-y-1.5 flex-shrink-0 bg-gray-50/40 dark:bg-[#1e222d]/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã hoặc tên công ty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-[#1e222d] text-slate-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono"
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

      {/* ─── Header Cột Dữ Liệu (ĐÃ BỔ SUNG CỘT RS ĐỘC LẬP & SORTABLE) ─── */}
      <div className="grid grid-cols-12 px-2.5 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-100/90 dark:bg-[#1e222d] text-[10.5px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
        {/* Mã */}
        <div
          className="col-span-3 flex items-center space-x-1 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('ticker')}
        >
          <span>Mã</span>
          {sortField === 'ticker' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        {/* Cột RS độc lập chuẩn mực */}
        <div
          className="col-span-1 text-center flex items-center justify-center space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('rsRating')}
          title="Chỉ số Sức mạnh giá RS Rating (0 - 99)"
        >
          <span>RS</span>
          {sortField === 'rsRating' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        {/* Giá */}
        <div
          className="col-span-2 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('currentPrice')}
        >
          <span>Giá</span>
          {sortField === 'currentPrice' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        {/* +/- % */}
        <div
          className="col-span-2 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('priceChangePercent')}
        >
          <span>+/- %</span>
          {sortField === 'priceChangePercent' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        {/* GTGD / KL */}
        <div
          className="col-span-2 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('volOrVal')}
          title={showValueMode === 'val' ? 'Giá trị giao dịch khớp lệnh phiên' : 'Khối lượng giao dịch phiên'}
        >
          <span>{showValueMode === 'val' ? 'GTGD' : 'KL'}</span>
          {sortField === 'volOrVal' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>

        {/* 20N (Tỷ) */}
        <div
          className="col-span-2 text-right flex items-center justify-end space-x-0.5 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort('adtv20Billion')}
          title="GTGD bình quân 20 phiên gần nhất"
        >
          <span>20N</span>
          {sortField === 'adtv20Billion' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
          )}
        </div>
      </div>

      {/* ─── Danh Sách Cổ Phiếu Nhóm Theo Ngành (Scrollable) ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-100 dark:divide-gray-800/60">
        {isLoadingPresets && activeStocks.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Đang tải danh mục cổ phiếu...</span>
          </div>
        ) : industryGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <p>Không tìm thấy mã cổ phiếu nào</p>
            {activeWatchlistInfo.isCustom && (
              <button
                onClick={() => {
                  setShowAddTickerInput(true);
                  setTimeout(() => addTickerInputRef.current?.focus(), 100);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
              >
                + Thêm mã vào danh mục này
              </button>
            )}
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
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-50/80 dark:bg-[#1a1e29] hover:bg-gray-100 dark:hover:bg-gray-800/80 text-left transition cursor-pointer"
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

                      const sessionVal = s.sessionValueBillion;
                      const sessionVol = s.sessionVolume;

                      return (
                        <div
                          key={s.ticker}
                          onClick={() => onSelectTicker(s.ticker)}
                          className={`group/row grid grid-cols-12 px-2.5 py-1.5 items-center cursor-pointer transition text-xs font-mono relative ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/70 font-bold border-l-2 border-blue-600'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          {/* 1. Mã cổ phiếu (gọn gàng, không đính kèm RS98) */}
                          <div className="col-span-3 flex items-center space-x-1 truncate">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {s.ticker}
                            </span>
                            {activeWatchlistInfo.isCustom && (
                              <button
                                onClick={(e) => handleRemoveTickerFromActiveCustom(s.ticker, e)}
                                className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                                title={`Xóa ${s.ticker} khỏi danh mục`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* 2. Cột RS: chỉ hiện số, không chữ RS98 */}
                          <div className="col-span-1 text-center font-mono font-bold text-[11px]">
                            {s.rsRating ? (
                              <span
                                className={
                                  s.rsRating >= 80
                                    ? 'text-amber-500 dark:text-amber-400 font-extrabold'
                                    : s.rsRating >= 70
                                    ? 'text-blue-500 dark:text-blue-400'
                                    : 'text-gray-400'
                                }
                                title={`RS: ${s.rsRating}`}
                              >
                                {Math.round(s.rsRating)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>

                          {/* 3. Giá */}
                          <div className={`col-span-2 text-right font-bold ${colorClass}`}>
                            {fmtPrice(s.currentPrice)}
                          </div>

                          {/* 4. +/- % */}
                          <div className={`col-span-2 text-right font-bold ${colorClass}`}>
                            {isUp ? '+' : ''}
                            {pct.toFixed(1)}%
                          </div>

                          {/* 5. KL hoặc GTGD phiên */}
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

                          {/* 6. 20N (Tỷ) */}
                          <div className="col-span-2 text-right font-semibold text-gray-500 dark:text-gray-400 text-[11px]">
                            {s.adtv20Billion ? `${s.adtv20Billion.toFixed(1)} T` : '-'}
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

      {/* ─── Chân Bảng: Thống kê & Trạng thái ─── */}
      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e222d] flex items-center justify-between text-[11px] text-gray-400 flex-shrink-0">
        <span>Tổng: <strong className="text-slate-700 dark:text-gray-200 font-mono">{filteredStocks.length}</strong> mã</span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          ● {Object.keys(liveQuotes).length > 0 ? `Realtime MAS (${Object.keys(liveQuotes).length} mã)` : 'Đang cập nhật giá...'}
        </span>
      </div>

      {/* ─── Modal Tạo Danh Mục Mới / Nhân Bản Danh Mục ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e222d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-4 text-xs font-sans ring-1 ring-black/50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800 mb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Tạo danh mục mới</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Tên danh mục:
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ví dụ: Cổ phiếu Tiềm năng, Ngân hàng & Thép..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#131722] text-slate-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 text-xs font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Khởi tạo dữ liệu từ nguồn:
                </label>
                <select
                  value={newListSource}
                  onChange={(e) => setNewListSource(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131722] text-slate-800 dark:text-gray-100 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="current">Sao chép từ danh mục hiện tại ({activeWatchlistInfo.title} - {activeStocks.length} mã)</option>
                  <option value="empty">Danh mục trống (Tự thêm mã sau)</option>
                  <option value="top150_cap">Mẫu: Top 150 Vốn hóa (150 mã)</option>
                  <option value="top150_adtv">Mẫu: Top 150 GTGD BQ 20P (150 mã)</option>
                  <option value="filter_valuex">Mẫu: Bộ lọc ValueX ({activeListId.includes('filter') ? activeStocks.length : screenedRankings.length || presets.filter_valuex.length || 70} mã)</option>
                  {customLists.map((c) => (
                    <option key={c.id} value={`custom:${c.id}`}>
                      Sao chép từ: {c.name} ({c.tickers.length} mã)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!newListName.trim()}
                  onClick={handleCreateWatchlist}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Tạo danh mục
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
