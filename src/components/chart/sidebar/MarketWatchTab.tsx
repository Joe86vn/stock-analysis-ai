'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { IntradayChart } from './market-watch/IntradayChart';
import { LiquidityChart } from './market-watch/LiquidityChart';
import { MarketInfluenceTable } from './market-watch/MarketInfluenceTable';
import { BreadthChart } from './market-watch/BreadthChart';
import { ValuationChart } from './market-watch/ValuationChart';
import { NetFlowTable } from './market-watch/NetFlowTable';
import { HealthScore } from './market-watch/HealthScore';

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, badge, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800/60 last:border-none">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/4 transition cursor-pointer select-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        }
      </button>
      {open && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const MarketWatchTab: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto overscroll-contain scroll-smooth">
      {/* Section 1 — Intraday VNINDEX */}
      <Section title="Intraday VNINDEX" defaultOpen={true}>
        <IntradayChart />
      </Section>

      {/* Section 2 — Thanh khoản */}
      <Section title="Thanh khoản" defaultOpen={true}>
        <LiquidityChart />
      </Section>

      {/* Section 3 — Top ảnh hưởng */}
      <Section title="Ảnh hưởng VNINDEX" badge="LIVE" defaultOpen={true}>
        <MarketInfluenceTable />
      </Section>

      {/* Section 4 — Độ rộng thị trường */}
      <Section title="Độ rộng thị trường" defaultOpen={false}>
        <BreadthChart />
      </Section>

      {/* Section 5 — Định giá PE/PB */}
      <Section title="Định giá VNINDEX" defaultOpen={false}>
        <ValuationChart />
      </Section>

      {/* Section 6 — Dòng tiền */}
      <Section title="Dòng tiền" defaultOpen={false}>
        <NetFlowTable />
      </Section>

      {/* Section 7 — Sức khỏe thị trường */}
      <Section title="Sức khỏe thị trường" badge="CANSLIM" defaultOpen={true}>
        <HealthScore />
      </Section>
    </div>
  );
};
