import { DecodedStockData } from '../ssi/proto-decoder.js';

export interface LiveCandle {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  refPrice?: number;
  ceiling?: number;
  floor?: number;
  change?: number;
  changePercent?: number;
}

export class CandleAggregator {
  private activeCandles = new Map<string, LiveCandle>();

  public processStockUpdate(symbol: string, data: DecodedStockData): LiveCandle | null {
    const cleanSymbol = symbol.toUpperCase().trim();
    
    // Chuẩn hóa giá: Trên SSI giá thường hiển thị đơn vị 1.000 VNĐ (ví dụ: 38.5 = 38.500đ)
    // Nếu matchedPrice < 1000 thì quy đổi sang VNĐ (nhân 1000)
    let rawPrice = data.matchedPrice || data.openPrice || data.refPrice || 0;
    if (rawPrice > 0 && rawPrice < 1000) {
      rawPrice = Math.round(rawPrice * 1000);
    }

    if (rawPrice <= 0) return null;

    let rawRef = data.refPrice || 0;
    if (rawRef > 0 && rawRef < 1000) rawRef = Math.round(rawRef * 1000);

    let rawCeiling = data.ceiling || 0;
    if (rawCeiling > 0 && rawCeiling < 1000) rawCeiling = Math.round(rawCeiling * 1000);

    let rawFloor = data.floor || 0;
    if (rawFloor > 0 && rawFloor < 1000) rawFloor = Math.round(rawFloor * 1000);

    let rawHigh = data.highest || rawPrice;
    if (rawHigh > 0 && rawHigh < 1000) rawHigh = Math.round(rawHigh * 1000);

    let rawLow = data.lowest || rawPrice;
    if (rawLow > 0 && rawLow < 1000) rawLow = Math.round(rawLow * 1000);

    let rawOpen = data.openPrice || rawPrice;
    if (rawOpen > 0 && rawOpen < 1000) rawOpen = Math.round(rawOpen * 1000);

    const now = Date.now();
    const existing = this.activeCandles.get(cleanSymbol);

    if (!existing) {
      const newCandle: LiveCandle = {
        symbol: cleanSymbol,
        open: rawOpen,
        high: Math.max(rawOpen, rawPrice, rawHigh),
        low: Math.min(rawOpen, rawPrice, rawLow),
        close: rawPrice,
        volume: data.nmTotalTradedQty || data.matchedVolume || 0,
        timestamp: now,
        refPrice: rawRef,
        ceiling: rawCeiling,
        floor: rawFloor,
        change: data.priceChange,
        changePercent: data.priceChangePercent,
      };
      this.activeCandles.set(cleanSymbol, newCandle);
      return newCandle;
    }

    // Cập nhật nến đang chạy
    existing.close = rawPrice;
    existing.high = Math.max(existing.high, rawPrice, rawHigh);
    existing.low = Math.min(existing.low, rawPrice, rawLow);
    if (data.nmTotalTradedQty && data.nmTotalTradedQty > existing.volume) {
      existing.volume = data.nmTotalTradedQty;
    } else if (data.matchedVolume) {
      existing.volume += data.matchedVolume;
    }
    existing.timestamp = now;
    if (rawRef > 0) existing.refPrice = rawRef;
    if (rawCeiling > 0) existing.ceiling = rawCeiling;
    if (rawFloor > 0) existing.floor = rawFloor;
    if (data.priceChange !== undefined) existing.change = data.priceChange;
    if (data.priceChangePercent !== undefined) existing.changePercent = data.priceChangePercent;

    return existing;
  }

  public getCandle(symbol: string): LiveCandle | undefined {
    return this.activeCandles.get(symbol.toUpperCase().trim());
  }
}
