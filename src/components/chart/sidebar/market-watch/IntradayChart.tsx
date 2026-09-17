'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { init, dispose, CandleType } from 'klinecharts';

interface MinutePoint {
  time: number;   // timestamp ms or seconds
  close?: number;
  price?: number;
  value?: number;
}

export const IntradayChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [referencePrice, setReferencePrice] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let chart: ReturnType<typeof init> | null = null;

    const fetchAndRender = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/market-watch/intraday-index');
        if (!res.ok) throw new Error('upstream');
        const json = await res.json();

        // Normalize data — handle different response shapes
        let rawItems: MinutePoint[] = [];

        if (json && Array.isArray(json.c) && Array.isArray(json.t)) {
          // MasTrade format: { c: [...], t: [...], v: [...] }
          rawItems = json.c.map((val: number, idx: number) => ({
            close: val,
            price: val,
            time: json.t[idx],
          }));
        } else if (Array.isArray(json)) {
          rawItems = json;
        } else if (Array.isArray(json?.data)) {
          rawItems = json.data;
        }

        if (rawItems.length === 0) {
          setError(true);
          return;
        }

        const prices = rawItems.map((d) => d.close ?? d.price ?? d.value ?? 0);
        setReferencePrice(prices[0]);
        setCurrentPrice(prices[prices.length - 1]);

        if (!containerRef.current) return;

        chart = init(containerRef.current, {
          styles: {
            candle: {
              type: CandleType.Area,
              area: {
                lineSize: 1.5,
                lineColor: '#6366f1',
                backgroundColor: [
                  { offset: 0, color: 'rgba(99,102,241,0.18)' },
                  { offset: 1, color: 'rgba(99,102,241,0)' },
                ],
              },
            },
            xAxis: { show: false },
            yAxis: { show: false },
            grid: { show: false },
            crosshair: { show: false },
          },
        });

        const klineData = rawItems.map((d) => {
          const p = d.close ?? d.price ?? d.value ?? 0;
          const t = typeof d.time === 'number' && d.time < 1e12 ? d.time * 1000 : d.time;
          return { timestamp: t, open: p, high: p, low: p, close: p, volume: 0 };
        });

        chart?.applyNewData(klineData);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAndRender();

    return () => {
      if (chart && containerRef.current) {
        dispose(containerRef.current);
      }
    };
  }, []);

  const changePercent =
    referencePrice && currentPrice
      ? ((currentPrice - referencePrice) / referencePrice) * 100
      : null;
  const isUp = changePercent !== null && changePercent > 0;
  const isDown = changePercent !== null && changePercent < 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          {isUp && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          {isDown && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          {!isUp && !isDown && <Minus className="w-3.5 h-3.5 text-gray-400" />}
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">VNINDEX</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          {currentPrice !== null && (
            <span className="text-gray-800 dark:text-gray-100">{currentPrice.toFixed(2)}</span>
          )}
          {changePercent !== null && (
            <span className={isUp ? 'text-emerald-500' : isDown ? 'text-red-500' : 'text-gray-400'}>
              {isUp ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Chart container */}
      {loading && (
        <div className="h-[130px] flex items-center justify-center text-xs text-gray-400">
          Đang tải...
        </div>
      )}
      {error && !loading && (
        <div className="h-[130px] flex items-center justify-center text-xs text-gray-400">
          Không có dữ liệu
        </div>
      )}
      <div
        ref={containerRef}
        className={`w-full h-[130px] ${loading || error ? 'hidden' : ''}`}
        style={{ minWidth: 0 }}
      />
    </div>
  );
};
