'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { UserRole, ROLE_LABELS } from '@/types/auth';
import { User, LogIn, LogOut, ShieldAlert, Sparkles, ChevronDown, UserCheck } from 'lucide-react';

export function UserMenu() {
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (status === 'loading') {
        return (
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        );
    }

    if (!session?.user) {
        return (
            <div className="flex items-center space-x-2">
                <Link
                    href="/login"
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập</span>
                </Link>
            </div>
        );
    }

    const role = (session.user.role as UserRole) || 'member_free';
    const roleMeta = ROLE_LABELS[role] || ROLE_LABELS.member_free;
    const isAdmin = role === 'admin';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/70 dark:border-gray-700/60 transition"
            >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100 max-w-[100px] truncate leading-tight">
                        {session.user.name || session.user.email}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border w-fit leading-none mt-0.5 ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                    </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3.5 py-2 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {session.user.name || 'Người dùng'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {session.user.email}
                        </p>
                        <div className="mt-1.5 flex items-center">
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${roleMeta.badgeClass}`}>
                                {roleMeta.label}
                            </span>
                        </div>
                    </div>

                    <div className="py-1">
                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center space-x-2 px-3.5 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition"
                        >
                            <User className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Hồ Sơ & Nâng Cấp VIP</span>
                        </Link>

                        {isAdmin && (
                            <Link
                                href="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center space-x-2 px-3.5 py-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 font-medium transition"
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Trang Quản Trị (Admin)</span>
                            </Link>
                        )}

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                signOut({ callbackUrl: '/login' });
                            }}
                            className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            <LogOut className="w-3.5 h-3.5 text-rose-500" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
