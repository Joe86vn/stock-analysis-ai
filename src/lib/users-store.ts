import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { AppUser, SafeUser, UserRole } from '@/types/auth';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

let cachedDefaultUsers: AppUser[] | null = null;

function getDefaultUsers(): AppUser[] {
    if (!cachedDefaultUsers) {
        cachedDefaultUsers = [
            {
                id: 'usr_admin_001',
                email: 'admin@valuex.vn',
                name: 'ValueX Administrator',
                role: 'admin',
                passwordHash: bcrypt.hashSync('valuex@Admin2025', 10),
                createdAt: new Date().toISOString(),
            },
            {
                id: 'usr_vip_001',
                email: 'vip@valuex.vn',
                name: 'Nhà Đầu Tư VIP',
                role: 'member_vip',
                passwordHash: bcrypt.hashSync('valuex@VIP2025', 10),
                createdAt: new Date().toISOString(),
            },
            {
                id: 'usr_free_001',
                email: 'demo@valuex.vn',
                name: 'Thành Viên Trải Nghiệm',
                role: 'member_free',
                passwordHash: bcrypt.hashSync('demo@Free2025', 10),
                createdAt: new Date().toISOString(),
            },
        ];
    }
    return cachedDefaultUsers;
}

declare global {
    // eslint-disable-next-line no-var
    var __USERS_STORE__: AppUser[] | undefined;
}

function ensureDataDir() {
    try {
        const dir = path.dirname(USERS_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch {
        // Ignore read-only filesystem error
    }
}

/**
 * Ghi file nguyên tử (Atomic write):
 * Ghi dữ liệu ra file tạm .tmp trước, sau đó rename thay thế file đích để ngăn ngừa
 * lỗi file JSON bị hỏng (corrupted) khi có nhiều request đồng thời hoặc mất điện.
 */
function saveUsers(users: AppUser[]): boolean {
    globalThis.__USERS_STORE__ = users;
    try {
        ensureDataDir();
        const tempPath = `${USERS_FILE_PATH}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(users, null, 2), 'utf-8');
        fs.renameSync(tempPath, USERS_FILE_PATH);
        return true;
    } catch (err) {
        console.warn('[users-store] File save skipped (read-only filesystem or IO error):', err);
        return true; // Return true as in-memory cache is updated
    }
}

export function getAllUsers(): AppUser[] {
    if (globalThis.__USERS_STORE__ && Array.isArray(globalThis.__USERS_STORE__)) {
        return globalThis.__USERS_STORE__;
    }

    try {
        if (fs.existsSync(USERS_FILE_PATH)) {
            const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                globalThis.__USERS_STORE__ = parsed;
                return parsed;
            }
        }
    } catch (err) {
        console.warn('[users-store] Failed to read users file:', err);
    }

    const defaults = [...getDefaultUsers()];
    globalThis.__USERS_STORE__ = defaults;

    // Best-effort write to disk
    try {
        ensureDataDir();
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
    } catch {
        // Read-only filesystem on Vercel — safe to ignore
    }

    return globalThis.__USERS_STORE__;
}

export function findUserByEmail(email: string): AppUser | null {
    const users = getAllUsers();
    const cleanEmail = email.trim().toLowerCase();
    return users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export function findUserById(id: string): AppUser | null {
    const users = getAllUsers();
    return users.find((u) => u.id === id) || null;
}

export async function createUser(data: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
}): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
    const users = getAllUsers();
    const cleanEmail = data.email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'Email đã tồn tại trên hệ thống' };
    }

    // Băm mật khẩu bất đồng bộ (async non-blocking) để tránh nghẽn Node.js Event Loop
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser: AppUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: cleanEmail,
        name: data.name.trim() || cleanEmail.split('@')[0],
        role: data.role || 'member_free',
        passwordHash,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const saved = saveUsers(users);
    if (!saved) {
        return { success: false, error: 'Không thể lưu trữ tài khoản người dùng' };
    }

    const { passwordHash: _, ...safeUser } = newUser;
    return { success: true, user: safeUser };
}

export function updateUserRole(userId: string, newRole: UserRole): boolean {
    const users = getAllUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    users[index].role = newRole;
    return saveUsers(users);
}

export function getSafeUsers(): SafeUser[] {
    const users = getAllUsers();
    return users.map(({ passwordHash: _, ...safe }) => safe);
}
