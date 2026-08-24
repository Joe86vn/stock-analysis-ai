/**
 * Bản đồ ánh xạ dữ liệu (Data Field Mapping Dictionary) cho Simplize API.
 * Chuẩn hóa theo Hệ thống Tài khoản & Báo cáo Tài chính VAS (Việt Nam).
 * 
 * Đối chiếu từ dữ liệu BCTC thực tế: Balance Sheet, Income Statement, Cash Flow.
 */

export interface SimplizeFieldMeta {
  code: string;
  nameVi: string;
  nameEn: string;
  unit?: string;
  description?: string;
}

/**
 * 1. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (INCOME STATEMENT - 'is')
 */
export const SIMPLIZE_INCOME_STATEMENT_MAP: Record<string, SimplizeFieldMeta> = {
  is1: { code: 'is1', nameVi: 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', nameEn: 'Net Revenue', unit: 'VND' },
  is2: { code: 'is2', nameVi: 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', nameEn: 'Gross Profit', unit: 'VND' },
  is3: { code: 'is3', nameVi: 'Lợi nhuận thuần từ hoạt động kinh doanh', nameEn: 'Operating Profit', unit: 'VND' },
  is4: { code: 'is4', nameVi: 'Tổng chi phí hoạt động', nameEn: 'Total Operating Expenses', unit: 'VND' },
  is13: { code: 'is13', nameVi: 'Lợi nhuận kế toán trước thuế', nameEn: 'Profit Before Tax', unit: 'VND' },
  is14: { code: 'is14', nameVi: 'Lợi nhuận sau thuế của cổ đông công ty mẹ', nameEn: 'Net Profit (Parent Company Share)', unit: 'VND' },
  is37: { code: 'is37', nameVi: 'Doanh thu hoạt động tài chính', nameEn: 'Financial Income', unit: 'VND' },
  is38: { code: 'is38', nameVi: 'Chi phí tài chính', nameEn: 'Financial Expenses', unit: 'VND' },
  is39: { code: 'is39', nameVi: 'Trong đó: Chi phí lãi vay', nameEn: 'Interest Expenses', unit: 'VND' },
  is43: { code: 'is43', nameVi: 'Lợi nhuận từ công ty liên doanh, liên kết', nameEn: 'Share of Profit from Associates/Joint Ventures', unit: 'VND' },
  is45: { code: 'is45', nameVi: 'Chi phí bán hàng', nameEn: 'Selling Expenses', unit: 'VND' },
  is46: { code: 'is46', nameVi: 'Chi phí quản lý doanh nghiệp', nameEn: 'General & Admin Expenses', unit: 'VND' },
  is48: { code: 'is48', nameVi: 'Lợi nhuận thuần từ HĐKD (tính chi tiết)', nameEn: 'Net Operating Profit', unit: 'VND' },
  is50: { code: 'is50', nameVi: 'Lợi nhuận khác', nameEn: 'Other Profit', unit: 'VND' },
  is51: { code: 'is51', nameVi: 'Thu nhập khác', nameEn: 'Other Income', unit: 'VND' },
  is52: { code: 'is52', nameVi: 'Chi phí khác', nameEn: 'Other Expenses', unit: 'VND' },
  is112: { code: 'is112', nameVi: 'Chi phí thuế TNDN hiện hành', nameEn: 'Current Income Tax Expense', unit: 'VND' },
  is115: { code: 'is115', nameVi: 'Lợi nhuận kế toán sau thuế hợp nhất', nameEn: 'Consolidated Net Profit After Tax', unit: 'VND' },
};

/**
 * 2. BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET - 'bs')
 */
export const SIMPLIZE_BALANCE_SHEET_MAP: Record<string, SimplizeFieldMeta> = {
  bs1: { code: 'bs1', nameVi: 'TỔNG TÀI SẢN', nameEn: 'TOTAL ASSETS', unit: 'VND' },
  bs2: { code: 'bs2', nameVi: 'Tài sản ngắn hạn', nameEn: 'Current Assets', unit: 'VND' },
  bs3: { code: 'bs3', nameVi: 'Tiền và các khoản tương đương tiền', nameEn: 'Cash and Cash Equivalents', unit: 'VND' },
  bs6: { code: 'bs6', nameVi: 'Tiền', nameEn: 'Cash', unit: 'VND' },
  bs8: { code: 'bs8', nameVi: 'Các khoản tương đương tiền', nameEn: 'Cash Equivalents', unit: 'VND' },
  bs9: { code: 'bs9', nameVi: 'Đầu tư tài chính ngắn hạn', nameEn: 'Short-term Financial Investments', unit: 'VND' },
  bs11: { code: 'bs11', nameVi: 'Vốn điều lệ / Vốn góp của chủ sở hữu', nameEn: 'Charter Capital / Owner Share Capital', unit: 'VND' },
  bs12: { code: 'bs12', nameVi: 'Tổng vốn chủ sở hữu', nameEn: 'Total Owner Equity', unit: 'VND' },
  bs16: { code: 'bs16', nameVi: 'Đầu tư nắm giữ đến ngày đáo hạn ngắn hạn', nameEn: 'Held-to-Maturity Short-term Investments', unit: 'VND' },
  bs20: { code: 'bs20', nameVi: 'Các khoản phải thu ngắn hạn', nameEn: 'Short-term Receivables', unit: 'VND' },
  bs21: { code: 'bs21', nameVi: 'Phải thu ngắn hạn của khách hàng', nameEn: 'Trade Receivables', unit: 'VND' },
  bs26: { code: 'bs26', nameVi: 'Phải thu ngắn hạn khác', nameEn: 'Other Short-term Receivables', unit: 'VND' },
  bs27: { code: 'bs27', nameVi: 'Dự phòng phải thu ngắn hạn khó đòi', nameEn: 'Allowance for Doubtful Short-term Receivables', unit: 'VND' },
  bs29: { code: 'bs29', nameVi: 'Hàng tồn kho, ròng', nameEn: 'Inventories, Net', unit: 'VND' },
  bs30: { code: 'bs30', nameVi: 'Hàng tồn kho', nameEn: 'Inventories', unit: 'VND' },
  bs31: { code: 'bs31', nameVi: 'Dự phòng giảm giá hàng tồn kho', nameEn: 'Allowance for Decline in Value of Inventories', unit: 'VND' },
  bs46: { code: 'bs46', nameVi: 'Tài sản dài hạn', nameEn: 'Non-current Assets', unit: 'VND' },
  bs48: { code: 'bs48', nameVi: 'Tài sản cố định', nameEn: 'Fixed Assets', unit: 'VND' },
  bs59: { code: 'bs59', nameVi: 'Tài sản dở dang dài hạn (Chi phí XDCB dở dang)', nameEn: 'Construction in Progress', unit: 'VND' },
  bs74: { code: 'bs74', nameVi: 'Nợ ngắn hạn', nameEn: 'Current Liabilities', unit: 'VND' },
  bs75: { code: 'bs75', nameVi: 'Phải trả người bán ngắn hạn', nameEn: 'Short-term Trade Payables', unit: 'VND' },
  bs76: { code: 'bs76', nameVi: 'Người mua trả tiền trước ngắn hạn', nameEn: 'Short-term Advances from Customers', unit: 'VND' },
  bs83: { code: 'bs83', nameVi: 'Nợ dài hạn', nameEn: 'Non-current Liabilities', unit: 'VND' },
  bs102: { code: 'bs102', nameVi: 'Vay và nợ thuê tài chính ngắn hạn', nameEn: 'Short-term Loans & Finance Leases', unit: 'VND' },
  bs113: { code: 'bs113', nameVi: 'VỐN CHỦ SỞ HỮU', nameEn: 'OWNER EQUITY', unit: 'VND' },
  bs114: { code: 'bs114', nameVi: 'Vốn góp của chủ sở hữu', nameEn: 'Paid-in Capital', unit: 'VND' },
  bs115: { code: 'bs115', nameVi: 'Lợi nhuận sau thuế chưa phân phối', nameEn: 'Undistributed Retained Earnings', unit: 'VND' },
  bs117: { code: 'bs117', nameVi: 'TỔNG NGUỒN VỐN', nameEn: 'TOTAL RESOURCES & EQUITY', unit: 'VND' },
};

/**
 * 3. BÁO CÁO LƯU CHUYỂN TIỀN TỆ (CASH FLOW - 'cf')
 */
export const SIMPLIZE_CASH_FLOW_MAP: Record<string, SimplizeFieldMeta> = {
  cf1: { code: 'cf1', nameVi: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', nameEn: 'Net Cash Flow from Operating Activities', unit: 'VND' },
  cf2: { code: 'cf2', nameVi: 'Lưu chuyển tiền thuần từ hoạt động đầu tư', nameEn: 'Net Cash Flow from Investing Activities', unit: 'VND' },
  cf3: { code: 'cf3', nameVi: 'Lưu chuyển tiền thuần từ hoạt động tài chính', nameEn: 'Net Cash Flow from Financing Activities', unit: 'VND' },
  cf4: { code: 'cf4', nameVi: 'Lưu chuyển tiền thuần trong kỳ', nameEn: 'Net Cash Flow for the Period', unit: 'VND' },
};

/**
 * 4. CHỈ SỐ TÀI CHÍNH & TỶ SỐ HIỆU QUẢ (RATIO METRICS - 'op')
 */
export const SIMPLIZE_RATIO_MAP: Record<string, SimplizeFieldMeta> = {
  op1: { code: 'op1', nameVi: 'Biên lợi nhuận gộp (%)', nameEn: 'Gross Profit Margin (%)', unit: '%' },
  op2: { code: 'op2', nameVi: 'Biên lợi nhuận ròng (%)', nameEn: 'Net Profit Margin (%)', unit: '%' },
  op3: { code: 'op3', nameVi: 'Tỷ suất sinh lời trên vốn chủ sở hữu ROE (%)', nameEn: 'Return on Equity ROE (%)', unit: '%' },
  op4: { code: 'op4', nameVi: 'Tỷ suất sinh lời trên tổng tài sản ROA (%)', nameEn: 'Return on Assets ROA (%)', unit: '%' },
  op5: { code: 'op5', nameVi: 'Tỷ lệ Nợ / Vốn chủ sở hữu (D/E ratio)', nameEn: 'Debt-to-Equity Ratio', unit: 'lần' },
  op6: { code: 'op6', nameVi: 'Thu nhập trên mỗi cổ phần (EPS)', nameEn: 'Earnings Per Share (EPS)', unit: 'VND/cp' },
  op7: { code: 'op7', nameVi: 'Giá trị sổ sách trên mỗi cổ phần (BVPS)', nameEn: 'Book Value Per Share (BVPS)', unit: 'VND/cp' },
  op8: { code: 'op8', nameVi: 'Chỉ số P/E', nameEn: 'Price to Earnings (P/E)', unit: 'lần' },
  op9: { code: 'op9', nameVi: 'Chỉ số P/B', nameEn: 'Price to Book (P/B)', unit: 'lần' },
};

/**
 * TỔNG HỢP TẤT CẢ DICTIONARY MAPPING
 */
export const ALL_SIMPLIZE_FIELDS_MAP: Record<string, SimplizeFieldMeta> = {
  ...SIMPLIZE_INCOME_STATEMENT_MAP,
  ...SIMPLIZE_BALANCE_SHEET_MAP,
  ...SIMPLIZE_CASH_FLOW_MAP,
  ...SIMPLIZE_RATIO_MAP,
};

/**
 * Tra cứu tên hiển thị tiếng Việt của một mã Simplize field bất kỳ (ví dụ: 'is2', 'bs29')
 */
export function getSimplizeFieldLabel(code: string): string {
  const meta = ALL_SIMPLIZE_FIELDS_MAP[code];
  if (meta) {
    return meta.nameVi;
  }
  return `Chỉ tiêu ${code.toUpperCase()}`;
}

/**
 * Interface cho dữ liệu tài chính một quý đã trích xuất & chuẩn hóa
 */
export interface ParsedSimplizeQuarter {
  period: string; // e.g. 'Q2/2026'
  year: number;
  quarter: number;
  
  // Báo cáo KQKD (Income Statement) - Đơn vị: Tỷ VNĐ
  revenue: number; // Doanh thu thuần (is1)
  grossProfit: number; // Lợi nhuận gộp (is2)
  operatingProfit: number; // Lợi nhuận thuần từ HĐKD (is3)
  profitBeforeTax: number; // Lợi nhuận trước thuế (is13)
  netProfit: number; // Lợi nhuận sau thuế của công ty mẹ (is14)
  financialIncome: number; // Doanh thu tài chính (is37)
  financialExpenses: number; // Chi phí tài chính (is38)
  interestExpenses: number; // Chi phí lãi vay (is39)
  sellingExpenses: number; // Chi phí bán hàng (is45)
  adminExpenses: number; // Chi phí quản lý doanh nghiệp (is46)

  // Bảng Cân đối Kế toán (Balance Sheet) - Đơn vị: Tỷ VNĐ
  totalAssets: number; // Tổng tài sản (bs1)
  currentAssets: number; // Tài sản ngắn hạn (bs2)
  cashAndEquivalents: number; // Tiền & tương đương tiền (bs3)
  shortTermInvestments: number; // Đầu tư ngắn hạn (bs9)
  receivables: number; // Phải thu ngắn hạn (bs20)
  inventories: number; // Hàng tồn kho (bs29)
  nonCurrentAssets: number; // Tài sản dài hạn (bs46)
  fixedAssets: number; // Tài sản cố định (bs48)
  constructionInProgress: number; // Chi phí XDCB dở dang (bs59)
  currentLiabilities: number; // Nợ ngắn hạn (bs74)
  nonCurrentLiabilities: number; // Nợ dài hạn (bs83)
  shortTermLoans: number; // Vay ngắn hạn (bs102)
  ownerEquity: number; // Vốn chủ sở hữu (bs113)
  charterCapital: number; // Vốn điều lệ (bs11)

  // Chỉ số hiệu quả (Ratios)
  grossMargin: number; // Biên gộp % (op1 hoặc tự tính)
  netMargin: number; // Biên ròng % (op2)
  roe: number; // ROE % (op3)
  roa: number; // ROA % (op4)
  eps: number; // EPS (op6)
}

/**
 * Chuyển đổi dữ liệu thô từ Simplize API sang đối tượng tài chính chuẩn hóa
 */
export function parseSimplizeItem(item: any): ParsedSimplizeQuarter {
  const periodName = item.periodDateName || ''; // e.g. 'Q2/2026'
  const match = periodName.match(/^Q([1-4])\/(\d{4})$/);
  const quarter = match ? parseInt(match[1], 10) : 1;
  const year = match ? parseInt(match[2], 10) : 2026;

  const toBillion = (val: any) => Math.round(((Number(val) || 0) / 1e9) * 10) / 10;

  const revenue = toBillion(item.is1);
  const grossProfit = toBillion(item.is2);
  const operatingProfit = toBillion(item.is3);
  const profitBeforeTax = toBillion(item.is13);
  const netProfit = toBillion(item.is14);
  const financialIncome = toBillion(item.is37);
  const financialExpenses = toBillion(item.is38);
  const interestExpenses = toBillion(item.is39);
  const sellingExpenses = toBillion(item.is45);
  const adminExpenses = toBillion(item.is46);

  const totalAssets = toBillion(item.bs1);
  const currentAssets = toBillion(item.bs2);
  const cashAndEquivalents = toBillion(item.bs3);
  const shortTermInvestments = toBillion(item.bs9);
  const receivables = toBillion(item.bs20);
  const inventories = toBillion(item.bs29);
  const nonCurrentAssets = toBillion(item.bs46);
  const fixedAssets = toBillion(item.bs48);
  const constructionInProgress = toBillion(item.bs59);
  const currentLiabilities = toBillion(item.bs74);
  const nonCurrentLiabilities = toBillion(item.bs83);
  const shortTermLoans = toBillion(item.bs102);
  const ownerEquity = toBillion(item.bs113);
  const charterCapital = toBillion(item.bs11);

  const grossMargin = revenue > 0 ? Math.round(((grossProfit / revenue) * 100) * 10) / 10 : (Number(item.op1) || 0);
  const netMargin = revenue > 0 ? Math.round(((netProfit / revenue) * 100) * 10) / 10 : (Number(item.op2) || 0);
  const roe = Number(item.op3) ? Math.round(Number(item.op3) * 10) / 10 : 0;
  const roa = Number(item.op4) ? Math.round(Number(item.op4) * 10) / 10 : 0;
  const eps = Math.round(Number(item.op6) || 0);

  return {
    period: periodName,
    year,
    quarter,
    revenue,
    grossProfit,
    operatingProfit,
    profitBeforeTax,
    netProfit,
    financialIncome,
    financialExpenses,
    interestExpenses,
    sellingExpenses,
    adminExpenses,
    totalAssets,
    currentAssets,
    cashAndEquivalents,
    shortTermInvestments,
    receivables,
    inventories,
    nonCurrentAssets,
    fixedAssets,
    constructionInProgress,
    currentLiabilities,
    nonCurrentLiabilities,
    shortTermLoans,
    ownerEquity,
    charterCapital,
    grossMargin,
    netMargin,
    roe,
    roa,
    eps,
  };
}
