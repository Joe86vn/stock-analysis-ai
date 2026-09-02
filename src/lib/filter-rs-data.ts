import {
  fetchFullVietcapData,
  fetchVietcapCompanyDetails,
  fetchVietcapRelationship,
  fetchVietcapShareholders,
  fetchVietcapStockRs,
  ParsedVietcapQuarter,
} from './vietcap-field-mapping';
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
  rsRating: number; // Chỉ số RS Rating chính thức từ Vietcap IQ (0 - 99)
  
  // Thông tin Ban lãnh đạo & Công ty liên kết
  topShareholder?: string;
  subsidiariesCount: number;
  affiliatesCount: number;
  
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

// In-memory cache for ranking items
let rankingCache: {
  timestamp: number;
  data: StockRankingItem[];
} | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

/**
 * Tính toán điểm số & chỉ số cho 1 mã cổ phiếu
 */
export async function calculateStockRankingItem(ticker: string): Promise<StockRankingItem | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  try {
    const [details, relationship, shareholders, quarters] = await Promise.all([
      fetchVietcapCompanyDetails(cleanTicker),
      fetchVietcapRelationship(cleanTicker),
      fetchVietcapShareholders(cleanTicker),
      fetchFullVietcapData(cleanTicker, { maxQuarters: 12 }),
    ]);

    if (!quarters || quarters.length === 0) {
      return null;
    }

    // Lấy RS Rating trực tiếp từ nhóm ngành của Vietcap IQ
    const icbCode = details?.icbCodeLv2 || '';
    const rsScore = await fetchVietcapStockRs(cleanTicker, icbCode);

    // 1. Chấm điểm 3 trụ cột
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
    const latestQuarterLabel = latest.year && latest.quarter ? `Q${latest.quarter}/${latest.year}` : 'Q2/2026';

    const ltmQuarters = quarters.slice(-4);
    const ltmRev = ltmQuarters.reduce((s, c) => s + (c.revenue || 0), 0);
    const ltmProf = ltmQuarters.reduce((s, c) => s + (c.netProfit || 0), 0);
    const netMargin = ltmRev > 0 ? Math.round((ltmProf / ltmRev) * 1000) / 10 : (latest.netMargin || 0);

    const topOwner = shareholders && shareholders.length > 0
      ? `${shareholders[0].ownerName} (${shareholders[0].percentage}%)`
      : undefined;

    return {
      ticker: cleanTicker,
      companyName: details?.companyNameVi || `Công ty Cổ phần ${cleanTicker}`,
      exchange: details?.exchange || 'HSX',
      industry: details?.industryVi || 'Doanh nghiệp Niêm yết',
      icbCodeLv2: details?.icbCodeLv2,
      
      currentPrice: details?.currentPrice || 0,
      adtv20Billion: details?.adtv1MonthBillion || 0,
      marketCapBillion: details?.marketCapBillion || 0,
      foreignPercentage: details?.foreignPercentage || 0,
      freeFloatPercentage: details?.freeFloatPercentage || 0,
      rsRating: rsScore !== null ? rsScore : 75,
      
      topShareholder: topOwner,
      subsidiariesCount: relationship?.subsidiaries?.length || 0,
      affiliatesCount: relationship?.affiliates?.length || 0,
      
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
  } catch (err) {
    console.error(`[Ranking] Error calculating ${cleanTicker}:`, err);
    return null;
  }
}

/**
 * Lấy danh sách xếp hạng toàn bộ 75 mã cổ phiếu, sắp xếp từ điểm cao xuống thấp
 */
export async function getFullStockRankingList(forceRefresh = false): Promise<StockRankingItem[]> {
  const now = Date.now();
  if (!forceRefresh && rankingCache && now - rankingCache.timestamp < CACHE_TTL_MS) {
    return rankingCache.data;
  }

  // Quét theo lô 6 mã đồng thời để đảm bảo tốc độ và không làm nghẽn Vietcap API
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

  // Sắp xếp tổng điểm từ cao xuống thấp (Total Score descending)
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Gán STT xếp hạng sau khi sắp xếp
  results.forEach((item, index) => {
    item.stt = index + 1;
  });

  // Lưu cache
  rankingCache = {
    timestamp: now,
    data: results,
  };

  return results;
}
