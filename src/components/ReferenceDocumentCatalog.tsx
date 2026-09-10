'use client';

import React, { useState, useEffect } from 'react';
import {
  ReferenceDocumentCatalogData,
  UploadedFile,
  AnnualReportItem,
  QuarterlyBCTCItem,
  AGMResolutionItem,
  BrokerReportItem,
  GoogleAiInsightData,
} from '@/types/analysis';
import { getReferenceDocumentCatalog } from '@/lib/crawl-report-service';
import {
  FileText,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  CheckSquare,
  Square,
  Building2,
  PieChart,
  Landmark,
  FileCheck,
  Globe,
  Newspaper,
} from 'lucide-react';

interface ReferenceDocumentCatalogProps {
  ticker: string;
  onSelectDocumentsForAnalysis: (files: UploadedFile[]) => void;
}

export function ReferenceDocumentCatalog({
  ticker,
  onSelectDocumentsForAnalysis,
}: ReferenceDocumentCatalogProps) {
  const [catalog, setCatalog] = useState<ReferenceDocumentCatalogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUrls, setSelectedUrls] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  // Google AI Search Grounding state
  const [googleAiInsights, setGoogleAiInsights] = useState<GoogleAiInsightData | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [includeGoogleInsight, setIncludeGoogleInsight] = useState(true);

  const [activeCatalogTab, setActiveCatalogTab] = useState<
    'annual' | 'quarterly' | 'agm' | 'broker' | 'google_insight'
  >('annual');

  useEffect(() => {
    fetchCatalog();
    fetchGoogleInsights();
  }, [ticker]);

  const fetchGoogleInsights = async () => {
    setIsLoadingGoogle(true);
    try {
      const res = await fetch(`/api/stocks/${ticker}/google-insights`);
      if (res.ok) {
        const data = await res.json();
        setGoogleAiInsights(data);
      }
    } catch (err) {
      console.warn('Failed to fetch google insights:', err);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const data = await getReferenceDocumentCatalog(ticker);
      setCatalog(data);

      // Quy tắc chọn mặc định: Đúng 8 tài liệu tinh gọn
      // 1. Chọn 2 BCTN gần nhất
      const initialSelected: Record<string, boolean> = {};
      data.documents.annualReports.slice(0, 2).forEach((item) => {
        initialSelected[item.downloadUrl] = true;
      });

      // 2. KHÔNG chọn BCTC hợp nhất mặc định (đã có sẵn số liệu chuẩn từ Vietcap IQ API)
      // Vẫn giữ trong Catalog để người dùng tự tick chọn thủ công nếu muốn.

      // 3. Chọn 1 NQ ĐHCĐ năm gần nhất
      if (data.documents.agmResolution) {
        initialSelected[data.documents.agmResolution.downloadUrl] = true;
      }

      // 4. Chọn tối đa 5 Báo cáo CTCK mới nhất
      data.documents.brokerReports.slice(0, 5).forEach((item) => {
        initialSelected[item.downloadUrl] = true;
      });

      setSelectedUrls(initialSelected);
    } catch (err) {
      console.error('Failed to load reference catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectUrl = (url: string) => {
    setSelectedUrls((prev) => ({
      ...prev,
      [url]: !prev[url],
    }));
  };

  const handleApplyToAnalysis = async () => {
    if (!catalog) return;

    setIsDownloading(true);
    const filesToUpload: UploadedFile[] = [];

    // Gather selected documents first
    const itemsToDownload: { url: string; type: string; id: string; label: string; size: number }[] = [];

    // BCTN
    catalog.documents.annualReports.forEach((item) => {
      if (selectedUrls[item.downloadUrl]) {
        itemsToDownload.push({
          url: item.downloadUrl,
          type: 'BCTN',
          id: `bctn-${item.year}-${ticker}`,
          label: `${item.label}.pdf`,
          size: 1024 * 1024 * 5,
        });
      }
    });

    // BCTC
    catalog.documents.quarterlyFinancials.forEach((item) => {
      if (selectedUrls[item.downloadUrl]) {
        itemsToDownload.push({
          url: item.downloadUrl,
          type: 'BCTC',
          id: `bctc-q${item.quarter}-${item.year}-${ticker}`,
          label: `${item.label}.pdf`,
          size: 1024 * 1024 * 3,
        });
      }
    });

    // AGM
    if (
      catalog.documents.agmResolution &&
      selectedUrls[catalog.documents.agmResolution.downloadUrl]
    ) {
      const agm = catalog.documents.agmResolution;
      itemsToDownload.push({
        url: agm.downloadUrl,
        type: 'NGHI_QUYET_DHCD',
        id: `agm-${agm.year}-${ticker}`,
        label: `${agm.label}.pdf`,
        size: 1024 * 1024 * 2,
      });
    }

    // Broker Reports
    catalog.documents.brokerReports.forEach((item) => {
      if (selectedUrls[item.downloadUrl]) {
        itemsToDownload.push({
          url: item.downloadUrl,
          type: 'BROKER_REPORT',
          id: `broker-${item.id}-${ticker}`,
          label: `${item.source} - ${item.title}.pdf`,
          size: 1024 * 1024 * 4,
        });
      }
    });

    const total = itemsToDownload.length;

    // Download and parse one by one (or in parallel) to get the contents
    for (let i = 0; i < total; i++) {
      const item = itemsToDownload[i];
      setDownloadProgress(`Tải & trích xuất ${i + 1}/${total} tài liệu...`);

      let content = '';
      try {
        const response = await fetch(
          `/api/analysis/download-pdf?url=${encodeURIComponent(item.url)}&ticker=${ticker}&type=${item.type}`
        );
        if (response.ok) {
          const data = await response.json();
          content = data.text || '';
        } else {
          console.warn(`Failed to download ${item.label}`);
        }
      } catch (err) {
        console.error(`Error downloading ${item.label}:`, err);
      }

      filesToUpload.push({
        id: item.id,
        name: item.label,
        size: item.size,
        type: item.type as any,
        sourceUrl: item.url,
        isAutoFetched: true,
        content: content || `Lỗi tải tài liệu: ${item.label}`,
      });
    }

    // Bổ sung dữ liệu thời sự & triển vọng từ Google AI nếu được chọn
    if (includeGoogleInsight && googleAiInsights) {
      const citationsFormatted =
        googleAiInsights.citations && googleAiInsights.citations.length > 0
          ? googleAiInsights.citations
              .map((c) => `- [${c.title}](${c.url}) - Nguồn: ${c.domain || 'Báo chí'}`)
              .join('\n')
          : 'Nguồn: Google Search Real-time';

      filesToUpload.push({
        id: `google-insight-${ticker}`,
        name: `Triển Vọng Google AI - ${ticker}.txt`,
        size: 1024 * 12,
        type: 'GOOGLE_INSIGHT',
        sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(googleAiInsights.query)}`,
        isAutoFetched: true,
        content: `--- DỮ LIỆU THỜI SỰ & TRIỂN VỌNG DO GOOGLE AI GROUNDING THU THẬP ---\nTừ khóa tìm kiếm: "${googleAiInsights.query}"\nThời điểm tạo: ${googleAiInsights.generatedAt}\n\nTỔNG QUAN NỘI DUNG:\n${googleAiInsights.overview}\n\nCÁC NGUỒN BÁO CHÍ THAM CHIẾU:\n${citationsFormatted}`,
      });
    }

    setIsDownloading(false);
    setDownloadProgress('');
    onSelectDocumentsForAnalysis(filesToUpload);
  };

  const countSelected = Object.values(selectedUrls).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-emerald-500/20 bg-white dark:bg-[#111827] p-4 shadow-sm dark:shadow-xl space-y-3 transition-colors duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                Tài Liệu Tham Khảo Tự Động ({ticker})
              </h3>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                {countSelected} Đã Chọn
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              Tổng hợp link tải chuẩn từ <span className="text-amber-600 dark:text-amber-400 font-medium">cafef.vn</span>,{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">vietstock.vn</span> &amp;{' '}
              <span className="text-blue-600 dark:text-blue-400 font-medium">simplize.vn</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchCatalog}
          disabled={isLoading}
          className="flex items-center space-x-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 text-[11px] text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Crawl Lại</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-medium text-slate-600 dark:text-gray-300">
            Đang tìm kiếm &amp; kiểm tra link tài liệu cho {ticker}...
          </p>
        </div>
      ) : catalog ? (
        <div className="space-y-3">
          {/* Horizontal Compact Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-2">
            <button
              onClick={() => setActiveCatalogTab('annual')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeCatalogTab === 'annual'
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-900 text-slate-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>BCTN ({catalog.documents.annualReports.length})</span>
            </button>

            <button
              onClick={() => setActiveCatalogTab('quarterly')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeCatalogTab === 'quarterly'
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-900 text-slate-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <PieChart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>BCTC ({catalog.documents.quarterlyFinancials.length} quý)</span>
            </button>

            {catalog.documents.agmResolution && (
              <button
                onClick={() => setActiveCatalogTab('agm')}
                className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeCatalogTab === 'agm'
                    ? 'bg-blue-50 dark:bg-sky-500/20 text-blue-800 dark:text-sky-300 border border-blue-300 dark:border-sky-500/40 shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-900 text-slate-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Landmark className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400" />
                <span>NQ ĐHCĐ</span>
              </button>
            )}

            <button
              onClick={() => setActiveCatalogTab('broker')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeCatalogTab === 'broker'
                  ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-900 text-slate-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Báo Cáo CTCK ({catalog.documents.brokerReports.length})</span>
            </button>

            <button
              onClick={() => setActiveCatalogTab('google_insight')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeCatalogTab === 'google_insight'
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-900 text-slate-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>Triển Vọng Google AI</span>
              {googleAiInsights?.citations && googleAiInsights.citations.length > 0 && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:text-amber-300">
                  {googleAiInsights.citations.length} nguồn
                </span>
              )}
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 p-2.5">
            {/* Tab 1: BCTN */}
            {activeCatalogTab === 'annual' && (
              <div className="space-y-1.5">
                {catalog.documents.annualReports.map((item) => {
                  const isChecked = !!selectedUrls[item.downloadUrl];
                  return (
                    <div
                      key={item.downloadUrl}
                      className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950/40 px-3 py-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <button
                          onClick={() => toggleSelectUrl(item.downloadUrl)}
                          className="text-emerald-600 dark:text-emerald-400"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                        <span className="font-medium text-slate-800 dark:text-gray-200">{item.label}</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">cafef</span>
                      </div>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-[10px] font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <Download className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span>Link</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: BCTC */}
            {activeCatalogTab === 'quarterly' && (
              <div className="space-y-2">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 p-2 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>
                    💡 <strong>Gợi ý:</strong> Số liệu BCTC chuẩn 100% đã được số hóa qua Vietcap IQ API (2018–nay). Bạn có thể bỏ chọn PDF để tiết kiệm băng thông hoặc tự tick chọn nếu cần phân tích văn bản thuyết minh.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {catalog.documents.quarterlyFinancials.map((item) => {
                    const isChecked = !!selectedUrls[item.downloadUrl];
                    return (
                      <div
                        key={item.downloadUrl}
                        className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950/40 p-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleSelectUrl(item.downloadUrl)}
                            className="text-emerald-600 dark:text-emerald-400"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            )}
                          </button>
                          <span className="font-medium text-slate-800 dark:text-gray-200 text-[11px]">{item.label}</span>
                        </div>

                        <a
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <Download className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Link</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: ĐHCĐ */}
            {activeCatalogTab === 'agm' && catalog.documents.agmResolution && (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950/40 p-2.5 text-xs shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() =>
                      toggleSelectUrl(catalog.documents.agmResolution!.downloadUrl)
                    }
                    className="text-emerald-600 dark:text-emerald-400"
                  >
                    {selectedUrls[catalog.documents.agmResolution.downloadUrl] ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                  <span className="font-medium text-slate-800 dark:text-gray-200">
                    {catalog.documents.agmResolution.label}
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-sky-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-sky-500/20">vietstock</span>
                </div>

                <a
                  href={catalog.documents.agmResolution.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-[10px] font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <Download className="h-3 w-3 text-blue-600 dark:text-sky-400" />
                  <span>Link Tải</span>
                </a>
              </div>
            )}

            {/* Tab 4: Broker Reports */}
            {activeCatalogTab === 'broker' && (
              <div className="space-y-1.5">
                {catalog.documents.brokerReports.map((item) => {
                  const isChecked = !!selectedUrls[item.downloadUrl];
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950/40 p-2 text-xs gap-1.5 shadow-2xs"
                    >
                      <div className="flex items-start space-x-2.5">
                        <button
                          onClick={() => toggleSelectUrl(item.downloadUrl)}
                          className="mt-0.5 text-emerald-600 dark:text-emerald-400"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="rounded bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
                              {item.source}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-gray-200 text-[11px]">{item.title}</span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition self-end sm:self-auto shrink-0"
                      >
                        <Download className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        <span>Link</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 5: Google AI Insights */}
            {activeCatalogTab === 'google_insight' && (
              <div className="space-y-3 p-1">
                {isLoadingGoogle ? (
                  <div className="py-8 text-center space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500" />
                    <p className="text-xs font-medium text-slate-600 dark:text-gray-300">
                      Đang tìm kiếm &amp; tổng hợp tin tức triển vọng mới nhất từ Google AI cho {ticker}...
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-gray-500">
                      Truy vấn: &ldquo;kết quả kinh doanh và triển vọng tăng trưởng {ticker} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}&rdquo;
                    </p>
                  </div>
                ) : googleAiInsights ? (
                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-500/30 p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                              Thông Tin Tổng Quan Do Google AI Tạo
                            </h4>
                            <span className="rounded bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-300">
                              Thời Gian Thực
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-gray-400">
                            Truy vấn: <span className="font-medium text-slate-700 dark:text-gray-300">&ldquo;{googleAiInsights.query}&rdquo;</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={fetchGoogleInsights}
                        disabled={isLoadingGoogle}
                        className="flex items-center space-x-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-[11px] text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition self-start sm:self-auto cursor-pointer"
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoadingGoogle ? 'animate-spin' : ''}`} />
                        <span>Tìm Kiếm Lại</span>
                      </button>
                    </div>

                    {/* Overview Content Body */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950/60 p-4 text-xs text-slate-700 dark:text-gray-200 leading-relaxed shadow-2xs">
                      {renderFormattedOverview(googleAiInsights.overview)}
                    </div>

                    {/* Citations Box */}
                    {googleAiInsights.citations && googleAiInsights.citations.length > 0 && (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-950/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Newspaper className="h-3.5 w-3.5 text-blue-500" />
                            <span>Nguồn trích dẫn báo chí ({googleAiInsights.citations.length} nguồn):</span>
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-gray-500">
                            Nhấn để mở bài báo gốc
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {googleAiInsights.citations.map((c, idx) => (
                            <a
                              key={idx}
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-2.5 py-1 text-[11px] text-slate-700 dark:text-gray-300 hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition shadow-2xs group"
                            >
                              <Globe className="h-3 w-3 text-slate-400 group-hover:text-emerald-500" />
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{c.domain || 'Báo chí'}</span>
                              <span className="text-slate-400 dark:text-gray-600">|</span>
                              <span className="max-w-[220px] truncate text-slate-600 dark:text-gray-300">{c.title}</span>
                              <ExternalLink className="h-2.5 w-2.5 text-slate-400 group-hover:text-emerald-500" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inclusion Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeGoogleInsight}
                          onChange={(e) => setIncludeGoogleInsight(e.target.checked)}
                          className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Nạp dữ liệu thời sự Google AI vào Tab D (Chất lượng tăng trưởng) &amp; Tab G (Chất xúc tác)</span>
                      </label>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Khuyên dùng
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-gray-400">
                    Chưa có thông tin tổng quan từ Google AI.{' '}
                    <button
                      onClick={fetchGoogleInsights}
                      className="text-emerald-600 dark:text-emerald-400 underline font-semibold cursor-pointer"
                    >
                      Bấm để tìm kiếm ngay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 via-white to-gray-50 dark:from-emerald-950/60 dark:via-gray-900 dark:to-gray-900 border border-emerald-200 dark:border-emerald-500/30 p-3 gap-2">
            <div className="text-xs text-slate-700 dark:text-gray-300 space-y-0.5">
              <div>
                Đã chọn <span className="font-bold text-emerald-600 dark:text-emerald-400">{countSelected}</span> tài liệu PDF tham khảo từ Cafef / Vietstock / Simplize.
              </div>
              {includeGoogleInsight && googleAiInsights && (
                <div className="flex items-center space-x-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  <Sparkles className="h-3 w-3" />
                  <span>Kèm dữ liệu triển vọng Google AI (được chuyển vào Tab D &amp; Tab G)</span>
                </div>
              )}
            </div>

            <button
              onClick={handleApplyToAnalysis}
              disabled={(countSelected === 0 && !includeGoogleInsight) || isDownloading}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Sparkles className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`} />
              <span>
                {isDownloading
                  ? downloadProgress
                  : `📥 Nạp ${countSelected} tài liệu ${includeGoogleInsight ? '+ Google AI' : ''} vào danh sách phân tích`}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function renderFormattedOverview(content: string) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Header Markdown (### or ## or #)
        if (trimmed.startsWith('#')) {
          const cleanHeading = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
          return (
            <h4
              key={idx}
              className="text-xs font-bold text-slate-900 dark:text-white mt-3 pt-1 pb-0.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5 font-heading text-emerald-700 dark:text-emerald-400"
            >
              {cleanHeading}
            </h4>
          );
        }

        // Subheading with **text:**
        if (trimmed.startsWith('**') && trimmed.endsWith(':**')) {
          const cleanHeading = trimmed.replace(/\*\*/g, '');
          return (
            <h5
              key={idx}
              className="text-xs font-bold text-slate-900 dark:text-white mt-2.5 mb-1 font-heading text-slate-800 dark:text-gray-100"
            >
              {cleanHeading}
            </h5>
          );
        }

        // Bullet point (* or - or •)
        if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const cleanText = trimmed.replace(/^[\*\-•]\s*/, '');
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1.5 my-1 text-xs">
              <span className="text-emerald-500 dark:text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
              <span
                className="text-slate-700 dark:text-gray-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatBold(cleanText) }}
              />
            </div>
          );
        }

        // Standard paragraph
        return (
          <p
            key={idx}
            className="text-xs text-slate-700 dark:text-gray-200 leading-relaxed my-1"
            dangerouslySetInnerHTML={{ __html: formatBold(trimmed) }}
          />
        );
      })}
    </div>
  );
}

function formatBold(str: string): string {
  return str.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>'
  );
}

