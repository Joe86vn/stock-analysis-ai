/**
 * Động Cơ Dự Phóng Biên Lợi Nhuận Thích Ứng Toàn Diện (Universal Adaptive Margin Forecasting Engine)
 * 
 * Áp dụng cho 100% mã cổ phiếu thuộc mọi nhóm ngành:
 * 1. Mùa vụ lịch sử (Seasonality Component - Sq) từ chuỗi 12 - 20 quý
 * 2. Hồi quy chu kỳ (Mean-Reversion with Damping Factor lambda) triệt tiêu đột biến
 * 3. Mức trung vị bền vững lịch sử (Historical Median Run-rate)
 * 4. Liên kết liên hoàn (Margin Cascading): Biên EBITDA và Biên LNST tỷ lệ thuận với Biên Lợi Nhuận Gộp
 */

export interface MarginConversionRatios {
  kEbitda: number; // Tỷ lệ EBITDA / Gross Profit
  kNet: number;    // Tỷ lệ Net Profit / Gross Profit
  historicalMedianGM: number;
  historicalMedianEbitdaM: number;
  historicalMedianNetM: number;
  seasonalityVector: Record<number, number>; // { 1: S1, 2: S2, 3: S3, 4: S4 }
  stdGrossMargin: number;
  trendSlope: number;
}

export interface AdaptiveForecastMarginItem {
  period: string;       // e.g. 'Q3/2026F'
  quarter: number;      // 1, 2, 3, 4
  grossMargin: number;  // %
  ebitdaMargin: number; // %
  netMargin: number;    // %
  isShockDecaying: boolean;
}

/**
 * Tính số trung vị (Median) của mảng số
 */
export function calculateMedian(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Trích xuất quý (1, 2, 3, 4) từ chuỗi period (e.g. 'Q2/2026' -> 2, 'Q3/2026F' -> 3)
 */
export function extractQuarterNumber(periodStr: string): number {
  const match = periodStr.match(/Q([1-4])/i);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * 1. Phân tích chuỗi 12 - 20 quý lịch sử để trích xuất Hệ số chuyển đổi (Conversion Ratios),
 *    Mùa vụ (Seasonality) và Độ lệch chuẩn (Std).
 */
export function analyzeHistoricalMargins(quarters: any[]): MarginConversionRatios {
  const validQuarters = (quarters || []).filter(
    (q) => q && (q.revenue > 0 || (q.grossProfit && q.grossProfit > 0) || q.grossMargin > 0)
  );

  // Fallback nếu thiếu dữ liệu lịch sử (< 4 quý)
  if (validQuarters.length < 4) {
    return {
      kEbitda: 0.65,
      kNet: 0.35,
      historicalMedianGM: 15.0,
      historicalMedianEbitdaM: 9.8,
      historicalMedianNetM: 5.2,
      seasonalityVector: { 1: 0, 2: 0, 3: 0, 4: 0 },
      stdGrossMargin: 2.0,
      trendSlope: 0,
    };
  }

  // Thu thập chuỗi tỷ số
  const gmList: number[] = [];
  const ebitdaMList: number[] = [];
  const netMList: number[] = [];
  const kEbitdaList: number[] = [];
  const kNetList: number[] = [];

  // Gom theo quý để tính mùa vụ: { 1: [...], 2: [...], 3: [...], 4: [...] }
  const quartersBySeason: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };

  validQuarters.forEach((q) => {
    const rev = q.revenue > 1e6 ? q.revenue / 1e9 : Number(q.revenue || 0);
    let gp = 0;
    if (q.grossProfit !== undefined && q.grossProfit !== null && q.grossProfit !== 0) {
      gp = q.grossProfit > 1e6 ? q.grossProfit / 1e9 : Number(q.grossProfit);
    } else if (q.cogs || q.costOfGoodsSold) {
      const cogsVal = (q.cogs || q.costOfGoodsSold) > 1e6 ? (q.cogs || q.costOfGoodsSold) / 1e9 : Number(q.cogs || q.costOfGoodsSold);
      gp = rev - Math.abs(cogsVal);
    }

    const np = q.netProfit > 1e6 ? q.netProfit / 1e9 : Number(q.netProfit || 0);
    const eb = q.ebitda ? (q.ebitda > 1e6 ? q.ebitda / 1e9 : Number(q.ebitda)) : (np > 0 ? np * 1.4 : 0);

    // Tính biên gộp chính xác của quý
    let gm = q.grossMargin;
    if (rev > 0 && gp > 0) {
      gm = (gp / rev) * 100;
    } else if (!gm || gm <= 0) {
      gm = 15.0;
    }

    let ebM = q.ebitdaMargin;
    if (rev > 0 && eb > 0) {
      ebM = (eb / rev) * 100;
    } else if (!ebM || ebM <= 0) {
      ebM = gm * 0.65;
    }

    let netM = q.netMargin;
    if (rev > 0 && np > 0) {
      netM = (np / rev) * 100;
    } else if (!netM || netM <= 0) {
      netM = gm * 0.35;
    }

    gmList.push(gm);
    ebitdaMList.push(ebM);
    netMList.push(netM);

    // Tính hệ số chuyển đổi: k = EBITDA / GP và k = Net / GP
    if (gm > 0) {
      const kE = Math.min(1.2, Math.max(0.1, ebM / gm));
      const kN = Math.min(0.9, Math.max(0.05, netM / gm));
      kEbitdaList.push(kE);
      kNetList.push(kN);
    }

    // Gán vào mùa vụ
    const qNum = q.quarter || extractQuarterNumber(q.period || 'Q1');
    if (qNum >= 1 && qNum <= 4) {
      quartersBySeason[qNum].push(gm);
    }
  });

  const medianGM = calculateMedian(gmList);
  const medianEbM = calculateMedian(ebitdaMList);
  const medianNetM = calculateMedian(netMList);
  const kEbitda = calculateMedian(kEbitdaList) || 0.65;
  const kNet = calculateMedian(kNetList) || 0.35;

  // Độ lệch chuẩn của biên gộp
  const variance = gmList.reduce((acc, val) => acc + Math.pow(val - medianGM, 2), 0) / Math.max(1, gmList.length);
  const stdGM = Math.sqrt(variance);

  // Tính vector mùa vụ S1..S4 (độ lệch trung vị của từng quý so với Median chu kỳ)
  const rawSeasonality: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let sumSeasonality = 0;

  for (let s = 1; s <= 4; s++) {
    const list = quartersBySeason[s];
    if (list && list.length > 0) {
      const qMedian = calculateMedian(list);
      // Chặn biên độ mùa vụ không vượt quá 1.5 lần độ lệch chuẩn
      const diff = Math.max(-stdGM * 1.2, Math.min(stdGM * 1.2, qMedian - medianGM));
      rawSeasonality[s] = diff;
      sumSeasonality += diff;
    }
  }

  // Chuẩn hóa vector mùa vụ để tổng bằng 0 (bảo toàn trung bình năm)
  const avgShift = sumSeasonality / 4;
  const seasonalityVector: Record<number, number> = {
    1: Math.round((rawSeasonality[1] - avgShift) * 100) / 100,
    2: Math.round((rawSeasonality[2] - avgShift) * 100) / 100,
    3: Math.round((rawSeasonality[3] - avgShift) * 100) / 100,
    4: Math.round((rawSeasonality[4] - avgShift) * 100) / 100,
  };

  // Tính xu hướng dốc (trend slope) qua hồi quy tuyến tính đơn giản (chặn trần +- 0.25%/năm)
  let trendSlope = 0;
  if (gmList.length >= 8) {
    const n = gmList.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    gmList.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });
    const rawSlope = (n * sumXY - sumX * sumY) / Math.max(1, (n * sumXX - sumX * sumX));
    // Giới hạn slope nhẹ: tối đa +- 0.08% / quý (~0.3% / năm)
    trendSlope = Math.max(-0.08, Math.min(0.08, rawSlope));
  }

  return {
    kEbitda: Math.round(kEbitda * 1000) / 1000,
    kNet: Math.round(kNet * 1000) / 1000,
    historicalMedianGM: Math.round(medianGM * 10) / 10,
    historicalMedianEbitdaM: Math.round(medianEbM * 10) / 10,
    historicalMedianNetM: Math.round(medianNetM * 10) / 10,
    seasonalityVector,
    stdGrossMargin: Math.round(stdGM * 10) / 10,
    trendSlope: Math.round(trendSlope * 1000) / 1000,
  };
}

/**
 * 2. Động cơ tính toán bộ 4 quý dự phóng (Adaptive Forecast Engine)
 *    kết hợp Mùa vụ (Seasonality) + Hồi quy (Mean-Reversion) + Liên kết liên hoàn (Margin Cascading)
 */
export function computeAdaptiveForecastMargins(params: {
  historicalQuarters: any[];
  baseQ0: {
    period: string;
    grossMargin: number;
    ebitdaMargin?: number;
    netMargin?: number;
  };
  forecastPeriods: string[]; // e.g. ['Q3/2026', 'Q4/2026', 'Q1/2027', 'Q2/2027']
}): {
  forecastMargins: AdaptiveForecastMarginItem[];
  conversionRatios: MarginConversionRatios;
} {
  const { historicalQuarters, baseQ0, forecastPeriods } = params;

  // 1. Phân tích lịch sử
  const ratios = analyzeHistoricalMargins(historicalQuarters);
  const M = ratios.historicalMedianGM;
  const q0Num = extractQuarterNumber(baseQ0.period || 'Q2');
  const q0Season = ratios.seasonalityVector[q0Num] || 0;

  // 2. Xác định Cú sốc / Đột biến tại Q0 (đã loại bỏ mùa vụ của Q0)
  const expectedQ0 = M + q0Season;
  const shockDelta = baseQ0.grossMargin - expectedQ0;

  // Hệ số suy giảm đột biến (Damping factor lambda): 45% còn lại sau mỗi quý
  const lambda = 0.45;

  // 3. Dự phóng cho 4 quý tới
  const forecastMargins: AdaptiveForecastMarginItem[] = forecastPeriods.map((periodStr, idx) => {
    const t = idx + 1; // 1, 2, 3, 4
    const qNum = extractQuarterNumber(periodStr);
    const seasonS = ratios.seasonalityVector[qNum] || 0;

    // Suy giảm độ lệch đột biến: shock * lambda^t
    const shockRemaining = shockDelta * Math.pow(lambda, t);

    // Thành phần xu hướng dài hạn nhẹ
    const trendEffect = ratios.trendSlope * t;

    // Biên gộp dự phóng = Trục neo Median + Mùa vụ quý đó + Đột biến suy giảm + Xu hướng
    let forecastedGM = M + seasonS + shockRemaining + trendEffect;

    // Cận biên an toàn (Clamping guardrail: không vượt quá +- 2.5 sigma và không âm)
    const minSafe = Math.max(1.0, M - ratios.stdGrossMargin * 2.2);
    const maxSafe = Math.min(85.0, M + ratios.stdGrossMargin * 2.2);
    forecastedGM = Math.max(minSafe, Math.min(maxSafe, forecastedGM));

    const finalGM = Math.round(forecastedGM * 10) / 10;

    // Liên kết liên hoàn: Biên EBITDA và Biên LNST tỷ lệ thuận với Biên Gộp theo hệ số k
    const finalEbitdaM = Math.max(0.5, Math.round(finalGM * ratios.kEbitda * 10) / 10);
    const finalNetM = Math.max(0.1, Math.round(finalGM * ratios.kNet * 10) / 10);

    return {
      period: periodStr.endsWith('F') ? periodStr : `${periodStr}F`,
      quarter: qNum,
      grossMargin: finalGM,
      ebitdaMargin: finalEbitdaM,
      netMargin: finalNetM,
      isShockDecaying: Math.abs(shockRemaining) > 0.3,
    };
  });

  return {
    forecastMargins,
    conversionRatios: ratios,
  };
}

/**
 * 3. Hàm liên kết liên hoàn tức thời khi người dùng điều chỉnh thủ công Biên Lợi Nhuận Gộp
 *    (One-Click Dynamic Cascading)
 */
export function cascadeMarginsFromGross(
  newGrossMargin: number,
  ratios: MarginConversionRatios
): { ebitdaMargin: number; netMargin: number } {
  const gm = Math.max(0, newGrossMargin);
  const kE = ratios.kEbitda || 0.65;
  const kN = ratios.kNet || 0.35;

  return {
    ebitdaMargin: Math.max(0.5, Math.round(gm * kE * 10) / 10),
    netMargin: Math.max(0.1, Math.round(gm * kN * 10) / 10),
  };
}
