'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RotateCw } from 'lucide-react';

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
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAndParse = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsFetching(true);
      setError(false);
      const res = await fetch(`/api/market-watch/intraday-index?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('upstream');
      const json = await res.json();

      let items: MinutePoint[] = [];

      if (json && Array.isArray(json.c) && Array.isArray(json.t)) {
        // MasTrade format: { c: [...], t: [...], v: [...] }
        items = json.c
          .map((val: number, idx: number) => ({
            close: Number(val),
            time: Number(json.t[idx]),
          }))
          .filter((d: MinutePoint) => d.close > 0);
      } else if (Array.isArray(json)) {
        items = json
          .map((d) => ({
            close: Number(d.close ?? d.price ?? d.value ?? 0),
            time: Number(d.time ?? d.t ?? 0),
          }))
          .filter((d) => d.close > 0);
      } else if (Array.isArray(json?.data)) {
        items = json.data
          .map((d: { close?: number; price?: number; value?: number; time?: number; t?: number }) => ({
            close: Number(d.close ?? d.price ?? d.value ?? 0),
            time: Number(d.time ?? d.t ?? 0),
          }))
          .filter((d: MinutePoint) => d.close > 0);
      }

      if (items.length === 0) {
        setError(true);
        return;
      }

      // Sort points by timestamp ascending
      items.sort((a, b) => a.time - b.time);

      setRefPrice(items[0].close);
      setPoints(items);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchAndParse();

    // Auto poll every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAndParse();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAndParse]);

  const currentPoint = useMemo(() => {
    if (points.length === 0) return null;
    if (hoverIdx !== null && points[hoverIdx]) return points[hoverIdx];
    return points[points.length - 1];
  }, [points, hoverIdx]);

  const currentPrice = currentPoint?.close ?? null;
  const startingPrice = refPrice ?? (points[0]?.close ?? null);

  const changeDiff =
    startingPrice !== null && currentPrice !== null
      ? currentPrice - startingPrice
      : null;

  const changePercent =
    startingPrice && currentPrice !== null
      ? ((currentPrice - startingPrice) / startingPrice) * 100
      : null;

  const isUp = changePercent !== null && changePercent > 0;
  const isDown = changePercent !== null && changePercent < 0;

  const dateStr = useMemo(() => {
    if (points.length === 0) return '';
    const ts = points[points.length - 1].time;
    const d = new Date(ts < 1e12 ? ts * 1000 : ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }, [points]);

  // SVG Chart Geometry
  const svgWidth = 360;
  const svgHeight = 110;
  const padding = 6;

  // Time-to-X Coordinate Mapping (09:00 = 0% -> 15:00 = 100%)
  const getXForTime = useCallback((ts: number) => {
    const d = new Date(ts < 1e12 ? ts * 1000 : ts);
    const h = d.getHours();
    const m = d.getMinutes();
    const minsFromMidnight = h * 60 + m;
    const startMins = 9 * 60; // 09:00 AM = 540
    const endMins = 15 * 60; // 15:00 PM = 900
    const totalSpan = endMins - startMins; // 360 mins

    const ratio = Math.max(0, Math.min(1, (minsFromMidnight - startMins) / totalSpan));
    return padding + ratio * (svgWidth - padding * 2);
  }, [padding, svgWidth]);

  const { lineSegments, areaPath, refY, minP, maxP, pointCoords } = useMemo(() => {
    if (points.length < 1 || startingPrice === null) {
      return { lineSegments: [], areaPath: '', refY: svgHeight / 2, minP: 0, maxP: 0, pointCoords: [] };
    }

    const prices = points.map((p) => p.close);
    const minVal = Math.min(...prices, startingPrice);
    const maxVal = Math.max(...prices, startingPrice);
    const diff = Math.max(maxVal - minVal, 0.5);

    const getY = (p: number) => {
      const ratio = (p - minVal) / diff;
      return svgHeight - padding - ratio * (svgHeight - padding * 2);
    };

    const referenceY = getY(startingPrice);

    // Calculate (X, Y) for each point based on exact timestamp
    const coords = points.map((p) => ({
      x: getXForTime(p.time),
      y: getY(p.close),
      close: p.close,
      time: p.time,
    }));

    if (coords.length < 2) {
      return { lineSegments: [], areaPath: '', refY: referenceY, minP: minVal, maxP: maxVal, pointCoords: coords };
    }

    // Build line segments with color splitting at reference price
    const segments: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i].close;
      const p2 = coords[i + 1].close;
      const x1 = coords[i].x;
      const x2 = coords[i + 1].x;
      const y1 = coords[i].y;
      const y2 = coords[i + 1].y;

      const isP1Above = p1 >= startingPrice;
      const isP2Above = p2 >= startingPrice;

      if (isP1Above === isP2Above) {
        segments.push({
          x1,
          y1,
          x2,
          y2,
          color: isP1Above ? '#22c55e' : '#ef4444',
        });
      } else {
        const fraction = (startingPrice - p1) / (p2 - p1);
        const xCross = x1 + fraction * (x2 - x1);
        const yCross = referenceY;

        segments.push({
          x1,
          y1,
          x2: xCross,
          y2: yCross,
          color: isP1Above ? '#22c55e' : '#ef4444',
        });
        segments.push({
          x1: xCross,
          y1: yCross,
          x2,
          y2,
          color: isP2Above ? '#22c55e' : '#ef4444',
        });
      }
    }

    // Area path covering exactly the time range of points
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const ptsStr = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ');
    const lineP = `M ${ptsStr}`;
    const fullArea = `${lineP} L ${lastX.toFixed(1)},${svgHeight} L ${firstX.toFixed(1)},${svgHeight} Z`;

    return {
      lineSegments: segments,
      areaPath: fullArea,
      refY: referenceY,
      minP: minVal,
      maxP: maxVal,
      pointCoords: coords,
    };
  }, [points, startingPrice, getXForTime, svgHeight, padding, svgWidth]);

  // Handle SVG Mouse move for smooth hover lookup
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pointCoords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgMouseX = (mouseX / rect.width) * svgWidth;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < pointCoords.length; i++) {
      const diff = Math.abs(pointCoords[i].x - svgMouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIdx(closestIdx);
  };

  return (
    <div className="w-full font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div className="flex items-center gap-1.5">
          {isUp && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          {isDown && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          {!isUp && !isDown && <Minus className="w-3.5 h-3.5 text-gray-400" />}
          <span className="text-xs font-bold text-gray-800 dark:text-gray-100">VNINDEX</span>
          <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold">
          {currentPrice !== null && (
            <span className="text-gray-900 dark:text-gray-100">{currentPrice.toFixed(2)}</span>
          )}
          {changeDiff !== null && changePercent !== null && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                isUp
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : isDown
                  ? 'bg-red-500/15 text-red-500'
                  : 'text-gray-400'
              }`}
            >
              {isUp ? '+' : ''}{changeDiff.toFixed(2)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          )}
          <button
            onClick={() => fetchAndParse(true)}
            title="Cập nhật dữ liệu realtime"
            className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <RotateCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-header Date & Time */}
      <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1 px-0.5">
        <div className="flex items-center gap-1.5">
          {dateStr && <span className="font-semibold text-gray-400">{dateStr}</span>}
          <span>•</span>
          <span>{currentPoint ? formatTime(currentPoint.time) : ''}</span>
          {lastUpdated && (
            <span className="text-[9px] text-gray-500 font-mono">
              ({lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
            </span>
          )}
        </div>
        {hoverIdx !== null && points[hoverIdx] && (
          <span className="text-violet-400 font-semibold font-mono">
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
        <>
          <div className="relative w-full h-[110px] bg-gray-50/50 dark:bg-black/20 rounded-lg p-1 border border-gray-100 dark:border-gray-800/60 overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                {/* Clip path above reference line (Green zone) */}
                <clipPath id="aboveRefClip">
                  <rect x="0" y="0" width={svgWidth} height={Math.max(refY, 0)} />
                </clipPath>

                {/* Clip path below reference line (Red zone) */}
                <clipPath id="belowRefClip">
                  <rect x="0" y={Math.max(refY, 0)} width={svgWidth} height={Math.max(svgHeight - refY, 0)} />
                </clipPath>

                <linearGradient id="intradayGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                </linearGradient>

                <linearGradient id="intradayGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {/* Reference Price Dotted Line */}
              <line
                x1="0"
                y1={refY}
                x2={svgWidth}
                y2={refY}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Green Area Fill (clipped above refY) */}
              <g clipPath="url(#aboveRefClip)">
                <path d={areaPath} fill="url(#intradayGradGreen)" />
              </g>

              {/* Red Area Fill (clipped below refY) */}
              <g clipPath="url(#belowRefClip)">
                <path d={areaPath} fill="url(#intradayGradRed)" />
              </g>

              {/* Multi-color Line Segments (Green above ref, Red below ref) */}
              {lineSegments.map((seg, i) => (
                <line
                  key={i}
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke={seg.color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ))}

              {/* Hover Cursor Line & Active Point Dot */}
              {hoverIdx !== null && pointCoords[hoverIdx] && (
                <g>
                  <line
                    x1={pointCoords[hoverIdx].x}
                    y1="0"
                    x2={pointCoords[hoverIdx].x}
                    y2={svgHeight}
                    stroke="rgba(255,255,255,0.3)"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={pointCoords[hoverIdx].x}
                    cy={pointCoords[hoverIdx].y}
                    r="3.5"
                    fill={pointCoords[hoverIdx].close >= (startingPrice ?? pointCoords[hoverIdx].close) ? '#22c55e' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* Latest Point Dot when not hovering */}
              {hoverIdx === null && pointCoords.length > 0 && (
                <circle
                  cx={pointCoords[pointCoords.length - 1].x}
                  cy={pointCoords[pointCoords.length - 1].y}
                  r="3.5"
                  fill={
                    pointCoords[pointCoords.length - 1].close >= (startingPrice ?? pointCoords[pointCoords.length - 1].close)
                      ? '#22c55e'
                      : '#ef4444'
                  }
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>

          {/* Bottom Time Axis (9g -> 11g30 -> 13g -> 15g) aligned precisely with time percentage */}
          <div className="relative w-full h-4 text-[9.5px] text-gray-400 font-sans font-medium mt-1 border-t border-gray-100 dark:border-gray-800/60 pt-0.5 select-none">
            <span className="absolute left-0">9g</span>
            <span className="absolute left-[41.67%] -translate-x-1/2">11g30</span>
            <span className="absolute left-[66.67%] -translate-x-1/2">13g</span>
            <span className="absolute right-0">15g</span>
          </div>
        </>
      )}
    </div>
  );
};

