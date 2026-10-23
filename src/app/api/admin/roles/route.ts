import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllRoles, saveRole, deleteRole } from '@/lib/roles-store';
import { FEATURE_REGISTRY } from '@/types/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập' }, { status: 403 });
        }

        const roles = getAllRoles();
        return NextResponse.json({
            roles,
            featureRegistry: FEATURE_REGISTRY,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập' }, { status: 403 });
        }

        const body = await req.json();
        const { id, name, description, color, badgeClass, permissions } = body;

        if (!id || !name) {
            return NextResponse.json({ error: 'Mã vai trò và Tên vai trò không được để trống' }, { status: 400 });
        }

        const result = saveRole({
            id,
            name,
            description,
            color,
            badgeClass,
            permissions: Array.isArray(permissions) ? permissions : [],
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Lỗi lưu vai trò' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            role: result.role,
            roles: getAllRoles(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const roleId = searchParams.get('id');

        if (!roleId) {
            return NextResponse.json({ error: 'Thiếu mã vai trò (id)' }, { status: 400 });
        }

        const result = deleteRole(roleId);
        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Lỗi xóa vai trò' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            roles: getAllRoles(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
