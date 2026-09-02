'use client';

import React, { useState, useEffect } from 'react';
import { ValuationAssumptions, ForecastQuarterData } from '@/types/analysis';
import { Calculator, Calendar, TrendingUp, Layers } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ValuationCalculatorProps {
  valuation: ValuationAssumptions;
  currentPrice: number;
  ticker: string;
  historicalQuarters?: { period: string; LNST: number }[];
  forecastReasoningText?: string;
  realQuarterlyFinancials?: any[];
  onUpdateValuation: (newValuation: ValuationAssumptions) => void;
}

// Smart parser: Extract LNST numbers directly from AI forecast reasoning text
const parseForecastNetProfitFromText = (text?: string): Record<string, number> => {
  const result: Record<string, number> = {};
  if (!text) return result;

  // Normalize text string
  const clean = text.replace(/,/g, '');

  // 1. Search for Q1/2026 (4850 Tỷ) or Q1 (4850)
  const q1_2026 = clean.match(/Q1\/(?:2026)?\s*\(?(\d{3,6})\s*(?:Tỷ|tỷ)/i) || clean.match(/Q1\s*\(?(\d{3,6})\s*(?:Tỷ|tỷ)/i);
  const q2_2026 = clean.match(/Q2\/(?:2026)?\s*\(?(\d{3,6})\s*(?:Tỷ|tỷ)/i) || clean.match(/Q2\s*\(?(\d{3,6})\s*(?:Tỷ|tỷ)/i);
  const q3_2026 = clean.match(/Q3\/(?:2026)?\s*[^.\n]*?(\d{3,6})\s*(?:Tỷ|tỷ)/i);
  const q4_2026 = clean.match(/Q4\/(?:2026)?\s*[^.\n]*?(\d{3,6})\s*(?:Tỷ|tỷ)/i);

  if (q1_2026) result['Q1/2026'] = parseFloat(q1_2026[1]);
  if (q2_2026) result['Q2/2026'] = parseFloat(q2_2026[1]);
  if (q3_2026) result['Q3/2026'] = parseFloat(q3_2026[1]);
  if (q4_2026) result['Q4/2026'] = parseFloat(q4_2026[1]);

  // 2. Search for 2027 list: Q1 (6100), Q2 (6400), Q3 (6200), Q4 (6500)
  const match2027 = clean.match(/2027[^\n]*?Q1\s*\(?(\d{3,6})[^\n]*?Q2\s*\(?(\d{3,6})[^\n]*?Q3\s*\(?(\d{3,6})[^\n]*?Q4\s*\(?(\d{3,6})/i);
  if (match2027) {
    result['Q1/2027'] = parseFloat(match2027[1]);
    result['Q2/2027'] = parseFloat(match2027[2]);
    result['Q3/2027'] = parseFloat(match2027[3]);
    result['Q4/2027'] = parseFloat(match2027[4]);
  }

  return result;
};

// Calculate revenue & gross margin based strictly on real historical data or parsed AI text
const getDefaultQuarterFinancials = (
  ticker: string,
  periodStr: string,
  parsedTextProfits: Record<string, number>,
  realQuarterlyFinancials: any[] = []
) => {
  // 1. If exact parsed profit from AI text exists for this quarter
  const parsedNetProfit = parsedTextProfits[periodStr];

  // 2. Compute averages strictly from real historical quarterly data from Vietcap IQ API
  const validReal = (realQuarterlyFinancials || []).filter((item) => item && item.revenue > 0);
  let avgRevenue = 0;
  let avgGrossMargin = 0;
  let avgNetProfit = 0;

  if (validReal.length > 0) {
    avgRevenue = Math.round(validReal.reduce((s, c) => s + (c.revenue || 0), 0) / validReal.length);
    avgNetProfit = Math.round(validReal.reduce((s, c) => s + (c.netProfit || 0), 0) / validReal.length);
    avgGrossMargin = Math.round((validReal.reduce((s, c) => s + (c.grossMargin || 0), 0) / validReal.length) * 10) / 10;
  }

  const netProfit = parsedNetProfit || avgNetProfit;
  const netMarginRatio = (avgRevenue > 0 && avgNetProfit > 0) ? (avgNetProfit / avgRevenue) : 0;
  const revenue = netMarginRatio > 0 ? Math.round(netProfit / netMarginRatio) : avgRevenue;
  const grossMargin = avgGrossMargin;

  return { revenue, grossMargin, netProfit };
};

export function getForecastYears(realQuarterlyFinancials: any[] = [], valuation?: ValuationAssumptions) {
  if (valuation?.year1 && valuation?.year2) {
    return { year1: valuation.year1, year2: valuation.year2 };
  }

  const validReal = (realQuarterlyFinancials || []).filter((q) => q && q.revenue > 0);
  if (validReal.length > 0) {
    let maxItem = validReal[0];
    validReal.forEach((item) => {
      const qNum = item.quarter || parseInt(item.period?.split('/')[0]?.replace('Q', '') || '1');
      const yNum = item.year || parseInt(item.period?.split('/')[1] || '2026');
      const maxQNum = maxItem.quarter || parseInt(maxItem.period?.split('/')[0]?.replace('Q', '') || '1');
      const maxYNum = maxItem.year || parseInt(maxItem.period?.split('/')[1] || '2026');

      if (yNum * 10 + qNum > maxYNum * 10 + maxQNum) {
        maxItem = item;
      }
    });

    const maxQNum = maxItem.quarter || parseInt(maxItem.period?.split('/')[0]?.replace('Q', '') || '1');
    const maxYNum = maxItem.year || parseInt(maxItem.period?.split('/')[1] || '2026');

    if (maxQNum === 4) {
      const year1 = maxYNum + 1;
      return { year1, year2: year1 + 1 };
    } else {
      const year1 = maxYNum;
      return { year1, year2: year1 + 1 };
    }
  }

  const currentYear = new Date().getFullYear();
  return { year1: currentYear, year2: currentYear + 1 };
}

const getQuarterFinancialsWithRealData = (
  ticker: string,
  periodStr: string,
  parsedTextProfits: Record<string, number>,
  realQuarterlyFinancials: any[] = [],
  valuation?: ValuationAssumptions
) => {
  // 1. Priority 1: Check if quarter exists in actual Vietcap IQ API historical data
  if (realQuarterlyFinancials && realQuarterlyFinancials.length > 0) {
    const found = realQuarterlyFinancials.find((q) => q.period === periodStr);
    if (found && found.revenue > 0) {
      return {
        revenue: Math.round(found.revenue),
        grossMargin: found.grossMargin || 0,
        netProfit: Math.round(found.netProfit),
      };
    }
  }

  // 2. Priority 2: Check structured AI 8-quarter forecast data
  if (valuation) {
    const { year1: y1, year2: y2 } = getForecastYears(realQuarterlyFinancials, valuation);
    const fY1 = valuation.forecastYear1Data || valuation.forecast2026;
    const fY2 = valuation.forecastYear2Data || valuation.forecast2027;

    let qData: ForecastQuarterData | undefined;
    if (periodStr.endsWith(y1.toString()) && fY1) {
      if (periodStr.startsWith('Q1')) qData = fY1.q1;
      else if (periodStr.startsWith('Q2')) qData = fY1.q2;
      else if (periodStr.startsWith('Q3')) qData = fY1.q3;
      else if (periodStr.startsWith('Q4')) qData = fY1.q4;
    } else if (periodStr.endsWith(y2.toString()) && fY2) {
      if (periodStr.startsWith('Q1')) qData = fY2.q1;
      else if (periodStr.startsWith('Q2')) qData = fY2.q2;
      else if (periodStr.startsWith('Q3')) qData = fY2.q3;
      else if (periodStr.startsWith('Q4')) qData = fY2.q4;
    }

    if (qData && (qData.revenue > 0 || qData.netProfit > 0)) {
      return {
        revenue: Math.round(qData.revenue),
        grossMargin: qData.grossMargin || 0,
        netProfit: Math.round(qData.netProfit),
      };
    }
  }

  // 3. Fallback: Use parsed text profits or historical averages
  return getDefaultQuarterFinancials(ticker, periodStr, parsedTextProfits, realQuarterlyFinancials);
};

export function ValuationCalculator({
  valuation,
  currentPrice,
  ticker,
  historicalQuarters = [],
  forecastReasoningText = '',
  realQuarterlyFinancials = [],
  onUpdateValuation,
}: ValuationCalculatorProps) {
  const { year1, year2 } = getForecastYears(realQuarterlyFinancials, valuation);

  const [selectedYear, setSelectedYear] = useState<string>(year2.toString());

  // Define quarters
  const quartersYear1 = [`Q1/${year1}`, `Q2/${year1}`, `Q3/${year1}`, `Q4/${year1}`];
  const quartersYear2 = [`Q1/${year2}`, `Q2/${year2}`, `Q3/${year2}`, `Q4/${year2}`];

  // Parse LNST from AI text
  const parsedTextProfits = parseForecastNetProfitFromText(forecastReasoningText);

  // Financial Grid State: Revenue, Gross Margin %, Net Profit per quarter
  const [financials, setFinancials] = useState<Record<string, { revenue: number; grossMargin: number; netProfit: number }>>(() => {
    const initial: Record<string, { revenue: number; grossMargin: number; netProfit: number }> = {};
    [...quartersYear1, ...quartersYear2].forEach((period) => {
      initial[period] = getQuarterFinancialsWithRealData(ticker, period, parsedTextProfits, realQuarterlyFinancials, valuation);
    });
    return initial;
  });

  // Re-sync when ticker, forecast reasoning text, realQuarterlyFinancials, or valuation change
  useEffect(() => {
    setSelectedYear(year2.toString());
    const parsed = parseForecastNetProfitFromText(forecastReasoningText);
    const initial: Record<string, { revenue: number; grossMargin: number; netProfit: number }> = {};
    [...quartersYear1, ...quartersYear2].forEach((period) => {
      initial[period] = getQuarterFinancialsWithRealData(ticker, period, parsed, realQuarterlyFinancials, valuation);
    });
    setFinancials(initial);
  }, [ticker, forecastReasoningText, realQuarterlyFinancials, valuation]);

  // Update specific field (revenue, grossMargin, netProfit) for a quarter
  const handleFinancialChange = (
    period: string,
    field: 'revenue' | 'grossMargin' | 'netProfit',
    val: number
  ) => {
    setFinancials((prev) => {
      const current = prev[period] || getDefaultQuarterFinancials(ticker, period, parsedTextProfits, realQuarterlyFinancials);
      const updated = { ...current, [field]: val };

      // Auto-recalculate Gross Profit & Net Profit if revenue or grossMargin changes (Bottom-Up Model)
      if (field === 'revenue' || field === 'grossMargin') {
        const grossProfit = updated.revenue * (updated.grossMargin / 100);
        // Calculate Net-to-Gross conversion ratio dynamically from real quarterly financials
        const validReal = (realQuarterlyFinancials || []).filter((item) => item && item.revenue > 0 && item.grossMargin > 0);
        let netToGrossRatio = 0.80;
        if (validReal.length > 0) {
          const avgGrossProfit = validReal.reduce((s, c) => s + (c.revenue * (c.grossMargin / 100)), 0) / validReal.length;
          const avgNetProfit = validReal.reduce((s, c) => s + (c.netProfit || 0), 0) / validReal.length;
          if (avgGrossProfit > 0) {
            netToGrossRatio = Math.min(1.0, Math.max(0.1, avgNetProfit / avgGrossProfit));
          }
        }
        updated.netProfit = Math.round(grossProfit * netToGrossRatio);
      }

      return {
        ...prev,
        [period]: updated,
      };
    });
  };

  const handlePeChange = (field: 'peBase' | 'peBull' | 'peBear', value: number) => {
    onUpdateValuation({ ...valuation, [field]: value });
  };

  const handleSharesChange = (val: number) => {
    onUpdateValuation({ ...valuation, sharesOutstanding: val });
  };

  // Compute Year 1 (2026) and Year 2 (2027) dồn cả năm
  const computeYearSummary = (quarters: string[]) => {
    let totalRev = 0;
    let totalGrossProfit = 0;
    let totalNetProfit = 0;
    let marginSum = 0;

    quarters.forEach((q) => {
      const f = financials[q] || getDefaultQuarterFinancials(ticker, q, parsedTextProfits, realQuarterlyFinancials);
      totalRev += f.revenue;
      const gp = f.revenue * (f.grossMargin / 100);
      totalGrossProfit += gp;
      totalNetProfit += f.netProfit;
      marginSum += f.grossMargin;
    });

    const avgGrossMargin = totalRev > 0 ? (totalGrossProfit / totalRev) * 100 : marginSum / quarters.length;

    return {
      totalRev,
      totalGrossProfit,
      totalNetProfit,
      avgGrossMargin,
    };
  };

  const summaryYear1 = computeYearSummary(quartersYear1);
  const summaryYear2 = computeYearSummary(quartersYear2);

  const activeSummary = selectedYear === year1.toString() ? summaryYear1 : summaryYear2;
  const currentQuarters = selectedYear === year1.toString() ? quartersYear1 : quartersYear2;

  // EPS = Total Net Profit (VND) / Shares Outstanding
  const activeNetProfitVnd = activeSummary.totalNetProfit * 1000000000;
  const sharesInMillions = valuation.sharesOutstanding || 5815;
  const activeEps = Math.round(activeNetProfitVnd / (sharesInMillions * 1000000));

  // Sync to parent report whenever values change
  useEffect(() => {
    onUpdateValuation({
      ...valuation,
      forecastNetProfitQ1: summaryYear1.totalNetProfit * 1000000000,
      forecastNetProfitQ2: summaryYear2.totalNetProfit * 1000000000,
      totalForecastProfit: activeNetProfitVnd,
      epsForward: activeEps,
    });
  }, [financials, selectedYear]);

  // Target prices
  const priceBase = Math.round(activeEps * valuation.peBase);
  const priceBull = Math.round(activeEps * valuation.peBull);
  const priceBear = Math.round(activeEps * valuation.peBear);

  const upsideBase = currentPrice > 0 ? Math.round(((priceBase - currentPrice) / currentPrice) * 100) : 0;
  const upsideBull = currentPrice > 0 ? Math.round(((priceBull - currentPrice) / currentPrice) * 100) : 0;
  const upsideBear = currentPrice > 0 ? Math.round(((priceBear - currentPrice) / currentPrice) * 100) : 0;

  const chartData = [
    { name: 'Giá Hiện Tại', price: currentPrice, color: '#64748B' },
    { name: 'Thận Trọng (Bear)', price: priceBear, color: '#EF4444' },
    { name: 'Cơ Sở (Base)', price: priceBase, color: '#3B82F6' },
    { name: 'Tích Cực (Bull)', price: priceBull, color: '#10B981' },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-5 shadow-sm dark:shadow-xl space-y-5 transition-colors duration-200">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
            Bộ Tính Toán Định Giá 3 Kịch Bản
          </h2>
          <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
            {ticker}
          </span>
        </div>

        {/* Year Toggle Switch */}
        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-950/60 p-1 rounded-xl border border-gray-200 dark:border-gray-800 self-start sm:self-auto">
          <span className="text-[11px] text-slate-500 dark:text-gray-400 px-2 font-medium">Năm Định Giá:</span>
          <button
            type="button"
            onClick={() => setSelectedYear(year1.toString())}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              selectedYear === year1.toString()
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Năm {year1}
          </button>
          <button
            type="button"
            onClick={() => setSelectedYear(year2.toString())}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              selectedYear === year2.toString()
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Năm {year2}
          </button>
        </div>
      </div>

      {/* Clean Tab C Style Financial Summary Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#030712]/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/80 text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
              <th className="py-3 px-4 min-w-[200px]">Chỉ Tiêu Tài Chính</th>
              {currentQuarters.map((q) => (
                <th key={q} className="py-3 px-3 text-center min-w-[100px]">
                  {q}
                </th>
              ))}
              <th className="py-3 px-4 text-center bg-blue-50 dark:bg-sky-950/30 text-blue-700 dark:text-sky-300 font-extrabold border-l border-gray-200 dark:border-gray-800 min-w-[130px]">
                Lũy Kế Cả Năm {selectedYear}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800/60 bg-transparent text-slate-800 dark:text-gray-200">
            {/* Row 1: Doanh thu thuần */}
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition">
              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap bg-gray-50/50 dark:bg-[#0b1329]/10">
                Doanh Thu Thuần (Tỷ VNĐ)
              </td>
              {currentQuarters.map((q) => {
                const val = financials[q]?.revenue || 0;
                return (
                  <td key={q} className="py-2 px-2 text-center">
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        handleFinancialChange(q, 'revenue', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-transparent text-center text-xs font-bold text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 transition"
                    />
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-extrabold text-blue-600 dark:text-sky-400 bg-blue-50/60 dark:bg-sky-950/20 border-l border-gray-200 dark:border-gray-800">
                {activeSummary.totalRev.toLocaleString('vi-VN')} Tỷ
              </td>
            </tr>

            {/* Row 2: Biên lợi nhuận gộp (%) */}
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition">
              <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-gray-300 whitespace-nowrap">
                Biên Lợi Nhuận Gộp (%)
              </td>
              {currentQuarters.map((q) => {
                const val = financials[q]?.grossMargin || 0;
                return (
                  <td key={q} className="py-2 px-2 text-center">
                    <input
                      type="number"
                      step="0.5"
                      value={val}
                      onChange={(e) =>
                        handleFinancialChange(q, 'grossMargin', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-transparent text-center text-xs font-bold text-amber-600 dark:text-amber-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1 py-1 transition"
                    />
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/10 border-l border-gray-200 dark:border-gray-800">
                {activeSummary.avgGrossMargin.toFixed(1)} %
              </td>
            </tr>

            {/* Row 3: Lợi nhuận gộp (Tỷ VNĐ) */}
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition bg-gray-50/30 dark:bg-gray-950/20">
              <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-gray-400 whitespace-nowrap">
                Lợi Nhuận Gộp (Tỷ VNĐ)
              </td>
              {currentQuarters.map((q) => {
                const item = financials[q] || getDefaultQuarterFinancials(ticker, q, parsedTextProfits);
                const gp = Math.round(item.revenue * (item.grossMargin / 100));
                return (
                  <td key={q} className="py-2.5 px-3 text-center font-medium text-slate-700 dark:text-gray-300">
                    {gp.toLocaleString('vi-VN')}
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10 border-l border-gray-200 dark:border-gray-800">
                {Math.round(activeSummary.totalGrossProfit).toLocaleString('vi-VN')} Tỷ
              </td>
            </tr>

            {/* Row 4: Lợi nhuận sau thuế (LNST) */}
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition">
              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap bg-gray-50/50 dark:bg-[#0b1329]/10">
                Lợi Nhuận Sau Thuế (Tỷ VNĐ)
              </td>
              {currentQuarters.map((q) => {
                const val = financials[q]?.netProfit || 0;
                return (
                  <td key={q} className="py-2 px-2 text-center">
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        handleFinancialChange(q, 'netProfit', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-transparent text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 transition"
                    />
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50/80 dark:bg-emerald-950/20 border-l border-gray-200 dark:border-gray-800">
                {activeSummary.totalNetProfit.toLocaleString('vi-VN')} Tỷ
              </td>
            </tr>

            {/* Row 5: EPS Forward */}
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition bg-blue-50/30 dark:bg-sky-950/10">
              <td className="py-3 px-4 font-extrabold text-blue-700 dark:text-sky-300 whitespace-nowrap">
                EPS Forward (Đồng / cổ phiếu)
              </td>
              {currentQuarters.map((q) => {
                const np = financials[q]?.netProfit || 0;
                const qEps = Math.round((np * 1000000000) / (sharesInMillions * 1000000));
                return (
                  <td key={q} className="py-3 px-3 text-center font-bold text-blue-600 dark:text-sky-400">
                    {qEps.toLocaleString('vi-VN')} đ
                  </td>
                );
              })}
              <td className="py-3 px-4 text-center font-black text-blue-700 dark:text-sky-300 text-sm bg-blue-100/70 dark:bg-sky-900/40 border-l border-gray-200 dark:border-gray-800">
                {activeEps.toLocaleString('vi-VN')} đ
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Target P/E Multipliers & Valuation Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* P/E Inputs */}
        <div className="lg:col-span-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-1.5 font-heading">
            <Layers className="h-4 w-4 text-blue-600 dark:text-sky-400" />
            Bội Số P/E Mục Tiêu (3 Kịch Bản)
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mb-1">P/E Thận Trọng</label>
              <input
                type="number"
                step="0.1"
                value={valuation.peBear}
                onChange={(e) => handlePeChange('peBear', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-rose-300 dark:border-rose-500/30 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 text-center focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-blue-600 dark:text-sky-400 font-bold block mb-1">P/E Cơ Sở (Base)</label>
              <input
                type="number"
                step="0.1"
                value={valuation.peBase}
                onChange={(e) => handlePeChange('peBase', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-blue-300 dark:border-sky-500/30 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs font-bold text-blue-600 dark:text-sky-400 text-center focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mb-1">P/E Tích Cực</label>
              <input
                type="number"
                step="0.1"
                value={valuation.peBull}
                onChange={(e) => handlePeChange('peBull', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-emerald-300 dark:border-emerald-500/30 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3 Scenario Target Price Cards */}
        <div className="lg:col-span-7 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5 p-3.5 flex flex-col justify-between text-center shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Thận Trọng (Bear)</span>
            <div>
              <div className="text-base font-black text-slate-900 dark:text-white font-heading">
                {priceBear.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400">đ</span>
              </div>
              <span className={`text-xs font-extrabold ${upsideBear >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {upsideBear >= 0 ? '+' : ''}{upsideBear}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-gray-500">P/E = {valuation.peBear}x</span>
          </div>

          <div className="rounded-xl border border-blue-200 dark:border-sky-500/30 bg-blue-50/50 dark:bg-sky-500/10 p-3.5 flex flex-col justify-between text-center shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-sky-400 block">Cơ Sở (Base)</span>
            <div>
              <div className="text-base font-black text-slate-900 dark:text-white font-heading">
                {priceBase.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400">đ</span>
              </div>
              <span className={`text-xs font-extrabold ${upsideBase >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {upsideBase >= 0 ? '+' : ''}{upsideBase}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-gray-400">P/E = {valuation.peBase}x</span>
          </div>

          <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/10 p-3.5 flex flex-col justify-between text-center shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Tích Cực (Bull)</span>
            <div>
              <div className="text-base font-black text-slate-900 dark:text-white font-heading">
                {priceBull.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400">đ</span>
              </div>
              <span className={`text-xs font-extrabold ${upsideBull >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {upsideBull >= 0 ? '+' : ''}{upsideBull}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-gray-400">P/E = {valuation.peBull}x</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 p-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-1.5 font-heading">
          <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400" />
          So Sánh Giá Hiện Tại &amp; Định Giá 3 Kịch Bản Năm {selectedYear}
        </h4>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
            <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={10} tickFormatter={(v) => (v / 1000).toLocaleString() + 'k'} />
            <Tooltip
              formatter={(val: any) => [Number(val).toLocaleString('vi-VN') + ' VNĐ', 'Giá']}
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', fontSize: '11px', color: '#FFF', borderRadius: '8px' }}
            />
            <Bar dataKey="price" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
