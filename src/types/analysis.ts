export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: 'BCTC' | 'BCTN' | 'BROKER_REPORT' | 'OTHER';
  content?: string;
}

export interface StockMarketData {
  ticker: string;
  companyName: string;
  industry: string;
  currentPrice: number;
  pe5YearMin: number;
  pe5YearMax: number;
  pe5YearAvg: number;
  peIndustry: number;
  pbIndustry: number;
  peCompetitors: { name: string; pe: number }[];
  pbCompetitors: { name: string; pb: number }[];
}

export interface SectionA {
  historyAndOverview: string;
  shareholdersAndManagement: string;
  subsidiariesAndAffiliates: string;
}

export interface SectionB {
  valueChainInput: string;
  valueChainProduction: string;
  valueChainOutput: string;
}

export interface SectionC {
  revenueHistory3Years: string;
  profitabilityMargins: string;
  financialHealthAndDebt: string;
}

export interface ValuationAssumptions {
  forecastNetProfitQ1: number;
  forecastNetProfitQ2: number;
  forecastNetProfitQ3: number;
  forecastNetProfitQ4: number;
  totalForecastProfit: number;
  sharesOutstanding: number; // Triệu cổ phiếu
  epsForward: number;
  peBase: number;
  peBull: number;
  peBear: number;
}

export interface ValuationResults {
  targetPriceBase: number;
  targetPriceBull: number;
  targetPriceBear: number;
  upsideBasePct: number;
  upsideBullPct: number;
  upsideBearPct: number;
}

export interface SectionD {
  growthDriversRevenueAndCost: string;
  quarterlyForecastReasoning: string;
  valuation: ValuationAssumptions;
}

export interface AnalysisReport {
  ticker: string;
  companyName: string;
  createdDate: string;
  sectionA: SectionA;
  sectionB: SectionB;
  sectionC: SectionC;
  sectionD: SectionD;
  marketData: StockMarketData;
}
