/**
 * Bản đồ ánh xạ dữ liệu toàn diện (Comprehensive Data Field Mapping Dictionary) cho Vietcap IQ API.
 * Chuẩn hóa 100% theo VAS / Thông tư 200 và hệ thống chỉ số tài chính Vietcap IQ Insight Service.
 * 
 * Hỗ trợ 5 Endpoint chuyên biệt của Vietcap IQ:
 * 1. Income Statement (/api/iq-insight-service/v1/company/{ticker}/financial-statement?section=INCOME_STATEMENT)
 * 2. Balance Sheet (/api/iq-insight-service/v1/company/{ticker}/financial-statement?section=BALANCE_SHEET)
 * 3. Cash Flow (/api/iq-insight-service/v1/company/{ticker}/financial-statement?section=CASH_FLOW)
 * 4. Notes to Financial Statements (/api/iq-insight-service/v1/company/{ticker}/financial-statement?section=NOTE)
 * 5. Statistics Financial & Valuation Ratios (/api/iq-insight-service/v1/company/{ticker}/statistics-financial)
 */

export interface VietcapFieldMeta {
  code: string;
  nameVi: string;
  nameEn: string;
  unit?: string;
  description?: string;
}

/**
 * 1. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (INCOME STATEMENT - 'isa')
 */
export const VIETCAP_INCOME_STATEMENT_MAP: Record<string, VietcapFieldMeta> = {
  isa1: { code: 'isa1', nameVi: 'Doanh thu bán hàng và cung cấp dịch vụ (Tổng)', nameEn: 'Gross Sales Revenue', unit: 'VND' },
  isa2: { code: 'isa2', nameVi: 'Các khoản giảm trừ doanh thu', nameEn: 'Revenue Deductions', unit: 'VND' },
  isa3: { code: 'isa3', nameVi: 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', nameEn: 'Net Revenue', unit: 'VND' },
  isa4: { code: 'isa4', nameVi: 'Giá vốn hàng bán', nameEn: 'Cost of Goods Sold (COGS)', unit: 'VND' },
  isa5: { code: 'isa5', nameVi: 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', nameEn: 'Gross Profit', unit: 'VND' },
  isa6: { code: 'isa6', nameVi: 'Doanh thu hoạt động tài chính', nameEn: 'Financial Income', unit: 'VND' },
  isa7: { code: 'isa7', nameVi: 'Chi phí tài chính', nameEn: 'Financial Expenses', unit: 'VND' },
  isa8: { code: 'isa8', nameVi: 'Trong đó: Chi phí lãi vay', nameEn: 'In which: Interest Expenses', unit: 'VND' },
  isa9: { code: 'isa9', nameVi: 'Chi phí bán hàng', nameEn: 'Selling Expenses', unit: 'VND' },
  isa10: { code: 'isa10', nameVi: 'Chi phí quản lý doanh nghiệp', nameEn: 'General & Admin Expenses', unit: 'VND' },
  isa11: { code: 'isa11', nameVi: 'Lợi nhuận thuần từ hoạt động kinh doanh', nameEn: 'Operating Profit', unit: 'VND' },
  isa12: { code: 'isa12', nameVi: 'Thu nhập khác', nameEn: 'Other Income', unit: 'VND' },
  isa13: { code: 'isa13', nameVi: 'Chi phí khác', nameEn: 'Other Expenses', unit: 'VND' },
  isa14: { code: 'isa14', nameVi: 'Lợi nhuận khác', nameEn: 'Other Profit', unit: 'VND' },
  isa15: { code: 'isa15', nameVi: 'Phần lãi/lỗ trong công ty liên doanh, liên kết', nameEn: 'Share of Profit/Loss from Associates & JV', unit: 'VND' },
  isa16: { code: 'isa16', nameVi: 'Tổng lợi nhuận kế toán trước thuế', nameEn: 'Profit Before Tax', unit: 'VND' },
  isa17: { code: 'isa17', nameVi: 'Chi phí thuế TNDN hiện hành', nameEn: 'Current Corporate Income Tax Expense', unit: 'VND' },
  isa18: { code: 'isa18', nameVi: 'Chi phí thuế TNDN hoãn lại', nameEn: 'Deferred Income Tax Expense', unit: 'VND' },
  isa19: { code: 'isa19', nameVi: 'Tổng chi phí thuế TNDN', nameEn: 'Total Income Tax Expense', unit: 'VND' },
  isa20: { code: 'isa20', nameVi: 'Lợi nhuận sau thuế thu nhập doanh nghiệp', nameEn: 'Net Profit After Tax', unit: 'VND' },
  isa21: { code: 'isa21', nameVi: 'Lợi ích của cổ đông không kiểm soát', nameEn: 'Non-controlling Interests', unit: 'VND' },
  isa22: { code: 'isa22', nameVi: 'Lợi nhuận sau thuế của cổ đông công ty mẹ (NPAT-MI)', nameEn: 'Net Profit of Parent Company Shareholders', unit: 'VND' },
  isa102: { code: 'isa102', nameVi: 'Lãi cơ bản trên cổ phiếu (EPS cơ bản)', nameEn: 'Basic EPS', unit: 'VND/cp' },
  isa103: { code: 'isa103', nameVi: 'Lãi suy giảm trên cổ phiếu (EPS pha loãng)', nameEn: 'Diluted EPS', unit: 'VND/cp' },
};

/**
 * 2. BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET - 'bsa')
 */
export const VIETCAP_BALANCE_SHEET_MAP: Record<string, VietcapFieldMeta> = {
  bsa1: { code: 'bsa1', nameVi: 'TÀI SẢN NGẮN HẠN', nameEn: 'CURRENT ASSETS', unit: 'VND' },
  bsa2: { code: 'bsa2', nameVi: 'Tiền và các khoản tương đương tiền', nameEn: 'Cash and Cash Equivalents', unit: 'VND' },
  bsa3: { code: 'bsa3', nameVi: 'Tiền', nameEn: 'Cash', unit: 'VND' },
  bsa4: { code: 'bsa4', nameVi: 'Các khoản tương đương tiền', nameEn: 'Cash Equivalents', unit: 'VND' },
  bsa5: { code: 'bsa5', nameVi: 'Đầu tư tài chính ngắn hạn', nameEn: 'Short-term Financial Investments', unit: 'VND' },
  bsa6: { code: 'bsa6', nameVi: 'Chứng khoán kinh doanh', nameEn: 'Trading Securities', unit: 'VND' },
  bsa8: { code: 'bsa8', nameVi: 'Các khoản phải thu ngắn hạn', nameEn: 'Short-term Receivables', unit: 'VND' },
  bsa9: { code: 'bsa9', nameVi: 'Phải thu ngắn hạn của khách hàng', nameEn: 'Trade Accounts Receivable', unit: 'VND' },
  bsa10: { code: 'bsa10', nameVi: 'Trả trước cho người bán ngắn hạn', nameEn: 'Prepayments to Suppliers', unit: 'VND' },
  bsa13: { code: 'bsa13', nameVi: 'Phải thu ngắn hạn khác', nameEn: 'Other Short-term Receivables', unit: 'VND' },
  bsa14: { code: 'bsa14', nameVi: 'Dự phòng phải thu ngắn hạn khó đòi', nameEn: 'Provision for Doubtful Debts', unit: 'VND' },
  bsa15: { code: 'bsa15', nameVi: 'Hàng tồn kho, ròng', nameEn: 'Inventories, Net', unit: 'VND' },
  bsa16: { code: 'bsa16', nameVi: 'Hàng tồn kho (Tổng)', nameEn: 'Inventories, Gross', unit: 'VND' },
  bsa17: { code: 'bsa17', nameVi: 'Dự phòng giảm giá hàng tồn kho', nameEn: 'Provision for Decline in Value of Inventories', unit: 'VND' },
  bsa18: { code: 'bsa18', nameVi: 'Tài sản ngắn hạn khác', nameEn: 'Other Current Assets', unit: 'VND' },
  bsa19: { code: 'bsa19', nameVi: 'Chi phí trả trước ngắn hạn', nameEn: 'Short-term Prepaid Expenses', unit: 'VND' },
  bsa20: { code: 'bsa20', nameVi: 'Thuế GTGT được khấu trừ', nameEn: 'Deductible VAT', unit: 'VND' },
  bsa23: { code: 'bsa23', nameVi: 'TÀI SẢN DÀI HẠN', nameEn: 'NON-CURRENT ASSETS', unit: 'VND' },
  bsa24: { code: 'bsa24', nameVi: 'Các khoản phải thu dài hạn', nameEn: 'Long-term Receivables', unit: 'VND' },
  bsa29: { code: 'bsa29', nameVi: 'Tài sản cố định', nameEn: 'Fixed Assets', unit: 'VND' },
  bsa30: { code: 'bsa30', nameVi: 'Tài sản cố định hữu hình', nameEn: 'Tangible Fixed Assets', unit: 'VND' },
  bsa31: { code: 'bsa31', nameVi: 'Nguyên giá TSCĐ hữu hình', nameEn: 'Gross Tangible Fixed Assets', unit: 'VND' },
  bsa32: { code: 'bsa32', nameVi: 'Khấu hao lũy kế TSCĐ hữu hình', nameEn: 'Accumulated Depreciation Tangible Fixed Assets', unit: 'VND' },
  bsa36: { code: 'bsa36', nameVi: 'Tài sản cố định vô hình', nameEn: 'Intangible Fixed Assets', unit: 'VND' },
  bsa40: { code: 'bsa40', nameVi: 'Tài sản dở dang dài hạn', nameEn: 'Long-term Assets in Progress', unit: 'VND' },
  bsa41: { code: 'bsa41', nameVi: 'Chi phí xây dựng cơ bản dở dang', nameEn: 'Construction in Progress', unit: 'VND' },
  bsa43: { code: 'bsa43', nameVi: 'Đầu tư tài chính dài hạn', nameEn: 'Long-term Financial Investments', unit: 'VND' },
  bsa45: { code: 'bsa45', nameVi: 'Đầu tư vào công ty liên doanh, liên kết', nameEn: 'Investments in Associates & JV', unit: 'VND' },
  bsa49: { code: 'bsa49', nameVi: 'Tài sản dài hạn khác', nameEn: 'Other Non-current Assets', unit: 'VND' },
  bsa50: { code: 'bsa50', nameVi: 'Chi phí trả trước dài hạn', nameEn: 'Long-term Prepaid Expenses', unit: 'VND' },
  bsa53: { code: 'bsa53', nameVi: 'TỔNG CỘNG TÀI SẢN', nameEn: 'TOTAL ASSETS', unit: 'VND' },
  bsa54: { code: 'bsa54', nameVi: 'NỢ PHẢI TRẢ', nameEn: 'TOTAL LIABILITIES', unit: 'VND' },
  bsa55: { code: 'bsa55', nameVi: 'Nợ ngắn hạn', nameEn: 'Current Liabilities', unit: 'VND' },
  bsa56: { code: 'bsa56', nameVi: 'Phải trả người bán ngắn hạn', nameEn: 'Short-term Trade Accounts Payable', unit: 'VND' },
  bsa57: { code: 'bsa57', nameVi: 'Người mua trả tiền trước ngắn hạn', nameEn: 'Short-term Advances from Customers', unit: 'VND' },
  bsa58: { code: 'bsa58', nameVi: 'Thuế và các khoản phải nộp Nhà nước', nameEn: 'Taxes Payable to the State Budget', unit: 'VND' },
  bsa59: { code: 'bsa59', nameVi: 'Phải trả người lao động', nameEn: 'Payables to Employees', unit: 'VND' },
  bsa60: { code: 'bsa60', nameVi: 'Chi phí phải trả ngắn hạn', nameEn: 'Short-term Accrued Expenses', unit: 'VND' },
  bsa67: { code: 'bsa67', nameVi: 'Vay và nợ thuê tài chính ngắn hạn', nameEn: 'Short-term Borrowings and Finance Leases', unit: 'VND' },
  bsa71: { code: 'bsa71', nameVi: 'Nợ dài hạn', nameEn: 'Non-current Liabilities', unit: 'VND' },
  bsa74: { code: 'bsa74', nameVi: 'Phải trả dài hạn khác', nameEn: 'Other Long-term Payables', unit: 'VND' },
  bsa78: { code: 'bsa78', nameVi: 'Vay và nợ thuê tài chính dài hạn', nameEn: 'Long-term Borrowings and Finance Leases', unit: 'VND' },
  bsa79: { code: 'bsa79', nameVi: 'VỐN CHỦ SỞ HỮU', nameEn: 'OWNER EQUITY', unit: 'VND' },
  bsa80: { code: 'bsa80', nameVi: 'Vốn góp của chủ sở hữu (Vốn điều lệ)', nameEn: 'Charter Capital / Share Capital', unit: 'VND' },
  bsa81: { code: 'bsa81', nameVi: 'Thặng dư vốn cổ phần', nameEn: 'Share Premium', unit: 'VND' },
  bsa86: { code: 'bsa86', nameVi: 'Quỹ đầu tư phát triển', nameEn: 'Investment & Development Fund', unit: 'VND' },
  bsa90: { code: 'bsa90', nameVi: 'Lợi nhuận sau thuế chưa phân phối', nameEn: 'Undistributed Retained Earnings', unit: 'VND' },
  bsa96: { code: 'bsa96', nameVi: 'TỔNG CỘNG NGUỒN VỐN', nameEn: 'TOTAL RESOURCES', unit: 'VND' },
};

/**
 * 3. BÁO CÁO LƯU CHUYỂN TIỀN TỆ (CASH FLOW - 'cfa')
 */
export const VIETCAP_CASH_FLOW_MAP: Record<string, VietcapFieldMeta> = {
  cfa1: { code: 'cfa1', nameVi: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', nameEn: 'Net Cash Flow from Operating Activities', unit: 'VND' },
  cfa2: { code: 'cfa2', nameVi: 'Khấu hao TSCĐ và BĐS đầu tư', nameEn: 'Depreciation and Amortization', unit: 'VND' },
  cfa7: { code: 'cfa7', nameVi: 'Chi phí lãi vay', nameEn: 'Interest Expenses', unit: 'VND' },
  cfa9: { code: 'cfa9', nameVi: 'Lợi nhuận kinh doanh trước thay đổi VLĐ', nameEn: 'Operating Profit Before Working Capital Changes', unit: 'VND' },
  cfa10: { code: 'cfa10', nameVi: 'Tăng/giảm các khoản phải thu', nameEn: 'Increase/Decrease in Receivables', unit: 'VND' },
  cfa11: { code: 'cfa11', nameVi: 'Tăng/giảm hàng tồn kho', nameEn: 'Increase/Decrease in Inventories', unit: 'VND' },
  cfa12: { code: 'cfa12', nameVi: 'Tăng/giảm các khoản phải trả', nameEn: 'Increase/Decrease in Payables', unit: 'VND' },
  cfa14: { code: 'cfa14', nameVi: 'Tiền lãi vay đã trả', nameEn: 'Interest Paid', unit: 'VND' },
  cfa15: { code: 'cfa15', nameVi: 'Thuế TNDN đã nộp', nameEn: 'Income Tax Paid', unit: 'VND' },
  cfa18: { code: 'cfa18', nameVi: 'Lưu chuyển tiền thuần từ hoạt động đầu tư', nameEn: 'Net Cash Flow from Investing Activities', unit: 'VND' },
  cfa21: { code: 'cfa21', nameVi: 'Tiền chi để mua sắm, xây dựng TSCĐ (CAPEX)', nameEn: 'CAPEX (Purchase & Construction of Fixed Assets)', unit: 'VND' },
  cfa22: { code: 'cfa22', nameVi: 'Tiền thu từ thanh lý, nhượng bán TSCĐ', nameEn: 'Proceeds from Disposal of Fixed Assets', unit: 'VND' },
  cfa25: { code: 'cfa25', nameVi: 'Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', nameEn: 'Interest, Dividends Received', unit: 'VND' },
  cfa26: { code: 'cfa26', nameVi: 'Lưu chuyển tiền thuần từ HĐĐT (tổng hợp)', nameEn: 'Net Cash Flow from Investing Activities (Total)', unit: 'VND' },
  cfa29: { code: 'cfa29', nameVi: 'Tiền thu từ đi vay', nameEn: 'Proceeds from Borrowings', unit: 'VND' },
  cfa30: { code: 'cfa30', nameVi: 'Tiền chi trả nợ gốc vay', nameEn: 'Repayment of Borrowings', unit: 'VND' },
  cfa32: { code: 'cfa32', nameVi: 'Cổ tức, lợi nhuận đã trả cho chủ sở hữu', nameEn: 'Dividends Paid to Owners', unit: 'VND' },
  cfa36: { code: 'cfa36', nameVi: 'Lưu chuyển tiền thuần từ hoạt động tài chính', nameEn: 'Net Cash Flow from Financing Activities', unit: 'VND' },
  cfa37: { code: 'cfa37', nameVi: 'Lưu chuyển tiền thuần trong kỳ', nameEn: 'Net Cash Flow for the Period', unit: 'VND' },
  cfa38: { code: 'cfa38', nameVi: 'Tiền và tương đương tiền cuối kỳ', nameEn: 'Cash & Cash Equivalents at End of Period', unit: 'VND' },
};

/**
 * 4. CHỈ SỐ TÀI CHÍNH & TỶ SỐ HIỆU QUẢ (STATISTICS FINANCIAL / RATIOS)
 */
export const VIETCAP_STATISTIC_MAP: Record<string, VietcapFieldMeta> = {
  pe: { code: 'pe', nameVi: 'Hệ số giá trên thu nhập (P/E)', nameEn: 'Price to Earnings (P/E)', unit: 'lần' },
  pb: { code: 'pb', nameVi: 'Hệ số giá trên giá trị sổ sách (P/B)', nameEn: 'Price to Book (P/B)', unit: 'lần' },
  ps: { code: 'ps', nameVi: 'Hệ số giá trên doanh thu (P/S)', nameEn: 'Price to Sales (P/S)', unit: 'lần' },
  evToEbitda: { code: 'evToEbitda', nameVi: 'Chỉ số EV/EBITDA', nameEn: 'EV/EBITDA', unit: 'lần' },
  priceToCashFlow: { code: 'priceToCashFlow', nameVi: 'Chỉ số P/CF', nameEn: 'Price to Cash Flow', unit: 'lần' },
  roe: { code: 'roe', nameVi: 'Tỷ suất sinh lời trên vốn chủ sở hữu (ROE)', nameEn: 'Return on Equity (ROE)', unit: '%' },
  roa: { code: 'roa', nameVi: 'Tỷ suất sinh lời trên tổng tài sản (ROA)', nameEn: 'Return on Assets (ROA)', unit: '%' },
  roic: { code: 'roic', nameVi: 'Tỷ suất sinh lời trên vốn đầu tư (ROIC)', nameEn: 'Return on Invested Capital (ROIC)', unit: '%' },
  grossMargin: { code: 'grossMargin', nameVi: 'Biên lợi nhuận gộp', nameEn: 'Gross Margin', unit: '%' },
  ebitMargin: { code: 'ebitMargin', nameVi: 'Biên EBIT', nameEn: 'EBIT Margin', unit: '%' },
  preTaxProfitMargin: { code: 'preTaxProfitMargin', nameVi: 'Biên lợi nhuận trước thuế', nameEn: 'Pre-Tax Margin', unit: '%' },
  afterTaxProfitMargin: { code: 'afterTaxProfitMargin', nameVi: 'Biên lợi nhuận ròng (Net Margin)', nameEn: 'Net Margin', unit: '%' },
  assetTurnover: { code: 'assetTurnover', nameVi: 'Vòng quay tổng tài sản', nameEn: 'Asset Turnover', unit: 'vòng' },
  fixedAssetTurnover: { code: 'fixedAssetTurnover', nameVi: 'Hiệu suất sử dụng tài sản cố định', nameEn: 'Fixed Asset Turnover', unit: 'vòng' },
  daySaleOutstanding: { code: 'daySaleOutstanding', nameVi: 'Số ngày thu tiền khách hàng (DSO)', nameEn: 'Days Sales Outstanding (DSO)', unit: 'ngày' },
  daysInventoryOutstanding: { code: 'daysInventoryOutstanding', nameVi: 'Số ngày lưu kho (DIO)', nameEn: 'Days Inventory Outstanding (DIO)', unit: 'ngày' },
  daysPayableOutstanding: { code: 'daysPayableOutstanding', nameVi: 'Số ngày phải trả nhà cung cấp (DPO)', nameEn: 'Days Payable Outstanding (DPO)', unit: 'ngày' },
  cashCycle: { code: 'cashCycle', nameVi: 'Chu kỳ chuyển đổi tiền mặt (CCC)', nameEn: 'Cash Conversion Cycle (CCC)', unit: 'ngày' },
  currentRatio: { code: 'currentRatio', nameVi: 'Hệ số thanh toán hiện hành', nameEn: 'Current Ratio', unit: 'lần' },
  quickRatio: { code: 'quickRatio', nameVi: 'Hệ số thanh toán nhanh', nameEn: 'Quick Ratio', unit: 'lần' },
  cashRatio: { code: 'cashRatio', nameVi: 'Hệ số thanh toán tức thời (Tiền)', nameEn: 'Cash Ratio', unit: 'lần' },
  debtToEquity: { code: 'debtToEquity', nameVi: 'Nợ phải trả / Vốn chủ sở hữu', nameEn: 'Debt to Equity', unit: '%' },
  debtPerEquity: { code: 'debtPerEquity', nameVi: 'Nợ vay ròng / Vốn chủ sở hữu', nameEn: 'Net Debt to Equity', unit: '%' },
  financialLeverage: { code: 'financialLeverage', nameVi: 'Đòn bẩy tài chính (Tổng TS / Vốn CSH)', nameEn: 'Financial Leverage', unit: 'lần' },
  ebit: { code: 'ebit', nameVi: 'EBIT (Lợi nhuận trước lãi vay & thuế)', nameEn: 'EBIT', unit: 'VND' },
  ebitda: { code: 'ebitda', nameVi: 'EBITDA (Lợi nhuận trước lãi vay, thuế & khấu hao)', nameEn: 'EBITDA', unit: 'VND' },
  marketCap: { code: 'marketCap', nameVi: 'Vốn hóa thị trường', nameEn: 'Market Capitalization', unit: 'VND' },
  numberOfSharesMktCap: { code: 'numberOfSharesMktCap', nameVi: 'Số lượng cổ phiếu lưu hành', nameEn: 'Shares Outstanding', unit: 'Cổ phiếu' },
};

/**
 * 5. THUYẾT MINH BÁO CÁO TÀI CHÍNH (NOTES - 'noc')
 */
export const VIETCAP_NOTE_MAP: Record<string, VietcapFieldMeta> = {
  noc1: { code: 'noc1', nameVi: 'Tiền gửi ngân hàng không kỳ hạn & Tiền mặt', nameEn: 'Cash at Bank & Cash on Hand', unit: 'VND' },
  noc5: { code: 'noc5', nameVi: 'Tiền gửi có kỳ hạn ngắn hạn', nameEn: 'Short-term Bank Deposits', unit: 'VND' },
  noc6: { code: 'noc6', nameVi: 'Đầu tư nắm giữ đến ngày đáo hạn (ngắn hạn)', nameEn: 'Held-to-maturity Investments (Short-term)', unit: 'VND' },
  noc15: { code: 'noc15', nameVi: 'Phải thu khách hàng chi tiết', nameEn: 'Trade Receivables Breakdown', unit: 'VND' },
  noc35: { code: 'noc35', nameVi: 'Nguyên vật liệu và Thành phẩm tồn kho', nameEn: 'Raw Materials & Finished Goods Inventory', unit: 'VND' },
  noc39: { code: 'noc39', nameVi: 'Dự phòng giảm giá hàng tồn kho chi tiết', nameEn: 'Inventory Provision Breakdown', unit: 'VND' },
  noc102: { code: 'noc102', nameVi: 'Doanh thu bán thành phẩm và hàng hóa', nameEn: 'Revenue from Sale of Goods & Finished Products', unit: 'VND' },
  noc106: { code: 'noc106', nameVi: 'Chiết khấu thương mại và Giảm giá hàng bán', nameEn: 'Trade Discounts & Sales Allowances', unit: 'VND' },
  noc113: { code: 'noc113', nameVi: 'Giá vốn thành phẩm và hàng hóa đã bán', nameEn: 'Cost of Finished Goods Sold', unit: 'VND' },
  noc122: { code: 'noc122', nameVi: 'Lãi tiền gửi, tiền cho vay', nameEn: 'Interest Income from Deposits & Loans', unit: 'VND' },
  noc123: { code: 'noc123', nameVi: 'Lãi chênh lệch tỷ giá hối đoái', nameEn: 'Foreign Exchange Gain', unit: 'VND' },
  noc124: { code: 'noc124', nameVi: 'Lãi bán các khoản đầu tư / Thoái vốn / Cổ tức', nameEn: 'Gain from Disposal of Investments / Dividends', unit: 'VND' },
  noc131: { code: 'noc131', nameVi: 'Chi phí lãi tiền vay chi tiết', nameEn: 'Borrowing Costs / Interest Expense Breakdown', unit: 'VND' },
  noc132: { code: 'noc132', nameVi: 'Lỗ chênh lệch tỷ giá hối đoái', nameEn: 'Foreign Exchange Loss', unit: 'VND' },
  noc133: { code: 'noc133', nameVi: 'Dự phòng giảm giá chứng khoán & tổn thất đầu tư', nameEn: 'Provision for Investments & Securities', unit: 'VND' },
  noc141: { code: 'noc141', nameVi: 'Thu nhập từ thanh lý, nhượng bán TSCĐ', nameEn: 'Gain on Disposal of Fixed Assets', unit: 'VND' },
  noc142: { code: 'noc142', nameVi: 'Thu tiền phạt, bồi thường được nhận', nameEn: 'Compensation & Penalty Income', unit: 'VND' },
  noc151: { code: 'noc151', nameVi: 'Chi phí phạt vi phạm, thanh lý TSCĐ', nameEn: 'Fines & Disposal of Assets Expense', unit: 'VND' },
};

export const ALL_VIETCAP_FIELDS_MAP: Record<string, VietcapFieldMeta> = {
  ...VIETCAP_INCOME_STATEMENT_MAP,
  ...VIETCAP_BALANCE_SHEET_MAP,
  ...VIETCAP_CASH_FLOW_MAP,
  ...VIETCAP_STATISTIC_MAP,
  ...VIETCAP_NOTE_MAP,
};

export function getVietcapFieldLabel(code: string): string {
  const meta = ALL_VIETCAP_FIELDS_MAP[code];
  if (meta) {
    return meta.nameVi;
  }
  return `Chỉ tiêu ${code.toUpperCase()}`;
}

/**
 * Interface cho dữ liệu tài chính một quý đã trích xuất & chuẩn hóa đầy đủ từ Vietcap IQ API
 */
export interface ParsedVietcapQuarter {
  period: string; // e.g. 'Q2/2026'
  year: number;
  quarter: number;
  
  // 1. Thông tin Doanh nghiệp & Cổ phiếu (từ Statistics Financial)
  sharesOutstandingMillions: number; // Số lượng cổ phiếu lưu hành (Triệu CP)
  marketCapBillion: number; // Vốn hóa (Tỷ VNĐ)
  eps: number; // EPS (VNĐ/CP)
  epsGrowth?: number; // Tăng trưởng EPS (%)
  bvps: number; // BVPS (VNĐ/CP)
  pe: number; // P/E
  pb: number; // P/B
  ps: number; // P/S
  evEbitda: number; // EV/EBITDA
  priceToCashFlow: number; // P/CF
  dividendYield: number; // Tỷ suất cổ tức %

  // 2. Báo cáo KQKD (Income Statement) - Đơn vị: Tỷ VNĐ
  revenue: number; // Doanh thu thuần (isa3)
  grossRevenue: number; // Doanh thu tổng (isa1)
  revenueDeductions: number; // Giảm trừ doanh thu (isa2)
  costOfGoodsSold: number; // Giá vốn hàng bán (isa4)
  grossProfit: number; // Lợi nhuận gộp (isa5)
  operatingProfit: number; // Lợi nhuận thuần từ HĐKD (isa11)
  profitBeforeTax: number; // Lợi nhuận trước thuế (isa16)
  netProfit: number; // Lợi nhuận sau thuế của cổ đông công ty mẹ (isa22)
  consolidatedNetProfit: number; // LNST hợp nhất (isa20)
  nonControllingInterests: number; // Lợi ích CĐ không kiểm soát (isa21)
  financialIncome: number; // Doanh thu tài chính (isa6)
  financialExpenses: number; // Chi phí tài chính (isa7)
  interestExpenses: number; // Chi phí lãi vay (isa8)
  sellingExpenses: number; // Chi phí bán hàng (isa9)
  adminExpenses: number; // Chi phí quản lý doanh nghiệp (isa10)
  otherProfit: number; // Lợi nhuận khác (isa14)
  totalTax: number; // Chi phí thuế TNDN (isa19)

  // 3. Bảng Cân đối Kế toán (Balance Sheet) - Đơn vị: Tỷ VNĐ
  totalAssets: number; // Tổng tài sản (bsa53 / bsa96)
  currentAssets: number; // Tài sản ngắn hạn (bsa1)
  cashAndEquivalents: number; // Tiền & tương đương tiền (bsa2)
  shortTermInvestments: number; // Đầu tư ngắn hạn (bsa5)
  receivables: number; // Phải thu ngắn hạn (bsa8)
  tradeReceivables: number; // Phải thu KH (bsa9)
  inventories: number; // Hàng tồn kho, ròng (bsa15)
  nonCurrentAssets: number; // Tài sản dài hạn (bsa23)
  fixedAssets: number; // Tài sản cố định (bsa29)
  tangibleFixedAssets: number; // TSCĐ hữu hình (bsa30)
  constructionInProgress: number; // Chi phí XDCB dở dang (bsa40/bsa41)
  longTermInvestments: number; // Đầu tư tài chính dài hạn (bsa43)
  totalLiabilities: number; // Nợ phải trả (bsa54)
  currentLiabilities: number; // Nợ ngắn hạn (bsa55)
  tradePayables: number; // Phải trả người bán (bsa56)
  customerAdvances: number; // Người mua trả trước (bsa57)
  nonCurrentLiabilities: number; // Nợ dài hạn (bsa71)
  shortTermLoans: number; // Vay ngắn hạn (bsa67)
  longTermLoans: number; // Vay dài hạn (bsa78)
  totalDebt: number; // Tổng nợ vay (Vay ngắn + dài)
  ownerEquity: number; // Vốn chủ sở hữu (bsa79)
  charterCapital: number; // Vốn điều lệ (bsa80)
  retainedEarnings: number; // LNST chưa phân phối (bsa90)

  // 4. Báo cáo Lưu chuyển tiền tệ (Cash Flow) - Đơn vị: Tỷ VNĐ
  netOperatingCashFlow: number; // LCT thuần từ HĐKD (cfa1)
  netInvestingCashFlow: number; // LCT thuần từ HĐ đầu tư (cfa18/cfa26)
  capex: number; // Tiền chi mua sắm, xây dựng TSCĐ (cfa21)
  netFinancingCashFlow: number; // LCT thuần từ HĐ tài chính (cfa36)
  dividendsPaid: number; // Cổ tức đã trả (cfa32)
  netCashFlowPeriod: number; // LCT thuần trong kỳ (cfa37)
  cashAtEndOfPeriod: number; // Tiền và tương đương tiền cuối kỳ (cfa38)

  // 5. Các Chỉ số Hiệu quả, Cơ cấu Nguồn vốn & Thanh toán (từ Statistics Financial API)
  grossMargin: number; // Biên gộp %
  ebitMargin: number; // Biên EBIT %
  preTaxMargin: number; // Biên trước thuế %
  netMargin: number; // Biên ròng %
  roe: number; // ROE %
  roa: number; // ROA %
  roic: number; // ROIC %
  
  assetTurnover: number; // Vòng quay tài sản (vòng)
  fixedAssetTurnover: number; // Hiệu suất sử dụng TSCĐ (vòng)
  receivableDays: number; // Số ngày thu tiền KH (ngày) - DSO
  inventoryDays: number; // Số ngày xử lý HTK (ngày) - DIO
  payableDays: number; // Số ngày trả NCC (ngày) - DPO
  cashCycle: number; // Vòng quay tiền mặt (ngày) - CCC

  debtToEquity: number; // Nợ phải trả / Vốn CSH %
  netDebtToEquity: number; // Nợ vay ròng / Vốn CSH %
  financialLeverage: number; // Tổng TS / Vốn CSH (lần)

  currentRatio: number; // Khả năng thanh toán hiện hành (lần)
  quickRatio: number; // Khả năng thanh toán nhanh (lần)
  cashRatio: number; // Khả năng thanh toán tức thời (lần)
  
  ebitBillion: number; // EBIT (Tỷ VNĐ)
  ebitdaBillion: number; // EBITDA (Tỷ VNĐ)

  // 6. Thuyết minh BCTC nổi bật (Notes Summary)
  noteHighlights?: {
    cashInBankBillion?: number; // noc1
    shortTermDepositsBillion?: number; // noc5
    interestIncomeBillion?: number; // noc122
    fxGainBillion?: number; // noc123
    investmentDisposalGainBillion?: number; // noc124
    interestExpenseBillion?: number; // noc131
    fxLossBillion?: number; // noc132
    investmentProvisionBillion?: number; // noc133
    assetDisposalGainBillion?: number; // noc141
    compensationIncomeBillion?: number; // noc142
    penaltiesAndDisposalLossBillion?: number; // noc151
  };
}

/**
 * Interface cho dữ liệu tài chính theo Năm (Years)
 */
export type ParsedVietcapYear = ParsedVietcapQuarter;

/**
 * Hàm chuẩn hóa 1 bản ghi Quý từ Vietcap
 */
export function parseVietcapQuarter(
  isItem: any = {},
  bsItem: any = {},
  cfItem: any = {},
  statItem: any = {},
  noteItem: any = {}
): ParsedVietcapQuarter {
  const year = isItem.yearReport || bsItem.yearReport || cfItem.yearReport || statItem.yearReport || (typeof statItem.year === 'string' ? parseInt(statItem.year, 10) : 2026);
  const quarter = isItem.lengthReport || bsItem.lengthReport || cfItem.lengthReport || statItem.quarter || 1;
  const period = `Q${quarter}/${year}`;

  const toBillion = (val: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return 0;
    return Math.round(((Number(val)) / 1e9) * 10) / 10;
  };

  const toPercent = (val: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return 0;
    const num = Number(val);
    // Vietcap statistics API returns ratios as decimals (e.g., 0.2285 for 22.85%)
    // If num is already in decimal scale (< 2 && > -2), multiply by 100
    const pct = Math.abs(num) < 2 && num !== 0 ? num * 100 : num;
    return Math.round(pct * 10) / 10;
  };

  const toRatio = (val: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return 0;
    return Math.round(Number(val) * 100) / 100;
  };

  // 1. Statistics & Valuation
  const sharesOutstandingMillions = statItem.numberOfSharesMktCap ? Math.round((Number(statItem.numberOfSharesMktCap) / 1e6) * 100) / 100 : 0;
  const marketCapBillion = toBillion(statItem.marketCap);
  const eps = Math.round(Number(isItem.isa102 || isItem.isa103 || (isItem.isa22 && statItem.numberOfSharesMktCap ? (Number(isItem.isa22) / Number(statItem.numberOfSharesMktCap)) : 0)) || 0);
  const bvps = bsItem.bsa79 && statItem.numberOfSharesMktCap ? Math.round(Number(bsItem.bsa79) / Number(statItem.numberOfSharesMktCap)) : 0;
  const pe = toRatio(statItem.pe);
  const pb = toRatio(statItem.pb);
  const ps = toRatio(statItem.ps);
  const evEbitda = toRatio(statItem.evToEbitda);
  const priceToCashFlow = toRatio(statItem.priceToCashFlow);
  const dividendYield = toPercent(statItem.dividendYield);

  // 2. Income Statement
  const revenue = toBillion(isItem.isa3 || isItem.isa1);
  const grossRevenue = toBillion(isItem.isa1);
  const revenueDeductions = toBillion(isItem.isa2);
  const costOfGoodsSold = toBillion(isItem.isa4);
  const grossProfit = toBillion(isItem.isa5);
  const operatingProfit = toBillion(isItem.isa11);
  const profitBeforeTax = toBillion(isItem.isa16);
  const netProfit = toBillion(isItem.isa22 || isItem.isa20);
  const consolidatedNetProfit = toBillion(isItem.isa20);
  const nonControllingInterests = toBillion(isItem.isa21);
  const financialIncome = toBillion(isItem.isa6);
  const financialExpenses = toBillion(isItem.isa7);
  const interestExpenses = toBillion(isItem.isa8);
  const sellingExpenses = toBillion(isItem.isa9);
  const adminExpenses = toBillion(isItem.isa10);
  const otherProfit = toBillion(isItem.isa14);
  const totalTax = toBillion(isItem.isa19 || isItem.isa17);

  // 3. Balance Sheet
  const totalAssets = toBillion(bsItem.bsa53 || bsItem.bsa96);
  const currentAssets = toBillion(bsItem.bsa1);
  const cashAndEquivalents = toBillion(bsItem.bsa2);
  const shortTermInvestments = toBillion(bsItem.bsa5);
  const receivables = toBillion(bsItem.bsa8);
  const tradeReceivables = toBillion(bsItem.bsa9);
  const inventories = toBillion(bsItem.bsa15 || bsItem.bsa16);
  const nonCurrentAssets = toBillion(bsItem.bsa23);
  const fixedAssets = toBillion(bsItem.bsa29);
  const tangibleFixedAssets = toBillion(bsItem.bsa30);
  const constructionInProgress = toBillion(bsItem.bsa40 || bsItem.bsa41 || bsItem.bsa49);
  const longTermInvestments = toBillion(bsItem.bsa43);
  const totalLiabilities = toBillion(bsItem.bsa54);
  const currentLiabilities = toBillion(bsItem.bsa55);
  const tradePayables = toBillion(bsItem.bsa56);
  const customerAdvances = toBillion(bsItem.bsa57);
  const nonCurrentLiabilities = toBillion(bsItem.bsa71);
  const shortTermLoans = toBillion(bsItem.bsa67);
  const longTermLoans = toBillion(bsItem.bsa78);
  const totalDebt = Math.round((shortTermLoans + longTermLoans) * 10) / 10;
  const ownerEquity = toBillion(bsItem.bsa79);
  const charterCapital = toBillion(bsItem.bsa80);
  const retainedEarnings = toBillion(bsItem.bsa90);

  // 4. Cash Flow
  const netOperatingCashFlow = toBillion(cfItem.cfa1);
  const netInvestingCashFlow = toBillion(cfItem.cfa18 || cfItem.cfa26);
  const capex = toBillion(cfItem.cfa21);
  const netFinancingCashFlow = toBillion(cfItem.cfa36);
  const dividendsPaid = toBillion(cfItem.cfa32);
  const netCashFlowPeriod = toBillion(cfItem.cfa37);
  const cashAtEndOfPeriod = toBillion(cfItem.cfa38);

  // 5. Operating & Financial Ratios
  const grossMargin = statItem.grossMargin !== undefined ? toPercent(statItem.grossMargin) : (revenue > 0 ? Math.round(((grossProfit / revenue) * 100) * 10) / 10 : 0);
  const ebitMargin = statItem.ebitMargin !== undefined ? toPercent(statItem.ebitMargin) : 0;
  const preTaxMargin = statItem.preTaxProfitMargin !== undefined ? toPercent(statItem.preTaxProfitMargin) : (revenue > 0 ? Math.round(((profitBeforeTax / revenue) * 100) * 10) / 10 : 0);
  const netMargin = statItem.afterTaxProfitMargin !== undefined ? toPercent(statItem.afterTaxProfitMargin) : (revenue > 0 ? Math.round(((netProfit / revenue) * 100) * 10) / 10 : 0);
  const roe = toPercent(statItem.roe);
  const roa = toPercent(statItem.roa);
  const roic = toPercent(statItem.roic);

  const assetTurnover = toRatio(statItem.assetTurnover);
  const fixedAssetTurnover = toRatio(statItem.fixedAssetTurnover);
  const receivableDays = Math.round(Number(statItem.daySaleOutstanding) || 0);
  const inventoryDays = Math.round(Number(statItem.daysInventoryOutstanding) || 0);
  const payableDays = Math.round(Number(statItem.daysPayableOutstanding) || 0);
  const cashCycle = Math.round(Number(statItem.cashCycle) || 0);

  const debtToEquity = toPercent(statItem.debtToEquity || (ownerEquity > 0 ? (totalLiabilities / ownerEquity) * 100 : 0));
  const netDebtToEquity = toPercent(statItem.debtPerEquity);
  const financialLeverage = toRatio(statItem.financialLeverage || (ownerEquity > 0 ? totalAssets / ownerEquity : 0));

  const currentRatio = toRatio(statItem.currentRatio || (currentLiabilities > 0 ? currentAssets / currentLiabilities : 0));
  const quickRatio = toRatio(statItem.quickRatio || (currentLiabilities > 0 ? (currentAssets - inventories) / currentLiabilities : 0));
  const cashRatio = toRatio(statItem.cashRatio || (currentLiabilities > 0 ? cashAndEquivalents / currentLiabilities : 0));

  const ebitBillion = toBillion(statItem.ebit);
  const ebitdaBillion = toBillion(statItem.ebitda);

  // 6. Thuyết minh BCTC nổi bật
  const noteHighlights = {
    cashInBankBillion: toBillion(noteItem.noc1),
    shortTermDepositsBillion: toBillion(noteItem.noc5),
    interestIncomeBillion: toBillion(noteItem.noc122),
    fxGainBillion: toBillion(noteItem.noc123),
    investmentDisposalGainBillion: toBillion(noteItem.noc124),
    interestExpenseBillion: toBillion(noteItem.noc131),
    fxLossBillion: toBillion(noteItem.noc132),
    investmentProvisionBillion: toBillion(noteItem.noc133),
    assetDisposalGainBillion: toBillion(noteItem.noc141),
    compensationIncomeBillion: toBillion(noteItem.noc142),
    penaltiesAndDisposalLossBillion: toBillion(noteItem.noc151),
  };

  return {
    period,
    year,
    quarter,
    sharesOutstandingMillions,
    marketCapBillion,
    eps,
    bvps,
    pe,
    pb,
    ps,
    evEbitda,
    priceToCashFlow,
    dividendYield,
    revenue,
    grossRevenue,
    revenueDeductions,
    costOfGoodsSold,
    grossProfit,
    operatingProfit,
    profitBeforeTax,
    netProfit,
    consolidatedNetProfit,
    nonControllingInterests,
    financialIncome,
    financialExpenses,
    interestExpenses,
    sellingExpenses,
    adminExpenses,
    otherProfit,
    totalTax,
    totalAssets,
    currentAssets,
    cashAndEquivalents,
    shortTermInvestments,
    receivables,
    tradeReceivables,
    inventories,
    nonCurrentAssets,
    fixedAssets,
    tangibleFixedAssets,
    constructionInProgress,
    longTermInvestments,
    totalLiabilities,
    currentLiabilities,
    tradePayables,
    customerAdvances,
    nonCurrentLiabilities,
    shortTermLoans,
    longTermLoans,
    totalDebt,
    ownerEquity,
    charterCapital,
    retainedEarnings,
    netOperatingCashFlow,
    netInvestingCashFlow,
    capex,
    netFinancingCashFlow,
    dividendsPaid,
    netCashFlowPeriod,
    cashAtEndOfPeriod,
    grossMargin,
    ebitMargin,
    preTaxMargin,
    netMargin,
    roe,
    roa,
    roic,
    assetTurnover,
    fixedAssetTurnover,
    receivableDays,
    inventoryDays,
    payableDays,
    cashCycle,
    debtToEquity,
    netDebtToEquity,
    financialLeverage,
    currentRatio,
    quickRatio,
    cashRatio,
    ebitBillion,
    ebitdaBillion,
    noteHighlights,
  };
}

export interface FullVietcapFinancialDataset {
  ticker: string;
  quarters: ParsedVietcapQuarter[];
  years: ParsedVietcapYear[];
}

/**
 * Hàm gọi API tổng hợp từ 5 endpoint chuyên biệt của Vietcap IQ cho 1 mã chứng khoán (VD: HPG, FPT)
 * Lấy toàn bộ lịch sử từ 2018 đến nay.
 */
export async function fetchFullVietcapData(ticker: string, options: { maxQuarters?: number } = {}): Promise<ParsedVietcapQuarter[]> {
  const cleanTicker = ticker.trim().toUpperCase();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  const baseUrl = `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/${cleanTicker}`;

  try {
    const [isRes, bsRes, cfRes, noteRes, statRes] = await Promise.all([
      fetch(`${baseUrl}/financial-statement?section=INCOME_STATEMENT`, { headers }).catch(() => null),
      fetch(`${baseUrl}/financial-statement?section=BALANCE_SHEET`, { headers }).catch(() => null),
      fetch(`${baseUrl}/financial-statement?section=CASH_FLOW`, { headers }).catch(() => null),
      fetch(`${baseUrl}/financial-statement?section=NOTE`, { headers }).catch(() => null),
      fetch(`${baseUrl}/statistics-financial`, { headers }).catch(() => null),
    ]);

    const isJson = isRes && isRes.ok ? await isRes.json() : null;
    const bsJson = bsRes && bsRes.ok ? await bsRes.json() : null;
    const cfJson = cfRes && cfRes.ok ? await cfRes.json() : null;
    const noteJson = noteRes && noteRes.ok ? await noteRes.json() : null;
    const statJson = statRes && statRes.ok ? await statRes.json() : null;

    const isQuarters: any[] = isJson?.data?.quarters || [];
    const bsQuarters: any[] = bsJson?.data?.quarters || [];
    const cfQuarters: any[] = cfJson?.data?.quarters || [];
    const noteQuarters: any[] = noteJson?.data?.quarters || [];
    const statItems: any[] = Array.isArray(statJson?.data) ? statJson.data : [];

    // Lập bản đồ key: `${year}_${quarter}` để ghép nối chính xác các bảng báo cáo
    const quartersMap: Record<string, { is?: any; bs?: any; cf?: any; note?: any; stat?: any }> = {};

    isQuarters.forEach((it) => {
      const key = `${it.yearReport}_${it.lengthReport}`;
      quartersMap[key] = { ...(quartersMap[key] || {}), is: it };
    });

    bsQuarters.forEach((it) => {
      const key = `${it.yearReport}_${it.lengthReport}`;
      quartersMap[key] = { ...(quartersMap[key] || {}), bs: it };
    });

    cfQuarters.forEach((it) => {
      const key = `${it.yearReport}_${it.lengthReport}`;
      quartersMap[key] = { ...(quartersMap[key] || {}), cf: it };
    });

    noteQuarters.forEach((it) => {
      const key = `${it.yearReport}_${it.lengthReport}`;
      quartersMap[key] = { ...(quartersMap[key] || {}), note: it };
    });

    statItems.forEach((it) => {
      const y = it.yearReport || (typeof it.year === 'string' ? parseInt(it.year, 10) : it.year);
      const q = it.quarter || it.lengthReport;
      if (y && q) {
        const key = `${y}_${q}`;
        quartersMap[key] = { ...(quartersMap[key] || {}), stat: it };
      }
    });

    const parsedQuarters: ParsedVietcapQuarter[] = Object.entries(quartersMap).map(([key, data]) => {
      return parseVietcapQuarter(data.is, data.bs, data.cf, data.stat, data.note);
    });

    // Sắp xếp tăng dần theo thời gian (từ 2018 -> hiện tại)
    parsedQuarters.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter - b.quarter;
    });

    // Tính tăng trưởng EPS (epsGrowth) theo quý so với cùng kỳ năm trước (YoY)
    parsedQuarters.forEach((q, idx) => {
      const sameQuarterLastYear = parsedQuarters.find(
        (prev) => prev.year === q.year - 1 && prev.quarter === q.quarter
      );
      if (sameQuarterLastYear && sameQuarterLastYear.netProfit > 0) {
        q.epsGrowth = Math.round((((q.netProfit - sameQuarterLastYear.netProfit) / Math.abs(sameQuarterLastYear.netProfit)) * 100) * 10) / 10;
      }
    });

    if (options.maxQuarters && options.maxQuarters > 0 && parsedQuarters.length > options.maxQuarters) {
      return parsedQuarters.slice(-options.maxQuarters);
    }

    return parsedQuarters;
  } catch (error) {
    console.error(`[Vietcap API] Failed to fetch data for ${cleanTicker}:`, error);
    return [];
  }
}
