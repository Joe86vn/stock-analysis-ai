'use client';

import React from 'react';
import {
  MousePointer,
  TrendingUp,
  Minus,
  Square,
  Ruler,
  SlidersHorizontal,
  Trash2,
  Eraser,
} from 'lucide-react';
import { DrawingToolType } from './drawing-types';

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  selectedDrawingId: string | null;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  totalDrawings: number;
}

export function DrawingToolbar({
  activeTool,
  onSelectTool,
  selectedDrawingId,
  onDeleteSelected,
  onClearAll,
  totalDrawings,
}: DrawingToolbarProps) {
  const tools: { type: DrawingToolType; label: string; icon: React.ReactNode; shortcut?: string }[] = [
    {
      type: 'cursor',
      label: 'Con trỏ / Di chuyển biểu đồ',
      icon: <MousePointer className="h-4 w-4" />,
    },
    {
      type: 'trendline',
      label: 'Đường xu hướng (Trendline)',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      type: 'horizontal',
      label: 'Đường ngang Hỗ trợ / Kháng cự',
      icon: <Minus className="h-4 w-4" />,
    },
    {
      type: 'box',
      label: 'Vùng hộp tích lũy (Box)',
      icon: <Square className="h-4 w-4" />,
    },
    {
      type: 'measure',
      label: 'Thước đo giá & % (Measure)',
      icon: <Ruler className="h-4 w-4" />,
    },
    {
      type: 'fibonacci',
      label: 'Fibonacci Thoái lui (Fib Retracement)',
      icon: <SlidersHorizontal className="h-4 w-4" />,
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
      aria-label="Công cụ vẽ kỹ thuật TradingView"
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

      {/* Delete selected drawing button */}
      <button
        onClick={onDeleteSelected}
        disabled={!selectedDrawingId}
        className={`
          relative group p-2 rounded-lg transition-all flex items-center justify-center
          ${selectedDrawingId
            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer'
            : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
          }
        `}
        title="Xóa nét vẽ đang chọn (Delete)"
        aria-label="Xóa nét vẽ đang chọn"
      >
        <Trash2 className="h-4 w-4" />
        <span
          className="
            pointer-events-none absolute left-full ml-2 px-2.5 py-1 rounded-md
            bg-slate-900/95 text-white dark:bg-slate-800 dark:text-gray-100
            text-[11px] font-semibold tracking-wide whitespace-nowrap
            shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50
          "
        >
          Xóa nét vẽ đã chọn
        </span>
      </button>

      {/* Clear all drawings for this ticker */}
      <button
        onClick={onClearAll}
        disabled={totalDrawings === 0}
        className={`
          relative group p-2 rounded-lg transition-all flex items-center justify-center
          ${totalDrawings > 0
            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer'
            : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
          }
        `}
        title={`Xóa tất cả (${totalDrawings}) nét vẽ của mã này`}
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
          Xóa tất cả nét vẽ ({totalDrawings})
        </span>
      </button>
    </div>
  );
}
