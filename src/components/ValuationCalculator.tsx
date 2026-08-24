'use client';

import React, { useState, useEffect } from 'react';
import { ValuationAssumptions } from '@/types/analysis';
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

// Fallback revenue & gross margin defaults per ticker & quarter
const getDefaultQuarterFinancials = (ticker: string, periodStr: string, parsedTextProfits: Record<string, number>) => {
  const t = ticker.toUpperCase();
  const q = periodStr.split('/')[0];
  const year = periodStr.split('/')[1] || '2026';

  // Check if we parsed exact net profit from AI reasoning text
  const parsedNetProfit = parsedTextProfits[periodStr];

  let grossMargin = 18.5; // default 18.5%
  if (t === 'HPG') grossMargin = 16.5;
  if (t === 'FPT') grossMargin = 39.0;
  if (t === 'PHP') grossMargin = 41.5;
  if (t === 'SSI') grossMargin = 52.0;
  if (t === 'VCB') grossMargin = 45.0;

  let netProfit = parsedNetProfit || 2500;
  if (!parsedNetProfit) {
    if (t === 'HPG') {
      netProfit = year === '2026' ? (q === 'Q1' ? 8994 : q === 'Q2' ? 6371 : q === 'Q3' ? 5600 : 5800) : (q === 'Q1' ? 6100 : q === 'Q2' ? 6400 : q === 'Q3' ? 6200 : 6500);
    } else if (t === 'FPT') {
      netProfit = year === '2026' ? (q === 'Q1' ? 2487 : q === 'Q2' ? 2568 : q === 'Q3' ? 2800 : 3100) : (q === 'Q1' ? 3200 : q === 'Q2' ? 3400 : q === 'Q3' ? 3600 : 3800);
    } else if (t === 'PHP') {
      netProfit = year === '2026' ? (q === 'Q1' ? 311 : q === 'Q2' ? 425 : q === 'Q3' ? 265 : 290) : (q === 'Q1' ? 280 : q === 'Q2' ? 300 : q === 'Q3' ? 310 : 330);
    }
  }

  // Calculate Revenue based on Net Profit & Gross Margin (assuming Net Margin ~ 12-18%)
  const netMarginRatio = (t === 'HPG' ? 0.155 : t === 'FPT' ? 0.165 : t === 'PHP' ? 0.365 : 0.20);
  const revenue = Math.round(netProfit / netMarginRatio);

  return { revenue, grossMargin, netProfit };
};

const getQuarterFinancialsWithRealData = (
  ticker: string,
  periodStr: string,
  parsedTextProfits: Record<string, number>,
  realQuarterlyFinancials: any[] = []
) => {
  if (realQuarterlyFinancials && realQuarterlyFinancials.length > 0) {
    const found = realQuarterlyFinancials.find((q) => q.period === periodStr);
    if (found && found.revenue > 0) {
      return {
        revenue: Math.round(found.revenue),
        grossMargin: found.grossMargin || 18.5,
        netProfit: Math.round(found.netProfit),
      };
    }
  }
  return getDefaultQuarterFinancials(ticker, periodStr, parsedTextProfits);
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
  const latestYear = 2026;
  const year1 = latestYear;
  const year2 = latestYear + 1;

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
      initial[period] = getQuarterFinancialsWithRealData(ticker, period, parsedTextProfits, realQuarterlyFinancials);
    });
    return initial;
  });

  // Re-sync when ticker, forecast reasoning text, or realQuarterlyFinancials change
  useEffect(() => {
    setSelectedYear(year2.toString());
    const parsed = parseForecastNetProfitFromText(forecastReasoningText);
    const initial: Record<string, { revenue: number; grossMargin: number; netProfit: number }> = {};
    [...quartersYear1, ...quartersYear2].forEach((period) => {
      initial[period] = getQuarterFinancialsWithRealData(ticker, period, parsed, realQuarterlyFinancials);
    });
    setFinancials(initial);
  }, [ticker, forecastReasoningText, realQuarterlyFinancials]);

  // Update specific field (revenue, grossMargin, netProfit) for a quarter
  const handleFinancialChange = (
    period: string,
    field: 'revenue' | 'grossMargin' | 'netProfit',
    val: number
  ) => {
    setFinancials((prev) => {
      const current = prev[period] || getDefaultQuarterFinancials(ticker, period, parsedTextProfits);
      const updated = { ...current, [field]: val };

      // Auto-recalculate Gross Profit & Net Profit if revenue or grossMargin changes (Bottom-Up Model)
      if (field === 'revenue' || field === 'grossMargin') {
        const grossProfit = updated.revenue * (updated.grossMargin / 100);
        const t = ticker.toUpperCase();
        // Dynamic Net-to-Gross conversion ratio after SG&A, interest expense & seasonal adjustments
        const netToGrossRatio = t === 'HPG' ? 0.84 : t === 'FPT' ? 0.86 : t === 'PHP' ? 0.75 : 0.80;
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
      const f = financials[q] || getDefaultQuarterFinancials(ticker, q, parsedTextProfits);
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
    { name: 'Giá Hiện Tại', price: currentPrice, color: '#6B7280' },
    { name: 'Thận Trọng (Bear)', price: priceBear, color: '#EF4444' },
    { name: 'Cơ Sở (Base)', price: priceBase, color: '#0EA5E9' },
    { name: 'Tích Cực (Bull)', price: priceBull, color: '#10B981' },
  ];

  return (
    <div className="rounded-2xl border border-gray-800/80 bg-[#0b1329]/90 p-5 shadow-xl space-y-5">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800/80 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-sky-400" />
          <h2 className="text-sm font-bold text-white">
            Bộ Tính Toán Định Giá 3 Kịch Bản
          </h2>
          <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-500/30">
            {ticker}
          </span>
        </div>

        {/* Year Toggle Switch */}
        <div className="flex items-center space-x-2 bg-gray-950/60 p-1 rounded-xl border border-gray-800 self-start sm:self-auto">
          <span className="text-[11px] text-gray-400 px-2 font-medium">Năm Định Giá:</span>
          <button
            type="button"
            onClick={() => setSelectedYear(year1.toString())}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              selectedYear === year1.toString()
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Năm {year1}
          </button>
          <button
            type="button"
            onClick={() => setSelectedYear(year2.toString())}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              selectedYear === year2.toString()
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Năm {year2}
          </button>
        </div>
      </div>

      {/* Clean Tab C Style Financial Summary Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#030712]/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/80 text-[11px] font-bold text-gray-300 uppercase tracking-wider">
              <th className="py-3 px-4 min-w-[200px]">Chỉ Tiêu Tài Chính</th>
              {currentQuarters.map((q) => (
                <th key={q} className="py-3 px-3 text-center min-w-[100px]">
                  {q}
                </th>
              ))}
              <th className="py-3 px-4 text-center bg-sky-950/30 text-sky-300 font-extrabold border-l border-gray-800 min-w-[130px]">
                Lũy Kế Cả Năm {selectedYear}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 bg-gray-950/5 text-gray-200">
            {/* Row 1: Doanh thu thuần */}
            <tr className="hover:bg-gray-800/20 transition">
              <td className="py-2.5 px-4 font-bold text-white whitespace-nowrap bg-[#0b1329]/10">
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
                      className="w-full bg-transparent text-center text-xs font-bold text-white hover:bg-gray-800/60 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-sky-500 rounded px-1 py-1 transition"
                    />
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-extrabold text-sky-400 bg-sky-950/20 border-l border-gray-800">
                {activeSummary.totalRev.toLocaleString('vi-VN')} Tỷ
              </td>
            </tr>

            {/* Row 2: Biên lợi nhuận gộp (%) */}
            <tr className="hover:bg-gray-800/20 transition">
              <td className="py-2.5 px-4 font-semibold text-gray-300 whitespace-nowrap">
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
                      className="w-full bg-transparent text-center text-xs font-bold text-amber-300 hover:bg-gray-800/60 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1 py-1 transition"
                    />
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-extrabold text-amber-400 bg-amber-950/10 border-l border-gray-800">
                {activeSummary.avgGrossMargin.toFixed(1)} %
              </td>
            </tr>

            {/* Row 3: Lợi nhuận gộp (Tỷ VNĐ) */}
            <tr className="hover:bg-gray-800/20 transition bg-gray-950/20">
              <td className="py-2.5 px-4 font-semibold text-gray-400 whitespace-nowrap">
                Lợi Nhuận Gộp (Tỷ VNĐ)
              </td>
              {currentQuarters.map((q) => {
                const item = financials[q] || getDefaultQuarterFinancials(ticker, q, parsedTextProfits);
                const gp = Math.round(item.revenue * (item.grossMargin / 100));
                return (
                  <td key={q} className="py-2.5 px-3 text-center font-medium text-gray-300">
                    {gp.toLocaleString('vi-VN')}
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-bold text-emerald-400 bg-emerald-950/10 border-l border-gray-800">
                {Math.round(activeSummary.totalGrossProfit).toLocaleString('vi-VN')} Tỷ
              </td>
            </tr>

            {/* Row 4: Lợi nhuận sau thuế (LNST) */}
            <tr className="hover:bg-gray-800/20 transition">
              <td className="py-2.5 px-4 font-bold text-white whitespace-nowrap bg-[#0b1329]/10">
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
                      className="w-full bg-transparent text-center text-xs font-bold text-emerald-400 hover:bg-gray-800/60 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 transition"
                    />
                  </td>
                );
              })}
              <td className="py-2.5 px-4 text-center font-black text-emerald-400 text-sm bg-emerald-950/20 border-l border-gray-800">
                {activeSummary.totalNetProfit.toLocaleString('vi-VN')} Tỷ
              </td>
            </tr>

            {/* Row 5: EPS Forward */}
            <tr className="hover:bg-gray-800/20 transition bg-sky-950/10">
              <td className="py-3 px-4 font-extrabold text-sky-300 whitespace-nowrap">
                EPS Forward (Đồng / cổ phiếu)
              </td>
              {currentQuarters.map((q) => {
                const np = financials[q]?.netProfit || 0;
                const qEps = Math.round((np * 1000000000) / (sharesInMillions * 1000000));
                return (
                  <td key={q} className="py-3 px-3 text-center font-bold text-sky-400">
                    {qEps.toLocaleString('vi-VN')} đ
                  </td>
                );
              })}
              <td className="py-3 px-4 text-center font-black text-sky-300 text-sm bg-sky-900/40 border-l border-gray-800">
                {activeEps.toLocaleString('vi-VN')} đ
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Target P/E Multipliers & Valuation Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* P/E Inputs */}
        <div className="lg:col-span-5 rounded-xl border border-gray-800 bg-gray-950/60 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-sky-400" />
            Bội Số P/E Mục Tiêu (3 Kịch Bản)
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] text-rose-400 font-bold block mb-1">P/E Thận Trọng</label>
              <input
                type="number"
                step="0.1"
                value={valuation.peBear}
                onChange={(e) => handlePeChange('peBear', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-rose-500/30 bg-gray-900 px-2 py-1.5 text-xs font-bold text-rose-400 text-center focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-sky-400 font-bold block mb-1">P/E Cơ Sở (Base)</label>
              <input
                type="number"
                step="0.1"
                value={valuation.peBase}
                onChange={(e) => handlePeChange('peBase', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-sky-500/30 bg-gray-900 px-2 py-1.5 text-xs font-bold text-sky-400 text-center focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-emerald-400 font-bold block mb-1">P/E Tích Cực</label>
              <input
                type="number"
                step="0.1"
                value={valuation.peBull}
                onChange={(e) => handlePeChange('peBull', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-emerald-500/30 bg-gray-900 px-2 py-1.5 text-xs font-bold text-emerald-400 text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3 Scenario Target Price Cards */}
        <div className="lg:col-span-7 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 flex flex-col justify-between text-center">
            <span className="text-[10px] uppercase font-bold text-rose-400 block">Thận Trọng (Bear)</span>
            <div>
              <div className="text-base font-black text-white">
                {priceBear.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-gray-400">đ</span>
              </div>
              <span className={`text-xs font-extrabold ${upsideBear >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBear >= 0 ? '+' : ''}{upsideBear}%
              </span>
            </div>
            <span className="text-[10px] text-gray-500">P/E = {valuation.peBear}x</span>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 flex flex-col justify-between text-center">
            <span className="text-[10px] uppercase font-bold text-sky-400 block">Cơ Sở (Base)</span>
            <div>
              <div className="text-base font-black text-white">
                {priceBase.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-gray-400">đ</span>
              </div>
              <span className={`text-xs font-extrabold ${upsideBase >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBase >= 0 ? '+' : ''}{upsideBase}%
              </span>
            </div>
            <span className="text-[10px] text-gray-400">P/E = {valuation.peBase}x</span>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex flex-col justify-between text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Tích Cực (Bull)</span>
            <div>
              <div className="text-base font-black text-white">
                {priceBull.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-gray-400">đ</span>
              </div>
              <span className={`text-xs font-extrabold ${upsideBull >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBull >= 0 ? '+' : ''}{upsideBull}%
              </span>
            </div>
            <span className="text-[10px] text-gray-400">P/E = {valuation.peBull}x</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 rounded-xl border border-gray-800 bg-gray-950/40 p-3">
        <h4 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
          So Sánh Giá Hiện Tại &amp; Định Giá 3 Kịch Bản Năm {selectedYear}
        </h4>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(v) => (v / 1000).toLocaleString() + 'k'} />
            <Tooltip
              formatter={(val: any) => [Number(val).toLocaleString('vi-VN') + ' VNĐ', 'Giá']}
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px', color: '#FFF' }}
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
