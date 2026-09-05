'use client';

import React, { useState, useEffect } from 'react';
import {
  ReferenceDocumentCatalogData,
  UploadedFile,
  AnnualReportItem,
  QuarterlyBCTCItem,
  AGMResolutionItem,
  BrokerReportItem,
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

  const [activeCatalogTab, setActiveCatalogTab] = useState<'annual' | 'quarterly' | 'agm' | 'broker'>('annual');

  useEffect(() => {
    fetchCatalog();
  }, [ticker]);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const data = await getReferenceDocumentCatalog(ticker);
      setCatalog(data);

      // Default select all verified items
      const initialSelected: Record<string, boolean> = {};
      data.documents.annualReports.forEach((item) => {
        initialSelected[item.downloadUrl] = true;
      });
      data.documents.quarterlyFinancials.slice(0, 4).forEach((item) => {
        initialSelected[item.downloadUrl] = true; // Default select top 4 quarters
      });
      if (data.documents.agmResolution) {
        initialSelected[data.documents.agmResolution.downloadUrl] = true;
      }
      data.documents.brokerReports.slice(0, 2).forEach((item) => {
        initialSelected[item.downloadUrl] = true; // Default select top 2 broker reports
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
          </div>

          {/* Action Footer CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 via-white to-gray-50 dark:from-emerald-950/60 dark:via-gray-900 dark:to-gray-900 border border-emerald-200 dark:border-emerald-500/30 p-3 gap-2">
            <div className="text-xs text-slate-700 dark:text-gray-300">
              Đã chọn <span className="font-bold text-emerald-600 dark:text-emerald-400">{countSelected}</span> tài liệu tham khảo từ Cafef / Vietstock / Simplize.
            </div>

            <button
              onClick={handleApplyToAnalysis}
              disabled={countSelected === 0 || isDownloading}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 shadow-md shadow-emerald-600/20"
            >
              <Sparkles className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`} />
              <span>{isDownloading ? downloadProgress : `📥 Nạp ${countSelected} tài liệu vào danh sách phân tích`}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
