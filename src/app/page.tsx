'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { StockSelector } from '@/components/StockSelector';
import { DocumentUploader } from '@/components/DocumentUploader';
import { ReferenceDocumentCatalog } from '@/components/ReferenceDocumentCatalog';
import { MarketDataSummary } from '@/components/MarketDataSummary';
import { ValuationCalculator } from '@/components/ValuationCalculator';
import { ReportViewer } from '@/components/ReportViewer';
import { ExportModal } from '@/components/ExportModal';

import { getStockData } from '@/lib/stock-data';
import { generateAnalysisReport } from '@/lib/ai-analyzer';
import { AnalysisReport, StockMarketData, UploadedFile, ValuationAssumptions } from '@/types/analysis';

import { Sparkles, Download, RefreshCw, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<StockMarketData>(getStockData('HPG'));
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // useRef to always have fresh uploadedFiles in closures
  const uploadedFilesRef = useRef<UploadedFile[]>(uploadedFiles);
  uploadedFilesRef.current = uploadedFiles;
  const reportSectionRef = useRef<HTMLDivElement>(null);

  const fetchLatestPrice = async (ticker: string): Promise<number | null> => {
    try {
      const response = await fetch(`/api/stocks/${ticker}/price`);
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.price === 'number' && data.price > 0) {
          return data.price;
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch latest price for ${ticker}, using local value:`, err);
    }
    return null;
  };

  // Auto generate initial report when page loads and fetch latest close price
  useEffect(() => {
    const init = async () => {
      let priceUpdatedStock = { ...selectedStock };
      const latestPrice = await fetchLatestPrice(selectedStock.ticker);
      if (latestPrice !== null) {
        priceUpdatedStock.currentPrice = latestPrice;
        setSelectedStock(priceUpdatedStock);
      }
      runAnalysis(priceUpdatedStock, uploadedFiles);
    };
    init();
  }, []);

  const handleSelectStock = async (stock: StockMarketData) => {
    let priceUpdatedStock = { ...stock };
    const latestPrice = await fetchLatestPrice(stock.ticker);
    if (latestPrice !== null) {
      priceUpdatedStock.currentPrice = latestPrice;
    }
    setSelectedStock(priceUpdatedStock);
    runAnalysis(priceUpdatedStock, uploadedFilesRef.current);
  };

  const handleAddFiles = (files: UploadedFile[]) => {
    const updated = [...uploadedFiles, ...files];
    setUploadedFiles(updated);
  };

  const handleRemoveFile = (id: string) => {
    const updated = uploadedFiles.filter((f) => f.id !== id);
    setUploadedFiles(updated);
  };

  const handleSelectDocumentsForAnalysis = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    runAnalysis(selectedStock, files);
  };

  const runAnalysis = async (stock: StockMarketData, files: UploadedFile[]) => {
    setIsGenerating(true);
    const fileCount = files.length;
    setGeneratingMsg(
      fileCount > 0
        ? `Đang phân tích ${fileCount} tài liệu tham khảo cho ${stock.ticker}...`
        : `Đang tổng hợp dữ liệu thị trường cho ${stock.ticker}...`
    );
    try {
      const generated = await generateAnalysisReport(stock.ticker, stock, files);
      setReport(generated);
      // Scroll to report section after generation
      setTimeout(() => {
        reportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsGenerating(false);
      setGeneratingMsg('');
    }
  };

  const handleUpdateValuation = (newValuation: ValuationAssumptions) => {
    if (!report) return;
    setReport({
      ...report,
      sectionD: {
        ...report.sectionD,
        valuation: newValuation,
      },
    });
  };

  const handleUpdateReport = (updatedReport: AnalysisReport) => {
    setReport(updatedReport);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-16">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Top Control Bar: Stock Selection + Document Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          <div className="lg:col-span-6">
            <StockSelector selectedStock={selectedStock} onSelectStock={handleSelectStock} />
          </div>
          <div className="lg:col-span-6">
            <DocumentUploader
              files={uploadedFiles}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
            />
          </div>
        </div>

        {/* Automatic Reference Document Catalog (cafef, vietstock, simplize) */}
        <div className="print:hidden">
          <ReferenceDocumentCatalog
            ticker={selectedStock.ticker}
            onSelectDocumentsForAnalysis={handleSelectDocumentsForAnalysis}
          />
        </div>

        {/* Live Market Indicators Summary */}
        <div className="print:hidden">
          <MarketDataSummary marketData={selectedStock} />
        </div>

        {/* AI Trigger Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-gray-900 to-emerald-950/40 p-4 shadow-xl gap-3 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <Sparkles className={`h-5 w-5 ${isGenerating ? 'animate-spin' : 'animate-pulse'}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {report?.generationModel 
                  ? `Google AI Studio: ${report.generationModel}` 
                  : 'Gemini Multi-Model Fallback Engine'
                }
              </h3>
              <p className="text-xs text-gray-400">
                {isGenerating
                  ? <span className="text-sky-300 font-semibold animate-pulse">{generatingMsg}</span>
                  : <>Tự động failover &amp; lập báo cáo 4 phần A-B-C-D cho <span className="font-bold text-sky-400">{selectedStock.ticker}</span></>
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => runAnalysis(selectedStock, uploadedFilesRef.current)}
              disabled={isGenerating}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-emerald-400 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Đang Phân Tích AI...' : 'Tái Tạo Báo Cáo AI'}</span>
            </button>

            {report && (
              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center justify-center space-x-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
              >
                <Download className="h-4 w-4" />
                <span>Xuất PDF/Word</span>
              </button>
            )}
          </div>
        </div>

        {/* Analyzing Progress Banner */}
        {isGenerating && (
          <div className="flex items-center space-x-3 rounded-2xl border border-sky-500/30 bg-sky-950/60 px-5 py-3 shadow-lg print:hidden">
            <RefreshCw className="h-4 w-4 animate-spin text-sky-400 shrink-0" />
            <p className="text-xs font-medium text-sky-300">{generatingMsg}</p>
            <span className="ml-auto text-[10px] text-sky-500 animate-pulse">AI đang xử lý...</span>
          </div>
        )}

        {/* 4-Section Report Viewer (A, B, C, D) */}
        <div ref={reportSectionRef}>
          {report && (
            <ReportViewer report={report} onUpdateReport={handleUpdateReport} />
          )}
        </div>

        {/* Template Guide Collapsible Section */}
        <div id="analysis-guide" className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-xl print:hidden">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">
                Tham Chiếu Quy Trình Phân Tích Chuẩn (`analysis-guide.md`)
              </h3>
            </div>
            {showGuide ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showGuide && (
            <div className="mt-4 border-t border-gray-800 pt-4 text-xs text-gray-300 space-y-3 leading-relaxed">
              <div>
                <h4 className="font-bold text-sky-400">A. Tổng Quan</h4>
                <p>1. Doanh nghiệp | 2. Cơ cấu cổ đông & Ban lãnh đạo | 3. Cơ cấu doanh nghiệp (Công ty liên kết)</p>
              </div>
              <div>
                <h4 className="font-bold text-emerald-400">B. Hoạt Động Kinh Doanh</h4>
                <p>1. Chuỗi giá trị (Đầu vào, Quy trình sản xuất, Đầu ra sản phẩm cốt lõi)</p>
              </div>
              <div>
                <h4 className="font-bold text-purple-400">C. Tình Hình Tài Chính</h4>
                <p>1. Doanh thu 3 năm | 2. Biên lợi nhuận (Gross/Net margin, ROE) | 3. Sức khỏe tài chính (Nợ vay/VCSH)</p>
              </div>
              <div>
                <h4 className="font-bold text-amber-400">D. Triển Vọng Kinh Doanh & Định Giá</h4>
                <p>1. Tăng trưởng (Sản lượng x Giá bán, Chi phí) | 2. Ước lượng 4 quý | 3. Định giá 3 kịch bản (PE Trung bình, PE Max, PE Min)</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Export Modal */}
      {report && (
        <ExportModal
          report={report}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}
