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

  // Active accordion sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    annual: true,
    quarterly: true,
    agm: true,
    broker: true,
  });

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

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
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
    <div className="rounded-2xl border border-sky-500/20 bg-[#111827] p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white">
                Danh Mục Tài Liệu Tham Khảo Tự Động
              </h3>
              <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-400 border border-sky-500/30">
                {ticker}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Tổng hợp link tải chuẩn từ <span className="text-amber-400 font-medium">cafef.vn</span>,{' '}
              <span className="text-emerald-400 font-medium">vietstock.vn</span> và{' '}
              <span className="text-purple-400 font-medium">simplize.vn</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchCatalog}
          disabled={isLoading}
          className="flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Crawl Lại</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-sky-400" />
          <p className="text-sm font-medium text-gray-300">
            Đang tìm kiếm & kiểm tra link tài liệu tham khảo cho {ticker}...
          </p>
          <p className="text-xs text-gray-500">
            Đang quét cafef.vn (BCTN), vietstock.vn (BCTC & ĐHCĐ), simplize.vn (Broker reports)
          </p>
        </div>
      ) : catalog ? (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
              <span className="block font-bold text-amber-400 text-sm">
                {catalog.summary.annualReportsFound} File
              </span>
              <span className="text-gray-400">BCTN (cafef)</span>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-center">
              <span className="block font-bold text-emerald-400 text-sm">
                {catalog.summary.quarterlyReportsFound} Quý
              </span>
              <span className="text-gray-400">BCTC (vietstock)</span>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5 text-center">
              <span className="block font-bold text-sky-400 text-sm">
                {catalog.summary.agmResolutionFound ? 'Có' : 'Không'}
              </span>
              <span className="text-gray-400">NQ ĐHCĐ (vietstock)</span>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-2.5 text-center">
              <span className="block font-bold text-purple-400 text-sm">
                {catalog.summary.brokerReportsFound} Báo Cáo
              </span>
              <span className="text-gray-400">CTCK (simplize)</span>
            </div>
          </div>

          {/* Accordion Group 1: BCTN */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            <button
              onClick={() => toggleSection('annual')}
              className="flex w-full items-center justify-between p-3.5 text-left bg-gray-800/40 hover:bg-gray-800/80 transition"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">
                  📄 Báo Cáo Thường Niên (BCTN - 3 năm gần nhất)
                </span>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                  cafef.vn
                </span>
              </div>
              {openSections.annual ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {openSections.annual && (
              <div className="p-3 space-y-2 divide-y divide-gray-800/60">
                {catalog.documents.annualReports.map((item) => {
                  const isChecked = !!selectedUrls[item.downloadUrl];
                  return (
                    <div
                      key={item.downloadUrl}
                      className="pt-2 first:pt-0 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
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
                        <div>
                          <span className="font-medium text-gray-200">{item.label}</span>
                          <span className="ml-2 text-[10px] text-gray-500">({item.source})</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <a
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                        >
                          <Download className="h-3 w-3 text-sky-400" />
                          <span>Link Tải</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accordion Group 2: BCTC */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            <button
              onClick={() => toggleSection('quarterly')}
              className="flex w-full items-center justify-between p-3.5 text-left bg-gray-800/40 hover:bg-gray-800/80 transition"
            >
              <div className="flex items-center space-x-2.5">
                <PieChart className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">
                  📊 Báo Cáo Tài Chính Hợp Nhất (8 quý gần nhất)
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  vietstock.vn
                </span>
              </div>
              {openSections.quarterly ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {openSections.quarterly && (
              <div className="p-3 space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catalog.documents.quarterlyFinancials.map((item) => {
                  const isChecked = !!selectedUrls[item.downloadUrl];
                  return (
                    <div
                      key={item.downloadUrl}
                      className="flex items-center justify-between rounded-lg border border-gray-800/80 bg-gray-950/40 p-2.5 text-xs"
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
                      </div>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                      >
                        <Download className="h-3 w-3 text-emerald-400" />
                        <span>Link</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accordion Group 3: ĐHCĐ */}
          {catalog.documents.agmResolution && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
              <button
                onClick={() => toggleSection('agm')}
                className="flex w-full items-center justify-between p-3.5 text-left bg-gray-800/40 hover:bg-gray-800/80 transition"
              >
                <div className="flex items-center space-x-2.5">
                  <Landmark className="h-4 w-4 text-sky-400" />
                  <span className="text-sm font-semibold text-white">
                    🏛️ Nghị Quyết Đại Hội Cổ Đông Thường Niên
                  </span>
                  <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-500/20">
                    vietstock.vn
                  </span>
                </div>
                {openSections.agm ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {openSections.agm && (
                <div className="p-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
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
                    </div>

                    <a
                      href={catalog.documents.agmResolution.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                    >
                      <Download className="h-3 w-3 text-sky-400" />
                      <span>Link Tải</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion Group 4: Broker Reports (simplize.vn) */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            <button
              onClick={() => toggleSection('broker')}
              className="flex w-full items-center justify-between p-3.5 text-left bg-gray-800/40 hover:bg-gray-800/80 transition"
            >
              <div className="flex items-center space-x-2.5">
                <FileCheck className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">
                  🏦 Báo Cáo Phân Tích Công Ty Chứng Khoán (Broker Reports)
                </span>
                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                  simplize.vn
                </span>
              </div>
              {openSections.broker ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {openSections.broker && (
              <div className="p-3 space-y-2 divide-y divide-gray-800/60">
                {catalog.documents.brokerReports.map((item) => {
                  const isChecked = !!selectedUrls[item.downloadUrl];
                  return (
                    <div
                      key={item.id}
                      className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-start space-x-3">
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
                            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-sky-400 border border-gray-700">
                              {item.source}
                            </span>
                            <span className="font-medium text-gray-200">{item.title}</span>
                          </div>
                          <div className="mt-1 flex items-center space-x-3 text-[11px] text-gray-400">
                            <span>Ngày: {item.issueDate}</span>
                            {item.recommend && (
                              <span
                                className={`font-semibold ${
                                  item.recommend === 'MUA'
                                    ? 'text-emerald-400'
                                    : item.recommend === 'BÁN'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {item.recommend}
                              </span>
                            )}
                            {item.targetPrice && (
                              <span className="text-gray-300">
                                Giá MT: {item.targetPrice.toLocaleString()} đ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition self-end sm:self-auto"
                      >
                        <Download className="h-3 w-3 text-purple-400" />
                        <span>Link Tải</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-gradient-to-r from-sky-950/60 to-emerald-950/60 border border-sky-500/30 p-4 gap-3">
            <div className="text-xs text-gray-300">
              Đã chọn <span className="font-bold text-sky-400 text-sm">{countSelected}</span> tài liệu tham khảo cho AI đọc & phân tích.
            </div>

            <button
              onClick={handleApplyToAnalysis}
              disabled={countSelected === 0 || isDownloading}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-emerald-400 transition disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`} />
              <span>{isDownloading ? downloadProgress : '🚀 Tải tất cả đã chọn & Bắt đầu Phân Tích AI'}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
