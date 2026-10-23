import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { findUserByEmail, findOrCreateGoogleUser } from './users-store';
import { UserRole } from '@/types/auth';
import { authConfig } from './auth.config';

// Mở rộng kiểu dữ liệu Session và JWT cho NextAuth
declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        name: string;
        role: UserRole;
    }
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: UserRole;
        };
    }
}

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;

const authProviders: any[] = [
    Credentials({
        name: 'Credentials',
        credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Mật khẩu', type: 'password' },
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
                return null;
            }

            const email = String(credentials.email);
            const password = String(credentials.password);

            const user = findUserByEmail(email);
            if (!user) {
                return null;
            }

            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                return null;
            }

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };
        },
    }),
];

if (googleClientId && googleClientSecret) {
    authProviders.push(
        Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
        })
    );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'valuex-auth-secret-production-fallback-key-2026',
    providers: authProviders,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            if (account?.provider === 'google' && user?.email) {
                try {
                    const appUser = findOrCreateGoogleUser({
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    });
                    (user as any).role = appUser.role;
                    user.id = appUser.id;
                } catch (err) {
                    console.error('[auth] Google signIn callback error:', err);
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            if (!token.role && token.email) {
                const existing = findUserByEmail(token.email);
                token.role = existing?.role || 'member_free';
                if (existing) {
                    token.id = existing.id;
                }
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
});

