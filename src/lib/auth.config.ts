import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'valuex-auth-secret-production-fallback-key-2026',
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = (token.id as string) || (token.sub as string);
                session.user.role = (token.role as any) || 'member_free';
            }
            return session;
        },
    },
    providers: [],
};
