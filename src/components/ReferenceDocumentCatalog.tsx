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
    <div className="rounded-2xl border border-sky-500/20 bg-[#111827] p-4 shadow-xl space-y-3">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-white">
                Tài Liệu Tham Khảo Tự Động ({ticker})
              </h3>
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/30">
                {countSelected} Đã Chọn
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Tổng hợp link tải chuẩn từ <span className="text-amber-400 font-medium">cafef.vn</span>,{' '}
              <span className="text-emerald-400 font-medium">vietstock.vn</span> &amp;{' '}
              <span className="text-purple-400 font-medium">simplize.vn</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchCatalog}
          disabled={isLoading}
          className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800/80 px-2.5 py-1 text-[11px] text-gray-300 hover:bg-gray-700 hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Crawl Lại</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-sky-400" />
          <p className="text-xs font-medium text-gray-300">
            Đang tìm kiếm &amp; kiểm tra link tài liệu cho {ticker}...
          </p>
        </div>
      ) : catalog ? (
        <div className="space-y-3">
          {/* Horizontal Compact Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-800 pb-2">
            <button
              onClick={() => setActiveCatalogTab('annual')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeCatalogTab === 'annual'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>BCTN ({catalog.documents.annualReports.length})</span>
            </button>

            <button
              onClick={() => setActiveCatalogTab('quarterly')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeCatalogTab === 'quarterly'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <PieChart className="h-3.5 w-3.5 text-emerald-400" />
              <span>BCTC ({catalog.documents.quarterlyFinancials.length} quý)</span>
            </button>

            {catalog.documents.agmResolution && (
              <button
                onClick={() => setActiveCatalogTab('agm')}
                className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeCatalogTab === 'agm'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Landmark className="h-3.5 w-3.5 text-sky-400" />
                <span>NQ ĐHCĐ</span>
              </button>
            )}

            <button
              onClick={() => setActiveCatalogTab('broker')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeCatalogTab === 'broker'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5 text-purple-400" />
              <span>Báo Cáo CTCK ({catalog.documents.brokerReports.length})</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-2.5">
            {/* Tab 1: BCTN */}
            {activeCatalogTab === 'annual' && (
              <div className="space-y-1.5">
                {catalog.documents.annualReports.map((item) => {
                  const isChecked = !!selectedUrls[item.downloadUrl];
                  return (
                    <div
                      key={item.downloadUrl}
                      className="flex items-center justify-between rounded-lg border border-gray-800/80 bg-gray-950/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <button
                          onClick={() => toggleSelectUrl(item.downloadUrl)}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-sky-400" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                        <span className="font-medium text-gray-200">{item.label}</span>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">cafef</span>
                      </div>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                      >
                        <Download className="h-3 w-3 text-amber-400" />
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
                      className="flex items-center justify-between rounded-lg border border-gray-800/80 bg-gray-950/40 p-2 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleSelectUrl(item.downloadUrl)}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-sky-400" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                        <span className="font-medium text-gray-200 text-[11px]">{item.label}</span>
                      </div>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                      >
                        <Download className="h-3 w-3 text-emerald-400" />
                        <span>Link</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: ĐHCĐ */}
            {activeCatalogTab === 'agm' && catalog.documents.agmResolution && (
              <div className="flex items-center justify-between rounded-lg border border-gray-800/80 bg-gray-950/40 p-2.5 text-xs">
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() =>
                      toggleSelectUrl(catalog.documents.agmResolution!.downloadUrl)
                    }
                    className="text-sky-400 hover:text-sky-300"
                  >
                    {selectedUrls[catalog.documents.agmResolution.downloadUrl] ? (
                      <CheckSquare className="h-4 w-4 text-sky-400" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  <span className="font-medium text-gray-200">
                    {catalog.documents.agmResolution.label}
                  </span>
                  <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">vietstock</span>
                </div>

                <a
                  href={catalog.documents.agmResolution.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                >
                  <Download className="h-3 w-3 text-sky-400" />
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-gray-800/80 bg-gray-950/40 p-2 text-xs gap-1.5"
                    >
                      <div className="flex items-start space-x-2.5">
                        <button
                          onClick={() => toggleSelectUrl(item.downloadUrl)}
                          className="mt-0.5 text-sky-400 hover:text-sky-300"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-sky-400" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="rounded bg-purple-950/40 px-1.5 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/30">
                              {item.source}
                            </span>
                            <span className="font-medium text-gray-200 text-[11px]">{item.title}</span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition self-end sm:self-auto shrink-0"
                      >
                        <Download className="h-3 w-3 text-purple-400" />
                        <span>Link</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-gradient-to-r from-sky-950/60 to-emerald-950/60 border border-sky-500/30 p-3 gap-2">
            <div className="text-xs text-gray-300">
              Đã chọn <span className="font-bold text-sky-400">{countSelected}</span> tài liệu tham khảo cho AI đọc.
            </div>

            <button
              onClick={handleApplyToAnalysis}
              disabled={countSelected === 0 || isDownloading}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-emerald-400 transition disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`} />
              <span>{isDownloading ? downloadProgress : `📥 Tải ${countSelected} tài liệu đã chọn cho AI`}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
