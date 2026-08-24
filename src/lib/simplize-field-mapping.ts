/**
 * Bản đồ ánh xạ dữ liệu toàn diện (Comprehensive Data Field Mapping Dictionary) cho Simplize API.
 * Chuẩn hóa 100% theo Báo cáo Tài chính VAS và Chỉ số Tỷ lệ Ratio thực tế của mã HPG (gồm ratio_sample.md, balance_sheet_sample.md, income_statement_sample.md, cash_flow_sample.md).
 * 
 * Hỗ trợ 4 Endpoint chuyên biệt của Simplize:
 * 1. Balance Sheet (/api/company/fi/bs/)
 * 2. Income Statement (/api/company/fi/is/)
 * 3. Cash Flow (/api/company/fi/cf/)
 * 4. Financial Ratios & Valuation (/api/company/fi/ratio/)
 */

export interface SimplizeFieldMeta {
  code: string;
  nameVi: string;
  nameEn: string;
  unit?: string;
  description?: string;
}

/**
 * 1. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (INCOME STATEMENT - '/fi/is/')
 */
export const SIMPLIZE_INCOME_STATEMENT_MAP: Record<string, SimplizeFieldMeta> = {
  is1: { code: 'is1', nameVi: 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', nameEn: 'Net Revenue', unit: 'VND' },
  is2: { code: 'is2', nameVi: 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', nameEn: 'Gross Profit', unit: 'VND' },
  is3: { code: 'is3', nameVi: 'Lợi nhuận thuần từ hoạt động kinh doanh', nameEn: 'Operating Profit', unit: 'VND' },
  is4: { code: 'is4', nameVi: 'Doanh thu bán hàng và cung cấp dịch vụ (Tổng)', nameEn: 'Gross Sales Revenue', unit: 'VND' },
  is8: { code: 'is8', nameVi: 'Giá vốn hàng bán', nameEn: 'Cost of Goods Sold (COGS)', unit: 'VND' },
  is13: { code: 'is13', nameVi: 'Lợi nhuận kế toán trước thuế', nameEn: 'Profit Before Tax', unit: 'VND' },
  is14: { code: 'is14', nameVi: 'Lợi nhuận sau thuế của cổ đông công ty mẹ', nameEn: 'Net Profit (Parent Company Share)', unit: 'VND' },
  is37: { code: 'is37', nameVi: 'Doanh thu hoạt động tài chính', nameEn: 'Financial Income', unit: 'VND' },
  is38: { code: 'is38', nameVi: 'Chi phí tài chính', nameEn: 'Financial Expenses', unit: 'VND' },
  is39: { code: 'is39', nameVi: 'Chi phí quản lý doanh nghiệp (hoặc lãi vay)', nameEn: 'General & Admin / Interest Expenses', unit: 'VND' },
  is43: { code: 'is43', nameVi: 'Lợi nhuận khác', nameEn: 'Other Profit', unit: 'VND' },
  is44: { code: 'is44', nameVi: 'Lợi nhuận từ công ty liên doanh, liên kết', nameEn: 'Share of Profit from Associates/JV', unit: 'VND' },
  is45: { code: 'is45', nameVi: 'Thuế thu nhập doanh nghiệp', nameEn: 'Income Tax Expense', unit: 'VND' },
  is46: { code: 'is46', nameVi: 'Chi phí quản lý doanh nghiệp bổ sung', nameEn: 'Additional Admin Expenses', unit: 'VND' },
  is48: { code: 'is48', nameVi: 'Lợi nhuận kế toán sau thuế hợp nhất', nameEn: 'Consolidated Net Profit After Tax', unit: 'VND' },
  is50: { code: 'is50', nameVi: 'Các khoản giảm trừ doanh thu', nameEn: 'Revenue Deductions', unit: 'VND' },
  is52: { code: 'is52', nameVi: 'Chi phí bán hàng', nameEn: 'Selling Expenses', unit: 'VND' },
};

/**
 * 2. BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET - '/fi/bs/')
 */
export const SIMPLIZE_BALANCE_SHEET_MAP: Record<string, SimplizeFieldMeta> = {
  bs1: { code: 'bs1', nameVi: 'TỔNG TÀI SẢN / TỔNG NGUỒN VỐN', nameEn: 'TOTAL ASSETS / TOTAL RESOURCES', unit: 'VND' },
  bs2: { code: 'bs2', nameVi: 'Tài sản ngắn hạn', nameEn: 'Current Assets', unit: 'VND' },
  bs3: { code: 'bs3', nameVi: 'Tài sản dài hạn', nameEn: 'Non-current Assets', unit: 'VND' },
  bs6: { code: 'bs6', nameVi: 'Nợ phải trả', nameEn: 'Total Liabilities', unit: 'VND' },
  bs8: { code: 'bs8', nameVi: 'Nợ ngắn hạn', nameEn: 'Current Liabilities', unit: 'VND' },
  bs9: { code: 'bs9', nameVi: 'Nợ dài hạn', nameEn: 'Non-current Liabilities', unit: 'VND' },
  bs10: { code: 'bs10', nameVi: 'Vốn chủ sở hữu', nameEn: 'Owner Equity', unit: 'VND' },
  bs11: { code: 'bs11', nameVi: 'Vốn góp của chủ sở hữu / Vốn điều lệ', nameEn: 'Charter Capital / Owner Share Capital', unit: 'VND' },
  bs12: { code: 'bs12', nameVi: 'Vốn chủ sở hữu (tổng)', nameEn: 'Total Equity', unit: 'VND' },
  bs13: { code: 'bs13', nameVi: 'Tiền và các khoản tương đương tiền', nameEn: 'Cash and Cash Equivalents', unit: 'VND' },
  bs14: { code: 'bs14', nameVi: 'Tiền', nameEn: 'Cash', unit: 'VND' },
  bs15: { code: 'bs15', nameVi: 'Các khoản tương đương tiền', nameEn: 'Cash Equivalents', unit: 'VND' },
  bs16: { code: 'bs16', nameVi: 'Đầu tư tài chính ngắn hạn / Tiền gửi đáo hạn', nameEn: 'Short-term Financial Investments', unit: 'VND' },
  bs20: { code: 'bs20', nameVi: 'Các khoản phải thu ngắn hạn', nameEn: 'Short-term Receivables', unit: 'VND' },
  bs21: { code: 'bs21', nameVi: 'Phải thu ngắn hạn của khách hàng', nameEn: 'Trade Receivables', unit: 'VND' },
  bs22: { code: 'bs22', nameVi: 'Trả trước cho người bán ngắn hạn', nameEn: 'Advances to Suppliers', unit: 'VND' },
  bs26: { code: 'bs26', nameVi: 'Phải thu ngắn hạn khác', nameEn: 'Other Short-term Receivables', unit: 'VND' },
  bs27: { code: 'bs27', nameVi: 'Dự phòng phải thu ngắn hạn khó đòi', nameEn: 'Allowance for Doubtful Receivables', unit: 'VND' },
  bs29: { code: 'bs29', nameVi: 'Hàng tồn kho, ròng', nameEn: 'Inventories, Net', unit: 'VND' },
  bs30: { code: 'bs30', nameVi: 'Hàng tồn kho', nameEn: 'Inventories', unit: 'VND' },
  bs31: { code: 'bs31', nameVi: 'Dự phòng giảm giá hàng tồn kho', nameEn: 'Allowance for Decline in Value of Inventories', unit: 'VND' },
  bs32: { code: 'bs32', nameVi: 'Tài sản ngắn hạn khác', nameEn: 'Other Current Assets', unit: 'VND' },
  bs33: { code: 'bs33', nameVi: 'Chi phí trả trước ngắn hạn', nameEn: 'Short-term Prepaid Expenses', unit: 'VND' },
  bs34: { code: 'bs34', nameVi: 'Thuế giá trị gia tăng được khấu trừ', nameEn: 'Deductible VAT', unit: 'VND' },
  bs38: { code: 'bs38', nameVi: 'Các khoản phải thu dài hạn', nameEn: 'Long-term Receivables', unit: 'VND' },
  bs46: { code: 'bs46', nameVi: 'Tài sản cố định', nameEn: 'Fixed Assets', unit: 'VND' },
  bs47: { code: 'bs47', nameVi: 'Tài sản cố định hữu hình', nameEn: 'Tangible Fixed Assets', unit: 'VND' },
  bs48: { code: 'bs48', nameVi: 'Nguyên giá TSCĐ hữu hình', nameEn: 'Gross Tangible Fixed Assets', unit: 'VND' },
  bs49: { code: 'bs49', nameVi: 'Khấu hao lũy kế TSCĐ hữu hình', nameEn: 'Accumulated Depreciation Tangible Fixed Assets', unit: 'VND' },
  bs53: { code: 'bs53', nameVi: 'Tài sản cố định vô hình', nameEn: 'Intangible Fixed Assets', unit: 'VND' },
  bs56: { code: 'bs56', nameVi: 'Bất động sản đầu tư', nameEn: 'Investment Property', unit: 'VND' },
  bs59: { code: 'bs59', nameVi: 'Tài sản dở dang dài hạn', nameEn: 'Long-term Assets in Progress', unit: 'VND' },
  bs61: { code: 'bs61', nameVi: 'Chi phí xây dựng cơ bản dở dang', nameEn: 'Construction in Progress', unit: 'VND' },
  bs62: { code: 'bs62', nameVi: 'Đầu tư tài chính dài hạn', nameEn: 'Long-term Financial Investments', unit: 'VND' },
  bs68: { code: 'bs68', nameVi: 'Tài sản dài hạn khác', nameEn: 'Other Non-current Assets', unit: 'VND' },
  bs69: { code: 'bs69', nameVi: 'Chi phí trả trước dài hạn', nameEn: 'Long-term Prepaid Expenses', unit: 'VND' },
  bs74: { code: 'bs74', nameVi: 'Phải trả người bán ngắn hạn', nameEn: 'Short-term Trade Payables', unit: 'VND' },
  bs75: { code: 'bs75', nameVi: 'Người mua trả tiền trước ngắn hạn', nameEn: 'Short-term Customer Advances', unit: 'VND' },
  bs76: { code: 'bs76', nameVi: 'Thuế và các khoản phải nộp nhà nước', nameEn: 'Taxes Payable to State', unit: 'VND' },
  bs78: { code: 'bs78', nameVi: 'Chi phí phải trả ngắn hạn', nameEn: 'Short-term Accrued Expenses', unit: 'VND' },
  bs83: { code: 'bs83', nameVi: 'Vay và nợ thuê tài chính ngắn hạn', nameEn: 'Short-term Loans & Finance Leases', unit: 'VND' },
  bs85: { code: 'bs85', nameVi: 'Quỹ khen thưởng phúc lợi', nameEn: 'Bonus and Welfare Fund', unit: 'VND' },
  bs88: { code: 'bs88', nameVi: 'Phải trả nhà cung cấp dài hạn', nameEn: 'Long-term Trade Payables', unit: 'VND' },
  bs95: { code: 'bs95', nameVi: 'Vay và nợ thuê tài chính dài hạn', nameEn: 'Long-term Borrowings & Finance Leases', unit: 'VND' },
  bs104: { code: 'bs104', nameVi: 'Thặng dư vốn cổ phần', nameEn: 'Share Premium', unit: 'VND' },
  bs106: { code: 'bs106', nameVi: 'Vốn khác của chủ sở hữu', nameEn: 'Other Capital of Owners', unit: 'VND' },
  bs110: { code: 'bs110', nameVi: 'Quỹ đầu tư phát triển', nameEn: 'Investment & Development Fund', unit: 'VND' },
  bs113: { code: 'bs113', nameVi: 'Lợi nhuận sau thuế chưa phân phối', nameEn: 'Undistributed Retained Earnings', unit: 'VND' },
  bs114: { code: 'bs114', nameVi: 'LNST chưa phân phối lũy kế kỳ trước', nameEn: 'Retained Earnings Prior Periods', unit: 'VND' },
  bs115: { code: 'bs115', nameVi: 'LNST chưa phân phối kỳ này', nameEn: 'Retained Earnings Current Period', unit: 'VND' },
  bs116: { code: 'bs116', nameVi: 'Lợi ích cổ đông không kiểm soát', nameEn: 'Non-controlling Interests', unit: 'VND' },
  bs117: { code: 'bs117', nameVi: 'TỔNG NGUỒN VỐN', nameEn: 'TOTAL RESOURCES', unit: 'VND' },
};

/**
 * 3. BÁO CÁO LƯU CHUYỂN TIỀN TỆ (CASH FLOW - '/fi/cf/')
 */
export const SIMPLIZE_CASH_FLOW_MAP: Record<string, SimplizeFieldMeta> = {
  cf1: { code: 'cf1', nameVi: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', nameEn: 'Net Cash Flow from Operating Activities', unit: 'VND' },
  cf2: { code: 'cf2', nameVi: 'Lợi nhuận trước thuế', nameEn: 'Profit Before Tax', unit: 'VND' },
  cf12: { code: 'cf12', nameVi: 'Lợi nhuận từ HĐKD trước thay đổi vốn lưu động', nameEn: 'Operating Profit Before Working Capital Changes', unit: 'VND' },
  cf13: { code: 'cf13', nameVi: 'Tăng/giảm các khoản phải thu', nameEn: 'Increase/Decrease in Receivables', unit: 'VND' },
  cf14: { code: 'cf14', nameVi: 'Tăng/giảm hàng tồn kho', nameEn: 'Increase/Decrease in Inventories', unit: 'VND' },
  cf15: { code: 'cf15', nameVi: 'Tăng/giảm các khoản phải trả', nameEn: 'Increase/Decrease in Payables', unit: 'VND' },
  cf16: { code: 'cf16', nameVi: 'Tăng/giảm chi phí trả trước', nameEn: 'Increase/Decrease in Prepaid Expenses', unit: 'VND' },
  cf18: { code: 'cf18', nameVi: 'Lãi vay đã trả', nameEn: 'Interest Paid', unit: 'VND' },
  cf19: { code: 'cf19', nameVi: 'Thuế thu nhập doanh nghiệp đã nộp', nameEn: 'Income Tax Paid', unit: 'VND' },
  cf21: { code: 'cf21', nameVi: 'Tiền chi khác từ hoạt động kinh doanh', nameEn: 'Other Cash Outflows from Operating Activities', unit: 'VND' },
  cf22: { code: 'cf22', nameVi: 'Lưu chuyển tiền thuần từ hoạt động đầu tư', nameEn: 'Net Cash Flow from Investing Activities', unit: 'VND' },
  cf23: { code: 'cf23', nameVi: 'Tiền chi mua sắm, xây dựng TSCĐ (CAPEX)', nameEn: 'CAPEX (Purchase of Fixed Assets)', unit: 'VND' },
  cf24: { code: 'cf24', nameVi: 'Tiền thu từ thanh lý, nhượng bán TSCĐ', nameEn: 'Proceeds from Sales of Fixed Assets', unit: 'VND' },
  cf25: { code: 'cf25', nameVi: 'Tiền chi cho vay, mua các công cụ nợ', nameEn: 'Lending and Debt Purchase Outflows', unit: 'VND' },
  cf26: { code: 'cf26', nameVi: 'Tiền thu hồi cho vay, bán lại công cụ nợ', nameEn: 'Loan Repayments & Debt Collection Inflows', unit: 'VND' },
  cf27: { code: 'cf27', nameVi: 'Tiền chi đầu tư góp vốn vào đơn vị khác', nameEn: 'Equity Investments Outflows', unit: 'VND' },
  cf28: { code: 'cf28', nameVi: 'Tiền thu hồi đầu tư góp vốn vào đơn vị khác', nameEn: 'Proceeds from Equity Investments', unit: 'VND' },
  cf29: { code: 'cf29', nameVi: 'Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', nameEn: 'Interest, Dividends Received', unit: 'VND' },
  cf30: { code: 'cf30', nameVi: 'Lưu chuyển tiền thuần từ hoạt động tài chính', nameEn: 'Net Cash Flow from Financing Activities', unit: 'VND' },
  cf31: { code: 'cf31', nameVi: 'Tiền thu phát hành cổ phiếu, nhận vốn góp CSH', nameEn: 'Proceeds from Share Issuance/Capital Contribution', unit: 'VND' },
  cf32: { code: 'cf32', nameVi: 'Tiền chi trả vốn góp, mua lại cổ phiếu', nameEn: 'Share Buybacks/Capital Repayment', unit: 'VND' },
  cf33: { code: 'cf33', nameVi: 'Tiền vay ngắn, dài hạn được nhận', nameEn: 'Proceeds from Borrowings', unit: 'VND' },
  cf34: { code: 'cf34', nameVi: 'Tiền chi trả nợ gốc vay', nameEn: 'Repayment of Loan Principal', unit: 'VND' },
  cf36: { code: 'cf36', nameVi: 'Cổ tức, lợi nhuận đã trả cho chủ sở hữu', nameEn: 'Dividends Paid', unit: 'VND' },
  cf37: { code: 'cf37', nameVi: 'Lưu chuyển tiền thuần trong kỳ', nameEn: 'Net Cash Flow for the Period', unit: 'VND' },
  cf38: { code: 'cf38', nameVi: 'Tiền và tương đương tiền đầu kỳ', nameEn: 'Cash & Equivalents at Beginning of Period', unit: 'VND' },
  cf39: { code: 'cf39', nameVi: 'Ảnh hưởng của thay đổi tỷ giá hối đoái', nameEn: 'Effect of Exchange Rate Changes', unit: 'VND' },
  cf40: { code: 'cf40', nameVi: 'Tiền và tương đương tiền cuối kỳ', nameEn: 'Cash & Equivalents at End of Period', unit: 'VND' },
};

/**
 * 4. CHỈ SỐ TÀI CHÍNH & TỶ SỐ HIỆU QUẢ (RATIO METRICS - '/fi/ratio/')
 * Đối chiếu khớp 100% với ratio_sample.md
 */
export const SIMPLIZE_RATIO_MAP: Record<string, SimplizeFieldMeta> = {
  op1: { code: 'op1', nameVi: 'Chỉ số P/E', nameEn: 'Price to Earnings (P/E)', unit: 'lần' },
  op2: { code: 'op2', nameVi: 'Chỉ số P/B', nameEn: 'Price to Book (P/B)', unit: 'lần' },
  op3: { code: 'op3', nameVi: 'Chỉ số EV/EBITDA', nameEn: 'EV/EBITDA', unit: 'lần' },
  op4: { code: 'op4', nameVi: 'Thu nhập trên mỗi cổ phần (EPS)', nameEn: 'Earnings Per Share (EPS)', unit: 'VND/cp' },
  op5: { code: 'op5', nameVi: 'Tăng trưởng EPS (%)', nameEn: 'EPS Growth (%)', unit: '%' },
  op6: { code: 'op6', nameVi: 'Giá trị sổ sách trên mỗi cổ phần (BVPS)', nameEn: 'Book Value Per Share (BVPS)', unit: 'VND/cp' },
  op7: { code: 'op7', nameVi: 'Biên lợi nhuận gộp (%)', nameEn: 'Gross Profit Margin (%)', unit: '%' },
  op8: { code: 'op8', nameVi: 'Biên EBIT (%)', nameEn: 'EBIT Margin (%)', unit: '%' },
  op9: { code: 'op9', nameVi: 'Biên EBITDA (%)', nameEn: 'EBITDA Margin (%)', unit: '%' },
  op16: { code: 'op16', nameVi: 'Biên lợi nhuận ròng (%)', nameEn: 'Net Profit Margin (%)', unit: '%' },
  op17: { code: 'op17', nameVi: 'Tỷ suất sinh lời trên vốn chủ sở hữu ROE LTM (%)', nameEn: 'Return on Equity ROE LTM (%)', unit: '%' },
  op18: { code: 'op18', nameVi: 'Tỷ suất sinh lời trên tổng tài sản ROA LTM (%)', nameEn: 'Return on Assets ROA LTM (%)', unit: '%' },
  op19: { code: 'op19', nameVi: 'Vòng quay tài sản (vòng)', nameEn: 'Asset Turnover', unit: 'vòng' },
  op20: { code: 'op20', nameVi: 'Hiệu suất sử dụng tài sản cố định', nameEn: 'Fixed Asset Turnover', unit: 'vòng' },
  op21: { code: 'op21', nameVi: 'Số ngày thu tiền khách hàng (ngày)', nameEn: 'Days Sales Outstanding (DSO)', unit: 'ngày' },
  op22: { code: 'op22', nameVi: 'Số ngày xử lý hàng tồn kho (ngày)', nameEn: 'Days Inventory Outstanding (DIO)', unit: 'ngày' },
  op23: { code: 'op23', nameVi: 'Số ngày phải trả nhà cung cấp (ngày)', nameEn: 'Days Payable Outstanding (DPO)', unit: 'ngày' },
  op24: { code: 'op24', nameVi: 'Vòng quay tiền mặt (ngày)', nameEn: 'Cash Conversion Cycle (CCC)', unit: 'ngày' },
  op34: { code: 'op34', nameVi: 'Nợ phải trả / Vốn chủ sở hữu (%)', nameEn: 'Total Liabilities to Equity (%)', unit: '%' },
  op35: { code: 'op35', nameVi: 'Vay và nợ thuê tài chính (ngắn+dài) / Vốn chủ sở hữu (%)', nameEn: 'Total Debt to Equity (%)', unit: '%' },
  op36: { code: 'op36', nameVi: 'Nợ vay ròng / Vốn chủ sở hữu (%)', nameEn: 'Net Debt to Equity (%)', unit: '%' },
  op37: { code: 'op37', nameVi: 'Tổng tài sản / Vốn chủ sở hữu (Đòn bẩy tài chính)', nameEn: 'Financial Leverage (Assets/Equity)', unit: 'lần' },
  op44: { code: 'op44', nameVi: 'Khả năng thanh toán tổng quát', nameEn: 'Current Ratio', unit: 'lần' },
  op45: { code: 'op45', nameVi: 'Khả năng thanh toán nhanh', nameEn: 'Quick Ratio', unit: 'lần' },
  op46: { code: 'op46', nameVi: 'Khả năng thanh toán tức thời (Tiền)', nameEn: 'Cash Ratio', unit: 'lần' },
  op47: { code: 'op47', nameVi: 'Khả năng thanh toán lãi vay', nameEn: 'Interest Coverage Ratio', unit: 'lần' },
  op48: { code: 'op48', nameVi: 'Vốn hóa thị trường (VNĐ)', nameEn: 'Market Capitalization', unit: 'VND' },
  op49: { code: 'op49', nameVi: 'Số lượng cổ phiếu lưu hành (Cổ phiếu)', nameEn: 'Shares Outstanding', unit: 'Cổ phiếu' },
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
 * Tra cứu tên hiển thị tiếng Việt của một mã Simplize field bất kỳ
 */
export function getSimplizeFieldLabel(code: string): string {
  const meta = ALL_SIMPLIZE_FIELDS_MAP[code];
  if (meta) {
    return meta.nameVi;
  }
  return `Chỉ tiêu ${code.toUpperCase()}`;
}

/**
 * Interface cho dữ liệu tài chính một quý đã trích xuất & chuẩn hóa đầy đủ
 */
export interface ParsedSimplizeQuarter {
  period: string; // e.g. 'Q2/2026'
  year: number;
  quarter: number;
  
  // 1. Thông tin Doanh nghiệp & Cổ phiếu (từ Ratio API)
  sharesOutstandingMillions: number; // Số lượng cổ phiếu lưu hành (Triệu CP) - op49
  marketCapBillion: number; // Vốn hóa (Tỷ VNĐ) - op48
  eps: number; // EPS (VNĐ/CP) - op4
  epsGrowth: number; // Tăng trưởng EPS (%) - op5
  bvps: number; // BVPS (VNĐ/CP) - op6
  pe: number; // P/E - op1
  pb: number; // P/B - op2
  evEbitda: number; // EV/EBITDA - op3

  // 2. Báo cáo KQKD (Income Statement) - Đơn vị: Tỷ VNĐ
  revenue: number; // Doanh thu thuần (is1)
  grossProfit: number; // Lợi nhuận gộp (is2)
  operatingProfit: number; // Lợi nhuận thuần từ HĐKD (is3)
  profitBeforeTax: number; // Lợi nhuận trước thuế (is13)
  netProfit: number; // Lợi nhuận sau thuế của cổ đông công ty mẹ (is14)
  financialIncome: number; // Doanh thu tài chính (is37)
  financialExpenses: number; // Chi phí tài chính (is38)
  sellingExpenses: number; // Chi phí bán hàng (is52/is45)
  adminExpenses: number; // Chi phí quản lý doanh nghiệp (is39/is46)

  // 3. Bảng Cân đối Kế toán (Balance Sheet) - Đơn vị: Tỷ VNĐ
  totalAssets: number; // Tổng tài sản (bs1)
  currentAssets: number; // Tài sản ngắn hạn (bs2)
  cashAndEquivalents: number; // Tiền & tương đương tiền (bs13)
  shortTermInvestments: number; // Đầu tư ngắn hạn (bs16)
  receivables: number; // Phải thu ngắn hạn (bs20)
  inventories: number; // Hàng tồn kho, ròng (bs29)
  nonCurrentAssets: number; // Tài sản dài hạn (bs3)
  fixedAssets: number; // Tài sản cố định (bs46)
  constructionInProgress: number; // Chi phí XDCB dở dang (bs61)
  totalLiabilities: number; // Nợ phải trả (bs6)
  currentLiabilities: number; // Nợ ngắn hạn (bs8)
  nonCurrentLiabilities: number; // Nợ dài hạn (bs9)
  shortTermLoans: number; // Vay ngắn hạn (bs83)
  longTermLoans: number; // Vay dài hạn (bs95)
  ownerEquity: number; // Vốn chủ sở hữu (bs10/bs12)
  charterCapital: number; // Vốn điều lệ (bs11/bs102)

  // 4. Báo cáo Lưu chuyển tiền tệ (Cash Flow) - Đơn vị: Tỷ VNĐ
  netOperatingCashFlow: number; // LCT thuần từ HĐKD (cf1)
  netInvestingCashFlow: number; // LCT thuần từ HĐ đầu tư (cf22)
  netFinancingCashFlow: number; // LCT thuần từ HĐ tài chính (cf30)
  netCashFlowPeriod: number; // LCT thuần trong kỳ (cf37)

  // 5. Các Chỉ số Hiệu quả, Cơ cấu Nguồn vốn & Thanh toán (từ Ratio API)
  grossMargin: number; // Biên gộp % (op7 hoặc tự tính)
  ebitMargin: number; // Biên EBIT % (op8)
  ebitdaMargin: number; // Biên EBITDA % (op9)
  netMargin: number; // Biên ròng % (op16)
  roe: number; // ROE LTM % (op17)
  roa: number; // ROA LTM % (op18)
  
  assetTurnover: number; // Vòng quay tài sản (op19)
  fixedAssetTurnover: number; // Hiệu suất sử dụng TSCĐ (op20)
  receivableDays: number; // Số ngày thu tiền KH (op21)
  inventoryDays: number; // Số ngày xử lý HTK (op22)
  payableDays: number; // Số ngày trả NCC (op23)
  cashCycle: number; // Vòng quay tiền mặt (op24)

  debtToEquity: number; // Nợ phải trả / Vốn CSH % (op34)
  borrowingsToEquity: number; // Vay ngắn+dài / Vốn CSH % (op35)
  netDebtToEquity: number; // Nợ vay ròng / Vốn CSH % (op36)
  financialLeverage: number; // Tổng TS / Vốn CSH (op37)

  currentRatio: number; // Khả năng thanh toán tổng quát (op44)
  quickRatio: number; // Khả năng thanh toán nhanh (op45)
  cashRatio: number; // Khả năng thanh toán tức thời (op46)
  interestCoverage: number; // Khả năng thanh toán lãi vay (op47)
}

/**
 * Chuyển đổi dữ liệu thô từ Simplize API (tổng hợp từ is, bs, cf, ratio) sang đối tượng tài chính chuẩn hóa
 */
export function parseSimplizeItem(item: any): ParsedSimplizeQuarter {
  const periodName = item.periodDateName || ''; // e.g. 'Q2/2026'
  const match = periodName.match(/^Q([1-4])\/(\d{4})$/);
  const quarter = match ? parseInt(match[1], 10) : 1;
  const year = match ? parseInt(match[2], 10) : 2026;

  const toBillion = (val: any) => Math.round(((Number(val) || 0) / 1e9) * 10) / 10;

  // 1. Ratio Info & Shares
  const sharesOutstandingMillions = Number(item.op49) ? Math.round((Number(item.op49) / 1e6) * 100) / 100 : 0;
  const marketCapBillion = Number(item.op48) ? Math.round((Number(item.op48) / 1e9) * 10) / 10 : 0;
  const eps = Math.round(Number(item.op4) || 0);
  const epsGrowth = Number(item.op5) ? Math.round(Number(item.op5) * 10) / 10 : 0;
  const bvps = Math.round(Number(item.op6) || 0);
  const pe = Number(item.op1) ? Math.round(Number(item.op1) * 100) / 100 : 0;
  const pb = Number(item.op2) ? Math.round(Number(item.op2) * 100) / 100 : 0;
  const evEbitda = Number(item.op3) ? Math.round(Number(item.op3) * 100) / 100 : 0;

  // 2. Income Statement
  const revenue = toBillion(item.is1);
  const grossProfit = toBillion(item.is2);
  const operatingProfit = toBillion(item.is3);
  const profitBeforeTax = toBillion(item.is13);
  const netProfit = toBillion(item.is14 || item.is48);
  const financialIncome = toBillion(item.is37);
  const financialExpenses = toBillion(item.is38);
  const sellingExpenses = toBillion(item.is52 || item.is45);
  const adminExpenses = toBillion(item.is39 || item.is46);

  // 3. Balance Sheet
  const totalAssets = toBillion(item.bs1 || item.bs117);
  const currentAssets = toBillion(item.bs2);
  const cashAndEquivalents = toBillion(item.bs13 || item.bs3);
  const shortTermInvestments = toBillion(item.bs16 || item.bs9);
  const receivables = toBillion(item.bs20);
  const inventories = toBillion(item.bs29 || item.bs30);
  const nonCurrentAssets = toBillion(item.bs3 || item.bs46);
  const fixedAssets = toBillion(item.bs46 || item.bs47);
  const constructionInProgress = toBillion(item.bs61 || item.bs59);
  const totalLiabilities = toBillion(item.bs6);
  const currentLiabilities = toBillion(item.bs8 || item.bs74);
  const nonCurrentLiabilities = toBillion(item.bs9 || item.bs83);
  const shortTermLoans = toBillion(item.bs83 || item.bs102);
  const longTermLoans = toBillion(item.bs95);
  const ownerEquity = toBillion(item.bs10 || item.bs12 || item.bs113);
  const charterCapital = toBillion(item.bs11 || item.bs102);

  // 4. Cash Flow
  const netOperatingCashFlow = toBillion(item.cf1);
  const netInvestingCashFlow = toBillion(item.cf22);
  const netFinancingCashFlow = toBillion(item.cf30);
  const netCashFlowPeriod = toBillion(item.cf37);

  // 5. Operating & Financial Ratios
  const grossMargin = revenue > 0 ? Math.round(((grossProfit / revenue) * 100) * 10) / 10 : (Number(item.op7) || 0);
  const ebitMargin = Number(item.op8) ? Math.round(Number(item.op8) * 10) / 10 : 0;
  const ebitdaMargin = Number(item.op9) ? Math.round(Number(item.op9) * 10) / 10 : 0;
  const netMargin = revenue > 0 ? Math.round(((netProfit / revenue) * 100) * 10) / 10 : (Number(item.op16) || 0);
  const roe = Number(item.op17) ? Math.round(Number(item.op17) * 10) / 10 : 0;
  const roa = Number(item.op18) ? Math.round(Number(item.op18) * 10) / 10 : 0;

  const assetTurnover = Number(item.op19) ? Math.round(Number(item.op19) * 100) / 100 : 0;
  const fixedAssetTurnover = Number(item.op20) ? Math.round(Number(item.op20) * 100) / 100 : 0;
  const receivableDays = Number(item.op21) ? Math.round(Number(item.op21) * 10) / 10 : 0;
  const inventoryDays = Number(item.op22) ? Math.round(Number(item.op22) * 10) / 10 : 0;
  const payableDays = Number(item.op23) ? Math.round(Number(item.op23) * 10) / 10 : 0;
  const cashCycle = Number(item.op24) ? Math.round(Number(item.op24) * 10) / 10 : 0;

  const debtToEquity = Number(item.op34) ? Math.round(Number(item.op34) * 10) / 10 : 0;
  const borrowingsToEquity = Number(item.op35) ? Math.round(Number(item.op35) * 10) / 10 : 0;
  const netDebtToEquity = Number(item.op36) ? Math.round(Number(item.op36) * 10) / 10 : 0;
  const financialLeverage = Number(item.op37) ? Math.round(Number(item.op37) * 100) / 100 : 0;

  const currentRatio = Number(item.op44) ? Math.round(Number(item.op44) * 100) / 100 : 0;
  const quickRatio = Number(item.op45) ? Math.round(Number(item.op45) * 100) / 100 : 0;
  const cashRatio = Number(item.op46) ? Math.round(Number(item.op46) * 100) / 100 : 0;
  const interestCoverage = Number(item.op47) ? Math.round(Number(item.op47) * 10) / 10 : 0;

  return {
    period: periodName,
    year,
    quarter,
    sharesOutstandingMillions,
    marketCapBillion,
    eps,
    epsGrowth,
    bvps,
    pe,
    pb,
    evEbitda,
    revenue,
    grossProfit,
    operatingProfit,
    profitBeforeTax,
    netProfit,
    financialIncome,
    financialExpenses,
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
    totalLiabilities,
    currentLiabilities,
    nonCurrentLiabilities,
    shortTermLoans,
    longTermLoans,
    ownerEquity,
    charterCapital,
    netOperatingCashFlow,
    netInvestingCashFlow,
    netFinancingCashFlow,
    netCashFlowPeriod,
    grossMargin,
    ebitMargin,
    ebitdaMargin,
    netMargin,
    roe,
    roa,
    assetTurnover,
    fixedAssetTurnover,
    receivableDays,
    inventoryDays,
    payableDays,
    cashCycle,
    debtToEquity,
    borrowingsToEquity,
    netDebtToEquity,
    financialLeverage,
    currentRatio,
    quickRatio,
    cashRatio,
    interestCoverage,
  };
}

/**
 * Hàm gọi API tổng hợp từ 4 endpoint của Simplize cho 1 mã chứng khoán (VD: HPG)
 */
export async function fetchFullSimplizeData(ticker: string, size = 12): Promise<ParsedSimplizeQuarter[]> {
  const cleanTicker = ticker.trim().toUpperCase();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  const [bsRes, isRes, cfRes, ratioRes] = await Promise.all([
    fetch(`https://api2.simplize.vn/api/company/fi/bs/${cleanTicker}?period=Q&size=${size}`, { headers }).catch(() => null),
    fetch(`https://api2.simplize.vn/api/company/fi/is/${cleanTicker}?period=Q&size=${size}`, { headers }).catch(() => null),
    fetch(`https://api2.simplize.vn/api/company/fi/cf/${cleanTicker}?period=Q&size=${size}`, { headers }).catch(() => null),
    fetch(`https://api2.simplize.vn/api/company/fi/ratio/${cleanTicker}?period=Q&size=${size}`, { headers }).catch(() => null),
  ]);

  const bsJson = bsRes && bsRes.ok ? await bsRes.json() : null;
  const isJson = isRes && isRes.ok ? await isRes.json() : null;
  const cfJson = cfRes && cfRes.ok ? await cfRes.json() : null;
  const ratioJson = ratioRes && ratioRes.ok ? await ratioRes.json() : null;

  const bsItems: any[] = bsJson?.data?.items || [];
  const isItems: any[] = isJson?.data?.items || [];
  const cfItems: any[] = cfJson?.data?.items || [];
  const ratioItems: any[] = ratioJson?.data?.items || [];

  // Ghép nối dữ liệu theo kỳ (periodDateName / periodDate)
  const mergedByPeriod: Record<string, any> = {};

  [...ratioItems, ...bsItems, ...isItems, ...cfItems].forEach((it) => {
    const period = it.periodDateName || it.periodDate;
    if (!period) return;
    if (!mergedByPeriod[period]) {
      mergedByPeriod[period] = { ...it };
    } else {
      mergedByPeriod[period] = { ...mergedByPeriod[period], ...it };
    }
  });

  const parsedQuarters = Object.values(mergedByPeriod).map(parseSimplizeItem);

  parsedQuarters.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  return parsedQuarters;
}
