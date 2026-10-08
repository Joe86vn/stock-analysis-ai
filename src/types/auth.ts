export type UserRole = 'admin' | 'member_vip' | 'member_free';

export interface AppUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    createdAt: string;
}

export type SafeUser = Omit<AppUser, 'passwordHash'>;

export type FeatureKey =
    | 'analysis_page'         // Xem toàn bộ Tab Phân Tích Doanh Nghiệp (BCTC, Điểm sức khỏe, Dự báo)
    | 'ranking_view'          // Xem Tab Bộ Lọc & Xếp Hạng RS
    | 'ranking_customize'     // Tùy biến bộ lọc, lưu preset, thay đổi tiêu chí
    | 'ranking_export'        // Xuất dữ liệu bảng xếp hạng CSV/Excel
    | 'chart_view'            // Xem Tab Biểu Đồ Kỹ Thuật (chỉ nến & volume mặc định)
    | 'chart_drawing'         // Vẽ trendline, horizontal, measure tools
    | 'chart_settings'        // Thay đổi theme, màu sắc, custom parameters
    | 'chart_indicators'      // Thêm/sửa chỉ báo kỹ thuật tùy chỉnh
    | 'watchlist_customize'   // Thêm/bớt mã trong watchlist, tạo watchlist mới
    | 'valuation_calculator'  // Tính toán định giá PE/PB/DCF tùy biến
    | 'document_upload'       // Tải file BCTC/BCTN để AI phân tích
    | 'export_pdf'            // Xuất báo cáo PDF
    | 'admin_dashboard';      // Quản lý hệ thống, quản lý users & phân quyền

// Phân quyền cho từng vai trò
export const FEATURE_PERMISSIONS: Record<FeatureKey, UserRole[]> = {
    // Tab Phân tích Doanh nghiệp: chỉ admin & member VIP
    analysis_page: ['admin', 'member_vip'],

    // Tab Bộ lọc: tất cả đều được xem, nhưng chỉ VIP/Admin mới được tùy biến và xuất file
    ranking_view: ['admin', 'member_vip', 'member_free'],
    ranking_customize: ['admin', 'member_vip'],
    ranking_export: ['admin', 'member_vip'],

    // Tab Biểu đồ kỹ thuật: tất cả đều được xem, nhưng chỉ VIP/Admin mới được vẽ & cấu hình
    chart_view: ['admin', 'member_vip', 'member_free'],
    chart_drawing: ['admin', 'member_vip'],
    chart_settings: ['admin', 'member_vip'],
    chart_indicators: ['admin', 'member_vip'],

    // Watchlist tùy biến
    watchlist_customize: ['admin', 'member_vip'],

    // Các công cụ chuyên sâu & AI
    valuation_calculator: ['admin', 'member_vip'],
    document_upload: ['admin', 'member_vip'],
    export_pdf: ['admin', 'member_vip'],

    // Quản trị
    admin_dashboard: ['admin'],
};

export const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string; color: string }> = {
    admin: {
        label: 'Admin',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        color: '#f43f5e',
    },
    member_vip: {
        label: 'Member VIP',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        color: '#f59e0b',
    },
    member_free: {
        label: 'Member Free',
        badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        color: '#64748b',
    },
};

/**
 * Kiểm tra độ phức tạp của mật khẩu:
 * - Tối thiểu 8 ký tự
 * - Ít nhất 1 chữ hoa (A-Z)
 * - Ít nhất 1 chữ số (0-9)
 * - Ít nhất 1 ký tự đặc biệt (!@#$%...)
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
