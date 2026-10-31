export type NewsImpact = 'positive' | 'neutral' | 'negative';

export interface MacroNewsItem {
  id: string;
  title: string;
  content: string;
  impact: NewsImpact;
  source?: string;
  metric?: string; // Ví dụ: 'DXY: 104.2 (-0.3%)' hoặc 'Dầu Brent: $74.5/thùng (+1.2%)'
}

export interface MarketIndexOverview {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  totalVolume: number; // Triệu cp
  totalValue: number; // Tỷ đồng
  advances: number;
  declines: number;
  noChange: number;
}

export interface StockFlowItem {
  symbol: string;
  netValueBillion: number; // Tỷ đồng
  price?: number;
  percentChange?: number;
}

export interface StockInfluenceItem {
  symbol: string;
  pointContribution: number;
  percentChange: number;
}

export interface ValuationStat {
  peCurrent: number;
  peAvg5Y: number;
  pbCurrent: number;
  pbAvg5Y: number;
  evaluation: 'Hấp dẫn' | 'Hợp lý' | 'Định giá cao';
  summary: string;
}

export interface CorporateNewsItem {
  id: string;
  symbol?: string;
  headline: string;
  summary: string;
  impact: NewsImpact;
  date?: string;
}

export interface MarketEventItem {
  id: string;
  date: string;
  symbol: string;
  content: string;
  type: 'Cổ tức' | 'ĐHCĐ' | 'GDKHQ' | 'Phái sinh' | 'Sự kiện khác';
}

export interface WatchlistStockItem {
  symbol: string;
  catalyst: string;
  action: 'Mua gom' | 'Theo dõi' | 'Nắm giữ' | 'Chốt lời';
  targetPrice?: string;
}

export interface MarketStrategy {
  trend: 'Tăng trưởng' | 'Điều chỉnh tích lũy' | 'Thận trọng' | 'Phục hồi';
  supportZone: string;
  resistanceZone: string;
  commentary: string;
  actionRecommendation: string;
}

export interface MorningBriefBrand {
  teamName: string;
  hotline: string;
  email: string;
  website: string;
}

export interface MorningBriefData {
  id: string;
  title: string;
  date: string; // DD/MM/YYYY
  time: string; // HH:mm AM/PM
  brand: MorningBriefBrand;
  marketStrategy: MarketStrategy;
  macroInternational: MacroNewsItem[];
  macroDomestic: MacroNewsItem[];
  marketOverview: MarketIndexOverview;
  secondaryIndices?: {
    hnx?: { price: number; change: number; percentChange: number; totalValue: number };
    upcom?: { price: number; change: number; percentChange: number; totalValue: number };
  };
  foreignFlow: {
    netTotalBillion: number;
    topBuy: StockFlowItem[];
    topSell: StockFlowItem[];
  };
  proprietaryFlow: {
    netTotalBillion: number;
    topBuy: StockFlowItem[];
    topSell: StockFlowItem[];
  };
  marketInfluence: {
    topGainers: StockInfluenceItem[];
    topLosers: StockInfluenceItem[];
  };
  valuation: ValuationStat;
  corporateNews: CorporateNewsItem[];
  marketEvents: MarketEventItem[];
  watchlist: WatchlistStockItem[];
  disclaimer: string;
  lastUpdated?: string;
}

