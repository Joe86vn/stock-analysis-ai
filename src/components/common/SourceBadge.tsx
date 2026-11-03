'use client';

import React from 'react';
import { Zap, Globe, Landmark, ShieldCheck } from 'lucide-react';

interface SourceBadgeProps {
  source?: string;
  isFallback?: boolean;
  className?: string;
}

export function SourceBadge({ source, isFallback, className = '' }: SourceBadgeProps) {
  if (!source) return null;

  const normalized = source.toUpperCase();
  const isMas = normalized.includes('MAS');
  const isVietcap = normalized.includes('VIETCAP');

  if (isFallback) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 ${className}`}
        title="Dữ liệu đang được phục vụ từ nguồn dự phòng MASVN do nguồn chính gặp sự cố kết nối"
      >
        <Zap className="h-2.5 w-2.5 text-amber-500 animate-pulse" />
        <span>Dự phòng: MASVN</span>
      </span>
    );
  }

  if (isMas) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 ${className}`}
        title="Nguồn dữ liệu chuyên sâu từ Chứng khoán Mirae Asset (MASVN)"
      >
        <Landmark className="h-2.5 w-2.5 text-rose-500" />
        <span>MASVN (26 năm)</span>
      </span>
    );
  }

  if (isVietcap) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ${className}`}
        title="Nguồn dữ liệu chuẩn hóa từ Vietcap IQ Insight Service"
      >
        <Globe className="h-2.5 w-2.5 text-blue-500" />
        <span>Vietcap IQ</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${className}`}
    >
      <ShieldCheck className="h-2.5 w-2.5" />
      <span>{source}</span>
    </span>
  );
}
