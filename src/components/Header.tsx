import React from 'react';
import { TrendingUp, FileText, Sparkles, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0B0F19]/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/20">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Quantum Stock AI
              </h1>
              <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-400 border border-sky-500/20">
                PRO 1.5
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              Hệ thống Phân tích Đầu tư Chứng khoán Tự động theo Quy trình chuẩn
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden items-center space-x-2 text-xs text-gray-400 md:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Gemini Long-Context AI Active</span>
          </div>
          <a
            href="#analysis-guide"
            className="flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-gray-700 hover:text-white"
          >
            <FileText className="h-3.5 w-3.5 text-sky-400" />
            <span>Mẫu Quy Trình</span>
          </a>
        </div>
      </div>
    </header>
  );
}
