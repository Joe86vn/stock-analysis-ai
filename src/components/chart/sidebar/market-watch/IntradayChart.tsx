'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MinutePoint {
  time: number; // timestamp in seconds or ms
  close: number;
}

const formatTime = (ts: number) => {
  const d = new Date(ts < 1e12 ? ts * 1000 : ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const IntradayChart: React.FC = () => {
  const [points, setPoints] = useState<MinutePoint[]>([]);
  const [refPrice, setRefPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchAndParse = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch('/api/market-watch/intraday-index');
        if (!res.ok) throw new Error('upstream');
        const json = await res.json();

        let items: MinutePoint[] = [];

        if (json && Array.isArray(json.c) && Array.isArray(json.t)) {
          // MasTrade format: { c: [...], t: [...], v: [...] }
          items = json.c.map((val: number, idx: number) => ({
            close: Number(val),
            time: Number(json.t[idx]),
          })).filter((d: MinutePoint) => d.close > 0);
        } else if (Array.isArray(json)) {
          items = json.map((d) => ({
            close: Number(d.close ?? d.price ?? d.value ?? 0),
            time: Number(d.time ?? d.t ?? 0),
          })).filter((d) => d.close > 0);
        } else if (Array.isArray(json?.data)) {
          items = json.data.map((d: { close?: number; price?: number; value?: number; time?: number; t?: number }) => ({
            close: Number(d.close ?? d.price ?? d.value ?? 0),
            time: Number(d.time ?? d.t ?? 0),
          })).filter((d: MinutePoint) => d.close > 0);
        }

        if (items.length === 0) {
          setError(true);
          return;
        }

        setRefPrice(items[0].close);
        setPoints(items);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAndParse();
  }, []);

  const currentPoint = useMemo(() => {
    if (points.length === 0) return null;
    if (hoverIdx !== null && points[hoverIdx]) return points[hoverIdx];
    return points[points.length - 1];
  }, [points, hoverIdx]);

  const currentPrice = currentPoint?.close ?? null;
  const startingPrice = refPrice ?? (points[0]?.close ?? null);

  const changePercent =
    startingPrice && currentPrice !== null
      ? ((currentPrice - startingPrice) / startingPrice) * 100
      : null;

  const isUp = changePercent !== null && changePercent > 0;
  const isDown = changePercent !== null && changePercent < 0;

  // SVG Chart Geometry
  const svgWidth = 360;
  const svgHeight = 110;
  const padding = 6;

  const { linePath, areaPath, refY, minP, maxP } = useMemo(() => {
    if (points.length < 2) return { linePath: '', areaPath: '', refY: svgHeight / 2, minP: 0, maxP: 0 };

    const prices = points.map((p) => p.close);
    const minVal = Math.min(...prices, startingPrice ?? prices[0]);
    const maxVal = Math.max(...prices, startingPrice ?? prices[0]);
    const diff = Math.max(maxVal - minVal, 1);

    const getY = (p: number) => {
      const ratio = (p - minVal) / diff;
      return svgHeight - padding - ratio * (svgHeight - padding * 2);
    };

    const getX = (idx: number) => {
      return (idx / (points.length - 1)) * (svgWidth - padding * 2) + padding;
    };

    const pts = points.map((p, i) => `${getX(i).toFixed(1)},${getY(p.close).toFixed(1)}`);
    const lineP = `M ${pts.join(' L ')}`;
    const areaP = `${lineP} L ${getX(points.length - 1)},${svgHeight} L ${getX(0)},${svgHeight} Z`;
    const referenceY = getY(startingPrice ?? prices[0]);

    return { linePath: lineP, areaPath: areaP, refY: referenceY, minP: minVal, maxP: maxVal };
  }, [points, startingPrice]);

  const strokeColor = isUp ? '#22c55e' : isDown ? '#ef4444' : '#6366f1';
  const gradId = isUp ? 'intradayGradGreen' : isDown ? 'intradayGradRed' : 'intradayGradBlue';

  return (
    <div className="w-full font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div className="flex items-center gap-1.5">
          {isUp && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          {isDown && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          {!isUp && !isDown && <Minus className="w-3.5 h-3.5 text-gray-400" />}
          <span className="text-xs font-bold text-gray-800 dark:text-gray-100">VNINDEX</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          {currentPrice !== null && (
            <span className="text-gray-900 dark:text-gray-100">{currentPrice.toFixed(2)}</span>
          )}
          {changePercent !== null && (
            <span className={`px-1 py-0.5 rounded text-[10px] ${isUp ? 'bg-emerald-500/15 text-emerald-500' : isDown ? 'bg-red-500/15 text-red-500' : 'text-gray-400'}`}>
              {isUp ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Sub-header Time */}
      <div className="flex justify-between items-center text-[9px] text-gray-400 mb-1 px-0.5">
        <span>{currentPoint ? formatTime(currentPoint.time) : ''}</span>
        {hoverIdx !== null && (
          <span className="text-violet-400 font-semibold">
            {formatTime(points[hoverIdx].time)}: {points[hoverIdx].close.toFixed(2)}
          </span>
        )}
      </div>

      {/* Chart container */}
      {loading && (
        <div className="h-[110px] flex items-center justify-center text-xs text-gray-400">
          Đang tải dữ liệu Intraday...
        </div>
      )}

      {error && !loading && (
        <div className="h-[110px] flex items-center justify-center text-xs text-gray-400">
          Không có dữ liệu Intraday
        </div>
      )}

      {!loading && !error && points.length > 0 && (
        <div className="relative w-full h-[110px] bg-gray-50/50 dark:bg-black/20 rounded-lg p-1 border border-gray-100 dark:border-gray-800/60 overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="intradayGradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="intradayGradRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="intradayGradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Reference Price Dotted Line */}
            <line
              x1="0"
              y1={refY}
              x2={svgWidth}
              y2={refY}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Area Fill */}
            <path d={areaPath} fill={`url(#${gradId})`} />

            {/* Price Line */}
            <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Hover Points Capture */}
            {points.map((p, i) => {
              const x = (i / (points.length - 1)) * (svgWidth - padding * 2) + padding;
              const ratio = (p.close - minP) / Math.max(maxP - minP, 1);
              const y = svgHeight - padding - ratio * (svgHeight - padding * 2);
              const isHovered = hoverIdx === i;

              return (
                <g key={i} onMouseEnter={() => setHoverIdx(i)} className="cursor-pointer">
                  {/* Invisible hit box */}
                  <rect x={x - 2} y="0" width="4" height={svgHeight} fill="transparent" />
                  {isHovered && (
                    <>
                      <line x1={x} y1="0" x2={x} y2={svgHeight} stroke="rgba(255,255,255,0.3)" strokeDasharray="2 2" />
                      <circle cx={x} cy={y} r="3.5" fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};
