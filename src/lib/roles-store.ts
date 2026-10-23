import fs from 'fs';
import path from 'path';
import { FeatureKey, RoleDefinition, FEATURE_REGISTRY, FEATURE_PERMISSIONS } from '@/types/auth';
import { getAllUsers, saveUsers } from './users-store';

const ROLES_FILE_PATH = path.join(process.cwd(), 'data', 'roles.json');

const ALL_FEATURE_KEYS = FEATURE_REGISTRY.map((f) => f.key);
const VIP_FEATURE_KEYS = ALL_FEATURE_KEYS.filter((key) => !key.startsWith('admin_'));
const FREE_FEATURE_KEYS: FeatureKey[] = [
    'ranking_view',
    'chart_view',
    'market_view',
    'earnings_view',
    'reports_free_view',
];

function getDefaultRoles(): RoleDefinition[] {
    return [
        {
            id: 'admin',
            name: 'Quản Trị Viên (Admin)',
            description: 'Toàn quyền điều hành hệ thống, quản lý người dùng, bài viết CMS và cấu hình phân quyền.',
            badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            color: '#f43f5e',
            isSystem: true,
            permissions: [...ALL_FEATURE_KEYS],
            createdAt: '2026-10-15T00:00:00.000Z',
        },
        {
            id: 'member_vip',
            name: 'Hội Viên VIP',
            description: 'Toàn quyền sử dụng các công cụ phân tích cơ bản, mô hình định giá, bộ lọc RS chuyên sâu và báo cáo VIP.',
            badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
            color: '#f59e0b',
            isSystem: true,
            permissions: [...VIP_FEATURE_KEYS],
            createdAt: '2026-10-15T00:00:00.000Z',
        },
        {
            id: 'member_free',
            name: 'Thành Viên Cơ Bản (Free)',
            description: 'Quyền trải nghiệm cơ bản: xem diễn biến thị trường, bộ lọc RS cơ bản và biểu đồ kỹ thuật tiêu chuẩn.',
            badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
            color: '#64748b',
            isSystem: true,
            permissions: [...FREE_FEATURE_KEYS],
            createdAt: '2026-10-15T00:00:00.000Z',
        },
        {
            id: 'broker',
            name: 'Môi Giới Chứng Khoán (Broker)',
            description: 'Bao gồm toàn bộ quyền VIP chuyên sâu và quyền biên tập, xuất bản ấn phẩm tư vấn cho khách hàng.',
            badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
            color: '#10b981',
            isSystem: false,
            permissions: [...VIP_FEATURE_KEYS, 'admin_posts_manage'],
            createdAt: '2026-10-23T00:00:00.000Z',
        },
        {
            id: 'analyst',
            name: 'Chuyên Viên Phân Tích (Analyst)',
            description: 'Quyền nghiên cứu chuyên sâu, xuất báo cáo PDF, bóc tách BCTC và xuất bản ấn phẩm phân tích.',
            badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
            color: '#3b82f6',
            isSystem: false,
            permissions: [...VIP_FEATURE_KEYS, 'admin_posts_manage'],
            createdAt: '2026-10-23T00:00:00.000Z',
        },
    ];
}

declare global {
    // eslint-disable-next-line no-var
    var __ROLES_STORE__: RoleDefinition[] | undefined;
}

function ensureDataDir() {
    try {
        const dir = path.dirname(ROLES_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch {}
}

function saveRolesToFile(roles: RoleDefinition[]): boolean {
    globalThis.__ROLES_STORE__ = roles;
    try {
        ensureDataDir();
        const tempPath = `${ROLES_FILE_PATH}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(roles, null, 2), 'utf-8');
        fs.renameSync(tempPath, ROLES_FILE_PATH);
        return true;
    } catch (err) {
        console.warn('[roles-store] File save skipped:', err);
        return true;
    }
}

export function getAllRoles(): RoleDefinition[] {
    if (globalThis.__ROLES_STORE__ && Array.isArray(globalThis.__ROLES_STORE__)) {
        return globalThis.__ROLES_STORE__;
    }

    try {
        if (fs.existsSync(ROLES_FILE_PATH)) {
            const raw = fs.readFileSync(ROLES_FILE_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                globalThis.__ROLES_STORE__ = parsed;
                return parsed;
            }
        }
    } catch (err) {
        console.warn('[roles-store] Failed to read roles file:', err);
    }

    const defaults = getDefaultRoles();
    globalThis.__ROLES_STORE__ = defaults;

    try {
        ensureDataDir();
        fs.writeFileSync(ROLES_FILE_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
    } catch {}

    return globalThis.__ROLES_STORE__;
}

export function getRoleById(roleId: string): RoleDefinition | null {
    const roles = getAllRoles();
    return roles.find((r) => r.id === roleId) || null;
}

export function getRolePermissions(roleId: string): FeatureKey[] {
    if (!roleId) return [];
    if (roleId === 'admin') return [...ALL_FEATURE_KEYS];

    const role = getRoleById(roleId);
    if (role && Array.isArray(role.permissions)) {
        return role.permissions;
    }

    // Fallback to static permissions if role not found in dynamic store
    const fallbackPerms = ALL_FEATURE_KEYS.filter((key) => {
        const allowedRoles = FEATURE_PERMISSIONS[key] || [];
        return allowedRoles.includes(roleId);
    });

    return fallbackPerms.length > 0 ? fallbackPerms : [...FREE_FEATURE_KEYS];
}

export function checkRolePermission(roleId: string | undefined | null, feature: FeatureKey): boolean {
    if (!roleId) return false;
    if (roleId === 'admin') return true;

    const perms = getRolePermissions(roleId);
    return perms.includes(feature);
}

export function saveRole(data: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    badgeClass?: string;
    permissions: FeatureKey[];
}): { success: boolean; role?: RoleDefinition; error?: string } {
    const roles = getAllRoles();
    const cleanId = data.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (!cleanId) {
        return { success: false, error: 'Mã vai trò không hợp lệ' };
    }
    if (!data.name || !data.name.trim()) {
        return { success: false, error: 'Tên vai trò không được để trống' };
    }

    const index = roles.findIndex((r) => r.id === cleanId);

    if (index >= 0) {
        // Cập nhật vai trò hiện có
        const current = roles[index];
        const updated: RoleDefinition = {
            ...current,
            name: data.name.trim(),
            description: data.description?.trim() || current.description,
            color: data.color || current.color || '#10b981',
            badgeClass: data.badgeClass || current.badgeClass,
            permissions: Array.from(new Set(data.permissions)),
            updatedAt: new Date().toISOString(),
        };

        // Nếu là role admin hệ thống, luôn giữ đủ toàn bộ quyền
        if (current.id === 'admin') {
            updated.permissions = [...ALL_FEATURE_KEYS];
        }

        roles[index] = updated;
        saveRolesToFile(roles);
        return { success: true, role: updated };
    } else {
        // Tạo vai trò mới
        const color = data.color || '#10b981';
        const newRole: RoleDefinition = {
            id: cleanId,
            name: data.name.trim(),
            description: data.description?.trim() || `Vai trò ${data.name}`,
            color,
            badgeClass: data.badgeClass || `bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30`,
            isSystem: false,
            permissions: Array.from(new Set(data.permissions)),
            createdAt: new Date().toISOString(),
        };

        roles.push(newRole);
        saveRolesToFile(roles);
        return { success: true, role: newRole };
    }
}

export function deleteRole(roleId: string): { success: boolean; error?: string } {
    const roles = getAllRoles();
    const index = roles.findIndex((r) => r.id === roleId);

    if (index === -1) {
        return { success: false, error: 'Không tìm thấy vai trò cần xóa' };
    }

    if (roles[index].isSystem) {
        return { success: false, error: 'Không thể xóa các vai trò cốt lõi của hệ thống (Admin, VIP, Free)' };
    }

    // Xóa vai trò
    roles.splice(index, 1);
    saveRolesToFile(roles);

    // Chuyển tất cả người dùng thuộc vai trò bị xóa về vai trò 'member_free'
    try {
        const users = getAllUsers();
        let changed = false;
        users.forEach((u) => {
            if (u.role === roleId) {
                u.role = 'member_free';
                changed = true;
            }
        });
        if (changed) {
            saveUsers(users);
        }
    } catch (err) {
        console.warn('[roles-store] Error reassigning users after role delete:', err);
    }

    return { success: true };
}
