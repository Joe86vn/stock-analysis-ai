/**
 * Động Cơ Dự Phóng Cầu Nối Doanh Thu Động (Dynamic Revenue Bridge Engine)
 * 
 * Xác định động 4 yếu tố điều chỉnh tăng trưởng Doanh thu liên quý (QoQ):
 * 1. Yếu tố 1: Ảnh hưởng Sản lượng % (Vòng quay Hàng tồn kho + Tăng trưởng Hàng tồn kho + Mở rộng công suất)
 * 2. Yếu tố 2: Ảnh hưởng Giá bán ASP % (Biên lợi nhuận gộp vs Median 3 năm + Đỉnh chu kỳ hàng hóa + Cung cầu/Địa chính trị/Thuế quan)
 * 3. Yếu tố 3: Ảnh hưởng Cơ cấu danh mục & Đơn đặt hàng trước % (Dịch chuyển mảng biên cao + Biến động tiền Người mua trả trước)
 * 4. Yếu tố 4: Ảnh hưởng Mùa vụ % (Phân tích chuỗi thời gian khử xu hướng trên 12 - 20 quý Doanh thu Vietcap API)
 */

import { AnalysisReport, CapacityExpansionData, ForecastQuarterMetrics } from '@/types/analysis';

export interface DynamicBridgeQuarterOutput {
  period: string; // e.g. 'Q3/2026F'
  quarterNum: number; // 1, 2, 3, 4
  impactVolumeCapacity: number; // %
  impactAverageSellingPrice: number; // %
  impactMixDemandShare: number; // %
  impactSeasonalityOther: number; // %
  revenueBridgeGrowth: number; // % Tổng QoQ = V + P + Mix + S
  rationale: {
    volume: string;
    asp: string;
    mixAndAdvances: string;
    seasonality: string;
    summary: string;
  };
}

export interface DynamicRevenueBridgeResult {
  quarters: DynamicBridgeQuarterOutput[];
  diagnostics: {
    inventoryGrowthYoY: number;
    inventoryTurnoverSpeed: number; // vòng/năm
    medianTurnoverSpeed: number;
    inventoryQuadrant: 'DEMAND_PULL' | 'INVENTORY_GLUT' | 'STOCK_OUT' | 'CONTRACTION';
    inventoryQuadrantLabel: string;
    grossMarginLatest: number;
    grossMarginMedian: number;
    grossMarginStatus: 'PEAK_CYCLE' | 'EXPANDING' | 'NORMAL' | 'COMPRESSED';
    customerAdvancesGrowth: number; // %
    seasonalityVector: Record<number, number>; // { 1: S1, 2: S2, 3: S3, 4: S4 }
  };
}

/**
 * Tính giá trị trung vị (Median) của mảng số
 */
function calculateMedian(arr: number[]): number {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].filter((x) => typeof x === 'number' && !isNaN(x)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Tính độ lệch chuẩn (Standard Deviation)
 */
function calculateStdDev(arr: number[], meanVal?: number): number {
  if (!arr || arr.length <= 1) return 1.5;
  const valid = arr.filter((x) => typeof x === 'number' && !isNaN(x));
  if (valid.length <= 1) return 1.5;
  const mean = meanVal !== undefined ? meanVal : valid.reduce((s, x) => s + x, 0) / valid.length;
  const variance = valid.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (valid.length - 1);
  return Math.sqrt(variance);
}

/**
 * Trích xuất số quý (1, 2, 3, 4) từ chuỗi period (e.g. 'Q2/2026' -> 2, 'Q3/2026F' -> 3)
 */
export function extractQuarterNumber(periodStr: string): number {
  const match = periodStr.match(/Q([1-4])/i);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * BƯỚC 1: TRÍCH XUẤT HỆ SỐ MÙA VỤ THUẦN TÚY (Sq) TỪ CHUỖI 12 - 20 QUÝ DOANH THU VIETCAP API
 * Áp dụng phân rã chuỗi thời gian (Seasonal Decomposition) khử trend dài hạn
 */
export function extractRevenueSeasonalityVector(quarters: any[]): {
  seasonalityVector: Record<number, number>;
  trendGrowth: number;
} {
  const valid = (quarters || []).filter((q) => q && q.revenue > 0);
  if (valid.length < 6) {
    return {
      seasonalityVector: { 1: 0, 2: 0, 3: 0, 4: 0 },
      trendGrowth: 3.5,
    };
  }

  // Thu thập chuỗi tốc độ tăng trưởng liên quý QoQ (%)
  const qoqList: { quarter: number; qoq: number }[] = [];
  for (let i = 1; i < valid.length; i++) {
    const prevRev = valid[i - 1].revenue > 1e6 ? valid[i - 1].revenue / 1e9 : Number(valid[i - 1].revenue);
    const currRev = valid[i].revenue > 1e6 ? valid[i].revenue / 1e9 : Number(valid[i].revenue);
    if (prevRev > 0 && currRev > 0) {
      const qoq = ((currRev - prevRev) / prevRev) * 100;
      const qNum = valid[i].quarter || extractQuarterNumber(valid[i].period || '');
      qoqList.push({ quarter: qNum, qoq });
    }
  }

  if (qoqList.length < 4) {
    return {
      seasonalityVector: { 1: 0, 2: 0, 3: 0, 4: 0 },
      trendGrowth: 3.5,
    };
  }

  // Tốc độ tăng trưởng trend trung vị dài hạn
  const allQoQValues = qoqList.map((x) => x.qoq);
  const trendGrowth = calculateMedian(allQoQValues);

  // Gom theo 4 quý để tính Median riêng từng quý
  const seasonalRaw: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
  qoqList.forEach((it) => {
    if (it.quarter >= 1 && it.quarter <= 4) {
      seasonalRaw[it.quarter].push(it.qoq);
    }
  });

  const seasonalityVector: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (let q = 1; q <= 4; q++) {
    const qVals = seasonalRaw[q];
    if (qVals.length > 0) {
      const qMedian = calculateMedian(qVals);
      // Độ lệch mùa vụ thuần túy sau khi khử trend
      let diff = qMedian - trendGrowth;
      // Clamping an toàn trong ngưỡng [-15%, +20%] để tránh nhiễu một lần
      diff = Math.max(-15, Math.min(20, diff));
      seasonalityVector[q] = Math.round(diff * 10) / 10;
    }
  }

  return { seasonalityVector, trendGrowth: Math.round(trendGrowth * 10) / 10 };
}

/**
 * BƯỚC 2: TÍNH ẢNH HƯỞNG SẢN LƯỢNG (VOLUME) TỪ VÒNG QUAY TỒN KHO + TĂNG TRƯỞNG TỒN KHO + CÔNG SUẤT MỚI
 */
export function computeVolumeImpact(
  quarters: any[],
  capacityData?: CapacityExpansionData
): {
  baseVolumeImpact: number;
  expansionImpactPerQuarter: number[];
  inventoryQuadrant: 'DEMAND_PULL' | 'INVENTORY_GLUT' | 'STOCK_OUT' | 'CONTRACTION';
  inventoryQuadrantLabel: string;
  inventoryGrowthYoY: number;
  inventoryTurnoverSpeed: number;
  medianTurnoverSpeed: number;
  rationale: string;
} {
  const valid = (quarters || []).filter((q) => q && (q.revenue > 0 || q.inventories > 0));
  const latest = valid[valid.length - 1] || {};
  const sameQuarterLastYear = valid.length >= 5 ? valid[valid.length - 5] : valid[0] || {};
  const prevQ = valid.length >= 2 ? valid[valid.length - 2] : latest;

  // 1. Tốc độ tăng trưởng Tồn kho YoY và QoQ (%)
  const latestInv = latest.inventories > 1e6 ? latest.inventories / 1e9 : Number(latest.inventories || 0);
  const yoyInv = sameQuarterLastYear.inventories > 1e6 ? sameQuarterLastYear.inventories / 1e9 : Number(sameQuarterLastYear.inventories || 0);
  const prevInv = prevQ.inventories > 1e6 ? prevQ.inventories / 1e9 : Number(prevQ.inventories || 0);

  let invGrowthYoY = 0;
  if (yoyInv > 0 && latestInv > 0) {
    invGrowthYoY = ((latestInv - yoyInv) / yoyInv) * 100;
  } else if (prevInv > 0 && latestInv > 0) {
    invGrowthYoY = ((latestInv - prevInv) / prevInv) * 100;
  }

  // 2. Vòng quay hàng tồn kho (Vòng/năm)
  const turnoverList: number[] = [];
  valid.forEach((q) => {
    let t = 0;
    if (q.inventoryDays && q.inventoryDays > 0) {
      t = 365 / q.inventoryDays;
    } else if (q.costOfGoodsSold && q.inventories) {
      const cogs = q.costOfGoodsSold > 1e6 ? q.costOfGoodsSold / 1e9 : q.costOfGoodsSold;
      const inv = q.inventories > 1e6 ? q.inventories / 1e9 : q.inventories;
      if (inv > 0) t = (Math.abs(cogs) * 4) / inv;
    }
    if (t > 0 && t < 100) turnoverList.push(t);
  });

  const latestTurnover = turnoverList.length > 0 ? turnoverList[turnoverList.length - 1] : 6.0;
  const medianTurnover = turnoverList.length > 0 ? calculateMedian(turnoverList) : 6.0;

  // 3. Phân loại 4 góc phần tư Tồn kho:
  let quadrant: 'DEMAND_PULL' | 'INVENTORY_GLUT' | 'STOCK_OUT' | 'CONTRACTION' = 'DEMAND_PULL';
  let quadrantLabel = '';
  let baseVolume = 2.0;

  if (invGrowthYoY >= 5 && latestTurnover >= medianTurnover * 0.95) {
    quadrant = 'DEMAND_PULL';
    quadrantLabel = 'Tích trữ đón sóng cầu (Hàng luân chuyển mạnh)';
    baseVolume = 3.2; // Tăng trưởng sản lượng tốt
  } else if (invGrowthYoY >= 10 && latestTurnover < medianTurnover * 0.9) {
    quadrant = 'INVENTORY_GLUT';
    quadrantLabel = 'Ứ đọng hàng hóa (Vòng quay kho chậm lại)';
    baseVolume = 0.5; // Tăng trưởng sản lượng bị kéo giảm
  } else if (invGrowthYoY < -5 && latestTurnover >= medianTurnover * 1.05) {
    quadrant = 'STOCK_OUT';
    quadrantLabel = 'Cháy hàng / Khan hiếm (Sức mua hút cạn kho)';
    baseVolume = 1.5; // Sản lượng chạm trần ngắn hạn, động lực dồn sang tăng giá
  } else if (invGrowthYoY < -5 && latestTurnover < medianTurnover) {
    quadrant = 'CONTRACTION';
    quadrantLabel = 'Thu hẹp quy mô hoạt động';
    baseVolume = -0.5;
  } else {
    quadrant = 'DEMAND_PULL';
    quadrantLabel = 'Tồn kho và luân chuyển ổn định';
    baseVolume = 2.2;
  }

  // 4. Mở rộng công suất mới (CIP / Factory Expansion):
  const expansionQuarters = [0, 0, 0, 0];
  if (capacityData?.hasNewFactory) {
    const newCap = capacityData.newDesignCapacity || 0;
    const oldCap = capacityData.existingDesignCapacity || 1;
    const expansionRatio = oldCap > 0 && newCap > 0 ? (newCap / oldCap) * 100 : 0;

    // Phân bổ gia tốc sản lượng theo 4 quý COD
    if (expansionRatio > 0) {
      expansionQuarters[0] = Math.round(Math.min(3.5, expansionRatio * 0.15) * 10) / 10; // Q1 chạy thử
      expansionQuarters[1] = Math.round(Math.min(5.0, expansionRatio * 0.25) * 10) / 10; // Q2 thương mại
      expansionQuarters[2] = Math.round(Math.min(6.5, expansionRatio * 0.35) * 10) / 10; // Q3 tăng tốc
      expansionQuarters[3] = Math.round(Math.min(4.5, expansionRatio * 0.25) * 10) / 10; // Q4 ổn định nền
    }
  }

  const rationale = `${quadrantLabel} (HTK tăng trưởng ${invGrowthYoY > 0 ? '+' : ''}${invGrowthYoY.toFixed(1)}%, Vòng quay ${latestTurnover.toFixed(1)} vòng/năm vs Median ${medianTurnover.toFixed(1)} vòng)`;

  return {
    baseVolumeImpact: baseVolume,
    expansionImpactPerQuarter: expansionQuarters,
    inventoryQuadrant: quadrant,
    inventoryQuadrantLabel: quadrantLabel,
    inventoryGrowthYoY: Math.round(invGrowthYoY * 10) / 10,
    inventoryTurnoverSpeed: Math.round(latestTurnover * 10) / 10,
    medianTurnoverSpeed: Math.round(medianTurnover * 10) / 10,
    rationale,
  };
}

/**
 * BƯỚC 3: TÍNH ẢNH HƯỞNG GIÁ BÁN ASP TỪ BIÊN GỘP, ĐỈNH CHU KỲ & CUNG CẦU / THUẾ QUAN
 */
export function computeASPImpact(
  quarters: any[],
  report: AnalysisReport
): {
  baseAspImpact: number;
  aspDampingSchedule: number[];
  grossMarginLatest: number;
  grossMarginMedian: number;
  grossMarginStatus: 'PEAK_CYCLE' | 'EXPANDING' | 'NORMAL' | 'COMPRESSED';
  rationale: string;
} {
  const valid = (quarters || []).filter((q) => q && q.grossMargin !== undefined);
  const gmList = valid.map((q) => Number(q.grossMargin)).filter((m) => !isNaN(m) && m > 0);

  const latestGM = gmList.length > 0 ? gmList[gmList.length - 1] : 15.0;
  const medianGM = gmList.length > 0 ? calculateMedian(gmList) : 15.0;
  const stdGM = calculateStdDev(gmList, medianGM);

  let status: 'PEAK_CYCLE' | 'EXPANDING' | 'NORMAL' | 'COMPRESSED' = 'NORMAL';
  let baseAsp = 1.0;
  const dampingSchedule = [0, 0, 0, 0];
  let rationale = '';

  // 1. Kiểm tra Đỉnh chu kỳ hàng hóa (Commodity Peak Cycle):
  if (latestGM >= medianGM + 1.5 * stdGM && latestGM >= 20.0) {
    status = 'PEAK_CYCLE';
    baseAsp = -0.5;
    // Áp dụng hồi quy hạ nhiệt ASP dần qua 4 quý
    dampingSchedule[0] = 0.5;
    dampingSchedule[1] = -0.5;
    dampingSchedule[2] = -1.5;
    dampingSchedule[3] = -2.0;
    rationale = `Biên gộp hiện tại (${latestGM.toFixed(1)}%) ở vùng đỉnh chu kỳ lịch sử (Median ${medianGM.toFixed(1)}% + 1.5σ). Kích hoạt cơ chế hạ nhiệt ASP theo chu kỳ hàng hóa.`;
  } else if (latestGM > medianGM + 0.5 * stdGM) {
    status = 'EXPANDING';
    baseAsp = 1.6;
    dampingSchedule[0] = 1.5;
    dampingSchedule[1] = 1.8;
    dampingSchedule[2] = 1.6;
    dampingSchedule[3] = 1.2;
    rationale = `Biên gộp đang mở rộng tích cực (${latestGM.toFixed(1)}% vs Median ${medianGM.toFixed(1)}%), năng lực định giá (Pricing Power) vững chắc cho phép tiếp tục duy trì ASP tốt.`;
  } else if (latestGM < medianGM - 0.5 * stdGM) {
    status = 'COMPRESSED';
    baseAsp = 0.4;
    dampingSchedule[0] = 0.5;
    dampingSchedule[1] = 0.6;
    dampingSchedule[2] = 0.8;
    dampingSchedule[3] = 1.0;
    rationale = `Biên gộp đang chịu áp lực cạnh tranh / giá vốn cao (${latestGM.toFixed(1)}% vs Median ${medianGM.toFixed(1)}%). ASP phục hồi chậm dần.`;
  } else {
    status = 'NORMAL';
    baseAsp = 1.0;
    dampingSchedule[0] = 1.0;
    dampingSchedule[1] = 1.2;
    dampingSchedule[2] = 1.4;
    dampingSchedule[3] = 1.0;
    rationale = `Biên gộp vận hành quanh mức trung vị cân bằng (${latestGM.toFixed(1)}% vs Median ${medianGM.toFixed(1)}%). Giá bán duy trì đà trượt giá ổn định theo lạm phát ngành.`;
  }

  // 2. Hiệu chỉnh Catalyst Vĩ mô / Cung cầu / Thuế quan (nếu có trong sectionCatalysts):
  const catalysts = report.sectionCatalysts?.catalystList || [];
  const hasFavorableTariffOrSupplyShortage = catalysts.some(
    (c) =>
      c.status === 'on_track' &&
      (c.name?.toLowerCase().includes('thuế') ||
        c.name?.toLowerCase().includes('khan hiếm') ||
        c.name?.toLowerCase().includes('cung') ||
        c.name?.toLowerCase().includes('giá bán'))
  );

  if (hasFavorableTariffOrSupplyShortage && status !== 'PEAK_CYCLE') {
    dampingSchedule[0] += 0.4;
    dampingSchedule[1] += 0.5;
    dampingSchedule[2] += 0.3;
    rationale += ' (Được hỗ trợ thêm bởi yếu tố thắt chặt nguồn cung / chính sách bảo hộ thương mại).';
  }

  return {
    baseAspImpact: baseAsp,
    aspDampingSchedule: dampingSchedule.map((v) => Math.round(v * 10) / 10),
    grossMarginLatest: Math.round(latestGM * 10) / 10,
    grossMarginMedian: Math.round(medianGM * 10) / 10,
    grossMarginStatus: status,
    rationale,
  };
}

/**
 * BƯỚC 4: TÍNH ẢNH HƯỞNG CƠ CẤU DANH MỤC & ĐƠN ĐẶT HÀNG TRƯỚC (CUSTOMER ADVANCES)
 * Kết hợp: Dịch chuyển danh mục sản phẩm (Thuyết minh BCTC) + Tiền khách hàng cọc trước (Bảng CĐKT)
 */
export function computeMixAndAdvancesImpact(
  quarters: any[],
  report: AnalysisReport
): {
  mixSchedule: number[];
  customerAdvancesGrowth: number;
  advancesImpact: number;
  segmentMixImpact: number;
  rationale: string;
} {
  const valid = (quarters || []).filter((q) => q && q.customerAdvances !== undefined);
  const latest = valid[valid.length - 1] || {};
  const prevQ = valid.length >= 2 ? valid[valid.length - 2] : latest;

  const latestAdv = latest.customerAdvances > 1e6 ? latest.customerAdvances / 1e9 : Number(latest.customerAdvances || 0);
  const prevAdv = prevQ.customerAdvances > 1e6 ? prevQ.customerAdvances / 1e9 : Number(prevQ.customerAdvances || 0);

  // 1. Tốc độ tăng trưởng Tiền người mua trả trước (Customer Advances)
  let advancesGrowth = 0;
  if (prevAdv > 0 && latestAdv > 0) {
    advancesGrowth = ((latestAdv - prevAdv) / prevAdv) * 100;
  }

  let advancesBonus = 0.4;
  let advancesText = '';

  if (advancesGrowth >= 15.0) {
    advancesBonus = 1.0;
    advancesText = `Tiền người mua trả trước tăng vọt (+${advancesGrowth.toFixed(1)}%), xác nhận khách hàng tích cực đặt cọc đơn hàng`;
  } else if (advancesGrowth >= 0) {
    advancesBonus = 0.5;
    advancesText = `Tiền cọc duy trì ổn định (+${advancesGrowth.toFixed(1)}%)`;
  } else if (advancesGrowth < -15.0) {
    advancesBonus = -0.3;
    advancesText = `Tiền cọc sụt giảm (${advancesGrowth.toFixed(1)}%) cho thấy khách hàng thận trọng hơn`;
  } else {
    advancesBonus = 0.2;
    advancesText = `Tiền cọc điều chỉnh nhẹ (${advancesGrowth.toFixed(1)}%)`;
  }

  // 2. Dịch chuyển cơ cấu danh mục mảng mới (Segment Mix Shift):
  const ticker = (report.ticker || '').toUpperCase();
  let segmentBonus = 0.6;
  let segmentText = 'Dịch chuyển cơ cấu danh mục sang mảng sản phẩm có giá trị gia tăng cao';

  if (ticker === 'DGW') {
    segmentBonus = 0.7;
    segmentText = 'Mảng Thiết bị gia dụng & Thiết bị văn phòng biên cao tăng trưởng nhanh hơn mảng di động';
  } else if (ticker === 'FPT') {
    segmentBonus = 0.9;
    segmentText = 'Mảng Chuyển đổi số (AI, Cloud, Automotive) tăng tỷ trọng trong tổng doanh thu';
  } else if (ticker === 'HPG') {
    segmentBonus = 0.8;
    segmentText = 'Tăng tỷ trọng Thép cuộn cán nóng HRC và thép chế tạo chất lượng cao';
  } else if (ticker === 'PNJ') {
    segmentBonus = 0.9;
    segmentText = 'Tỷ trọng mảng vàng trang sức bán lẻ biên cao tiếp tục mở rộng so với vàng miếng';
  }

  const baseTotalMix = Math.round((segmentBonus + advancesBonus) * 10) / 10;
  const mixSchedule = [
    baseTotalMix,
    Math.round((baseTotalMix * 1.1) * 10) / 10,
    Math.round((baseTotalMix * 1.2) * 10) / 10,
    Math.round((baseTotalMix * 0.9) * 10) / 10,
  ];

  const rationale = `${segmentText} (+${segmentBonus}%) kết hợp ${advancesText} (+${advancesBonus}%).`;

  return {
    mixSchedule,
    customerAdvancesGrowth: Math.round(advancesGrowth * 10) / 10,
    advancesImpact: advancesBonus,
    segmentMixImpact: segmentBonus,
    rationale,
  };
}

/**
 * HÀM TỔNG HỢP CHÍNH: TẠO 4 QUÝ DỰ PHÓNG CẦU NỐI DOANH THU ĐỘNG CHO TOÀN BỘ MÃ NGÀNH
 */
export function generateDynamicRevenueBridgeQuarters({
  historicalQuarters,
  report,
  capacityData,
  forecastPeriods,
}: {
  historicalQuarters: any[];
  report: AnalysisReport;
  capacityData?: CapacityExpansionData;
  forecastPeriods: string[];
}): DynamicRevenueBridgeResult {
  // 1. Phân rã Mùa vụ
  const { seasonalityVector } = extractRevenueSeasonalityVector(historicalQuarters);

  // 2. Phân tích Sản lượng & Tồn kho
  const volAnalysis = computeVolumeImpact(historicalQuarters, capacityData);

  // 3. Phân tích Giá bán ASP
  const aspAnalysis = computeASPImpact(historicalQuarters, report);

  // 4. Phân tích Cơ cấu danh mục & Đơn hàng trước
  const mixAnalysis = computeMixAndAdvancesImpact(historicalQuarters, report);

  // 5. Lắp ghép cho 4 quý tới
  const quarters: DynamicBridgeQuarterOutput[] = forecastPeriods.slice(0, 4).map((period, idx) => {
    const qNum = extractQuarterNumber(period);
    const s_q = seasonalityVector[qNum] !== undefined ? seasonalityVector[qNum] : 0;

    // Sản lượng = Nền hữu cơ + Tăng dần theo chu kỳ + Mở rộng công suất
    const cycleVolStep = [0, 0.4, 0.7, 0.2][idx] || 0;
    const vol_q = Math.round((volAnalysis.baseVolumeImpact + cycleVolStep + (volAnalysis.expansionImpactPerQuarter[idx] || 0)) * 10) / 10;

    // Giá bán ASP = Theo tiến độ hồi quy chu kỳ
    const asp_q = aspAnalysis.aspDampingSchedule[idx] !== undefined ? aspAnalysis.aspDampingSchedule[idx] : 1.0;

    // Cơ cấu danh mục & Cọc
    const mix_q = mixAnalysis.mixSchedule[idx] !== undefined ? mixAnalysis.mixSchedule[idx] : 1.0;

    // Tổng tăng trưởng Cầu nối liên quý QoQ
    const totalQoQ = Math.round((vol_q + asp_q + mix_q + s_q) * 10) / 10;

    const quarterRationale = {
      volume: `Sản lượng (${vol_q >= 0 ? '+' : ''}${vol_q}%): ${volAnalysis.rationale}${volAnalysis.expansionImpactPerQuarter[idx] > 0 ? ` + Đóng góp từ nhà máy/dự án mới (+${volAnalysis.expansionImpactPerQuarter[idx]}%)` : ''}`,
      asp: `Giá bán ASP (${asp_q >= 0 ? '+' : ''}${asp_q}%): ${aspAnalysis.rationale}`,
      mixAndAdvances: `Cơ cấu & Tiền cọc (+${mix_q}%): ${mixAnalysis.rationale}`,
      seasonality: `Mùa vụ (${s_q >= 0 ? '+' : ''}${s_q}%): Phân rã chuỗi chu kỳ quý ${qNum} quá khứ (khử trend)`,
      summary: `Tăng trưởng QoQ ${totalQoQ >= 0 ? '+' : ''}${totalQoQ}% = Sản lượng (${vol_q >= 0 ? '+' : ''}${vol_q}%) + Giá bán (${asp_q >= 0 ? '+' : ''}${asp_q}%) + Cơ cấu (+${mix_q}%) + Mùa vụ (${s_q >= 0 ? '+' : ''}${s_q}%)`,
    };

    return {
      period: `${period}F`,
      quarterNum: qNum,
      impactVolumeCapacity: vol_q,
      impactAverageSellingPrice: asp_q,
      impactMixDemandShare: mix_q,
      impactSeasonalityOther: s_q,
      revenueBridgeGrowth: totalQoQ,
      rationale: quarterRationale,
    };
  });

  return {
    quarters,
    diagnostics: {
      inventoryGrowthYoY: volAnalysis.inventoryGrowthYoY,
      inventoryTurnoverSpeed: volAnalysis.inventoryTurnoverSpeed,
      medianTurnoverSpeed: volAnalysis.medianTurnoverSpeed,
      inventoryQuadrant: volAnalysis.inventoryQuadrant,
      inventoryQuadrantLabel: volAnalysis.inventoryQuadrantLabel,
      grossMarginLatest: aspAnalysis.grossMarginLatest,
      grossMarginMedian: aspAnalysis.grossMarginMedian,
      grossMarginStatus: aspAnalysis.grossMarginStatus,
      customerAdvancesGrowth: mixAnalysis.customerAdvancesGrowth,
      seasonalityVector,
    },
  };
}
