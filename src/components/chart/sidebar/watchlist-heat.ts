import React from 'react';

export type HeatSizeMode = 'equal' | 'value' | 'cap';
export type HeatTileSize = 'L' | 'M' | 'S' | 'XS';

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

    // 1. Tím Trần: #9333ea
    if (isCeiling) {
        return {
            bgStyle: { backgroundColor: '#9333ea' },
            textClass: 'text-white font-black',
            subTextClass: 'text-purple-100 font-extrabold',
            priceClass: 'text-purple-200 font-mono',
            isCeiling: true,
            isFloor: false,
            isRef: false,
        };
    }

    // 2. Xanh Lơ Sàn: #0891b2
    if (isFloor) {
        return {
            bgStyle: { backgroundColor: '#0891b2' },
            textClass: 'text-white font-black',
            subTextClass: 'text-cyan-100 font-extrabold',
            priceClass: 'text-cyan-200 font-mono',
            isCeiling: false,
            isFloor: true,
            isRef: false,
        };
    }

    // 3. Vàng Tham Chiếu: #d97706
    if (isRef) {
        return {
            bgStyle: { backgroundColor: 'rgba(217, 119, 6, 0.45)' },
            textClass: 'text-amber-300 dark:text-amber-200 font-extrabold',
            subTextClass: 'text-amber-200/90 font-bold',
            priceClass: 'text-amber-300/80 font-mono',
            isCeiling: false,
            isFloor: false,
            isRef: true,
        };
    }

    // 4. Xanh Tăng (Bullish Emerald)
    if (pct > 0) {
        const ratio = Math.min(Math.max(pct / (ceilingPct || 7), 0.15), 1);
        const alpha = 0.25 + ratio * 0.7;
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

    // 5. Đỏ Giảm (Bearish Red)
    const absPct = Math.abs(pct);
    const maxFloor = Math.abs(floorPct || -7);
    const ratio = Math.min(Math.max(absPct / maxFloor, 0.15), 1);
    const alpha = 0.25 + ratio * 0.7;

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
 * Cấu hình kích thước ô theo yêu cầu (Hệ lưới 6 cột):
 * - Size L: 3x4 (chiếm 3/6 cột, 4 hàng) - Nội dung: Mã CP, % tăng giảm, giá hiện tại
 * - Size M: 2x3 (chiếm 2/6 cột, 3 hàng) - Nội dung: Mã CP, % tăng giảm, giá hiện tại
 * - Size S: 1x2 (chiếm 1/6 cột, 2 hàng) - Nội dung: Mã CP, % tăng giảm
 * - Size XS: 1x1 (chiếm 1/6 cột, 1 hàng) - Nội dung: Mã CP
 */
export function getTileSpan(
    stock: StockForHeat,
    allGroupStocks: StockForHeat[],
    sizeMode: HeatSizeMode
): { colSpan: number; rowSpan: number; size: HeatTileSize } {
    const n = allGroupStocks.length;

    // Chỉ có 1 mã trong ngành: Cho chiếm full 6 cột của card mini
    if (n <= 1) {
        return { colSpan: 6, rowSpan: 3, size: 'L' };
    }

    if (sizeMode === 'equal') {
        if (n <= 3) {
            return { colSpan: 2, rowSpan: 3, size: 'M' };
        }
        return { colSpan: 1, rowSpan: 2, size: 'S' };
    }

    if (n === 2) {
        // 2 mã: mỗi mã 3x3 để cân đối hàng ngang 6 cột
        return { colSpan: 3, rowSpan: 3, size: 'M' };
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

    // Nhóm nhỏ dưới 5 mã (< 5 mã)
    if (n < 5) {
        if (n === 3) {
            // Cột 1-3: L (3x4). Cột 4-5: M (2x3). Cột 6: S (1x2) => 3+2+1 = 6 cột!
            if (rank === 0) return { colSpan: 3, rowSpan: 4, size: 'L' };
            if (rank === 1) return { colSpan: 2, rowSpan: 3, size: 'M' };
            return { colSpan: 1, rowSpan: 2, size: 'S' };
        }
        if (n === 4) {
            // Top 1: L (3x4), Top 2: M (2x3), 2 mã còn lại: S (1x2) => 3+2+1 = 6 cột
            if (rank === 0) return { colSpan: 3, rowSpan: 4, size: 'L' };
            if (rank === 1) return { colSpan: 2, rowSpan: 3, size: 'M' };
            return { colSpan: 1, rowSpan: 2, size: 'S' };
        }
        return { colSpan: 2, rowSpan: 3, size: 'M' };
    }

    // Nhóm từ 5 mã trở lên (5-10 mã hoặc > 10 mã)
    // 1. Leader tuyệt đối: Top 1 luôn là Size L (3x4)
    if (rank === 0) {
        return { colSpan: 3, rowSpan: 4, size: 'L' };
    }

    // Nếu nhóm rất đông (> 12 mã) và top 2 có GTGD vượt trội (> 1.5 lần mã thứ 3): Top 2 cũng là L (3x4)
    if (n > 12 && rank === 1 && currentWeight > (sorted[2] || 0) * 1.5) {
        return { colSpan: 3, rowSpan: 4, size: 'L' };
    }

    // 2. Major: Top 2 - 3 (hoặc top ~25%): Size M (2x3)
    if (rank <= 2 || ratio < 0.25) {
        return { colSpan: 2, rowSpan: 3, size: 'M' };
    }

    // 3. Standard: Tiếp theo 25% - 70%: Size S (1x2)
    if (ratio < 0.70) {
        return { colSpan: 1, rowSpan: 2, size: 'S' };
    }

    // 4. Minor: Cuối cùng (bottom ~30%): Size XS (1x1)
    return { colSpan: 1, rowSpan: 1, size: 'XS' };
}

/**
 * Xác định phân bổ cột cho khối ngành trong hệ lưới 6 cột:
 * - Trên 10 mã: 1 dòng riêng (col-span-6 = 100% width)
 * - Từ 5 - 10 mã: chia đôi kích thước (col-span-3 = 50% width, 2 khối / hàng)
 * - Dưới 5 mã: chia 3 (col-span-2 = 33.3% width, 3 khối / hàng)
 */
export function getIndustryBlockColSpan(stockCount: number): number {
    if (stockCount > 10) {
        return 6;
    }
    if (stockCount >= 5) {
        return 3;
    }
    return 2;
}
