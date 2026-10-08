import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from './users-store';
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

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'valuex-auth-secret-production-fallback-key-2026',
    providers: [
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
    ],
});
