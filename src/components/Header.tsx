'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Sun, Moon, BarChart3, Trophy, Sparkles } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export function Header() {
  const { theme, toggleTheme, mounted } = useTheme();
  const pathname = usePathname();

  const isAnalysisActive = pathname === '/' || pathname === '';
  const isRankingActive = pathname === '/ranking';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md transition-colors duration-200 print:hidden shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center space-x-6">
          {/* Official ValueX Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative h-9 w-36 sm:h-10 sm:w-40">
              {mounted && theme === 'light' ? (
                <Image
                  src="/brand/logo/logo-full-light.svg"
                  alt="ValueX Logo"
                  fill
                  priority
                  className="object-contain object-left"
                />
              ) : (
                <Image
                  src="/brand/logo/logo-full-dark.svg"
                  alt="ValueX Logo"
                  fill
                  priority
                  className="object-contain object-left"
                />
              )}
            </div>
          </Link>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5 p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700/60">
            <Link
              href="/"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isAnalysisActive
                  ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Phân Tích Doanh Nghiệp</span>
            </Link>

            <Link
              href="/ranking"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isRankingActive
                  ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Bộ Lọc & Xếp Hạng RS</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Mobile nav pills */}
          <div className="flex md:hidden items-center space-x-1">
            <Link
              href="/"
              className={`p-2 rounded-lg text-xs font-semibold ${
                isAnalysisActive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              title="Phân tích"
            >
              <BarChart3 className="h-4 w-4" />
            </Link>
            <Link
              href="/ranking"
              className={`p-2 rounded-lg text-xs font-semibold ${
                isRankingActive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              title="Bảng xếp hạng"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
            </Link>
          </div>

          <div className="hidden items-center space-x-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-400 lg:flex">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>ValueX Core Scoring</span>
          </div>

          {/* Theme Toggle Button (Light / Dark Mode) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="flex items-center justify-center h-8.5 w-8.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-100/80 dark:bg-gray-800/80 text-slate-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-300 transition shadow-xs"
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng (Light)' : 'Chuyển sang giao diện Tối (Dark)'}
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 animate-in spin-in-180 duration-300" />
            )}
          </button>

          <a
            href="#analysis-guide"
            className="hidden sm:flex items-center space-x-1.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-100/80 dark:bg-gray-800/70 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300 shadow-xs"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Quy trình</span>
          </a>
        </div>
      </div>
    </header>
  );
}
