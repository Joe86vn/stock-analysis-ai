'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { EarningsRecord, ExchangeType } from '@/types/earnings';

export function LatestEarningsTable() {
  const [records, setRecords] = useState<EarningsRecord[]>([]);
  const [activePeriod, setActivePeriod] = useState<string>('Q3/2026');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Bộ lọc
  const [search, setSearch] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL');
  const [filterGrowthType, setFilterGrowthType] = useState<'ALL' | 'PAT_20' | 'REV_15' | 'HIGH_GROWTH'>('ALL');
  const [sortBy, setSortBy] = useState<'publishedAt' | 'patYoYPercent' | 'revenueYoYPercent' | 'ticker'>('publishedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal chuyển kỳ
  const [showRolloverModal, setShowRolloverModal] = useState<boolean>(false);
  const [nextPeriodInput, setNextPeriodInput] = useState<string>('Q4/2026');

  // Tải dữ liệu ban đầu
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/earnings/latest', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        setActivePeriod(data.activePeriod || 'Q3/2026');
        setUpdatedAt(data.updatedAt || '');
      }
    } catch (err) {
      console.error('Lỗi khi tải bảng KQKD:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Kích hoạt quét thủ công
  const handleScanManual = async () => {
    try {
      setScanning(true);
      setScanMessage('Đang quét BCTC Quý 3/2026 từ ngày 01/10/2026 trên UBCKNN (HOSE/HNX/UPCOM)... Quá trình có thể mất một vài phút.');
      const res = await fetch('/api/earnings/scan-ssc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: 10, limit: 50, fromDate: '01/10/2026' }),
      });
      const data = await res.json();
      if (data.success) {
        setScanMessage(data.message || `Đã hoàn tất quét: Số hóa thành công ${data.processedCount} BCTC Quý mới.`);
        await fetchRecords();
      } else {
        setScanMessage(`Lỗi quét: ${data.error}`);
      }
    } catch (err: any) {
      setScanMessage(`Lỗi kết nối: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  // Rollover kỳ báo cáo
  const handleRollover = async () => {
    if (!nextPeriodInput) return;
    try {
      const res = await fetch('/api/earnings/latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPeriod: nextPeriodInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRolloverModal(false);
        await fetchRecords();
        setScanMessage(data.message);
      }
    } catch (err: any) {
      alert(`Lỗi rollover: ${err.message}`);
    }
  };

  // Lọc và sắp xếp dữ liệu trên Client
  const filteredRecords = useMemo(() => {
    let list = [...records];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.ticker.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q)
      );
    }

    if (selectedExchange !== 'ALL') {
      list = list.filter((r) => r.exchange === selectedExchange);
    }

    if (filterGrowthType === 'PAT_20') {
      list = list.filter((r) => r.patYoYPercent !== null && r.patYoYPercent >= 20);
    } else if (filterGrowthType === 'REV_15') {
      list = list.filter((r) => r.revenueYoYPercent !== null && r.revenueYoYPercent >= 15);
    } else if (filterGrowthType === 'HIGH_GROWTH') {
      list = list.filter(
        (r) => (r.patYoYPercent || 0) >= 20 && (r.revenueYoYPercent || 0) >= 15
      );
    }

    list.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [records, search, selectedExchange, filterGrowthType, sortBy, sortOrder]);

  const formatVnd = (num: number) => {
    if (Math.abs(num) >= 1_000_000_000_000) {
      return (num / 1_000_000_000_000).toFixed(2) + ' nghìn tỷ';
    }
    if (Math.abs(num) >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1) + ' tỷ';
    }
    if (Math.abs(num) >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + ' tr';
    }
    return num.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              Cập Nhật Kết Quả Kinh Doanh Mới Nhất
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Kỳ: {activePeriod}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Dữ liệu tự động cào và số hóa từ Cổng UBCKNN (SSC) • Khối Sản xuất, Thương mại & Dịch vụ
            {updatedAt && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                (Cập nhật: {new Date(updatedAt).toLocaleTimeString('vi-VN')} {new Date(updatedAt).toLocaleDateString('vi-VN')})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Nút bấm quét thủ công */}
          <button
            onClick={handleScanManual}
            disabled={scanning}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all duration-200 ${
              scanning
                ? 'bg-emerald-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Đang quét SSC...' : 'Quét BCTC Mới Nhất'}</span>
          </button>

          {/* Nút chuyển kỳ */}
          <button
            onClick={() => setShowRolloverModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Lưu trữ kỳ hiện tại và mở kỳ mới"
          >
            <Archive className="h-4 w-4 text-gray-500" />
            <span className="hidden sm:inline">Chuyển Kỳ</span>
          </button>
        </div>
      </div>

      {/* Thông báo quét */}
      {scanMessage && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{scanMessage}</span>
          </div>
          <button
            onClick={() => setScanMessage(null)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
        {/* Tìm kiếm */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã CP hoặc Tên doanh nghiệp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Lọc Tăng trưởng nhanh */}
        <div className="md:col-span-4 flex items-center space-x-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterGrowthType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterGrowthType === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Tất cả ({records.length})
          </button>
          <button
            onClick={() => setFilterGrowthType('PAT_20')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterGrowthType === 'PAT_20'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            LNST &gt; 20%
          </button>
          <button
            onClick={() => setFilterGrowthType('REV_15')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterGrowthType === 'REV_15'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Doanh thu &gt; 15%
          </button>
          <button
            onClick={() => setFilterGrowthType('HIGH_GROWTH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterGrowthType === 'HIGH_GROWTH'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Tăng trưởng kép ⭐
          </button>
        </div>

        {/* Lọc Sàn */}
        <div className="md:col-span-2">
          <select
            value={selectedExchange}
            onChange={(e) => setSelectedExchange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Mọi sàn niêm yết</option>
            <option value="HOSE">Sàn HOSE</option>
            <option value="HNX">Sàn HNX</option>
            <option value="UPCOM">Sàn UPCOM</option>
          </select>
        </div>

        {/* Sắp xếp */}
        <div className="md:col-span-2">
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('_');
              setSortBy(f as any);
              setSortOrder(o as any);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="publishedAt_desc">Mới công bố nhất</option>
            <option value="patYoYPercent_desc">LNST tăng mạnh nhất</option>
            <option value="revenueYoYPercent_desc">Doanh thu tăng mạnh nhất</option>
            <option value="ticker_asc">Mã CP (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Bảng Dữ Liệu */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Mã CP</th>
                <th className="py-3 px-4">Doanh Nghiệp & Sàn</th>
                <th className="py-3 px-3 text-center">Kỳ Báo Cáo</th>
                <th className="py-3 px-4 text-right">Doanh Thu Thuần</th>
                <th className="py-3 px-3 text-center">Tăng Trưởng DT</th>
                <th className="py-3 px-4 text-right">Lợi Nhuận Sau Thuế</th>
                <th className="py-3 px-3 text-center">Tăng Trưởng LNST</th>
                <th className="py-3 px-3 text-center">Biên Lãi Gộp</th>
                <th className="py-3 px-3 text-center">Công Bố SSC</th>
                <th className="py-3 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Đang tải dữ liệu kết quả kinh doanh...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    Không tìm thấy doanh nghiệp nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isRevPos = (r.revenueYoYPercent || 0) > 0;
                  const isPatPos = (r.patYoYPercent || 0) > 0;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Mã CP */}
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                        <Link
                          href={`/chart?ticker=${r.ticker}`}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline decoration-dotted"
                          title="Mở biểu đồ kỹ thuật"
                        >
                          {r.ticker}
                        </Link>
                      </td>

                      {/* Tên DN & Sàn */}
                      <td className="py-3 px-4 max-w-xs truncate">
                        <div className="font-medium text-gray-900 dark:text-gray-200 truncate" title={r.companyName}>
                          {r.companyName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              r.exchange === 'HOSE'
                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                : r.exchange === 'HNX'
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {r.exchange}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {r.reportType === 'CONSOLIDATED' ? 'Hợp nhất' : 'Riêng lẻ'}
                          </span>
                        </div>
                      </td>

                      {/* Kỳ báo cáo */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {r.period}/{r.year}
                        </span>
                      </td>

                      {/* Doanh thu thuần */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatVnd(r.revenueCurrent)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Cùng kỳ: {formatVnd(r.revenuePrevious)}
                        </div>
                      </td>

                      {/* Tăng trưởng doanh thu YoY */}
                      <td className="py-3 px-3 text-center">
                        {r.revenueYoYPercent !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                              isRevPos
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isRevPos ? '+' : ''}
                            {r.revenueYoYPercent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Lợi nhuận sau thuế */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatVnd(r.patCurrent)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Cùng kỳ: {formatVnd(r.patPrevious)}
                        </div>
                      </td>

                      {/* Tăng trưởng LNST YoY */}
                      <td className="py-3 px-3 text-center">
                        {r.patYoYPercent !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                              isPatPos
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isPatPos ? '+' : ''}
                            {r.patYoYPercent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Biên lãi gộp */}
                      <td className="py-3 px-3 text-center">
                        {r.grossMarginCurrent !== null ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-200">
                              {r.grossMarginCurrent}%
                            </div>
                            {r.grossMarginDelta !== null && (
                              <div
                                className={`text-[10px] ${
                                  r.grossMarginDelta > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {r.grossMarginDelta > 0 ? '+' : ''}
                                {r.grossMarginDelta} pt
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Ngày công bố */}
                      <td className="py-3 px-3 text-center text-gray-500 dark:text-gray-400">
                        {r.publishedAt}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center">
                        <Link
                          href={`/analysis?ticker=${r.ticker}`}
                          className="inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                        >
                          Phân tích AI
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Rollover Kỳ */}
      {showRolloverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Chuyển Sang Kỳ Báo Cáo Mới
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Hành động này sẽ đóng gói toàn bộ bảng hiện tại (Kỳ <b>{activePeriod}</b>) vào thư mục lưu trữ lịch sử, và làm mới bảng để sẵn sàng tích lũy các doanh nghiệp công bố sớm của kỳ tiếp theo.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tên kỳ báo cáo mới:
              </label>
              <input
                type="text"
                value={nextPeriodInput}
                onChange={(e) => setNextPeriodInput(e.target.value)}
                placeholder="VD: Q4/2026 hoặc Q1/2027"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRolloverModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleRollover}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Xác nhận Chuyển Kỳ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
