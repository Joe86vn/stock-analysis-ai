'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

function LoginFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const registeredParam = searchParams.get('registered');
    const emailParam = searchParams.get('email');
    const errorParam = searchParams.get('error');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (registeredParam === '1') {
            setSuccessMessage('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
        }
        if (emailParam) {
            setEmail(emailParam);
        }
        if (errorParam) {
            if (errorParam === 'OAuthAccountNotLinked') {
                setError('Email này đã được đăng ký bằng phương thức khác. Vui lòng đăng nhập bằng mật khẩu.');
            } else if (errorParam === 'Configuration') {
                setError('Hệ thống xác thực Google chưa được cấu hình đầy đủ.');
            } else {
                setError('Xác thực thất bại. Vui lòng thử lại.');
            }
        }
    }, [registeredParam, emailParam, errorParam]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const res = await signIn('credentials', {
                email: email.trim().toLowerCase(),
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Email hoặc mật khẩu không chính xác.');
                setIsLoading(false);
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Đã xảy ra lỗi trong quá trình kết nối. Vui lòng thử lại.');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800/90 rounded-2xl shadow-sm">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 mb-3 border border-emerald-500/20">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Đăng Nhập ValueX</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Hệ thống phân tích chứng khoán & định giá bứt phá
                </p>
            </div>

            {successMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ten@example.com"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Mật khẩu
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang kiểm tra...</span>
                        </>
                    ) : (
                        <>
                            <span>Đăng nhập</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-900 px-3 text-gray-400 dark:text-gray-500 font-medium">
                        Hoặc tiếp tục với
                    </span>
                </div>
            </div>

            <GoogleSignInButton callbackUrl={callbackUrl} text="Đăng nhập bằng tài khoản Google" />

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Chưa có tài khoản?{' '}
                    <Link
                        href="/register"
                        className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                        Đăng ký miễn phí ngay
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50 dark:bg-[#0B0F19]">
            <Suspense fallback={<div className="text-sm text-gray-400">Đang tải trang đăng nhập...</div>}>
                <LoginFormContent />
            </Suspense>
        </div>
    );
}
