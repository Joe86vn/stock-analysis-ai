'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2, Info, X } from 'lucide-react';

interface GoogleSignInButtonProps {
    callbackUrl?: string;
    text?: string;
}

export function GoogleSignInButton({
    callbackUrl = '/',
    text = 'Tiếp tục với Google',
}: GoogleSignInButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [configAlert, setConfigAlert] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setConfigAlert(null);

        try {
            // Kiểm tra trạng thái cấu hình Google OAuth từ server
            const res = await fetch('/api/auth/google/status');
            const data = await res.json();

            if (!data.configured) {
                setIsLoading(false);
                setConfigAlert(
                    'Chức năng Đăng nhập bằng Google đang ở bước cấu hình máy chủ. Vui lòng thêm AUTH_GOOGLE_ID và AUTH_GOOGLE_SECRET vào file .env.local để kích hoạt OAuth 2.0. Bạn có thể sử dụng Đăng ký / Đăng nhập bằng Email ngay bây giờ.'
                );
                return;
            }

            // Đã cấu hình -> chuyển hướng đăng nhập Google
            await signIn('google', { callbackUrl });
        } catch (err) {
            console.error('Google sign in error:', err);
            setIsLoading(false);
            setConfigAlert('Không thể kết nối đến máy chủ OAuth. Vui lòng thử lại sau.');
        }
    };

    return (
        <div className="w-full">
            {configAlert && (
                <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start justify-between gap-2 animate-in fade-in">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                        <span className="leading-relaxed">{configAlert}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setConfigAlert(null)}
                        className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 p-0.5"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-200 font-medium text-sm flex items-center justify-center space-x-3 transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        <span>Đang kết nối Google...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.41 7.33 24 12 24z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.43l4.03-3.14z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.59 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                            />
                        </svg>
                        <span>{text}</span>
                    </>
                )}
            </button>
        </div>
    );
}
