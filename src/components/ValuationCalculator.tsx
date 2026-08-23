'use client';

import React, { useState, useEffect } from 'react';
import { ValuationAssumptions } from '@/types/analysis';
import { Calculator, Calendar } from 'lucide-react';
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
  onUpdateValuation: (newValuation: ValuationAssumptions) => void;
}

// Fallback actual quarter values if not found in history
const getActualQuarterProfitFallback = (ticker: string, period: 'Q1_2026' | 'Q2_2026') => {
  const t = ticker.toUpperCase();
  if (t === 'HPG') {
    return period === 'Q1_2026' ? 2800000000000 : 3400000000000;
  }
  if (t === 'FPT') {
    return period === 'Q1_2026' ? 2400000000000 : 2650000000000;
  }
  if (t === 'PHP') {
    return period === 'Q1_2026' ? 230000000000 : 255000000000;
  }
  return period === 'Q1_2026' ? 2000000000000 : 2200000000000;
};

// Fallback forecast values for quarters
const getDefaultQuarterProfit = (ticker: string, period: string) => {
  const t = ticker.toUpperCase();
  const cleanKey = period.replace('/', '_');
  
  if (t === 'HPG') {
    if (cleanKey.includes('Q3_2026')) return 3200000000000;
    if (cleanKey.includes('Q4_2026')) return 3600000000000;
    if (cleanKey.includes('Q1_2027')) return 3500000000000;
    if (cleanKey.includes('Q2_2027')) return 3800000000000;
    if (cleanKey.includes('Q3_2027')) return 3900000000000;
    if (cleanKey.includes('Q4_2027')) return 4200000000000;
  }
  if (t === 'FPT') {
    if (cleanKey.includes('Q3_2026')) return 2500000000000;
    if (cleanKey.includes('Q4_2026')) return 2800000000000;
    if (cleanKey.includes('Q1_2027')) return 2750000000000;
    if (cleanKey.includes('Q2_2027')) return 3000000000000;
    if (cleanKey.includes('Q3_2027')) return 3100000000000;
    if (cleanKey.includes('Q4_2027')) return 3350000000000;
  }
  if (t === 'PHP') {
    if (cleanKey.includes('Q3_2026')) return 245000000000;
    if (cleanKey.includes('Q4_2026')) return 280000000000;
    if (cleanKey.includes('Q1_2027')) return 250000000000;
    if (cleanKey.includes('Q2_2027')) return 270000000000;
    if (cleanKey.includes('Q3_2027')) return 265000000000;
    if (cleanKey.includes('Q4_2027')) return 295000000000;
  }
  
  // Generic defaults
  if (cleanKey.includes('Q3_2026')) return 2300000000000;
  if (cleanKey.includes('Q4_2026')) return 2500000000000;
  if (cleanKey.includes('Q1_2027')) return 2400000000000;
  if (cleanKey.includes('Q2_2027')) return 2600000000000;
  if (cleanKey.includes('Q3_2027')) return 2550000000000;
  if (cleanKey.includes('Q4_2027')) return 2750000000000;
  
  return 1000000000000; // 1000 Billion generic fallback
};

// Dynamically determine the latest actual quarter/year from history
const getLatestActualPeriod = (historicalQuarters: { period: string }[]) => {
  let maxQuarter = 2;
  let maxYear = 2026;
  
  historicalQuarters.forEach(q => {
    const match = q.period.match(/^Q([1-4])\/(\d{4})$/);
    if (match) {
      const quarter = parseInt(match[1]);
      const year = parseInt(match[2]);
      if (year > maxYear || (year === maxYear && quarter > maxQuarter)) {
        maxQuarter = quarter;
        maxYear = year;
      }
    }
  });
  
  return { latestQuarter: maxQuarter, latestYear: maxYear };
};

export function ValuationCalculator({
  valuation,
  currentPrice,
  ticker,
  historicalQuarters = [],
  onUpdateValuation,
}: ValuationCalculatorProps) {
  // Dynamically determine current Year (Year 1) and target Year (Year 2)
  const { latestQuarter, latestYear } = getLatestActualPeriod(historicalQuarters);
  const year1 = latestYear;
  const year2 = latestYear + 1;

  // Selected year for valuation target price calculation
  const [selectedYear, setSelectedYear] = useState<string>(year2.toString());

  // Define actual and forecast quarter keys dynamically
  const actualQuartersYear1: string[] = [];
  for (let q = 1; q <= latestQuarter; q++) {
    actualQuartersYear1.push(`Q${q}/${year1}`);
  }

  const forecastQuartersYear1: string[] = [];
  for (let q = latestQuarter + 1; q <= 4; q++) {
    forecastQuartersYear1.push(`Q${q}/${year1}`);
  }

  const forecastQuartersYear2 = [
    `Q1/${year2}`,
    `Q2/${year2}`,
    `Q3/${year2}`,
    `Q4/${year2}`
  ];

  const allForecastQuarters = [...forecastQuartersYear1, ...forecastQuartersYear2];

  // Initialize forecast local state dynamically
  const [projections, setProjections] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    allForecastQuarters.forEach(period => {
      initial[period] = getDefaultQuarterProfit(ticker, period);
    });
    return initial;
  });

  // Re-sync states when ticker changes
  useEffect(() => {
    setSelectedYear(year2.toString());
    const initial: Record<string, number> = {};
    allForecastQuarters.forEach(period => {
      initial[period] = getDefaultQuarterProfit(ticker, period);
    });
    setProjections(initial);
  }, [ticker, latestQuarter, latestYear]);

  // Helper to fetch actual quarter value from history or fallback
  const getActualQuarterValue = (periodStr: string) => {
    const found = historicalQuarters.find(item => item.period === periodStr);
    if (found) {
      // Historical data is in Trillions (e.g. 0.255), multiply by 1000B
      return Math.round(found.LNST * 1000000000000);
    }
    // Fallback if not found in history
    const match = periodStr.match(/^Q([1-4])\/(\d{4})$/);
    if (match) {
      const q = parseInt(match[1]);
      return getActualQuarterProfitFallback(ticker, `Q${q}_2026` as any);
    }
    return 100000000000;
  };

  // Calculate Aggregated Annual Net Profits
  let totalProfitYear1 = 0;
  actualQuartersYear1.forEach(period => {
    totalProfitYear1 += getActualQuarterValue(period);
  });
  forecastQuartersYear1.forEach(period => {
    totalProfitYear1 += projections[period] || 0;
  });

  let totalProfitYear2 = 0;
  forecastQuartersYear2.forEach(period => {
    totalProfitYear2 += projections[period] || 0;
  });

  const activeProfit = selectedYear === year1.toString() ? totalProfitYear1 : totalProfitYear2;
  const activeEps = Math.round(activeProfit / (valuation.sharesOutstanding * 1000000));

  // Sync to parent report whenever values change
  useEffect(() => {
    onUpdateValuation({
      ...valuation,
      forecastNetProfitQ1: totalProfitYear1, // Aggregated Year 1
      forecastNetProfitQ2: totalProfitYear2, // Aggregated Year 2
      forecastNetProfitQ3: 0,
      forecastNetProfitQ4: 0,
      totalForecastProfit: activeProfit,
      epsForward: activeEps,
    });
  }, [projections, selectedYear, totalProfitYear1, totalProfitYear2]);

  const handleInputChange = (period: string, valBillion: number) => {
    setProjections(prev => ({
      ...prev,
      [period]: valBillion * 1000000000
    }));
  };

  const handlePeChange = (field: 'peBase' | 'peBull' | 'peBear', value: number) => {
    onUpdateValuation({ ...valuation, [field]: value });
  };

  // Target prices
  const priceBase = Math.round(activeEps * valuation.peBase);
  const priceBull = Math.round(activeEps * valuation.peBull);
  const priceBear = Math.round(activeEps * valuation.peBear);

  const upsideBase = Math.round(((priceBase - currentPrice) / currentPrice) * 100);
  const upsideBull = Math.round(((priceBull - currentPrice) / currentPrice) * 100);
  const upsideBear = Math.round(((priceBear - currentPrice) / currentPrice) * 100);

  const chartData = [
    { name: 'Giá Hiện Tại', price: currentPrice, color: '#6B7280' },
    { name: `Thận Trọng (Bear)`, price: priceBear, color: '#EF4444' },
    { name: `Cơ Sở (Base)`, price: priceBase, color: '#0EA5E9' },
    { name: `Tích Cực (Bull)`, price: priceBull, color: '#10B981' },
  ];

  const formatBillion = (val: number) => (val / 1000000000).toLocaleString('vi-VN');

  return (
    <div className="rounded-2xl border border-gray-800/80 bg-[#0d1324] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-sky-400" />
          <h2 className="text-sm font-semibold text-white">
            Bộ Tính Toán Định Giá 3 Kịch Bản (D3 Interactive Calculator)
          </h2>
        </div>
        <span className="text-xs text-sky-400 font-medium">Tự động nhận diện quý &amp; tính toán động</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Projections */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-4 space-y-3.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-sky-400" />
              1. Dự báo Lợi nhuận sau thuế theo quý (Tỷ VNĐ)
            </h3>
            
            {/* Year 1 Section */}
            <div className="p-3 bg-gray-950/30 rounded-lg border border-gray-800/40 space-y-2">
              <div className="text-[10px] uppercase font-bold text-sky-400/90 flex justify-between">
                <span>Năm Tài chính {year1}</span>
                <span className="text-gray-500 font-medium">(Q1-Q{latestQuarter} Thực tế + Dự phóng)</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* Render Actuals (Readonly) */}
                {actualQuartersYear1.map(period => (
                  <div key={period}>
                    <label className="text-[9px] text-gray-500 block mb-0.5">{period.split('/')[0]} (Thực tế)</label>
                    <div className="bg-gray-800/40 rounded px-1.5 py-1 text-xs font-bold text-gray-400 border border-gray-850">
                      {formatBillion(getActualQuarterValue(period))}
                    </div>
                  </div>
                ))}
                
                {/* Render Forecast Fields */}
                {forecastQuartersYear1.map(period => (
                  <div key={period}>
                    <label className="text-[9px] text-sky-400 block mb-0.5">{period.split('/')[0]} (Dự báo)</label>
                    <input
                      type="number"
                      value={(projections[period] || 0) / 1000000000}
                      onChange={(e) => handleInputChange(period, parseFloat(e.target.value) || 0)}
                      className="w-full rounded bg-gray-800 px-1 py-0.5 text-center text-xs font-bold text-white border border-gray-700 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-300 font-semibold pt-1 border-t border-gray-800/40">
                <span>LNST Cả năm {year1} (Cộng gộp):</span>
                <span className="text-sky-400 font-bold">{formatBillion(totalProfitYear1)} tỷ VNĐ</span>
              </div>
            </div>

            {/* Year 2 Section */}
            <div className="p-3 bg-gray-950/30 rounded-lg border border-gray-800/40 space-y-2">
              <div className="text-[10px] uppercase font-bold text-emerald-400/90 flex justify-between">
                <span>Năm Tài chính {year2}</span>
                <span className="text-gray-500 font-medium">(Dự phóng 4 quý)</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {forecastQuartersYear2.map(period => (
                  <div key={period}>
                    <label className="text-[9px] text-emerald-400 block mb-0.5">{period.split('/')[0]} (Dự báo)</label>
                    <input
                      type="number"
                      value={(projections[period] || 0) / 1000000000}
                      onChange={(e) => handleInputChange(period, parseFloat(e.target.value) || 0)}
                      className="w-full rounded bg-gray-800 px-1 py-0.5 text-center text-xs font-bold text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-300 font-semibold pt-1 border-t border-gray-800/40">
                <span>LNST Cả năm {year2} (Dự phóng):</span>
                <span className="text-emerald-400 font-bold">{formatBillion(totalProfitYear2)} tỷ VNĐ</span>
              </div>
            </div>

            {/* Year Selector */}
            <div className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/80 flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-300">Cơ sở tính định giá mục tiêu:</span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setSelectedYear(year1.toString())}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                    selectedYear === year1.toString()
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Năm {year1}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedYear(year2.toString())}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                    selectedYear === year2.toString()
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Năm {year2}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-800 pt-3 text-[11px]">
              <span className="text-gray-400 font-medium">EPS Forward Năm {selectedYear}:</span>
              <span className="text-xs font-extrabold text-sky-400">
                {activeEps.toLocaleString('vi-VN')} VNĐ / cổ phiếu
              </span>
            </div>
          </div>

          {/* PE target inputs */}
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              2. Bội Số P/E Mục Tiêu (P/E Forward Multiplier)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-rose-400 font-semibold block mb-0.5">P/E Thận Trọng</label>
                <input
                  type="number"
                  step="0.1"
                  value={valuation.peBear}
                  onChange={(e) => handlePeChange('peBear', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-rose-500/30 bg-gray-800 px-2.5 py-1.5 text-xs font-bold text-rose-400 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-sky-400 font-semibold block mb-0.5">P/E Cơ Sở (Avg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={valuation.peBase}
                  onChange={(e) => handlePeChange('peBase', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-sky-500/30 bg-gray-800 px-2.5 py-1.5 text-xs font-bold text-sky-400 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-emerald-400 font-semibold block mb-0.5">P/E Tích Cực (Max)</label>
                <input
                  type="number"
                  step="0.1"
                  value={valuation.peBull}
                  onChange={(e) => handlePeChange('peBull', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-emerald-500/30 bg-gray-800 px-2.5 py-1.5 text-xs font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Target Prices & Chart */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-rose-400 block mb-0.5">Thận Trọng (Bear)</span>
              <div className="text-sm font-extrabold text-white">
                {priceBear.toLocaleString('vi-VN')} <span className="text-[9px] font-normal text-gray-400">đ</span>
              </div>
              <span className={`text-[10px] font-extrabold ${upsideBear >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBear >= 0 ? '+' : ''}{upsideBear}%
              </span>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-sky-400 block mb-0.5">Cơ Sở (Base)</span>
              <div className="text-sm font-extrabold text-white">
                {priceBase.toLocaleString('vi-VN')} <span className="text-[9px] font-normal text-gray-400">đ</span>
              </div>
              <span className={`text-[10px] font-extrabold ${upsideBase >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBase >= 0 ? '+' : ''}{upsideBase}%
              </span>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-0.5">Tích Cực (Bull)</span>
              <div className="text-sm font-extrabold text-white">
                {priceBull.toLocaleString('vi-VN')} <span className="text-[9px] font-normal text-gray-400">đ</span>
              </div>
              <span className={`text-[10px] font-extrabold ${upsideBull >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBull >= 0 ? '+' : ''}{upsideBull}%
              </span>
            </div>
          </div>

          <div className="h-64 rounded-xl border border-gray-800 bg-gray-900/40 p-3">
            <h4 className="text-[10px] font-semibold text-gray-400 mb-2">So Sánh Giá Hiện Tại & Giá Mục Tiêu {selectedYear}</h4>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={9} tickFormatter={(v) => (v / 1000).toLocaleString() + 'k'} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString('vi-VN') + ' VNĐ', 'Giá']}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px', color: '#FFF' }}
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
      </div>
    </div>
  );
}
