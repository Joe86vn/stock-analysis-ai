import { DecodedIndexData } from '../ssi/proto-decoder.js';

export interface MarketSummary {
  indexId: string;
  indexValue: number;
  change: number;
  changePercent: number;
  totalQtty: number;
  totalValue: number;
  advances: number;
  declines: number;
  nochanges: number;
  ceiling: number;
  floor: number;
  chartOpen?: number;
  chartHigh?: number;
  chartLow?: number;
  updatedAt: number;
}

export class MarketAggregator {
  private indexMap = new Map<string, MarketSummary>();

  public processIndexUpdate(indexId: string, data: DecodedIndexData): MarketSummary {
    const cleanId = indexId.toUpperCase().trim();
    
    // indexValue trên SSI lưu dạng integer * 1000 (ví dụ VNINDEX 1285.50 -> 1285500)
    let val = data.indexValue || 0;
    if (val > 10000) {
      val = Math.round((val / 1000) * 100) / 100;
    }

    let chg = data.change || 0;
    if (Math.abs(chg) > 1000) {
      chg = Math.round((chg / 1000) * 100) / 100;
    }

    let chgPct = data.changePercent || 0;
    if (Math.abs(chgPct) > 100) {
      chgPct = Math.round((chgPct / 100) * 100) / 100;
    }

    const summary: MarketSummary = {
      indexId: cleanId,
      indexValue: val,
      change: chg,
      changePercent: chgPct,
      totalQtty: data.totalQtty || data.allQty || 0,
      totalValue: data.totalValue || data.allValue || 0,
      advances: data.advances || 0,
      declines: data.declines || 0,
      nochanges: data.nochanges || 0,
      ceiling: data.ceiling || 0,
      floor: data.floor || 0,
      chartOpen: data.chartOpen ? Math.round((data.chartOpen / 1000) * 100) / 100 : undefined,
      chartHigh: data.chartHigh ? Math.round((data.chartHigh / 1000) * 100) / 100 : undefined,
      chartLow: data.chartLow ? Math.round((data.chartLow / 1000) * 100) / 100 : undefined,
      updatedAt: Date.now(),
    };

    this.indexMap.set(cleanId, summary);
    return summary;
  }

  public getIndex(indexId: string): MarketSummary | undefined {
    return this.indexMap.get(indexId.toUpperCase().trim());
  }

  public getAllIndexes(): MarketSummary[] {
    return Array.from(this.indexMap.values());
  }
}
