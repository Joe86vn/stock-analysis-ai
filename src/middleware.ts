import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;

    // Bỏ qua static assets, favicon, brand assets
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/brand') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Trang login & register & trang chủ & reports không yêu cầu đăng nhập bắt buộc
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isPublicPage = isAuthPage || pathname === '/' || pathname.startsWith('/reports');

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
