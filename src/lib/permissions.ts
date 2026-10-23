import { FeatureKey, UserRole, FEATURE_PERMISSIONS } from '@/types/auth';

/**
 * Kiểm tra xem một vai trò hoặc người dùng có quyền truy cập vào tính năng hay không
 * @param role Vai trò người dùng (admin, member_vip, broker, analyst, member_free, hoặc vai trò tùy biến)
 * @param feature Tên tính năng cần kiểm tra từ FeatureKey
 * @param userPermissions Mảng các FeatureKey đã được cấp cho session người dùng (nếu có)
 */
export function hasPermission(
    role: UserRole | undefined | null,
    feature: FeatureKey,
    userPermissions?: FeatureKey[]
): boolean {
    if (!role) return false;
    if (role === 'admin') return true; // Admin luôn có 100% quyền

    // 1. Nếu có mảng permissions từ session đăng nhập
    if (Array.isArray(userPermissions)) {
        return userPermissions.includes(feature);
    }

    // 2. Fallback sang ma trận cấu hình mặc định nếu chưa nạp được permissions
    const allowedRoles = FEATURE_PERMISSIONS[feature];
    if (!allowedRoles) {
        return false;
    }

    return allowedRoles.includes(role);
}

/**
 * Kiểm tra xem role có được phép tùy biến các cài đặt (ranking, watchlist, chart) không
 */
export function canCustomize(role: UserRole | undefined | null, userPermissions?: FeatureKey[]): boolean {
    if (!role) return false;
    if (role === 'admin') return true;
    return hasPermission(role, 'ranking_customize', userPermissions);
}

/**
 * Kiểm tra xem role có quyền phân tích chuyên sâu (VIP, Broker, Analyst, Admin) không
 */
export function isVipOrAdmin(role: UserRole | undefined | null, userPermissions?: FeatureKey[]): boolean {
    if (!role) return false;
    if (role === 'admin') return true;
    return hasPermission(role, 'analysis_page', userPermissions);
}
