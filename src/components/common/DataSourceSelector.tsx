'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDataSource } from '@/contexts/DataSourceContext';
import { MarketDataSource } from '@/lib/data-providers/types';
import { Database, Zap, Globe, Landmark, ChevronDown, Check } from 'lucide-react';

interface SourceOption {
  id: MarketDataSource;
  label: string;
  shortLabel: string;
  badge: string;
  desc: string;
  icon: React.ReactNode;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: 'auto',
    label: 'Tự động (Dự phòng thông minh)',
    shortLabel: 'Tự động',
    badge: 'Khuyên dùng',
    desc: 'Ưu tiên Vietcap IQ, tự động chuyển sang MASVN khi có sự cố mạng/403/timeout',
    icon: <Zap className="h-3.5 w-3.5 text-amber-500 animate-pulse" />,
  },
  {
    id: 'vietcap',
    label: 'Vietcap IQ (Mặc định)',
    shortLabel: 'Vietcap IQ',
    badge: 'Chuẩn hoá',
    desc: 'Nguồn dữ liệu Vietcap Insight Service, nến điều chỉnh GapChart',
    icon: <Globe className="h-3.5 w-3.5 text-blue-500" />,
  },
  {
    id: 'mas',
    label: 'MASVN (Mirae Asset)',
    shortLabel: 'MASVN',
    badge: '26 năm EOD · 21 năm BCTC',
    desc: 'Dữ liệu sâu trọn đời từ năm 2000, số liệu tự doanh, chỉ số ngân hàng chuyên biệt',
    icon: <Landmark className="h-3.5 w-3.5 text-rose-500" />,
  },
];

export function DataSourceSelector() {
  const { currentSource, setSource } = useDataSource();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = SOURCE_OPTIONS.find((opt) => opt.id === currentSource) || SOURCE_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-slate-700 dark:text-gray-300 transition-all duration-150 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
        title="Chọn nguồn dữ liệu thị trường và báo cáo tài chính"
      >
        <span className="flex items-center">{activeOption.icon}</span>
        <span className="hidden sm:inline-block font-semibold">{activeOption.shortLabel}</span>
        <span className="sm:hidden font-semibold">{activeOption.shortLabel.slice(0, 3)}</span>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800/80 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-emerald-500" /> Nguồn dữ liệu
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Chuyển đổi tức thì</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Chọn nguồn cung cấp giá EOD và BCTC cho toàn bộ hệ thống
            </p>
          </div>

          <div className="space-y-1">
            {SOURCE_OPTIONS.map((option) => {
              const isSelected = option.id === currentSource;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSource(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all duration-150 flex items-start space-x-2.5 ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/50'
                      : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/60 text-slate-700 dark:text-gray-300'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{option.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900 dark:text-gray-100 truncate">
                        {option.label}
                      </span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-sm bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {option.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

