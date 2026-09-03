'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { StockRankingItem } from '@/lib/filter-rs-data';
import { ScreenerFilterCriteria } from '@/lib/vietcap-screener-service';
import {
  Trophy,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  ExternalLink,
  Activity,
  Award,
  TrendingUp,
  SlidersHorizontal,
  Zap,
  Globe,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  | 'latestQuarter'
  | 'roe'
  | 'ticker';

export default function RankingPage() {
  const [liveRankings, setLiveRankings] = useState<StockRankingItem[]>([]);
  const [liveMeta, setLiveMeta] = useState<{
    totalMarketScanned?: string;
    matchedCount?: number;
    scoredCount?: number;
    tier1DurationMs?: number;
    tier2DurationMs?: number;
    totalDurationMs?: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isScanningLive, setIsScanningLive] = useState(false);
  const [liveScanProgress, setLiveScanProgress] = useState<string>('');

  // Danh sách các mã đã có báo cáo phân tích AI sẵn trên server
  const [savedReportTickers, setSavedReportTickers] = useState<Set<string>>(new Set());

  // Fetch danh sách mã đã có báo cáo AI trên server
  useEffect(() => {
    const fetchAnalyzedReports = async () => {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const data = await res.json();
          if (data && data.reports && Array.isArray(data.reports)) {
            const set = new Set<string>(data.reports.map((r: any) => String(r.ticker).trim().toUpperCase()));
            setSavedReportTickers(set);
          }
        }
      } catch (err) {
        console.warn('Failed to load analyzed reports list:', err);
      }
    };
    fetchAnalyzedReports();
  }, []);

  // Tiêu chí quét Tầng 1 (Toàn thị trường)
  const [tier1Criteria, setTier1Criteria] = useState<ScreenerFilterCriteria>({
    exchanges: ['HSX', 'HNX', 'UPCOM'],
    rsMin: 70,
    adtvMinBillion: 5,
    epsGrowthMinYoY: 20,
    revenueGrowthMinYoY: undefined,
    rsiMin: undefined,
    priceAboveEma: undefined,
  });

  // Bộ lọc phụ trên bảng kết quả (Tầng 2)
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'HSX' | 'HNX' | 'UPCOM'>('ALL');
  const [scoreTierFilter, setScoreTierFilter] = useState<'ALL' | 'A_PLUS' | 'A' | 'B_PLUS' | 'B'>('ALL');
  const [coreEpsFilter, setCoreEpsFilter] = useState<'ALL' | '20' | '50' | '100'>('ALL');
  const [coreProfitFilter, setCoreProfitFilter] = useState<'ALL' | '100' | '50' | '20' | '0'>('ALL');
  const [liquidityFilter, setLiquidityFilter] = useState<'ALL' | '10' | '50'>('ALL');
  const [rsFilter, setRsFilter] = useState<'ALL' | '70' | '80' | '90'>('ALL');

  const [sortField, setSortField] = useState<SortField>('totalScore');
  const [sortAsc, setSortAsc] = useState(false);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(50);

  // Tự động reset về trang 1 khi thay đổi bộ lọc, tìm kiếm hoặc kích thước trang
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, exchangeFilter, scoreTierFilter, coreEpsFilter, coreProfitFilter, liquidityFilter, rsFilter, pageSize]);

  // Thực thi Quét 2 Tầng Toàn Thị Trường (1.600+ mã)
  const handleRunLiveMarketScreening = async () => {
    setIsScanningLive(true);
    setLiveScanProgress('Đang gửi điều kiện lọc tới Vietcap Screener Engine (1.600+ mã)...');

    try {
      setLiveScanProgress('Tầng 1: Đang lọc các cổ phiếu đạt chuẩn RS, ADTV & LNST trên 3 sàn...');
      const res = await fetch('/api/screening/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tier1Criteria),
      });

      if (!res.ok) {
        throw new Error(`Quét thất bại (${res.status})`);
      }

      setLiveScanProgress('Tầng 2: Đang bóc tách LNST cốt lõi & chấm điểm 3 trụ cột ValueX (150đ)...');
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setLiveRankings(json.data);
        setLiveMeta(json.meta);
      }
    } catch (err: any) {
      console.error('Error running live screening:', err);
      alert('Không thể hoàn tất quét toàn thị trường: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setIsScanningLive(false);
      setLiveScanProgress('');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRunLiveMarketScreening();
  }, []);

  // Danh sách hiển thị trực tiếp từ kết quả quét toàn thị trường
  const activeRankings = liveRankings;

  // Bộ lọc tìm kiếm & tiêu chí phụ
  const filteredRankings = useMemo(() => {
    return activeRankings.filter((item) => {
      // 1. Tìm kiếm Ticker / Tên / Ngành
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchTicker = item.ticker.toLowerCase().includes(term);
        const matchName = item.companyName.toLowerCase().includes(term);
        const matchIndustry = item.industry.toLowerCase().includes(term);
        if (!matchTicker && !matchName && !matchIndustry) return false;
      }

      // 2. Sàn
      if (exchangeFilter !== 'ALL') {
        if (item.exchange.toUpperCase() !== exchangeFilter) return false;
      }

      // 3. Hạng điểm số ValueX
      if (scoreTierFilter === 'A_PLUS' && item.rankGrade !== 'A+') return false;
      if (scoreTierFilter === 'A' && !(item.rankGrade === 'A+' || item.rankGrade === 'A')) return false;
      if (scoreTierFilter === 'B_PLUS' && !(item.rankGrade === 'A+' || item.rankGrade === 'A' || item.rankGrade === 'B+')) return false;
      if (scoreTierFilter === 'B' && item.totalScore < 80) return false;

      // 4. Tăng trưởng EPS cốt lõi
      if (coreEpsFilter === '20' && item.coreEpsGrowthYoY < 20) return false;
      if (coreEpsFilter === '50' && item.coreEpsGrowthYoY < 50) return false;
      if (coreEpsFilter === '100' && item.coreEpsGrowthYoY < 100) return false;

      // 5. Tăng trưởng LNST cốt lõi
      if (coreProfitFilter === '100' && item.coreNetProfitGrowthYoY < 100) return false;
      if (coreProfitFilter === '50' && item.coreNetProfitGrowthYoY < 50) return false;
      if (coreProfitFilter === '20' && item.coreNetProfitGrowthYoY < 20) return false;
      if (coreProfitFilter === '0' && item.coreNetProfitGrowthYoY <= 0) return false;

      // 6. Thanh khoản ADTV 20
      if (liquidityFilter === '10' && item.adtv20Billion < 10) return false;
      if (liquidityFilter === '50' && item.adtv20Billion < 50) return false;

      // 7. RS Rating
      if (rsFilter === '70' && item.rsRating < 70) return false;
      if (rsFilter === '80' && item.rsRating < 80) return false;
      if (rsFilter === '90' && item.rsRating < 90) return false;

      return true;
    });
  }, [activeRankings, searchTerm, exchangeFilter, scoreTierFilter, coreEpsFilter, coreProfitFilter, liquidityFilter, rsFilter]);

  // Sắp xếp
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

  // Phân trang
  const totalPages = useMemo(() => {
    if (pageSize === 'ALL' || sortedRankings.length === 0) return 1;
    return Math.ceil(sortedRankings.length / pageSize);
  }, [sortedRankings.length, pageSize]);

  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRankings = useMemo(() => {
    if (pageSize === 'ALL') return sortedRankings;
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedRankings.slice(startIndex, startIndex + pageSize);
  }, [sortedRankings, validCurrentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // KPI Summary
  const stats = useMemo(() => {
    if (activeRankings.length === 0) return { total: 0, avgScore: 0, aCount: 0, avgCoreEps: 0 };
    const total = activeRankings.length;
    const avgScore = Math.round((activeRankings.reduce((s, c) => s + c.totalScore, 0) / total) * 10) / 10;
    const aCount = activeRankings.filter((r) => r.rankGrade === 'A+' || r.rankGrade === 'A').length;
    const avgCoreEps = Math.round((activeRankings.reduce((s, c) => s + c.coreEpsGrowthYoY, 0) / total) * 10) / 10;
    return { total, avgScore, aCount, avgCoreEps };
  }, [activeRankings]);

  // Top 3 Champions
  const top3 = useMemo(() => {
    return [...activeRankings].sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  }, [activeRankings]);

  // Xuất CSV
  const handleExportCSV = () => {
    if (sortedRankings.length === 0) return;
    const headers = [
      'Xep_Hang',
      'Ma_CP',
      'Ky_BCTC',
      'Ten_Doanh_Nghiep',
      'San',
      'Nganh_ICB',
      'Gia_Hien_Tai',
      'GTGD_20N_Ty',
      'RS_1Thang',
      'Tong_Diem_150',
      'Hang_Chat_Luong',
      'Suc_Khoe_TC_50',
      'Tang_Truong_60',
      'Chat_Luong_DN_40',
      'Tang_Truong_EPS_Core_YoY_Pct',
      'Tang_Truong_LNST_Core_YoY_Pct',
      'ROE_Pct',
    ];

    const rows = sortedRankings.map((it, idx) => [
      idx + 1,
      it.ticker,
      it.latestQuarter || 'Chưa rõ',
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
      it.roe,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ValueX_Bang_Xep_Hang_Thi_Truong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                • Kiến trúc Lọc 2 Tầng Siêu Tốc & Chuyên Sâu
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              Bảng Xếp Hạng & Bộ Lọc Siêu Cổ Phiếu
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 mt-1 max-w-3xl">
              Sàng lọc toàn diện thị trường theo <span className="font-semibold text-emerald-600 dark:text-emerald-400">Tổng điểm 150</span> = Sức khỏe tài chính (50đ) + Chất lượng tăng trưởng cốt lõi (60đ) + Chất lượng doanh nghiệp (40đ).
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <button
              onClick={handleRunLiveMarketScreening}
              disabled={isScanningLive}
              className="flex items-center space-x-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanningLive ? 'animate-spin' : ''}`} />
              <span>{isScanningLive ? 'Đang quét...' : 'Quét lại thị trường'}</span>
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

        {/* Live Market Screener Config Panel (Tầng 1) */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-950/80 bg-gradient-to-r from-indigo-50/50 via-white to-emerald-50/50 dark:from-indigo-950/30 dark:via-gray-900 dark:to-emerald-950/30 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/60 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                  Cấu Hình Tiêu Chí Lọc Tầng 1 (Vietcap Screener Engine)
                </h3>
              </div>
              <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                Quét đồng thời trên toàn bộ 1.600+ mã cổ phiếu HSX, HNX, UPCoM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Sức mạnh giá RS */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Sức Mạnh Giá RS (1 Tháng / Ngành)
                </label>
                <select
                  value={tier1Criteria.rsMin ?? 70}
                  onChange={(e) => setTier1Criteria({ ...tier1Criteria, rsMin: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="90">RS ≥ 90 (Top 10% thị trường)</option>
                  <option value="80">RS ≥ 80 (Top 20% thị trường)</option>
                  <option value="70">RS ≥ 70 (Top 30% thị trường)</option>
                  <option value="0">Tất cả RS</option>
                </select>
              </div>

              {/* Thanh khoản ADTV 20 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Thanh Khoản Bình Quân 20 Ngày (ADTV)
                </label>
                <select
                  value={tier1Criteria.adtvMinBillion ?? 5}
                  onChange={(e) => setTier1Criteria({ ...tier1Criteria, adtvMinBillion: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="20">ADTV ≥ 20 Tỷ VNĐ / phiên</option>
                  <option value="10">ADTV ≥ 10 Tỷ VNĐ / phiên</option>
                  <option value="5">ADTV ≥ 5 Tỷ VNĐ / phiên</option>
                  <option value="2">ADTV ≥ 2 Tỷ VNĐ / phiên</option>
                  <option value="0">Tất cả thanh khoản</option>
                </select>
              </div>

              {/* Tăng trưởng LNST Mẹ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Tăng Trưởng LNST Cổ Đông Mẹ (MRQ YoY)
                </label>
                <select
                  value={tier1Criteria.epsGrowthMinYoY ?? 20}
                  onChange={(e) => setTier1Criteria({ ...tier1Criteria, epsGrowthMinYoY: Number(e.target.value) || undefined })}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="100">LNST Mẹ ≥ +100% YoY</option>
                  <option value="50">LNST Mẹ ≥ +50% YoY</option>
                  <option value="20">LNST Mẹ ≥ +20% YoY</option>
                  <option value="0">Tất cả mức tăng trưởng</option>
                </select>
              </div>

              {/* Nút Kích Hoạt Quét */}
              <div className="flex items-end">
                <button
                  onClick={handleRunLiveMarketScreening}
                  disabled={isScanningLive}
                  className="flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  <Zap className={`h-4 w-4 ${isScanningLive ? 'animate-bounce' : ''}`} />
                  <span>{isScanningLive ? 'Đang Quét 2 Tầng...' : 'Bắt Đầu Quét Thị Trường 🚀'}</span>
                </button>
              </div>
            </div>

            {/* Scanning Progress Bar */}
            {isScanningLive && (
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 p-3 flex items-center space-x-3 animate-pulse">
                <RefreshCw className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-spin flex-shrink-0" />
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                  {liveScanProgress}
                </span>
              </div>
            )}

            {/* Live Scan Meta Summary */}
            {liveMeta && !isScanningLive && (
              <div className="flex flex-wrap items-center gap-3 text-xs bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Đã quét {liveMeta.totalMarketScanned}</span>
                </div>
                <span className="text-gray-400">•</span>
                <div>
                  Khớp điều kiện Tầng 1: <strong className="text-indigo-600 dark:text-indigo-400">{liveMeta.matchedCount} mã</strong> ({liveMeta.tier1DurationMs}ms)
                </div>
                <span className="text-gray-400">•</span>
                <div>
                  Chấm điểm chuyên sâu Tầng 2: <strong className="text-emerald-600 dark:text-emerald-400">{liveMeta.scoredCount} mã</strong> ({liveMeta.tier2DurationMs}ms)
                </div>
                <span className="text-gray-400">•</span>
                <div className="text-gray-500 dark:text-gray-400">
                  Tổng thời gian: {Math.round((liveMeta.totalDurationMs || 0) / 100) / 10}s
                </div>
              </div>
            )}
          </div>

        {/* KPI Stats Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mã Đang Xếp Hạng</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-heading">{stats.total}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Cổ phiếu</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Quét trực tiếp toàn thị trường (Vietcap API)
            </p>
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
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Sức khỏe + Tăng trưởng + Chất lượng</p>
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
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Sau khi bóc tách thu nhập 1 lần</p>
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
                        className={`flex items-center justify-center space-x-1.5 w-full py-1.5 rounded-lg text-xs font-semibold transition ${
                          savedReportTickers.has(champ.ticker.toUpperCase())
                            ? 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 hover:bg-amber-200 border border-amber-300/60 dark:border-amber-700/60 shadow-xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        {savedReportTickers.has(champ.ticker.toUpperCase()) ? (
                          <>
                            <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400 fill-amber-500/30 animate-pulse" />
                            <span>Xem Báo Cáo AI (0 Token)</span>
                          </>
                        ) : (
                          <>
                            <span>Phân tích chi tiết</span>
                            <ExternalLink className="h-3 w-3" />
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Multi-Criteria Filters Bar (Tầng 2 Filters) */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Bộ Lọc Nhanh & Tìm Kiếm Kết Quả
              </h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Tìm thấy <strong className="text-emerald-600 dark:text-emerald-400">{filteredRankings.length}</strong> / {activeRankings.length} mã
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã cổ phiếu hoặc tên công ty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Exchange Filter */}
            <div>
              <select
                value={exchangeFilter}
                onChange={(e) => setExchangeFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">Sàn: Tất cả (HSX, HNX, UPCOM)</option>
                <option value="HSX">Sàn HOSE (HSX)</option>
                <option value="HNX">Sàn HNX</option>
                <option value="UPCOM">Sàn UPCoM</option>
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
                <option value="ALL">RS (1T): Tất cả</option>
                <option value="90">RS ≥ 90 (Top 10%)</option>
                <option value="80">RS ≥ 80 (Top 20%)</option>
                <option value="70">RS ≥ 70 (Top 30%)</option>
              </select>
            </div>

            {/* Core Net Profit Growth */}
            <div>
              <select
                value={coreProfitFilter}
                onChange={(e) => setCoreProfitFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-medium"
              >
                <option value="ALL">LNST Core: Tất cả</option>
                <option value="100">LNST Core ≥ +100%</option>
                <option value="50">LNST Core ≥ +50%</option>
                <option value="20">LNST Core ≥ +20%</option>
                <option value="0">LNST Core &gt; 0% (Dương)</option>
              </select>
            </div>

            {/* Liquidity ADTV20 */}
            <div>
              <select
                value={liquidityFilter}
                onChange={(e) => setLiquidityFilter(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 py-2 px-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">GTGD 20N: Tất cả</option>
                <option value="50">GTGD ≥ 50 Tỷ / ngày</option>
                <option value="10">GTGD ≥ 10 Tỷ / ngày</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Ranking Table */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-xs overflow-hidden">
          {isLoading && activeRankings.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 mx-auto text-emerald-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                Đang tải & bóc tách dữ liệu tài chính chuyên sâu...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tự động tính toán điểm Sức khỏe tài chính, Chất lượng tăng trưởng và Chất lượng doanh nghiệp
              </p>
            </div>
          ) : sortedRankings.length === 0 ? (
            <div className="p-12 text-center">
              <Filter className="h-8 w-8 mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                Không tìm thấy mã cổ phiếu nào khớp với bộ lọc
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Vui lòng thử điều chỉnh lại các tiêu chí tìm kiếm hoặc thanh khoản
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setExchangeFilter('ALL');
                  setScoreTierFilter('ALL');
                  setCoreEpsFilter('ALL');
                  setCoreProfitFilter('ALL');
                  setLiquidityFilter('ALL');
                  setRsFilter('ALL');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          ) : (
            <>
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
                      onClick={() => handleSort('latestQuarter')}
                      className="py-3 px-3 font-semibold text-center cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Kỳ BCTC</span>
                        {sortField === 'latestQuarter' && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
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
                        <span>RS (1T)</span>
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
                  {paginatedRankings.map((item, index) => {
                    const globalIndex = pageSize === 'ALL' ? index : (validCurrentPage - 1) * pageSize + index;
                    const isTop1 = globalIndex === 0 && sortField === 'totalScore' && !sortAsc;
                    const isTop2 = globalIndex === 1 && sortField === 'totalScore' && !sortAsc;
                    const isTop3 = globalIndex === 2 && sortField === 'totalScore' && !sortAsc;

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
                              {globalIndex + 1}
                            </span>
                          )}
                        </td>

                        {/* Ticker & Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white font-heading">
                              {item.ticker}
                            </span>
                            {savedReportTickers.has(item.ticker.toUpperCase()) && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/30"
                                title="Đã có báo cáo phân tích AI sẵn trên server (xem ngay 0 token)"
                              >
                                <Sparkles className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                AI Sẵn
                              </span>
                            )}
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

                        {/* Kỳ BCTC */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              item.latestQuarter && item.latestQuarter.includes('Q2/2026')
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/50'
                            }`}
                            title={
                              item.latestQuarter && item.latestQuarter.includes('Q2/2026')
                                ? 'Đã có BCTC Q2/2026 mới nhất'
                                : `Kỳ cũ: ${item.latestQuarter || 'Chưa rõ'} (Chưa công bố BCTC mới)`
                            }
                          >
                            {item.latestQuarter || '—'}
                          </span>
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
                          <span className="font-bold text-slate-800 dark:text-gray-200">
                            {item.adtv20Billion}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-0.5">Tỷ</span>
                        </td>

                        {/* RS Rating */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              item.rsRating >= 90
                                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300/50'
                                : item.rsRating >= 80
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300/50'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/50'
                            }`}
                          >
                            RS {item.rsRating}
                          </span>
                        </td>

                        {/* Total Score / 150 */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                item.rankGrade === 'A+'
                                  ? 'bg-emerald-500 text-white'
                                  : item.rankGrade === 'A'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60'
                                  : item.rankGrade === 'B+'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300/60'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300/60'
                              }`}
                            >
                              {item.rankGrade}
                            </span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-heading">
                              {item.totalScore}
                            </span>
                            <span className="text-[10px] text-gray-400">/ 150</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${(item.totalScore / 150) * 100}%` }}
                            />
                          </div>
                        </td>

                        {/* Financial Health (50) */}
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-gray-300">
                          {item.financialHealthScore}
                        </td>

                        {/* Growth Quality (60) */}
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-gray-300">
                          {item.growthQualityScore}
                        </td>

                        {/* Business Quality (40) */}
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-gray-300">
                          {item.businessQualityScore}
                        </td>

                        {/* Core EPS Growth */}
                        <td className="py-3 px-3 text-right font-bold">
                          <span
                            className={
                              item.coreEpsGrowthYoY >= 50
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.coreEpsGrowthYoY >= 20
                                ? 'text-teal-600 dark:text-teal-400'
                                : item.coreEpsGrowthYoY > 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {item.coreEpsGrowthYoY > 0 ? `+${item.coreEpsGrowthYoY}%` : `${item.coreEpsGrowthYoY}%`}
                          </span>
                        </td>

                        {/* Core Net Profit Growth */}
                        <td className="py-3 px-3 text-right font-medium">
                          <span
                            className={
                              item.coreNetProfitGrowthYoY >= 50
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : item.coreNetProfitGrowthYoY > 0
                                ? 'text-slate-700 dark:text-gray-300'
                                : 'text-rose-500 dark:text-rose-400'
                            }
                          >
                            {item.coreNetProfitGrowthYoY > 0 ? `+${item.coreNetProfitGrowthYoY}%` : `${item.coreNetProfitGrowthYoY}%`}
                          </span>
                        </td>

                        {/* ROE */}
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-gray-300">
                          {item.roe > 0 ? `${item.roe}%` : '—'}
                        </td>

                        {/* Action / Jump Button */}
                        <td className="py-3 px-3 text-center">
                          <Link
                            href={`/?ticker=${item.ticker}`}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              savedReportTickers.has(item.ticker.toUpperCase())
                                ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-700 shadow-xs'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                            title={
                              savedReportTickers.has(item.ticker.toUpperCase())
                                ? 'Đã có báo cáo phân tích AI trên hệ thống, xem ngay 0 token'
                                : 'Bắt đầu phân tích AI'
                            }
                          >
                            {savedReportTickers.has(item.ticker.toUpperCase()) ? (
                              <>
                                <span>Báo Cáo AI</span>
                                <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500/30" />
                              </>
                            ) : (
                              <>
                                <span>Phân tích</span>
                                <Zap className="h-3 w-3 text-emerald-500" />
                              </>
                            )}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {sortedRankings.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-850/60 text-xs text-gray-600 dark:text-gray-400">
                {/* Thông tin số lượng hiển thị */}
                <div className="flex items-center space-x-1.5">
                  <span>
                    Hiển thị{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {pageSize === 'ALL'
                        ? `1 - ${sortedRankings.length}`
                        : `${(validCurrentPage - 1) * pageSize + 1} - ${Math.min(validCurrentPage * pageSize, sortedRankings.length)}`}
                    </strong>{' '}
                    trên tổng số{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {sortedRankings.length}
                    </strong>{' '}
                    mã cổ phiếu
                  </span>
                </div>

                {/* Tùy chọn kích thước trang & Nút điều hướng */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Dropdown số lượng mỗi trang */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">Mỗi trang:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPageSize(val === 'ALL' ? 'ALL' : Number(val));
                      }}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 px-2.5 text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                    >
                      <option value={50}>50 mã</option>
                      <option value={100}>100 mã</option>
                      <option value="ALL">Tất cả ({sortedRankings.length} mã)</option>
                    </select>
                  </div>

                  {/* Nút phân trang (chỉ hiện khi không chọn Tất cả và có > 1 trang) */}
                  {pageSize !== 'ALL' && totalPages > 1 && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={validCurrentPage === 1}
                        title="Về trang đầu"
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5 text-slate-700 dark:text-gray-300" />
                      </button>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={validCurrentPage === 1}
                        title="Trang trước"
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 text-slate-700 dark:text-gray-300" />
                      </button>

                      <span className="px-2 font-medium text-slate-700 dark:text-gray-300">
                        Trang <strong className="font-bold text-slate-900 dark:text-white">{validCurrentPage}</strong> / {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={validCurrentPage === totalPages}
                        title="Trang sau"
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-slate-700 dark:text-gray-300" />
                      </button>

                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={validCurrentPage === totalPages}
                        title="Đến trang cuối"
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronsRight className="h-3.5 w-3.5 text-slate-700 dark:text-gray-300" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </main>
    </div>
  );
}
