'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Activity,
  ShieldCheck,
  BarChart3,
  Globe2,
  PieChart,
  LineChart as LineChartIcon,
  RotateCcw,
  MoveHorizontal,
  GripVertical,
  GripHorizontal,
} from 'lucide-react';
import { VnindexCandleChart } from '@/components/chart/sidebar/market-watch/VnindexCandleChart';
import { HealthScore } from '@/components/chart/sidebar/market-watch/HealthScore';
import { IntradayChart } from '@/components/chart/sidebar/market-watch/IntradayChart';
import { MarketInfluenceTable } from '@/components/chart/sidebar/market-watch/MarketInfluenceTable';
import { NetFlowTable } from '@/components/chart/sidebar/market-watch/NetFlowTable';
import { BreadthChart } from '@/components/chart/sidebar/market-watch/BreadthChart';
import { ValuationChart } from '@/components/chart/sidebar/market-watch/ValuationChart';

// ─── Layout Configuration & Types ─────────────────────────────────────────────

interface LayoutConfig {
  // Column Widths (Percentages, sum = 100)
  col1Width: number; // Left: Macro & Health (Default ~23%)
  col2Width: number; // Center: Main Charts (Default ~52%)
  col3Width: number; // Right: Flows & Leaders (Default ~25%)

  // Column 1 Heights (Percentages, sum = 100)
  col1H1: number; // Sức Khỏe Thị Trường (Default ~28%)
  col1H2: number; // Độ Rộng Thị Trường (Default ~36%)
  col1H3: number; // Định Giá VN-Index (Default ~36%)

  // Column 2 Heights (Percentages, sum = 100)
  col2H1: number; // Daily VN-Index CANSLIM (Default ~66%)
  col2H2: number; // Intraday VN-Index Realtime (Default ~34%)

  // Column 3 Heights (Percentages, sum = 100)
  col3H1: number; // Top Cổ Phiếu Ảnh Hưởng (Default ~50%)
  col3H2: number; // Nước Ngoài Mua/Bán Ròng (Default ~50%)
}

const DEFAULT_LAYOUT: LayoutConfig = {
  col1Width: 23,
  col2Width: 52,
  col3Width: 25,
  col1H1: 28,
  col1H2: 36,
  col1H3: 36,
  col2H1: 60,
  col2H2: 40,
  col3H1: 50,
  col3H2: 50,
};

const STORAGE_KEY = 'valuex_market_watch_layout_3col';

// ─── Panel Header Component ───────────────────────────────────────────────────

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
  badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/70',
  extra,
}) => {
  return (
    <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/60 shrink-0 select-none">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase truncate">
          {title}
        </span>
        {badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {extra && <div className="flex items-center gap-1 shrink-0">{extra}</div>}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const MarketWatchDashboard: React.FC = () => {
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [isCustomized, setIsCustomized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const col3Ref = useRef<HTMLDivElement>(null);

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.col1Width && parsed.col2Width && parsed.col3Width) {
          setLayout(parsed);
          setIsCustomized(true);
        }
      }
    } catch {
      // ignore JSON errors
    }
  }, []);

  const saveLayout = useCallback((newLayout: LayoutConfig) => {
    setLayout(newLayout);
    setIsCustomized(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
    } catch {
      // storage unavailable
    }
  }, []);

  const handleResetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    setIsCustomized(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // ─── Drag to Resize Horizontal Columns ──────────────────────────────────────

  const startColResize = (dividerIndex: 1 | 2, e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const startX = e.clientX;
    const startLayout = { ...layout };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaPercent = (deltaPx / containerWidth) * 100;

      if (dividerIndex === 1) {
        // Between Col 1 & Col 2
        let newCol1 = startLayout.col1Width + deltaPercent;
        let newCol2 = startLayout.col2Width - deltaPercent;

        // Constraints
        if (newCol1 < 16) {
          newCol1 = 16;
          newCol2 = startLayout.col1Width + startLayout.col2Width - 16;
        } else if (newCol1 > 35) {
          newCol1 = 35;
          newCol2 = startLayout.col1Width + startLayout.col2Width - 35;
        }
        if (newCol2 < 35) {
          newCol2 = 35;
          newCol1 = startLayout.col1Width + startLayout.col2Width - 35;
        }

        saveLayout({
          ...startLayout,
          col1Width: parseFloat(newCol1.toFixed(1)),
          col2Width: parseFloat(newCol2.toFixed(1)),
        });
      } else {
        // Between Col 2 & Col 3
        let newCol2 = startLayout.col2Width + deltaPercent;
        let newCol3 = startLayout.col3Width - deltaPercent;

        // Constraints
        if (newCol3 < 18) {
          newCol3 = 18;
          newCol2 = startLayout.col2Width + startLayout.col3Width - 18;
        } else if (newCol3 > 35) {
          newCol3 = 35;
          newCol2 = startLayout.col2Width + startLayout.col3Width - 35;
        }
        if (newCol2 < 35) {
          newCol2 = 35;
          newCol3 = startLayout.col2Width + startLayout.col3Width - 35;
        }

        saveLayout({
          ...startLayout,
          col2Width: parseFloat(newCol2.toFixed(1)),
          col3Width: parseFloat(newCol3.toFixed(1)),
        });
      }
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ─── Drag to Resize Vertical Panels ────────────────────────────────────────

  const startRowResizeCol1 = (dividerIndex: 1 | 2, e: React.MouseEvent) => {
    e.preventDefault();
    if (!col1Ref.current) return;
    const colHeight = col1Ref.current.getBoundingClientRect().height;
    const startY = e.clientY;
    const startLayout = { ...layout };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientY - startY;
      const deltaPercent = (deltaPx / colHeight) * 100;

      if (dividerIndex === 1) {
        // Between Health (H1) and Breadth (H2)
        let newH1 = startLayout.col1H1 + deltaPercent;
        let newH2 = startLayout.col1H2 - deltaPercent;
        if (newH1 < 18) {
          newH1 = 18;
          newH2 = startLayout.col1H1 + startLayout.col1H2 - 18;
        }
        if (newH2 < 20) {
          newH2 = 20;
          newH1 = startLayout.col1H1 + startLayout.col1H2 - 20;
        }
        saveLayout({
          ...startLayout,
          col1H1: parseFloat(newH1.toFixed(1)),
          col1H2: parseFloat(newH2.toFixed(1)),
        });
      } else {
        // Between Breadth (H2) and Valuation (H3)
        let newH2 = startLayout.col1H2 + deltaPercent;
        let newH3 = startLayout.col1H3 - deltaPercent;
        if (newH2 < 20) {
          newH2 = 20;
          newH3 = startLayout.col1H2 + startLayout.col1H3 - 20;
        }
        if (newH3 < 20) {
          newH3 = 20;
          newH2 = startLayout.col1H2 + startLayout.col1H3 - 20;
        }
        saveLayout({
          ...startLayout,
          col1H2: parseFloat(newH2.toFixed(1)),
          col1H3: parseFloat(newH3.toFixed(1)),
        });
      }
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startRowResizeCol2 = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!col2Ref.current) return;
    const colHeight = col2Ref.current.getBoundingClientRect().height;
    const startY = e.clientY;
    const startLayout = { ...layout };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientY - startY;
      const deltaPercent = (deltaPx / colHeight) * 100;

      let newH1 = startLayout.col2H1 + deltaPercent;
      let newH2 = startLayout.col2H2 - deltaPercent;
      if (newH1 < 40) {
        newH1 = 40;
        newH2 = 60;
      }
      if (newH2 < 20) {
        newH2 = 20;
        newH1 = 80;
      }

      saveLayout({
        ...startLayout,
        col2H1: parseFloat(newH1.toFixed(1)),
        col2H2: parseFloat(newH2.toFixed(1)),
      });
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startRowResizeCol3 = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!col3Ref.current) return;
    const colHeight = col3Ref.current.getBoundingClientRect().height;
    const startY = e.clientY;
    const startLayout = { ...layout };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientY - startY;
      const deltaPercent = (deltaPx / colHeight) * 100;

      let newH1 = startLayout.col3H1 + deltaPercent;
      let newH2 = startLayout.col3H2 - deltaPercent;
      if (newH1 < 25) {
        newH1 = 25;
        newH2 = 75;
      }
      if (newH2 < 25) {
        newH2 = 25;
        newH1 = 75;
      }

      saveLayout({
        ...startLayout,
        col3H1: parseFloat(newH1.toFixed(1)),
        col3H2: parseFloat(newH2.toFixed(1)),
      });
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#070B13]">
      {/* ─── Top Control Strip: Status & Reset Layout ────────────────────────── */}
      <div className="h-6 px-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-[#090E1A]/60 text-[10px] text-slate-500 dark:text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            MARKET WATCH TERMINAL
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
            Kéo thả thanh ngăn cách giữa các cột và từng khối để tùy biến kích thước
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isCustomized && (
            <button
              onClick={handleResetLayout}
              className="flex items-center gap-1 text-[9.5px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 px-1.5 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-sky-950/40 transition cursor-pointer"
              title="Khôi phục tỷ lệ kích thước 3 cột chuẩn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại kích thước</span>
            </button>
          )}
          <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {layout.col1Width}% : {layout.col2Width}% : {layout.col3Width}%
          </span>
        </div>
      </div>

      {/* ─── 3-Column Resizable Container ───────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full p-2 flex flex-col lg:flex-row gap-0 overflow-y-auto lg:overflow-hidden relative"
      >
        {/* =========================================================================
            CỘT 1: VĨ MÔ & SỨC KHỎE THỊ TRƯỜNG (Health, Breadth, Valuation)
        ========================================================================== */}
        <div
          ref={col1Ref}
          style={{ width: `${layout.col1Width}%` }}
          className="w-full lg:h-full flex flex-col min-h-0 lg:overflow-hidden shrink-0"
        >
          {/* Panel 1.1: Sức Khỏe Thị Trường CANSLIM */}
          <div
            style={{ height: `${layout.col1H1}%` }}
            className="min-h-[140px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 shadow-2xs overflow-hidden"
          >
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

          {/* Vertical Resizer between Health & Breadth */}
          <div
            onMouseDown={(e) => startRowResizeCol1(1, e)}
            className="hidden lg:flex h-2 w-full items-center justify-center cursor-row-resize group shrink-0"
            title="Kéo để đổi chiều cao Sức Khỏe / Độ Rộng"
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700/80 group-hover:bg-sky-500 transition-colors" />
          </div>

          {/* Panel 1.2: Độ Rộng Thị Trường (% CP Trên MA) */}
          <div
            style={{ height: `${layout.col1H2}%` }}
            className="min-h-[135px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 shadow-2xs overflow-hidden"
          >
            <PanelHeader
              icon={LineChartIcon}
              title="Độ Rộng Thị Trường"
              badge="2 NĂM"
            />
            <div className="flex-1 min-h-0 w-full overflow-hidden">
              <BreadthChart isDashboard={true} height="100%" />
            </div>
          </div>

          {/* Vertical Resizer between Breadth & Valuation */}
          <div
            onMouseDown={(e) => startRowResizeCol1(2, e)}
            className="hidden lg:flex h-2 w-full items-center justify-center cursor-row-resize group shrink-0"
            title="Kéo để đổi chiều cao Độ Rộng / Định Giá"
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700/80 group-hover:bg-sky-500 transition-colors" />
          </div>

          {/* Panel 1.3: Định Giá VN-Index (P/E & P/B Lịch Sử) */}
          <div
            style={{ height: `${layout.col1H3}%` }}
            className="min-h-[135px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 shadow-2xs overflow-hidden"
          >
            <PanelHeader
              icon={PieChart}
              title="Định Giá VNINDEX (P/E, P/B)"
              badge="LỊCH SỬ"
            />
            <div className="flex-1 min-h-0 w-full overflow-hidden">
              <ValuationChart isDashboard={true} height="100%" />
            </div>
          </div>
        </div>

        {/* ─── Horizontal Resizer between Col 1 & Col 2 ───────────────────────── */}
        <div
          onMouseDown={(e) => startColResize(1, e)}
          className="hidden lg:flex w-2.5 h-full items-center justify-center cursor-col-resize group shrink-0 select-none z-10"
          title="Kéo để đổi kích thước Cột Vĩ Mô / Biểu Đồ Chính"
        >
          <div className="w-1 h-12 rounded-full bg-slate-300 dark:bg-slate-700/80 group-hover:bg-sky-500 transition-colors flex items-center justify-center">
            <GripVertical className="w-2.5 h-2.5 text-slate-400 group-hover:text-white" />
          </div>
        </div>

        {/* =========================================================================
            CỘT 2: SÂN KHẤU TRUNG TÂM (Daily VN-Index CANSLIM & Intraday Realtime)
        ========================================================================== */}
        <div
          ref={col2Ref}
          style={{ width: `${layout.col2Width}%` }}
          className="w-full lg:h-full flex flex-col min-h-0 lg:overflow-hidden shrink-0"
        >
          {/* Panel 2.1: Biểu Đồ Daily VN-Index CANSLIM */}
          <div
            style={{ height: `${layout.col2H1}%` }}
            className="min-h-[260px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 shadow-2xs overflow-hidden"
          >
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

          {/* Vertical Resizer between Daily & Intraday */}
          <div
            onMouseDown={startRowResizeCol2}
            className="hidden lg:flex h-2 w-full items-center justify-center cursor-row-resize group shrink-0"
            title="Kéo để đổi chiều cao Daily / Intraday"
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700/80 group-hover:bg-sky-500 transition-colors" />
          </div>

          {/* Panel 2.2: Biểu Đồ Intraday VN-Index Realtime */}
          <div
            style={{ height: `${layout.col2H2}%` }}
            className="min-h-[160px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 shadow-2xs overflow-hidden"
          >
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
        </div>

        {/* ─── Horizontal Resizer between Col 2 & Col 3 ───────────────────────── */}
        <div
          onMouseDown={(e) => startColResize(2, e)}
          className="hidden lg:flex w-2.5 h-full items-center justify-center cursor-col-resize group shrink-0 select-none z-10"
          title="Kéo để đổi kích thước Biểu Đồ Chính / Dòng Tiền"
        >
          <div className="w-1 h-12 rounded-full bg-slate-300 dark:bg-slate-700/80 group-hover:bg-sky-500 transition-colors flex items-center justify-center">
            <GripVertical className="w-2.5 h-2.5 text-slate-400 group-hover:text-white" />
          </div>
        </div>

        {/* =========================================================================
            CỘT 3: DÒNG TIỀN & CỔ PHIẾU DẪN DẮT (Influence, Net Flow)
        ========================================================================== */}
        <div
          ref={col3Ref}
          style={{ width: `${layout.col3Width}%` }}
          className="w-full lg:h-full flex flex-col min-h-0 lg:overflow-hidden shrink-0"
        >
          {/* Panel 3.1: Top Cổ Phiếu Ảnh Hưởng VN-Index */}
          <div
            style={{ height: `${layout.col3H1}%` }}
            className="min-h-[170px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 shadow-2xs overflow-hidden"
          >
            <PanelHeader
              icon={BarChart3}
              title="Top Ảnh Hưởng VNINDEX"
              badge="LIVE"
              badgeColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            />
            <div className="flex-1 min-h-0 w-full">
              <MarketInfluenceTable isDashboard={true} maxItems={10} />
            </div>
          </div>

          {/* Vertical Resizer between Influence & Net Flow */}
          <div
            onMouseDown={startRowResizeCol3}
            className="hidden lg:flex h-2 w-full items-center justify-center cursor-row-resize group shrink-0"
            title="Kéo để đổi chiều cao Top Ảnh Hưởng / Nước Ngoài"
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700/80 group-hover:bg-sky-500 transition-colors" />
          </div>

          {/* Panel 3.2: Nước Ngoài Mua / Bán Ròng */}
          <div
            style={{ height: `${layout.col3H2}%` }}
            className="min-h-[170px] flex flex-col bg-white dark:bg-[#0C1220] rounded-lg border border-slate-200/80 dark:border-slate-800/80 p-2 shadow-2xs overflow-hidden"
          >
            <PanelHeader
              icon={Globe2}
              title="Nước Ngoài Mua / Bán Ròng"
              badge="TỶ VNĐ"
            />
            <div className="flex-1 min-h-0 w-full overflow-y-auto">
              <NetFlowTable isDashboard={true} maxItems={10} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
