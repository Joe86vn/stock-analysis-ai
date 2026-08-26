import React from 'react';
import Image from 'next/image';
import { FileText, ShieldCheck, Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-[#0B0F19]/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3.5">
          {/* Official ValueX Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative h-10 w-40 sm:h-11 sm:w-44">
              <Image
                src="/brand/logo/logo-full-dark.svg"
                alt="ValueX Logo"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
            <div className="hidden h-6 w-px bg-gray-800 md:block" />
            <p className="hidden text-xs text-gray-400 font-medium md:block">
              Đồng hành bứt phá giá trị - Đầu tư bền vững
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3.5">
          <div className="hidden items-center space-x-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI Valuation Engine</span>
          </div>

          <a
            href="#analysis-guide"
            className="flex items-center space-x-1.5 rounded-lg border border-gray-700/80 bg-gray-800/70 px-3.5 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-gray-700 hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span>Quy trình chuẩn</span>
          </a>
        </div>
      </div>
    </header>
  );
}
