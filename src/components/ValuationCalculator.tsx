'use client';

import React from 'react';
import { ValuationAssumptions, StockMarketData } from '@/types/analysis';
import { Calculator, TrendingUp, ShieldAlert, Award, RefreshCw } from 'lucide-react';
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
  onUpdateValuation: (newValuation: ValuationAssumptions) => void;
}

export function ValuationCalculator({
  valuation,
  currentPrice,
  onUpdateValuation,
}: ValuationCalculatorProps) {
  const handleNetProfitChange = (field: keyof ValuationAssumptions, value: number) => {
    const updated = { ...valuation, [field]: value };
    const totalProfit =
      updated.forecastNetProfitQ1 +
      updated.forecastNetProfitQ2 +
      updated.forecastNetProfitQ3 +
      updated.forecastNetProfitQ4;
    const epsForward = Math.round(totalProfit / (updated.sharesOutstanding * 1000000));
    onUpdateValuation({
      ...updated,
      totalForecastProfit: totalProfit,
      epsForward,
    });
  };

  const handlePeChange = (field: 'peBase' | 'peBull' | 'peBear', value: number) => {
    onUpdateValuation({ ...valuation, [field]: value });
  };

  // Target prices
  const priceBase = Math.round(valuation.epsForward * valuation.peBase);
  const priceBull = Math.round(valuation.epsForward * valuation.peBull);
  const priceBear = Math.round(valuation.epsForward * valuation.peBear);

  const upsideBase = Math.round(((priceBase - currentPrice) / currentPrice) * 100);
  const upsideBull = Math.round(((priceBull - currentPrice) / currentPrice) * 100);
  const upsideBear = Math.round(((priceBear - currentPrice) / currentPrice) * 100);

  const chartData = [
    { name: 'Giá Hiện Tại', price: currentPrice, color: '#6B7280' },
    { name: 'Thận Trọng (Bear)', price: priceBear, color: '#EF4444' },
    { name: 'Cơ Sở (Base)', price: priceBase, color: '#0EA5E9' },
    { name: 'Tích Cực (Bull)', price: priceBull, color: '#10B981' },
  ];

  const formatBillion = (val: number) => (val / 1000000000).toLocaleString('vi-VN');

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-semibold text-white">
            Bộ Tính Toán Định Giá 3 Kịch Bản (D3 Interactive Calculator)
          </h2>
        </div>
        <span className="text-xs text-sky-400 font-medium">Tự động cập nhật thời gian thực</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quarterly Projections Input Form */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              1. Dự Báo Lợi Nhuận Sau Thuế 4 Quý Tiếp Theo (VNĐ)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400">LNST Quý 1 (tỷ đ)</label>
                <input
                  type="number"
                  value={valuation.forecastNetProfitQ1 / 1000000000}
                  onChange={(e) =>
                    handleNetProfitChange(
                      'forecastNetProfitQ1',
                      (parseFloat(e.target.value) || 0) * 1000000000
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400">LNST Quý 2 (tỷ đ)</label>
                <input
                  type="number"
                  value={valuation.forecastNetProfitQ2 / 1000000000}
                  onChange={(e) =>
                    handleNetProfitChange(
                      'forecastNetProfitQ2',
                      (parseFloat(e.target.value) || 0) * 1000000000
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400">LNST Quý 3 (tỷ đ)</label>
                <input
                  type="number"
                  value={valuation.forecastNetProfitQ3 / 1000000000}
                  onChange={(e) =>
                    handleNetProfitChange(
                      'forecastNetProfitQ3',
                      (parseFloat(e.target.value) || 0) * 1000000000
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400">LNST Quý 4 (tỷ đ)</label>
                <input
                  type="number"
                  value={valuation.forecastNetProfitQ4 / 1000000000}
                  onChange={(e) =>
                    handleNetProfitChange(
                      'forecastNetProfitQ4',
                      (parseFloat(e.target.value) || 0) * 1000000000
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-3">
              <span className="text-xs text-gray-300">Tổng LNST 4 Quý Dự Phóng:</span>
              <span className="text-xs font-bold text-emerald-400">
                {formatBillion(valuation.totalForecastProfit)} tỷ VNĐ
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-gray-300">EPS Forward Tương Ứng:</span>
              <span className="text-xs font-extrabold text-sky-400">
                {valuation.epsForward.toLocaleString('vi-VN')} VNĐ / cổ phiếu
              </span>
            </div>
          </div>

          {/* PE Multipliers Input */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              2. Bội Số P/E Mục Tiêu (P/E Forward Multiplier)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-rose-400 font-semibold">P/E Thận Trọng</label>
                <input
                  type="number"
                  step="0.1"
                  value={valuation.peBear}
                  onChange={(e) => handlePeChange('peBear', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-rose-500/30 bg-gray-800 px-2.5 py-1.5 text-xs font-bold text-rose-400 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-sky-400 font-semibold">P/E Cơ Sở (Avg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={valuation.peBase}
                  onChange={(e) => handlePeChange('peBase', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-sky-500/30 bg-gray-800 px-2.5 py-1.5 text-xs font-bold text-sky-400 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-emerald-400 font-semibold">P/E Tích Cực (Max)</label>
                <input
                  type="number"
                  step="0.1"
                  value={valuation.peBull}
                  onChange={(e) => handlePeChange('peBull', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-emerald-500/30 bg-gray-800 px-2.5 py-1.5 text-xs font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results & Visualization Chart */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {/* Target Price Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-400">Tiêu Cực (Bear)</span>
              <div className="mt-1 text-base font-extrabold text-white">
                {priceBear.toLocaleString('vi-VN')} <span className="text-[10px] font-normal">đ</span>
              </div>
              <span className={`text-[10px] font-bold ${upsideBear >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBear >= 0 ? '+' : ''}{upsideBear}%
              </span>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-sky-400">Cơ Sở (Base)</span>
              <div className="mt-1 text-base font-extrabold text-white">
                {priceBase.toLocaleString('vi-VN')} <span className="text-[10px] font-normal">đ</span>
              </div>
              <span className={`text-[10px] font-bold ${upsideBase >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBase >= 0 ? '+' : ''}{upsideBase}%
              </span>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Tích Cực (Bull)</span>
              <div className="mt-1 text-base font-extrabold text-white">
                {priceBull.toLocaleString('vi-VN')} <span className="text-[10px] font-normal">đ</span>
              </div>
              <span className={`text-[10px] font-bold ${upsideBull >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upsideBull >= 0 ? '+' : ''}{upsideBull}%
              </span>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="h-56 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <h4 className="text-[11px] font-semibold text-gray-400 mb-2">So Sánh Giá Hiện Tại & Giá Mục Tiêu 3 Kịch Bản</h4>
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
      </div>
    </div>
  );
}
