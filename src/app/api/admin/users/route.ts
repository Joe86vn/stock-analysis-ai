import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSafeUsers, createUser, updateUserRole } from '@/lib/users-store';
import { UserRole } from '@/types/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Truy cập bị từ chối' }, { status: 403 });
    }

    const users = getSafeUsers();
    return NextResponse.json({ success: true, data: users });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Truy cập bị từ chối' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { email, name, password, role: newRole } = body;

        if (!email || !password) {
            return NextResponse.json({ success: false, error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
        }

        const res = await createUser({
            email,
            name,
            password,
            role: newRole as UserRole,
        });

        if (!res.success) {
            return NextResponse.json({ success: false, error: res.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, user: res.user });
    } catch (err) {
        return NextResponse.json({ success: false, error: 'Lỗi tạo người dùng' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Truy cập bị từ chối' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, role: newRole } = body;

        if (!userId || !newRole) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin cập nhật' }, { status: 400 });
        }

        const success = updateUserRole(userId, newRole as UserRole);
        if (!success) {
            return NextResponse.json({ success: false, error: 'Cập nhật vai trò thất bại' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Đã cập nhật vai trò thành công' });
    } catch (err) {
        return NextResponse.json({ success: false, error: 'Lỗi cập nhật người dùng' }, { status: 500 });
    }
}
