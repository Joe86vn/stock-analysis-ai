import { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';

export interface EnrichedKLineData {
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
  turnover?: number;
  // Custom fundamental fields
  pe?: number;
  pb?: number;
  coreEps?: number;
  revenue?: number;
  quarterCode?: string;
  // Band metrics
  peMean?: number;
  pePlus1SD?: number;
  pePlus2SD?: number;
  peMinus1SD?: number;
  peMinus2SD?: number;
  pbMean?: number;
  pbPlus1SD?: number;
  pbPlus2SD?: number;
  pbMinus1SD?: number;
  pbMinus2SD?: number;
}

export interface ValuationBandStats {
  mean: number;
  sd: number;
  plus1SD: number;
  plus2SD: number;
  minus1SD: number;
  minus2SD: number;
}

/**
 * Tính ngày công bố BCTC ước tính dựa trên Quý và Năm
 * Q1: ~20 tháng 04 năm Y
 * Q2: ~20 tháng 07 năm Y
 * Q3: ~20 tháng 10 năm Y
 * Q4: ~25 tháng 01 năm Y+1
 */
export function getQuarterReleaseTimestamp(year: number, quarter: number): number {
  if (quarter === 1) {
    return new Date(year, 3, 20).getTime(); // 20/04/Y
  } else if (quarter === 2) {
    return new Date(year, 6, 20).getTime(); // 20/07/Y
  } else if (quarter === 3) {
    return new Date(year, 9, 20).getTime(); // 20/10/Y
  } else {
    return new Date(year + 1, 0, 25).getTime(); // 25/01/Y+1
  }
}

/**
 * Sắp xếp quý theo thứ tự thời gian tăng dần và chuẩn hóa dữ liệu Core EPS + BVPS
 */
export function prepareQuarterSeries(quarters: ParsedVietcapQuarter[]) {
  const sorted = [...quarters].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  return sorted.map((q) => {
    const releaseTs = getQuarterReleaseTimestamp(q.year, q.quarter);
    // Lợi nhuận sau thuế cốt lõi (Loại trừ lợi nhuận khác/bất thường)
    const netProfit = q.netProfit || q.consolidatedNetProfit || 0;
    const otherProfit = q.otherProfit || 0;
    const coreNetProfit = netProfit - otherProfit;

    // EPS cốt lõi quý
    const shares = (q.sharesOutstandingMillions || 0) * 1_000_000;
    let coreEpsQuarter = q.eps || 0;
    if (shares > 0 && coreNetProfit !== 0) {
      coreEpsQuarter = Math.round(coreNetProfit / shares);
    }

    return {
      year: q.year,
      quarter: q.quarter,
      period: q.period || `Q${q.quarter}/${q.year}`,
      releaseTs,
      revenue: q.revenue || 0,
      netProfit,
      coreNetProfit,
      coreEpsQuarter,
      eps: q.eps || 0,
      bvps: q.bvps || 0,
      ownerEquity: q.ownerEquity || 0,
      shares,
    };
  });
}

/**
 * Tính toán Band Stats (Mean, ±1SD, ±2SD) từ mảng giá trị PE hoặc PB
 */
export function calculateValuationBands(values: number[]): ValuationBandStats {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0 && v < 300);
  if (valid.length === 0) {
    return { mean: 0, sd: 0, plus1SD: 0, plus2SD: 0, minus1SD: 0, minus2SD: 0 };
  }

  const sum = valid.reduce((acc, val) => acc + val, 0);
  const mean = sum / valid.length;

  const variance = valid.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / valid.length;
  const sd = Math.sqrt(variance);

  return {
    mean: Number(mean.toFixed(2)),
    sd: Number(sd.toFixed(2)),
    plus1SD: Number((mean + sd).toFixed(2)),
    plus2SD: Number((mean + 2 * sd).toFixed(2)),
    minus1SD: Number(Math.max(0.1, mean - sd).toFixed(2)),
    minus2SD: Number(Math.max(0.1, mean - 2 * sd).toFixed(2)),
  };
}

/**
 * Khớp dữ liệu cơ bản (PE, PB, Core EPS TTM, Revenue TTM) vào chuỗi KLineData ngày
 */
export function enrichKLineWithFundamentals<T extends { timestamp: number; close: number }>(
  klineData: T[],
  quarters: ParsedVietcapQuarter[]
): (T & EnrichedKLineData)[] {
  if (!klineData || klineData.length === 0) return [];
  if (!quarters || quarters.length === 0) {
    return klineData.map((d) => ({ ...d })) as (T & EnrichedKLineData)[];
  }

  const prepQuarters = prepareQuarterSeries(quarters);

  // Tính toán TTM cho từng quý n
  const quarterTTMs = prepQuarters.map((q, idx) => {
    // Lấy 4 quý gần nhất kết thúc tại idx: [idx-3, idx-2, idx-1, idx]
    const window = prepQuarters.slice(Math.max(0, idx - 3), idx + 1);
    const coreEpsTTM = window.reduce((sum, item) => sum + item.coreEpsQuarter, 0);
    const revenueTTM = window.reduce((sum, item) => sum + item.revenue, 0);

    return {
      ...q,
      coreEpsTTM: coreEpsTTM || q.eps * 4,
      revenueTTM,
    };
  });

  // Gắn fundamental values cho từng cây nến
  const rawEnriched = klineData.map((candle) => {
    const candleTs = candle.timestamp;
    // Chuẩn hóa giá đóng cửa về VNĐ (nếu giá dạng 25.5 -> 25500)
    const priceVnd = candle.close < 5000 ? candle.close * 1000 : candle.close;

    // Tìm quý mới nhất có releaseTs <= candleTs
    let matchedQ = quarterTTMs[0];
    for (let i = quarterTTMs.length - 1; i >= 0; i--) {
      if (quarterTTMs[i].releaseTs <= candleTs) {
        matchedQ = quarterTTMs[i];
        break;
      }
    }

    let pe: number | undefined = undefined;
    let pb: number | undefined = undefined;

    if (matchedQ) {
      if (matchedQ.coreEpsTTM > 0) {
        pe = Number((priceVnd / matchedQ.coreEpsTTM).toFixed(2));
      }
      if (matchedQ.bvps > 0) {
        // bvps in Vietcap is usually in VND (e.g. 15000)
        const bvpsVnd = matchedQ.bvps < 500 ? matchedQ.bvps * 1000 : matchedQ.bvps;
        pb = Number((priceVnd / bvpsVnd).toFixed(2));
      }
    }

    return {
      ...candle,
      pe,
      pb,
      coreEps: matchedQ ? matchedQ.coreEpsTTM : undefined,
      revenue: matchedQ ? Math.round((matchedQ.revenueTTM || 0) / 1_000_000_000) : undefined, // Tỷ VNĐ
      quarterCode: matchedQ ? matchedQ.period : undefined,
    };
  });

  // Tính toán Band stats trên toàn bộ chuỗi lịch sử PE & PB
  const peList = rawEnriched.map((d) => d.pe).filter((v): v is number => typeof v === 'number');
  const pbList = rawEnriched.map((d) => d.pb).filter((v): v is number => typeof v === 'number');

  const peBands = calculateValuationBands(peList);
  const pbBands = calculateValuationBands(pbList);

  return rawEnriched.map((d) => ({
    ...d,
    peMean: peBands.mean,
    pePlus1SD: peBands.plus1SD,
    pePlus2SD: peBands.plus2SD,
    peMinus1SD: peBands.minus1SD,
    peMinus2SD: peBands.minus2SD,
    pbMean: pbBands.mean,
    pbPlus1SD: pbBands.plus1SD,
    pbPlus2SD: pbBands.plus2SD,
    pbMinus1SD: pbBands.minus1SD,
    pbMinus2SD: pbBands.minus2SD,
  }));
}
