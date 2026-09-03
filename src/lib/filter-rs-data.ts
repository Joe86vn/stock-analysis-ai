import {
  fetchFullVietcapData,
  fetchVietcapCompanyDetails,
  fetchVietcapStockRs,
  ParsedVietcapQuarter,
} from './vietcap-field-mapping';
import { VietcapScreenerMatchedStock } from './vietcap-screener-service';
import { calculateFinancialHealthScore, FinancialHealthScorecardResult } from './financial-health-calculator';
import { calculateGrowthQualityScore, GrowthQualityScorecardResult } from './growth-quality-calculator';
import { calculateBusinessQualityScore, BusinessQualityScorecardResult } from './business-quality-calculator';

// Danh sách 75 mã cổ phiếu mục tiêu lấy từ filter-rs.md
export const FILTER_75_TICKERS: string[] = [
  'AAA', 'ABW', 'AIG', 'APH', 'BHN', 'BSP', 'BSR', 'CDC', 'CSM', 'DGW',
  'DHC', 'DHG', 'DNA', 'DP1', 'DRI', 'DST', 'DVP', 'DXP', 'FRT', 'GMD',
  'GVR', 'HAD', 'HII', 'HNM', 'HTL', 'HTV', 'HUB', 'ICT', 'IFS', 'KSV',
  'L10', 'LLM', 'MCF', 'MCP', 'MSR', 'MST', 'MWG', 'MZG', 'PDB', 'PGS',
  'PGV', 'PHP', 'PHR', 'PLX', 'PPH', 'PSW', 'PTS', 'PVP', 'PVS', 'PVT',
  'SAM', 'SAS', 'SBG', 'SBL', 'SCL', 'SZB', 'TCO', 'TDP', 'THD', 'TLP',
  'TMP', 'TNI', 'TT6', 'VC9', 'VCB', 'VGC', 'VGT', 'VHM', 'VNM', 'VPI',
  'VPS', 'VTE', 'VTV', 'VTZ', 'VVS'
];

// Chỉ số RS (Sức mạnh giá tương đối 6 tháng) chính thức của từng mã cổ phiếu từ filter-rs.md
export const FILTER_75_RS_MAP: Record<string, number> = {
  AAA: 71, ABW: 91, AIG: 90, APH: 87, BHN: 76, BSP: 86, BSR: 79, CDC: 89,
  CSM: 88, DGW: 90, DHC: 93, DHG: 76, DNA: 78, DP1: 78, DRI: 78, DST: 93,
  DVP: 89, DXP: 93, FRT: 97, GMD: 88, GVR: 83, HAD: 88, HII: 99, HNM: 73,
  HTL: 75, HTV: 88, HUB: 78, ICT: 72, IFS: 82, KSV: 96, L10: 80, LLM: 99,
  MCF: 73, MCP: 74, MSR: 88, MST: 97, MWG: 71, MZG: 96, PDB: 88, PGS: 95,
  PGV: 79, PHP: 95, PHR: 73, PLX: 72, PPH: 76, PSW: 71, PTS: 94, PVP: 91,
  PVS: 72, PVT: 91, SAM: 70, SAS: 80, SBG: 97, SBL: 96, SCL: 97, SZB: 87,
  TCO: 75, TDP: 91, THD: 99, TLP: 93, TMP: 93, TNI: 95, TT6: 99, VC9: 80,
  VCB: 72, VGC: 77, VGT: 71, VHM: 94, VNM: 84, VPI: 85, VPS: 89, VTE: 81,
  VTV: 81, VTZ: 70, VVS: 95,
};

export interface StockRankingItem {
  stt?: number;
  ticker: string;
  companyName: string;
  exchange: string;
  industry: string;
  icbCodeLv2?: string;
  
  // Thị trường, Định giá & Thanh khoản
  currentPrice: number;
  adtv20Billion: number; // Giá trị giao dịch khớp lệnh bình quân 1 tháng (~20 phiên) (Tỷ VNĐ)
  marketCapBillion: number;
  foreignPercentage: number;
  freeFloatPercentage: number;
  rsRating: number; // Chỉ số RS Rating của chính mã cổ phiếu (0 - 99)
  
  // Tổng điểm & Xếp loại (Thang 150)
  totalScore: number;
  maxScore: 150;
  totalPercentage: number;
  rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  rankTitle: string;
  
  // 3 Trụ cột điểm thành phần
  financialHealthScore: number; // Max 50
  growthQualityScore: number;   // Max 60
  businessQualityScore: number; // Max 40
  
  financialHealthGrade: string;
  growthQualityGrade: string;
  businessQualityGrade: string;
  
  // Các chỉ số tăng trưởng cốt lõi
  coreEpsGrowthYoY: number;      // Tăng trưởng EPS cốt lõi Q0 YoY (%)
  coreNetProfitGrowthYoY: number;// Tăng trưởng LNST cốt lõi Q0 YoY (%)
  headlineNetProfitGrowthYoY: number;
  q0RevenueGrowthYoY: number;
  
  // Các chỉ số chất lượng & khả năng sinh lời
  roic: number;
  roe: number;
  grossMargin: number;
  netMargin: number;
  netDebtToEbitda: number;
  cfoBillion: number;
  
  // Kỳ báo cáo mới nhất
  latestQuarter: string;
  updatedAt: string;
}

// In-memory cache for stock items (15 minutes TTL)
const CACHE_TTL_MS = 15 * 60 * 1000;
const stockItemCache = new Map<string, { timestamp: number; item: StockRankingItem }>();

/**
 * Tính toán điểm số & chỉ số cho 1 mã cổ phiếu
 */
export async function calculateStockRankingItem(
  ticker: string,
  matchedMeta?: VietcapScreenerMatchedStock
): Promise<StockRankingItem | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  const now = Date.now();

  // Kiểm tra cache cho từng mã
  const cached = stockItemCache.get(cleanTicker);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.item };
  }

  try {
    const [details, quarters] = await Promise.all([
      matchedMeta ? Promise.resolve(null) : fetchVietcapCompanyDetails(cleanTicker),
      fetchFullVietcapData(cleanTicker, { maxQuarters: 12 }),
    ]);

    if (!quarters || quarters.length === 0) {
      return null;
    }

    // Xác định RS Rating của cổ phiếu
    let rsRating = 75;
    if (matchedMeta && typeof matchedMeta.rs1Month === 'number' && matchedMeta.rs1Month > 0) {
      rsRating = matchedMeta.rs1Month;
    } else if (FILTER_75_RS_MAP[cleanTicker]) {
      rsRating = FILTER_75_RS_MAP[cleanTicker];
    } else {
      const liveRs = await fetchVietcapStockRs(cleanTicker, details?.icbCodeLv2);
      if (liveRs !== null && liveRs > 0) {
        rsRating = liveRs;
      }
    }

    // 1. Chấm điểm 3 trụ cột ValueX
    const healthResult: FinancialHealthScorecardResult = calculateFinancialHealthScore(quarters);
    const growthResult: GrowthQualityScorecardResult = calculateGrowthQualityScore(quarters);
    const businessResult: BusinessQualityScorecardResult = calculateBusinessQualityScore(quarters);

    const financialHealthScore = Math.round((healthResult.totalScore || 0) * 10) / 10;
    const growthQualityScore = Math.round((growthResult.totalScore || 0) * 10) / 10;
    const businessQualityScore = Math.round((businessResult.totalScore || 0) * 10) / 10;

    const totalScore = Math.round((financialHealthScore + growthQualityScore + businessQualityScore) * 10) / 10;
    const totalPercentage = Math.round((totalScore / 150) * 1000) / 10;

    // Phân loại hạng siêu cổ phiếu ValueX
    let rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' = 'D';
    let rankTitle = 'Rủi ro cao';
    if (totalScore >= 125) {
      rankGrade = 'A+';
      rankTitle = 'Siêu Cổ Phiếu Xuất Sắc — Dẫn đầu toàn diện';
    } else if (totalScore >= 110) {
      rankGrade = 'A';
      rankTitle = 'Chất lượng Vượt trội — Ưu tiên hàng đầu';
    } else if (totalScore >= 95) {
      rankGrade = 'B+';
      rankTitle = 'Tốt — Tăng trưởng & Sức khỏe ổn định';
    } else if (totalScore >= 80) {
      rankGrade = 'B';
      rankTitle = 'Khá — Cần theo dõi thêm động lực';
    } else if (totalScore >= 65) {
      rankGrade = 'C';
      rankTitle = 'Trung bình — Biên an toàn thấp';
    }

    const latest = quarters[quarters.length - 1] || ({} as ParsedVietcapQuarter);
    const latestQuarterLabel = latest.year && latest.quarter ? `Q${latest.quarter}/${latest.year}` : 'Chưa rõ';

    const ltmQuarters = quarters.slice(-4);
    const ltmRev = ltmQuarters.reduce((s, c) => s + (c.revenue || 0), 0);
    const ltmProf = ltmQuarters.reduce((s, c) => s + (c.netProfit || 0), 0);
    const netMargin = ltmRev > 0 ? Math.round((ltmProf / ltmRev) * 1000) / 10 : (latest.netMargin || 0);

    const price = matchedMeta ? matchedMeta.marketPrice : (details?.currentPrice || 0);
    const adtv = matchedMeta ? matchedMeta.adtv20Billion : (details?.adtv1MonthBillion || 0);
    const marketCapBillion = matchedMeta ? Math.round((matchedMeta.marketCap / 1_000_000_000) * 10) / 10 : (details?.marketCapBillion || 0);
    const companyName = matchedMeta?.companyNameVi || details?.companyNameVi || `Công ty Cổ phần ${cleanTicker}`;
    const exchange = matchedMeta?.exchange || details?.exchange || 'HSX';
    const industry = matchedMeta?.sectorVi || details?.industryVi || 'Doanh nghiệp Niêm yết';

    const item: StockRankingItem = {
      ticker: cleanTicker,
      companyName,
      exchange,
      industry,
      icbCodeLv2: matchedMeta?.icbCodeLv2 || details?.icbCodeLv2,
      
      currentPrice: price,
      adtv20Billion: adtv,
      marketCapBillion,
      foreignPercentage: details?.foreignPercentage || 0,
      freeFloatPercentage: details?.freeFloatPercentage || 0,
      rsRating,
      
      totalScore,
      maxScore: 150,
      totalPercentage,
      rankGrade,
      rankTitle,
      
      financialHealthScore,
      growthQualityScore,
      businessQualityScore,
      
      financialHealthGrade: healthResult.rankGrade,
      growthQualityGrade: growthResult.rankGrade,
      businessQualityGrade: businessResult.rankGrade,
      
      coreEpsGrowthYoY: Math.round((growthResult.metrics?.epsCoreGrowthYoY || growthResult.coreBridge?.coreNetProfitGrowthYoY || 0) * 10) / 10,
      coreNetProfitGrowthYoY: Math.round((growthResult.metrics?.q0CoreProfitGrowthYoY || growthResult.coreBridge?.coreNetProfitGrowthYoY || 0) * 10) / 10,
      headlineNetProfitGrowthYoY: Math.round((growthResult.metrics?.q0NetProfitGrowthYoY || growthResult.coreBridge?.headlineNetProfitGrowthYoY || 0) * 10) / 10,
      q0RevenueGrowthYoY: Math.round((growthResult.metrics?.q0RevenueGrowthYoY || 0) * 10) / 10,
      
      roic: Math.round((healthResult.metrics?.roic || latest.roic || 0) * 10) / 10,
      roe: Math.round((healthResult.metrics?.roe || latest.roe || 0) * 10) / 10,
      grossMargin: Math.round((healthResult.metrics?.grossMargin || latest.grossMargin || 0) * 10) / 10,
      netMargin,
      netDebtToEbitda: Math.round((healthResult.metrics?.netDebtToEbitda || 0) * 100) / 100,
      cfoBillion: Math.round((healthResult.metrics?.fcfBillion || 0) * 10) / 10,
      
      latestQuarter: latestQuarterLabel,
      updatedAt: new Date().toISOString(),
    };

    // Lưu vào cache
    stockItemCache.set(cleanTicker, {
      timestamp: now,
      item,
    });

    return item;
  } catch (err) {
    console.error(`[Ranking] Error calculating ${cleanTicker}:`, err);
    return null;
  }
}

/**
 * Chấm điểm danh sách cổ phiếu động bất kỳ (Dùng cho kết quả trả về từ Vietcap Screener Tầng 1)
 */
export async function scoreDynamicStockList(
  matchedList: VietcapScreenerMatchedStock[]
): Promise<StockRankingItem[]> {
  const results: StockRankingItem[] = [];
  const batchSize = 8; // Tối ưu luồng song song để xử lý danh sách lớn nhanh chóng

  for (let i = 0; i < matchedList.length; i += batchSize) {
    const batch = matchedList.slice(i, i + batchSize);
    const batchPromises = batch.map((meta) => calculateStockRankingItem(meta.ticker, meta));
    const batchResults = await Promise.all(batchPromises);

    for (const item of batchResults) {
      if (item) {
        results.push(item);
      }
    }
  }

  // Sắp xếp tổng điểm từ cao xuống thấp
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Gán STT xếp hạng
  results.forEach((item, index) => {
    item.stt = index + 1;
  });

  return results;
}

/**
 * Lấy danh sách xếp hạng toàn bộ 75 mã cổ phiếu chuẩn Q2/2026
 */
export async function getFullStockRankingList(forceRefresh = false): Promise<StockRankingItem[]> {
  const now = Date.now();
  const results: StockRankingItem[] = [];
  const batchSize = 6;

  for (let i = 0; i < FILTER_75_TICKERS.length; i += batchSize) {
    const batch = FILTER_75_TICKERS.slice(i, i + batchSize);
    const batchPromises = batch.map((ticker) => calculateStockRankingItem(ticker));
    const batchResults = await Promise.all(batchPromises);

    for (const item of batchResults) {
      if (item) {
        results.push(item);
      }
    }
  }

  // Sắp xếp tổng điểm từ cao xuống thấp
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Gán STT xếp hạng sau khi sắp xếp
  results.forEach((item, index) => {
    item.stt = index + 1;
  });

  return results;
}
