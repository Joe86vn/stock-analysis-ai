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
import { generateAnalysisReport, generateDefaultExpertReport } from '@/lib/ai-analyzer';
import { AnalysisReport, StockMarketData, UploadedFile, ValuationAssumptions } from '@/types/analysis';

import { Sparkles, Download, RefreshCw, FileText, CheckCircle2, ChevronDown, ChevronUp, Cpu, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<StockMarketData>(getStockData('HPG'));
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
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

  const fetchSimplizeRatios = async (ticker: string) => {
    try {
      const response = await fetch(`/api/stocks/${ticker}/financials`);
      if (response.ok) {
        const data = await response.json();
        const quarters = data.quarters || [];
        const peValues = quarters.map((q: any) => q.pe).filter((pe: any) => typeof pe === 'number' && pe > 0);
        if (peValues.length > 0) {
          return {
            pe5YearMin: Math.round(Math.min(...peValues) * 10) / 10,
            pe5YearMax: Math.round(Math.max(...peValues) * 10) / 10,
            pe5YearAvg: Math.round((peValues.reduce((s: number, c: number) => s + c, 0) / peValues.length) * 10) / 10,
          };
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch Simplize ratios for ${ticker}:`, err);
    }
    return null;
  };

  // Initial load: fetch prices & financial stats and display initial default report without calling AI automatically
  useEffect(() => {
    const init = async () => {
      let priceUpdatedStock = { ...selectedStock };
      const [latestPrice, ratios] = await Promise.all([
        fetchLatestPrice(selectedStock.ticker),
        fetchSimplizeRatios(selectedStock.ticker),
      ]);
      if (latestPrice !== null) {
        priceUpdatedStock.currentPrice = latestPrice;
      }
      if (ratios !== null) {
        priceUpdatedStock.pe5YearMin = ratios.pe5YearMin;
        priceUpdatedStock.pe5YearMax = ratios.pe5YearMax;
        priceUpdatedStock.pe5YearAvg = ratios.pe5YearAvg;
      }
      setSelectedStock(priceUpdatedStock);
      setReport(generateDefaultExpertReport(priceUpdatedStock.ticker, priceUpdatedStock, uploadedFiles));
    };
    init();
  }, []);

  const handleSelectStock = async (stock: StockMarketData) => {
    let priceUpdatedStock = { ...stock };
    const [latestPrice, ratios] = await Promise.all([
      fetchLatestPrice(stock.ticker),
      fetchSimplizeRatios(stock.ticker),
    ]);
    if (latestPrice !== null) {
      priceUpdatedStock.currentPrice = latestPrice;
    }
    if (ratios !== null) {
      priceUpdatedStock.pe5YearMin = ratios.pe5YearMin;
      priceUpdatedStock.pe5YearMax = ratios.pe5YearMax;
      priceUpdatedStock.pe5YearAvg = ratios.pe5YearAvg;
    }
    setSelectedStock(priceUpdatedStock);
    setReport(generateDefaultExpertReport(priceUpdatedStock.ticker, priceUpdatedStock, uploadedFilesRef.current));
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
  };

  const runAnalysis = async (stock: StockMarketData, files: UploadedFile[]) => {
    const defaultModel = 'gemini-3.7-flash';
    setIsGenerating(true);
    setErrorMessage('');
    const fileCount = files.length;
    setGeneratingMsg(
      fileCount > 0
        ? `Đang phân tích ${fileCount} tài liệu bằng ${defaultModel} cho ${stock.ticker}...`
        : `Đang kết nối ${defaultModel} lập báo cáo cho ${stock.ticker}...`
    );
    try {
      const generated = await generateAnalysisReport(stock.ticker, stock, files, defaultModel);
      setReport(generated);
      setErrorMessage('');
      // Scroll to report section after generation
      setTimeout(() => {
        reportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setErrorMessage(err.message || 'Lỗi khi gọi Google AI Studio Gemini.');
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] pb-16 transition-colors duration-200">
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
        <div className="flex flex-col lg:flex-row items-center justify-between rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50 via-white to-gray-50 dark:from-emerald-950/40 dark:via-gray-900 dark:to-[#111827] p-4 shadow-sm dark:shadow-xl gap-4 print:hidden transition-colors duration-200">
          <div className="flex items-center space-x-3 w-full lg:w-auto">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Sparkles className={`h-5 w-5 ${isGenerating ? 'animate-spin' : 'animate-pulse'}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-heading">
                <span>ValueX AI Engine:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {report?.generationModel || 'gemini-3.7-flash'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {isGenerating
                  ? <span className="text-emerald-700 dark:text-emerald-300 font-semibold animate-pulse">{generatingMsg}</span>
                  : <>Lập báo cáo 4 phần A-B-C-D cho <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedStock.ticker}</span></>
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Model Badge */}
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-950/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3.5 py-2 shadow-xs">
              <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                ⚡ Gemini 3.7 Flash
              </span>
            </div>

            <button
              onClick={() => runAnalysis(selectedStock, uploadedFilesRef.current)}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/25 transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? 'Đang Phân Tích AI...'
                  : report?.generationModel
                  ? '🔄 Phân Tích Lại Với AI'
                  : '🚀 Bắt Đầu Phân Tích AI'}
              </span>
            </button>

            {report && (
              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center justify-center space-x-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition"
              >
                <Download className="h-4 w-4" />
                <span>Xuất PDF/Word</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 p-4 shadow-sm dark:shadow-xl text-rose-800 dark:text-rose-200 space-y-3 print:hidden">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Lỗi Kết Nối Google AI Studio
                </h4>
                <p className="text-xs text-slate-700 dark:text-gray-300 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing Progress Banner */}
        {isGenerating && (
          <div className="flex items-center space-x-3 rounded-2xl border border-emerald-300 dark:border-sky-500/30 bg-emerald-50 dark:bg-sky-950/60 px-5 py-3 shadow-sm print:hidden">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 dark:text-sky-400 shrink-0" />
            <p className="text-xs font-medium text-emerald-800 dark:text-sky-300">{generatingMsg}</p>
            <span className="ml-auto text-[10px] text-emerald-600 dark:text-sky-500 animate-pulse">AI đang xử lý...</span>
          </div>
        )}

        {/* 4-Section Report Viewer (A, B, C, D) */}
        <div ref={reportSectionRef}>
          {report && (
            <ReportViewer
              report={report}
              onUpdateReport={handleUpdateReport}
              onRegenerate={() => runAnalysis(selectedStock, uploadedFilesRef.current)}
              isGenerating={isGenerating}
            />
          )}
        </div>

        {/* Template Guide Collapsible Section */}
        <div id="analysis-guide" className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-5 shadow-sm dark:shadow-xl print:hidden transition-colors duration-200">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
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
            <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4 text-xs text-slate-600 dark:text-gray-300 space-y-3 leading-relaxed">
              <div>
                <h4 className="font-bold text-blue-600 dark:text-sky-400">A. Tổng Quan</h4>
                <p>1. Doanh nghiệp | 2. Cơ cấu cổ đông & Ban lãnh đạo | 3. Cơ cấu doanh nghiệp (Công ty liên kết)</p>
              </div>
              <div>
                <h4 className="font-bold text-emerald-600 dark:text-emerald-400">B. Hoạt Động Kinh Doanh</h4>
                <p>1. Chuỗi giá trị (Đầu vào, Quy trình sản xuất, Đầu ra sản phẩm cốt lõi)</p>
              </div>
              <div>
                <h4 className="font-bold text-purple-600 dark:text-purple-400">C. Tình Hình Tài Chính</h4>
                <p>1. Doanh thu 3 năm | 2. Biên lợi nhuận (Gross/Net margin, ROE) | 3. Sức khỏe tài chính (Nợ vay/VCSH)</p>
              </div>
              <div>
                <h4 className="font-bold text-amber-600 dark:text-amber-400">D. Triển Vọng Kinh Doanh & Định Giá</h4>
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
