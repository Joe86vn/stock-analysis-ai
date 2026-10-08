import React from 'react';

export type HeatSizeMode = 'equal' | 'value' | 'cap';
export type HeatTileSize = 'L' | 'M' | 'S' | 'XS' | 'TINY';

export interface HeatTileStyle {
    bgStyle: React.CSSProperties;
    textClass: string;
    subTextClass: string;
    priceClass: string;
    isCeiling: boolean;
    isFloor: boolean;
    isRef: boolean;
}

export interface StockForHeat {
    ticker: string;
    companyName: string;
    exchange?: string;
    currentPrice: number;
    priceChangePercent?: number;
    sessionValueBillion?: number;
    sessionVolume?: number;
    adtv20Billion?: number;
    marketCapBillion?: number;
    rsRating?: number;
}

export interface IndustryHeatGroup {
    industry: string;
    stocks: StockForHeat[];
    count: number;
    upCount: number;
    downCount: number;
    refCount: number;
    totalSessionVal: number;
    avgChange: number;
}

/**
 * Tính màu nền & màu chữ heat gradient cho ô cổ phiếu dựa trên % thay đổi giá & biên độ sàn giao dịch
 */
export function getHeatTileStyle(
    pct: number,
    exchange: string = 'HSX'
): HeatTileStyle {
    const ex = exchange.toUpperCase();
    const ceilingPct = ex === 'UPCOM' ? 14.3 : ex === 'HNX' ? 9.5 : 6.7;
    const floorPct = ex === 'UPCOM' ? -14.3 : ex === 'HNX' ? -9.5 : -6.7;

    const isCeiling = pct >= ceilingPct && pct > 0;
    const isFloor = pct <= floorPct && pct < 0;
    const isRef = pct === 0;

    // 1. Tím Trần: #A855F7
    if (isCeiling) {
        return {
            bgStyle: { backgroundColor: '#9333ea' }, // purple-600
            textClass: 'text-white font-black',
            subTextClass: 'text-purple-100 font-extrabold',
            priceClass: 'text-purple-200 font-mono',
            isCeiling: true,
            isFloor: false,
            isRef: false,
        };
    }

    // 2. Xanh Lơ Sàn: #06B6D4
    if (isFloor) {
        return {
            bgStyle: { backgroundColor: '#0891b2' }, // cyan-600
            textClass: 'text-white font-black',
            subTextClass: 'text-cyan-100 font-extrabold',
            priceClass: 'text-cyan-200 font-mono',
            isCeiling: false,
            isFloor: true,
            isRef: false,
        };
    }

    // 3. Vàng Tham Chiếu: #d97706 / #f59e0b
    if (isRef) {
        return {
            bgStyle: { backgroundColor: 'rgba(217, 119, 6, 0.45)' }, // amber with opacity
            textClass: 'text-amber-300 dark:text-amber-200 font-extrabold',
            subTextClass: 'text-amber-200/90 font-bold',
            priceClass: 'text-amber-300/80 font-mono',
            isCeiling: false,
            isFloor: false,
            isRef: true,
        };
    }

    // 4. Xanh Tăng (Bullish Emerald #10B981)
    if (pct > 0) {
        const ratio = Math.min(Math.max(pct / (ceilingPct || 7), 0.15), 1);
        const alpha = 0.25 + ratio * 0.7; // 0.35 -> 0.95
        return {
            bgStyle: { backgroundColor: `rgba(16, 185, 129, ${alpha.toFixed(2)})` },
            textClass: alpha > 0.5 ? 'text-white font-black' : 'text-emerald-100 dark:text-emerald-200 font-bold',
            subTextClass: alpha > 0.5 ? 'text-emerald-100 font-extrabold' : 'text-emerald-200 font-bold',
            priceClass: alpha > 0.5 ? 'text-emerald-100/90 font-mono' : 'text-emerald-200/80 font-mono',
            isCeiling: false,
            isFloor: false,
            isRef: false,
        };
    }

    // 5. Đỏ Giảm (Bearish Red #EF4444)
    const absPct = Math.abs(pct);
    const maxFloor = Math.abs(floorPct || -7);
    const ratio = Math.min(Math.max(absPct / maxFloor, 0.15), 1);
    const alpha = 0.25 + ratio * 0.7; // 0.35 -> 0.95

    return {
        bgStyle: { backgroundColor: `rgba(239, 68, 68, ${alpha.toFixed(2)})` },
        textClass: alpha > 0.5 ? 'text-white font-black' : 'text-rose-100 dark:text-rose-200 font-bold',
        subTextClass: alpha > 0.5 ? 'text-rose-100 font-extrabold' : 'text-rose-200 font-bold',
        priceClass: alpha > 0.5 ? 'text-rose-100/90 font-mono' : 'text-rose-200/80 font-mono',
        isCeiling: false,
        isFloor: false,
        isRef: false,
    };
}

/**
 * Xác định kích thước ô theo 5 cấp (L, M, S, XS, TINY) dựa trên GTGD / Vốn hóa
 */
export function getTileSpan(
    stock: StockForHeat,
    allGroupStocks: StockForHeat[],
    sizeMode: HeatSizeMode
): { colSpan: number; rowSpan: number; size: HeatTileSize } {
    if (sizeMode === 'equal') {
        return { colSpan: 1, rowSpan: 1, size: 'S' };
    }

    const n = allGroupStocks.length;
    if (n <= 1) {
        return { colSpan: 2, rowSpan: 1, size: 'M' };
    }
    if (n <= 2) {
        return { colSpan: 1, rowSpan: 1, size: 'S' };
    }

    // Trọng số tính theo GTGD hoặc Vốn hóa
    const getWeight = (s: StockForHeat) => {
        if (sizeMode === 'value') {
            return s.sessionValueBillion ?? (s.adtv20Billion || 0);
        }
        return s.marketCapBillion || 0;
    };

    const currentWeight = getWeight(stock);
    const allWeights = allGroupStocks.map(getWeight).filter((w) => w > 0);

    if (allWeights.length === 0 || currentWeight <= 0) {
        return { colSpan: 1, rowSpan: 1, size: 'XS' };
    }

    // Sắp xếp weights giảm dần
    const sorted = [...allWeights].sort((a, b) => b - a);
    const rank = sorted.findIndex((w) => w <= currentWeight);
    const ratio = rank / sorted.length;

    // Top 15% (ít nhất 1 mã nếu nhóm >= 4 mã): Ô L (2x2)
    if (rank === 0 && n >= 4) {
        return { colSpan: 2, rowSpan: 2, size: 'L' };
    }
    if (ratio < 0.15 && n >= 6) {
        return { colSpan: 2, rowSpan: 2, size: 'L' };
    }

    // Top 15% - 35%: Ô M (2x1)
    if (ratio < 0.35 && n >= 3) {
        return { colSpan: 2, rowSpan: 1, size: 'M' };
    }

    // Tiếp theo 35% - 65%: Ô S (1x1)
    if (ratio < 0.65) {
        return { colSpan: 1, rowSpan: 1, size: 'S' };
    }

    // Tiếp theo 65% - 85%: Ô XS (1x1 nhỏ)
    if (ratio < 0.85 || n < 8) {
        return { colSpan: 1, rowSpan: 1, size: 'XS' };
    }

    // Cuối cùng hoặc thanh khoản nhỏ: Ô TINY (vi mô, chỉ hiện khối màu)
    return { colSpan: 1, rowSpan: 1, size: 'TINY' };
}

/**
 * Xác định phân bổ cột cho khối ngành:
 * - Ngành có >= 5 mã hoặc GTGD >= 500 Tỷ: chiếm 2 cột (full width)
 * - Ngành ít mã (< 5 mã): chiếm 1 cột (xếp gọn 2 khối ngành cạnh nhau)
 */
export function getIndustryBlockColSpan(stockCount: number, totalSessionVal?: number): number {
    if (stockCount >= 5 || (totalSessionVal && totalSessionVal >= 500)) {
        return 2;
    }
    return 1;
}
