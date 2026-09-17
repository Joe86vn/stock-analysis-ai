'use client';

import React from 'react';
import {
  MousePointer,
  Ruler,
  TrendingUp,
  ArrowUpRight,
  Minus,
  Tag,
  Square,
  Pause,
  SlidersHorizontal,
  PenTool,
  Type,
  Eraser,
} from 'lucide-react';
import { DrawingToolType } from './drawing-types';

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onClearAll: () => void;
}

export function DrawingToolbar({
  activeTool,
  onSelectTool,
  onClearAll,
}: DrawingToolbarProps) {
  const tools: { type: DrawingToolType; label: string; icon: React.ReactNode }[] = [
    {
      type: 'cursor',
      label: 'Con trỏ chuột (Di chuyển / Zoom)',
      icon: <MousePointer className="h-4 w-4" />,
    },
    {
      type: 'measure',
      label: 'Thước đo biên độ Giá & % (Measure)',
      icon: <Ruler className="h-4 w-4" />,
    },
    {
      type: 'segment',
      label: 'Đoạn thẳng xu hướng (Trendline 2 điểm)',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="19" r="2" fill="currentColor" />
          <circle cx="19" cy="5" r="2" fill="currentColor" />
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
        </svg>
      ),
    },
    {
      type: 'straightLine',
      label: 'Đường thẳng mở rộng 2 phía (Extended Line)',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      type: 'rayLine',
      label: 'Tia kéo dài 1 phía (Ray)',
      icon: <ArrowUpRight className="h-4 w-4" />,
    },
    {
      type: 'horizontalStraightLine',
      label: 'Đường ngang Hỗ trợ / Kháng cự',
      icon: <Minus className="h-4 w-4" />,
    },
    {
      type: 'priceLine',
      label: 'Đường mức giá (Price Line)',
      icon: <Tag className="h-4 w-4" />,
    },
    {
      type: 'rect',
      label: 'Vùng hộp tích lũy (Rectangle Box)',
      icon: <Square className="h-4 w-4" />,
    },
    {
      type: 'parallelStraightLine',
      label: 'Kênh giá song song (Parallel Channel)',
      icon: <Pause className="h-4 w-4 rotate-45" />,
    },
    {
      type: 'fibonacciLine',
      label: 'Fibonacci Thoái lui (Fib Retracement)',
      icon: <SlidersHorizontal className="h-4 w-4" />,
    },
    {
      type: 'brush',
      label: 'Bút vẽ tự do (Brush)',
      icon: <PenTool className="h-4 w-4" />,
    },
    {
      type: 'simpleAnnotation',
      label: 'Chú thích chữ (Text Note)',
      icon: <Type className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className="
        absolute left-3 top-3 z-30
        flex flex-col items-center
        bg-white/95 dark:bg-gray-900/95
        backdrop-blur-md
        rounded-xl
        border border-gray-200/90 dark:border-gray-800/90
        shadow-xl
        p-1
        space-y-1
        select-none
      "
      role="toolbar"
      aria-label="Công cụ vẽ kỹ thuật TradingView KLineCharts"
    >
      {/* Tool items */}
      {tools.map((t) => {
        const isActive = activeTool === t.type;
        return (
          <button
            key={t.type}
            onClick={() => onSelectTool(t.type)}
            className={`
              relative group p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center
              ${isActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            title={t.label}
            aria-label={t.label}
          >
            {t.icon}
            {/* Tooltip */}
            <span
              className="
                pointer-events-none absolute left-full ml-2 px-2.5 py-1 rounded-md
                bg-slate-900/95 text-white dark:bg-slate-800 dark:text-gray-100
                text-[11px] font-semibold tracking-wide whitespace-nowrap
                shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50
              "
            >
              {t.label}
            </span>
          </button>
        );
      })}

      <div className="w-5 h-[1px] bg-gray-200 dark:bg-gray-800 my-0.5" />

      {/* Clear all drawings */}
      <button
        onClick={onClearAll}
        className="
          relative group p-2 rounded-lg transition-all flex items-center justify-center
          text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer
        "
        title="Xóa tất cả nét vẽ trên biểu đồ"
        aria-label="Xóa tất cả nét vẽ"
      >
        <Eraser className="h-4 w-4" />
        <span
          className="
            pointer-events-none absolute left-full ml-2 px-2.5 py-1 rounded-md
            bg-slate-900/95 text-white dark:bg-slate-800 dark:text-gray-100
            text-[11px] font-semibold tracking-wide whitespace-nowrap
            shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50
          "
        >
          Xóa tất cả nét vẽ
        </span>
      </button>
    </div>
  );
}
