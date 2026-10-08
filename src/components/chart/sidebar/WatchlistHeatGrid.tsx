'use client';

import React, { useState, useCallback } from 'react';
import {
    HeatSizeMode,
    StockForHeat,
    IndustryHeatGroup,
    getHeatTileStyle,
    getTileSpan,
    getIndustryBlockColSpan,
} from './watchlist-heat';

interface WatchlistHeatGridProps {
    stocks: StockForHeat[];
    currentTicker: string;
    sizeMode: HeatSizeMode;
    isCustomWatchlist?: boolean;
    onSelectTicker: (ticker: string) => void;
    onRemoveTicker?: (ticker: string, e: React.MouseEvent) => void;
    fmtPrice: (p: number) => string;
    columnsCount?: number;
}

export interface WatchlistPackedHeatViewProps {
    groups: IndustryHeatGroup[];
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
            <div className="w-10 h-1.5 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-800">
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
            <div className="flex items-center space-x-1 text-[9px] font-mono">
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

/**
 * Floating Tooltip Card hiển thị đầy đủ thông tin khi hover (đặc biệt cho các ô XS và S)
 */
interface HoveredInfo {
    stock: StockForHeat;
    x: number;
    y: number;
}

const HeatFloatingTooltip: React.FC<{
    info: HoveredInfo | null;
    fmtPrice: (p: number) => string;
}> = ({ info, fmtPrice }) => {
    if (!info) return null;

    const { stock, x, y } = info;
    const pct = stock.priceChangePercent ?? 0;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const sign = isUp ? '+' : '';
    const colorClass = isUp
        ? 'text-emerald-400'
        : isDown
            ? 'text-rose-400'
            : 'text-amber-400';

    // Tính vị trí tránh tràn màn hình
    const tooltipWidth = 220;
    const tooltipHeight = 150;
    const posX = typeof window !== 'undefined' && x + tooltipWidth + 15 > window.innerWidth
        ? Math.max(10, x - tooltipWidth - 12)
        : x + 12;
    const posY = typeof window !== 'undefined' && y + tooltipHeight + 15 > window.innerHeight
        ? Math.max(10, y - tooltipHeight - 12)
        : y + 12;

    return (
        <div
            style={{ left: `${posX}px`, top: `${posY}px` }}
            className="fixed z-50 pointer-events-none w-56 rounded-lg bg-slate-900/95 dark:bg-[#10141e]/98 text-white p-2.5 shadow-2xl border border-slate-700/80 backdrop-blur-md transition-opacity duration-150 animate-in fade-in"
        >
            {/* Header: Ticker + Exchange + RS */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-black font-mono tracking-tight text-white">
                        {stock.ticker}
                    </span>
                    {stock.exchange && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            {stock.exchange}
                        </span>
                    )}
                </div>
                {stock.rsRating ? (
                    <span
                        className={`text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded ${stock.rsRating >= 80
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                            : stock.rsRating >= 70
                                ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                    >
                        RS {Math.round(stock.rsRating)}
                    </span>
                ) : null}
            </div>

            {/* Tên công ty */}
            <p className="text-[10px] text-slate-400 truncate mt-1">
                {stock.companyName}
            </p>

            {/* Giá & % Thay đổi */}
            <div className="flex items-baseline justify-between mt-2">
                <span className={`text-base font-extrabold font-mono ${colorClass}`}>
                    {fmtPrice(stock.currentPrice)}
                </span>
                <span className={`text-xs font-black font-mono px-1.5 py-0.5 rounded bg-black/40 ${colorClass}`}>
                    {sign}{pct.toFixed(2)}%
                </span>
            </div>

            {/* Chi tiết Khối lượng & GTGD */}
            <div className="mt-2 pt-1.5 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[9.5px] font-mono">
                <div>
                    <span className="text-slate-500 block text-[8.5px]">Khối lượng:</span>
                    <span className="font-semibold text-slate-200">
                        {stock.sessionVolume !== undefined
                            ? `${(stock.sessionVolume / 1_000_000).toFixed(2)} tr`
                            : '-'}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-slate-500 block text-[8.5px]">GTGD phiên:</span>
                    <span className="font-bold text-amber-300">
                        {stock.sessionValueBillion !== undefined
                            ? `${stock.sessionValueBillion.toFixed(1)} Tỷ`
                            : stock.adtv20Billion
                                ? `${stock.adtv20Billion.toFixed(1)} Tỷ`
                                : '-'}
                    </span>
                </div>
                {stock.adtv20Billion ? (
                    <div className="col-span-2 flex justify-between items-center pt-0.5 text-slate-400 text-[8.5px]">
                        <span>TB 20 phiên (ADTV):</span>
                        <span className="text-slate-300 font-semibold">{stock.adtv20Billion.toFixed(1)} Tỷ</span>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

/**
 * Render một ô cổ phiếu riêng lẻ với 4 cấp độ kích thước:
 * - Size L: 2x2 (col-span-4 row-span-4)
 * - Size M: 2x1 (col-span-4 row-span-2)
 * - Size S: 1x1 (col-span-2 row-span-2)
 * - Size XS: 0.5x0.5 (col-span-1 row-span-1)
 */
const SingleHeatTile: React.FC<{
    stock: StockForHeat;
    allStocks: StockForHeat[];
    currentTicker: string;
    sizeMode: HeatSizeMode;
    isCustomWatchlist?: boolean;
    onSelectTicker: (ticker: string) => void;
    onRemoveTicker?: (ticker: string, e: React.MouseEvent) => void;
    fmtPrice: (p: number) => string;
    onHover: (stock: StockForHeat | null, e?: React.MouseEvent) => void;
}> = ({
    stock,
    allStocks,
    currentTicker,
    sizeMode,
    isCustomWatchlist,
    onSelectTicker,
    onRemoveTicker,
    fmtPrice,
    onHover,
}) => {
        const isSelected = stock.ticker === currentTicker;
        const pct = stock.priceChangePercent ?? 0;
        const sign = pct > 0 ? '+' : '';
        const tileStyle = getHeatTileStyle(pct, stock.exchange);
        const { size } = getTileSpan(stock, allStocks, sizeMode);

        const spanClass =
            size === 'L'
                ? 'col-span-4 row-span-4 min-h-[68px]'
                : size === 'M'
                    ? 'col-span-4 row-span-2 min-h-[34px]'
                    : size === 'S'
                        ? 'col-span-2 row-span-2 min-h-[34px]'
                        : 'col-span-1 row-span-1 min-h-[17px]';

        return (
            <div
                onClick={() => onSelectTicker(stock.ticker)}
                onMouseEnter={(e) => onHover(stock, e)}
                onMouseMove={(e) => onHover(stock, e)}
                onMouseLeave={() => onHover(null)}
                style={tileStyle.bgStyle}
                className={`group/heat-tile relative rounded-[2px] flex flex-col justify-between cursor-pointer transition-all duration-75 select-none overflow-hidden ${spanClass} ${isSelected
                    ? 'ring-2 ring-white dark:ring-blue-400 shadow-md z-10 brightness-110'
                    : 'hover:brightness-120 hover:scale-[1.02]'
                    }`}
            >
                {/* Size L: 2x2 */}
                {size === 'L' && (
                    <div className="flex flex-col justify-between w-full h-full p-1 leading-none">
                        <div className="flex items-start justify-between w-full">
                            <span className={`text-[12px] font-mono tracking-tight font-black ${tileStyle.textClass}`}>
                                {stock.ticker}
                            </span>
                            {stock.rsRating ? (
                                <span className="text-[8px] font-mono px-0.5 py-0.2 rounded bg-black/35 text-white/95">
                                    {stock.rsRating}
                                </span>
                            ) : null}
                        </div>
                        <div className="my-auto text-center py-0.5">
                            <div className={`text-[13px] font-mono tracking-tight leading-none ${tileStyle.subTextClass}`}>
                                {sign}{pct.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[8.5px] font-mono border-t border-black/10 dark:border-white/10 pt-0.5 leading-none">
                            <span className={tileStyle.priceClass}>
                                {fmtPrice(stock.currentPrice)}
                            </span>
                            <span className="text-white/80 text-[8px]">
                                {stock.sessionValueBillion
                                    ? `${stock.sessionValueBillion.toFixed(0)}T`
                                    : stock.adtv20Billion
                                        ? `${stock.adtv20Billion.toFixed(0)}T`
                                        : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Size M: 2x1 */}
                {size === 'M' && (
                    <div className="flex items-center justify-between w-full h-full px-1.5 py-0.5 leading-none">
                        <div className="flex items-center space-x-1 truncate">
                            <span className={`text-[11px] font-mono font-bold ${tileStyle.textClass} truncate`}>
                                {stock.ticker}
                            </span>
                            {stock.rsRating ? (
                                <span className="text-[7.5px] font-mono px-0.5 rounded bg-black/30 text-white/90 hidden sm:inline">
                                    {stock.rsRating}
                                </span>
                            ) : null}
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 text-right">
                            <span className={`text-[10px] font-mono ${tileStyle.subTextClass} whitespace-nowrap`}>
                                {sign}{pct.toFixed(1)}%
                            </span>
                            <span className={`text-[8.5px] font-mono ${tileStyle.priceClass} hidden sm:inline`}>
                                {fmtPrice(stock.currentPrice)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Size S: 1x1 */}
                {size === 'S' && (
                    <div className="flex flex-col items-center justify-center w-full h-full p-0.5 leading-tight text-center">
                        <span className={`text-[10px] font-mono font-bold ${tileStyle.textClass} truncate w-full leading-none`}>
                            {stock.ticker}
                        </span>
                        <span className={`text-[8.5px] font-mono ${tileStyle.subTextClass} whitespace-nowrap mt-0.5 leading-none`}>
                            {sign}{pct.toFixed(1)}%
                        </span>
                    </div>
                )}

                {/* Size XS: 0.5x0.5 */}
                {size === 'XS' && (
                    <div className="flex items-center justify-center w-full h-full p-0 leading-none text-center">
                        <span className={`text-[8px] font-mono font-extrabold ${tileStyle.textClass} truncate select-none tracking-tighter`}>
                            {stock.ticker}
                        </span>
                    </div>
                )}

                {/* Nút xóa nhanh nếu ở danh mục cá nhân */}
                {isCustomWatchlist && onRemoveTicker && (
                    <button
                        onClick={(e) => onRemoveTicker(stock.ticker, e)}
                        className="absolute top-0 right-0 w-3 h-3 bg-black/60 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/heat-tile:opacity-100 transition shadow-xs cursor-pointer z-20 text-[7px]"
                        title={`Xóa ${stock.ticker}`}
                    >
                        ✕
                    </button>
                )}
            </div>
        );
    };

/**
 * Grid đơn cho 1 nhóm cổ phiếu
 */
export const WatchlistHeatGrid: React.FC<WatchlistHeatGridProps> = ({
    stocks,
    currentTicker,
    sizeMode,
    isCustomWatchlist,
    onSelectTicker,
    onRemoveTicker,
    fmtPrice,
    columnsCount = 8,
}) => {
    const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);

    const handleHover = useCallback((stock: StockForHeat | null, e?: React.MouseEvent) => {
        if (!stock || !e) {
            setHoveredInfo(null);
            return;
        }
        setHoveredInfo({
            stock,
            x: e.clientX,
            y: e.clientY,
        });
    }, []);

    const colClass =
        columnsCount === 2
            ? 'grid-cols-2'
            : columnsCount === 4
                ? 'grid-cols-4'
                : columnsCount === 6
                    ? 'grid-cols-6'
                    : 'grid-cols-8';

    return (
        <div className="relative">
            <div className={`grid ${colClass} grid-flow-dense gap-0.5 p-1 bg-slate-100/80 dark:bg-[#0c0f16]`}>
                {stocks.map((stock) => (
                    <SingleHeatTile
                        key={stock.ticker}
                        stock={stock}
                        allStocks={stocks}
                        currentTicker={currentTicker}
                        sizeMode={sizeMode}
                        isCustomWatchlist={isCustomWatchlist}
                        onSelectTicker={onSelectTicker}
                        onRemoveTicker={onRemoveTicker}
                        fmtPrice={fmtPrice}
                        onHover={handleHover}
                    />
                ))}
            </div>

            {/* Tooltip nổi toàn cục cho grid này */}
            <HeatFloatingTooltip info={hoveredInfo} fmtPrice={fmtPrice} />
        </div>
    );
};

/**
 * Khối Heatmap Packed View:
 * Phân bổ cột linh hoạt trong lưới 6 cột:
 * - Trên 10 mã: 1 dòng riêng (col-span-6)
 * - Từ 5 - 10 mã: chia đôi kích thước (col-span-3, 2 ngành / dòng)
 * - Dưới 5 mã: chia 3 (col-span-2, 3 ngành / dòng)
 */
export const WatchlistPackedHeatView: React.FC<WatchlistPackedHeatViewProps> = ({
    groups,
    currentTicker,
    sizeMode,
    isCustomWatchlist,
    onSelectTicker,
    onRemoveTicker,
    fmtPrice,
}) => {
    const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);

    const handleHover = useCallback((stock: StockForHeat | null, e?: React.MouseEvent) => {
        if (!stock || !e) {
            setHoveredInfo(null);
            return;
        }
        setHoveredInfo({
            stock,
            x: e.clientX,
            y: e.clientY,
        });
    }, []);

    return (
        <div className="relative p-1 bg-slate-100/70 dark:bg-[#0c0f16]">
            {/* Lưới bố cục 6 cột chính cho toàn bộ các ngành */}
            <div className="grid grid-cols-6 gap-1.5 items-start">
                {groups.map((group) => {
                    const colSpan = getIndustryBlockColSpan(group.count);
                    const isFullWidth = colSpan === 6;

                    const colSpanClass =
                        colSpan === 6
                            ? 'col-span-6'
                            : colSpan === 3
                                ? 'col-span-3'
                                : 'col-span-2';

                    // Số cột con bên trong card: > 10 mã dùng 8 cột, 5-10 mã và < 5 mã dùng 4 cột
                    const innerColsClass = isFullWidth ? 'grid-cols-8' : 'grid-cols-4';

                    return (
                        <div
                            key={group.industry}
                            className={`rounded border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#131722]/80 overflow-hidden flex flex-col ${colSpanClass}`}
                        >
                            {/* Tiêu đề mini của khối ngành */}
                            <div className="flex items-center justify-between px-1.5 py-0.5 bg-slate-100/90 dark:bg-[#181d29] border-b border-slate-200/60 dark:border-slate-800/80 select-none">
                                <div className="flex items-center space-x-1 truncate mr-1">
                                    <span className="font-bold text-[9.5px] text-slate-800 dark:text-slate-200 truncate">
                                        {group.industry}
                                    </span>
                                    <span className="text-[8px] px-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                        {group.count}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-1 flex-shrink-0 text-[8.5px] font-mono">
                                    {isFullWidth && (
                                        <BreadthBar
                                            upCount={group.upCount}
                                            refCount={group.refCount}
                                            downCount={group.downCount}
                                            total={group.count}
                                            className="hidden sm:flex"
                                        />
                                    )}
                                    <span
                                        className={`font-bold ${group.avgChange > 0
                                            ? 'text-emerald-500'
                                            : group.avgChange < 0
                                                ? 'text-rose-500'
                                                : 'text-amber-500'
                                            }`}
                                    >
                                        {group.avgChange > 0 ? '+' : ''}
                                        {group.avgChange.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* Lưới các ô cổ phiếu trong ngành */}
                            <div
                                className={`grid ${innerColsClass} grid-flow-dense gap-0.5 p-0.5 bg-slate-50/50 dark:bg-[#0e111a]`}
                            >
                                {group.stocks.map((stock) => (
                                    <SingleHeatTile
                                        key={stock.ticker}
                                        stock={stock}
                                        allStocks={group.stocks}
                                        currentTicker={currentTicker}
                                        sizeMode={sizeMode}
                                        isCustomWatchlist={isCustomWatchlist}
                                        onSelectTicker={onSelectTicker}
                                        onRemoveTicker={onRemoveTicker}
                                        fmtPrice={fmtPrice}
                                        onHover={handleHover}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tooltip nổi hiển thị khi rê chuột qua bất kỳ mã nào */}
            <HeatFloatingTooltip info={hoveredInfo} fmtPrice={fmtPrice} />
        </div>
    );
};
