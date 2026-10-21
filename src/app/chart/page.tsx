'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { StockChartPanel } from '@/components/StockChartPanel';
import { StockRankingItem } from '@/lib/filter-rs-data';
import { RefreshCw } from 'lucide-react';

function ChartViewInner() {
  const searchParams = useSearchParams();
  const urlTicker = searchParams.get('ticker');

  const [currentTicker, setCurrentTicker] = useState<string>('FPT');
  const [allStocks, setAllStocks] = useState<StockRankingItem[]>([]);
  const [currentStockData, setCurrentStockData] = useState<StockRankingItem | null>(null);

  // Khởi tạo ticker từ URL params hoặc localStorage
  useEffect(() => {
    if (urlTicker && urlTicker.trim()) {
      const formatted = urlTicker.trim().toUpperCase();
      setCurrentTicker(formatted);
      try {
        localStorage.setItem('valuex-last-chart-ticker', formatted);
      } catch {}
    } else {
      try {
        const stored = localStorage.getItem('valuex-last-chart-ticker');
        if (stored && stored.trim()) {
          setCurrentTicker(stored.trim().toUpperCase());
        }
      } catch {}
    }
  }, [urlTicker]);

  // Tải danh sách toàn bộ cổ phiếu thị trường (1.519 mã) để phục vụ tìm kiếm nhanh chuẩn TradingView
  useEffect(() => {
    const loadStockList = async () => {
      try {
        const res = await fetch('/api/stocks/watchlist-presets');
        if (res.ok) {
          const json = await res.json();
          const universe = json?.data?.universe || json?.data?.filter_75 || [];
          if (Array.isArray(universe) && universe.length > 0) {
            setAllStocks(universe);
            const matched = universe.find((s: StockRankingItem) => s.ticker === currentTicker);
            if (matched) {
              setCurrentStockData(matched);
            }
            return;
          }
        }

        // Fallback sang /api/ranking nếu API presets không phản hồi
        const fallbackRes = await fetch('/api/ranking');
        if (!fallbackRes.ok) return;
        const fallbackJson = await fallbackRes.json();
        if (fallbackJson.success && Array.isArray(fallbackJson.data)) {
          setAllStocks(fallbackJson.data);
          const matched = fallbackJson.data.find((s: StockRankingItem) => s.ticker === currentTicker);
          if (matched) {
            setCurrentStockData(matched);
          }
        }
      } catch (err) {
        console.warn('[ChartPage] Error loading stock list:', err);
      }
    };

    loadStockList();
  }, []);

  // Cập nhật currentStockData khi currentTicker hoặc allStocks thay đổi
  useEffect(() => {
    if (!currentTicker) return;

    if (allStocks.length > 0) {
      const matched = allStocks.find((s) => s.ticker === currentTicker);
      if (matched) {
        setCurrentStockData(matched);
        return;
      }
    }

    // Nếu mã không nằm trong danh sách cache, fetch thông tin riêng
    fetch(`/api/ranking?ticker=${currentTicker}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.item) {
          setCurrentStockData(json.item);
        }
      })
      .catch(() => {});
  }, [currentTicker, allStocks]);

  const handleSelectTicker = useCallback((newTicker: string) => {
    const formatted = newTicker.trim().toUpperCase();
    setCurrentTicker(formatted);
    try {
      localStorage.setItem('valuex-last-chart-ticker', formatted);
      window.history.replaceState(null, '', `/chart?ticker=${formatted}`);
    } catch {}

    const matched = allStocks.find((s) => s.ticker === formatted);
    if (matched) {
      setCurrentStockData(matched);
    }
  }, [allStocks]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19]">
      <Header />
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
        <StockChartPanel
          isStandalone={true}
          ticker={currentTicker}
          stockData={currentStockData}
          allStocks={allStocks}
          onSelectTicker={handleSelectTicker}
        />
      </main>
    </div>
  );
}

export default function ChartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F19]">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-3 text-sm text-gray-500 font-medium">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
              <span>Đang khởi tạo không gian biểu đồ kỹ thuật...</span>
            </div>
          </div>
        </div>
      }
    >
      <ChartViewInner />
    </Suspense>
  );
}
