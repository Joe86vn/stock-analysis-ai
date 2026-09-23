# Hướng Dẫn Thực Thi: Khắc Phục Lỗi Mất Chữ & Định Dạng Khi In / Xuất PDF

> **Dành cho Roo Code**: Hãy thực hiện chính xác theo các bước dưới đây để khắc phục triệt để lỗi mất màu nền, mất badges và bị nuốt chữ khi in hoặc xuất PDF trên ứng dụng ValueX (Next.js 15 + React 19 + TailwindCSS v4).

---

## 1. BỐI CẢNH & NGUYÊN NHÂN LỖI
1. **Mất màu & badges**: `globals.css` có dòng `body *, div, main, section { background-color: transparent !important; }` làm biến mất toàn bộ màu nền. Đồng thời thiếu `-webkit-print-color-adjust: exact; print-color-adjust: exact;`.
2. **Bị nuốt chữ từ trang 2 trở đi**: Container chính trong `ReportViewer.tsx` có class `overflow-hidden`. Trong chế độ in của trình duyệt, `overflow-hidden` làm cắt bỏ toàn bộ nội dung nằm ngoài trang in đầu tiên.
3. **Phụ thuộc hộp thoại in Windows**: Gọi `window.print()` kích hoạt trình in của hệ điều hành đòi hỏi người dùng phải cấu hình thủ công (bật "Background graphics", căn lề). Cần bổ sung tính năng **Tải file PDF trực tiếp 1-Click** phía client mà không cần mở hộp thoại in.

---

## 2. CÀI ĐẶT THƯ VIỆN BỔ SUNG

Chạy lệnh cài đặt 2 thư viện xuất PDF client-side:
```bash
npm install html-to-image jspdf
```

---

## 3. CÁC BƯỚC THỰC HIỆN CHI TIẾT

### Bước 1: Chuẩn hóa CSS in ấn trong `src/app/globals.css`
Mở `src/app/globals.css`, tìm đến khối `@media print` (khoảng dòng 93 đến 185) và thay thế bằng nội dung chuẩn hóa sau:

```css
/* ========================================================================= */
/* Print Styles for PDF & Hardcopy Reports (Chuẩn hóa trang in A4)           */
/* ========================================================================= */
@media print {
  /* Ép buộc trình duyệt giữ nguyên toàn bộ màu nền, viền và đồ họa */
  *,
  *::before,
  *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* Reset kích thước và chống tràn/cắt trang */
  html,
  body {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    background-color: #ffffff !important;
    color: #0f172a !important;
    font-size: 10pt !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Khử bỏ các hiệu ứng bóng đổ màn hình và thanh cuộn khi in */
  * {
    box-shadow: none !important;
    text-shadow: none !important;
  }

  /* Định nghĩa khổ giấy A4 dọc chuẩn với lề 10mm */
  @page {
    size: A4 portrait;
    margin: 10mm 12mm;
  }

  /* Tiện ích ngắt trang và chống ngắt đôi khối nội dung */
  .print-avoid-break,
  .factsheet-card,
  tr,
  .memo-section {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  .print-page-break,
  .factsheet-page-1 {
    break-after: page !important;
    page-break-after: always !important;
  }

  /* Tối ưu viền bảng biểu khi in */
  table {
    border-collapse: collapse !important;
    width: 100% !important;
  }

  th {
    background-color: #f1f5f9 !important;
    color: #0f172a !important;
    border: 1px solid #cbd5e1 !important;
    font-weight: 700 !important;
  }

  td {
    border: 1px solid #e2e8f0 !important;
  }

  /* Đảm bảo chữ luôn có độ tương phản cao trên nền trắng giấy in */
  .dark {
    background-color: #ffffff !important;
    color: #0f172a !important;
  }
}
```

---

### Bước 2: Khắc phục lỗi `overflow-hidden` trong `src/components/ReportViewer.tsx`
1. Tìm thẻ `div` bao bọc chính của component `ReportViewer` (khoảng dòng 1014):
   ```tsx
   <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-5 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors duration-200">
   ```
   👉 **Thay đổi thành**:
   ```tsx
   <div 
     id="valuex-report-content"
     className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-5 shadow-sm dark:shadow-xl relative overflow-hidden print:overflow-visible print:p-0 print:border-none print:shadow-none transition-colors duration-200"
   >
   ```
   *(Thêm `id="valuex-report-content"`, `print:overflow-visible`, `print:p-0`, `print:border-none`, `print:shadow-none`)*.

---

### Bước 3: Đặt ID & chống cắt dòng trong `src/components/ExecutiveSummaryTab.tsx`
1. Tại thẻ bao bọc Factsheet (khoảng dòng 858):
   ```tsx
   {viewMode === 'factsheet' && (
     <div className="factsheet-wrapper space-y-6 print:space-y-0">
   ```
   👉 **Thêm ID**:
   ```tsx
   {viewMode === 'factsheet' && (
     <div id="valuex-factsheet-content" className="factsheet-wrapper space-y-6 print:space-y-0">
   ```
2. Thêm class `print-avoid-break` cho các block phân tích, bảng định giá hoặc thẻ khuyến nghị để các phần này không bị cắt ngang ở mép dưới trang giấy.

---

### Bước 4: Tạo module xuất PDF client-side `src/lib/pdf-export.ts`
Tạo file mới `src/lib/pdf-export.ts` với nội dung hoàn chỉnh:

```typescript
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportPdfOptions {
  filename?: string;
  quality?: number;
}

/**
 * Xuất trực tiếp một phần tử DOM thành file PDF chuẩn A4 (210mm x 297mm)
 * Sử dụng html-to-image chụp ảnh độ phân giải cao và đóng gói bằng jsPDF.
 */
export async function exportElementToPdf(
  elementId: string,
  options: ExportPdfOptions = {}
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Không tìm thấy phần tử DOM với ID: #${elementId}`);
    return false;
  }

  try {
    // 1. Chụp ảnh DOM với độ phân giải cao (pixelRatio = 2 để chữ sắc nét)
    const imgData = await toPng(element, {
      quality: options.quality || 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      filter: (node) => {
        // Loại bỏ các phần tử có class print:hidden khi xuất PDF
        if (node instanceof HTMLElement && node.classList.contains('print:hidden')) {
          return false;
        }
        return true;
      },
    });

    // 2. Tạo đối tượng PDF khổ A4 portrait (đơn vị mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210; // Chiều rộng chuẩn A4 (mm)
    const pageHeight = 297; // Chiều cao chuẩn A4 (mm)
    const margin = 8; // Lề 8mm mỗi cạnh
    const contentWidth = pageWidth - margin * 2;

    // 3. Tính toán kích thước ảnh tương ứng trong PDF
    const img = new Image();
    img.src = imgData;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const imgWidth = contentWidth;
    const imgHeight = (img.height * contentWidth) / img.width;

    let heightLeft = imgHeight;
    let position = margin;

    // 4. Render trang đầu tiên
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= (pageHeight - margin * 2);

    // 5. Nếu nội dung dài hơn 1 trang, tự động ngắt sang các trang tiếp theo
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pageHeight - margin * 2);
    }

    // 6. Lưu và kích hoạt tải về trực tiếp
    const outputFilename = options.filename || `ValueX_BaoCao_${Date.now()}.pdf`;
    pdf.save(outputFilename);
    return true;
  } catch (error) {
    console.error('Lỗi trong quá trình tạo file PDF:', error);
    throw error;
  }
}
```

---

### Bước 5: Cập nhật `src/components/ExportModal.tsx`
Mở `src/components/ExportModal.tsx`:
1. Import hàm xuất PDF và biểu tượng:
   ```typescript
   import { exportElementToPdf } from '@/lib/pdf-export';
   import { Download, FileSpreadsheet, Printer, X, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
   ```
2. Thêm state quản lý quá trình xuất:
   ```typescript
   const [isExportingPdf, setIsExportingPdf] = useState(false);
   ```
3. Thêm hàm xử lý tải PDF 1-Click:
   ```typescript
   const handleDownloadDirectPdf = async () => {
     try {
       setIsExportingPdf(true);
       // Ưu tiên xuất factsheet nếu có, ngược lại xuất toàn bộ report
       const targetId = document.getElementById('valuex-factsheet-content') 
         ? 'valuex-factsheet-content' 
         : 'valuex-report-content';
         
       const filename = `ValueX_Bao_Cao_${report.ticker}_${new Date().toISOString().slice(0, 10)}.pdf`;
       await exportElementToPdf(targetId, { filename });
       setDownloaded('PDF trực tiếp (Chuẩn A4)');
     } catch (err) {
       alert('Không thể xuất file PDF trực tiếp. Vui lòng thử lại hoặc dùng tùy chọn In.');
     } finally {
       setIsExportingPdf(false);
     }
   };
   ```
4. Thêm nút bấm **"⚡ Tải PDF Báo Cáo Trực Tiếp (1-Click)"** vào danh sách lựa chọn trong Modal (đặt trên đầu các tùy chọn):
   ```tsx
   {/* Tùy chọn 1: Tải trực tiếp 1-Click (Khuyến nghị) */}
   <button
     onClick={handleDownloadDirectPdf}
     disabled={isExportingPdf}
     className="flex w-full items-center justify-between rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-left transition hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 shadow-xs disabled:opacity-60"
   >
     <div className="flex items-center space-x-3">
       <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
         {isExportingPdf ? (
           <Loader2 className="h-5 w-5 animate-spin" />
         ) : (
           <Download className="h-5 w-5" />
         )}
       </div>
       <div>
         <div className="flex items-center space-x-1.5">
           <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">
             Tải PDF Trực Tiếp (1-Click Khuyến Nghị)
           </h4>
           <span className="rounded bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300">
             Nhanh &amp; Nét
           </span>
         </div>
         <p className="text-[11px] text-slate-500 dark:text-gray-400">
           {isExportingPdf ? 'Đang kết xuất trang PDF...' : 'Tải file .pdf chuẩn màu sắc & bố cục, không cần qua máy in'}
         </p>
       </div>
     </div>
     <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
       {isExportingPdf ? 'Đang tạo...' : 'Tải PDF ↓'}
     </span>
   </button>

   {/* Tùy chọn 2: In qua Trình in Windows (Ctrl + P) */}
   <button
     onClick={handlePrintPdf}
     className="flex w-full items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/80"
   >
     <div className="flex items-center space-x-3">
       <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300">
         <Printer className="h-5 w-5" />
       </div>
       <div>
         <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">
           In / Lưu qua Trình In Windows
         </h4>
         <p className="text-[11px] text-slate-500 dark:text-gray-400">
           Mở hộp thoại máy in (Ctrl + P) để in ấn hoặc chỉnh kích thước
         </p>
       </div>
     </div>
     <span className="text-xs font-bold text-slate-600 dark:text-gray-400">
       Mở Máy In →
     </span>
   </button>
   ```

---

## 4. KIỂM THỬ & NGHIỆM THU

Sau khi thực hiện xong, chạy các lệnh kiểm tra bắt buộc:
1. **Kiểm tra TypeScript**:
   ```bash
   npx tsc --noEmit
   ```
   *(Phải kết thúc với 0 lỗi).*

2. **Kiểm tra Build**:
   ```bash
   npm run build
   ```
   *(Phải build production thành công).*

3. **Kiểm tra Giao diện trên trình duyệt**:
   - Nhấn **"Xuất PDF/Word"** -> Nhấn **"Tải PDF Trực Tiếp (1-Click)"** -> Kiểm tra file tải về xem có đầy đủ logo, badges, bảng số liệu và chữ sắc nét không.
   - Nhấn **"In / Lưu qua Trình In Windows"** -> Kiểm tra bản xem trước in xem màu nền và chữ có còn bị mất không.
