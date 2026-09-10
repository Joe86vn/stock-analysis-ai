'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  AnalysisReport,
  ExecutiveSummaryData,
  ExecutiveSummaryItem,
} from '@/types/analysis';
import { extractDefaultExecutiveSummary } from '@/lib/summary-extractor';
import { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';
import { useTheme } from '@/components/ThemeProvider';
import {
  compute8QuarterForecastMatrix,
  Forecast8QMatrixResult,
  Forecast8QSummaryItem,
} from '@/lib/forecast-8q-helper';
import {
  FileBadge,
  Printer,
  Edit3,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Shield,
  Layers,
  AlertTriangle,
  Award,
  Building2,
  Factory,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
  Calendar,
  DollarSign,
  PieChart,
  FileText,
  Target,
  Compass,
  Briefcase,
  Users,
  BarChart3,
  Clock,
  Zap,
} from 'lucide-react';

interface ExecutiveSummaryTabProps {
  report: AnalysisReport;
  realQuarterlyFinancials?: ParsedVietcapQuarter[];
  onUpdateReport: (updated: AnalysisReport) => void;
  isEditingGlobal?: boolean;
}

/**
 * Hàm phân tích cú pháp markdown và tự động nhận diện, làm nổi bật số liệu tài chính:
 * - In đậm **...**
 * - Tự động định dạng số liệu tài chính quan trọng: %, tỷ, lần, x, YoY, QoQ
 */
function renderHighlightedInline(content: string): React.ReactNode {
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let boldMatch: RegExpExecArray | null;

  const highlightMetrics = (subStr: string, keyPrefix: string): React.ReactNode[] => {
    const metricRegex = /([+-]?\d+[\.,]?\d*%\s*(?:YoY|QoQ)?|[+-]?\d+[\.,]?\d*\s*(?:tỷ|nghìn tỷ|triệu)|[+-]?\d+[\.,]?\d*\s*(?:lần|x))/gi;
    const subParts: React.ReactNode[] = [];
    let subLast = 0;
    let m: RegExpExecArray | null;

    while ((m = metricRegex.exec(subStr)) !== null) {
      if (m.index > subLast) {
        subParts.push(subStr.substring(subLast, m.index));
      }
      subParts.push(
        <span
          key={`${keyPrefix}-m-${m.index}`}
          className="font-semibold text-slate-900 dark:text-emerald-300 font-mono"
        >
          {m[1]}
        </span>
      );
      subLast = metricRegex.lastIndex;
    }

    if (subLast < subStr.length) {
      subParts.push(subStr.substring(subLast));
    }
    return subParts.length > 0 ? subParts : [subStr];
  };

  while ((boldMatch = boldRegex.exec(content)) !== null) {
    if (boldMatch.index > lastIndex) {
      parts.push(...highlightMetrics(content.substring(lastIndex, boldMatch.index), `pre-${boldMatch.index}`));
    }
    parts.push(
      <strong
        key={`bold-${boldMatch.index}`}
        className="font-bold text-slate-900 dark:text-white"
      >
        {boldMatch[1]}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(...highlightMetrics(content.substring(lastIndex), `post-${lastIndex}`));
  }

  return parts.length > 0 ? parts : content;
}

/**
 * Tự động trích xuất chỉ số tài chính trọng tâm để gắn Badge góc phải thẻ:
 * Ví dụ: "+45% YoY", "ROE: 23.8%", "782.9 tỷ", "1.45 lần", "0.85x"
 */
function extractStatBadge(text?: string, fallback?: string): string {
  if (!text) return fallback || '';

  // 1. Tăng trưởng YoY / QoQ: ví dụ "+45% YoY", "167% YoY"
  const yoyMatch = text.match(/([+-]?\d+[\.,]?\d*%\s*(?:YoY|QoQ))/i);
  if (yoyMatch) return yoyMatch[1].trim();

  // 2. Chỉ số sinh lời & biên lợi nhuận
  const namedMetricMatch = text.match(/(?:ROE|ROIC|Biên gộp|Biên ròng|Biên EBIT|Biên EBITDA)[^\d\w]{0,6}(\d+[\.,]?\d*%)/i);
  if (namedMetricMatch) {
    const nameMatch = namedMetricMatch[0].match(/^[a-zA-ZÀ-ỹ\s]+/);
    const cleanName = nameMatch ? nameMatch[0].trim() : 'Chỉ số';
    return `${cleanName}: ${namedMetricMatch[1]}`;
  }

  // 3. Hệ số đòn bẩy hoặc thanh khoản: ví dụ "1.45 lần", "0.85x"
  const ratioMatch = text.match(/(\d+[\.,]?\d*\s*(?:lần|x))/i);
  if (ratioMatch) return ratioMatch[1].trim();

  // 4. Giá trị tiền quy mô lớn: ví dụ "+782.9 tỷ", "1,500 tỷ"
  const tyMatch = text.match(/([+-]?\d+[\.,]?\d*\s*tỷ)/i);
  if (tyMatch) return tyMatch[1].trim();

  // 5. Phần trăm đơn lẻ
  const pctMatch = text.match(/([+-]?\d+[\.,]?\d*%)/i);
  if (pctMatch) return pctMatch[1].trim();

  return fallback || '';
}

const PILLAR_TONE_STYLES = {
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
    borderLeft: 'border-emerald-600 dark:border-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50',
    sparkle: 'text-emerald-600 dark:text-emerald-400',
    headerBg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
  },
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
    borderLeft: 'border-blue-600 dark:border-blue-500',
    badge: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/50',
    sparkle: 'text-blue-600 dark:text-blue-400',
    headerBg: 'bg-blue-50/40 dark:bg-blue-950/20',
  },
  purple: {
    iconBg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400',
    borderLeft: 'border-purple-600 dark:border-purple-500',
    badge: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50',
    sparkle: 'text-purple-600 dark:text-purple-400',
    headerBg: 'bg-purple-50/40 dark:bg-purple-950/20',
  },
  amber: {
    iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
    borderLeft: 'border-amber-600 dark:border-amber-500',
    badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50',
    sparkle: 'text-amber-600 dark:text-amber-400',
    headerBg: 'bg-amber-50/40 dark:bg-amber-950/20',
  },
  indigo: {
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400',
    borderLeft: 'border-indigo-600 dark:border-indigo-500',
    badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/50',
    sparkle: 'text-indigo-600 dark:text-indigo-400',
    headerBg: 'bg-indigo-50/40 dark:bg-indigo-950/20',
  },
  teal: {
    iconBg: 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
    borderLeft: 'border-teal-600 dark:border-teal-500',
    badge: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/50',
    sparkle: 'text-teal-600 dark:text-teal-400',
    headerBg: 'bg-teal-50/40 dark:bg-teal-950/20',
  },
};

interface InsightPillarCardProps {
  icon: React.ElementType;
  pillarLetter: string;
  title: string;
  text?: string;
  defaultBadge?: string;
  tone?: 'emerald' | 'blue' | 'purple' | 'amber' | 'indigo' | 'teal';
}

/**
 * Thẻ trụ cột phân tích thông minh kết hợp Option A & Option B:
 * - Header có Icon theo mảng + Huy hiệu chỉ số trọng tâm (Micro-chip)
 * - Khối 1: Điểm nhấn trọng tâm (Executive Takeaway box)
 * - Khối tiếp theo: Luận điểm & số liệu hỗ trợ với số liệu nổi bật
 */
function InsightPillarCard({
  icon: Icon,
  pillarLetter,
  title,
  text,
  defaultBadge,
  tone = 'emerald',
}: InsightPillarCardProps) {
  const toneStyle = PILLAR_TONE_STYLES[tone] || PILLAR_TONE_STYLES.emerald;
  const badge = extractStatBadge(text, defaultBadge);

  if (!text || text.trim().length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 bg-gray-50/40 dark:bg-gray-800/20 break-inside-avoid">
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${toneStyle.iconBg}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-xs text-slate-900 dark:text-white font-heading">
            {pillarLetter}. {title}
          </span>
        </div>
        <p className="text-xs text-slate-400 italic">Đang cập nhật phân tích chi tiết...</p>
      </div>
    );
  }

  // Phân tách các khối
  let rawBlocks = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawBlocks.length <= 1 && text.includes('•')) {
    rawBlocks = text
      .split('•')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  const cleanBlocks = rawBlocks
    .map((b) => b.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter((b) => b.length > 0);

  const firstBlock = cleanBlocks[0] || '';
  const supportingBlocks = cleanBlocks.slice(1);

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between break-inside-avoid">
      {/* Card Header with Category Tint & Metric Chip */}
      <div className={`px-3.5 py-2 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between gap-2 ${toneStyle.headerBg}`}>
        <div className="flex items-center space-x-2 min-w-0">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${toneStyle.iconBg}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-xs text-slate-900 dark:text-white truncate font-heading">
            {pillarLetter}. {title}
          </span>
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 font-mono tracking-tight ${toneStyle.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Executive Takeaway Box (Điểm Nhấn Trọng Tâm) */}
          {firstBlock && (
            <div className={`bg-slate-50/90 dark:bg-gray-800/70 border-l-[3px] ${toneStyle.borderLeft} rounded-r-lg px-2.5 py-2 text-xs leading-relaxed text-slate-800 dark:text-gray-200 shadow-2xs`}>
              <div className="flex items-center space-x-1 mb-1">
                <Sparkles className={`w-3 h-3 shrink-0 ${toneStyle.sparkle}`} />
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-heading">
                  Điểm Nhấn Trọng Tâm
                </span>
              </div>
              <div className="leading-relaxed">
                {renderHighlightedInline(firstBlock)}
              </div>
            </div>
          )}

          {/* Supporting Factors */}
          {supportingBlocks.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              {supportingBlocks.map((block, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs leading-relaxed text-slate-600 dark:text-gray-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-gray-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    {renderHighlightedInline(block)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component hiển thị nội dung markdown trong Research Memo một cách chuyên nghiệp:
 * - Tự động bóc tách các bullet points, số thứ tự
 * - Phân tích cú pháp in đậm **...**, làm nổi bật các số liệu tài chính
 * - Hiển thị từng ý bằng bullet điểm nhấn chuẩn quỹ đầu tư
 * - Loại bỏ hoàn toàn các ký tự markdown thô (•, **, *)
 */
function MemoContentRenderer({
  text,
  className = '',
  emptyNotice = 'Đang cập nhật dữ liệu...',
}: {
  text?: string;
  className?: string;
  emptyNotice?: string;
}) {
  if (!text || text.trim().length === 0) {
    return <p className="text-xs text-slate-400 italic">{emptyNotice}</p>;
  }

  // 1. Tách văn bản thành các dòng/khối logic
  let rawBlocks = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Nếu cả đoạn nằm trên 1 dòng nhưng có nhiều dấu bullet '•'
  if (rawBlocks.length <= 1 && text.includes('•')) {
    rawBlocks = text
      .split('•')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  // 2. Nếu chỉ có 1 khối và không có dấu hiệu danh sách
  const isList =
    rawBlocks.length > 1 ||
    rawBlocks.some(
      (b) =>
        b.startsWith('•') ||
        b.startsWith('-') ||
        b.startsWith('*') ||
        /^\d+\.\s+/.test(b) ||
        /^\*\*\d+\./.test(b)
    );

  if (!isList && rawBlocks.length === 1) {
    const singleClean = rawBlocks[0].replace(/^[-*•]\s*/, '').trim();
    return (
      <p className={`text-xs text-slate-700 dark:text-gray-300 leading-relaxed ${className}`}>
        {renderHighlightedInline(singleClean)}
      </p>
    );
  }

  // 3. Render danh sách các ý với bullet point đẹp mắt
  return (
    <div className={`space-y-2 text-xs text-slate-700 dark:text-gray-300 leading-relaxed ${className}`}>
      {rawBlocks.map((block, idx) => {
        const cleanBlock = block.replace(/^[-*•]\s*/, '').trim();
        if (!cleanBlock) return null;

        return (
          <div key={idx} className="flex items-start space-x-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-1.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{renderHighlightedInline(cleanBlock)}</div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Bảng dự phóng kết quả kinh doanh 8 Quý rút gọn từ Tab F theo 5 nhóm tiêu chí then chốt:
 * 1. Doanh thu thuần
 * 2. 3 Biên lợi nhuận (Biên Gộp, Biên EBITDA, Biên LNST Cốt Lõi)
 * 3. LNST cốt lõi
 * 4. EPS cốt lõi
 * 5. 4 Hệ số định giá (P/E, P/B, P/S, EV/EBITDA)
 */
function Forecast8QSummaryTable({
  matrixData,
  isCompact = false,
}: {
  matrixData: Forecast8QMatrixResult;
  isCompact?: boolean;
}) {
  const { quarters, ttmForward } = matrixData;

  const thPad = isCompact ? 'py-1 px-1.5' : 'py-2 px-2.5';
  const tdPad = isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2.5';
  const textSize = isCompact ? 'text-[9.5px] print:text-[8px]' : 'text-xs';

  const rows: Array<{
    id: string;
    label: string;
    unit: string;
    isBold?: boolean;
    isHighlight?: boolean;
    isIndent?: boolean;
    getValue: (q: Forecast8QSummaryItem) => string;
    getTTM: () => string;
    getYoY?: () => string;
  }> = [
    // 1. Doanh thu thuần
    {
      id: 'revenue',
      label: '1. Doanh thu thuần',
      unit: 'tỷ',
      isBold: true,
      getValue: (q) => q.revenue.toLocaleString('vi-VN'),
      getTTM: () => ttmForward.revenue.toLocaleString('vi-VN'),
      getYoY: () =>
        ttmForward.revenueGrowthYoY > 0
          ? `+${ttmForward.revenueGrowthYoY}%`
          : `${ttmForward.revenueGrowthYoY}%`,
    },
    // 2. 3 Biên lợi nhuận
    {
      id: 'grossMargin',
      label: '• Biên Lợi Nhuận Gộp',
      unit: '%',
      isIndent: true,
      getValue: (q) => `${q.grossMargin}%`,
      getTTM: () => `${ttmForward.grossMargin}%`,
      getYoY: () => '-',
    },
    {
      id: 'ebitdaMargin',
      label: '• Biên EBITDA',
      unit: '%',
      isIndent: true,
      getValue: (q) => `${q.ebitdaMargin}%`,
      getTTM: () => `${ttmForward.ebitdaMargin}%`,
      getYoY: () => '-',
    },
    {
      id: 'netMargin',
      label: '• Biên LNST Cốt Lõi',
      unit: '%',
      isIndent: true,
      getValue: (q) => `${q.netMargin}%`,
      getTTM: () => `${ttmForward.netMargin}%`,
      getYoY: () => '-',
    },
    // 3. LNST cốt lõi
    {
      id: 'netProfit',
      label: '2. LNST Cốt Lõi',
      unit: 'tỷ',
      isBold: true,
      isHighlight: true,
      getValue: (q) => q.netProfit.toLocaleString('vi-VN'),
      getTTM: () => ttmForward.netProfit.toLocaleString('vi-VN'),
      getYoY: () =>
        ttmForward.netProfitGrowthYoY > 0
          ? `+${ttmForward.netProfitGrowthYoY}%`
          : `${ttmForward.netProfitGrowthYoY}%`,
    },
    // 4. EPS cốt lõi
    {
      id: 'eps',
      label: '3. EPS Cốt Lõi',
      unit: 'đ/cp',
      isBold: true,
      getValue: (q) => q.eps.toLocaleString('vi-VN'),
      getTTM: () => ttmForward.eps.toLocaleString('vi-VN'),
      getYoY: () =>
        ttmForward.netProfitGrowthYoY > 0
          ? `+${ttmForward.netProfitGrowthYoY}%`
          : `${ttmForward.netProfitGrowthYoY}%`,
    },
    // 5. 4 Hệ số định giá
    {
      id: 'pe',
      label: '• Hệ số P/E',
      unit: 'lần',
      isIndent: true,
      getValue: (q) => `${q.pe}x`,
      getTTM: () => `${ttmForward.pe}x`,
      getYoY: () => '-',
    },
    {
      id: 'pb',
      label: '• Hệ số P/B',
      unit: 'lần',
      isIndent: true,
      getValue: (q) => `${q.pb}x`,
      getTTM: () => `${ttmForward.pb}x`,
      getYoY: () => '-',
    },
    {
      id: 'ps',
      label: '• Hệ số P/S',
      unit: 'lần',
      isIndent: true,
      getValue: (q) => `${q.ps || 0.5}x`,
      getTTM: () => `${ttmForward.ps || 0.5}x`,
      getYoY: () => '-',
    },
    {
      id: 'evEbitda',
      label: '• Hệ số EV/EBITDA',
      unit: 'lần',
      isIndent: true,
      getValue: (q) => `${q.evEbitda}x`,
      getTTM: () => `${ttmForward.evEbitda}x`,
      getYoY: () => '-',
    },
  ];

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 shadow-xs">
      <table className={`w-full ${textSize} text-left border-collapse font-mono`}>
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-800/80 font-bold text-slate-700 dark:text-gray-300">
            <th className={`${thPad} font-sans min-w-[125px] whitespace-nowrap`}>Chỉ tiêu</th>
            <th className={`${thPad} text-center font-sans w-9`}>ĐVT</th>
            {quarters.map((q, idx) => (
              <th
                key={idx}
                className={`${thPad} text-right whitespace-nowrap ${
                  idx < 4
                    ? 'bg-slate-100/60 dark:bg-slate-950/25 text-slate-700 dark:text-gray-300'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                <span>{idx < 4 ? (idx === 3 ? 'Q0' : `Q-${3 - idx}`) : `Q+${idx - 3}(F)`}</span>
                <span className="block text-[8px] font-normal text-slate-500 dark:text-gray-400">
                  {q.period} {idx === 3 ? '(Thực tế)' : ''}
                </span>
              </th>
            ))}
            <th className={`${thPad} text-right bg-gray-100/80 dark:bg-gray-800 whitespace-nowrap text-slate-800 dark:text-white`}>
              <span>TTM 4Q Tới</span>
              <span className="block text-[8px] font-normal text-slate-500">Forward</span>
            </th>
            <th className={`${thPad} text-right bg-gray-100/80 dark:bg-gray-800 whitespace-nowrap text-slate-800 dark:text-white`}>
              <span>Tăng trưởng</span>
              <span className="block text-[8px] font-normal text-slate-500">YoY %</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {rows.map((r) => {
            const isHighlighted = r.isHighlight;
            const rowBg = isHighlighted
              ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
              : 'hover:bg-gray-50/50 dark:hover:bg-gray-850/40';
            const textWeight = r.isBold
              ? 'font-bold text-slate-900 dark:text-white'
              : 'text-slate-700 dark:text-gray-300';
            return (
              <tr key={r.id} className={`${rowBg} ${textWeight}`}>
                <td
                  className={`${tdPad} font-sans ${
                    r.isIndent ? 'pl-3.5 text-slate-600 dark:text-gray-400 font-normal' : ''
                  }`}
                >
                  {r.label}
                </td>
                <td className={`${tdPad} text-center text-slate-400 font-sans`}>{r.unit}</td>
                {quarters.map((q, idx) => (
                  <td
                    key={idx}
                    className={`${tdPad} text-right tabular-nums ${
                      idx < 4
                        ? 'bg-slate-50/20 dark:bg-slate-950/10'
                        : 'bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300 font-medium'
                    }`}
                  >
                    {r.getValue(q)}
                  </td>
                ))}
                <td
                  className={`${tdPad} text-right tabular-nums font-bold bg-gray-50/60 dark:bg-gray-850/40 text-slate-900 dark:text-white`}
                >
                  {r.getTTM()}
                </td>
                <td
                  className={`${tdPad} text-right tabular-nums font-bold ${
                    r.getYoY && r.getYoY() !== '-'
                      ? r.getYoY()!.startsWith('+')
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                      : 'text-slate-400'
                  }`}
                >
                  {r.getYoY ? r.getYoY() : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ExecutiveSummaryTab({
  report,
  realQuarterlyFinancials,
  onUpdateReport,
  isEditingGlobal = false,
}: ExecutiveSummaryTabProps) {
  const { theme } = useTheme();

  // Chế độ hiển thị: factsheet (2 trang A4 chuẩn) | memo (báo cáo nghiên cứu chi tiết nhiều trang)
  const [viewMode, setViewMode] = useState<'factsheet' | 'memo'>('factsheet');
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const isEditing = isEditingGlobal || isEditingLocal;

  // Khởi tạo hoặc nạp dữ liệu summary đã lưu (kiểm tra làm mới nếu tồn tại luận điểm template cũ hoặc text cụt)
  const initialData = useMemo(() => {
    if (report.executiveSummary) {
      const hasOldGenericTheses = report.executiveSummary.investmentTheses?.some(
        (t) =>
          t.title?.includes('Mở rộng quy mô công suất') ||
          t.content?.includes('nhà máy') ||
          t.content?.includes('thế gi...')
      );
      if (!hasOldGenericTheses) {
        return report.executiveSummary;
      }
    }
    return extractDefaultExecutiveSummary(report, realQuarterlyFinancials);
  }, [report, realQuarterlyFinancials]);

  const [summaryData, setSummaryData] = useState<ExecutiveSummaryData>(initialData);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tính toán ma trận 8 quý (Q-3..Q0 thực tế và Q+1..Q+4 dự phóng) đồng bộ trực tiếp từ Tab F
  const forecast8QData = useMemo(() => {
    return compute8QuarterForecastMatrix(report, realQuarterlyFinancials);
  }, [report, realQuarterlyFinancials]);

  // Đồng bộ khi report.executiveSummary hoặc realQuarterlyFinancials thay đổi từ bên ngoài
  useEffect(() => {
    if (report.executiveSummary) {
      const hasOldGenericTheses = report.executiveSummary.investmentTheses?.some(
        (t) =>
          t.title?.includes('Mở rộng quy mô công suất') ||
          t.content?.includes('thế gi...')
      );
      if (hasOldGenericTheses) {
        const fresh = extractDefaultExecutiveSummary(report, realQuarterlyFinancials);
        setSummaryData(fresh);
        onUpdateReport({ ...report, executiveSummary: fresh });
        return;
      }
      setSummaryData(report.executiveSummary);
    } else {
      setSummaryData(extractDefaultExecutiveSummary(report, realQuarterlyFinancials));
    }
  }, [report.ticker, report.executiveSummary, realQuarterlyFinancials]);

  // Lưu chỉnh sửa
  const handleSave = () => {
    const updatedReport: AnalysisReport = {
      ...report,
      executiveSummary: summaryData,
    };
    onUpdateReport(updatedReport);
    setIsEditingLocal(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Đồng bộ lại từ các tab
  const handleSyncFromTabs = () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn trích xuất và đồng bộ lại toàn bộ dữ liệu từ các tab A-I? Các chỉnh sửa tay chưa lưu trên tab này có thể bị ghi đè.'
      )
    ) {
      const freshData = extractDefaultExecutiveSummary(report, realQuarterlyFinancials);
      setSummaryData(freshData);
      onUpdateReport({ ...report, executiveSummary: freshData });
    }
  };

  // Xử lý in / xuất PDF
  const handlePrint = () => {
    window.print();
  };

  // Helper CRUD cho danh sách Items
  const handleUpdateItem = (
    listKey: 'investmentTheses' | 'catalysts' | 'keyRisks',
    id: string,
    field: keyof ExecutiveSummaryItem,
    value: string
  ) => {
    setSummaryData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddItem = (listKey: 'investmentTheses' | 'catalysts' | 'keyRisks') => {
    const newId = `${listKey}-${Date.now()}`;
    const newItem: ExecutiveSummaryItem = {
      id: newId,
      title: 'Tiêu đề mục mới...',
      content: 'Nội dung chi tiết mục mới...',
      tag: 'Bổ sung',
      impact: 'Trung bình',
    };
    setSummaryData((prev) => ({
      ...prev,
      [listKey]: [...prev[listKey], newItem],
    }));
  };

  const handleDeleteItem = (
    listKey: 'investmentTheses' | 'catalysts' | 'keyRisks',
    id: string
  ) => {
    setSummaryData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((item) => item.id !== id),
    }));
  };

  const currentPrice = report.marketData?.currentPrice || report.valuationHub?.currentPrice || 0;
  const targetPrice = summaryData.valuationScenarios?.base?.price || 0;
  const upsidePct = summaryData.valuationScenarios?.base?.upsidePct || 0;

  return (
    <div className="tab-j-container space-y-6">
      {/* 1. THANH ĐIỀU KHIỂN / TOOLBAR (ẨN KHI IN) */}
      <div className="print:hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <FileBadge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Báo Cáo Tóm Tắt Dành Cho Nhà Đầu Tư
              </h2>
              <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                {viewMode === 'factsheet' ? 'Factsheet 2 Trang A4' : 'Research Memo Chi Tiết'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {viewMode === 'factsheet'
                ? 'Định dạng Factshet 2 trang chuẩn quỹ đầu tư, cô đọng, vừa vặn trang in'
                : 'Định dạng Báo cáo nghiên cứu chi tiết đầy đủ mọi luận cứ, bảng biểu chuyên sâu'}
            </p>
          </div>
        </div>

        {/* Cụm nút chuyển chế độ & thao tác */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch chế độ hiển thị */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs">
            <button
              onClick={() => setViewMode('factsheet')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                viewMode === 'factsheet'
                  ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileBadge className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Factsheet 2 Trang A4</span>
            </button>
            <button
              onClick={() => setViewMode('memo')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                viewMode === 'memo'
                  ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Research Memo Chi Tiết</span>
            </button>
          </div>

          {/* Nút Đồng bộ lại từ các tab */}
          <button
            onClick={handleSyncFromTabs}
            title="Trích xuất lại từ các Tab A-I"
            className="flex items-center space-x-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Đồng bộ từ các tab</span>
          </button>

          {/* Nút Chỉnh sửa tay */}
          <button
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditingLocal(true);
              }
            }}
            className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              isEditing
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500'
                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60'
            }`}
          >
            {isEditing ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Lưu Chỉnh Sửa</span>
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Chỉnh Sửa Tay</span>
              </>
            )}
          </button>

          {/* Nút In / Xuất PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-gray-100 px-4 py-2 text-xs font-bold shadow-sm transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Xuất PDF / In ({viewMode === 'factsheet' ? 'Factsheet' : 'Memo'})</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="print:hidden flex items-center space-x-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-300 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Đã lưu thành công các chỉnh sửa của Báo cáo tóm tắt!</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHẾ ĐỘ 1: FACTSHEET 2 TRANG A4 CHUẨN (CÔ ĐỌNG, VỪA VẶN TRANG IN)         */}
      {/* ========================================================================= */}
      {viewMode === 'factsheet' && (
        <div className="factsheet-wrapper space-y-6 print:space-y-0">
          
          {/* TRANG 1: HỒ SƠ DOANH NGHIỆP, CHUỖI GIÁ TRỊ & SỨC KHỎE TÀI CHÍNH */}
          <div className="factsheet-page-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs p-6 print:p-0 print:border-none print:shadow-none print:space-y-3.5 space-y-5">
            {/* Header Factsheet */}
            <div className="border-b border-gray-200 dark:border-gray-800 pb-3 print:pb-2 print:border-slate-300">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="relative h-9 w-32 shrink-0 print:block">
                    <Image
                      src="/brand/logo/logo-full-light.svg"
                      alt="ValueX Logo"
                      fill
                      className="object-contain dark:hidden print:block"
                      priority
                    />
                    <Image
                      src="/brand/logo/logo-full-dark.svg"
                      alt="ValueX Logo Dark"
                      fill
                      className="object-contain hidden dark:block print:hidden"
                      priority
                    />
                  </div>
                  <div className="border-l border-gray-200 dark:border-gray-700 pl-3 py-0.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400">
                      ValueX Institutional Factsheet
                    </span>
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-gray-300">
                      {summaryData.reportDate || report.createdDate} • Tầm nhìn {summaryData.targetHorizon}
                    </div>
                  </div>
                </div>

                {/* Pill Khuyến nghị & Mục tiêu */}
                <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800/60 print:bg-slate-100 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 print:border-slate-300 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Khuyến nghị</span>
                    <span className="text-sm font-extrabold text-emerald-600 font-heading">{summaryData.recommendation}</span>
                  </div>
                  <div className="border-l border-gray-200 dark:border-gray-700 pl-2.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Mục tiêu</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                      {targetPrice > 0 ? targetPrice.toLocaleString('vi-VN') : '---'} đ
                    </span>
                  </div>
                  <div className="border-l border-gray-200 dark:border-gray-700 pl-2.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Kỳ vọng</span>
                    <span className={`text-xs font-extrabold font-mono ${upsidePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {upsidePct >= 0 ? `+${upsidePct}%` : `${upsidePct}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thông tin cổ phiếu & thị giá */}
              <div className="mt-2.5 flex items-baseline justify-between pt-2 border-t border-gray-100 dark:border-gray-800 print:border-slate-200 text-xs">
                <div className="flex items-baseline space-x-2.5">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white font-heading">{report.ticker}</span>
                  <span className="font-semibold text-slate-700 dark:text-gray-300">{report.companyName}</span>
                  <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-gray-400">
                    {((report.marketData as any)?.exchange || 'HOSE')} • {summaryData.coreBusiness}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] font-mono">
                  <span>Thị giá: <strong className="text-slate-900 dark:text-white">{currentPrice > 0 ? currentPrice.toLocaleString('vi-VN') : '---'} đ</strong></span>
                  <span>P/E 5Y: <strong>{report.marketData?.pe5YearAvg ? `${report.marketData.pe5YearAvg}x` : '---'}</strong></span>
                  <span>P/E Ngành: <strong>{report.marketData?.peIndustry ? `${report.marketData.peIndustry}x` : '---'}</strong></span>
                </div>
              </div>
            </div>

            {/* Mục 1: Tổng quan DN & Sản phẩm cốt lõi */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-800 pb-1 print:border-slate-300">
                <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                  1. Tổng Quan Doanh Nghiệp &amp; Vị Thế Cốt Lõi
                </h3>
              </div>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={summaryData.overviewSummary}
                  onChange={(e) => setSummaryData({ ...summaryData, overviewSummary: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 p-2.5 text-xs text-slate-900 dark:text-white"
                />
              ) : (
                <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-normal whitespace-pre-line print:line-clamp-4">
                  {summaryData.overviewSummary}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {summaryData.mainProducts.slice(0, 4).map((p, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[10px] text-slate-700 dark:text-gray-300"
                  >
                    • {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Mục 2: Chuỗi giá trị 3 mắt xích */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-800 pb-1 print:border-slate-300">
                <Factory className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                  2. Chuỗi Giá Trị &amp; Năng Lực Vận Hành
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-2.5 space-y-1">
                  <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                    Đầu Vào &amp; Chi Phí
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={summaryData.valueChainInput}
                      onChange={(e) => setSummaryData({ ...summaryData, valueChainInput: e.target.value })}
                      className="w-full rounded border p-1 text-[11px]"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line print:line-clamp-3">
                      {summaryData.valueChainInput}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-2.5 space-y-1">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Vận Hành &amp; Công Suất
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={summaryData.valueChainProduction}
                      onChange={(e) => setSummaryData({ ...summaryData, valueChainProduction: e.target.value })}
                      className="w-full rounded border p-1 text-[11px]"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line print:line-clamp-3">
                      {summaryData.valueChainProduction}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-2.5 space-y-1">
                  <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                    Đầu Ra &amp; Doanh Thu
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={summaryData.valueChainOutput}
                      onChange={(e) => setSummaryData({ ...summaryData, valueChainOutput: e.target.value })}
                      className="w-full rounded border p-1 text-[11px]"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line print:line-clamp-3">
                      {summaryData.valueChainOutput}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mục 3: Tình hình tài chính & Lợi thế cạnh tranh */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-800 pb-1 print:border-slate-300">
                <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                  3. Tình Hình Tài Chính &amp; Lợi Thế Cạnh Tranh
                </h3>
              </div>

              {/* Tóm lược tài chính & Moat (Gọn gàng trong Trang 1) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 p-2 space-y-1">
                  <span className="font-bold text-slate-800 dark:text-gray-200 flex items-center space-x-1 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Sức khỏe tài chính &amp; Dòng tiền:</span>
                  </span>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={summaryData.financialHealthSummary}
                      onChange={(e) => setSummaryData({ ...summaryData, financialHealthSummary: e.target.value })}
                      className="w-full rounded border p-1 text-[11px]"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-snug whitespace-pre-line print:line-clamp-3">
                      {summaryData.financialHealthSummary}
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 p-2 space-y-1">
                  <span className="font-bold text-slate-800 dark:text-gray-200 flex items-center space-x-1 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Lợi thế cạnh tranh (Economic Moat):</span>
                  </span>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={summaryData.competitiveMoatSummary}
                      onChange={(e) => setSummaryData({ ...summaryData, competitiveMoatSummary: e.target.value })}
                      className="w-full rounded border p-1 text-[11px]"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-snug whitespace-pre-line print:line-clamp-3">
                      {summaryData.competitiveMoatSummary}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TRANG 2: TRIỂN VỌNG, ĐỊNH GIÁ 3 KỊCH BẢN, RỦI RO & KHUYẾN NGHỊ */}
          <div className="factsheet-page-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs p-6 print:p-0 print:border-none print:shadow-none print:space-y-3.5 space-y-5">
            {/* Header nhỏ cho Trang 2 khi in */}
            <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-1.5 mb-1 text-[10px] text-slate-600">
              <span className="font-bold uppercase tracking-wider">
                ValueX Institutional Factsheet • {report.ticker} ({report.companyName})
              </span>
              <span className="font-mono">Trang 2 / 2</span>
            </div>

            {/* Mục 4: Triển vọng & Luận điểm đầu tư cốt lõi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1 print:border-slate-300">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                    4. Triển Vọng &amp; Luận Điểm Đầu Tư Then Chốt
                  </h3>
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleAddItem('investmentTheses')}
                    className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-600"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Thêm Luận Điểm</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {summaryData.investmentTheses.slice(0, 3).map((thesis, idx) => (
                  <div
                    key={thesis.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-800/80 bg-gray-50/40 dark:bg-gray-800/30 p-2 space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 text-[9px] font-bold font-mono">
                          0{idx + 1}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={thesis.title}
                            onChange={(e) => handleUpdateItem('investmentTheses', thesis.id, 'title', e.target.value)}
                            className="rounded border px-1.5 py-0.5 text-xs font-bold w-60"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                            {thesis.title}
                          </span>
                        )}
                      </div>
                      {thesis.tag && (
                        <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                          {thesis.tag}
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={thesis.content}
                        onChange={(e) => handleUpdateItem('investmentTheses', thesis.id, 'content', e.target.value)}
                        className="w-full rounded border p-1 text-[11px]"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-700 dark:text-gray-300 leading-snug pl-5 whitespace-pre-line print:line-clamp-2">
                        {thesis.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Chất xúc tác 6-12 tháng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {summaryData.catalysts.slice(0, 2).map((cat) => (
                  <div key={cat.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-amber-50/30 dark:bg-amber-950/20 p-2 text-[11px] space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-gray-200 block">• {cat.title}</span>
                    <span className="text-[10px] text-slate-600 dark:text-gray-400 block">{cat.content}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mục 5: Bảng dự phóng KQKD 8 Quý & Định giá mục tiêu */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-800 pb-1 print:border-slate-300">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                  5. Dự Phóng Kết Quả Kinh Doanh (8 Quý) &amp; Định Giá Mục Tiêu
                </h3>
              </div>

              {/* Bảng Dự Phóng 8 Quý rút gọn từ Tab F */}
              <Forecast8QSummaryTable matrixData={forecast8QData} isCompact={true} />

              {/* Thẻ tóm tắt 3 kịch bản định giá */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-1.5">
                  <div className="text-[9px] font-semibold text-slate-500 uppercase">Thận Trọng (Bear)</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-gray-200 text-xs mt-0.5">
                    {summaryData.valuationScenarios.bear.price.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    P/E {summaryData.valuationScenarios.bear.pe}x • {summaryData.valuationScenarios.bear.upsidePct >= 0 ? `+${summaryData.valuationScenarios.bear.upsidePct}%` : `${summaryData.valuationScenarios.bear.upsidePct}%`}
                  </div>
                </div>

                <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/25 p-1.5">
                  <div className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Cơ Sở (Base Case)</div>
                  <div className="font-mono font-extrabold text-emerald-900 dark:text-emerald-200 text-xs mt-0.5">
                    {summaryData.valuationScenarios.base.price.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[9px] text-emerald-700 font-bold font-mono">
                    P/E {summaryData.valuationScenarios.base.pe}x • +{summaryData.valuationScenarios.base.upsidePct}%
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-1.5">
                  <div className="text-[9px] font-semibold text-slate-500 uppercase">Tích Cực (Bull)</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-gray-200 text-xs mt-0.5">
                    {summaryData.valuationScenarios.bull.price.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    P/E {summaryData.valuationScenarios.bull.pe}x • +{summaryData.valuationScenarios.bull.upsidePct}%
                  </div>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  rows={2}
                  value={summaryData.forecastSummary}
                  onChange={(e) => setSummaryData({ ...summaryData, forecastSummary: e.target.value })}
                  className="w-full rounded border p-1 text-[11px]"
                />
              ) : (
                <p className="text-[10.5px] text-slate-600 dark:text-gray-400 leading-snug italic print:line-clamp-2">
                  {summaryData.forecastSummary}
                </p>
              )}
            </div>

            {/* Mục 6: Rủi ro trọng yếu */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-800 pb-1 print:border-slate-300">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                  6. Các Yếu Tố Rủi Ro &amp; Biện Pháp Phòng Vệ
                </h3>
              </div>
              <div className="space-y-1">
                {summaryData.keyRisks.slice(0, 3).map((risk) => (
                  <div key={risk.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-rose-50/20 dark:bg-rose-950/15 p-1.5 text-[11px] leading-snug">
                    <span className="font-bold text-slate-900 dark:text-white">• {risk.title}: </span>
                    <span className="text-slate-600 dark:text-gray-400 print:line-clamp-2">{risk.content}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mục 7: Lời bình chuyên viên & Disclaimer */}
            <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-gray-800 print:border-slate-300">
              {summaryData.analystNote && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2 text-[11px] text-slate-800 dark:text-gray-200 leading-snug">
                  <strong>Đánh giá tổng kết:</strong> {summaryData.analystNote}
                </div>
              )}
              <div className="text-[9px] text-slate-500 dark:text-gray-400 leading-tight space-y-1">
                <p><strong>Miễn trừ trách nhiệm:</strong> {summaryData.disclaimer}</p>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 print:border-slate-200 font-mono text-[8.5px]">
                  <span>{summaryData.preparedBy}</span>
                  <span>ValueX Platform • {report.ticker} • Factsheet Page 2/2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHẾ ĐỘ 2: RESEARCH MEMO CHI TIẾT (BÁO CÁO NGHIÊN CỨU TOÀN DIỆN NHIỀU TRANG)  */}
      {/* ========================================================================= */}
      {viewMode === 'memo' && (
        <div className="research-memo-container bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs p-6 md:p-10 space-y-10 print:p-0 print:border-none print:shadow-none print:space-y-8">
          
          {/* HEADER TRANG TRỌNG CỦA RESEARCH MEMO */}
          <div className="border-b-2 border-slate-900 dark:border-gray-700 pb-6 print:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative h-11 w-40 shrink-0 print:block">
                  <Image
                    src="/brand/logo/logo-full-light.svg"
                    alt="ValueX Logo"
                    fill
                    className="object-contain dark:hidden print:block"
                    priority
                  />
                  <Image
                    src="/brand/logo/logo-full-dark.svg"
                    alt="ValueX Logo Dark"
                    fill
                    className="object-contain hidden dark:block print:hidden"
                    priority
                  />
                </div>
                <div className="border-l-2 border-emerald-600 pl-4 py-0.5">
                  <div className="text-xs font-black tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
                    Equity Research Memorandum
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-gray-400">
                    Báo Cáo Phân Tích &amp; Thẩm Định Toàn Diện
                  </div>
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="font-bold text-slate-900 dark:text-white">Ngày phát hành: {summaryData.reportDate || report.createdDate}</div>
                <div className="text-slate-500 dark:text-gray-400">Đơn vị: {summaryData.preparedBy}</div>
              </div>
            </div>

            {/* Title Block & Bảng Metadata Toàn Diện */}
            <div className="mt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
                    BÁO CÁO CHI TIẾT DOANH NGHIỆP • {summaryData.coreBusiness}
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
                    {report.ticker} — {report.companyName}
                  </h1>
                </div>

                {/* Huy hiệu khuyến nghị lớn */}
                <div className="flex items-center space-x-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-5 py-3 rounded-2xl">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Khuyến Nghị</div>
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-heading">{summaryData.recommendation}</div>
                  </div>
                  <div className="border-l border-emerald-300 dark:border-emerald-800 pl-4">
                    <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-gray-400">Giá Mục Tiêu (Base)</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                      {targetPrice > 0 ? targetPrice.toLocaleString('vi-VN') : '---'} đ
                    </div>
                  </div>
                  <div className="border-l border-emerald-300 dark:border-emerald-800 pl-4">
                    <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-gray-400">Kỳ Vọng Sinh Lời</div>
                    <div className="text-lg font-extrabold text-emerald-600 font-mono">
                      +{upsidePct}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng tổng hợp dữ liệu giao dịch thị trường */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] uppercase">Thị giá hiện tại</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {currentPrice > 0 ? currentPrice.toLocaleString('vi-VN') : '---'} đ
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] uppercase">P/E 5Y Bình quân</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {report.marketData?.pe5YearAvg ? `${report.marketData.pe5YearAvg}x` : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] uppercase">P/E Ngành</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {report.marketData?.peIndustry ? `${report.marketData.peIndustry}x` : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] uppercase">P/B Ngành</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {report.marketData?.pbIndustry ? `${report.marketData.pbIndustry}x` : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] uppercase">Vốn Hóa</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {(report.marketData as any)?.marketCap
                      ? `${Math.round((report.marketData as any).marketCap / 1000).toLocaleString('vi-VN')} tỷ`
                      : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] uppercase">Sàn Giao Dịch</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {(report.marketData as any)?.exchange || 'HOSE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MỤC I: HỒ SƠ DOANH NGHIỆP, CƠ CẤU SỞ HỮU & BAN ĐIỀU HÀNH */}
          <div className="memo-section space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-slate-900 dark:border-gray-700 pb-2">
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                I. Hồ Sơ Doanh Nghiệp, Cơ Cấu Sở Hữu &amp; Ban Điều Hành
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300 mb-1.5">
                  1. Tổng quan lịch sử hình thành &amp; Mô hình hoạt động:
                </h3>
                <MemoContentRenderer text={report.sectionA?.historyAndOverview || summaryData.overviewSummary} />
              </div>

              {/* Sản phẩm chính */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300 mb-1.5">
                  2. Danh mục sản phẩm cốt lõi &amp; Mảng kinh doanh chủ lực:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summaryData.mainProducts.map((p, idx) => (
                    <div key={idx} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5 text-xs text-slate-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-medium">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cổ đông & Ban lãnh đạo từ Tab A */}
              {report.sectionA?.shareholdersAndManagement && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300 mb-1.5">
                    3. Cơ cấu cổ đông &amp; Đội ngũ quản trị:
                  </h3>
                  <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 p-3 text-xs text-slate-700 dark:text-gray-300 leading-relaxed border border-gray-200 dark:border-gray-800">
                    <MemoContentRenderer text={report.sectionA.shareholdersAndManagement} />
                  </div>
                </div>
              )}

              {/* Công ty con & liên kết từ Tab A */}
              {report.sectionA?.subsidiariesAndAffiliates && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300 mb-1.5">
                    4. Hệ sinh thái công ty con &amp; liên kết:
                  </h3>
                  <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 p-3 text-xs text-slate-700 dark:text-gray-300 leading-relaxed border border-gray-200 dark:border-gray-800">
                    <MemoContentRenderer text={report.sectionA.subsidiariesAndAffiliates} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MỤC II: PHÂN TÍCH CHUỖI GIÁ TRỊ & NĂNG LỰC SẢN XUẤT */}
          <div className="memo-section space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-slate-900 dark:border-gray-700 pb-2">
              <Factory className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                II. Phân Tích Chuỗi Giá Trị &amp; Năng Lực Vận Hành Sản Xuất
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center justify-between border-b border-blue-200 dark:border-blue-800 pb-1.5">
                  <span>1. Khâu Đầu Vào (Inputs)</span>
                  <span className="font-mono text-[11px]">Nguồn Cung</span>
                </div>
                <MemoContentRenderer text={report.sectionB?.valueChainInput || summaryData.valueChainInput} />
              </div>

              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-1.5">
                  <span>2. Vận Hành &amp; Công Suất</span>
                  <span className="font-mono text-[11px]">Nhà Máy</span>
                </div>
                <MemoContentRenderer text={report.sectionB?.valueChainProduction || summaryData.valueChainProduction} />
              </div>

              <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-1.5">
                  <span>3. Khâu Đầu Ra (Outputs)</span>
                  <span className="font-mono text-[11px]">Thị Trường</span>
                </div>
                <MemoContentRenderer text={report.sectionB?.valueChainOutput || summaryData.valueChainOutput} />
              </div>
            </div>

            {/* Cơ cấu doanh thu */}
            {summaryData.revenueStructureSummary && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3.5 border border-gray-200 dark:border-gray-700 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Cơ cấu tỷ trọng doanh thu: </span>
                <span className="text-slate-700 dark:text-gray-300">{summaryData.revenueStructureSummary}</span>
              </div>
            )}
          </div>

          {/* MỤC III: ĐÁNH GIÁ SỨC KHỎE TÀI CHÍNH TOÀN DIỆN & CON HÀO KINH TẾ */}
          <div className="memo-section space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-slate-900 dark:border-gray-700 pb-2">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                III. Đánh Giá Sức Khỏe Tài Chính Toàn Diện &amp; Con Hào Kinh Tế (Moat)
              </h2>
            </div>



            {/* Chi tiết 6 trụ cột tài chính & Con hào kinh tế */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300">
                Chi tiết các trụ cột tài chính then chốt &amp; Con hào kinh tế:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                {report.sectionC?.partA_LiquidityAndDebt && (
                  <InsightPillarCard
                    icon={Shield}
                    pillarLetter="A"
                    title="Thanh khoản & Khả năng trả nợ"
                    text={report.sectionC.partA_LiquidityAndDebt}
                    tone="blue"
                    defaultBadge="Thanh khoản tốt"
                  />
                )}
                {report.sectionC?.partB_CashFlowAndEarnings && (
                  <InsightPillarCard
                    icon={DollarSign}
                    pillarLetter="B"
                    title="Dòng tiền & Chuyển đổi lợi nhuận"
                    text={report.sectionC.partB_CashFlowAndEarnings}
                    tone="emerald"
                    defaultBadge="Dòng tiền dương"
                  />
                )}
                {report.sectionC?.partC_ProfitabilityAndROIC && (
                  <InsightPillarCard
                    icon={TrendingUp}
                    pillarLetter="C"
                    title="Sinh lời & Hiệu quả vốn ROIC"
                    text={report.sectionC.partC_ProfitabilityAndROIC}
                    tone="purple"
                    defaultBadge="ROE vượt trội"
                  />
                )}
                {report.sectionC?.partE_CapitalStructureAndFunding && (
                  <InsightPillarCard
                    icon={Layers}
                    pillarLetter="D"
                    title="Cơ cấu nguồn vốn & Đòn bẩy tài chính"
                    text={report.sectionC.partE_CapitalStructureAndFunding}
                    tone="indigo"
                    defaultBadge="Đòn bẩy an toàn"
                  />
                )}
                <InsightPillarCard
                  icon={Award}
                  pillarLetter="E"
                  title="Lợi Thế Cạnh Tranh Kinh Tế (Economic Moat)"
                  text={report.sectionE?.partA_EconomicMoat || summaryData.competitiveMoatSummary}
                  tone="amber"
                  defaultBadge="Moat bền vững"
                />
                <InsightPillarCard
                  icon={Users}
                  pillarLetter="F"
                  title="Ban Lãnh Đạo & Quản Trị Doanh Nghiệp"
                  text={report.sectionE?.partD_ManagementAndCapitalAllocation || summaryData.managementGovernanceSummary}
                  tone="teal"
                  defaultBadge="Quản trị minh bạch"
                />
              </div>
            </div>
          </div>

          {/* MỤC IV: TRIỂN VỌNG KINH DOANH & MA TRẬN CHẤT XÚC TÁC 6-12 THÁNG */}
          <div className="memo-section space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-slate-900 dark:border-gray-700 pb-2">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                IV. Triển Vọng Kinh Doanh, Luận Điểm Cốt Lõi &amp; Ma Trận Chất Xúc Tác
              </h2>
            </div>

            {/* 1. Các luận điểm đầu tư then chốt & Động lực chất lượng tăng trưởng */}
            {report.sectionD && (
              report.sectionD.partA_CurrentGrowth ||
              report.sectionD.partB_VisibilityNext2To4Q ||
              report.sectionD.partC_MarginDurability ||
              report.sectionD.partD_GrowthRunway ||
              report.sectionD.partE_GrowthToCash ||
              report.sectionD.partF_MediumTermGrowth
            ) ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300">
                  1. Các luận điểm đầu tư then chốt &amp; Động lực chất lượng tăng trưởng:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {report.sectionD.partA_CurrentGrowth && (
                    <InsightPillarCard
                      icon={Zap}
                      pillarLetter="A"
                      title="Tăng trưởng Hiện tại &amp; Động lực Bứt phá"
                      text={report.sectionD.partA_CurrentGrowth}
                      tone="emerald"
                      defaultBadge="Tăng trưởng cao"
                    />
                  )}
                  {report.sectionD.partB_VisibilityNext2To4Q && (
                    <InsightPillarCard
                      icon={Compass}
                      pillarLetter="B"
                      title="Tầm nhìn &amp; Độ chắc chắn 2-4 Quý tới"
                      text={report.sectionD.partB_VisibilityNext2To4Q}
                      tone="blue"
                      defaultBadge="Tầm nhìn 2-4Q"
                    />
                  )}
                  {report.sectionD.partC_MarginDurability && (
                    <InsightPillarCard
                      icon={TrendingUp}
                      pillarLetter="C"
                      title="Độ bền Biên lợi nhuận &amp; Sức mạnh Định giá"
                      text={report.sectionD.partC_MarginDurability}
                      tone="indigo"
                      defaultBadge="Biên LN bền vững"
                    />
                  )}
                  {report.sectionD.partD_GrowthRunway && (
                    <InsightPillarCard
                      icon={Target}
                      pillarLetter="D"
                      title="Dư địa Tăng trưởng Dài hạn &amp; Mở rộng Thị phần"
                      text={report.sectionD.partD_GrowthRunway}
                      tone="purple"
                      defaultBadge="Dư địa thị phần"
                    />
                  )}
                  {report.sectionD.partE_GrowthToCash && (
                    <InsightPillarCard
                      icon={DollarSign}
                      pillarLetter="E"
                      title="Chuyển hóa Lợi nhuận thành Dòng tiền &amp; ROIC"
                      text={report.sectionD.partE_GrowthToCash}
                      tone="amber"
                      defaultBadge="Chuyển hóa tiền mặt"
                    />
                  )}
                  {report.sectionD.partF_MediumTermGrowth && (
                    <InsightPillarCard
                      icon={BarChart3}
                      pillarLetter="F"
                      title="Tốc độ Tăng trưởng kép &amp; Động lực Trung hạn"
                      text={report.sectionD.partF_MediumTermGrowth}
                      tone="teal"
                      defaultBadge="Động lực trung hạn"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300">
                  1. Các luận điểm đầu tư then chốt:
                </h3>
                <div className="space-y-2.5">
                  {summaryData.investmentTheses.map((thesis, idx) => (
                    <div key={thesis.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 text-xs font-bold font-mono">
                            0{idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">{thesis.title}</h4>
                        </div>
                        {thesis.tag && (
                          <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {thesis.tag}
                          </span>
                        )}
                      </div>
                      <MemoContentRenderer text={thesis.content} className="pl-7" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Động lực tăng trưởng P x Q & Tối ưu chi phí */}
            {report.sectionF?.growthDriversRevenueAndCost && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 bg-gray-50 dark:bg-gray-800/50 space-y-2">
                <span className="font-bold text-xs uppercase text-slate-900 dark:text-white block">
                  2. Động lực tăng trưởng Sản lượng (Q), Giá bán (P) &amp; Tối ưu Chi phí:
                </span>
                <MemoContentRenderer text={report.sectionF.growthDriversRevenueAndCost} />
              </div>
            )}

            {/* 3. Bảng theo dõi chất xúc tác 6-12 tháng */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300">
                3. Ma trận theo dõi chất xúc tác then chốt (Catalysts Tracking):
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-3 py-2">Chất Xúc Tác / Sự Kiện</th>
                      <th className="px-3 py-2">Phân Loại</th>
                      <th className="px-3 py-2">Chi Tiết Kỳ Vọng &amp; Tiến Độ</th>
                      <th className="px-3 py-2 text-center">Mức Tác Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {summaryData.catalysts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">{c.title}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-gray-400">{c.tag || 'Dự án'}</td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-gray-300">{c.content}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{c.impact || 'Cao'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MỤC V: DỰ PHÓNG KẾT QUẢ KINH DOANH & BỘ TÍNH TOÁN ĐỊNH GIÁ CHI TIẾT */}
          <div className="memo-section space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-slate-900 dark:border-gray-700 pb-2">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                V. Dự Phóng Kết Quả Kinh Doanh &amp; Mô Hình Định Giá Chi Tiết
              </h2>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 bg-gray-50 dark:bg-gray-800/40 text-xs text-slate-700 dark:text-gray-300 leading-relaxed space-y-1.5">
                <strong className="text-slate-900 dark:text-white block">Luận điểm &amp; Cơ sở dự phóng KQKD:</strong>
                <MemoContentRenderer text={summaryData.forecastSummary} />
              </div>

              {/* Bảng dự phóng 8 Quý rút gọn từ Tab F */}
              <div className="space-y-1.5 pt-1">
                <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-gray-300">
                  Ma trận dự phóng 8 Quý (Q-3 → Q0 Thực Tế | Q+1 → Q+4 Dự Phóng):
                </h3>
                <Forecast8QSummaryTable matrixData={forecast8QData} isCompact={false} />
              </div>

              {/* Bảng kịch bản Định giá 3 Trường hợp */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden font-mono">
                  <thead className="bg-gray-100/80 dark:bg-gray-800 text-slate-700 dark:text-gray-300 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Kịch Bản Định Giá</th>
                      <th className="px-3 py-2.5 text-center">P/E Forward</th>
                      <th className="px-4 py-2.5 text-right">Giá Mục Tiêu (VND)</th>
                      <th className="px-4 py-2.5 text-right">Kỳ Vọng (Upside/Downside)</th>
                      <th className="px-4 py-2.5 font-sans">Luận Cứ Kịch Bản</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr>
                      <td className="px-4 py-2.5 font-sans font-medium text-slate-700 dark:text-gray-300 flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span>Thận Trọng (Bear Case)</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">{summaryData.valuationScenarios.bear.pe}x</td>
                      <td className="px-4 py-2.5 text-right font-bold">{summaryData.valuationScenarios.bear.price.toLocaleString('vi-VN')} đ</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${summaryData.valuationScenarios.bear.upsidePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {summaryData.valuationScenarios.bear.upsidePct >= 0 ? `+${summaryData.valuationScenarios.bear.upsidePct}%` : `${summaryData.valuationScenarios.bear.upsidePct}%`}
                      </td>
                      <td className="px-4 py-2.5 font-sans text-slate-500 text-[11px]">Giá bán bình quân giảm, chi phí đầu vào tăng cao</td>
                    </tr>
                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold border-y-2 border-emerald-500/30">
                      <td className="px-4 py-2.5 font-sans font-bold text-emerald-900 dark:text-emerald-300 flex items-center space-x-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span>CƠ SỞ (BASE CASE - TRỌNG TÂM)</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-emerald-800">{summaryData.valuationScenarios.base.pe}x</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-emerald-900 dark:text-emerald-200">{summaryData.valuationScenarios.base.price.toLocaleString('vi-VN')} đ</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-emerald-700">+{summaryData.valuationScenarios.base.upsidePct}%</td>
                      <td className="px-4 py-2.5 font-sans text-emerald-900 dark:text-emerald-300 text-[11px] font-medium">Công suất vận hành đúng kế hoạch, biên lãi phục hồi</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-sans font-medium text-slate-700 dark:text-gray-300 flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>Tích Cực (Bull Case)</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">{summaryData.valuationScenarios.bull.pe}x</td>
                      <td className="px-4 py-2.5 text-right font-bold">{summaryData.valuationScenarios.bull.price.toLocaleString('vi-VN')} đ</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600">+{summaryData.valuationScenarios.bull.upsidePct}%</td>
                      <td className="px-4 py-2.5 font-sans text-slate-500 text-[11px]">Sản lượng bứt phá vượt kỳ vọng, thị trường mở rộng</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MỤC VI: KHUNG ĐÁNH GIÁ RỦI RO & BIẾN SỐ VI PHẠM LUẬN ĐIỂM */}
          <div className="memo-section space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-slate-900 dark:border-gray-700 pb-2">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                VI. Khung Đánh Giá Rủi Ro Trọng Yếu &amp; Biện Pháp Phòng Vệ
              </h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {summaryData.keyRisks.map((risk) => (
                  <div key={risk.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-rose-50/15 dark:bg-rose-950/10 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{risk.title}</span>
                      <span className="text-[10px] text-rose-600 font-bold">[{risk.impact || 'Trung bình'}]</span>
                    </div>
                    <MemoContentRenderer text={risk.content} />
                  </div>
                ))}
              </div>

              {/* Biến số vi phạm luận điểm (Thesis Breakers) */}
              {report.postInvestmentFramework?.thesisBreakers && report.postInvestmentFramework.thesisBreakers.length > 0 && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                  <span className="font-bold text-xs uppercase text-slate-900 dark:text-white block">
                    Các biến số vi phạm luận điểm (Thesis Breakers) cần kích hoạt bán phòng thủ:
                  </span>
                  <div className="space-y-1 text-xs">
                    {report.postInvestmentFramework.thesisBreakers.map((tb) => (
                      <div key={tb.id} className="flex items-center justify-between text-slate-700 dark:text-gray-300">
                        <span>• <strong>{tb.variableName}</strong> (Ngưỡng cảnh báo: {tb.warningThreshold})</span>
                        <span className="font-bold text-rose-600">Hành động: {tb.actionIfViolated}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MỤC VII: KHUYẾN NGHỊ HÀNH ĐỘNG, CHIẾN LƯỢC ĐI TIỀN & MIỄN TRỪ TRÁCH NHIỆM */}
          <div className="memo-section space-y-4 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2 border-b-2 border-slate-900 dark:border-gray-700 pb-2">
              <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                VII. Chiến Lược Phân Bổ Vốn, Vùng Giải Ngân &amp; Miễn Trừ Trách Nhiệm
              </h2>
            </div>

            {/* Chiến lược vị thế & giải ngân */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Phân Bổ Vị Thế Đề Xuất</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {report.postInvestmentFramework?.positionTier || 'CHUẨN (CORE HOLDING)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Vùng Mua Gom (Buy Zone)</span>
                <span className="font-bold text-emerald-600 font-mono text-sm">
                  {report.postInvestmentFramework?.buyZone || `${(currentPrice * 0.96).toFixed(0)} - ${currentPrice.toFixed(0)} đ`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Vùng Chốt Lời (Take Profit)</span>
                <span className="font-bold text-blue-600 font-mono text-sm">
                  {report.postInvestmentFramework?.takeProfitZone || `${(targetPrice * 0.98).toFixed(0)} - ${targetPrice.toFixed(0)} đ`}
                </span>
              </div>
            </div>

            {/* Nhận định chuyên viên */}
            {summaryData.analystNote && (
              <div className="rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 p-4 text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                <strong className="text-slate-900 dark:text-white block mb-1">Kết luận của Chuyên viên phân tích:</strong>
                {summaryData.analystNote}
              </div>
            )}

            {/* Disclaimer & Footer Brand */}
            <div className="text-[10px] text-slate-500 dark:text-gray-400 leading-relaxed space-y-2 pt-2">
              <p>
                <strong className="text-slate-700 dark:text-gray-300">Tuyên bố miễn trừ trách nhiệm: </strong>
                {summaryData.disclaimer}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800 print:border-slate-300 font-mono text-[9.5px]">
                <div>{summaryData.preparedBy}</div>
                <div>ValueX Institutional Research Platform • {report.ticker}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
