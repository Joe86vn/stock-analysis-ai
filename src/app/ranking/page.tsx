'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { StockRankingItem } from '@/lib/filter-rs-data';
import {
  Trophy,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Award,
  Zap,
  Activity,
  ChevronRight,
  SlidersHorizontal,
  DollarSign,
  BarChart2
} from 'lucide-react';

type SortField =
  | 'totalScore'
  | 'financialHealthScore'
  | 'growthQualityScore'
  | 'businessQualityScore'
  | 'rsRating'
  | 'coreEpsGrowthYoY'
  | 'coreNetProfitGrowthYoY'
  | 'currentPrice'
  | 'adtv20Billion'
  | 'roic'
  | 'roe'
  | 'ticker';

export default function RankingPage() {
  const [rankings, setRankings] = useState<StockRankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'HSX' | 'HNX' | 'UPCOM'>('ALL');
  const [scoreTierFilter, setScoreTierFilter] = useState<'ALL' | 'A_PLUS' | 'A' | 'B_PLUS' | 'B'>('ALL');
  const [coreEpsFilter, setCoreEpsFilter] = useState<'ALL' | '20' | '50' | '100'>('ALL');
  const [coreProfitFilter, setCoreProfitFilter] = useState<'ALL' | '20' | '50'>('ALL');
  const [liquidityFilter, setLiquidityFilter] = useState<'ALL' | '10' | '50'>('ALL');
  const [rsFilter, setRsFilter] = useState<'ALL' | '70' | '80' | '90'>('ALL');

  const [sortField, setSortField] = useState<SortField>('totalScore');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchRankings = async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const url = forceRefresh ? '/api/ranking?refresh=true' : '/api/ranking';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setRankings(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ranking list:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  // Filter & Search Logic
  const filteredRankings = useMemo(() => {
    return rankings.filter((item) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchTicker = item.ticker.toLowerCase().includes(term);
        const matchName = item.companyName.toLowerCase().includes(term);
        const matchIndustry = item.industry.toLowerCase().includes(term);
        if (!matchTicker && !matchName && !matchIndustry) return false;
      }

      // 2. Exchange filter
      if (exchangeFilter !== 'ALL') {
        if (item.exchange.toUpperCase() !== exchangeFilter) return false;
      }

      // 3. Score Tier filter
      if (scoreTierFilter === 'A_PLUS' && item.rankGrade !== 'A+') return false;
      if (scoreTierFilter === 'A' && !(item.rankGrade === 'A+' || item.rankGrade === 'A')) return false;
      if (scoreTierFilter === 'B_PLUS' && !(item.rankGrade === 'A+' || item.rankGrade === 'A' || item.rankGrade === 'B+')) return false;
      if (scoreTierFilter === 'B' && item.totalScore < 80) return false;

      // 4. Core EPS Growth filter
      if (coreEpsFilter === '20' && item.coreEpsGrowthYoY < 20) return false;
      if (coreEpsFilter === '50' && item.coreEpsGrowthYoY < 50) return false;
      if (coreEpsFilter === '100' && item.coreEpsGrowthYoY < 100) return false;

      // 5. Core Net Profit Growth filter
      if (coreProfitFilter === '20' && item.coreNetProfitGrowthYoY < 20) return false;
      if (coreProfitFilter === '50' && item.coreNetProfitGrowthYoY < 50) return false;

      // 6. Liquidity ADTV20 filter
      if (liquidityFilter === '10' && item.adtv20Billion < 10) return false;
      if (liquidityFilter === '50' && item.adtv20Billion < 50) return false;

      // 7. RS Rating filter
      if (rsFilter === '70' && item.rsRating < 70) return false;
      if (rsFilter === '80' && item.rsRating < 80) return false;
      if (rsFilter === '90' && item.rsRating < 90) return false;

      return true;
    });
  }, [rankings, searchTerm, exchangeFilter, scoreTierFilter, coreEpsFilter, coreProfitFilter, liquidityFilter, rsFilter]);

  // Sort Logic
  const sortedRankings = useMemo(() => {
    const list = [...filteredRankings];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortAsc ? ((aVal ?? 0) as number) - ((bVal ?? 0) as number) : ((bVal ?? 0) as number) - ((aVal ?? 0) as number);
    });
    return list;
  }, [filteredRankings, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for new metric
    }
  };

  // KPI Summary Calculations
  const stats = useMemo(() => {
    if (rankings.length === 0) return { total: 0, avgScore: 0, aCount: 0, avgCoreEps: 0 };
    const total = rankings.length;
    const avgScore = Math.round((rankings.reduce((s, c) => s + c.totalScore, 0) / total) * 10) / 10;
    const aCount = rankings.filter((r) => r.rankGrade === 'A+' || r.rankGrade === 'A').length;
    const avgCoreEps = Math.round((rankings.reduce((s, c) => s + c.coreEpsGrowthYoY, 0) / total) * 10) / 10;
    return { total, avgScore, aCount, avgCoreEps };
  }, [rankings]);

  // Top 3 Champions
  const top3 = useMemo(() => {
    return [...rankings].sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  }, [rankings]);

  // Export CSV
  const handleExportCSV = () => {
    if (sortedRankings.length === 0) return;
    const headers = [
      'Xep_Hang',
      'Ma_CP',
      'Ten_Doanh_Nghiep',
      'San',
      'Nganh_ICB',
      'Gia_Hien_Tai',
      'GTGD_20N_Ty',
      'RS_Rating_Vietcap',
      'Tong_Diem_150',
      'Hang_Chat_Luong',
      'Suc_Khoe_TC_50',
      'Tang_Truong_60',
      'Chat_Luong_DN_40',
      'Tang_Truong_EPS_Core_YoY_Pct',
      'Tang_Truong_LNST_Core_YoY_Pct',
      'ROIC_Pct',
      'ROE_Pct',
    ];

    const rows = sortedRankings.map((it, idx) => [
      idx + 1,
      it.ticker,
      `"${it.companyName.replace(/"/g, '""')}"`,
      it.exchange,
      `"${it.industry.replace(/"/g, '""')}"`,
      it.currentPrice,
      it.adtv20Billion,
      it.rsRating,
      it.totalScore,
      it.rankGrade,
      it.financialHealthScore,
      it.growthQualityScore,
      it.businessQualityScore,
      it.coreEpsGrowthYoY,
      it.coreNetProfitGrowthYoY,
      it.roic,
      it.roe,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ValueX_Bang_Xep_Hang_Sieu_Co_Phieu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'bg-emerald-500 text-white font-black shadow-xs';
      case 'A':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50';
      case 'B+':
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300/50';
      case 'B':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300/50';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300/40';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-gray-100 transition-colors duration-200">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                <Trophy className="h-3 w-3 text-amber-500" />
                <span>ValueX Screener & Ranking</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                • Cập nhật dữ liệu Vietcap IQ
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              Bảng Xếp Hạng & Bộ Lọc Siêu Cổ Phiếu
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 mt-1 max-w-3xl">
              Đánh giá toàn diện 75 doanh nghiệp vượt qua tiêu chuẩn RS 6 tháng & Tăng trưởng EPS Q2/2026. Xếp hạng theo <span className="font-semibold text-emerald-600 dark:text-emerald-400">Tổng điểm 150</span> = Sức khỏe tài chính (50đ) + Chất lượng tăng trưởng (60đ) + Chất lượng doanh nghiệp (40đ).
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <button
              onClick={() => fetchRankings(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center space-x-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={sortedRankings.length === 0}
              className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm shadow-emerald-600/20 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Xuất CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* KPI Stats Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mã Theo Dõi</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-heading">{stats.total}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Cổ phiếu</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Lọc từ kỳ báo cáo Q2/2026</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Điểm Tổng Trung Bình</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-heading">{stats.avgScore}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">/ 150 điểm</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Toàn bộ 75 doanh nghiệp</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Siêu Cổ Phiếu Hạng A+/A</span>
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-heading">{stats.aCount}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">mã ({Math.round((stats.aCount / (stats.total || 1)) * 100)}%)</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Tổng điểm $\ge 110$ điểm</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tăng Trưởng EPS Cốt Lõi TB</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-heading">+{stats.avgCoreEps}%</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">YoY</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Sau khi bóc tách một lần</p>
          </div>
        </div>

        {/* Top 3 Champions Showcase */}
        {top3.length >= 3 && (
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-indigo-500/5 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-indigo-950/20 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                  Top 3 Quán Quân Điểm Số Toàn Diện ValueX
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-gray-400">
                Chất lượng tài chính & tăng trưởng dẫn đầu
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((champ, index) => {
                const medal = index === 0 ? '🥇 Quán Quân' : index === 1 ? '🥈 Á Quân' : '🥉 Top 3';
                const medalBg = index === 0 ? 'bg-amber-500 text-white' : index === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-white';

                return (
                  <div
                    key={champ.ticker}
                    className="relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 p-4 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${medalBg}`}>
                          {medal}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          Hạng {champ.rankGrade}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between">
                        <div>
                          <span className="text-lg font-black text-slate-900 dark:text-white font-heading">
                            {champ.ticker}
                          </span>
                          <span className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            ({champ.exchange})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-heading">
                            {champ.totalScore}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400"> / 150đ</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-gray-300 line-clamp-1 mt-0.5 font-medium">
                        {champ.companyName}
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px] bg-gray-50 dark:bg-gray-800/60 p-2 rounded-lg">
                        <div>
                          <div className="text-gray-400">Sức Khỏe</div>
                          <div className="font-bold text-slate-800 dark:text-gray-200">{champ.financialHealthScore}/50</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Tăng Trưởng</div>
                          <div className="font-bold text-slate-800 dark:text-gray-200">{champ.growthQualityScore}/60</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Chất Lượng</div>
                          <div className="font-bold text-slate-800 dark:text-gray-200">{champ.businessQualityScore}/40</div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">EPS Core YoY:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+{champ.coreEpsGrowthYoY}%</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Giá & GTGD 20N:</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300">
                          {champ.currentPrice > 0 ? champ.currentPrice.toLocaleString('vi-VN') + ' đ' : '—'} • {champ.adtv20Billion} Tỷ
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <Link
                        href={`/?ticker=${champ.ticker}`}
                        className="flex items-center justify-center space-x-1.5 w-full py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold transition"
                      >
                        <span>Phân tích chi tiết</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Multi-Criteria Filters Bar */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Bộ Lọc Nhanh & Tìm Kiếm
              </h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Tìm thấy <strong className="text-emerald-600 dark:text-emerald-400">{filteredRankings.length}</strong> / {rankings.length} mã
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã CP, tên công ty, ngành ICB..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Exchange Filter */}
            <div>
              <select
                value={exchangeFilter}
                onChange={(e) => setExchangeFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">Sàn: Tất cả</option>
                <option value="HSX">Sàn: HOSE (HSX)</option>
                <option value="HNX">Sàn: HNX</option>
                <option value="UPCOM">Sàn: UPCoM</option>
              </select>
            </div>

            {/* Score Tier Filter */}
            <div>
              <select
                value={scoreTierFilter}
                onChange={(e) => setScoreTierFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">Tổng điểm: Tất cả</option>
                <option value="A_PLUS">Hạng A+ (≥ 125đ)</option>
                <option value="A">Hạng A & A+ (≥ 110đ)</option>
                <option value="B_PLUS">Hạng B+ trở lên (≥ 95đ)</option>
                <option value="B">Hạng B trở lên (≥ 80đ)</option>
              </select>
            </div>

            {/* RS Rating Filter */}
            <div>
              <select
                value={rsFilter}
                onChange={(e) => setRsFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">RS (6T): Tất cả</option>
                <option value="90">RS ≥ 90 (Top 10%)</option>
                <option value="80">RS ≥ 80 (Top 20%)</option>
                <option value="70">RS ≥ 70 (Top 30%)</option>
              </select>
            </div>

            {/* Core EPS Growth Filter */}
            <div>
              <select
                value={coreEpsFilter}
                onChange={(e) => setCoreEpsFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">EPS Cốt lõi: Tất cả</option>
                <option value="20">EPS Cốt lõi ≥ +20%</option>
                <option value="50">EPS Cốt lõi ≥ +50%</option>
                <option value="100">EPS Cốt lõi ≥ +100%</option>
              </select>
            </div>

            {/* Liquidity ADTV20 Filter */}
            <div>
              <select
                value={liquidityFilter}
                onChange={(e) => setLiquidityFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">Thanh khoản 20N: Tất cả</option>
                <option value="10">GTGD 20N ≥ 10 Tỷ</option>
                <option value="50">GTGD 20N ≥ 50 Tỷ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ranking Data Table */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                Đang quét và tính toán điểm số 75 doanh nghiệp từ Vietcap IQ...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Quá trình phân tích 3 trụ cột (Sức khỏe, Tăng trưởng cốt lõi, Chất lượng DN)
              </p>
            </div>
          ) : sortedRankings.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-gray-300">
                Không tìm thấy mã cổ phiếu nào phù hợp với bộ lọc hiện tại.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setExchangeFilter('ALL');
                  setScoreTierFilter('ALL');
                  setRsFilter('ALL');
                  setCoreEpsFilter('ALL');
                  setCoreProfitFilter('ALL');
                  setLiquidityFilter('ALL');
                }}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/90 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700/80 select-none">
                  <tr>
                    <th className="py-3 px-3 font-semibold text-center w-12">#</th>
                    <th
                      onClick={() => handleSort('ticker')}
                      className="py-3 px-3 font-semibold cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Mã CP & Doanh Nghiệp</span>
                        {sortField === 'ticker' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('currentPrice')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Giá Hiện Tại</span>
                        {sortField === 'currentPrice' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('adtv20Billion')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>GTGD 20N</span>
                        {sortField === 'adtv20Billion' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('rsRating')}
                      className="py-3 px-3 font-semibold text-center cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>RS (6T)</span>
                        {sortField === 'rsRating' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('totalScore')}
                      className="py-3 px-3 font-semibold text-center cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 min-w-[130px]"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Tổng Điểm (150đ)</span>
                        {sortField === 'totalScore' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('financialHealthScore')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Sức Khỏe (50đ)</span>
                        {sortField === 'financialHealthScore' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('growthQualityScore')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Tăng Trưởng (60đ)</span>
                        {sortField === 'growthQualityScore' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('businessQualityScore')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Chất Lượng (40đ)</span>
                        {sortField === 'businessQualityScore' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('coreEpsGrowthYoY')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>EPS Core YoY</span>
                        {sortField === 'coreEpsGrowthYoY' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('coreNetProfitGrowthYoY')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>LNST Core YoY</span>
                        {sortField === 'coreNetProfitGrowthYoY' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('roic')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>ROIC</span>
                        {sortField === 'roic' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('roe')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>ROE</span>
                        {sortField === 'roe' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 font-semibold text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {sortedRankings.map((item, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;

                    return (
                      <tr
                        key={item.ticker}
                        className="hover:bg-emerald-50/40 dark:hover:bg-gray-800/40 transition-colors group"
                      >
                        {/* Rank STT */}
                        <td className="py-3 px-3 text-center font-bold">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-xs">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white text-xs font-black shadow-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700 text-white text-xs font-black shadow-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 font-medium">
                              {index + 1}
                            </span>
                          )}
                        </td>

                        {/* Ticker & Name & Relationship */}
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white font-heading">
                              {item.ticker}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              {item.exchange}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium hidden sm:inline">
                              {item.industry}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[220px]">
                            {item.companyName}
                          </div>
                        </td>

                        {/* Current Price */}
                        <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-gray-200">
                          {item.currentPrice > 0 ? (
                            <span>{item.currentPrice.toLocaleString('vi-VN')} đ</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* ADTV 20 */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-semibold text-slate-800 dark:text-gray-200">
                            {item.adtv20Billion}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-0.5">Tỷ</span>
                        </td>

                        {/* Vietcap RS Rating */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-md text-[11px] ${
                              item.rsRating >= 90
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                                : item.rsRating >= 80
                                ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300/40'
                                : item.rsRating >= 70
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300/40'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            RS {item.rsRating}
                          </span>
                        </td>

                        {/* Total Score & Grade */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between space-x-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getGradeBadge(item.rankGrade)}`}>
                              {item.rankGrade}
                            </span>
                            <div className="text-right">
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-heading">
                                {item.totalScore}
                              </span>
                              <span className="text-[10px] text-gray-400"> / 150</span>
                            </div>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(5, item.totalPercentage))}%` }}
                            />
                          </div>
                        </td>

                        {/* Subscores */}
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-gray-300">
                          {item.financialHealthScore}
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-gray-300">
                          {item.growthQualityScore}
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-gray-300">
                          {item.businessQualityScore}
                        </td>

                        {/* Core EPS Growth */}
                        <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {item.coreEpsGrowthYoY > 0 ? `+${item.coreEpsGrowthYoY}%` : `${item.coreEpsGrowthYoY}%`}
                        </td>

                        {/* Core Net Profit Growth */}
                        <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-gray-300">
                          {item.coreNetProfitGrowthYoY > 0 ? `+${item.coreNetProfitGrowthYoY}%` : `${item.coreNetProfitGrowthYoY}%`}
                        </td>

                        {/* ROIC */}
                        <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-gray-300">
                          {item.roic}%
                        </td>

                        {/* ROE */}
                        <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-gray-300">
                          {item.roe}%
                        </td>

                        {/* Deep-dive Link Button */}
                        <td className="py-3 px-3 text-center">
                          <Link
                            href={`/?ticker=${item.ticker}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all text-xs font-semibold shadow-2xs group-hover:scale-105"
                            title={`Mở báo cáo phân tích toàn diện cho ${item.ticker}`}
                          >
                            <span>Phân tích</span>
                            <Zap className="h-3 w-3 fill-current" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
