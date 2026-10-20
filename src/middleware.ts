import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;

    // Bỏ qua static assets, favicon, brand assets và tất cả các API routes (API tự quản lý auth/cron secret)
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/brand') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Các trang công khai không yêu cầu đăng nhập bắt buộc
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isPublicPage =
        isAuthPage ||
        pathname === '/' ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/earnings') ||
        pathname.startsWith('/ranking') ||
        pathname.startsWith('/chart') ||
        pathname.startsWith('/market');

    if (!isLoggedIn) {
        if (!isPublicPage) {
            const loginUrl = new URL('/login', req.nextUrl.origin);
            loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    // Nếu đã đăng nhập mà truy cập login/register thì điều hướng về trang chủ
    if (isAuthPage) {
        return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    }

    // Guard cho route /admin - Chỉ admin mới được truy cập
    if (pathname.startsWith('/admin')) {
        const userRole = (req.auth?.user as any)?.role;
        if (userRole !== 'admin') {
            // Không phải admin -> redirect về trang chủ
            return NextResponse.redirect(new URL('/', req.nextUrl.origin));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
