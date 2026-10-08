import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users-store';
import { validatePasswordStrength } from '@/types/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json(
                { success: false, error: 'Email không hợp lệ' },
                { status: 400 }
            );
        }

        const passwordCheck = validatePasswordStrength(typeof password === 'string' ? password : '');
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { success: false, error: passwordCheck.error || 'Mật khẩu không đáp ứng tiêu chuẩn an toàn' },
                { status: 400 }
            );
        }

        // Tự động gán quyền member_free cho tài khoản tự đăng ký
        const result = await createUser({
            name: (name && typeof name === 'string' && name.trim()) || email.split('@')[0],
            email: email.trim().toLowerCase(),
            password,
            role: 'member_free',
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Đăng ký thất bại' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.',
            user: result.user,
        });
    } catch (error) {
        console.error('[API Register Error]:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi máy chủ nội bộ trong quá trình đăng ký' },
            { status: 500 }
        );
    }
}
