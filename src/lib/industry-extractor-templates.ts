/**
 * Industry Extraction Templates for Vietnamese Stocks (16 ICB Level 2 Sectors)
 * Source: Vietcap API IQ Insight ICB Sector Standards
 * Used by Prompt 1 (Qualitative Extractor) to inject domain-specific extraction rules
 */

export interface IndustryExtractionTemplate {
  icbCode: string;
  icbName: string;
  industryModel: string;
  inputOrFundingEngine: string;
  operationOrProductionCapacity: string;
  outputOrRevenueStreams: string;
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryExtractionTemplate> = {
  // 1. 5300: Bán lẻ
  '5300': {
    icbCode: '5300',
    icbName: 'Bán lẻ',
    industryModel: 'Bán lẻ & Phân phối chuỗi',
    inputOrFundingEngine:
      '- Chuỗi cung ứng & NCC lớn (ICT, điện máy, dược phẩm, vàng bạc, bách hóa).\n' +
      '- Chính sách công nợ & chiết khấu thương mại từ nhà cung cấp.\n' +
      '- Tỷ lệ hàng nhãn riêng (private label) và khả năng đàm phán giá đầu vào.',
    operationOrProductionCapacity:
      '- Mạng lưới cửa hàng (số lượng điểm bán theo chuỗi, diện tích sàn bán lẻ m²).\n' +
      '- Tiến độ mở mới, đóng cửa hoặc tái cấu trúc các cửa hàng kém hiệu quả.\n' +
      '- Điểm hòa vốn từng cửa hàng, năng lực logistics & kho vận phân phối nội bộ.',
    outputOrRevenueStreams:
      '- Tăng trưởng doanh số cùng cửa hàng (SSSG - Same-Store Sales Growth).\n' +
      '- Doanh thu bán lẻ đa kênh (Omnichannel / Online) và biên lợi nhuận gộp theo từng ngành hàng.',
  },

  // 2. 1700: Tài nguyên cơ bản
  '1700': {
    icbCode: '1700',
    icbName: 'Tài nguyên cơ bản',
    industryModel: 'Sản xuất Công nghiệp Nặng & Khai khoáng (Thép, Kim loại)',
    inputOrFundingEngine:
      '- Nguồn nguyên liệu thô đầu vào (quặng sắt, than mỡ, thép phế, phôi thép, đá xây dựng).\n' +
      '- Tỷ trọng nguyên liệu nhập khẩu vs tự chủ nội địa, rủi ro biến động giá hàng hóa thế giới và tỷ giá USD/VND.',
    operationOrProductionCapacity:
      '- Danh sách khu liên hợp/nhà máy/mỏ khai thác, công suất thiết kế (tấn/năm).\n' +
      '- Tỷ lệ huy động công suất (Capacity Utilization Rate), công nghệ luyện kim (Lò cao BOF vs Lò điện EAF), suất tiêu hao năng lượng.',
    outputOrRevenueStreams:
      '- Sản lượng bán hàng theo danh mục (thép xây dựng, HRC, tôn mạ, ống thép, quặng khoáng sản).\n' +
      '- Tỷ trọng tiêu thụ nội địa vs xuất khẩu, thị phần thị trường trong nước.',
  },

  // 3. 2700: Hàng & Dịch vụ công nghiệp
  '2700': {
    icbCode: '2700',
    icbName: 'Hàng & Dịch vụ công nghiệp',
    industryModel: 'Logistics, Cảng biển & Dịch vụ Công nghiệp',
    inputOrFundingEngine:
      '- Vị trí địa lý luồng hàng hải, độ sâu mớn nước bến cảng, quỹ đất mở rộng kho bãi ICD.\n' +
      '- Đội tàu sở hữu/thuê (trọng tải DWT, độ tuổi tàu), chi phí nhiên liệu dầu FO/MGO.',
    operationOrProductionCapacity:
      '- Công suất thông qua cảng (TEUs/năm đối với container hoặc triệu tấn/năm hàng rời).\n' +
      '- Tỷ lệ lấp đầy bến bãi, năng lực bốc dỡ cẩu giàn STS, mạng lưới dịch vụ logistics 3PL/4PL.',
    outputOrRevenueStreams:
      '- Sản lượng container thông qua cảng, giá cước bốc xếp THC và cước vận tải biển/hàng không.\n' +
      '- Cơ cấu doanh thu: Dịch vụ khai thác cảng biển vs Vận tải biển vs Dịch vụ kho vận/logistics.',
  },

  // 4. 0500: Dầu khí
  '0500': {
    icbCode: '0500',
    icbName: 'Dầu khí',
    industryModel: 'Dầu khí & Năng lượng (Thượng - Trung - Hạ nguồn)',
    inputOrFundingEngine:
      '- Trữ lượng dầu khí mỏ khai thác (2P/3P reserves), nguồn khí thiên nhiên mỏ ngoài khơi.\n' +
      '- Nguồn dầu thô nguyên liệu đầu vào cho lọc hóa dầu (nguồn nội địa Bạch Hổ vs nhập khẩu).',
    operationOrProductionCapacity:
      '- Số lượng giàn khoan tự nâng/nửa chìm đang vận hành và hiệu suất sử dụng giàn.\n' +
      '- Công suất chế biến của nhà máy lọc dầu / nhà máy xử lý khí, tiến độ các gói thầu EPCI lớn (Lô B, Lạc Đà Vàng...).',
    outputOrRevenueStreams:
      '- Giá thuê giàn khoan ngày (Day rate), sản lượng khí khô / LPG / Condensate / Xăng dầu thương phẩm.\n' +
      '- Biên lọc dầu (Crack spread), cơ cấu doanh thu giữa mảng dịch vụ kỹ thuật dầu khí vs sản phẩm xăng dầu.',
  },

  // 5. 8300: Ngân hàng
  '8300': {
    icbCode: '8300',
    icbName: 'Ngân hàng',
    industryModel: 'Ngân hàng Thương mại',
    inputOrFundingEngine:
      '- Nguồn vốn huy động: Tiền gửi khách hàng, phát hành giấy tờ có giá, vay liên ngân hàng.\n' +
      '- Tỷ lệ tiền gửi không kỳ hạn (CASA ratio) và chi phí vốn bình quân (Cost of Funds - COF).',
    operationOrProductionCapacity:
      '- Hạn mức tăng trưởng tín dụng được NHNN giao (Room tín dụng), cơ cấu danh mục cho vay (bán lẻ, KHDN, SME, BĐS).\n' +
      '- Biên lãi thuần (NIM), tỷ lệ nợ xấu (NPL), tỷ lệ bao phủ nợ xấu (LLR) và an toàn vốn (CAR).',
    outputOrRevenueStreams:
      '- Tổng thu nhập hoạt động (TOI): Thu nhập lãi thuần (NII) vs Thu nhập ngoài lãi (NFI).\n' +
      '- Cơ cấu thu nhập dịch vụ (thanh toán, kinh doanh ngoại hối FX, chứng khoán, bảo hiểm Bancassurance).',
  },

  // 6. 3500: Thực phẩm và đồ uống
  '3500': {
    icbCode: '3500',
    icbName: 'Thực phẩm và đồ uống',
    industryModel: 'Thực phẩm & Đồ uống (F&B / FMCG)',
    inputOrFundingEngine:
      '- Vùng nguyên liệu: Sữa tươi, đàn bò sữa trang trại, đường mía, lúa mạch, nông sản tươi.\n' +
      '- Mức độ tự chủ nguyên liệu đầu vào vs nhập khẩu (sữa bột, hương liệu, malt, hoa bia), biến động giá nông sản thế giới.',
    operationOrProductionCapacity:
      '- Danh sách nhà máy chế biến, công suất thiết kế (triệu lít/tấn mỗi năm), mức độ tự động hóa dây chuyền.\n' +
      '- Tỷ lệ sử dụng công suất, hệ thống kho bãi bảo quản lạnh (Cold chain logistics).',
    outputOrRevenueStreams:
      '- Độ phủ mạng lưới phân phối (Kênh truyền thống GT điểm bán lẻ vs Kênh hiện đại MT siêu thị).\n' +
      '- Thị phần từng nhóm sản phẩm cốt lõi, tỷ trọng doanh thu nội địa vs xuất khẩu, biên lãi gộp từng phân khúc.',
  },

  // 7. 1300: Hóa chất
  '1300': {
    icbCode: '1300',
    icbName: 'Hóa chất',
    industryModel: 'Hóa chất, Phốt pho & Phân bón',
    inputOrFundingEngine:
      '- Nguồn cung cấp quặng Apatit, than cám, muối mỏ, lưu huỳnh, khí tự nhiên mỏ (cho đạm).\n' +
      '- Hợp đồng cấp nguyên liệu dài hạn từ TKV/Vinachem, chính sách hạn ngạch xuất khẩu của chính phủ.',
    operationOrProductionCapacity:
      '- Công suất nhà máy phốt pho vàng (P4), axit phosphoric nhiệt (WPA/TPA), phân bón Ure/NPK, xút Clo (NaOH).\n' +
      '- Tỷ lệ hoạt động nhà máy, công nghệ chế biến sâu hóa chất tinh khiết phục vụ công nghiệp bán dẫn.',
    outputOrRevenueStreams:
      '- Giá bán thế giới (P4 FOB, phân bón Ure Baltic/Trung Đông, xút), cơ cấu thị trường xuất khẩu (Ấn Độ, Nhật, Hàn, Mỹ) vs nội địa.\n' +
      '- Cơ cấu doanh thu theo nhóm sản phẩm hóa chất cơ bản vs phân bón nông nghiệp.',
  },

  // 8. 3300: Ô tô và phụ tùng
  '3300': {
    icbCode: '3300',
    icbName: 'Ô tô và phụ tùng',
    industryModel: 'Sản xuất & Phân phối Ô tô, Phụ tùng, Săm lốp',
    inputOrFundingEngine:
      '- Nguồn cung linh kiện lắp ráp CKD/CBU, cao su thiên nhiên và cao su tổng hợp (cho sản xuất săm lốp).\n' +
      '- Quan hệ đối tác và quyền phân phối độc quyền từ các hãng xe toàn cầu (Toyota, Honda, Ford, Mercedes...).',
    operationOrProductionCapacity:
      '- Công suất lắp ráp xe hơi / sản xuất lốp xe (triệu lốp Radial/Bias mỗi năm).\n' +
      '- Số lượng showroom, xưởng dịch vụ chuẩn 3S/4S, liên doanh lắp ráp phụ tùng ô tô xe máy.',
    outputOrRevenueStreams:
      '- Sản lượng tiêu thụ xe, sản lượng lốp xe tiêu thụ nội địa vs xuất khẩu (Mỹ, Brazil, EU).\n' +
      '- Doanh thu bán xe, dịch vụ phụ tùng sửa chữa và lợi nhuận cổ tức nhận về từ các công ty liên doanh.',
  },

  // 9. 8600: Bất động sản
  '8600': {
    icbCode: '8600',
    icbName: 'Bất động sản',
    industryModel: 'Phát triển Bất động sản (Nhà ở & Khu công nghiệp)',
    inputOrFundingEngine:
      '- Quỹ đất sạch sở hữu (diện tích ha/m² phân bổ theo tỉnh thành trọng điểm).\n' +
      '- Trạng thái pháp lý quỹ đất (chủ trương đầu tư, quy hoạch 1/500, tiền sử dụng đất, giấy phép xây dựng), chi phí giải phóng mặt bằng.',
    operationOrProductionCapacity:
      '- Danh mục dự án đang triển khai thi công, tiến độ hoàn thiện hạ tầng kỹ thuật.\n' +
      '- Quy mô diện tích đất khu công nghiệp sẵn sàng cho thuê (ha), năng lực thu hút dòng vốn đầu tư FDI.',
    outputOrRevenueStreams:
      '- Doanh số bán hàng chưa ghi nhận (Presales / Người mua trả tiền trước ngắn hạn).\n' +
      '- Tiến độ mở bán các giai đoạn tiếp theo, kế hoạch bàn giao căn hộ/đất nền và cho thuê đất KCN trong 1-2 năm tới.',
  },

  // 10. 3700: Hàng cá nhân & gia dụng
  '3700': {
    icbCode: '3700',
    icbName: 'Hàng cá nhân & gia dụng',
    industryModel: 'Dệt may, Da giày & Hàng Gia dụng Tiêu dùng',
    inputOrFundingEngine:
      '- Nguồn xơ, sợi, bông, vải, da nhân tạo, hạt nhựa; mức độ phụ thuộc nguyên phụ liệu nhập khẩu.\n' +
      '- Tiêu chuẩn xanh hóa nhà máy, chứng chỉ môi trường và trách nhiệm xã hội (ESG, WRAP, OEKO-TEX).',
    operationOrProductionCapacity:
      '- Số lượng chuyền may/nhà xưởng dệt nhuộm, năng lực chuyển đổi từ gia công CMT sang đơn hàng trọn gói FOB/ODM.\n' +
      '- Tỷ lệ ứng dụng tự động hóa, năng suất lao động trên mỗi công nhân.',
    outputOrRevenueStreams:
      '- Danh sách nhãn hàng đối tác quốc tế lớn (Nike, Adidas, Uniqlo, Decathlon, Columbia...).\n' +
      '- Giá trị đơn hàng ký mới (Order backlog cho các quý tới), cơ cấu doanh thu theo thị trường xuất khẩu chính (Mỹ, EU, Nhật).',
  },

  // 11. 9500: Công nghệ thông tin
  '9500': {
    icbCode: '9500',
    icbName: 'Công nghệ thông tin',
    industryModel: 'Công nghệ Thông tin, Viễn thông & Chuyển đổi Số',
    inputOrFundingEngine:
      '- Đội ngũ nhân lực công nghệ: Tổng số lập trình viên/kỹ sư phần mềm, tốc độ tuyển dụng mới, chi phí lương nhân sự IT.\n' +
      '- Đầu tư R&D cho công nghệ mới (AI, Cloud, Automotive, Bán dẫn), các liên minh công nghệ toàn cầu (Nvidia, Microsoft, AWS).',
    operationOrProductionCapacity:
      '- Hệ thống trung tâm dữ liệu (Data Center số lượng tủ rack, công suất điện MW), tỷ lệ lấp đầy DC.\n' +
      '- Số lượng dự án quy mô lớn (Mega-deals > 5 triệu USD), danh mục giải pháp phần mềm sở hữu bản quyền đóng gói (Made-by-Company).',
    outputOrRevenueStreams:
      '- Doanh số ký mới (Order Intake) và giá trị hợp đồng còn lại chưa thực hiện (Backlog).\n' +
      '- Doanh thu mảng dịch vụ chuyển đổi số (Digital Transformation), cơ cấu doanh thu theo thị trường địa lý (Nhật Bản, Mỹ, APAC, Việt Nam).',
  },

  // 12. 2300: Xây dựng và vật liệu
  '2300': {
    icbCode: '2300',
    icbName: 'Xây dựng và vật liệu',
    industryModel: 'Xây dựng, Nhà thầu EPC & Vật liệu Hạ tầng',
    inputOrFundingEngine:
      '- Nguồn cung vật liệu xây dựng đầu vào (xi măng, sắt thép, cát đá), hợp đồng bao tiêu vật tư.\n' +
      '- Hạn mức bảo lãnh tín dụng ngân hàng phục vụ thi công dự án, tình hình dòng tiền hoạt động xây lắp.',
    operationOrProductionCapacity:
      '- Giá trị hợp đồng ký mới chưa thực hiện (Backlog xây lắp), năng lực tổng thầu EPC / Design & Build.\n' +
      '- Danh mục máy móc thiết bị thi công chuyên dụng (cẩu tháp, máy đào hầm TBM, tàu nạo vét), năng lực thi công hạ tầng giao thông/năng lượng.',
    outputOrRevenueStreams:
      '- Sản lượng nghiệm thu công trình theo tiến độ, cơ cấu backlog giữa xây dựng dân dụng vs công nghiệp vs đầu tư công.\n' +
      '- Biên lợi nhuận gộp theo từng loại hình công trình, rủi ro nợ xấu và công nợ phải thu từ chủ đầu tư dự án.',
  },

  // 13. 7500: Điện, nước & xăng dầu khí đốt
  '7500': {
    icbCode: '7500',
    icbName: 'Điện, nước & xăng dầu khí đốt',
    industryModel: 'Năng lượng (Nhiệt điện, Thủy điện, Năng lượng Tái tạo) & Cấp nước',
    inputOrFundingEngine:
      '- Nguồn nhiên liệu phát điện: Khí thiên nhiên, than nhập khẩu/nội địa, điều kiện thủy văn lưu lượng nước về hồ thủy điện.\n' +
      '- Nguồn nước thô đầu vào từ sông/hồ tự nhiên phục vụ sản xuất nước sạch sinh hoạt.',
    operationOrProductionCapacity:
      '- Tổng công suất phát điện lắp đặt (MW phân loại theo thủy điện, điện than, điện khí, điện gió, điện mặt trời).\n' +
      '- Tỷ lệ huy động sản lượng điện hợp đồng (Qc) theo hợp đồng mua bán điện PPA dài hạn với EVN, công suất nhà máy cấp nước (m³/ngày đêm).',
    outputOrRevenueStreams:
      '- Giá bán điện hợp đồng PPA cố định vs giá thị trường điện cạnh tranh bán buôn (CGM).\n' +
      '- Sản lượng điện thương phẩm hàng năm, sản lượng tiêu thụ nước sạch và lộ trình phê duyệt điều chỉnh giá nước của UBND tỉnh.',
  },

  // 14. 5700: Du lịch và giải trí
  '5700': {
    icbCode: '5700',
    icbName: 'Du lịch và giải trí',
    industryModel: 'Hàng không, Khách sạn, Khu vui chơi & Giải trí',
    inputOrFundingEngine:
      '- Đội tàu bay (số lượng máy bay sở hữu vs thuê ướt/khô), slot cất hạ cánh tại các sân bay trọng điểm.\n' +
      '- Chi phí nhiên liệu bay Jet A1, cơ chế miễn thị thực / chính sách phát triển du lịch của các quốc gia mục tiêu.',
    operationOrProductionCapacity:
      '- Ghế cung ứng luân chuyển (ASK - Available Seat Kilometers), số lượng phòng khách sạn/resort vận hành.\n' +
      '- Hệ số sử dụng ghế chuyến bay (Load Factor) hoặc tỷ lệ lấp đầy phòng khách sạn (Occupancy Rate).',
    outputOrRevenueStreams:
      '- Doanh thu vận chuyển hành khách và doanh thu dịch vụ phụ trợ (hành lý, suất ăn, bảo hiểm).\n' +
      '- Giá vé bình quân (Yield), doanh thu trên mỗi phòng có sẵn (RevPAR), cơ cấu khách quốc tế vs khách nội địa.',
  },

  // 15. 8500: Bảo hiểm
  '8500': {
    icbCode: '8500',
    icbName: 'Bảo hiểm',
    industryModel: 'Kinh doanh Bảo hiểm (Nhân thọ & Phi nhân thọ)',
    inputOrFundingEngine:
      '- Nguồn thu phí bảo hiểm gốc (GWP), mạng lưới đại lý tư vấn và hợp đồng hợp tác phân phối độc quyền qua ngân hàng (Bancassurance).\n' +
      '- Chi phí hoa hồng đại lý, chi phí khai thác bảo hiểm và năng lực tái bảo hiểm quốc tế.',
    operationOrProductionCapacity:
      '- Quy mô danh mục đầu tư tài chính (tiền gửi ngân hàng, trái phiếu chính phủ/doanh nghiệp, cổ phiếu), tỷ suất sinh lời danh mục đầu tư.\n' +
      '- Tỷ lệ bồi thường thuộc trách nhiệm giữ lại (Loss ratio), tỷ lệ chi phí kết hợp (Combined ratio < 100% chứng minh nghiệp vụ bảo hiểm có lãi).',
    outputOrRevenueStreams:
      '- Doanh thu phí bảo hiểm thuần (Net Earned Premium) theo từng mảng: Bảo hiểm xe cơ giới, con người, tài sản kỹ thuật, hàng hải.\n' +
      '- Lợi nhuận từ hoạt động tài chính (thu nhập lãi tiền gửi và lợi tức trái phiếu).',
  },

  // 16. 8700: Dịch vụ tài chính (Chứng khoán & Quản lý tài sản)
  '8700': {
    icbCode: '8700',
    icbName: 'Dịch vụ tài chính',
    industryModel: 'Dịch vụ Tài chính, Chứng khoán & Ngân hàng Đầu tư (IB)',
    inputOrFundingEngine:
      '- Vốn chủ sở hữu và quy mô vốn điều lệ (quyết định trần dư nợ cho vay margin 200% Vốn CSH).\n' +
      '- Hạn mức tín dụng vay ngân hàng thương mại, chi phí huy động vốn phục vụ hoạt động cho vay ký quỹ margin.',
    operationOrProductionCapacity:
      '- Dư nợ cho vay Margin và ứng trước tiền bán chứng khoán, tốc độ tăng trưởng dư nợ cho vay.\n' +
      '- Thị phần môi giới cổ phiếu trên sàn HOSE và HNX, số lượng tài khoản khách hàng cá nhân và tổ chức mở mới.\n' +
      '- Quy mô danh mục tự doanh (FVTPL, HTM, AFS: tỷ trọng trái phiếu, chứng chỉ tiền gửi, cổ phiếu niêm yết).\n' +
      '- Đường ống thương vụ tư vấn ngân hàng đầu tư (IB Pipeline: tư vấn M&A, thu xếp phát hành trái phiếu, IPO).',
    outputOrRevenueStreams:
      '- 4 trụ cột doanh thu cốt lõi:\n' +
      '  1. Lãi từ các khoản cho vay margin & ứng trước tiền bán.\n' +
      '  2. Lãi từ tài sản tài chính ghi nhận qua lãi/lỗ (FVTPL - tự doanh).\n' +
      '  3. Doanh thu phí nghiệp vụ môi giới chứng khoán.\n' +
      '  4. Doanh thu hoạt động tư vấn tài chính, bảo lãnh phát hành chứng khoán (IB).',
  },
};

/**
 * Fallback template for diversified conglomerates or unclassified tickers
 */
const DEFAULT_FALLBACK_TEMPLATE: IndustryExtractionTemplate = {
  icbCode: '0000',
  icbName: 'Đa ngành / Khác',
  industryModel: 'Doanh nghiệp Đa ngành / Thương mại Dịch vụ',
  inputOrFundingEngine:
    '- Nguồn vốn hoạt động chính, các nhà cung ứng lớn, nguyên vật liệu hoặc sản phẩm cốt lõi.\n' +
    '- Điều khoản tín dụng và các rủi ro biến động giá đầu vào/chuỗi cung ứng.',
  operationOrProductionCapacity:
    '- Cơ sở vật chất, tài sản cốt lõi, công suất sản xuất hoặc quy mô mạng lưới vận hành.\n' +
    '- Tỷ lệ sử dụng công suất, lợi thế cạnh tranh về công nghệ, quản trị hoặc vị trí.',
  outputOrRevenueStreams:
    '- Cơ cấu doanh thu theo các phân khúc/dòng sản phẩm chính, thị phần trong ngành.\n' +
    '- Tỷ trọng tiêu thụ nội địa vs xuất khẩu và các thị trường trọng điểm.',
};

/**
 * Normalize Vietnamese text for flexible matching (lowercase, trim, optional diacritics removal)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Find matching IndustryExtractionTemplate by either ICB Code ('5300') or ICB Name ('Bán lẻ', 'Ngân hàng', 'Chứng khoán'...)
 */
export function getIndustryProfile(icbInput?: string): IndustryExtractionTemplate {
  if (!icbInput) return DEFAULT_FALLBACK_TEMPLATE;

  const raw = icbInput.trim();

  // 1. Direct code lookup (e.g. '5300', '8300', '8700')
  if (INDUSTRY_TEMPLATES[raw]) {
    return INDUSTRY_TEMPLATES[raw];
  }

  // 2. Direct name match (Exact)
  for (const template of Object.values(INDUSTRY_TEMPLATES)) {
    if (template.icbName.toLowerCase() === raw.toLowerCase()) {
      return template;
    }
  }

  // 3. Normalized name / Keyword fuzzy match
  const norm = normalizeText(raw);

  if (norm.includes('ban le')) return INDUSTRY_TEMPLATES['5300'];
  if (norm.includes('thep') || norm.includes('tai nguyen co ban') || norm.includes('khai khoang')) return INDUSTRY_TEMPLATES['1700'];
  if (norm.includes('cang bien') || norm.includes('logistics') || norm.includes('hang & dich vu') || norm.includes('dich vu cong nghiep')) return INDUSTRY_TEMPLATES['2700'];
  if (norm.includes('dau khi')) return INDUSTRY_TEMPLATES['0500'];
  if (norm.includes('ngan hang') || norm.includes('bank')) return INDUSTRY_TEMPLATES['8300'];
  if (norm.includes('thuc pham') || norm.includes('do uong') || norm.includes('f&b')) return INDUSTRY_TEMPLATES['3500'];
  if (norm.includes('hoa chat') || norm.includes('phan bon') || norm.includes('phot pho')) return INDUSTRY_TEMPLATES['1300'];
  if (norm.includes('o to') || norm.includes('phu tung') || norm.includes('sam lop')) return INDUSTRY_TEMPLATES['3300'];
  if (norm.includes('bat dong san') || norm.includes('bds') || norm.includes('dia oc') || norm.includes('kcn')) return INDUSTRY_TEMPLATES['8600'];
  if (norm.includes('ca nhan') || norm.includes('gia dung') || norm.includes('det may') || norm.includes('da giay')) return INDUSTRY_TEMPLATES['3700'];
  if (norm.includes('cong nghe') || norm.includes('cntt') || norm.includes('phan mem') || norm.includes('it')) return INDUSTRY_TEMPLATES['9500'];
  if (norm.includes('xay dung') || norm.includes('vat lieu') || norm.includes('xay lap')) return INDUSTRY_TEMPLATES['2300'];
  if (norm.includes('dien') || norm.includes('nuoc') || norm.includes('xang dau') || norm.includes('nang luong')) return INDUSTRY_TEMPLATES['7500'];
  if (norm.includes('du lich') || norm.includes('giai tri') || norm.includes('hang khong') || norm.includes('khach san')) return INDUSTRY_TEMPLATES['5700'];
  if (norm.includes('bao hiem')) return INDUSTRY_TEMPLATES['8500'];
  if (norm.includes('chung khoan') || norm.includes('tai chinh') || norm.includes('dich vu tai chinh') || norm.includes('quan ly quy')) return INDUSTRY_TEMPLATES['8700'];

  return DEFAULT_FALLBACK_TEMPLATE;
}

/**
 * Returns the exact industryModel string for JSON schema (e.g. "Ngân hàng Thương mại")
 */
export function getIndustryModel(icbInput?: string): string {
  return getIndustryProfile(icbInput).industryModel;
}

/**
 * Generates the injection text block for Prompt 1 (Qualitative Extractor)
 * Replaces {{INDUSTRY_EXTRACTION_GUIDE}} in the prompt.
 */
export function getIndustryTemplate(icbInput?: string): string {
  const profile = getIndustryProfile(icbInput);

  return `════════════════════════════════════════════════════════════
QUY TẮC BÓC TÁCH CHUYÊN BIỆT CHO NGÀNH: ${profile.icbName.toUpperCase()} [Mã ICB: ${profile.icbCode}]
Mô hình hoạt động (industryModel): "${profile.industryModel}"
════════════════════════════════════════════════════════════

Khi bóc tách "sectionB_IndustrySpecificValueChain", BẮT BUỘC tập trung vào các đặc thù sau của ngành:

1. [inputOrFundingEngine] — Đầu vào & Nguồn lực:
${profile.inputOrFundingEngine}

2. [operationOrProductionCapacity] — Năng lực Vận hành & Công suất:
${profile.operationOrProductionCapacity}

3. [outputOrRevenueStreams] — Đầu ra & Cơ cấu Doanh thu:
${profile.outputOrRevenueStreams}

LƯU Ý ĐẶC THÙ:
- Điền chính xác trường "industryModel": "${profile.industryModel}" vào JSON kết quả.
- Bóc tách số liệu định lượng cụ thể nếu tài liệu có đề cập (công suất, diện tích, thị phần, tỷ lệ %, sản lượng...).`;
}
