'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  RefreshCw,
  Search,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { EarningsRecord, ExchangeType } from '@/types/earnings';

export function LatestEarningsTable() {
  const [records, setRecords] = useState<EarningsRecord[]>([]);
  const [activePeriod, setActivePeriod] = useState<string>('Q3/2026');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Phân trang: Mặc định 50 mã / trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  // Bộ lọc cơ bản
  const [search, setSearch] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL');

  // Bộ lọc chuyên sâu linh hoạt (nhập giá trị cụ thể)
  const [minRevenueBillion, setMinRevenueBillion] = useState<string>(''); // Doanh thu >= X tỷ
  const [minRevenueYoY, setMinRevenueYoY] = useState<string>(''); // Tăng trưởng DT >= X %
  const [minPatBillion, setMinPatBillion] = useState<string>(''); // LNST >= X tỷ
  const [minPatYoY, setMinPatYoY] = useState<string>(''); // Tăng trưởng LNST >= X %
  const [minAdtv20, setMinAdtv20] = useState<string>(''); // GTGD 20P >= X tỷ/phiên
  const [minRs, setMinRs] = useState<string>(''); // RS >= X (0-99)

  const [sortBy, setSortBy] = useState<
    'publishedAt' | 'patYoYPercent' | 'revenueYoYPercent' | 'ticker' | 'patCurrent' | 'revenueCurrent' | 'adtv20Billion' | 'rsRating'
  >('publishedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Xử lý an toàn khi người dùng nhập hoặc ấn ESC trên input
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val || val === 'null' || val === 'undefined') {
        setter('');
      } else {
        setter(val);
      }
      setCurrentPage(1); // Reset về trang 1 khi lọc
    };
  };

  const handleInputKeyDown = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setter('');
        (e.target as HTMLInputElement).value = '';
        (e.target as HTMLInputElement).blur();
        setCurrentPage(1);
      }
    };
  };

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

  // Kích hoạt quét thông minh (Tự động nhận diện & Dừng sớm khi gặp tin cũ)
  const handleScanManual = async () => {
    let pollTimer: NodeJS.Timeout | null = null;
    try {
      setScanning(true);
      setScanMessage(
        `Đang kết nối Cổng UBCKNN... Hệ thống sẽ tự động quét và dừng ngay khi gặp các bản tin đã cập nhật.`
      );

      // Bật polling tiến độ thời gian thực
      pollTimer = setInterval(async () => {
        try {
          const sRes = await fetch('/api/earnings/scan-status');
          const sData = await sRes.json();
          if (sData.success && sData.progress) {
            const p = sData.progress;
            if (p.isScanning) {
              setScanMessage(`[Trang ${p.page || 1}] ${p.currentStep} (Đã số hóa: ${p.processedCount || 0})`);
            }
          }
        } catch {}
      }, 1500);

      const res = await fetch('/api/earnings/scan-ssc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: 5, limit: 50 }),
      });
      const data = await res.json();
      if (data.success) {
        setScanMessage(
          data.message || `Đã hoàn tất quét: Số hóa thành công ${data.processedCount} BCTC Quý mới.`
        );
        await fetchRecords();
      } else {
        setScanMessage(`Lỗi quét: ${data.error}`);
      }
    } catch (err: any) {
      setScanMessage(`Lỗi kết nối: ${err.message}`);
    } finally {
      if (pollTimer) clearInterval(pollTimer);
      setScanning(false);
    }
  };

  // Lọc và sắp xếp dữ liệu trên Client
  const filteredRecords = useMemo(() => {
    let list = [...records];

    // 1. Tìm kiếm theo mã hoặc tên
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.ticker.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q)
      );
    }

    // 2. Lọc sàn
    if (selectedExchange !== 'ALL') {
      list = list.filter((r) => r.exchange === selectedExchange);
    }

    // 3. Lọc Doanh thu giá trị tuyệt đối (nhập tỷ VNĐ)
    const revBillionNum = parseFloat(minRevenueBillion);
    if (!isNaN(revBillionNum) && revBillionNum > 0) {
      list = list.filter((r) => r.revenueCurrent >= revBillionNum * 1_000_000_000);
    }

    // 4. Lọc Tăng trưởng Doanh thu %
    const revYoYNum = parseFloat(minRevenueYoY);
    if (!isNaN(revYoYNum)) {
      list = list.filter((r) => r.revenueYoYPercent !== null && r.revenueYoYPercent >= revYoYNum);
    }

    // 5. Lọc LNST giá trị tuyệt đối (nhập tỷ VNĐ)
    const patBillionNum = parseFloat(minPatBillion);
    if (!isNaN(patBillionNum) && patBillionNum > 0) {
      list = list.filter((r) => r.patCurrent >= patBillionNum * 1_000_000_000);
    }

    // 6. Lọc Tăng trưởng LNST %
    const patYoYNum = parseFloat(minPatYoY);
    if (!isNaN(patYoYNum)) {
      list = list.filter((r) => r.patYoYPercent !== null && r.patYoYPercent >= patYoYNum);
    }

    // 7. Lọc GTGD 20 phiên (nhập tỷ VNĐ/phiên)
    const adtvNum = parseFloat(minAdtv20);
    if (!isNaN(adtvNum) && adtvNum > 0) {
      list = list.filter((r) => (r.adtv20Billion ?? 0) >= adtvNum);
    }

    // 8. Lọc Sức mạnh giá RS Rating (nhập điểm 0-99)
    const rsNum = parseFloat(minRs);
    if (!isNaN(rsNum) && rsNum > 0) {
      list = list.filter((r) => (r.rsRating ?? 0) >= rsNum);
    }

    // 9. Sắp xếp
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
  }, [
    records,
    search,
    selectedExchange,
    minRevenueBillion,
    minRevenueYoY,
    minPatBillion,
    minPatYoY,
    minAdtv20,
    minRs,
    sortBy,
    sortOrder,
  ]);

  // Phân trang: Mặc định 50 mã / trang
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const hasActiveAdvancedFilters =
    Boolean(minRevenueBillion) ||
    Boolean(minRevenueYoY) ||
    Boolean(minPatBillion) ||
    Boolean(minPatYoY) ||
    Boolean(minAdtv20) ||
    Boolean(minRs) ||
    selectedExchange !== 'ALL' ||
    Boolean(search.trim());

  const resetAdvancedFilters = () => {
    setSearch('');
    setSelectedExchange('ALL');
    setMinRevenueBillion('');
    setMinRevenueYoY('');
    setMinPatBillion('');
    setMinPatYoY('');
    setMinAdtv20('');
    setMinRs('');
    setCurrentPage(1);
  };

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
    <div className="space-y-5">
      {/* Top Banner / Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              Cập Nhật Kết Quả Kinh Doanh Mới Nhất
            </h1>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              title="Kỳ báo cáo tự động xác định theo quý gần nhất trước đó"
            >
              Kỳ: {activePeriod} (Tự động)
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
            title="Tự động quét Cổng UBCKNN và dừng ngay khi gặp các báo cáo đã cập nhật"
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all duration-200 ${
              scanning
                ? 'bg-emerald-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Đang quét SSC...' : 'Quét BCTC Mới'}</span>
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

      {/* Thanh Bộ Lọc & Tìm Kiếm Hợp Nhất (Có nhãn rõ ràng phía trên mỗi tiêu chí) */}
      <div
        translate="no"
        className="notranslate p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 shadow-xs"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 items-end text-xs">
          {/* 1. Ô Tìm kiếm Mã CP */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1 truncate select-none">
              <Search className="h-3 w-3 text-emerald-500 shrink-0" />
              <span>Tìm Mã CP</span>
            </label>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Mã hoặc tên..."
                translate="no"
                autoComplete="off"
                spellCheck={false}
                value={search || ''}
                onChange={handleInputChange(setSearch)}
                onKeyDown={handleInputKeyDown(setSearch)}
                title="Tìm theo Mã cổ phiếu hoặc từ khóa tên doanh nghiệp"
                className="notranslate w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase font-semibold"
              />
            </div>
          </div>

          {/* 2. Lọc Sàn */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 truncate select-none">
              Sàn Niêm Yết
            </label>
            <div className="w-full">
              <select
                value={selectedExchange}
                onChange={(e) => {
                  setSelectedExchange(e.target.value);
                  setCurrentPage(1);
                }}
                className="notranslate w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="ALL">Mọi sàn ({records.length})</option>
                <option value="HOSE">Sàn HOSE</option>
                <option value="HNX">Sàn HNX</option>
                <option value="UPCOM">Sàn UPCOM</option>
              </select>
            </div>
          </div>

          {/* 3. Doanh thu >= X tỷ */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 truncate select-none" title="Doanh thu thuần tối thiểu">
              Doanh Thu ≥
            </label>
            <div className="relative w-full">
              <input
                type="number"
                step="any"
                placeholder="Tối thiểu"
                translate="no"
                autoComplete="off"
                spellCheck={false}
                value={minRevenueBillion || ''}
                onChange={handleInputChange(setMinRevenueBillion)}
                onKeyDown={handleInputKeyDown(setMinRevenueBillion)}
                title="Doanh thu thuần tối thiểu (tỷ VNĐ)"
                className="notranslate w-full px-2.5 py-2 pr-7 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <span className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none">tỷ</span>
            </div>
          </div>

          {/* 4. Tăng trưởng DT >= X % */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 truncate select-none" title="Tăng trưởng doanh thu YoY tối thiểu">
              Tăng DT YoY ≥
            </label>
            <div className="relative w-full">
              <input
                type="number"
                step="any"
                placeholder="Tối thiểu"
                translate="no"
                autoComplete="off"
                spellCheck={false}
                value={minRevenueYoY || ''}
                onChange={handleInputChange(setMinRevenueYoY)}
                onKeyDown={handleInputKeyDown(setMinRevenueYoY)}
                title="Tăng trưởng doanh thu cùng kỳ tối thiểu (%)"
                className="notranslate w-full px-2.5 py-2 pr-6 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <span className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none">%</span>
            </div>
          </div>

          {/* 5. LNST >= X tỷ */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 truncate select-none" title="Lợi nhuận sau thuế tối thiểu">
              LNST ≥
            </label>
            <div className="relative w-full">
              <input
                type="number"
                step="any"
                placeholder="Tối thiểu"
                translate="no"
                autoComplete="off"
                spellCheck={false}
                value={minPatBillion || ''}
                onChange={handleInputChange(setMinPatBillion)}
                onKeyDown={handleInputKeyDown(setMinPatBillion)}
                title="Lợi nhuận sau thuế tối thiểu (tỷ VNĐ)"
                className="notranslate w-full px-2.5 py-2 pr-7 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <span className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none">tỷ</span>
            </div>
          </div>

          {/* 6. Tăng trưởng LNST >= X % */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 truncate select-none" title="Tăng trưởng LNST YoY tối thiểu">
              Tăng LNST YoY ≥
            </label>
            <div className="relative w-full">
              <input
                type="number"
                step="any"
                placeholder="Tối thiểu"
                translate="no"
                autoComplete="off"
                spellCheck={false}
                value={minPatYoY || ''}
                onChange={handleInputChange(setMinPatYoY)}
                onKeyDown={handleInputKeyDown(setMinPatYoY)}
                title="Tăng trưởng LNST cùng kỳ tối thiểu (%)"
                className="notranslate w-full px-2.5 py-2 pr-6 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <span className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none">%</span>
            </div>
          </div>

          {/* 7. GTGD 20P >= X tỷ */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 truncate select-none" title="Giá trị giao dịch trung bình 20 phiên tối thiểu">
              GTGD 20P ≥
            </label>
            <div className="relative w-full">
              <input
                type="number"
                step="any"
                placeholder="Tối thiểu"
                translate="no"
                autoComplete="off"
                spellCheck={false}
                value={minAdtv20 || ''}
                onChange={handleInputChange(setMinAdtv20)}
                onKeyDown={handleInputKeyDown(setMinAdtv20)}
                title="Giá trị giao dịch trung bình 20 phiên tối thiểu (tỷ VNĐ/phiên)"
                className="notranslate w-full px-2.5 py-2 pr-7 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <span className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none">tỷ</span>
            </div>
          </div>

          {/* 8. RS Rating >= X */}
          <div className="flex flex-col w-full">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5 truncate select-none" title="Chỉ số sức mạnh giá RS tối thiểu (0-99)">
              RS Rating ≥
            </label>
            <div className="relative w-full">
              <input
                type="number"
                step="any"
                placeholder="Tối thiểu"
                translate="no"
                autoComplete="off"
                spellCheck={false}
                value={minRs || ''}
                onChange={handleInputChange(setMinRs)}
                onKeyDown={handleInputKeyDown(setMinRs)}
                title="Chỉ số sức mạnh giá RS tối thiểu (0-99)"
                className="notranslate w-full px-2.5 py-2 pr-10 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <span className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none">điểm</span>
            </div>
          </div>
        </div>

        {/* Thanh trạng thái lọc nếu có điều kiện active */}
        {hasActiveAdvancedFilters && (
          <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Đang lọc: Tìm thấy <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{filteredRecords.length}</strong> / {records.length} mã thỏa mãn
            </span>
            <button
              onClick={resetAdvancedFilters}
              className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* Bảng Dữ Liệu */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleSort('ticker')}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[7%]"
                >
                  <div className="flex items-center gap-1">
                    Mã CP
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-3 w-[22%]">Doanh Nghiệp & Sàn</th>
                <th className="py-3 px-2 text-center w-[7%]">Kỳ BCTC</th>
                <th
                  onClick={() => handleSort('revenueCurrent')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[11%]"
                >
                  <div className="flex items-center justify-end gap-1">
                    Doanh Thu
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revenueYoYPercent')}
                  className="py-3 px-2 text-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[9%]"
                >
                  <div className="flex items-center justify-center gap-1">
                    Tăng DT
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('patCurrent')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[11%]"
                >
                  <div className="flex items-center justify-end gap-1">
                    LNST
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('patYoYPercent')}
                  className="py-3 px-2 text-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[9%]"
                >
                  <div className="flex items-center justify-center gap-1">
                    Tăng LNST
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                {/* Cột Sức mạnh giá RS */}
                <th
                  onClick={() => handleSort('rsRating')}
                  className="py-3 px-2 text-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[5%]"
                  title="Sức mạnh giá tương đối (RS 0 - 99 theo O'Neil)"
                >
                  <div className="flex items-center justify-center gap-1">
                    RS
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                {/* Cột GTGD bình quân 20 phiên */}
                <th
                  onClick={() => handleSort('adtv20Billion')}
                  className="py-3 px-2 text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[8%]"
                  title="Giá trị giao dịch trung bình 20 phiên gần nhất"
                >
                  <div className="flex items-center justify-end gap-1">
                    GTGD 20P
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-[9%]">Biên Lãi Gộp</th>
                <th
                  onClick={() => handleSort('publishedAt')}
                  className="py-3 px-2 text-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none w-[8%]"
                >
                  <div className="flex items-center justify-center gap-1">
                    Công Bố SSC
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-[7%]">BCTC Gốc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Đang tải dữ liệu kết quả kinh doanh...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    Không tìm thấy doanh nghiệp nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                pagedRecords.map((r) => {
                  const isRevPos = (r.revenueYoYPercent || 0) > 0;
                  const isPatPos = (r.patYoYPercent || 0) > 0;
                  const rs = r.rsRating;
                  const adtv = r.adtv20Billion;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Mã CP */}
                      <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        <Link
                          href={`/analysis?ticker=${r.ticker}`}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline decoration-dotted font-extrabold tracking-tight"
                          title={`Xem Phân tích AI & Biểu đồ kỹ thuật ${r.ticker}`}
                        >
                          {r.ticker}
                        </Link>
                      </td>

                      {/* Tên DN & Sàn */}
                      <td className="py-2.5 px-3 max-w-[200px] truncate">
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
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {r.period}/{r.year}
                        </span>
                      </td>

                      {/* Doanh thu thuần */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatVnd(r.revenueCurrent)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Cùng kỳ: {formatVnd(r.revenuePrevious)}
                        </div>
                      </td>

                      {/* Tăng trưởng doanh thu YoY */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
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
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatVnd(r.patCurrent)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Cùng kỳ: {formatVnd(r.patPrevious)}
                        </div>
                      </td>

                      {/* Tăng trưởng LNST YoY */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
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

                      {/* RS Rating */}
                      <td className="py-2.5 px-2 text-center font-bold whitespace-nowrap">
                        {typeof rs === 'number' && rs > 0 ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              rs >= 80
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : rs >= 70
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                : rs >= 50
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}
                            title={`RS Rating: ${rs}/99`}
                          >
                            {rs}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* GTGD 20 Phiên (Tỷ VNĐ) */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        {typeof adtv === 'number' && adtv > 0 ? (
                          <span
                            className={`font-medium ${
                              adtv >= 10
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : adtv >= 5
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                            title={`Thanh khoản bình quân 20 phiên: ${adtv.toFixed(2)} tỷ/phiên`}
                          >
                            {adtv >= 1 ? `${adtv.toFixed(1)} tỷ` : `${(adtv * 1000).toFixed(0)} tr`}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Biên lãi gộp */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
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
                      <td className="py-2.5 px-2 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {r.publishedAt}
                      </td>

                      {/* Mở đọc BCTC gốc trực tiếp */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <a
                          href={`/api/earnings/pdf/${encodeURIComponent(r.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
                          title={`Mở xem văn bản PDF BCTC gốc của ${r.ticker}`}
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Xem PDF</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang (Pagination) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs">
          <div className="text-gray-500 dark:text-gray-400">
            Hiển thị <strong className="text-gray-900 dark:text-gray-100">{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> -{' '}
            <strong className="text-gray-900 dark:text-gray-100">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </strong>{' '}
            trong tổng số <strong className="text-gray-900 dark:text-gray-100">{filteredRecords.length}</strong> doanh nghiệp (Kỳ {activePeriod})
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang đầu"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Danh sách số trang */}
              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && page - prev > 1;

                    return (
                      <React.Fragment key={page}>
                        {hasGap && <span className="px-1 text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang tiếp"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang cuối"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

