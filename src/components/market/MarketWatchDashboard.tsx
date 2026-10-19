'use client';

import React from 'react';
import {
  TrendingUp,
  Activity,
  ShieldCheck,
  BarChart3,
  Globe2,
  PieChart,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { VnindexCandleChart } from '@/components/chart/sidebar/market-watch/VnindexCandleChart';
import { HealthScore } from '@/components/chart/sidebar/market-watch/HealthScore';
import { IntradayChart } from '@/components/chart/sidebar/market-watch/IntradayChart';
import { MarketInfluenceTable } from '@/components/chart/sidebar/market-watch/MarketInfluenceTable';
import { NetFlowTable } from '@/components/chart/sidebar/market-watch/NetFlowTable';
import { BreadthChart } from '@/components/chart/sidebar/market-watch/BreadthChart';
import { ValuationChart } from '@/components/chart/sidebar/market-watch/ValuationChart';

interface PanelHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  badgeColor?: string;
  extra?: React.ReactNode;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  icon: Icon,
  title,
  badge,
  badgeColor = 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  extra,
}) => {
  return (
    <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/60 shrink-0 select-none">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
          {title}
        </span>
        {badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {extra && <div className="flex items-center gap-1">{extra}</div>}
    </div>
  );
};

export const MarketWatchDashboard: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 w-full p-2 sm:p-2.5 flex flex-col lg:flex-row gap-2 overflow-y-auto lg:overflow-hidden bg-[#F8FAFC] dark:bg-[#070B13]">
      {/* =========================================================================
          CỘT 1 (65% Chiều Ngang): Daily VNINDEX (Row 1+2), Độ Rộng (Row 3), Định Giá (Row 4)
      ========================================================================== */}
      <div className="w-full lg:w-[65%] flex flex-col gap-2 h-auto lg:h-full min-h-0 lg:overflow-hidden shrink-0">
        {/* ROW 1 + 2: KHỐI 1 - BIỂU ĐỒ DAILY VNINDEX (Chiếm ~52% chiều cao viewport) */}
        <div className="h-auto lg:h-[52%] min-h-[300px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs overflow-hidden">
          <PanelHeader
            icon={TrendingUp}
            title="Biểu Đồ Daily VNINDEX"
            badge="CANSLIM"
            badgeColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <VnindexCandleChart isDashboard={true} />
          </div>
        </div>

        {/* ROW 3: KHỐI 7 - ĐỘ RỘNG THỊ TRƯỜNG (% CP TRÊN EMA20, EMA50, EMA200 - Chiếm ~24% chiều cao) */}
        <div className="h-auto lg:h-[24%] min-h-[145px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs overflow-hidden">
          <PanelHeader
            icon={LineChartIcon}
            title="Độ Rộng Thị Trường (% CP Trên MA)"
            badge="2 NĂM"
            badgeColor="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
          />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <BreadthChart isDashboard={true} height={105} />
          </div>
        </div>

        {/* ROW 4: KHỐI 6 - ĐỊNH GIÁ VNINDEX (P/E & P/B LỊCH SỬ - Chiếm ~24% chiều cao) */}
        <div className="h-auto lg:h-[24%] min-h-[145px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs overflow-hidden">
          <PanelHeader
            icon={PieChart}
            title="Định Giá VNINDEX (P/E & P/B Lịch Sử)"
            badge="ALL"
            badgeColor="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <ValuationChart isDashboard={true} height={105} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          CỘT 2 (35% Chiều Ngang): Sức Khỏe (Row 1), Intraday (Row 2), Ảnh Hưởng (Row 3), Nước Ngoài (Row 4)
      ========================================================================== */}
      <div className="w-full lg:w-[35%] flex flex-col gap-2 h-auto lg:h-full min-h-0 lg:overflow-hidden shrink-0">
        {/* ROW 1: KHỐI 2 - SỨC KHỎE THỊ TRƯỜNG & HÀNH ĐỘNG (Chiếm ~26% chiều cao) */}
        <div className="h-auto lg:h-[26%] min-h-[160px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs overflow-hidden">
          <PanelHeader
            icon={ShieldCheck}
            title="Sức Khỏe Thị Trường"
            badge="CANSLIM"
            badgeColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <HealthScore isDashboard={true} />
          </div>
        </div>

        {/* ROW 2: KHỐI 3 - BIỂU ĐỒ INTRADAY VNINDEX (Chiếm ~26% chiều cao) */}
        <div className="h-auto lg:h-[26%] min-h-[160px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs overflow-hidden">
          <PanelHeader
            icon={Activity}
            title="Biểu Đồ Intraday VNINDEX"
            badge="REALTIME"
            badgeColor="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
          />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <IntradayChart isDashboard={true} />
          </div>
        </div>

        {/* ROW 3: KHỐI 4 - TOP ẢNH HƯỞNG VNINDEX (Chiếm ~24% chiều cao) */}
        <div className="h-auto lg:h-[24%] min-h-[145px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs overflow-hidden">
          <PanelHeader
            icon={BarChart3}
            title="Top Cổ Phiếu Ảnh Hưởng VNINDEX"
            badge="LIVE"
            badgeColor="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
          />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <MarketInfluenceTable isDashboard={true} maxItems={8} />
          </div>
        </div>

        {/* ROW 4: KHỐI 5 - TOP GIAO DỊCH NƯỚC NGOÀI (Chiếm ~24% chiều cao) */}
        <div className="h-auto lg:h-[24%] min-h-[145px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs overflow-hidden">
          <PanelHeader
            icon={Globe2}
            title="Nước Ngoài Mua / Bán Ròng"
            badge="TỶ VNĐ"
            badgeColor="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30"
          />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <NetFlowTable isDashboard={true} maxItems={8} />
          </div>
        </div>
      </div>
    </div>
  );
};
