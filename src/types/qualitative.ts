/**
 * Qualitative Insights Data Model (Output của Stage 1 Extractor & Input cho Stage 2 Synthesizer)
 * Chuẩn đặc tả theo docs/prompt-1-extractor.md
 */

export interface CorporateOverviewSectionA {
  businessHistoryAndMilestones: string;
  operatingFootprint: string;
  keyManagementAndShareholders: string;
  majorSubsidiariesAndAffiliates: string;
  competitiveLandscapeAndMarketShare: string;
}

export interface RevenueBreakdownItem {
  segment: string;
  percentage: number;
}

export interface IndustryValueChainSectionB {
  modelDescription: string;
  inputOrFundingEngine: string;
  operationOrProductionCapacity: string;
  outputOrRevenueStreams: string;
  revenueBreakdownEstimate: RevenueBreakdownItem[];
}

export interface GrowthProjectItem {
  projectName: string;
  projectType: string;
  totalCapexOrInvestmentBillion: number;
  disbursedToDatePct: string;
  currentConstructionOrLegalProgress: string;
  expectedCommercialStart: string;
  capacityOrScaleAddition: string;
  estimatedRevenueOrProfitImpact: string;
  sourceDocument: string;
}

export interface CorporateStrategySectionD {
  agmRevenueTargetBillion: number;
  agmNetProfitTargetBillion: number;
  dividendPolicy: string;
  capitalPlansAndDilutionRisk: string;
  strategicPrioritiesFromLeadership: string;
}

export interface BrokerReportCatalysts {
  volumeDriversQ: string;
  priceAndMarginDriversP: string;
  costEfficiencyDriversC: string;
}

export interface BrokerReportThesis {
  brokerName: string;
  reportDate: string;
  reportTitle: string;
  targetPrice: number;
  recommendation: string;
  keyThesis: string;
  catalysts: BrokerReportCatalysts;
  forecastAssumptions: string;
  downsideRisks: string;
}

export interface BrokerConsensusSectionE {
  reportsAnalyzed: BrokerReportThesis[];
  consensusSummary: string;
}

export interface OneOffItemsAndCoreEarnings {
  recentOneOffItems: string;
  coreEarningsDrivers: string;
}

export interface CapitalStructureChanges {
  esopOrNewShareIssuance: string;
  convertibleBondsOrWarrants: string;
  estimatedFullyDilutedSharesMillion: number;
}

export interface RiskFactors {
  industryAndMacroRisks: string;
  companySpecificRisks: string;
  executionRisks: string;
}

export interface EarningsQualityAndRisksSectionF {
  oneOffItemsAndCoreEarnings: OneOffItemsAndCoreEarnings;
  capitalStructureChanges: CapitalStructureChanges;
  riskFactors: RiskFactors;
}

export interface QualitativeInsights {
  ticker: string;
  analyzedAt: string; // YYYY-MM-DD
  industryModel: string;
  icbCodeLv2?: string;
  documentSources: string[];

  sectionA_CorporateOverview: CorporateOverviewSectionA;
  sectionB_IndustrySpecificValueChain: IndustryValueChainSectionB;
  sectionC_GrowthProjectsAndExpansion: GrowthProjectItem[];
  sectionD_CorporateStrategyAndAGM: CorporateStrategySectionD;
  sectionE_BrokerConsensusAndTheses: BrokerConsensusSectionE;
  sectionF_EarningsQualityAndRisks: EarningsQualityAndRisksSectionF;
}

export interface QualitativeStatusResponse {
  hasData: boolean;
  ticker: string;
  analyzedAt?: string;
  industryModel?: string;
  documentSources?: string[];
  totalProjects?: number;
  totalBrokerReports?: number;
}
