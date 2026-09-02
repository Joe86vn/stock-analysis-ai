'use client';

import React, { useState } from 'react';
import { AnalysisReport } from '@/types/analysis';
import { Download, FileSpreadsheet, Printer, X, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/components/ThemeProvider';

interface ExportModalProps {
  report: AnalysisReport;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ report, isOpen, onClose }: ExportModalProps) {
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const { theme, mounted } = useTheme();

  if (!isOpen) return null;

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const mdContent = `
# VALUEX - BÁO CÁO PHÂN TÍCH ĐẦU TƯ CHỨNG KHOÁN: ${report.ticker} (${report.companyName})
> *Đồng hành bứt phá giá trị - Đầu tư bền vững*
> *Ngày lập: ${report.createdDate} | Nền tảng phân tích ValueX*

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

## C. SỨC KHỎE TÀI CHÍNH • VALUEX FINANCIAL HEALTH (50 ĐIỂM)
### A. Thanh khoản & Trả nợ
${report.sectionC.partA_LiquidityAndDebt || report.sectionC.financialHealthAndDebt || ''}

### B. Dòng tiền & Chuyển đổi lợi nhuận
${report.sectionC.partB_CashFlowAndEarnings || ''}

### C. Sinh lời & Hiệu quả vốn
${report.sectionC.partC_ProfitabilityAndROIC || report.sectionC.profitabilityMargins || ''}

### D. Vốn lưu động & Chất lượng tài sản
${report.sectionC.partD_WorkingCapitalAndAssetQuality || ''}

### E. Cơ cấu vốn & Khả năng tài trợ
${report.sectionC.partE_CapitalStructureAndFunding || ''}

### F. Chất lượng lợi nhuận & Kế toán
${report.sectionC.partF_EarningsQualityAndAccounting || ''}

---

## D. CHẤT LƯỢNG TĂNG TRƯỞNG & CẦU NỐI CORE (60 ĐIỂM)
### A. Chất lượng tăng trưởng hiện tại
${report.sectionD?.partA_CurrentGrowth || ''}

### B. Độ chắc chắn 2–4 quý tới
${report.sectionD?.partB_VisibilityNext2To4Q || ''}

### C. Độ bền biên lợi nhuận
${report.sectionD?.partC_MarginDurability || ''}

### D. Dư địa tăng trưởng
${report.sectionD?.partD_GrowthRunway || ''}

### E. Tăng trưởng chuyển thành tiền
${report.sectionD?.partE_GrowthToCash || ''}

### F. Tăng trưởng trung hạn (CAGR 3Y)
${report.sectionD?.partF_MediumTermGrowth || ''}

### G. Bền vững sau điều chỉnh rủi ro
${report.sectionD?.partG_RiskAdjustedSustainability || ''}

---

## E. CHẤT LƯỢNG DOANH NGHIỆP • ECONOMIC MOAT (40 ĐIỂM)
### A. Lợi thế cạnh tranh kinh tế (Moat)
${report.sectionE?.partA_EconomicMoat || ''}

### B. Vị thế ngành & Thị phần
${report.sectionE?.partB_IndustryPosition || ''}

### C. Mô hình kinh doanh & Hiệu quả
${report.sectionE?.partC_BusinessModel || ''}

### D. Ban lãnh đạo & Phân bổ vốn
${report.sectionE?.partD_ManagementAndCapitalAllocation || ''}

### E. Quản trị công ty & Cổ đông
${report.sectionE?.partE_CorporateGovernance || ''}

### F. Duy trì ROIC cao & Tái đầu tư
${report.sectionE?.partF_RoicSustenance || ''}

### G. Khả năng chống chịu & Thích ứng
${report.sectionE?.partG_ShockResilience || ''}

---

## F. TRIỂN VỌNG KINH DOANH & ĐỊNH GIÁ 3 KỊCH BẢN
### 1. Phân tích yếu tố tăng trưởng (Sản lượng, Giá bán, Chi phí)
${report.sectionF?.growthDriversRevenueAndCost || (report.sectionD as any)?.growthDriversRevenueAndCost || ''}

### 2. Dự báo KQKD & Luận điểm
${report.sectionF?.quarterlyForecastReasoning || (report.sectionD as any)?.quarterlyForecastReasoning || ''}

### 3. Kết Quả Định Giá 3 Kịch Bản
${(() => {
  const val = report.sectionF?.valuation || (report.sectionD as any)?.valuation;
  if (!val) return '';
  return `- **Kịch bản Cơ sở (Base Case)**: PE ${val.peBase}x => **${Math.round(val.epsForward * val.peBase).toLocaleString('vi-VN')} VNĐ**
- **Kịch bản Tích cực (Bull Case)**: PE ${val.peBull}x => **${Math.round(val.epsForward * val.peBull).toLocaleString('vi-VN')} VNĐ**
- **Kịch bản Thận trọng (Bear Case)**: PE ${val.peBear}x => **${Math.round(val.epsForward * val.peBear).toLocaleString('vi-VN')} VNĐ**
- EPS Forward Dự Phóng: **${val.epsForward.toLocaleString('vi-VN')} VNĐ**`;
})()}

---
*Bản quyền phân tích thuộc về ValueX (valuex.vn)*
    `;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ValueX_Bao_Cao_${report.ticker}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded('Markdown / Word format');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4 print:hidden transition-all">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-6 shadow-2xl transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="relative h-7 w-28">
            {mounted && theme === 'light' ? (
              <Image
                src="/brand/logo/logo-full-light.svg"
                alt="ValueX"
                fill
                className="object-contain object-left"
              />
            ) : (
              <Image
                src="/brand/logo/logo-full-dark.svg"
                alt="ValueX"
                fill
                className="object-contain object-left"
              />
            )}
          </div>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Xuất Báo Cáo Phân Tích</h3>
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-gray-400">
          Xuất báo cáo định giá cổ phiếu <span className="font-bold text-emerald-600 dark:text-emerald-400">{report.ticker}</span> theo chuẩn nhận diện ValueX.
        </p>

        {downloaded && (
          <div className="mt-4 flex items-center space-x-2 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Đã tải thành công định dạng {downloaded}!</span>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handlePrintPdf}
            className="flex w-full items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-left transition hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 hover:border-emerald-400 dark:hover:border-emerald-500/50 shadow-2xs"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">In / Xuất PDF ValueX</h4>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">Xem trước và in ra định dạng PDF có watermark thương hiệu</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">In / PDF →</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 p-4 text-left transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-2xs"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">Tải File Markdown (.md) / Word</h4>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">Dễ dàng sao chép và biên tập trên Word/Docs</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Tải Về →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
