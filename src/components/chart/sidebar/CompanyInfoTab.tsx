'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Calendar,
} from 'lucide-react';
import { DividendHistoryTab } from './DividendHistoryTab';

interface NewsItem {
  id: string;
  ticker?: string;
  industry?: string;
  title: string;
  summary?: string;
  sourceLink?: string;
  imageUrl?: string;
  updateDate?: string;
  sourceName?: string;
  sentiment?: 'Positive' | 'Negative' | 'Neutral' | string;
  sentimentScore?: number;
  slug?: string;
}

interface CompanyInfoTabProps {
  ticker: string;
}

type NewsScope = 'ticker' | 'market';
type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';
type MainSubTab = 'news' | 'dividends';

export const CompanyInfoTab: React.FC<CompanyInfoTabProps> = ({ ticker }) => {
  const [mainSubTab, setMainSubTab] = useState<MainSubTab>('news');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<NewsScope>('ticker');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [isFallbackToMarket, setIsFallbackToMarket] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setIsFallbackToMarket(false);

    const endpoint =
      scope === 'ticker'
        ? `/api/stocks/${ticker}/news`
        : `/api/stocks/${ticker}/news?general=true`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`Lỗi ${res.status}: Không thể tải tin tức`);
        return res.json();
      })
      .then((json) => {
        if (isCancelled) return;
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setNews(json.data);
          setIsLoading(false);
        } else if (scope === 'ticker') {
          // Fallback: mã không có tin riêng → tự động chuyển sang tin thị trường chung
          return fetch(`/api/stocks/${ticker}/news?general=true`)
            .then((r) => r.json())
            .then((fallbackJson) => {
              if (isCancelled) return;
              if (fallbackJson.success && Array.isArray(fallbackJson.data)) {
                setNews(fallbackJson.data);
                setIsFallbackToMarket(true);
              } else {
                setNews([]);
              }
              setIsLoading(false);
            });
        } else {
          setNews([]);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[CompanyInfoTab] fetch error:', err);
        setError(err.message || 'Lỗi kết nối đến Vietcap AI News');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [ticker, scope, retryCount]);

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const s = item.sentiment?.toLowerCase() || '';
      if (sentimentFilter === 'positive') return s === 'positive';
      if (sentimentFilter === 'negative') return s === 'negative';
      if (sentimentFilter === 'neutral') return s === 'neutral';
      return true;
    });
  }, [news, sentimentFilter]);

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr.slice(0, 16);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) return `${Math.max(1, diffMins)} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return dateStr.slice(0, 10);
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  return (
    <div className="flex flex-col h-full w-full select-none text-xs bg-white dark:bg-[#131722] font-sans">
      {/* ─── Sub-tab Navigation: Tin doanh nghiệp vs Cổ tức ─── */}
      <div className="px-3 pt-2 pb-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-[#1e222d]/90 flex items-center space-x-1.5 flex-shrink-0">
        <button
          onClick={() => setMainSubTab('news')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
            mainSubTab === 'news'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>Tin doanh nghiệp</span>
        </button>

        <button
          onClick={() => setMainSubTab('dividends')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
            mainSubTab === 'dividends'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Cổ tức</span>
        </button>
      </div>

      {mainSubTab === 'dividends' ? (
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <DividendHistoryTab ticker={ticker} />
        </div>
      ) : (
        <>
          {/* ─── Header: Phạm vi tin & Lọc cảm xúc (Sentiment) ─── */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1e222d]/70 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Newspaper className="w-4 h-4 text-cyan-500" />
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  Tin tức Doanh nghiệp & Thị trường
                </span>
              </div>

              {/* Toggle Phạm vi Tin */}
              <div className="flex items-center bg-gray-200/80 dark:bg-gray-800 p-0.5 rounded-lg text-[10.5px]">
                <button
                  onClick={() => setScope('ticker')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    scope === 'ticker'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ticker}
                </button>
                <button
                  onClick={() => setScope('market')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    scope === 'market'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Thị trường
                </button>
              </div>
            </div>

            {/* Filter Sentiment Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto text-[10.5px]">
              <button
                onClick={() => setSentimentFilter('all')}
                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
                  sentimentFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tất cả ({news.length})
              </button>

              <button
                onClick={() => setSentimentFilter('positive')}
                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
                  sentimentFilter === 'positive'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Tích cực
              </button>

              <button
                onClick={() => setSentimentFilter('negative')}
                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
                  sentimentFilter === 'negative'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                }`}
              >
                Tiêu cực
              </button>

              <button
                onClick={() => setSentimentFilter('neutral')}
                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex-shrink-0 ${
                  sentimentFilter === 'neutral'
                    ? 'bg-gray-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Trung lập
              </button>
            </div>
          </div>

          {/* ─── Danh Sách Bài Báo (Scrollable) ─── */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2.5">
            {/* Banner fallback: hiển thị khi mã không có tin, tự động chuyển sang tin thị trường */}
            {isFallbackToMarket && !isLoading && (
              <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10.5px] flex items-center space-x-2 flex-shrink-0">
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <span><span className="font-bold">{ticker}</span> chưa có tin riêng — đang hiển thị tin thị trường chung</span>
              </div>
            )}

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
                <span className="text-xs">Đang tải tin tức AI Vietcap...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                <div className="flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
                <button
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Thử lại</span>
                </button>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs space-y-2">
                <p>Không có tin tức nào phù hợp bộ lọc</p>
                {sentimentFilter !== 'all' && (
                  <button
                    onClick={() => setSentimentFilter('all')}
                    className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition cursor-pointer"
                  >
                    Xem tất cả tin
                  </button>
                )}
              </div>
            ) : (
              filteredNews.map((item) => {
                const isPositive = item.sentiment === 'Positive';
                const isNegative = item.sentiment === 'Negative';

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1e222d]/60 hover:border-gray-300 dark:hover:border-gray-700 transition space-y-2"
                  >
                    {/* Header thẻ: Ticker, Nguồn, Sentiment Badge */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center space-x-1.5 truncate">
                        {item.ticker && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold font-mono text-[10px]">
                            {item.ticker}
                          </span>
                        )}

                        <span className="text-[10px] font-semibold text-slate-700 dark:text-gray-300 truncate">
                          {item.sourceName || 'Tin thị trường'}
                        </span>

                        {/* Sentiment Badge */}
                        {isPositive ? (
                          <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[9.5px] font-bold font-mono">
                            <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                            <span>Tích cực {item.sentimentScore ? `(${item.sentimentScore})` : ''}</span>
                          </span>
                        ) : isNegative ? (
                          <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-md bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[9.5px] font-bold font-mono">
                            <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
                            <span>Tiêu cực {item.sentimentScore ? `(${item.sentimentScore})` : ''}</span>
                          </span>
                        ) : null}
                      </div>

                      <span className="text-[10px] text-gray-400 font-mono flex items-center space-x-1 flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatTimeAgo(item.updateDate)}</span>
                      </span>
                    </div>

                    {/* Tiêu đề bài báo */}
                    <a
                      href={item.sourceLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition leading-snug line-clamp-2 block cursor-pointer"
                    >
                      {item.title}
                    </a>

                    {/* Tóm tắt nội dung */}
                    {item.summary && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    )}

                    {/* Link nguồn chi tiết */}
                    {item.sourceLink && (
                      <div className="pt-1 flex items-center justify-end">
                        <a
                          href={item.sourceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <span>Xem bài gốc</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ─── Footer: Nguồn dữ liệu ─── */}
          <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e222d] flex items-center justify-between text-[10.5px] text-gray-400 flex-shrink-0">
            <span>Nguồn: Vietcap AI News Engine</span>
            <span className="font-mono text-[10px]">{scope === 'ticker' ? ticker : 'Toàn thị trường'}</span>
          </div>
        </>
      )}
    </div>
  );
};
