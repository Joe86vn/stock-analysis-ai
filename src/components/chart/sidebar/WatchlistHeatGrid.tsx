'use client';

import React from 'react';
import {
    HeatSizeMode,
    StockForHeat,
    getHeatTileStyle,
    getTileSpan,
} from './watchlist-heat';

interface WatchlistHeatGridProps {
    stocks: StockForHeat[];
    currentTicker: string;
    sizeMode: HeatSizeMode;
    isCustomWatchlist?: boolean;
    onSelectTicker: (ticker: string) => void;
    onRemoveTicker?: (ticker: string, e: React.MouseEvent) => void;
    fmtPrice: (p: number) => string;
}

/**
 * Thanh Breadth Bar (độ rộng thị trường trong ngành / tổng)
 */
export const BreadthBar: React.FC<{
    upCount: number;
    refCount: number;
    downCount: number;
    total: number;
    className?: string;
}> = ({ upCount, refCount, downCount, total, className = '' }) => {
    if (total === 0) return null;

    const upPct = (upCount / total) * 100;
    const refPct = (refCount / total) * 100;
    const downPct = (downCount / total) * 100;

    return (
        <div className={`flex items-center space-x-1.5 flex-shrink-0 ${className}`}>
            <div className="w-12 h-1.5 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-800">
                {upPct > 0 && (
                    <div
                        style={{ width: `${upPct}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Tăng: ${upCount}`}
                    />
                )}
                {refPct > 0 && (
                    <div
                        style={{ width: `${refPct}%` }}
                        className="bg-amber-400 h-full"
                        title={`Tham chiếu: ${refCount}`}
                    />
                )}
                {downPct > 0 && (
                    <div
                        style={{ width: `${downPct}%` }}
                        className="bg-rose-500 h-full"
                        title={`Giảm: ${downCount}`}
                    />
                )}
            </div>
            <div className="flex items-center space-x-1 text-[9.5px] font-mono">
                <span className="text-emerald-500 font-bold">{upCount}↑</span>
                <span className="text-amber-500 font-medium">{refCount}•</span>
                <span className="text-rose-500 font-bold">{downCount}↓</span>
            </div>
        </div>
    );
};

/**
 * Chú giải thang màu Heat Legend
 */
export const HeatLegend: React.FC = () => {
    const steps = [
        { label: 'Sàn', bg: '#0891b2', text: 'text-cyan-200' },
        { label: '-5%', bg: 'rgba(239, 68, 68, 0.85)', text: 'text-rose-200' },
        { label: '-3%', bg: 'rgba(239, 68, 68, 0.60)', text: 'text-rose-200' },
        { label: '-1%', bg: 'rgba(239, 68, 68, 0.35)', text: 'text-rose-300' },
        { label: '0%', bg: 'rgba(217, 119, 6, 0.45)', text: 'text-amber-300' },
        { label: '+1%', bg: 'rgba(16, 185, 129, 0.35)', text: 'text-emerald-300' },
        { label: '+3%', bg: 'rgba(16, 185, 129, 0.60)', text: 'text-emerald-200' },
        { label: '+5%', bg: 'rgba(16, 185, 129, 0.85)', text: 'text-emerald-200' },
        { label: 'Trần', bg: '#9333ea', text: 'text-purple-200' },
    ];

    return (
        <div className="flex items-center justify-between px-2 py-1 bg-gray-100/80 dark:bg-[#161a23] border-b border-gray-200 dark:border-gray-800/80 text-[9px] font-mono text-gray-500 dark:text-gray-400 select-none">
            <div className="flex items-center space-x-0.5">
                {steps.map((st, i) => (
                    <div
                        key={i}
                        style={{ backgroundColor: st.bg }}
                        className="w-3.5 h-2 rounded-[2px] first:rounded-l last:rounded-r"
                        title={st.label}
                    />
                ))}
            </div>
            <div className="flex items-center space-x-1.5 text-[8.5px]">
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">Sàn</span>
                <span>•</span>
                <span className="text-rose-500 font-bold">-7%</span>
                <span>•</span>
                <span className="text-amber-500 font-bold">0%</span>
                <span>•</span>
                <span className="text-emerald-500 font-bold">+7%</span>
                <span>•</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">Trần</span>
            </div>
        </div>
    );
};

export const WatchlistHeatGrid: React.FC<WatchlistHeatGridProps> = ({
    stocks,
    currentTicker,
    sizeMode,
    isCustomWatchlist,
    onSelectTicker,
    onRemoveTicker,
    fmtPrice,
}) => {
    return (
        <div className="grid grid-cols-4 grid-flow-dense gap-1 p-1 bg-slate-100/80 dark:bg-[#0c0f16]">
            {stocks.map((stock) => {
                const isSelected = stock.ticker === currentTicker;
                const pct = stock.priceChangePercent ?? 0;
                const sign = pct > 0 ? '+' : '';
                const tileStyle = getHeatTileStyle(pct, stock.exchange);
                const { colSpan, rowSpan, size } = getTileSpan(stock, stocks, sizeMode);

                const spanClass =
                    size === 'L'
                        ? 'col-span-2 row-span-2 min-h-[64px]'
                        : size === 'M'
                            ? 'col-span-2 row-span-1 min-h-[30px]'
                            : 'col-span-1 row-span-1 min-h-[30px]';

                return (
                    <div
                        key={stock.ticker}
                        onClick={() => onSelectTicker(stock.ticker)}
                        style={tileStyle.bgStyle}
                        className={`group/heat-tile relative rounded-[3px] p-1 flex flex-col justify-between cursor-pointer transition-all duration-75 select-none overflow-hidden ${spanClass} ${isSelected
                            ? 'ring-2 ring-white dark:ring-blue-400 shadow-md z-10 brightness-110'
                            : 'hover:brightness-115 hover:scale-[1.01]'
                            }`}
                        title={`${stock.ticker} - ${stock.companyName}\nGiá: ${fmtPrice(
                            stock.currentPrice
                        )} (${sign}${pct.toFixed(1)}%)\nRS: ${stock.rsRating || '-'
                            }\nGTGD: ${stock.sessionValueBillion
                                ? stock.sessionValueBillion.toFixed(1) + ' Tỷ'
                                : stock.adtv20Billion
                                    ? stock.adtv20Billion.toFixed(1) + ' Tỷ (20N)'
                                    : '-'
                            }`}
                    >
                        {/* Cỡ L (2x2) */}
                        {size === 'L' && (
                            <>
                                <div className="flex items-start justify-between w-full">
                                    <span className={`text-xs font-mono tracking-tight ${tileStyle.textClass}`}>
                                        {stock.ticker}
                                    </span>
                                    {stock.rsRating ? (
                                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/25 text-white/90">
                                            {stock.rsRating}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="my-auto text-center">
                                    <div className={`text-[13px] font-mono tracking-tight leading-none ${tileStyle.subTextClass}`}>
                                        {sign}{pct.toFixed(2)}%
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full text-[9px] font-mono border-t border-black/10 dark:border-white/10 pt-0.5">
                                    <span className={tileStyle.priceClass}>
                                        {fmtPrice(stock.currentPrice)}
                                    </span>
                                    <span className="text-white/70 text-[8.5px]">
                                        {stock.sessionValueBillion
                                            ? `${stock.sessionValueBillion.toFixed(0)}T`
                                            : stock.adtv20Billion
                                                ? `${stock.adtv20Billion.toFixed(0)}T`
                                                : ''}
                                    </span>
                                </div>
                            </>
                        )}

                        {/* Cỡ M (2x1) */}
                        {size === 'M' && (
                            <div className="flex items-center justify-between w-full h-full px-0.5">
                                <span className={`text-[11px] font-mono ${tileStyle.textClass} truncate`}>
                                    {stock.ticker}
                                </span>
                                <span className={`text-[10px] font-mono ${tileStyle.subTextClass} whitespace-nowrap`}>
                                    {sign}{pct.toFixed(1)}%
                                </span>
                                <span className={`text-[9px] font-mono ${tileStyle.priceClass} hidden sm:inline ml-1`}>
                                    {fmtPrice(stock.currentPrice)}
                                </span>
                            </div>
                        )}

                        {/* Cỡ S (1x1) */}
                        {size === 'S' && (
                            <div className="flex flex-col items-center justify-center w-full h-full leading-tight text-center">
                                <span className={`text-[10.5px] font-mono ${tileStyle.textClass} truncate w-full`}>
                                    {stock.ticker}
                                </span>
                                <span className={`text-[9px] font-mono ${tileStyle.subTextClass} whitespace-nowrap`}>
                                    {sign}{pct.toFixed(1)}%
                                </span>
                            </div>
                        )}

                        {/* Nút xóa nhanh nếu ở danh mục cá nhân */}
                        {isCustomWatchlist && onRemoveTicker && (
                            <button
                                onClick={(e) => onRemoveTicker(stock.ticker, e)}
                                className="absolute top-0.5 right-0.5 w-3 h-3 bg-black/60 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/heat-tile:opacity-100 transition shadow-xs cursor-pointer z-20 text-[8px]"
                                title={`Xóa ${stock.ticker}`}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
