'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, Sparkles, Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface UpgradePromptProps {
    title?: string;
    description?: string;
    featureName?: string;
}

export function UpgradePrompt({
    title = 'Nâng cấp Gói VIP để mở khóa',
    description = 'Tính năng này yêu cầu tài khoản VIP hoặc Quản trị viên để truy cập và tùy biến dữ liệu chuyên sâu.',
    featureName,
}: UpgradePromptProps) {
    return (
        <div className="w-full max-w-2xl mx-auto my-12 p-8 rounded-2xl bg-gradient-to-b from-amber-500/5 via-white to-white dark:from-amber-500/10 dark:via-gray-900 dark:to-gray-900 border border-amber-500/30 dark:border-amber-500/20 shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 mb-4 border border-amber-500/30 shadow-inner">
                <Crown className="w-7 h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {title}
            </h2>

            {featureName && (
                <div className="inline-block my-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    Tính năng: {featureName}
                </div>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto mt-2 mb-6">
                {description}
            </p>

            {/* Benefits checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-md mx-auto mb-8 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Toàn quyền xem Tab Phân tích DN</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Bộ công cụ vẽ & phân tích kỹ thuật</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Tùy biến chỉ báo & lưu Watchlist riêng</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Định giá DCF, P/E, P/B & Xuất PDF</span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                    href="/chart"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                    Quay lại Biểu đồ (Gói Free)
                </Link>
                <a
                    href="https://t.me/valuex_support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Liên hệ nâng cấp gói VIP</span>
                    <ArrowRight className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
}
