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
import {
  getRankingsFromStorage,
  putRankingsToStorage,
  getFundamentalScoresFromStorage,
  putFundamentalScoresToStorage,
} from './r2-storage';

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
  refPrice?: number;
  priceChangePercent?: number; // ROC% trong phiên (% so với giá tham chiếu)
  priceChange?: number; // Thay đổi giá tuyệt đối (+/- VNĐ)
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

/**
 * CẢI TIẾN 2: Bóc tách cấu trúc Điểm Cơ Bản (Fundamental Score) theo BCTC Quý
 * Điểm số này cố định theo từng Quý (3 tháng) và được tái sử dụng để tính siêu tốc.
 */
export interface StockFundamentalScore {
  ticker: string;
  latestQuarter: string;
  totalScore: number;
  maxScore: 150;
  totalPercentage: number;
  rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  rankTitle: string;
  financialHealthScore: number;
  growthQualityScore: number;
  businessQualityScore: number;
  financialHealthGrade: string;
  growthQualityGrade: string;
  businessQualityGrade: string;
  coreEpsGrowthYoY: number;
  coreNetProfitGrowthYoY: number;
  headlineNetProfitGrowthYoY: number;
  q0RevenueGrowthYoY: number;
  roic: number;
  roe: number;
  grossMargin: number;
  netMargin: number;
  netDebtToEbitda: number;
  cfoBillion: number;
  calculatedAt: string;
}

// ============================================================================
// CẢI TIẾN 4: PERSISTENT IN-MEMORY CACHE (TẬN DỤNG 24GB RAM VPS ORACLE)
// ============================================================================

// 1. RAM Cache cho Điểm Cơ Bản (Fundamental Scores Map)
const globalFundamentalScores = new Map<string, StockFundamentalScore>();
let isFundamentalScoresLoaded = false;

// 2. RAM Cache cho Bảng Xếp Hạng Hoàn Chỉnh (Precomputed Rankings)
let globalPrecomputedRankings: StockRankingItem[] | null = null;
let globalPrecomputedTimestamp = 0;
const PRECOMPUTED_RAM_TTL_MS = 60 * 60 * 1000; // 1 giờ trong RAM trước khi re-check SSD

// In-memory cache cho từng item cổ phiếu (15 minutes TTL)
const CACHE_TTL_MS = 15 * 60 * 1000;
const stockItemCache = new Map<string, { timestamp: number; item: StockRankingItem }>();

/**
 * Nạp Bản đồ Điểm Cơ Bản từ SSD NVMe / R2 vào RAM VPS
 */
export async function ensureFundamentalScoresLoaded(): Promise<Map<string, StockFundamentalScore>> {
  if (isFundamentalScoresLoaded && globalFundamentalScores.size > 0) {
    return globalFundamentalScores;
  }
  try {
    const fromStorage = await getFundamentalScoresFromStorage();
    if (fromStorage && typeof fromStorage === 'object') {
      for (const [t, score] of Object.entries(fromStorage)) {
        if (score && (score as StockFundamentalScore).ticker) {
          globalFundamentalScores.set(t.toUpperCase(), score as StockFundamentalScore);
        }
      }
      isFundamentalScoresLoaded = true;
    }
  } catch (err) {
    console.warn('[Ranking] Could not load fundamental scores from storage:', err);
  }
  return globalFundamentalScores;
}

/**
 * Lấy Bảng Xếp Hạng Đã Tính Sẵn (Precomputed Rankings) từ RAM VPS hoặc SSD NVMe (< 1ms)
 */
export async function getPrecomputedRankings(maxAgeHours = 24): Promise<StockRankingItem[] | null> {
  const now = Date.now();
  // 1. Kiểm tra RAM cache trước (0ms)
  if (globalPrecomputedRankings && globalPrecomputedRankings.length > 0 && (now - globalPrecomputedTimestamp < PRECOMPUTED_RAM_TTL_MS)) {
    return globalPrecomputedRankings;
  }

  // 2. Đọc từ SSD NVMe (< 1ms) / R2
  try {
    const list = await getRankingsFromStorage('latest', maxAgeHours);
    if (list && Array.isArray(list) && list.length > 0) {
      globalPrecomputedRankings = list as StockRankingItem[];
      globalPrecomputedTimestamp = now;
      return globalPrecomputedRankings;
    }
  } catch (err) {
    console.warn('[Rankings] Error loading precomputed rankings:', err);
  }

  return null;
}

/**
 * Lưu trữ Bảng Xếp Hạng Đã Tính Sẵn vào cả RAM VPS, SSD NVMe và Cloudflare R2
 */
export async function savePrecomputedRankings(rankings: StockRankingItem[]): Promise<void> {
  globalPrecomputedRankings = rankings;
  globalPrecomputedTimestamp = Date.now();
  await putRankingsToStorage(rankings, 'latest');
}

/**
 * CẢI TIẾN 2: Tính toán & Bóc tách Điểm Cơ Bản 3 Trụ Cột ValueX (150đ) theo BCTC Quý
 */
export async function calculateStockFundamentalScore(
  ticker: string,
  providedQuarters?: ParsedVietcapQuarter[]
): Promise<StockFundamentalScore | null> {
  const cleanTicker = ticker.trim().toUpperCase();

  try {
    const quarters = providedQuarters && providedQuarters.length > 0
      ? providedQuarters
      : await fetchFullVietcapData(cleanTicker, { maxQuarters: 12 });

    if (!quarters || quarters.length === 0) {
      return null;
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
      rankTitle = 'Siêu Cổ Phiếu Xuất Sắc: Dẫn đầu toàn diện';
    } else if (totalScore >= 110) {
      rankGrade = 'A';
      rankTitle = 'Chất lượng Vượt trội: Ưu tiên hàng đầu';
    } else if (totalScore >= 95) {
      rankGrade = 'B+';
      rankTitle = 'Tốt: Tăng trưởng & Sức khỏe ổn định';
    } else if (totalScore >= 80) {
      rankGrade = 'B';
      rankTitle = 'Khá: Cần theo dõi thêm động lực';
    } else if (totalScore >= 65) {
      rankGrade = 'C';
      rankTitle = 'Trung bình: Biên an toàn thấp';
    }

    const latest = quarters[quarters.length - 1] || ({} as ParsedVietcapQuarter);
    const latestQuarterLabel = latest.year && latest.quarter ? `Q${latest.quarter}/${latest.year}` : 'Chưa rõ';

    const ltmQuarters = quarters.slice(-4);
    const ltmRev = ltmQuarters.reduce((s, c) => s + (c.revenue || 0), 0);
    const ltmProf = ltmQuarters.reduce((s, c) => s + (c.netProfit || 0), 0);
    const netMargin = ltmRev > 0 ? Math.round((ltmProf / ltmRev) * 1000) / 10 : (latest.netMargin || 0);

    const score: StockFundamentalScore = {
      ticker: cleanTicker,
      latestQuarter: latestQuarterLabel,
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
      calculatedAt: new Date().toISOString(),
    };

    // Cập nhật RAM Cache
    globalFundamentalScores.set(cleanTicker, score);
    return score;
  } catch (err) {
    console.error(`[Fundamental] Error calculating ${cleanTicker}:`, err);
    return null;
  }
}

/**
 * Tính toán điểm số & chỉ số cho 1 mã cổ phiếu (Kết hợp Điểm Cơ Bản + Giá/RS Phiên)
 */
export async function calculateStockRankingItem(
  ticker: string,
  matchedMeta?: VietcapScreenerMatchedStock,
  forceRefresh = false
): Promise<StockRankingItem | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  const now = Date.now();

  // Kiểm tra cache item ngắn hạn
  if (!forceRefresh) {
    const cached = stockItemCache.get(cleanTicker);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return { ...cached.item };
    }
  }

  try {
    // Đảm bảo RAM Cache điểm cơ bản đã nạp
    await ensureFundamentalScoresLoaded();

    // 1. Lấy Điểm Cơ Bản: Kiểm tra trong RAM trước (< 0.1ms)
    let fundamental = !forceRefresh ? globalFundamentalScores.get(cleanTicker) : null;
    if (!fundamental) {
      fundamental = await calculateStockFundamentalScore(cleanTicker);
      if (!fundamental) {
        return null;
      }
    }

    // 2. Lấy Thông tin Doanh nghiệp & Giá/Khối lượng phiên
    const details = matchedMeta ? null : await fetchVietcapCompanyDetails(cleanTicker);

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

    const price = matchedMeta ? matchedMeta.marketPrice : (details?.currentPrice || 0);
    const refPrice = matchedMeta?.refPrice || 0;
    const priceChangePercent = matchedMeta && typeof matchedMeta.dailyPriceChangePercent === 'number'
      ? matchedMeta.dailyPriceChangePercent
      : (refPrice > 0 ? Math.round(((price - refPrice) / refPrice) * 10000) / 100 : 0);
    const priceChange = matchedMeta && refPrice > 0 ? (price - refPrice) : 0;
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
      refPrice,
      priceChangePercent,
      priceChange,
      adtv20Billion: adtv,
      marketCapBillion,
      foreignPercentage: details?.foreignPercentage || 0,
      freeFloatPercentage: details?.freeFloatPercentage || 0,
      rsRating,
      
      totalScore: fundamental.totalScore,
      maxScore: 150,
      totalPercentage: fundamental.totalPercentage,
      rankGrade: fundamental.rankGrade,
      rankTitle: fundamental.rankTitle,
      
      financialHealthScore: fundamental.financialHealthScore,
      growthQualityScore: fundamental.growthQualityScore,
      businessQualityScore: fundamental.businessQualityScore,
      
      financialHealthGrade: fundamental.financialHealthGrade,
      growthQualityGrade: fundamental.growthQualityGrade,
      businessQualityGrade: fundamental.businessQualityGrade,
      
      coreEpsGrowthYoY: fundamental.coreEpsGrowthYoY,
      coreNetProfitGrowthYoY: fundamental.coreNetProfitGrowthYoY,
      headlineNetProfitGrowthYoY: fundamental.headlineNetProfitGrowthYoY,
      q0RevenueGrowthYoY: fundamental.q0RevenueGrowthYoY,
      
      roic: fundamental.roic,
      roe: fundamental.roe,
      grossMargin: fundamental.grossMargin,
      netMargin: fundamental.netMargin,
      netDebtToEbitda: fundamental.netDebtToEbitda,
      cfoBillion: fundamental.cfoBillion,
      
      latestQuarter: fundamental.latestQuarter,
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
 * Lấy danh sách xếp hạng toàn bộ cổ phiếu thị trường (Ưu tiên đọc từ RAM/SSD Precomputed < 1ms)
 */
export async function getFullStockRankingList(forceRefresh = false): Promise<StockRankingItem[]> {
  // 1. Kiểm tra Precomputed Rankings từ RAM/SSD (< 1ms) nếu không yêu cầu ép buộc làm mới
  if (!forceRefresh) {
    const precomputed = await getPrecomputedRankings(24);
    if (precomputed && precomputed.length > 0) {
      return precomputed;
    }
  }

  // 2. Nếu cần tính toán / làm mới: Lấy danh sách cổ phiếu đạt chuẩn từ Vietcap Screener
  let candidateTickers: string[] = [];
  try {
    const { executeVietcapScreener } = await import('./vietcap-screener-service');
    const screened = await executeVietcapScreener({
      exchanges: ['HSX', 'HNX', 'UPCOM'],
      rsMin: 65,
      adtvMinBillion: 3,
    });
    if (screened && screened.length > 0) {
      candidateTickers = screened.map((s) => s.ticker).filter((t) => t && t.length === 3);
    }
  } catch (err: any) {
    console.warn('[Ranking] Vietcap Screener error, fallback to FILTER_75_TICKERS:', err.message);
  }

  // Đảm bảo có ít nhất các mã chiến lược nếu screener không trả về đủ
  if (candidateTickers.length < 30) {
    const set = new Set([...candidateTickers, ...FILTER_75_TICKERS]);
    candidateTickers = Array.from(set);
  }

  const results: StockRankingItem[] = [];
  const batchSize = 8;

  for (let i = 0; i < candidateTickers.length; i += batchSize) {
    const batch = candidateTickers.slice(i, i + batchSize);
    const batchPromises = batch.map((ticker) => calculateStockRankingItem(ticker, undefined, forceRefresh));
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

  // Lưu lại vào RAM & SSD NVMe cho các lần gọi sau
  if (results.length > 0) {
    await savePrecomputedRankings(results);
  }

  return results;
}

