'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { calculateHealthScoreForBar, DayData, MarketStatus as CalculatorMarketStatus } from '@/lib/canslim-health-calculator';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryPoint {
  date?: string;
  tradingDate?: string;
  time?: string;
  t?: string | number;
  close?: number;
  closeIndex?: number;
  indexValue?: number;
  lowestIndex?: number;
  low?: number;
  volume?: number;
  totalVolume?: number;
  totalMatchVolume?: number;
  matchVolume?: number;
}

type MarketStatus = 'confirmed_uptrend' | 'uptrend_under_pressure' | 'correction' | 'unknown';

interface HealthResult {
  score: number; // 0 – 10
  status: MarketStatus;
  distributionDays: number;
  vnindexVsMa20: number | null; // percent diff
  ma20: number | null;
  currentClose: number | null;
  isBelowMa20: boolean;
  ftdDetected: boolean;
  exposureLow: number;
  exposureHigh: number;
  strategy: string;
  note: string;
}

const STATUS_CONFIG: Record<MarketStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  exposureLow: number;
  exposureHigh: number;
  strategy: string;
  note: string;
}> = {
  confirmed_uptrend: {
    label: 'Confirmed Uptrend (Xác Nhận Tăng)',
    icon: TrendingUp,
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50/90 dark:bg-emerald-500/10',
    borderColor: 'border-emerald-200 dark:border-emerald-500/30',
    exposureLow: 75,
    exposureHigh: 100,
    strategy: 'Tập trung vào cổ phiếu cơ bản thoát nền giá đẹp. Tham gia gia tăng vị thế.',
    note: 'Tuân thủ quy tắc mua/bán, cắt lỗ tối đa 7-8%.',
  },
  uptrend_under_pressure: {
    label: 'Uptrend Under Pressure (Gặp Áp Lực)',
    icon: AlertTriangle,
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50/90 dark:bg-amber-500/10',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
    exposureLow: 25,
    exposureHigh: 50,
    strategy: 'Cẩn thận trước mọi quyết định mua mới. Lên kế hoạch phòng thủ từng cổ phiếu.',
    note: 'Tuân thủ kỷ luật, linh hoạt theo diễn biến thực tế.',
  },
  correction: {
    label: 'Market in Correction (Điều Chỉnh)',
    icon: TrendingDown,
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50/90 dark:bg-red-500/10',
    borderColor: 'border-red-200 dark:border-red-500/30',
    exposureLow: 0,
    exposureHigh: 25,
    strategy: 'Tránh mua mới. Giảm toàn bộ Margin trước tiên, bảo vệ lợi nhuận và cắt lỗ 7-8%. Cân nhắc hạ tỷ trọng cổ phiếu yếu.',
    note: 'Ưu tiên hạ toàn bộ đòn bẩy Margin trước tiên để bảo vệ vốn an toàn.',
  },
  unknown: {
    label: 'Đang phân tích...',
    icon: ShieldCheck,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/8',
    borderColor: 'border-gray-500/20',
    exposureLow: 50,
    exposureHigh: 75,
    strategy: 'Không đủ dữ liệu để xác định xu hướng.',
    note: '',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const HealthScore: React.FC = () => {
  const [result, setResult] = useState<(HealthResult & {
    ftdFailureProb?: number | null;
    postFtdDistribDay?: number | null;
    postFtdPenalty?: number;
  }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/market-watch/vnindex-history?index=VNINDEX&fromDate=20150101&page=0&size=3000');
        if (!res.ok) throw new Error('upstream');
        const json = await res.json();

        const raw: HistoryPoint[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.content)
          ? json.data.content
          : [];

        if (raw.length < 10) { setError(true); return; }

        // Normalize and sort ascending by date with accurate lowestIndex
        const days: DayData[] = raw
          .map((d: HistoryPoint) => {
            const close = Number(d.closeIndex ?? d.close ?? d.indexValue ?? 0);
            return {
              date: String(d.tradingDate ?? d.date ?? d.time ?? d.t ?? ''),
              close,
              low: Number(d.lowestIndex ?? d.low ?? d.indexValue ?? d.closeIndex ?? d.close ?? close),
              volume: Number(d.totalMatchVolume ?? d.totalVolume ?? d.volume ?? d.matchVolume ?? 0),
            };
          })
          .filter((d) => d.close > 0)
          .sort((a, b) => a.date.localeCompare(b.date));

        const health = calculateHealthScoreForBar(days, days.length - 1);
        const cfg = STATUS_CONFIG[health.status as MarketStatus];

        let strategy = cfg.strategy;
        let note = cfg.note;

        if (health.ftdFailureProb !== null) {
          const prob = health.ftdFailureProb;
          const dayNum = health.postFtdDistribDay;
          if (prob === 95) {
            strategy = `⚠️ CẢNH BÁO FTD THẤT BẠI 95%! Phân phối ở phiên thứ ${dayNum} ngay sau FTD. Giảm toàn bộ Margin trước tiên, ngừng mua mới và cắt lỗ quyết liệt.`;
            note = `Thị trường quay trở lại Market in Correction (Điểm: ${health.score}/10). Ưu tiên hạ đòn bẩy Margin bảo vệ vốn.`;
          } else if (prob === 70) {
            strategy = `⚠️ CẢNH BÁO FTD THẤT BẠI 70%! Phân phối ở phiên thứ ${dayNum} sau FTD. Thận trọng mua mới, hạ đòn bẩy Margin và phòng thủ từng vị thế.`;
            note = `Thị trường chuyển sang Uptrend Under Pressure (Điểm: ${health.score}/10). Giữ tỷ trọng an toàn.`;
          } else if (prob === 30) {
            strategy = `⚠️ CẢNH BÁO FTD THẤT BẠI 30%! Phân phối ở phiên thứ ${dayNum} sau FTD. Thận trọng trước bất kỳ quyết định mua mới nào.`;
            note = `Thị trường gặp áp lực điều chỉnh (Điểm: ${health.score}/10). Tỷ trọng đề xuất 25-50%.`;
          }
        }

        setResult({
          score: health.score,
          status: health.status as MarketStatus,
          distributionDays: health.distributionDays,
          vnindexVsMa20: health.vnindexVsMa20,
          ma20: health.ma20,
          currentClose: health.currentClose,
          isBelowMa20: health.isBelowMa20,
          ftdDetected: health.ftdDetected,
          exposureLow: cfg.exposureLow,
          exposureHigh: cfg.exposureHigh,
          strategy,
          note,
          ftdFailureProb: health.ftdFailureProb,
          postFtdDistribDay: health.postFtdDistribDay,
          postFtdPenalty: health.postFtdPenalty,
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center">Đang tính điểm sức khỏe thị trường...</div>;
  if (error || !result) return <div className="text-xs text-gray-400 py-4 text-center">Không đủ dữ liệu sức khỏe</div>;

  const cfg = STATUS_CONFIG[result.status as MarketStatus] || STATUS_CONFIG.unknown;
  const IconComp = cfg.icon;
  const ma20Str = result.vnindexVsMa20 !== null
    ? `${result.vnindexVsMa20 > 0 ? '+' : ''}${result.vnindexVsMa20.toFixed(1)}%`
    : '—';

  return (
    <div className={`w-full rounded-xl border p-3 ${cfg.bgColor} ${cfg.borderColor} font-sans select-none shadow-2xs`}>
      {/* Top Header & Score Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <IconComp className={`w-4 h-4 shrink-0 ${cfg.color}`} />
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
        </div>

        {/* 10-Point Score Badge */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Điểm sức khỏe:</span>
          <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
            result.score >= 7
              ? 'bg-emerald-600 text-white dark:bg-emerald-500'
              : result.score >= 5
              ? 'bg-amber-600 text-white dark:bg-amber-500'
              : 'bg-red-600 text-white dark:bg-red-500'
          }`}>
            {result.score}/10
          </span>
        </div>
      </div>

      {/* Metrics & Deductions Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2.5 text-[11px] bg-white/90 dark:bg-black/40 p-2.5 rounded-lg border border-gray-200/80 dark:border-gray-800/60 shadow-2xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-[10px] font-medium">Phiên phân phối</span>
          <span className={`font-bold text-[10px] ${result.distributionDays > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {result.distributionDays} phiên (-{result.distributionDays}đ)
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-[10px] font-medium">Xu hướng MA20</span>
          <span className={`font-bold text-[10px] ${result.isBelowMa20 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {result.isBelowMa20 ? `Dưới MA20 (-1đ)` : `Trên MA20 (${ma20Str})`}
          </span>
        </div>

        {result.ftdDetected && (
          <div className="col-span-2 flex flex-col gap-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold border-t border-gray-200/80 dark:border-gray-800/40 pt-1.5 mt-0.5">
            <div className="flex items-center gap-1">
              <span>✓ Phát hiện FTD bùng nổ theo đà (Phiên 4–10)</span>
            </div>
            {result.ftdFailureProb && (
              <div className="text-red-600 dark:text-red-400 font-bold text-[9.5px] flex items-center gap-1">
                <span>⚠️ Phân phối ở phiên thứ {result.postFtdDistribDay} sau FTD (-{result.postFtdPenalty}đ, XSTB: {result.ftdFailureProb}%)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exposure Recommendation */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Tỷ trọng Exposure đề xuất</span>
        <span className={`text-xs font-black ${cfg.color}`}>
          {result.exposureLow}–{result.exposureHigh}%
        </span>
      </div>

      {/* Exposure Progress Bar */}
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700/80 rounded-full mb-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            result.score >= 7 ? 'bg-emerald-500' : result.score >= 5 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${result.exposureHigh}%` }}
        />
      </div>

      {/* Strategy Recommendation */}
      <p className="text-[10px] text-slate-800 dark:text-gray-200 leading-relaxed font-semibold">
        {result.strategy}
      </p>
      {result.note && (
        <p className="text-[9.5px] text-slate-500 dark:text-gray-400 leading-relaxed mt-1 italic font-medium">
          {result.note}
        </p>
      )}
    </div>
  );
};
