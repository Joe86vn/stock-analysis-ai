'use client';

import React from 'react';
import Image from 'next/image';
import { FileText, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export function Header() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md transition-colors duration-200 print:hidden shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3.5">
          {/* Official ValueX Logo - Dynamically switches between light/dark */}
          <div className="flex items-center space-x-3">
            <div className="relative h-10 w-40 sm:h-11 sm:w-44">
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
            <div className="hidden h-6 w-px bg-gray-200 dark:bg-gray-800 md:block" />
            <p className="hidden text-xs text-slate-500 dark:text-gray-400 font-medium md:block">
              Đồng hành bứt phá giá trị - Đầu tư bền vững
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden items-center space-x-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-400 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>AI Valuation Engine</span>
          </div>

          {/* Theme Toggle Button (Light / Dark Mode) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-100/80 dark:bg-gray-800/80 text-slate-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-300 transition shadow-xs"
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
            className="flex items-center space-x-1.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-100/80 dark:bg-gray-800/70 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300 shadow-xs"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Quy trình chuẩn</span>
          </a>
        </div>
      </div>
    </header>
  );
}
