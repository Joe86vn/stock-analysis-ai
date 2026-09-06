import React from 'react';
import { Layers, CheckCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

interface DataBridgeBannerProps {
  epsForward: number;
  ebitdaForward: number;
  netProfitForward: number;
  bvpsForward: number;
  netDebt: number;
  sharesOutstanding: number;
  hasForecastData: boolean;
  payoutRatio?: number;
  annualCashDividend?: number;
  onNavigateToForecast?: () => void;
}

export const DataBridgeBanner: React.FC<DataBridgeBannerProps> = ({
  epsForward,
  ebitdaForward,
  netProfitForward,
  bvpsForward,
  netDebt,
  sharesOutstanding,
  hasForecastData,
  payoutRatio,
  annualCashDividend,
  onNavigateToForecast,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs dark:shadow-none transition-colors">
      {/* Header status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-heading">
            Dữ Liệu Nền Định Giá (TTM Forward Bridge)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {hasForecastData ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Đồng bộ từ Tab F (Dự Phóng 8 Quý)
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Chưa có dữ liệu Tab F
              </span>
              {onNavigateToForecast && (
                <button
                  type="button"
                  onClick={onNavigateToForecast}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors font-medium"
                >
                  Đi đến Tab Dự Phóng
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: EPS Forward */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/60">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">EPS Forward</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {epsForward > 0 ? `${Math.round(epsForward).toLocaleString('vi-VN')} đ` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Cốt lõi 4 quý tới</div>
        </div>

        {/* Card 2: EBITDA Forward */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/60">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">EBITDA Forward</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {ebitdaForward > 0 ? `${Math.round(ebitdaForward).toLocaleString('vi-VN')} Tỷ` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Phục vụ EV/EBITDA</div>
        </div>

        {/* Card 3: LNST Forward */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/60">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">LNST Forward</div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {netProfitForward > 0 ? `${Math.round(netProfitForward).toLocaleString('vi-VN')} Tỷ` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">LNST cổ đông mẹ</div>
        </div>

        {/* Card 4: BVPS Dự Phóng */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/60">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">BVPS Dự Phóng</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {bvpsForward > 0 ? `${Math.round(bvpsForward).toLocaleString('vi-VN')} đ` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {typeof payoutRatio === 'number' && payoutRatio > 0
              ? `Payout: ${(payoutRatio * 100).toFixed(0)}% (${annualCashDividend?.toLocaleString('vi-VN')}đ)`
              : 'Tái đầu tư 100% (0đ cổ tức)'}
          </div>
        </div>

        {/* Card 5: Nợ Ròng */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/60">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Nợ Ròng (BCTC)</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {`${Math.round(netDebt).toLocaleString('vi-VN')} Tỷ`}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Vay (ngắn+dài) - Tiền</div>
        </div>

        {/* Card 6: Số CP Lưu Hành */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/60">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Số Cổ Phiếu</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {sharesOutstanding > 0 ? `${Math.round(sharesOutstanding).toLocaleString('vi-VN')} Tr` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Khối lượng lưu hành</div>
        </div>
      </div>
    </div>
  );
};
