'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Gift,
  Coins,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface DividendEvent {
  id: string;
  ticker: string;
  eventNameVi: string;
  eventNameEn?: string;
  eventCode: string; // 'DIV' | 'ISS'
  eventTitleVi: string;
  eventTitleEn?: string;
  exrightDate?: string;
  recordDate?: string;
  publicDate?: string;
  displayDate1?: string;
  displayDate2?: string;
  exerciseRatio?: number;
  category?: string;
  isUpcoming?: boolean;
}

interface DividendHistoryTabProps {
  ticker: string;
}

type FilterType = 'all' | 'cash' | 'stock' | 'upcoming';

export const DividendHistoryTab: React.FC<DividendHistoryTabProps> = ({ ticker }) => {
  const [events, setEvents] = useState<DividendEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!ticker) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/stocks/${ticker}/events`)
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải dữ liệu sự kiện cổ tức');
        return res.json();
      })
      .then((json) => {
        if (isCancelled) return;
        if (json.success && Array.isArray(json.data)) {
          setEvents(json.data);
        } else {
          setEvents([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[DividendHistoryTab] fetch error:', err);
        setError(err.message || 'Lỗi tải dữ liệu');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [ticker]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const isCash =
        ev.eventTitleVi?.toLowerCase().includes('tiền mặt') ||
        ev.eventNameVi?.toLowerCase().includes('tiền mặt');
      const isStock =
        ev.eventTitleVi?.toLowerCase().includes('cổ phiếu') ||
        ev.eventCode === 'ISS' ||
        ev.eventNameVi?.toLowerCase().includes('cổ phiếu') ||
        ev.eventNameVi?.toLowerCase().includes('thưởng');

      if (activeFilter === 'cash') return isCash;
      if (activeFilter === 'stock') return isStock;
      if (activeFilter === 'upcoming') return ev.isUpcoming;
      return true;
    });
  }, [events, activeFilter]);

  const stats = useMemo(() => {
    const upcomingCount = events.filter((e) => e.isUpcoming).length;
    const cashCount = events.filter(
      (e) =>
        e.eventTitleVi?.toLowerCase().includes('tiền mặt') ||
        e.eventNameVi?.toLowerCase().includes('tiền mặt')
    ).length;
    const stockCount = events.filter(
      (e) =>
        e.eventTitleVi?.toLowerCase().includes('cổ phiếu') ||
        e.eventCode === 'ISS' ||
        e.eventNameVi?.toLowerCase().includes('cổ phiếu')
    ).length;

    return { total: events.length, upcomingCount, cashCount, stockCount };
  }, [events]);

  const formatDate = (dStr?: string) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr.slice(0, 10);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dStr.slice(0, 10);
    }
  };

  return (
    <div className="flex flex-col h-full w-full select-none text-xs bg-white dark:bg-[#131722] font-sans">
      {/* ─── Header & Thống Kê Nhanh ─── */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1e222d]/70 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="font-extrabold text-slate-900 dark:text-white text-xs">
              Lịch sử Cổ tức & Phát hành ({ticker})
            </span>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200/70 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
            {events.length} sự kiện
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-[10.5px]">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ({events.length})
          </button>

          {stats.upcomingCount > 0 && (
            <button
              onClick={() => setActiveFilter('upcoming')}
              className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
                activeFilter === 'upcoming'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100'
              }`}
            >
              ⭐ Sắp tới ({stats.upcomingCount})
            </button>
          )}

          <button
            onClick={() => setActiveFilter('cash')}
            className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
              activeFilter === 'cash'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tiền mặt ({stats.cashCount})
          </button>

          <button
            onClick={() => setActiveFilter('stock')}
            className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
              activeFilter === 'stock'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Cổ phiếu ({stats.stockCount})
          </button>
        </div>
      </div>

      {/* ─── Danh Sách Sự Kiện (Scrollable) ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2.5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-xs">Đang tải lịch sử cổ tức Vietcap...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 mb-1" />
            {error}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            Không có sự kiện cổ tức nào phù hợp
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isCash =
              ev.eventTitleVi?.toLowerCase().includes('tiền mặt') ||
              ev.eventNameVi?.toLowerCase().includes('tiền mặt');
            const isStock =
              ev.eventTitleVi?.toLowerCase().includes('cổ phiếu') ||
              ev.eventCode === 'ISS' ||
              ev.eventNameVi?.toLowerCase().includes('cổ phiếu') ||
              ev.eventNameVi?.toLowerCase().includes('thưởng');

            return (
              <div
                key={ev.id}
                className={`p-3 rounded-xl border transition space-y-2 ${
                  ev.isUpcoming
                    ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80 shadow-xs'
                    : 'bg-white dark:bg-[#1e222d]/60 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {/* Badge hàng đầu */}
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center space-x-1.5">
                    {isCash ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                        <Coins className="w-3 h-3 text-emerald-500" />
                        <span>Tiền mặt</span>
                      </span>
                    ) : isStock ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                        <Gift className="w-3 h-3 text-blue-500" />
                        <span>Cổ phiếu</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                        {ev.eventNameVi}
                      </span>
                    )}

                    {ev.isUpcoming && (
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 text-[9.5px] font-extrabold animate-pulse font-mono">
                        SẮP TỚI
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-gray-400 font-mono">
                    Công bố: {formatDate(ev.publicDate)}
                  </span>
                </div>

                {/* Tiêu đề sự kiện */}
                <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                  {ev.eventTitleVi}
                </div>

                {/* Mốc thời gian */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800/80 text-[10.5px] font-mono">
                  <div className="space-y-0.5">
                    <span className="text-gray-400 text-[10px]">Ngày GDKHQ:</span>
                    <div className="font-bold text-slate-800 dark:text-gray-200">
                      {formatDate(ev.exrightDate)}
                    </div>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <span className="text-gray-400 text-[10px]">Ngày ĐKCC:</span>
                    <div className="font-bold text-slate-800 dark:text-gray-200">
                      {formatDate(ev.recordDate)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Footer: Nguồn dữ liệu ─── */}
      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e222d] flex items-center justify-between text-[10.5px] text-gray-400 flex-shrink-0">
        <span>Nguồn: Vietcap IQ Events</span>
        <span className="font-mono text-[10px]">{ticker}</span>
      </div>
    </div>
  );
};
