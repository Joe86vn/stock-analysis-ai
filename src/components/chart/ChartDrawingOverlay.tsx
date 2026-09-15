'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import {
  DrawingToolType,
  DrawingItem,
  ChartPoint,
  FIB_RATIOS,
  DRAWING_COLORS,
} from './drawing-types';
import { Trash2, Check, X } from 'lucide-react';

interface ChartDrawingOverlayProps {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<'Candlestick'> | null;
  allBars: { fullDate: string; openPrice: number; closePrice: number }[];
  activeTool: DrawingToolType;
  onFinishDrawing: (tool: DrawingToolType) => void;
  drawings: DrawingItem[];
  setDrawings: React.Dispatch<React.SetStateAction<DrawingItem[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  width: number;
  height: number;
}

export function ChartDrawingOverlay({
  chart,
  candleSeries,
  allBars,
  activeTool,
  onFinishDrawing,
  drawings,
  setDrawings,
  selectedId,
  setSelectedId,
  width,
  height,
}: ChartDrawingOverlayProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drawingDraft, setDrawingDraft] = useState<DrawingItem | null>(null);
  const [, setRevision] = useState(0);

  // Ép render lại khi biểu đồ di chuyển (scroll / pan / zoom)
  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const handleRangeChange = () => {
      setRevision((r) => r + 1);
    };
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
    };
  }, [chart]);

  // Bắt phím Delete / Backspace / Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          setDrawings((prev) => prev.filter((d) => d.id !== selectedId));
          setSelectedId(null);
        }
      } else if (e.key === 'Escape') {
        if (drawingDraft) {
          setDrawingDraft(null);
          onFinishDrawing('cursor');
        } else if (selectedId) {
          setSelectedId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, drawingDraft, onFinishDrawing, setDrawings, setSelectedId]);

  // ─── Chuyển đổi tọa độ ───────────────────────────────────────────────────

  const getChartPoint = useCallback(
    (x: number, y: number): ChartPoint | null => {
      if (!chart || !candleSeries) return null;
      const price = candleSeries.coordinateToPrice(y);
      if (price === null || isNaN(price)) return null;

      let timeStr: string | null = null;
      const time = chart.timeScale().coordinateToTime(x);
      if (time) {
        timeStr =
          typeof time === 'string'
            ? time
            : (time as any).year
            ? `${(time as any).year}-${String((time as any).month).padStart(2, '0')}-${String(
                (time as any).day
              ).padStart(2, '0')}`
            : String(time);
      } else {
        const logical = chart.timeScale().coordinateToLogical(x);
        if (logical !== null && allBars.length > 0) {
          const idx = Math.max(0, Math.min(Math.round(logical), allBars.length - 1));
          timeStr = allBars[idx]?.fullDate ?? allBars[allBars.length - 1].fullDate;
        }
      }

      if (!timeStr) return null;
      return { time: timeStr, price };
    },
    [chart, candleSeries, allBars]
  );

  const pointToPixel = useCallback(
    (point: ChartPoint): { x: number; y: number } | null => {
      if (!chart || !candleSeries) return null;
      const y = candleSeries.priceToCoordinate(point.price);
      if (y === null || isNaN(y)) return null;

      let x = chart.timeScale().timeToCoordinate(point.time as Time);
      if (x === null) {
        const barIdx = allBars.findIndex((b) => b.fullDate === point.time);
        if (barIdx >= 0) {
          x = chart.timeScale().logicalToCoordinate(barIdx as any);
        }
      }

      if (x === null || isNaN(x)) return null;
      return { x, y };
    },
    [chart, candleSeries, allBars]
  );

  // ─── Xử lý thao tác chuột khi vẽ ─────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = getChartPoint(x, y);
    if (!point) return;

    if (activeTool === 'horizontal') {
      const newDrawing: DrawingItem = {
        id: `drawing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'horizontal',
        p1: point,
        color: '#3b82f6',
        lineWidth: 1.5,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setSelectedId(newDrawing.id);
      onFinishDrawing('cursor');
      return;
    }

    if (!drawingDraft) {
      setDrawingDraft({
        id: 'draft',
        type: activeTool,
        p1: point,
        p2: point,
        color:
          activeTool === 'measure'
            ? '#06b6d4'
            : activeTool === 'fibonacci'
            ? '#a855f7'
            : '#3b82f6',
        lineWidth: 1.5,
      });
    } else {
      const finalDrawing: DrawingItem = {
        ...drawingDraft,
        id: `drawing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        p2: point,
      };
      setDrawings((prev) => [...prev, finalDrawing]);
      setDrawingDraft(null);
      setSelectedId(finalDrawing.id);
      onFinishDrawing('cursor');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingDraft || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = getChartPoint(x, y);
    if (point) {
      setDrawingDraft((prev) => (prev ? { ...prev, p2: point } : null));
    }
  };

  const fmt = (n: number) => (n >= 1000 ? n.toLocaleString('vi-VN') : n.toFixed(0));

  // ─── Render từng nét vẽ ──────────────────────────────────────────────────

  const renderDrawing = (d: DrawingItem, isSelected: boolean) => {
    const pt1 = pointToPixel(d.p1);
    if (!pt1) return null;
    const pt2 = d.p2 ? pointToPixel(d.p2) : null;

    const strokeColor = d.color || '#3b82f6';
    const strokeWidth = d.lineWidth || 1.5;

    switch (d.type) {
      case 'horizontal': {
        return (
          <g
            key={d.id}
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(d.id);
            }}
          >
            {/* Invisible thicker line for easy clicking */}
            <line
              x1={0}
              y1={pt1.y}
              x2={width}
              y2={pt1.y}
              stroke="transparent"
              strokeWidth={12}
              pointerEvents="stroke"
            />
            {/* Visible horizontal line */}
            <line
              x1={0}
              y1={pt1.y}
              x2={width}
              y2={pt1.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray="4,4"
            />
            {/* Price badge on the right edge */}
            <g transform={`translate(${Math.max(0, width - 75)}, ${pt1.y - 10})`}>
              <rect
                width={70}
                height={20}
                rx={4}
                fill={strokeColor}
                opacity={0.9}
              />
              <text
                x={35}
                y={14}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={11}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {fmt(d.p1.price)}đ
              </text>
            </g>
            {/* Handle dot if selected */}
            {isSelected && (
              <circle
                cx={Math.min(100, width / 2)}
                cy={pt1.y}
                r={5}
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth={2}
              />
            )}
          </g>
        );
      }

      case 'trendline': {
        if (!pt2) return null;
        return (
          <g
            key={d.id}
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(d.id);
            }}
          >
            {/* Invisible thick line for clicking */}
            <line
              x1={pt1.x}
              y1={pt1.y}
              x2={pt2.x}
              y2={pt2.y}
              stroke="transparent"
              strokeWidth={14}
              pointerEvents="stroke"
            />
            {/* Visible line */}
            <line
              x1={pt1.x}
              y1={pt1.y}
              x2={pt2.x}
              y2={pt2.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Handles if selected */}
            {isSelected && (
              <>
                <circle cx={pt1.x} cy={pt1.y} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                <circle cx={pt2.x} cy={pt2.y} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
              </>
            )}
          </g>
        );
      }

      case 'box': {
        if (!pt2) return null;
        const left = Math.min(pt1.x, pt2.x);
        const top = Math.min(pt1.y, pt2.y);
        const w = Math.abs(pt1.x - pt2.x);
        const h = Math.abs(pt1.y - pt2.y);
        return (
          <g
            key={d.id}
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(d.id);
            }}
          >
            <rect
              x={left}
              y={top}
              width={w}
              height={h}
              fill={strokeColor}
              fillOpacity={0.16}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              pointerEvents="all"
            />
            {isSelected && (
              <>
                <circle cx={left} cy={top} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                <circle cx={left + w} cy={top} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                <circle cx={left} cy={top + h} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                <circle cx={left + w} cy={top + h} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
              </>
            )}
          </g>
        );
      }

      case 'measure': {
        if (!pt2 || !d.p2) return null;
        const left = Math.min(pt1.x, pt2.x);
        const top = Math.min(pt1.y, pt2.y);
        const w = Math.abs(pt1.x - pt2.x);
        const h = Math.abs(pt1.y - pt2.y);

        const diffPrice = d.p2.price - d.p1.price;
        const pct = d.p1.price > 0 ? (diffPrice / d.p1.price) * 100 : 0;
        const isUp = diffPrice >= 0;
        const measureBg = isUp ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        const measureBorder = isUp ? '#22c55e' : '#ef4444';

        const idx1 = allBars.findIndex((b) => b.fullDate === d.p1.time);
        const idx2 = allBars.findIndex((b) => b.fullDate === d.p2?.time);
        const barSpan = idx1 >= 0 && idx2 >= 0 ? Math.abs(idx2 - idx1) + 1 : 0;

        const centerX = (pt1.x + pt2.x) / 2;
        const centerY = (pt1.y + pt2.y) / 2;

        return (
          <g
            key={d.id}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(d.id);
            }}
          >
            {/* Box area */}
            <rect
              x={left}
              y={top}
              width={w}
              height={h}
              fill={measureBg}
              stroke={measureBorder}
              strokeWidth={1}
              strokeDasharray="3,3"
              pointerEvents="all"
            />
            {/* Diagonal line */}
            <line x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y} stroke={measureBorder} strokeWidth={1.5} />
            {/* Info badge at center */}
            <g transform={`translate(${centerX - 70}, ${centerY - 22})`}>
              <rect
                width={140}
                height={44}
                rx={6}
                fill={isUp ? '#14532d' : '#7f1d1d'}
                stroke={measureBorder}
                strokeWidth={1}
                opacity={0.95}
              />
              <text
                x={70}
                y={18}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={11}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {diffPrice >= 0 ? '+' : ''}
                {fmt(diffPrice)}đ ({diffPrice >= 0 ? '+' : ''}
                {pct.toFixed(2)}%)
              </text>
              <text
                x={70}
                y={34}
                textAnchor="middle"
                fill="rgba(255,255,255,0.8)"
                fontSize={10}
                fontFamily="sans-serif"
              >
                {barSpan > 0 ? `${barSpan} phiên` : ''} · {d.p1.time} → {d.p2.time}
              </text>
            </g>
          </g>
        );
      }

      case 'fibonacci': {
        if (!pt2 || !d.p2) return null;
        const xMin = Math.min(pt1.x, pt2.x);
        const xMax = Math.max(width - 50, Math.max(pt1.x, pt2.x) + 100);

        return (
          <g
            key={d.id}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(d.id);
            }}
          >
            {/* Transparent click catcher for the fibonacci area */}
            <rect
              x={xMin}
              y={Math.min(pt1.y, pt2.y)}
              width={xMax - xMin}
              height={Math.abs(pt1.y - pt2.y)}
              fill="transparent"
              pointerEvents="all"
            />
            {/* Main anchor trendline */}
            <line
              x1={pt1.x}
              y1={pt1.y}
              x2={pt2.x}
              y2={pt2.y}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            {/* Fibonacci Levels */}
            {FIB_RATIOS.map((item) => {
              const levelPrice = d.p1.price + item.ratio * (d.p2!.price - d.p1.price);
              const levelY = candleSeries?.priceToCoordinate(levelPrice);
              if (typeof levelY !== 'number' || isNaN(levelY)) return null;

              return (
                <g key={item.ratio}>
                  <line
                    x1={xMin}
                    y1={levelY}
                    x2={xMax}
                    y2={levelY}
                    stroke={item.color}
                    strokeWidth={item.ratio === 0.618 || item.ratio === 0.5 ? 1.5 : 1}
                    opacity={0.85}
                  />
                  <text
                    x={xMin + 5}
                    y={levelY - 3}
                    fill={item.color}
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {item.label} ({fmt(levelPrice)}đ)
                  </text>
                </g>
              );
            })}
            {isSelected && (
              <>
                <circle cx={pt1.x} cy={pt1.y} r={5} fill="#ffffff" stroke="#a855f7" strokeWidth={2} />
                <circle cx={pt2.x} cy={pt2.y} r={5} fill="#ffffff" stroke="#a855f7" strokeWidth={2} />
              </>
            )}
          </g>
        );
      }

      default:
        return null;
    }
  };

  const selectedDrawing = drawings.find((d) => d.id === selectedId);

  return (
    <>
      <svg
        ref={svgRef}
        className={`
          absolute inset-0 z-20 w-full h-full
          ${activeTool !== 'cursor' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}
        `}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onClick={(e) => {
          // Bấm ra vùng trống để hủy chọn
          if (activeTool === 'cursor' && e.target === svgRef.current) {
            setSelectedId(null);
          }
        }}
      >
        {/* Render danh sách nét vẽ đã lưu */}
        {drawings.map((d) => renderDrawing(d, d.id === selectedId))}

        {/* Render nét vẽ đang thao tác (Draft preview) */}
        {drawingDraft && renderDrawing(drawingDraft, false)}
      </svg>

      {/* Floating Action Bar khi chọn nét vẽ */}
      {selectedDrawing && (
        <div
          className="
            absolute top-3 left-1/2 -translate-x-1/2 z-30
            flex items-center space-x-3 px-3 py-1.5
            bg-white/95 dark:bg-gray-900/95
            backdrop-blur-md rounded-xl
            border border-gray-200 dark:border-gray-800
            shadow-xl text-xs font-semibold
          "
        >
          <span className="text-gray-500 dark:text-gray-400 capitalize">
            {selectedDrawing.type === 'trendline'
              ? 'Đường xu hướng'
              : selectedDrawing.type === 'horizontal'
              ? 'Đường ngang'
              : selectedDrawing.type === 'box'
              ? 'Hộp tích lũy'
              : selectedDrawing.type === 'measure'
              ? 'Thước đo giá'
              : 'Fibonacci'}
          </span>

          {/* Color choices */}
          <div className="flex items-center space-x-1.5 border-l border-r border-gray-200 dark:border-gray-800 px-2">
            {DRAWING_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setDrawings((prev) =>
                    prev.map((d) => (d.id === selectedDrawing.id ? { ...d, color: c } : d))
                  );
                }}
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-700 transition transform hover:scale-110 flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: c }}
                title={`Đổi màu ${c}`}
              >
                {selectedDrawing.color === c && <Check className="h-2.5 w-2.5 text-black dark:text-white" />}
              </button>
            ))}
          </div>

          {/* Delete button */}
          <button
            onClick={() => {
              setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawing.id));
              setSelectedId(null);
            }}
            className="flex items-center space-x-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 px-1.5 py-0.5 rounded cursor-pointer"
            title="Xóa nét vẽ (Delete)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Xóa</span>
          </button>

          {/* Close selection */}
          <button
            onClick={() => setSelectedId(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            title="Đóng thanh công cụ"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
