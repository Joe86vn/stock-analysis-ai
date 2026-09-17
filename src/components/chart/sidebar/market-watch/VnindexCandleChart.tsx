'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface RawHistoryItem {
  tradingDate?: string;
  date?: string;
  time?: string;
  openIndex?: number;
  open?: number;
  highestIndex?: number;
  high?: number;
  lowestIndex?: number;
  low?: number;
  closeIndex?: number;
  close?: number;
  totalVolume?: number;
  totalMatchVolume?: number;
  volume?: number;
}

export interface CandleDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  pctChange: number;
  isDistribution: boolean;
  isDistribActive: boolean;
  isFTD: boolean;
  isRallyDay1: boolean;
  ma20Price: number;
  ma20Vol: number;
}

const formatVol = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
};

const calcMA = (arr: number[], period: number): number[] => {
  return arr.map((_, i) => {
    if (i < period - 1) return NaN;
    const slice = arr.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
};

export const VnindexCandleChart: React.FC = () => {
  const [candles, setCandles] = useState<CandleDataPoint[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [hasFtd, setHasFtd] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch('/api/market-watch/vnindex-history?index=VNINDEX&page=0&size=90');
        if (!res.ok) throw new Error('upstream');
        const json = await res.json();

        const raw: RawHistoryItem[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.content)
          ? json.data.content
          : [];

        if (raw.length < 5) {
          setError(true);
          return;
        }

        // Normalize and sort ascending by date
        const sorted = raw
          .map((d) => ({
            date: String(d.tradingDate ?? d.date ?? d.time ?? ''),
            open: Number(d.openIndex ?? d.open ?? d.closeIndex ?? d.close ?? 0),
            high: Number(d.highestIndex ?? d.high ?? d.closeIndex ?? d.close ?? 0),
            low: Number(d.lowestIndex ?? d.low ?? d.closeIndex ?? d.close ?? 0),
            close: Number(d.closeIndex ?? d.close ?? 0),
            volume: Number(d.totalMatchVolume ?? d.totalVolume ?? d.volume ?? 0),
          }))
          .filter((d) => d.close > 0 && d.date !== '')
          .sort((a, b) => a.date.localeCompare(b.date));

        if (sorted.length < 5) {
          setError(true);
          return;
        }

        // Calculate MA20 Price & MA20 Volume
        const closes = sorted.map((d) => d.close);
        const vols = sorted.map((d) => d.volume);
        const ma20PriceArr = calcMA(closes, 20);
        const ma20VolArr = calcMA(vols, 20);

        // CANSLIM FTD Rule: Day 4 to Day 10 of Rally Attempt ONLY.
        // Identify Day 1 of Rally Attempt (Đáy ngày nỗ lực phục hồi đầu tiên)
        let rallyStartLow = Infinity;
        let rallyDayCount = 0;
        let inConfirmedUptrend = false;
        const ftdSet = new Set<number>();
        const rallyDay1Set = new Set<number>();

        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          const pct = (curr.close - prev.close) / prev.close;

          if (inConfirmedUptrend) {
            if (curr.close < prev.close * 0.95) {
              inConfirmedUptrend = false;
              rallyDayCount = 0;
              rallyStartLow = Infinity;
            }
          } else {
            if (rallyDayCount === 0) {
              if (pct > 0) {
                rallyDayCount = 1;
                rallyStartLow = prev.low;
                rallyDay1Set.add(i); // Flag Day 1 of Rally Attempt
              }
            } else {
              if (curr.low < rallyStartLow) {
                if (pct > 0) {
                  rallyDayCount = 1;
                  rallyStartLow = prev.low;
                  rallyDay1Set.add(i); // New Rally Attempt Day 1
                } else {
                  rallyDayCount = 0;
                  rallyStartLow = Infinity;
                }
              } else {
                rallyDayCount++;
                // FTD Rule: Day 4 to Day 10 of rally attempt, gain > 1.25%, volume > prev volume
                if (rallyDayCount >= 4 && rallyDayCount <= 10 && pct > 0.0125 && curr.volume > prev.volume) {
                  ftdSet.add(i);
                  inConfirmedUptrend = true;
                }
              }
            }
          }
        }

        // Identify Distribution Days according to CANSLIM rules
        const latestIdx = sorted.length - 1;
        const latestClose = sorted[latestIdx].close;
        const distribRecords: { idx: number; close: number }[] = [];

        const points: CandleDataPoint[] = sorted.map((curr, i) => {
          let pctChange = 0;
          let isDistribution = false;

          if (i > 0) {
            const prev = sorted[i - 1];
            pctChange = (curr.close - prev.close) / prev.close;
            if (pctChange <= -0.002 && curr.volume > prev.volume) {
              isDistribution = true;
              distribRecords.push({ idx: i, close: curr.close });
            }
          }

          return {
            ...curr,
            pctChange,
            isDistribution,
            isDistribActive: false,
            isFTD: ftdSet.has(i),
            isRallyDay1: rallyDay1Set.has(i),
            ma20Price: ma20PriceArr[i],
            ma20Vol: ma20VolArr[i],
          };
        });

        // Filter active distribution days
        let activeCounter = 0;
        distribRecords.forEach((rec) => {
          const age = latestIdx - rec.idx;
          const isWithin25 = age <= 25;
          const isRallied5Pct = latestClose >= rec.close * 1.05;

          if (isWithin25 && !isRallied5Pct) {
            activeCounter++;
            points[rec.idx].isDistribActive = true;
          }
        });

        // Take last 45 sessions for optimal chart view in sidebar
        const displayCandles = points.slice(-45);
        setCandles(displayCandles);
        setActiveCount(activeCounter);
        setHasFtd(displayCandles.some((c) => c.isFTD));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeCandle = useMemo(() => {
    if (candles.length === 0) return null;
    if (hoveredIdx !== null && candles[hoveredIdx]) return candles[hoveredIdx];
    return candles[candles.length - 1];
  }, [candles, hoveredIdx]);

  if (loading) {
    return <div className="h-[185px] flex items-center justify-center text-xs text-gray-400">Đang tải nến VNINDEX...</div>;
  }

  if (error || candles.length === 0) {
    return <div className="h-[185px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu nến VNINDEX</div>;
  }

  // Calculate SVG bounds
  const minLow = Math.min(...candles.map((c) => c.low));
  const maxHigh = Math.max(...candles.map((c) => c.high));
  const maxVol = Math.max(...candles.map((c) => c.volume));
  const priceRange = Math.max(maxHigh - minLow, 1);

  // SVG Dimension Specs
  const svgWidth = 360;
  const svgHeight = 185;
  const candleAreaHeight = 125;
  const volumeAreaHeight = 45;
  const candleWidth = Math.max((svgWidth - 10) / candles.length - 2, 3);

  const getPriceY = (price: number) => {
    const ratio = (price - minLow) / priceRange;
    return candleAreaHeight - ratio * (candleAreaHeight - 22) + 5;
  };

  const getVolY = (vol: number) => {
    const ratio = vol / (maxVol || 1);
    return svgHeight - ratio * (volumeAreaHeight - 5);
  };

  // Generate SVG Path for MA20 Price (Amber) & MA20 Volume (Cyan)
  const ma20PricePts = candles
    .map((c, i) => {
      if (isNaN(c.ma20Price) || c.ma20Price === undefined) return null;
      const x = (i / candles.length) * (svgWidth - 10) + 5 + candleWidth / 2;
      const y = getPriceY(c.ma20Price);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean);
  const ma20PricePath = ma20PricePts.length > 1 ? `M ${ma20PricePts.join(' L ')}` : '';

  const ma20VolPts = candles
    .map((c, i) => {
      if (isNaN(c.ma20Vol) || c.ma20Vol === undefined) return null;
      const x = (i / candles.length) * (svgWidth - 10) + 5 + candleWidth / 2;
      const y = getVolY(c.ma20Vol);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean);
  const ma20VolPath = ma20VolPts.length > 1 ? `M ${ma20VolPts.join(' L ')}` : '';

  return (
    <div className="w-full font-sans select-none">
      {/* Top Stats Bar */}
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
            {activeCandle ? activeCandle.close.toFixed(2) : '—'}
          </span>
          {activeCandle && (
            <span
              className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                activeCandle.pctChange > 0
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : activeCandle.pctChange < 0
                  ? 'bg-red-500/15 text-red-500'
                  : 'bg-gray-500/15 text-gray-400'
              }`}
            >
              {activeCandle.pctChange > 0 ? '+' : ''}
              {(activeCandle.pctChange * 100).toFixed(2)}%
            </span>
          )}
        </div>

        {/* CANSLIM Distribution & FTD Badges */}
        <div className="flex items-center gap-1.5">
          {hasFtd && (
            <span
              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5"
              title="Phát hiện phiên Bùng nổ theo đà FTD (Phiên 4–10)"
            >
              <Zap className="w-2.5 h-2.5 fill-emerald-400" />
              FTD
            </span>
          )}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              activeCount >= 6
                ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                : activeCount >= 4
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
            }`}
            title="Số phiên phân phối CANSLIM còn hiệu lực (trong 25 phiên & chưa hồi >5%)"
          >
            {activeCount >= 4 ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            Phân phối: {activeCount} phiên
          </span>
        </div>
      </div>

      {/* Date & Hover Details Header */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1 px-0.5">
        <span>{activeCandle ? activeCandle.date : ''}</span>
        {activeCandle && (
          <div className="flex gap-2 text-[9px]">
            <span>O: <strong className="text-gray-600 dark:text-gray-300">{activeCandle.open.toFixed(1)}</strong></span>
            <span>H: <strong className="text-gray-600 dark:text-gray-300">{activeCandle.high.toFixed(1)}</strong></span>
            <span>L: <strong className="text-gray-600 dark:text-gray-300">{activeCandle.low.toFixed(1)}</strong></span>
            <span>Vol: <strong className="text-gray-600 dark:text-gray-300">{formatVol(activeCandle.volume)}</strong></span>
          </div>
        )}
      </div>

      {/* SVG Candle + Volume Chart */}
      <div className="relative w-full h-[185px] bg-gray-50/50 dark:bg-black/20 rounded-lg p-1 border border-gray-100 dark:border-gray-800/60 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Horizontal Grid lines */}
          <line x1="0" y1={candleAreaHeight * 0.25} x2={svgWidth} y2={candleAreaHeight * 0.25} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="0" y1={candleAreaHeight * 0.5} x2={svgWidth} y2={candleAreaHeight * 0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="0" y1={candleAreaHeight * 0.75} x2={svgWidth} y2={candleAreaHeight * 0.75} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="0" y1={candleAreaHeight + 5} x2={svgWidth} y2={candleAreaHeight + 5} stroke="rgba(255,255,255,0.1)" />

          {/* Render Candles & Volume Bars */}
          {candles.map((c, i) => {
            const x = (i / candles.length) * (svgWidth - 10) + 5;
            const isGreen = c.close >= c.open;
            const strokeColor = isGreen ? '#22c55e' : '#ef4444';
            const fillColor = isGreen ? '#22c55e' : '#ef4444';

            const yHigh = getPriceY(c.high);
            const yLow = getPriceY(c.low);
            const yOpen = getPriceY(c.open);
            const yClose = getPriceY(c.close);

            const bodyY = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);

            const volY = getVolY(c.volume);
            const volHeight = Math.max(svgHeight - volY, 1);

            return (
              <g
                key={c.date}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIdx(i)}
              >
                {/* Candle Wick */}
                <line
                  x1={x + candleWidth / 2}
                  y1={yHigh}
                  x2={x + candleWidth / 2}
                  y2={yLow}
                  stroke={strokeColor}
                  strokeWidth="1"
                />

                {/* Candle Body */}
                <rect
                  x={x}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={fillColor}
                  rx="0.5"
                />

                {/* Volume Bar */}
                <rect
                  x={x}
                  y={volY}
                  width={candleWidth}
                  height={volHeight}
                  fill={fillColor}
                  opacity={hoveredIdx === i ? '0.7' : '0.35'}
                />

                {/* CANSLIM Distribution Marker Badge (🔴 D) */}
                {c.isDistribution && (
                  <g>
                    <line
                      x1={x + candleWidth / 2}
                      y1={yHigh - 2}
                      x2={x + candleWidth / 2}
                      y2={yHigh - 10}
                      stroke={c.isDistribActive ? '#ef4444' : '#9ca3af'}
                      strokeWidth="1"
                      strokeDasharray={c.isDistribActive ? 'none' : '1 1'}
                    />
                    <circle
                      cx={x + candleWidth / 2}
                      cy={yHigh - 13}
                      r="5.5"
                      fill={c.isDistribActive ? '#ef4444' : '#6b7280'}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                    <text
                      x={x + candleWidth / 2}
                      y={yHigh - 10.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7"
                      fontWeight="bold"
                    >
                      D
                    </text>
                  </g>
                )}

                {/* CANSLIM FTD Marker Badge (🟢 FTD - Phiên 4-10) */}
                {c.isFTD && (
                  <g>
                    <line
                      x1={x + candleWidth / 2}
                      y1={yLow + 2}
                      x2={x + candleWidth / 2}
                      y2={yLow + 9}
                      stroke="#22c55e"
                      strokeWidth="1"
                    />
                    <rect
                      x={x + candleWidth / 2 - 11}
                      y={yLow + 9}
                      width="22"
                      height="9"
                      rx="2"
                      fill="#22c55e"
                    />
                    <text
                      x={x + candleWidth / 2}
                      y={yLow + 16}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="6.5"
                      fontWeight="black"
                    >
                      FTD
                    </text>
                  </g>
                )}

                {/* Day 1 Rally Attempt Marker Badge (🔵 Đáy 1) */}
                {c.isRallyDay1 && !c.isFTD && (
                  <g>
                    <line
                      x1={x + candleWidth / 2}
                      y1={yLow + 2}
                      x2={x + candleWidth / 2}
                      y2={yLow + 9}
                      stroke="#3b82f6"
                      strokeWidth="1"
                      strokeDasharray="1 1"
                    />
                    <rect
                      x={x + candleWidth / 2 - 12}
                      y={yLow + 9}
                      width="24"
                      height="9"
                      rx="2"
                      fill="#3b82f6"
                    />
                    <text
                      x={x + candleWidth / 2}
                      y={yLow + 16}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="6"
                      fontWeight="bold"
                    >
                      Đáy 1
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* MA20 Price Line Overlay (Amber Line) */}
          {ma20PricePath && (
            <path
              d={ma20PricePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          )}

          {/* MA20 Volume Line Overlay (Cyan Dotted Line) */}
          {ma20VolPath && (
            <path
              d={ma20VolPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Legend Footnote */}
        <div className="absolute bottom-1 right-2 flex items-center gap-2 text-[8px] text-gray-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            <strong className="text-gray-200">D</strong>: Phân phối
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <strong className="text-emerald-400">FTD</strong>: Bùng nổ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            <strong className="text-blue-400">Đáy 1</strong>: Phục hồi
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500 inline-block" />
            <strong className="text-amber-400">MA20 Price</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-cyan-400 inline-block" />
            <strong className="text-cyan-400">MA20 Vol</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
