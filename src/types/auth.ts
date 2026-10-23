export type UserRole =
    | 'admin'
    | 'member_vip'
    | 'member_free'
    | 'broker'
    | 'analyst'
    | (string & {});

export interface AppUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    createdAt: string;
    permissions?: FeatureKey[];
}

export type SafeUser = Omit<AppUser, 'passwordHash'>;

export type FeatureCategory =
    | 'analysis'
    | 'ranking'
    | 'chart'
    | 'market_earnings'
    | 'reports'
    | 'admin';

export type FeatureKey =
    // 1. Phân Tích Doanh Nghiệp & Định Giá
    | 'analysis_page'             // Truy cập trang Phân tích Doanh nghiệp tổng quan & BCTC
    | 'analysis_financial_health' // Xem điểm sức khỏe Piotroski F-Score & Altman Z-Score
    | 'valuation_calculator'      // Tính toán định giá PE/PB/DCF tùy biến
    | 'ai_insights'               // Phân tích AI Insights thông minh (tin tức, triển vọng)
    | 'document_upload'           // Tải file BCTC/BCTN để AI phân tích chuyên sâu
    | 'export_pdf'                // Xuất báo cáo phân tích toàn diện ra PDF
    // 2. Bộ Lọc & Xếp Hạng RS
    | 'ranking_view'              // Xem Bảng xếp hạng Sức mạnh giá RS toàn thị trường
    | 'ranking_customize'         // Tùy biến bộ lọc, lưu preset, thay đổi tiêu chí
    | 'ranking_export'            // Xuất dữ liệu bảng xếp hạng CSV/Excel
    | 'watchlist_customize'       // Thêm/bớt mã trong watchlist, tạo watchlist mới
    // 3. Biểu Đồ Kỹ Thuật
    | 'chart_view'                // Xem Biểu Đồ Kỹ Thuật (nến & volume cơ bản)
    | 'chart_indicators'          // Thêm/sửa chỉ báo kỹ thuật tùy chỉnh (Swing HL, RS vs Index, CANSLIM)
    | 'chart_drawing'             // Vẽ trendline, horizontal, measure tools
    | 'chart_settings'            // Thay đổi theme, màu sắc, custom parameters
    // 4. Thị Trường & BCTC
    | 'market_view'               // Xem độ rộng thị trường, khối ngoại, tự doanh, thanh khoản
    | 'earnings_view'             // Xem kết quả kinh doanh và quét BCTC từ SSC
    | 'earnings_pdf_download'     // Tải file PDF BCTC gốc từ SSC
    // 5. Ấn Phẩm & Báo Cáo
    | 'reports_free_view'         // Đọc ấn phẩm & nhận định thị trường cơ bản
    | 'reports_vip_view'          // Đọc báo cáo chiến lược chuyên sâu VIP
    | 'reports_pdf_download'      // Tải file báo cáo PDF đính kèm
    // 6. Quản Trị Hệ Thống
    | 'admin_dashboard'           // Xem Bảng điều khiển Broker Board
    | 'admin_posts_manage'        // Đăng bài, biên tập ấn phẩm báo cáo CMS
    | 'admin_users_manage'        // Quản lý khách hàng & duyệt yêu cầu VIP
    | 'admin_roles_manage';       // Quản lý vai trò & cấu hình phân quyền chi tiết

export interface FeatureDefinition {
    key: FeatureKey;
    label: string;
    description: string;
    category: FeatureCategory;
    categoryLabel: string;
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
    // 1. Phân Tích Doanh Nghiệp & Định Giá
    {
        key: 'analysis_page',
        label: 'Phân tích doanh nghiệp & BCTC',
        description: 'Xem toàn bộ thông tin BCTC 8 quý, Bảng CĐKT, Kết quả kinh doanh, Lưu chuyển tiền tệ',
        category: 'analysis',
        categoryLabel: 'Phân Tích Cơ Bản & Định Giá',
    },
    {
        key: 'analysis_financial_health',
        label: 'Chỉ số sức khỏe tài chính',
        description: 'Xem điểm Piotroski F-Score (0-9), mô hình phá sản Altman Z-Score & phân tích DuPont',
        category: 'analysis',
        categoryLabel: 'Phân Tích Cơ Bản & Định Giá',
    },
    {
        key: 'valuation_calculator',
        label: 'Công cụ Định giá tùy biến',
        description: 'Tự điều chỉnh tham số mô hình định giá P/E mục tiêu, P/B, DCF chiết khấu dòng tiền',
        category: 'analysis',
        categoryLabel: 'Phân Tích Cơ Bản & Định Giá',
    },
    {
        key: 'ai_insights',
        label: 'AI Insights & Search Grounding',
        description: 'Tổng hợp phân tích AI Gemini tự động kết hợp Google Search Grounding thời gian thực',
        category: 'analysis',
        categoryLabel: 'Phân Tích Cơ Bản & Định Giá',
    },
    {
        key: 'document_upload',
        label: 'Tải BCTC/BCTN cho AI bóc tách',
        description: 'Tải tài liệu PDF của doanh nghiệp để AI phân tích và đưa ra đánh giá chuyên sâu',
        category: 'analysis',
        categoryLabel: 'Phân Tích Cơ Bản & Định Giá',
    },
    {
        key: 'export_pdf',
        label: 'Xuất báo cáo phân tích PDF',
        description: 'Tải báo cáo phân tích toàn diện của cổ phiếu dưới dạng file PDF chuyên nghiệp',
        category: 'analysis',
        categoryLabel: 'Phân Tích Cơ Bản & Định Giá',
    },

    // 2. Bộ Lọc & Xếp Hạng RS
    {
        key: 'ranking_view',
        label: 'Xem bảng xếp hạng RS',
        description: 'Xem bảng xếp hạng Sức mạnh giá (RS Rating) toàn thị trường',
        category: 'ranking',
        categoryLabel: 'Bộ Lọc & Xếp Hạng RS',
    },
    {
        key: 'ranking_customize',
        label: 'Tùy biến bộ lọc nâng cao',
        description: 'Lọc cổ phiếu theo ngành, vốn hóa, khối lượng, RS > 80, CANSLIM, chỉ số cơ bản',
        category: 'ranking',
        categoryLabel: 'Bộ Lọc & Xếp Hạng RS',
    },
    {
        key: 'ranking_export',
        label: 'Xuất dữ liệu Excel/CSV',
        description: 'Xuất danh sách kết quả lọc cổ phiếu ra file Excel/CSV phục vụ phân tích',
        category: 'ranking',
        categoryLabel: 'Bộ Lọc & Xếp Hạng RS',
    },
    {
        key: 'watchlist_customize',
        label: 'Quản lý Watchlist cá nhân',
        description: 'Tạo, sửa và lưu trữ nhiều danh mục theo dõi cổ phiếu riêng',
        category: 'ranking',
        categoryLabel: 'Bộ Lọc & Xếp Hạng RS',
    },

    // 3. Biểu Đồ Kỹ Thuật
    {
        key: 'chart_view',
        label: 'Xem biểu đồ nến & chỉ báo cơ bản',
        description: 'Xem nến kỹ thuật, khối lượng, các đường MA, RSI, MACD cơ bản',
        category: 'chart',
        categoryLabel: 'Biểu Đồ Kỹ Thuật',
    },
    {
        key: 'chart_indicators',
        label: 'Chỉ báo kỹ thuật độc quyền',
        description: 'Bật các chỉ báo Swing High/Low, RS vs VN-Index, CANSLIM Pivot, Cổ tức Marker',
        category: 'chart',
        categoryLabel: 'Biểu Đồ Kỹ Thuật',
    },
    {
        key: 'chart_drawing',
        label: 'Công cụ vẽ kỹ thuật',
        description: 'Vẽ Trendline, Horizontal line, Thước đo khoảng giá % và Fibonacci',
        category: 'chart',
        categoryLabel: 'Biểu Đồ Kỹ Thuật',
    },
    {
        key: 'chart_settings',
        label: 'Lưu cấu hình biểu đồ tùy chỉnh',
        description: 'Thay đổi giao diện, màu sắc nến và lưu cấu hình tham số chỉ báo cá nhân',
        category: 'chart',
        categoryLabel: 'Biểu Đồ Kỹ Thuật',
    },

    // 4. Thị Trường & BCTC
    {
        key: 'market_view',
        label: 'Tổng quan thị trường & Dòng tiền',
        description: 'Xem độ rộng thị trường, giao dịch Khối ngoại, Tự doanh và biểu đồ thanh khoản',
        category: 'market_earnings',
        categoryLabel: 'Thị Trường & BCTC Mới Nhất',
    },
    {
        key: 'earnings_view',
        label: 'Xem tin tức BCTC từ UBCKNN (SSC)',
        description: 'Theo dõi tin tức công bố BCTC quý mới nhất và phân tích tăng trưởng YoY',
        category: 'market_earnings',
        categoryLabel: 'Thị Trường & BCTC Mới Nhất',
    },
    {
        key: 'earnings_pdf_download',
        label: 'Tải file BCTC gốc từ SSC',
        description: 'Tải trực tiếp bản mềm PDF báo cáo tài chính gốc từ cổng thông tin SSC',
        category: 'market_earnings',
        categoryLabel: 'Thị Trường & BCTC Mới Nhất',
    },

    // 5. Ấn Phẩm & Báo Cáo
    {
        key: 'reports_free_view',
        label: 'Đọc ấn phẩm chiến lược miễn phí',
        description: 'Đọc các báo cáo vĩ mô và bài học case-study công khai',
        category: 'reports',
        categoryLabel: 'Ấn Phẩm & Báo Cáo Chiến Lược',
    },
    {
        key: 'reports_vip_view',
        label: 'Đọc báo cáo chiến lược VIP',
        description: 'Mở khóa toàn bộ nội dung phân tích chuyên sâu đằng sau Teaser Paywall',
        category: 'reports',
        categoryLabel: 'Ấn Phẩm & Báo Cáo Chiến Lược',
    },
    {
        key: 'reports_pdf_download',
        label: 'Tải file ấn phẩm PDF đính kèm',
        description: 'Tải bản in PDF hoàn chỉnh của các báo cáo chiến lược phát hành',
        category: 'reports',
        categoryLabel: 'Ấn Phẩm & Báo Cáo Chiến Lược',
    },

    // 6. Quản Trị Hệ Thống
    {
        key: 'admin_dashboard',
        label: 'Truy cập Admin Dashboard',
        description: 'Xem bảng theo dõi tổng quan Broker Board và các chỉ số vận hành',
        category: 'admin',
        categoryLabel: 'Quản Trị Hệ Thống',
    },
    {
        key: 'admin_posts_manage',
        label: 'Quản lý bài viết CMS',
        description: 'Tạo mới, chỉnh sửa, đính kèm file PDF và xuất bản báo cáo phân tích',
        category: 'admin',
        categoryLabel: 'Quản Trị Hệ Thống',
    },
    {
        key: 'admin_users_manage',
        label: 'Quản lý người dùng & Duyệt VIP',
        description: 'Xem danh sách khách hàng, thông tin liên hệ và phê duyệt yêu cầu VIP',
        category: 'admin',
        categoryLabel: 'Quản Trị Hệ Thống',
    },
    {
        key: 'admin_roles_manage',
        label: 'Phân quyền & Quản lý vai trò',
        description: 'Tạo vai trò mới và cấu hình checklist phân quyền chi tiết cho từng vai trò',
        category: 'admin',
        categoryLabel: 'Quản Trị Hệ Thống',
    },
];

export interface RoleDefinition {
    id: string;
    name: string;
    description?: string;
    badgeClass: string;
    color: string;
    isSystem?: boolean;
    permissions: FeatureKey[];
    createdAt: string;
    updatedAt?: string;
}

// Phân quyền mặc định dự phòng (Fallback Permissions)
export const FEATURE_PERMISSIONS: Record<FeatureKey, UserRole[]> = {
    // 1. Phân Tích Cơ Bản & Định Giá
    analysis_page: ['admin', 'member_vip', 'broker', 'analyst'],
    analysis_financial_health: ['admin', 'member_vip', 'broker', 'analyst'],
    valuation_calculator: ['admin', 'member_vip', 'broker', 'analyst'],
    ai_insights: ['admin', 'member_vip', 'broker', 'analyst'],
    document_upload: ['admin', 'member_vip', 'broker', 'analyst'],
    export_pdf: ['admin', 'member_vip', 'broker', 'analyst'],

    // 2. Bộ Lọc & Xếp Hạng RS
    ranking_view: ['admin', 'member_vip', 'member_free', 'broker', 'analyst'],
    ranking_customize: ['admin', 'member_vip', 'broker', 'analyst'],
    ranking_export: ['admin', 'member_vip', 'broker', 'analyst'],
    watchlist_customize: ['admin', 'member_vip', 'broker', 'analyst'],

    // 3. Biểu Đồ Kỹ Thuật
    chart_view: ['admin', 'member_vip', 'member_free', 'broker', 'analyst'],
    chart_indicators: ['admin', 'member_vip', 'broker', 'analyst'],
    chart_drawing: ['admin', 'member_vip', 'broker', 'analyst'],
    chart_settings: ['admin', 'member_vip', 'broker', 'analyst'],

    // 4. Thị Trường & BCTC
    market_view: ['admin', 'member_vip', 'member_free', 'broker', 'analyst'],
    earnings_view: ['admin', 'member_vip', 'member_free', 'broker', 'analyst'],
    earnings_pdf_download: ['admin', 'member_vip', 'broker', 'analyst'],

    // 5. Ấn Phẩm & Báo Cáo
    reports_free_view: ['admin', 'member_vip', 'member_free', 'broker', 'analyst'],
    reports_vip_view: ['admin', 'member_vip', 'broker', 'analyst'],
    reports_pdf_download: ['admin', 'member_vip', 'broker', 'analyst'],

    // 6. Quản Trị Hệ Thống
    admin_dashboard: ['admin'],
    admin_posts_manage: ['admin', 'broker', 'analyst'],
    admin_users_manage: ['admin'],
    admin_roles_manage: ['admin'],
};

export const ROLE_LABELS: Record<string, { label: string; badgeClass: string; color: string }> = {
    admin: {
        label: 'Admin',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        color: '#f43f5e',
    },
    member_vip: {
        label: 'Member VIP',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        color: '#f59e0b',
    },
    member_free: {
        label: 'Member Free',
        badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        color: '#64748b',
    },
    broker: {
        label: 'Broker',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        color: '#10b981',
    },
    analyst: {
        label: 'Analyst',
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        color: '#3b82f6',
    },
};

/**
 * Kiểm tra độ phức tạp của mật khẩu
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) {
        return { valid: false, error: 'Mật khẩu phải chứa ít nhất 8 ký tự' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Mật khẩu phải chứa ít nhất 1 chữ số (0-9)' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        return { valid: false, error: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%...)' };
    }
    return { valid: true };
}
