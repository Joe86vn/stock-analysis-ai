import { NextRequest, NextResponse } from 'next/server';
import { FILTER_75_TICKERS, FILTER_75_RS_MAP, StockRankingItem } from '@/lib/filter-rs-data';

export const dynamic = 'force-dynamic';

export interface WatchlistStockItem {
  ticker: string;
  companyName: string;
  exchange: string;
  industry: string;
  icbCodeLv2?: string;
  currentPrice: number;
  refPrice: number;
  priceChange: number;
  priceChangePercent: number;
  adtv20Billion: number;
  marketCapBillion: number;
  foreignPercentage: number;
  freeFloatPercentage: number;
  rsRating: number;
  totalScore: number;
  maxScore: 150;
  totalPercentage: number;
  [key: string]: any;
}

interface CachedUniverse {
  timestamp: number;
  universe: WatchlistStockItem[];
  top150Cap: WatchlistStockItem[];
  top150Adtv: WatchlistStockItem[];
  filter75: WatchlistStockItem[];
}

let memoryCache: CachedUniverse | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút cache để siêu nhanh

export async function GET(req: NextRequest) {
  const now = Date.now();

  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      cached: true,
      data: {
        top150_cap: memoryCache.top150Cap,
        top150_adtv: memoryCache.top150Adtv,
        filter_75: memoryCache.filter75,
        universe: memoryCache.universe,
      },
    });
  }

  try {
    const url = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/screening/filter';
    const payload = [
      {
        name: 'exchange',
        category: 'general',
        conditionOptions: [
          { type: 'value', value: 'hsx' },
          { type: 'value', value: 'hnx' },
          { type: 'value', value: 'upcom' },
        ],
      },
      {
        name: 'adtv',
        category: 'general',
        conditionOptions: [{ from: 0, to: 10_000_000_000_000 }],
        extraName: '20Days',
      },
    ];

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`Vietcap screening error HTTP ${res.status}`);
    }

    const json = await res.json();
    const rawList: any[] = Array.isArray(json?.data) ? json.data : [];

    const universe: WatchlistStockItem[] = rawList.map((item) => {
      const ticker = (item.ticker || '').trim().toUpperCase();
      const adtvVnd = item.adtv20Days || item.accumulatedValue || 0;
      const adtv20Billion = Math.round((adtvVnd / 1_000_000_000) * 10) / 10;
      const marketCapBillion = Math.round(((item.marketCap || 0) / 1_000_000_000) * 10) / 10;
      const currentPrice = item.marketPrice || item.refPrice || 0;
      const refPrice = item.refPrice || currentPrice;
      const priceChange = currentPrice - refPrice;
      const priceChangePercent =
        typeof item.dailyPriceChangePercent === 'number'
          ? Math.round(item.dailyPriceChangePercent * 100) / 100
          : refPrice > 0
          ? Math.round(((priceChange / refPrice) * 100) * 100) / 100
          : 0;

      const rsRating =
        typeof item.stockStrength === 'number'
          ? item.stockStrength
          : FILTER_75_RS_MAP[ticker] || 50;

      let ex = (item.exchange || 'HSX').toUpperCase();
      if (ex === 'HOSE') ex = 'HSX';

      return {
        ticker,
        companyName: item.viOrganName || item.viOrganShortName || item.enOrganName || `Công ty Cổ phần ${ticker}`,
        exchange: ex,
        industry: item.viSector?.trim() || 'Ngành khác',
        icbCodeLv2: item.icbCodeLv2,
        currentPrice,
        refPrice,
        priceChange,
        priceChangePercent,
        adtv20Billion,
        marketCapBillion,
        foreignPercentage: 0,
        freeFloatPercentage: 0,
        rsRating,
        totalScore: rsRating,
        maxScore: 150,
        totalPercentage: Math.round((rsRating / 150) * 100),
      };
    });

    // 1. Top 150 Vốn hóa
    const top150Cap = [...universe]
      .filter((s) => s.marketCapBillion > 0)
      .sort((a, b) => b.marketCapBillion - a.marketCapBillion)
      .slice(0, 150);

    // 2. Top 150 Thanh khoản 20N
    const top150Adtv = [...universe]
      .filter((s) => s.adtv20Billion > 0)
      .sort((a, b) => b.adtv20Billion - a.adtv20Billion)
      .slice(0, 150);

    // 3. Bộ lọc 75 mã
    const filter75Map = new Set(FILTER_75_TICKERS);
    const filter75 = universe
      .filter((s) => filter75Map.has(s.ticker))
      .map((s) => ({
        ...s,
        rsRating: FILTER_75_RS_MAP[s.ticker] || s.rsRating,
      }));

    // Cập nhật Cache
    memoryCache = {
      timestamp: now,
      universe,
      top150Cap,
      top150Adtv,
      filter75,
    };

    return NextResponse.json({
      success: true,
      cached: false,
      data: {
        top150_cap: top150Cap,
        top150_adtv: top150Adtv,
        filter_75: filter75,
        universe,
      },
    });
  } catch (error: any) {
    console.error('[WatchlistPresets] Error fetching screener data:', error);

    // Fallback: nếu gọi API thất bại, trả về danh sách có sẵn từ filter 75
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch watchlist presets',
      data: {
        top150_cap: [],
        top150_adtv: [],
        filter_75: [],
        universe: [],
      },
    });
  }
}
