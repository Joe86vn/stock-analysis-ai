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
  FolderPlus,
  Check,
  X,
  List,
  LayoutGrid,
  Grid3X3,
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

type ViewMode = 'table' | 'grid_compact' | 'grid_card';
export type ColorStyle = 'minimal' | 'tint';
type SortField = 'ticker' | 'rsRating' | 'currentPrice' | 'priceChangePercent' | 'volOrVal' | 'adtv20Billion';
type SortOrder = 'asc' | 'desc';
type IndustrySortMode = 'stock_count' | 'total_adtv' | 'performance' | 'alphabetical';

interface EnrichedStockItem extends StockRankingItem {
  sessionValueBillion?: number;
  sessionVolume?: number;
}

const STORAGE_KEY_CUSTOM_LISTS = 'valuex_custom_watchlists';
const STORAGE_KEY_ACTIVE_LIST = 'valuex_active_watchlist';
const STORAGE_KEY_VIEW_MODE = 'valuex_watchlist_view_mode';
const STORAGE_KEY_COLOR_STYLE = 'valuex_watchlist_color_style';

export const WatchlistMiniTab: React.FC<WatchlistMiniTabProps> = ({
  currentTicker,
  allStocks = [],
  onSelectTicker,
}) => {
  // ─── Chế Độ Hiển Thị: Bảng (Table) | Lưới Nhiệt (Grid Compact) | Thẻ (Grid Card) ───
  const [viewMode, setViewMode] = useState<ViewMode>('grid_compact');
  // ─── Kiểu Màu Sắc: Tinh Gọn (Minimalist - Nền trắng/tối, số đổi màu) | Tint Mờ (Soft Glass Tint) ───
  const [colorStyle, setColorStyle] = useState<ColorStyle>('minimal');

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
    const loadPresets = async () => {
      try {
        setIsLoadingPresets(true);
        const res = await fetch('/api/stocks/watchlist-presets');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
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
        setIsLoadingPresets(false);
      }
    };

    loadPresets();
  }, []);

  // 2. Khởi tạo danh mục tự tạo & chế độ xem từ localStorage
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
      const storedViewMode = localStorage.getItem(STORAGE_KEY_VIEW_MODE) as ViewMode;
      if (storedViewMode && ['table', 'grid_compact', 'grid_card'].includes(storedViewMode)) {
        setViewMode(storedViewMode);
      }
      const storedColorStyle = localStorage.getItem(STORAGE_KEY_COLOR_STYLE) as ColorStyle;
      if (storedColorStyle && ['minimal', 'tint'].includes(storedColorStyle)) {
        setColorStyle(storedColorStyle);
      }
    } catch {}
  }, []);

  // Lưu Chế độ xem
  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
    } catch {}
  };

  // Lưu Kiểu màu sắc
  const handleSetColorStyle = (style: ColorStyle) => {
    setColorStyle(style);
    try {
      localStorage.setItem(STORAGE_KEY_COLOR_STYLE, style);
    } catch {}
  };

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
    // Preset: Bộ lọc ValueX (Ưu tiên lấy kết quả trực tiếp từ tab Bộ lọc & Xếp hạng nếu có, fallback sang bộ lọc động từ API)
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
  }, [activeListId, presets, customLists, allStocks, screenedRankings]);

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

  // ─── Hàm Định Kiểu Màu Sắc Chuẩn TTCK Việt Nam (Minimalist vs Soft Tint Glass) ─────
  const getTileStyle = (s: EnrichedStockItem, style: ColorStyle = 'minimal') => {
    const pct = s.priceChangePercent ?? 0;
    const ex = (s.exchange || 'HSX').toUpperCase();
    const ceilingPct = ex === 'UPCOM' ? 14.3 : ex === 'HNX' ? 9.5 : 6.7;
    const floorPct = ex === 'UPCOM' ? -14.3 : ex === 'HNX' ? -9.5 : -6.7;

    const isCeiling = pct >= ceilingPct && pct > 0;
    const isFloor = pct <= floorPct && pct < 0;
    const isUpStrong = !isCeiling && pct >= 3.0;
    const isUpMid = !isCeiling && pct >= 1.0 && pct < 3.0;
    const isUpLight = !isCeiling && pct > 0 && pct < 1.0;
    const isRef = pct === 0;
    const isDownLight = !isFloor && pct < 0 && pct > -1.5;
    const isDownMid = !isFloor && pct <= -1.5 && pct >= -3.0;
    const isDownDeep = !isFloor && pct < -3.0;

    // ── 1. OPTION C: TINH GỌN (Minimalist - Nền sạch trung tính, chỉ đổi màu chữ số) ──
    if (style === 'minimal') {
      const containerClass =
        'bg-white dark:bg-[#161a23] hover:bg-slate-50 dark:hover:bg-[#1e2330] border border-slate-200/90 dark:border-slate-800 shadow-2xs';
      const tickerClass = 'text-slate-800 dark:text-slate-200 font-extrabold';
      const priceClass = 'text-slate-500 dark:text-slate-400 font-mono';
      const badgeClass =
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80';

      let pctClass = 'text-amber-500 dark:text-amber-400 font-bold';
      if (isCeiling) {
        pctClass = 'text-fuchsia-600 dark:text-fuchsia-400 font-black';
      } else if (isFloor) {
        pctClass = 'text-cyan-600 dark:text-cyan-400 font-black';
      } else if (isUpStrong) {
        pctClass = 'text-emerald-600 dark:text-emerald-400 font-black';
      } else if (isUpMid) {
        pctClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
      } else if (isUpLight) {
        pctClass = 'text-teal-600 dark:text-teal-400 font-semibold';
      } else if (isRef) {
        pctClass = 'text-amber-500 dark:text-amber-400 font-bold';
      } else if (isDownLight) {
        pctClass = 'text-rose-500 dark:text-rose-400 font-semibold';
      } else if (isDownMid) {
        pctClass = 'text-orange-600 dark:text-orange-400 font-bold';
      } else if (isDownDeep) {
        pctClass = 'text-rose-600 dark:text-rose-400 font-black';
      }

      return {
        containerClass,
        tickerClass,
        pctClass,
        priceClass,
        badgeClass,
      };
    }

    // ── 2. OPTION B: TINT MỜ (Soft Glass Tint - Phủ màu pastel dịu mắt cả Light & Dark) ──
    if (isCeiling) {
      return {
        containerClass:
          'bg-fuchsia-50 dark:bg-fuchsia-950/40 hover:bg-fuchsia-100/80 dark:hover:bg-fuchsia-900/40 border border-fuchsia-200 dark:border-fuchsia-800/50 shadow-2xs',
        tickerClass: 'text-fuchsia-950 dark:text-fuchsia-100 font-extrabold',
        pctClass: 'text-fuchsia-700 dark:text-fuchsia-300 font-black',
        priceClass: 'text-fuchsia-800/80 dark:text-fuchsia-300/80 font-mono',
        badgeClass: 'bg-fuchsia-200/60 dark:bg-fuchsia-900/60 text-fuchsia-900 dark:text-fuchsia-200',
      };
    }

    if (isFloor) {
      return {
        containerClass:
          'bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100/80 dark:hover:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-800/50 shadow-2xs',
        tickerClass: 'text-cyan-950 dark:text-cyan-100 font-extrabold',
        pctClass: 'text-cyan-700 dark:text-cyan-300 font-black',
        priceClass: 'text-cyan-800/80 dark:text-cyan-300/80 font-mono',
        badgeClass: 'bg-cyan-200/60 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200',
      };
    }

    if (isUpStrong) {
      return {
        containerClass:
          'bg-emerald-50 dark:bg-emerald-950/45 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/45 border border-emerald-300 dark:border-emerald-700/50 shadow-2xs',
        tickerClass: 'text-emerald-950 dark:text-emerald-100 font-extrabold',
        pctClass: 'text-emerald-700 dark:text-emerald-300 font-black',
        priceClass: 'text-emerald-800/80 dark:text-emerald-300/80 font-mono',
        badgeClass: 'bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200',
      };
    }

    if (isUpMid) {
      return {
        containerClass:
          'bg-emerald-50/65 dark:bg-emerald-950/30 hover:bg-emerald-100/65 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40 shadow-2xs',
        tickerClass: 'text-emerald-900 dark:text-emerald-200 font-extrabold',
        pctClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
        priceClass: 'text-emerald-800/70 dark:text-emerald-400/70 font-mono',
        badgeClass: 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
      };
    }

    if (isUpLight) {
      return {
        containerClass:
          'bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50/80 dark:hover:bg-teal-900/20 border border-teal-200/60 dark:border-teal-900/30 shadow-2xs',
        tickerClass: 'text-slate-800 dark:text-slate-200 font-extrabold',
        pctClass: 'text-teal-600 dark:text-teal-400 font-bold',
        priceClass: 'text-slate-600 dark:text-slate-400 font-mono',
        badgeClass: 'bg-teal-100/60 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300',
      };
    }

    if (isRef) {
      return {
        containerClass:
          'bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border border-amber-200/80 dark:border-amber-800/40 shadow-2xs',
        tickerClass: 'text-amber-950 dark:text-amber-100 font-extrabold',
        pctClass: 'text-amber-600 dark:text-amber-400 font-bold',
        priceClass: 'text-amber-800/70 dark:text-amber-400/70 font-mono',
        badgeClass: 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
      };
    }

    if (isDownLight) {
      return {
        containerClass:
          'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-900/20 border border-rose-200/60 dark:border-rose-900/30 shadow-2xs',
        tickerClass: 'text-slate-800 dark:text-slate-200 font-extrabold',
        pctClass: 'text-rose-500 dark:text-rose-400 font-bold',
        priceClass: 'text-slate-600 dark:text-slate-400 font-mono',
        badgeClass: 'bg-rose-100/60 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
      };
    }

    if (isDownMid) {
      return {
        containerClass:
          'bg-orange-50/65 dark:bg-orange-950/30 hover:bg-orange-100/65 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800/40 shadow-2xs',
        tickerClass: 'text-orange-950 dark:text-orange-100 font-extrabold',
        pctClass: 'text-orange-600 dark:text-orange-400 font-bold',
        priceClass: 'text-orange-800/80 dark:text-orange-400/80 font-mono',
        badgeClass: 'bg-orange-100/80 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300',
      };
    }

    // Giảm sâu (< -3.0%)
    return {
      containerClass:
        'bg-rose-50 dark:bg-rose-950/45 hover:bg-rose-100/80 dark:hover:bg-rose-900/45 border border-rose-300 dark:border-rose-700/50 shadow-2xs',
      tickerClass: 'text-rose-950 dark:text-rose-100 font-extrabold',
      pctClass: 'text-rose-600 dark:text-rose-400 font-black',
      priceClass: 'text-rose-800/80 dark:text-rose-300/80 font-mono',
      badgeClass: 'bg-rose-200/60 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200',
    };
  };

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
      sourceTickers = [];
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
              <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-[#1e222d] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 text-xs font-sans ring-1 ring-black/20 animate-in fade-in zoom-in-95 duration-100">
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

      {/* ─── Thanh Tìm Kiếm, Chọn Chế Độ Xem (Bảng / Lưới / Thẻ) & Sắp Xếp Ngành ─── */}
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

        {/* Hàng điều khiển: Chế độ hiển thị 3 nấc + Toggle Màu sắc + Sắp xếp ngành */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 gap-1.5 flex-wrap">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {/* Bộ chuyển đổi chế độ xem 3 nấc (Option C: Bảng 📋 | Lưới Nhiệt 🔲 | Thẻ 🗂️) */}
            <div className="flex items-center p-0.5 rounded-lg bg-gray-200/80 dark:bg-gray-800 border border-gray-300/80 dark:border-gray-700/80 text-[10px]">
              <button
                onClick={() => handleSetViewMode('table')}
                className={`px-1.5 py-0.5 rounded-md flex items-center space-x-1 font-bold transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Bảng chi tiết (Mã, RS, Giá, % , GTGD, 20N)"
              >
                <List className="w-3 h-3" />
                <span>Bảng</span>
              </button>

              <button
                onClick={() => handleSetViewMode('grid_compact')}
                className={`px-1.5 py-0.5 rounded-md flex items-center space-x-1 font-bold transition cursor-pointer ${
                  viewMode === 'grid_compact'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Lưới nhiệt siêu gọn (Heatmap toàn ngành)"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Lưới</span>
              </button>

              <button
                onClick={() => handleSetViewMode('grid_card')}
                className={`px-1.5 py-0.5 rounded-md flex items-center space-x-1 font-bold transition cursor-pointer ${
                  viewMode === 'grid_card'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Thẻ chi tiết 4 cột (Mã, %, Giá, RS)"
              >
                <Grid3X3 className="w-3 h-3" />
                <span>Thẻ</span>
              </button>
            </div>

            {/* Chuyển đổi Kiểu Màu Sắc (Lai giữa Option B và Option C) - Chỉ hiện khi ở Lưới hoặc Thẻ */}
            {viewMode !== 'table' && (
              <div className="flex items-center p-0.5 rounded-lg bg-gray-200/80 dark:bg-gray-800 border border-gray-300/80 dark:border-gray-700/80 text-[10px] animate-in fade-in duration-150">
                <button
                  onClick={() => handleSetColorStyle('minimal')}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    colorStyle === 'minimal'
                      ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Option C: Nền trung tính sạch sẽ, chỉ chữ số đổi màu theo biên độ giá"
                >
                  Tinh gọn
                </button>
                <button
                  onClick={() => handleSetColorStyle('tint')}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    colorStyle === 'tint'
                      ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Option B: Phủ màu pastel mờ dịu nhẹ (Soft Glass Tint)"
                >
                  Tint mờ
                </button>
              </div>
            )}
          </div>

          {/* Sắp xếp Thứ Tự Ngành */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-blue-500" />
            <select
              value={industrySortMode}
              onChange={(e) => setIndustrySortMode(e.target.value as IndustrySortMode)}
              className="bg-transparent font-semibold text-slate-800 dark:text-gray-200 focus:outline-none cursor-pointer text-[10.5px] border-b border-dashed border-gray-300 dark:border-gray-600"
            >
              <option value="stock_count" className="dark:bg-gray-900">Nhiều mã nhất</option>
              <option value="total_adtv" className="dark:bg-gray-900">Tổng GTGD lớn</option>
              <option value="performance" className="dark:bg-gray-900">Tăng mạnh nhất</option>
              <option value="alphabetical" className="dark:bg-gray-900">Tên A-Z</option>
            </select>
          </div>

          {viewMode === 'table' && (
            <button
              onClick={() => setShowValueMode((m) => (m === 'val' ? 'vol' : 'val'))}
              className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[10px] font-mono text-gray-600 dark:text-gray-300 font-medium transition cursor-pointer"
              title="Đổi giữa GTGD phiên và Khối lượng phiên"
            >
              {showValueMode === 'val' ? 'GTGD' : 'KL'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Header Cột Dữ Liệu (Chỉ hiển thị khi ở chế độ Table View) ─── */}
      {viewMode === 'table' && (
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

          {/* Cột RS độc lập */}
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
      )}

      {/* ─── Danh Sách Cổ Phiếu Nhóm Theo Ngành (Scrollable) ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-[#131722]">
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
                {/* Thanh Tiêu đề Ngành (Accordion) - Thiết kế thanh lịch, đồng bộ, không chói lóa */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.industry)}
                  className="w-full flex items-center justify-between px-2.5 py-1.2 bg-slate-50/90 dark:bg-[#161a23] hover:bg-slate-100 dark:hover:bg-[#1d222e] text-left transition cursor-pointer border-b border-slate-200/70 dark:border-slate-800/80 group/ind-btn"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover/ind-btn:text-slate-600 dark:group-hover/ind-btn:text-slate-300 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover/ind-btn:text-slate-600 dark:group-hover/ind-btn:text-slate-300 flex-shrink-0" />
                    )}
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-[11.5px] tracking-normal truncate">
                      {group.industry}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold font-mono">
                      {group.count}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10.5px] font-mono flex-shrink-0">
                    <span
                      className={`font-bold ${
                        group.avgChange > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : group.avgChange < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-500 dark:text-amber-400'
                      }`}
                    >
                      {group.avgChange > 0 ? '+' : ''}
                      {group.avgChange.toFixed(1)}%
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] hidden sm:inline">
                      ({group.totalSessionVal.toFixed(0)} Tỷ)
                    </span>
                  </div>
                </button>

                {/* Danh sách mã trong ngành theo từng View Mode */}
                {!isCollapsed && (
                  <>
                    {/* ════ CHẾ ĐỘ 1: BẢNG CHI TIẾT (Table View) ════ */}
                    {viewMode === 'table' && (
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
                              {/* 1. Mã cổ phiếu */}
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

                              {/* 2. Cột RS: chỉ hiện số */}
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

                    {/* ════ CHẾ ĐỘ 2: LƯỚI NHIỆT SIÊU GỌN (Compact Grid - 4 Cột) ════ */}
                    {viewMode === 'grid_compact' && (
                      <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100/70 dark:bg-[#0c0f16]">
                        {group.stocks.map((s) => {
                          const isSelected = s.ticker === currentTicker;
                          const tile = getTileStyle(s, colorStyle);
                          const pct = s.priceChangePercent ?? 0;
                          const sign = pct > 0 ? '+' : '';

                          return (
                            <div
                              key={s.ticker}
                              onClick={() => onSelectTicker(s.ticker)}
                              className={`group/tile relative flex items-center justify-between px-1.5 py-1 rounded-md border text-[10.5px] font-mono cursor-pointer transition-all duration-75 select-none ${
                                tile.containerClass
                              } ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-[#131722] scale-[1.04] shadow-md z-10'
                                  : 'hover:scale-[1.02]'
                              }`}
                              title={`${s.ticker} - ${s.companyName}\nGiá: ${fmtPrice(s.currentPrice)} (${sign}${pct.toFixed(1)}%)\nRS: ${s.rsRating || '-'}\nGTGD: ${s.sessionValueBillion ? s.sessionValueBillion.toFixed(1) + ' Tỷ' : s.adtv20Billion ? s.adtv20Billion.toFixed(1) + ' Tỷ (20N)' : '-'}`}
                            >
                              <span className={`truncate mr-0.5 ${tile.tickerClass}`}>
                                {s.ticker}
                              </span>
                              <span className={`text-[9.5px] whitespace-nowrap ${tile.pctClass}`}>
                                {sign}{pct.toFixed(1)}%
                              </span>

                              {/* Nút xóa nhanh nếu ở danh mục cá nhân */}
                              {activeWatchlistInfo.isCustom && (
                                <button
                                  onClick={(e) => handleRemoveTickerFromActiveCustom(s.ticker, e)}
                                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/tile:opacity-100 hover:bg-rose-700 shadow-xs cursor-pointer z-20"
                                  title={`Xóa ${s.ticker}`}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ════ CHẾ ĐỘ 3: THẺ CHI TIẾT 2 DÒNG (Card Grid - 4 Cột: Mã, %, Giá, RS) ════ */}
                    {viewMode === 'grid_card' && (
                      <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100/70 dark:bg-[#0c0f16]">
                        {group.stocks.map((s) => {
                          const isSelected = s.ticker === currentTicker;
                          const tile = getTileStyle(s, colorStyle);
                          const pct = s.priceChangePercent ?? 0;
                          const sign = pct > 0 ? '+' : '';

                          return (
                            <div
                              key={s.ticker}
                              onClick={() => onSelectTicker(s.ticker)}
                              className={`group/card relative p-1 rounded-md border flex flex-col justify-between cursor-pointer transition-all duration-75 select-none ${
                                tile.containerClass
                              } ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-[#131722] scale-[1.03] shadow-md z-10'
                                  : 'hover:scale-[1.02]'
                              }`}
                              title={`${s.ticker} - ${s.companyName}\nGiá: ${fmtPrice(s.currentPrice)} (${sign}${pct.toFixed(1)}%)\nRS: ${s.rsRating || '-'}\nGTGD: ${s.sessionValueBillion ? s.sessionValueBillion.toFixed(1) + ' Tỷ' : s.adtv20Billion ? s.adtv20Billion.toFixed(1) + ' Tỷ (20N)' : '-'}`}
                            >
                              {/* Dòng 1: Mã + % */}
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-[10.5px] font-mono ${tile.tickerClass} truncate mr-0.5`}>
                                  {s.ticker}
                                </span>
                                <span className={`text-[9.5px] font-mono ${tile.pctClass} whitespace-nowrap`}>
                                  {sign}{pct.toFixed(1)}%
                                </span>
                              </div>

                              {/* Dòng 2: Giá + RS */}
                              <div className="flex items-center justify-between w-full mt-0.5 pt-0.5 border-t border-black/5 dark:border-white/10 text-[9px] font-mono">
                                <span className={tile.priceClass}>
                                  {fmtPrice(s.currentPrice)}
                                </span>
                                {s.rsRating ? (
                                  <span className={`px-1 py-0.1 rounded text-[8.5px] font-bold ${tile.badgeClass}`}>
                                    {s.rsRating}
                                  </span>
                                ) : null}
                              </div>

                              {/* Nút xóa nhanh nếu ở danh mục cá nhân */}
                              {activeWatchlistInfo.isCustom && (
                                <button
                                  onClick={(e) => handleRemoveTickerFromActiveCustom(s.ticker, e)}
                                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:bg-rose-700 shadow-xs cursor-pointer z-20"
                                  title={`Xóa ${s.ticker}`}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
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
