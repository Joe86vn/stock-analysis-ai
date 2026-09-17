'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryPoint {
  date?: string;
  tradingDate?: string;
  time?: string;
  t?: string | number;
  close?: number;
  closeIndex?: number;
  indexValue?: number;
  volume?: number;
  totalVolume?: number;
  totalMatchVolume?: number;
  matchVolume?: number;
}

interface DayData {
  date: string;
  close: number;
  low: number;
  volume: number;
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

// ─── CANSLIM Logic ───────────────────────────────────────────────────────────

const calcMA = (data: number[], period: number): number[] => {
  return data.map((_, i) => {
    if (i < period - 1) return NaN;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
};

/**
 * Count active distribution days using O'Neil / IBD rules:
 * - Decline > 0.2% AND volume > prev day volume
 * - Expire after 25 trading sessions
 * - Expire if index rallies ≥ 5% above that day's close
 */
const countDistributionDays = (days: DayData[]): number => {
  const distribDays: { sessionIndex: number; close: number }[] = [];

  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const curr = days[i];
    const pctChange = (curr.close - prev.close) / prev.close;
    const isDistribution = pctChange <= -0.002 && curr.volume > prev.volume;
    if (isDistribution) {
      distribDays.push({ sessionIndex: i, close: curr.close });
    }
  }

  // Filter out expired distribution days from perspective of last session
  const lastIndex = days.length - 1;
  const lastClose = days[lastIndex].close;

  const active = distribDays.filter((d) => {
    const sessionAge = lastIndex - d.sessionIndex;
    // Rule (a): expire after 25 trading sessions
    if (sessionAge > 25) return false;
    // Rule (b): expire if index rallied ≥ 5% from distribution close
    if (lastClose >= d.close * 1.05) return false;
    return true;
  });

  return active.length;
};

interface FtdAnalysis {
  ftdDetected: boolean;
  ftdIndex: number | null;
  postFtdPenalty: number;
  ftdFailureProb: number | null;
  postFtdDistribDay: number | null;
}

/**
 * Detect Follow-through Day (FTD) within Day 4 to Day 10 of Rally Attempt
 * and analyze early distribution days occurring 1-5 days post-FTD:
 * - 1-2 days post FTD: -3 pts penalty (95% failure prob -> drops to 4/10 Correction)
 * - 3 days post FTD: -2 pts penalty (70% failure prob -> drops to 5/10 Pressure)
 * - 4-5 days post FTD: -1 pt penalty (30% failure prob -> drops to 6/10 Pressure)
 */
const analyzeFTD = (days: DayData[]): FtdAnalysis => {
  let rallyStartLow = Infinity;
  let rallyDayCount = 0;
  let inConfirmedUptrend = false;
  let lastFtdIdx: number | null = null;

  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const curr = days[i];
    const pct = (curr.close - prev.close) / prev.close;

    if (inConfirmedUptrend) {
      if (curr.close < prev.close * 0.95) {
        inConfirmedUptrend = false;
        rallyDayCount = 0;
        rallyStartLow = Infinity;
        lastFtdIdx = null;
      }
    } else {
      if (rallyDayCount === 0) {
        if (pct > 0) {
          rallyDayCount = 1;
          rallyStartLow = prev.low ?? prev.close;
        }
      } else {
        if (curr.close < rallyStartLow) {
          if (pct > 0) {
            rallyDayCount = 1;
            rallyStartLow = prev.close;
          } else {
            rallyDayCount = 0;
            rallyStartLow = Infinity;
          }
        } else {
          rallyDayCount++;
          if (rallyDayCount >= 4 && rallyDayCount <= 10 && pct > 0.0125 && curr.volume > prev.volume) {
            lastFtdIdx = i;
            inConfirmedUptrend = true;
          }
        }
      }
    }
  }

  if (lastFtdIdx === null) {
    return { ftdDetected: false, ftdIndex: null, postFtdPenalty: 0, ftdFailureProb: null, postFtdDistribDay: null };
  }

  // Check distribution days occurring within 1 to 5 sessions after lastFtdIdx
  let penalty = 0;
  let failProb: number | null = null;
  let distribDay: number | null = null;

  for (let i = lastFtdIdx + 1; i < Math.min(days.length, lastFtdIdx + 6); i++) {
    const prev = days[i - 1];
    const curr = days[i];
    const pctChange = (curr.close - prev.close) / prev.close;
    const isDistrib = pctChange <= -0.002 && curr.volume > prev.volume;

    if (isDistrib) {
      const offset = i - lastFtdIdx; // 1 to 5
      if (offset === 1 || offset === 2) {
        if (3 > penalty) {
          penalty = 3;
          failProb = 95;
          distribDay = offset;
        }
      } else if (offset === 3) {
        if (2 > penalty) {
          penalty = 2;
          failProb = 70;
          distribDay = offset;
        }
      } else if (offset === 4 || offset === 5) {
        if (1 > penalty) {
          penalty = 1;
          failProb = 30;
          distribDay = offset;
        }
      }
    }
  }

  return {
    ftdDetected: true,
    ftdIndex: lastFtdIdx,
    postFtdPenalty: penalty,
    ftdFailureProb: failProb,
    postFtdDistribDay: distribDay,
  };
};

/**
 * Score-based Status Determination:
 * - score >= 7/10: Confirmed Uptrend
 * - 5 <= score < 7: Uptrend Under Pressure
 * - score < 5: Correction
 */
const determineStatusByScore = (score: number): MarketStatus => {
  if (score >= 7) return 'confirmed_uptrend';
  if (score >= 5) return 'uptrend_under_pressure';
  return 'correction';
};

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
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/8 dark:bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    exposureLow: 75,
    exposureHigh: 100,
    strategy: 'Tập trung vào cổ phiếu cơ bản thoát nền giá đẹp. Tham gia gia tăng vị thế.',
    note: 'Tuân thủ quy tắc mua/bán, cắt lỗ tối đa 7-8%.',
  },
  uptrend_under_pressure: {
    label: 'Uptrend Under Pressure (Gặp Áp Lực)',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/8 dark:bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    exposureLow: 25,
    exposureHigh: 50,
    strategy: 'Cẩn thận trước mọi quyết định mua mới. Lên kế hoạch phòng thủ từng cổ phiếu.',
    note: 'Tuân thủ kỷ luật, linh hoạt theo diễn biến thực tế.',
  },
  correction: {
    label: 'Market in Correction (Điều Chỉnh)',
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/8 dark:bg-red-500/10',
    borderColor: 'border-red-500/30',
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
        const res = await fetch('/api/market-watch/vnindex-history');
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

        // Normalize and sort ascending by date
        const days: DayData[] = raw
          .map((d: HistoryPoint) => ({
            date: String(d.tradingDate ?? d.date ?? d.time ?? d.t ?? ''),
            close: Number(d.closeIndex ?? d.close ?? d.indexValue ?? 0),
            low: Number(d.indexValue ?? d.closeIndex ?? d.close ?? 0),
            volume: Number(d.totalMatchVolume ?? d.totalVolume ?? d.volume ?? d.matchVolume ?? 0),
          }))
          .filter((d) => d.close > 0)
          .sort((a, b) => a.date.localeCompare(b.date));

        const closes = days.map((d) => d.close);
        const ma20Arr = calcMA(closes, 20);
        const lastClose = closes[closes.length - 1];
        const lastMa20 = ma20Arr[ma20Arr.length - 1];
        const vnVsMa20 = isNaN(lastMa20) ? null : ((lastClose - lastMa20) / lastMa20) * 100;
        const isBelowMa20 = !isNaN(lastMa20) && lastClose < lastMa20;

        const distDays = countDistributionDays(days);
        const ftdInfo = analyzeFTD(days);

        // Quy tắc điểm sức khỏe thị trường:
        // 1. Sau FTD (trong vòng 5 phiên đầu): điểm gốc mặc định = 7 điểm.
        // 2. Nếu xuất hiện phân phối trong 1-5 ngày sau FTD:
        //    - 1-2 ngày: -3đ (xác suất thất bại 95% -> vọt về 4/10 Correction)
        //    - 3 ngày: -2đ (xác suất thất bại 70% -> vọt về 5/10 Pressure)
        //    - 4-5 ngày: -1đ (xác suất thất bại 30% -> vọt về 6/10 Pressure)
        // 3. SAU FTD TRÊN 5 PHIÊN MÀ KHÔNG CÓ PHIÊN PHÂN PHỐI NÀO -> Khôi phục trở lại 10 điểm gốc!
        // 4. Trừ điểm các phiên phân phối phát sinh (-1đ/phiên) & MA20 (-1đ nếu dưới MA20).
        let baseScore = 10;
        let postFtdPenalty = 0;
        let otherDistribDays = distDays;

        if (ftdInfo.ftdDetected && ftdInfo.ftdIndex !== null) {
          const lastIndex = days.length - 1;
          const sessionsSinceFtd = lastIndex - ftdInfo.ftdIndex;

          if (sessionsSinceFtd <= 5) {
            // Trong vòng 5 phiên đầu sau FTD
            baseScore = 7;
            postFtdPenalty = ftdInfo.postFtdPenalty;
            if (ftdInfo.postFtdDistribDay !== null) {
              otherDistribDays = Math.max(0, distDays - 1);
            }
          } else {
            // Sau FTD hơn 5 phiên
            if (ftdInfo.postFtdDistribDay !== null) {
              // Đã bị dính phân phối trong 5 phiên đầu -> Giữ điểm phạt
              baseScore = 7;
              postFtdPenalty = ftdInfo.postFtdPenalty;
              otherDistribDays = Math.max(0, distDays - 1);
            } else {
              // KHÔNG CÓ phiên phân phối nào trong 5 phiên đầu -> Khôi phục trở lại 10 điểm!
              baseScore = 10;
              postFtdPenalty = 0;
              otherDistribDays = distDays;
            }
          }
        }

        const rawScore = baseScore - postFtdPenalty - otherDistribDays - (isBelowMa20 ? 1 : 0);
        const score = Math.max(0, Math.min(10, rawScore));
        const status = determineStatusByScore(score);
        const cfg = STATUS_CONFIG[status];

        // Cập nhật chiến lược & cảnh báo xác suất thất bại FTD nếu có
        let strategy = cfg.strategy;
        let note = cfg.note;

        if (ftdInfo.ftdFailureProb !== null) {
          const prob = ftdInfo.ftdFailureProb;
          const dayNum = ftdInfo.postFtdDistribDay;
          if (prob === 95) {
            strategy = `⚠️ CẢNH BÁO FTD THẤT BẠI 95%! Phân phối ở phiên thứ ${dayNum} ngay sau FTD. Giảm toàn bộ Margin trước tiên, ngừng mua mới và cắt lỗ quyết liệt.`;
            note = `Thị trường quay trở lại Market in Correction (Điểm: ${score}/10). Ưu tiên hạ đòn bẩy Margin bảo vệ vốn.`;
          } else if (prob === 70) {
            strategy = `⚠️ CẢNH BÁO FTD THẤT BẠI 70%! Phân phối ở phiên thứ ${dayNum} sau FTD. Thận trọng mua mới, hạ đòn bẩy Margin và phòng thủ từng vị thế.`;
            note = `Thị trường chuyển sang Uptrend Under Pressure (Điểm: ${score}/10). Giữ tỷ trọng an toàn.`;
          } else if (prob === 30) {
            strategy = `⚠️ CẢNH BÁO FTD THẤT BẠI 30%! Phân phối ở phiên thứ ${dayNum} sau FTD. Thận trọng trước bất kỳ quyết định mua mới nào.`;
            note = `Thị trường gặp áp lực điều chỉnh (Điểm: ${score}/10). Tỷ trọng đề xuất 25-50%.`;
          }
        }

        setResult({
          score,
          status,
          distributionDays: distDays,
          vnindexVsMa20: vnVsMa20,
          ma20: isNaN(lastMa20) ? null : lastMa20,
          currentClose: lastClose,
          isBelowMa20,
          ftdDetected: ftdInfo.ftdDetected,
          exposureLow: cfg.exposureLow,
          exposureHigh: cfg.exposureHigh,
          strategy,
          note,
          ftdFailureProb: ftdInfo.ftdFailureProb,
          postFtdDistribDay: ftdInfo.postFtdDistribDay,
          postFtdPenalty: ftdInfo.postFtdPenalty,
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

  const cfg = STATUS_CONFIG[result.status];
  const IconComp = cfg.icon;
  const ma20Str = result.vnindexVsMa20 !== null
    ? `${result.vnindexVsMa20 > 0 ? '+' : ''}${result.vnindexVsMa20.toFixed(1)}%`
    : '—';

  return (
    <div className={`w-full rounded-lg border p-3 ${cfg.bgColor} ${cfg.borderColor} font-sans select-none`}>
      {/* Top Header & Score Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <IconComp className={`w-4 h-4 shrink-0 ${cfg.color}`} />
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
        </div>

        {/* 10-Point Score Badge */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">Điểm sức khỏe:</span>
          <span className={`text-sm font-black px-2 py-0.5 rounded-full ${
            result.score >= 7
              ? 'bg-emerald-500 text-white'
              : result.score >= 5
              ? 'bg-amber-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {result.score}/10
          </span>
        </div>
      </div>

      {/* Metrics & Deductions Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2.5 text-[11px] bg-black/20 p-2 rounded border border-gray-100/10 dark:border-gray-800/40">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-[10px]">Phiên phân phối</span>
          <span className={`font-bold text-[10px] ${result.distributionDays > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {result.distributionDays} phiên (-{result.distributionDays}đ)
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-[10px]">Xu hướng MA20</span>
          <span className={`font-bold text-[10px] ${result.isBelowMa20 ? 'text-red-400' : 'text-emerald-400'}`}>
            {result.isBelowMa20 ? `Dưới MA20 (-1đ)` : `Trên MA20 (${ma20Str})`}
          </span>
        </div>

        {result.ftdDetected && (
          <div className="col-span-2 flex flex-col gap-0.5 text-[10px] text-emerald-400 font-bold border-t border-gray-100/10 dark:border-gray-800/40 pt-1 mt-0.5">
            <div className="flex items-center gap-1">
              <span>✓ Phát hiện FTD bùng nổ theo đà (Phiên 4–10)</span>
            </div>
            {result.ftdFailureProb && (
              <div className="text-red-400 font-bold text-[9.5px] flex items-center gap-1">
                <span>⚠️ Phân phối ở phiên thứ {result.postFtdDistribDay} sau FTD (-{result.postFtdPenalty}đ, XSTB: {result.ftdFailureProb}%)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exposure Recommendation */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] text-gray-400">Tỷ trọng Exposure đề xuất</span>
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
      <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
        {result.strategy}
      </p>
      {result.note && (
        <p className="text-[9.5px] text-gray-400 dark:text-gray-500 leading-relaxed mt-1 italic">
          {result.note}
        </p>
      )}
    </div>
  );
};
