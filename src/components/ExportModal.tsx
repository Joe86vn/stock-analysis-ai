'use client';

import React, { useState } from 'react';
import { AnalysisReport } from '@/types/analysis';
import { Download, FileSpreadsheet, Printer, X, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  report: AnalysisReport;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ report, isOpen, onClose }: ExportModalProps) {
  const [downloaded, setDownloaded] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const mdContent = `
# BÁO CÁO PHÂN TÍCH ĐẦU TƯ CHỨNG KHOÁN: ${report.ticker} (${report.companyName})
*Ngày lập: ${report.createdDate}*

---

## A. TỔNG QUAN DOANH NGHIỆP
### 1. Tổng quan
${report.sectionA.historyAndOverview}

### 2. Cơ cấu cổ đông & ban lãnh đạo
${report.sectionA.shareholdersAndManagement}

### 3. Cơ cấu công ty con & liên kết
${report.sectionA.subsidiariesAndAffiliates}

---

## B. HOẠT ĐỘNG KINH DOANH & CHUỖI GIÁ TRỊ
### 1. Chuỗi giá trị: Đầu vào
${report.sectionB.valueChainInput}

### 2. Quy trình sản xuất & Năng lực công suất
${report.sectionB.valueChainProduction}

### 3. Đầu ra (Cơ cấu doanh thu & Sản phẩm cốt lõi)
${report.sectionB.valueChainOutput}

---

## C. TÌNH HÌNH TÀI CHÍNH
### 1. Doanh thu 3 năm gần nhất
${report.sectionC.revenueHistory3Years}

### 2. Tỷ suất lợi nhuận & ROE
${report.sectionC.profitabilityMargins}

### 3. Sức khỏe tài chính (Nợ vay / VCSH)
${report.sectionC.financialHealthAndDebt}

---

## D. TRIỂN VỌNG KINH DOANH & ĐỊNH GIÁ 3 KỊCH BẢN
### 1. Phân tích yếu tố tăng trưởng (Sản lượng, Giá bán, Chi phí)
${report.sectionD.growthDriversRevenueAndCost}

### 2. Dự báo KQKD 4 Quý tiếp theo
${report.sectionD.quarterlyForecastReasoning}

### 3. Kết Quả Định Giá 3 Kịch Bản
- **Kịch bản Cơ sở (Base Case)**: PE ${report.sectionD.valuation.peBase}x => **${Math.round(report.sectionD.valuation.epsForward * report.sectionD.valuation.peBase).toLocaleString('vi-VN')} VNĐ**
- **Kịch bản Tích cực (Bull Case)**: PE ${report.sectionD.valuation.peBull}x => **${Math.round(report.sectionD.valuation.epsForward * report.sectionD.valuation.peBull).toLocaleString('vi-VN')} VNĐ**
- **Kịch bản Thận trọng (Bear Case)**: PE ${report.sectionD.valuation.peBear}x => **${Math.round(report.sectionD.valuation.epsForward * report.sectionD.valuation.peBear).toLocaleString('vi-VN')} VNĐ**
- EPS Forward Dự Phóng: **${report.sectionD.valuation.epsForward.toLocaleString('vi-VN')} VNĐ**
    `;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Phan_Tich_${report.ticker}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded('Markdown / Word format');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-sky-400" />
          <h3 className="text-lg font-bold text-white">Xuất Báo Cáo Phân Tích</h3>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Xuất báo cáo mã <span className="font-semibold text-white">{report.ticker}</span> dưới dạng file PDF hoặc Markdown/Word.
        </p>

        {downloaded && (
          <div className="mt-4 flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Đã tải thành công định dạng {downloaded}!</span>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handlePrintPdf}
            className="flex w-full items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-left transition hover:bg-sky-500/20"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">In / Xuất PDF Chuyên Nghiệp</h4>
                <p className="text-[11px] text-gray-400">Xem trước và in ra định dạng PDF chuẩn báo cáo</p>
              </div>
            </div>
            <span className="text-xs font-bold text-sky-400">In / PDF →</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex w-full items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left transition hover:bg-emerald-500/20"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Tải File Markdown (.md) / Word</h4>
                <p className="text-[11px] text-gray-400">Dễ dàng sao chép và biên tập trên Word/Docs</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400">Tải Về →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
