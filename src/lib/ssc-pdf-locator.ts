import fs from 'fs';
import pdf from 'pdf-parse';

export interface LocatedIncomeStatement {
  pageNumbers: number[];
  textSnippet: string;
  isScanned: boolean;
  totalPages: number;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm không dấu
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Đọc file PDF và định vị trang chứa "Báo cáo kết quả hoạt động kinh doanh"
 */
export async function locateIncomeStatementPages(
  pdfBufferOrPath: Buffer | string
): Promise<LocatedIncomeStatement> {
  let buffer: Buffer;
  if (typeof pdfBufferOrPath === 'string') {
    if (!fs.existsSync(pdfBufferOrPath)) {
      throw new Error(`File not found: ${pdfBufferOrPath}`);
    }
    buffer = fs.readFileSync(pdfBufferOrPath);
  } else {
    buffer = pdfBufferOrPath;
  }

  const pagesText: string[] = [];

  // Sử dụng pagerender của pdf-parse để phân tách nội dung từng trang
  const parseOptions = {
    pagerender: (pageData: any) => {
      return pageData.getTextContent().then((textContent: any) => {
        const text = textContent.items.map((item: any) => item.str).join(' ');
        pagesText.push(text);
        return text;
      });
    },
  };

  try {
    await pdf(buffer, parseOptions);
  } catch (err: any) {
    console.warn('[PDF Locator] Error parsing PDF text layer:', err.message);
  }

  const totalPages = pagesText.length;
  let totalChars = 0;
  for (const t of pagesText) {
    totalChars += t.length;
  }

  // Nếu toàn bộ file PDF có quá ít ký tự (< 500 ký tự cho toàn bộ tài liệu), đây là PDF bản scan ảnh
  const isScanned = totalChars < 500 || totalPages === 0;

  if (isScanned) {
    return {
      pageNumbers: [1, 2, 3, 4, 5, 6, 7, 8].filter((p) => p <= (totalPages || 10)),
      textSnippet: '',
      isScanned: true,
      totalPages,
    };
  }

  // Quét từng trang tìm từ khóa Báo cáo kết quả hoạt động kinh doanh
  let targetPageIndex = -1;

  for (let i = 0; i < pagesText.length; i++) {
    const pageNorm = normalizeText(pagesText[i]);

    // Các biến thể tiêu đề chuẩn
    const hasTitle =
      pageNorm.includes('ket qua hoat dong kinh doanh') ||
      pageNorm.includes('bao cao ket qua kinh doanh') ||
      pageNorm.includes('income statement') ||
      pageNorm.includes('statement of income');

    // Các tiêu chí kế toán chuẩn của DN sản xuất / thương mại
    const hasRevenue =
      pageNorm.includes('doanh thu ban hang') ||
      pageNorm.includes('doanh thu thuan') ||
      pageNorm.includes('net revenue');

    const hasGrossProfit =
      pageNorm.includes('loi nhuan gop') ||
      pageNorm.includes('gia von') ||
      pageNorm.includes('gross profit');

    if (hasTitle && (hasRevenue || hasGrossProfit)) {
      targetPageIndex = i;
      break;
    }
  }

  // Nếu không tìm thấy tiêu đề chính xác, quét trang có nhiều từ khóa chỉ tiêu kế toán nhất
  if (targetPageIndex === -1) {
    for (let i = 0; i < pagesText.length; i++) {
      const pageNorm = normalizeText(pagesText[i]);
      if (
        (pageNorm.includes('doanh thu thuan') || pageNorm.includes('doanh thu ban hang')) &&
        (pageNorm.includes('gia von hang ban') || pageNorm.includes('loi nhuan gop')) &&
        pageNorm.includes('loi nhuan sau thue')
      ) {
        targetPageIndex = i;
        break;
      }
    }
  }

  if (targetPageIndex !== -1) {
    const targetPageNum = targetPageIndex + 1;
    const pageNumbers = [targetPageNum];
    let combinedSnippet = `--- TRANG ${targetPageNum} ---\n${pagesText[targetPageIndex]}`;

    // Kiểm tra xem trang hiện tại đã có chỉ tiêu "Lợi nhuận sau thuế" chưa
    const currentPageNorm = normalizeText(pagesText[targetPageIndex]);
    const hasNetProfit =
      currentPageNorm.includes('loi nhuan sau thue') ||
      currentPageNorm.includes('lai sau thue') ||
      currentPageNorm.includes('net profit after tax');

    // Nếu chưa có LNST và còn trang kế tiếp, gộp thêm trang N+1 (do bảng bị ngắt trang)
    if (!hasNetProfit && targetPageIndex + 1 < pagesText.length) {
      const nextPageNum = targetPageNum + 1;
      pageNumbers.push(nextPageNum);
      combinedSnippet += `\n\n--- TRANG ${nextPageNum} (NGẮT TRANG KẾ TIẾP) ---\n${pagesText[targetPageIndex + 1]}`;
    }

    return {
      pageNumbers,
      textSnippet: combinedSnippet,
      isScanned: false,
      totalPages,
    };
  }

  // Fallback: nếu không tìm thấy chính xác, lấy các trang từ 4 đến 8 (vị trí kinh điển của Báo cáo KQKD)
  const fallbackIndices = [3, 4, 5, 6, 7].filter((idx) => idx < pagesText.length);
  const fallbackPages = fallbackIndices.map((idx) => idx + 1);
  const fallbackSnippet = fallbackIndices
    .map((idx) => `--- TRANG ${idx + 1} ---\n${pagesText[idx]}`)
    .join('\n\n');

  return {
    pageNumbers: fallbackPages,
    textSnippet: fallbackSnippet,
    isScanned: false,
    totalPages,
  };
}

/**
 * Xóa file PDF tạm sau khi đã bóc tách số liệu
 */
export function cleanupTempPdf(filePath: string): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[PDF Cleanup] Successfully removed temporary file: ${filePath}`);
    }
  } catch (err: any) {
    console.warn(`[PDF Cleanup] Failed to delete temporary file ${filePath}:`, err.message);
  }
}
