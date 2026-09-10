import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AnalysisReport,
  ValuationHubState,
  ValuationMethodConfig,
  PeerData,
  ValuationScenario,
} from '@/types/analysis';
import {
  ValueXSector,
  SECTOR_PRESETS,
  detectValueXSector,
  computeTargetMultiples,
  applyAutoMultiplesToMethods,
  computeMethodFairValue,
  aggregateScenarios,
  generateScenarioNarrative,
} from '@/lib/valuation-engine';
import { MethodSelector } from './valuation-hub/MethodSelector';
import { MethodDetailPanels } from './valuation-hub/MethodDetailPanels';
import { ScenarioSummary } from './valuation-hub/ScenarioSummary';
import { HistoricalValuationChart } from './valuation-hub/HistoricalValuationChart';
import { OpportunityScorecard } from './valuation-hub/OpportunityScorecard';
import { computeOpportunityScoreAC, ThesisStatus } from '@/lib/opportunity-scoring-engine';

interface ValuationHubProps {
  report: AnalysisReport;
  onUpdateReport: (updatedReport: AnalysisReport) => void;
  realQuarterlyFinancials?: any[];
  onNavigateToTab?: (tabId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H') => void;
}

export function ValuationHub({
  report,
  onUpdateReport,
  realQuarterlyFinancials = [],
  onNavigateToTab,
}: ValuationHubProps) {
  const ticker = report.ticker.trim().toUpperCase();
  const currentPrice = report.marketData?.currentPrice || 10000;

  // Lấy các chỉ số TTM Forward từ Tab F hoặc fallback
  const hasForecastData = !!(
    report.sectionForecast8Q?.ttmForward &&
    report.sectionForecast8Q.ttmForward.netProfit > 0
  );

  const ttmForward = report.sectionForecast8Q?.ttmForward;

  // Lấy Hạng và Điểm Chất lượng Tăng Trưởng từ Tab D (với đa tầng fallback)
  const growthScore =
    report.sectionD?.totalScore ||
    report.sectionForecast8Q?.baseline?.growthScore ||
    45;
  const growthTier =
    report.sectionD?.rankGrade ||
    report.sectionForecast8Q?.baseline?.growthTier ||
    (growthScore >= 55 ? 'A+' : growthScore >= 48 ? 'A' : growthScore >= 40 ? 'B+' : growthScore >= 32 ? 'B' : 'C');

  const sharesOutstanding =
    report.sectionF?.valuation?.sharesOutstanding ||
    report.sectionForecast8Q?.quarters?.[0]?.sharesOutstanding ||
    report.marketData?.sharesOutstanding ||
    1000;

  const epsForward =
    ttmForward?.eps ||
    report.sectionF?.valuation?.epsForward ||
    (currentPrice > 0 ? Math.round(currentPrice / 12) : 2500);

  const netProfitForward =
    ttmForward?.netProfit ||
    report.sectionF?.valuation?.totalForecastProfit ||
    Math.round((epsForward * sharesOutstanding) / 1000);

  const ebitdaForward =
    ttmForward?.ebitda ||
    Math.round(netProfitForward * 1.35);

  // 1. Tính Nợ Ròng từ BCTC thực tế: Vay ngắn hạn + Vay dài hạn - (Tiền & Tương đương tiền + Đầu tư ngắn hạn)
  const netDebt = useMemo(() => {
    if (realQuarterlyFinancials && realQuarterlyFinancials.length > 0) {
      const latestQ = realQuarterlyFinancials[realQuarterlyFinancials.length - 1];
      
      const rawShortDebt = Number(latestQ?.bsa67 || latestQ?.bsa65 || latestQ?.bsa66 || latestQ?.shortTermDebt || latestQ?.shortTermLoans || 0);
      const rawLongDebt = Number(latestQ?.bsa78 || latestQ?.bsa77 || latestQ?.longTermDebt || latestQ?.longTermLoans || 0);
      const rawCash = Number(latestQ?.bsa2 || latestQ?.cashAndEquivalents || 0);
      const rawSTInv = Number(latestQ?.bsa5 || latestQ?.shortTermInvestments || 0);

      let shortDebt = rawShortDebt;
      let longDebt = rawLongDebt;
      let cash = rawCash;
      let shortTermInvestments = rawSTInv;

      // Đơn vị tự động: Nếu dữ liệu thô > 1,000,000 (VND), chuyển sang Tỷ VNĐ bằng cách chia 1e9
      if (Math.abs(rawShortDebt) > 1e6 || Math.abs(rawLongDebt) > 1e6 || Math.abs(rawCash) > 1e6) {
        shortDebt = rawShortDebt / 1e9;
        longDebt = rawLongDebt / 1e9;
        cash = rawCash / 1e9;
        shortTermInvestments = rawSTInv / 1e9;
      }

      const totalCash = cash + shortTermInvestments;
      const rawNetDebt = shortDebt + longDebt - totalCash; // Tỷ VNĐ
      return Math.round(rawNetDebt);
    }
    return Math.round(netProfitForward * 0.8);
  }, [realQuarterlyFinancials, netProfitForward]);

  // CFO và CAPEX dự phóng / LTM cho DCF
  const cfoForward = useMemo(() => {
    if (ttmForward?.cfo && ttmForward.cfo !== 0) {
      return Math.round(ttmForward.cfo);
    }
    if (realQuarterlyFinancials && realQuarterlyFinancials.length >= 4) {
      const last4 = realQuarterlyFinancials.slice(-4);
      const sumLtmCfo = last4.reduce((acc, q) => {
        const val = Number(q?.cfa18 || q?.cfa20 || q?.cfo || q?.netOperatingCashFlow || 0);
        const inBillion = Math.abs(val) > 1e6 ? val / 1e9 : val;
        return acc + inBillion;
      }, 0);
      if (sumLtmCfo !== 0) return Math.round(sumLtmCfo);
    }
    return Math.round(netProfitForward * 0.8);
  }, [ttmForward?.cfo, realQuarterlyFinancials, netProfitForward]);

  const capexForward = useMemo(() => {
    if (realQuarterlyFinancials && realQuarterlyFinancials.length >= 4) {
      const last4 = realQuarterlyFinancials.slice(-4);
      const sumLtmCapex = last4.reduce((acc, q) => {
        const val = Number(q?.cfa21 || q?.capex || 0);
        const inBillion = Math.abs(val) > 1e6 ? Math.abs(val) / 1e9 : Math.abs(val);
        return acc + inBillion;
      }, 0);
      if (sumLtmCapex > 0) return Math.round(sumLtmCapex);
    }
    return Math.max(50, Math.round(cfoForward * 0.22));
  }, [realQuarterlyFinancials, cfoForward]);

  const revenueGrowthForecast = useMemo(() => {
    return ttmForward?.revenueGrowthYoY || 12;
  }, [ttmForward?.revenueGrowthYoY]);

  // State chính sách cổ tức từ Vietcap Events API
  const [dividendPolicy, setDividendPolicy] = useState<{
    annualCashDividend: number;
    payoutRatio: number;
    hasCashDividend: boolean;
  }>({
    annualCashDividend: 0,
    payoutRatio: 0,
    hasCashDividend: false,
  });

  // 2. Tính BVPS Dự Phóng dựa trên Payout Ratio thực tế từ lịch sử cổ tức
  const pbRatio = report.marketData?.pbIndustry || 1.5;
  const currentBvps = Math.round(currentPrice / (pbRatio > 0 ? pbRatio : 1.5));
  const effectivePayout =
    dividendPolicy.hasCashDividend && dividendPolicy.payoutRatio > 0
      ? dividendPolicy.payoutRatio
      : 0.35; // Mặc định 35% nếu chưa có dữ liệu sự kiện
  const bvpsForward =
    currentBvps + Math.round(((netProfitForward * (1 - effectivePayout)) / (sharesOutstanding || 1)) * 1000);

  // Nhóm ngành ValueX ban đầu tự động nhận diện theo ICB cấp 2 hoặc tên ngành
  const initialSector = useMemo(
    () =>
      detectValueXSector(
        report.marketData?.icbCodeLv2 || (report as any).icbCodeLv2 || report.marketData?.icbCode,
        report.marketData?.sectorType || report.industry
      ),
    [
      report.marketData?.icbCodeLv2,
      (report as any).icbCodeLv2,
      report.marketData?.icbCode,
      report.marketData?.sectorType,
      report.industry,
    ]
  );

  const [sectorType, setSectorType] = useState<ValueXSector>(
    (report.sectionF?.valuationHub?.sectorType as ValueXSector) || initialSector
  );

  // Tự động đồng bộ sectorType nếu ban đầu chưa có và initialSector phát hiện được từ ICB
  useEffect(() => {
    if (!report.sectionF?.valuationHub?.sectorType && initialSector) {
      setSectorType(initialSector);
    }
  }, [initialSector, report.sectionF?.valuationHub?.sectorType]);

  // State các phương pháp định giá
  const [methods, setMethods] = useState<ValuationMethodConfig[]>(() => {
    if (report.sectionF?.valuationHub?.methods && report.sectionF.valuationHub.methods.length > 0) {
      return report.sectionF.valuationHub.methods;
    }
    const preset = SECTOR_PRESETS[initialSector] || SECTOR_PRESETS['CÔNG NGHIỆP_SẢN XUẤT'];
    return preset.defaultMethods.map((dm) => ({
      method: dm.method,
      name: dm.name,
      role: dm.role,
      weight: dm.weight,
      targetBear: Number((dm.defaultTargetBase * 0.8).toFixed(1)),
      targetBase: Number(dm.defaultTargetBase.toFixed(1)),
      targetBull: Number((dm.defaultTargetBase * 1.25).toFixed(1)),
      fairValueBear: 0,
      fairValueBase: 0,
      fairValueBull: 0,
    }));
  });

  // State thống kê lịch sử và peers từ API
  const [historicalStats, setHistoricalStats] = useState<any>(
    report.sectionF?.valuationHub?.historicalStats || { validQuarters: 0 }
  );
  const [peerStats, setPeerStats] = useState<PeerData[]>(
    report.sectionF?.valuationHub?.peerStats || []
  );
  const [peerMedians, setPeerMedians] = useState<any>(
    report.sectionF?.valuationHub?.peerMedians || null
  );
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [isLoadingPriceHistory, setIsLoadingPriceHistory] = useState(false);

  // Xác suất 3 kịch bản (mặc định 20 / 55 / 25)
  const [probabilities, setProbabilities] = useState({
    bear: report.sectionF?.valuationHub?.bear?.probability || 20,
    base: report.sectionF?.valuationHub?.base?.probability || 55,
    bull: report.sectionF?.valuationHub?.bull?.probability || 25,
  });

  // Custom narratives
  const [narratives, setNarratives] = useState<{
    bear: string;
    base: string;
    bull: string;
  }>({
    bear: report.sectionF?.valuationHub?.bear?.narrative || '',
    base: report.sectionF?.valuationHub?.base?.narrative || '',
    bull: report.sectionF?.valuationHub?.bull?.narrative || '',
  });

  // State Trạng thái Luận điểm Đầu tư & Điều chỉnh thủ công Điểm Cơ Hội (Mục A & C)
  const [thesisStatus, setThesisStatus] = useState<ThesisStatus>(
    (report.sectionF?.valuationHub?.opportunityScorecard?.thesisStatus as ThesisStatus) || 'INTACT'
  );
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, { overrideScore?: number; reason?: string }>
  >(
    report.sectionF?.valuationHub?.opportunityScorecard?.manualOverrides || {}
  );

  // 1. Fetch dữ liệu thống kê lịch sử P/E, P/B, Top 3 peers theo ICB Level 4 và Lịch sử giá
  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      setIsLoadingStats(true);
      setIsLoadingPriceHistory(true);
      try {
        const icb4 = report.marketData?.icbCodeLv4 || (report as any).icbCodeLv4 || '';
        const icb2 = report.marketData?.icbCodeLv2 || (report as any).icbCodeLv2 || report.marketData?.icbCode || '';
        const peersUrl = `/api/stocks/${ticker}/peers?icbCodeLv4=${encodeURIComponent(icb4)}&icbCodeLv2=${encodeURIComponent(icb2)}`;

        const [statsRes, peersRes, priceRes] = await Promise.all([
          fetch(`/api/stocks/${ticker}/valuation-stats`),
          fetch(peersUrl),
          fetch(`/api/stocks/${ticker}/price-history`),
        ]);

        let loadedStats: any = null;
        let loadedMedians: any = null;

        if (statsRes.ok && isMounted) {
          const statsJson = await statsRes.json();
          if (statsJson && !statsJson.error) {
            loadedStats = {
              peMean: statsJson.pe?.mean,
              peMedian: statsJson.pe?.median,
              peStd: statsJson.pe?.std,
              peMinus1Sigma: statsJson.pe?.minus1Sigma,
              pePlus1Sigma: statsJson.pe?.plus1Sigma,
              pbMean: statsJson.pb?.mean,
              pbMedian: statsJson.pb?.median,
              pbStd: statsJson.pb?.std,
              pbMinus1Sigma: statsJson.pb?.minus1Sigma,
              pbPlus1Sigma: statsJson.pb?.plus1Sigma,
              validQuarters: statsJson.validQuarters || 0,
              quarterlySeries: statsJson.quarterlySeries || [],
            };
            setHistoricalStats(loadedStats);

            if (statsJson.dividendPolicy) {
              setDividendPolicy({
                annualCashDividend: statsJson.dividendPolicy.annualCashDividend || 0,
                payoutRatio: statsJson.dividendPolicy.payoutRatio || 0,
                hasCashDividend: !!statsJson.dividendPolicy.hasCashDividend,
              });
            }
          }
        }

        if (peersRes.ok && isMounted) {
          const peersJson = await peersRes.json();
          if (peersJson && !peersJson.error) {
            setPeerStats(peersJson.peers || []);
            loadedMedians = peersJson.medians || null;
            setPeerMedians(loadedMedians);
          }
        }

        if (priceRes.ok && isMounted) {
          const priceJson = await priceRes.json();
          if (priceJson && Array.isArray(priceJson.history)) {
            setPriceHistory(priceJson.history);
          }
        }

        // Tự động điền Hệ số mục tiêu (Target Multiples) từ 20 quý thực tế và Hạng Tăng Trưởng Tab D
        if (isMounted && loadedStats?.validQuarters > 0) {
          setMethods((prevMethods) => {
            return applyAutoMultiplesToMethods(prevMethods, {
              historicalStats: loadedStats,
              growthTier,
              peerMedians: loadedMedians,
              currentPrice,
            });
          });
        }
      } catch (err) {
        console.warn('[ValuationHub] Could not load API stats or price history:', err);
      } finally {
        if (isMounted) {
          setIsLoadingStats(false);
          setIsLoadingPriceHistory(false);
        }
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [ticker, report.marketData?.icbCodeLv4, report.marketData?.icbCodeLv2, growthTier, currentPrice]);

  // 2. Xử lý khi người dùng đổi nhóm ngành -> cập nhật preset phương pháp và tự động điền bội số
  const handleSectorChange = (newSector: ValueXSector) => {
    setSectorType(newSector);
    const preset = SECTOR_PRESETS[newSector] || SECTOR_PRESETS['CÔNG NGHIỆP_SẢN XUẤT'];

    const newMethods = preset.defaultMethods.map((dm) => ({
      method: dm.method,
      name: dm.name,
      role: dm.role,
      weight: dm.weight,
      targetBear: Number((dm.defaultTargetBase * 0.8).toFixed(1)),
      targetBase: Number(dm.defaultTargetBase.toFixed(1)),
      targetBull: Number((dm.defaultTargetBase * 1.25).toFixed(1)),
      fairValueBear: 0,
      fairValueBase: 0,
      fairValueBull: 0,
    }));

    // Tự động điền lại bội số mục tiêu từ 20 quý lịch sử nếu có
    const autoMethods = applyAutoMultiplesToMethods(newMethods, {
      historicalStats,
      growthTier,
      peerMedians,
      currentPrice,
    });

    setMethods(autoMethods);
  };

  // 3. Tính toán lại Fair Value của từng phương pháp mỗi khi target hoặc inputs thay đổi
  const computedMethods: ValuationMethodConfig[] = useMemo(() => {
    return methods.map((m) => {
      if (m.role === 'DISABLED') return m;
      const fv = computeMethodFairValue(m, {
        epsForward,
        ebitdaForward,
        netDebt,
        sharesOutstanding,
        bvpsForward,
        currentPrice,
        cfoForward,
        capexForward,
        netProfitForward,
        revenueGrowthForecast,
      });
      return {
        ...m,
        fairValueBear: fv.bear,
        fairValueBase: fv.base,
        fairValueBull: fv.bull,
      };
    });
  }, [
    methods,
    epsForward,
    ebitdaForward,
    netDebt,
    sharesOutstanding,
    bvpsForward,
    currentPrice,
    cfoForward,
    capexForward,
    netProfitForward,
    revenueGrowthForecast,
  ]);

  // 4. Tổng hợp 3 kịch bản Bear/Base/Bull
  const scenarioResults = useMemo(() => {
    return aggregateScenarios(computedMethods, currentPrice, probabilities);
  }, [computedMethods, currentPrice, probabilities]);

  // Cập nhật narrative mặc định nếu chưa có
  const finalNarratives = useMemo(() => {
    return {
      bear:
        narratives.bear ||
        generateScenarioNarrative({
          scenario: 'BEAR',
          ticker,
          fairValue: scenarioResults.bear.fairValue,
          updownPct: scenarioResults.bear.updownPct,
          methods: computedMethods,
          inputs: { epsForward, growthTier },
        }),
      base:
        narratives.base ||
        generateScenarioNarrative({
          scenario: 'BASE',
          ticker,
          fairValue: scenarioResults.base.fairValue,
          updownPct: scenarioResults.base.updownPct,
          methods: computedMethods,
          inputs: { epsForward, growthTier },
        }),
      bull:
        narratives.bull ||
        generateScenarioNarrative({
          scenario: 'BULL',
          ticker,
          fairValue: scenarioResults.bull.fairValue,
          updownPct: scenarioResults.bull.updownPct,
          methods: computedMethods,
          inputs: { epsForward, growthTier },
        }),
    };
  }, [narratives, ticker, scenarioResults, computedMethods, epsForward, growthTier]);

  // 5. Tính Điểm Cơ Hội Đầu Tư: Mục A (Định giá & Biên an toàn 40đ) và Mục C (Rủi ro / Luận điểm 25đ)
  const opportunityScoreResult = useMemo(() => {
    return computeOpportunityScoreAC({
      baseUpsidePct: scenarioResults.base.updownPct,
      bearDownsidePct: scenarioResults.bear.updownPct,
      rrRatio: scenarioResults.rrRatio,
      dispersion: scenarioResults.dispersion,
      currentPe: currentPrice > 0 && epsForward > 0 ? Number((currentPrice / epsForward).toFixed(1)) : 15,
      medianPe: historicalStats?.peMedian,
      peerMedianPe: peerMedians?.pe,
      currentPb: currentPrice > 0 && bvpsForward > 0 ? Number((currentPrice / bvpsForward).toFixed(2)) : 1.5,
      medianPb: historicalStats?.pbMedian,
      growthTier,
      netDebt,
      annualCashDividend: dividendPolicy.annualCashDividend,
      payoutRatio: dividendPolicy.payoutRatio,
      bvpsForward,
      currentPrice,
      adtvBillion: report.marketData?.adtv1MonthBillion,
      thesisStatus,
      manualOverrides,
    });
  }, [
    scenarioResults.base.updownPct,
    scenarioResults.bear.updownPct,
    scenarioResults.rrRatio,
    scenarioResults.dispersion,
    currentPrice,
    epsForward,
    historicalStats?.peMedian,
    historicalStats?.pbMedian,
    peerMedians?.pe,
    bvpsForward,
    growthTier,
    netDebt,
    dividendPolicy.annualCashDividend,
    dividendPolicy.payoutRatio,
    report.marketData?.adtv1MonthBillion,
    thesisStatus,
    manualOverrides,
  ]);

  const handleUpdateOverride = (id: string, overrideScore?: number, reason?: string) => {
    setManualOverrides((prev) => {
      const next = { ...prev };
      if (overrideScore === undefined) {
        delete next[id];
      } else {
        next[id] = { overrideScore, reason };
      }
      return next;
    });
  };

  const handleResetOverrides = () => {
    setManualOverrides({});
  };

  // 6. Đồng bộ state lên report qua debounce (500ms) để tránh re-render lặp
  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const hubState: ValuationHubState = {
        sectorType,
        currentPrice,
        sharesOutstanding,
        netDebt,
        methods: computedMethods,
        peerStats,
        peerMedians,
        historicalStats,
        bear: {
          ...scenarioResults.bear,
          narrative: finalNarratives.bear,
        },
        base: {
          ...scenarioResults.base,
          narrative: finalNarratives.base,
        },
        bull: {
          ...scenarioResults.bull,
          narrative: finalNarratives.bull,
        },
        rrRatio: scenarioResults.rrRatio,
        dispersion: scenarioResults.dispersion,
        expectedValue: scenarioResults.expectedValue,
        opportunityScorecard: {
          thesisStatus,
          manualOverrides,
          scoreA: opportunityScoreResult.sectionA.totalScore,
          scoreC: opportunityScoreResult.sectionC.totalScore,
        },
        lastUpdated: new Date().toISOString(),
      };

      onUpdateReport({
        ...report,
        sectionF: {
          ...report.sectionF,
          valuationHub: hubState,
          valuation: {
            ...report.sectionF.valuation,
            peBear: computedMethods.find((m) => m.method === 'P_E')?.targetBear || 8,
            peBase: computedMethods.find((m) => m.method === 'P_E')?.targetBase || 12,
            peBull: computedMethods.find((m) => m.method === 'P_E')?.targetBull || 16,
            epsForward,
            sharesOutstanding,
          },
        },
        valuationHub: hubState,
      });
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    sectorType,
    currentPrice,
    sharesOutstanding,
    netDebt,
    computedMethods,
    peerStats,
    peerMedians,
    historicalStats,
    scenarioResults,
    finalNarratives,
    opportunityScoreResult,
    thesisStatus,
    manualOverrides,
  ]);

  // Handlers
  const handleUpdateMethodConfig = (updated: ValuationMethodConfig) => {
    setMethods((prev) => prev.map((m) => (m.method === updated.method ? updated : m)));
  };

  const handleUpdateProbability = (probs: { bear: number; base: number; bull: number }) => {
    setProbabilities(probs);
  };

  const handleUpdateNarrative = (scenario: 'bear' | 'base' | 'bull', text: string) => {
    setNarratives((prev) => ({ ...prev, [scenario]: text }));
  };

  const handleResetNarrative = (scenario: 'bear' | 'base' | 'bull') => {
    const sc = scenario.toUpperCase() as 'BEAR' | 'BASE' | 'BULL';
    const autoText = generateScenarioNarrative({
      scenario: sc,
      ticker,
      fairValue:
        sc === 'BEAR'
          ? scenarioResults.bear.fairValue
          : sc === 'BASE'
          ? scenarioResults.base.fairValue
          : scenarioResults.bull.fairValue,
      updownPct:
        sc === 'BEAR'
          ? scenarioResults.bear.updownPct
          : sc === 'BASE'
          ? scenarioResults.base.updownPct
          : scenarioResults.bull.updownPct,
      methods: computedMethods,
      inputs: { epsForward, growthTier },
    });
    setNarratives((prev) => ({ ...prev, [scenario]: autoText }));
  };

  return (
    <div className="space-y-5">
      {/* 1. Điểm Cơ Hội Đầu Tư: Mục A (Định Giá & Biên An Toàn - 40đ) & Mục C (Rủi Ro / Luận Điểm - 25đ) */}
      <OpportunityScorecard
        scoreResult={opportunityScoreResult}
        thesisStatus={thesisStatus}
        onUpdateThesisStatus={setThesisStatus}
        manualOverrides={manualOverrides}
        onUpdateOverride={handleUpdateOverride}
        onResetOverrides={handleResetOverrides}
      />

      {/* 2. Phân Khu Tổng Hợp Trọng Tâm: 3 Kịch Bản, Thước Đo R/R & Biểu Đồ Giá 12 Tháng (Executive First) */}
      <ScenarioSummary
        bear={{
          ...scenarioResults.bear,
          narrative: finalNarratives.bear,
        }}
        base={{
          ...scenarioResults.base,
          narrative: finalNarratives.base,
        }}
        bull={{
          ...scenarioResults.bull,
          narrative: finalNarratives.bull,
        }}
        currentPrice={currentPrice}
        rrRatio={scenarioResults.rrRatio}
        dispersion={scenarioResults.dispersion}
        expectedValue={scenarioResults.expectedValue}
        onUpdateProbability={handleUpdateProbability}
        onUpdateNarrative={handleUpdateNarrative}
        onResetNarrative={handleResetNarrative}
        priceHistory={priceHistory}
        isLoadingPriceHistory={isLoadingPriceHistory}
        methods={computedMethods}
        inputs={{ epsForward, growthTier }}
        ticker={ticker}
      />

      {/* 3. Chi Tiết Phương Pháp Định Giá (2 Cột: Bên trái Selector & Thống kê | Bên phải Accordion tinh chỉnh) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cột Trái (5/12 = ~42%) */}
        <div className="lg:col-span-5 space-y-4">
          <MethodSelector
            sectorType={sectorType}
            onSectorChange={handleSectorChange}
            methods={computedMethods}
            onUpdateMethods={setMethods}
            historicalStats={historicalStats}
            peerStats={peerStats}
            peerMedians={peerMedians}
            isLoadingStats={isLoadingStats}
          />

          <HistoricalValuationChart
            ticker={ticker}
            quarterlySeries={historicalStats.quarterlySeries || []}
            peStats={{
              mean: historicalStats.peMean,
              median: historicalStats.peMedian,
              std: historicalStats.peStd,
              minus1Sigma: historicalStats.peMinus1Sigma,
              plus1Sigma: historicalStats.pePlus1Sigma,
            }}
            pbStats={{
              mean: historicalStats.pbMean,
              median: historicalStats.pbMedian,
              std: historicalStats.pbStd,
              minus1Sigma: historicalStats.pbMinus1Sigma,
              plus1Sigma: historicalStats.pbPlus1Sigma,
            }}
            isLoading={isLoadingStats}
          />
        </div>

        {/* Cột Phải (7/12 = ~58%) */}
        <div className="lg:col-span-7">
          <MethodDetailPanels
            methods={computedMethods}
            onUpdateMethodConfig={handleUpdateMethodConfig}
            inputs={{
              epsForward,
              ebitdaForward,
              netDebt,
              sharesOutstanding,
              bvpsForward,
              currentPrice,
              growthTier,
              cfoForward,
              capexForward,
              netProfitForward,
              revenueGrowthForecast,
            }}
            historicalStats={historicalStats}
            peerMedians={peerMedians}
          />
        </div>
      </div>
    </div>
  );
}
