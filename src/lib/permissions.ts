import { FeatureKey, UserRole, FEATURE_PERMISSIONS } from '@/types/auth';

/**
 * Kiểm tra xem một vai trò người dùng có quyền truy cập vào tính năng hay không
 * @param role Vai trò của người dùng (admin, member_vip, member_free)
 * @param feature Tên tính năng cần kiểm tra
 */
export function hasPermission(role: UserRole | undefined | null, feature: FeatureKey): boolean {
    if (!role) return false;
    if (role === 'admin') return true; // Admin có toàn quyền

    const allowedRoles = FEATURE_PERMISSIONS[feature];
    if (!allowedRoles) {
        console.warn(`[RBAC] Feature '${feature}' chưa được định nghĩa quyền trong FEATURE_PERMISSIONS!`);
        return false;
    }

    return allowedRoles.includes(role);
}

/**
 * Kiểm tra xem role có được phép tùy biến các cài đặt không
 */
export function canCustomize(role: UserRole | undefined | null): boolean {
    if (!role) return false;
    return role === 'admin' || role === 'member_vip';
}

/**
 * Kiểm tra xem role có phải là VIP trở lên không
 */
export function isVipOrAdmin(role: UserRole | undefined | null): boolean {
    if (!role) return false;
    return role === 'admin' || role === 'member_vip';
}
