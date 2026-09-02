'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Percent,
  Compass,
  Coins,
  LineChart,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { SectionD_GrowthQuality } from '@/types/analysis';
import {
  calculateGrowthQualityScore,
  GrowthQualityScorecardResult,
  GrowthSectionScoreResult,
} from '@/lib/growth-quality-calculator';
import { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';

interface GrowthQualityScorecardProps {
  ticker: string;
  sectionD: SectionD_GrowthQuality;
  realQuarterlyFinancials: ParsedVietcapQuarter[];
  isEditing?: boolean;
  onSectionDChange?: (updated: SectionD_GrowthQuality) => void;
  renderMarkdown: (content: string) => React.ReactNode;
}

export const GrowthQualityScorecard: React.FC<GrowthQualityScorecardProps> = ({
  ticker,
  sectionD,
  realQuarterlyFinancials,
  isEditing = false,
  onSectionDChange,
  renderMarkdown,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    A: true,
    B: true,
    C: true,
    D: true,
    E: true,
    F: true,
    G: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Tính toán bảng điểm 60 điểm ValueX
  const scorecard: GrowthQualityScorecardResult = calculateGrowthQualityScore(realQuarterlyFinancials);

  const getGradeColor = (grade: string, isLocked: boolean) => {
    if (isLocked) {
      return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
    }
    switch (grade) {
      case 'A+':
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
      case 'A':
        return 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800';
      case 'B+':
        return 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800';
      case 'B':
        return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
      case 'C':
        return 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800';
      case 'D':
      default:
        return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
    }
  };

  const sectionIconMap = {
    A: <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    B: <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
    C: <Percent className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
    D: <Compass className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    E: <Coins className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
    F: <LineChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
    G: <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
  };

  const getSectionContentKey = (key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'): keyof SectionD_GrowthQuality => {
    switch (key) {
      case 'A': return 'partA_CurrentGrowth';
      case 'B': return 'partB_VisibilityNext2To4Q';
      case 'C': return 'partC_MarginDurability';
      case 'D': return 'partD_GrowthRunway';
      case 'E': return 'partE_GrowthToCash';
      case 'F': return 'partF_MediumTermGrowth';
      case 'G': return 'partG_RiskAdjustedSustainability';
    }
  };

  const getDefaultContentForSection = (key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'): string => {
    switch (key) {
      case 'A':
        return `• **Doanh thu cốt lõi**: Tăng trưởng doanh thu quý gần nhất đạt +${scorecard.metrics.q0RevenueGrowthYoY.toFixed(1)}% YoY, được thúc đẩy bởi sự phục hồi sản lượng thực tế và mở rộng tệp khách hàng.\n• **Tăng trưởng EPS Cốt lõi**: Đạt +${scorecard.metrics.epsCoreGrowthYoY.toFixed(1)}% YoY sau khi đã loại trừ các khoản thu nhập tài chính và bất thường một lần.\n• **Độ rộng động lực**: Động lực tăng trưởng phân bổ đều qua các phân khúc sản phẩm chủ lực.`;
      case 'B':
        return `• **Khả năng nhìn thấy doanh thu (Backlog)**: Đơn hàng đã ký và kế hoạch bàn giao bao phủ trên 75% chỉ tiêu kinh doanh 2–4 quý tiếp theo.\n• **Công suất mở rộng**: Các dự án hạ tầng và dây chuyền mới đang trong giai đoạn chạy thử/nâng dần công suất đúng tiến độ.\n• **Chỉ báo nhu cầu**: Sức cầu thị trường tiếp tục duy trì mức cao, doanh nghiệp củng cố thị phần dẫn dắt.`;
      case 'C':
        return `• **Độ bền biên gộp & EBIT**: Biên lợi nhuận gộp ${scorecard.metrics.grossMarginTrendYoY > 0 ? 'mở rộng +' : 'duy trì '}${scorecard.metrics.grossMarginTrendYoY.toFixed(1)}% YoY nhờ tối ưu hóa chi phí sản xuất.\n• **Đòn bẩy hoạt động (Operating Leverage)**: Tỷ lệ chi phí SG&A/Doanh thu được kiểm soát tốt, tốc độ tăng lợi nhuận vượt trội so với doanh thu.\n• **Năng lực định giá (Pricing Power)**: Khả năng chuyển giao biến động chi phí nguyên liệu vào giá bán linh hoạt.`;
      case 'D':
        return `• **Dư địa công suất**: Nhà máy vận hành ở mức hiệu suất tối ưu 80-85%, còn dư địa tăng sản lượng đáp ứng nhu cầu.\n• **Mở rộng thị trường (TAM/SAM)**: Ngành tiếp tục mở rộng quy mô, doanh nghiệp tận dụng vị thế để gia tăng thị phần từ các đối thủ nhỏ hơn.\n• **Thị trường/sản phẩm mới**: Bắt đầu đóng góp doanh thu thực tế, tạo động lực gối đầu dài hạn.`;
      case 'E':
        return `• **Dòng tiền HĐKD đi kèm tăng trưởng**: Tỷ lệ chuyển đổi CFO / LNST đạt ${scorecard.metrics.cfoToNetProfitRatio.toFixed(0)}%, lợi nhuận đi liền với tiền mặt thực chất.\n• **Hiệu quả sinh lời vốn đầu tư mới**: Các dự án mở rộng mang lại tỷ suất ROIC kỳ vọng vượt trội so với chi phí vốn bình quân WACC.`;
      case 'F':
        return `• **Tăng trưởng kép trung hạn (CAGR 3Y)**: Tốc độ tăng trưởng kép LNST 3 năm đạt +${scorecard.metrics.cagr3YearNetProfit.toFixed(1)}%/năm.\n• **Dư địa tái đầu tư**: Doanh nghiệp duy trì tỷ lệ tái đầu tư cao vào hoạt động cốt lõi ở tỷ suất sinh lời thặng dư lớn.`;
      case 'G':
        return `• **Hiệu ứng nền so sánh & Tính chu kỳ**: Tăng trưởng đến từ nội tại bền bỉ, không thuần túy phụ thuộc chu kỳ giá hàng hóa ngắn hạn.\n• **Rủi ro thực thi & Pha loãng**: Đội ngũ lãnh đạo thực thi chiến lược kỷ luật, không có nguy cơ pha loãng cổ phiếu tiêu cực.`;
    }
  };

  const renderSectionCard = (sec: GrowthSectionScoreResult) => {
    const isExpanded = expandedSections[sec.key];
    const contentKey = getSectionContentKey(sec.key);
    const contentValue = sectionD[contentKey] || getDefaultContentForSection(sec.key);

    return (
      <div
        key={sec.key}
        className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 transition-all duration-200"
      >
        {/* Card Header */}
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => toggleSection(sec.key)}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
              {sectionIconMap[sec.key]}
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-gray-100 font-heading">
                {sec.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                {sec.summaryNote}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {scorecard.gatekeepers.isLocked ? '0.0' : sec.score.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 dark:text-gray-500">/{sec.maxScore.toFixed(1)}đ</span>
              <div className="w-20 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full ${scorecard.gatekeepers.isLocked ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${scorecard.gatekeepers.isLocked ? 0 : Math.min(100, sec.percentage)}%` }}
                />
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-1">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Card Body */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 space-y-4">
            {/* Criteria Score Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="text-slate-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 font-medium">
                    <th className="pb-1.5 font-semibold">Tiêu chí đánh giá</th>
                    <th className="pb-1.5 font-semibold">Số liệu thực tế</th>
                    <th className="pb-1.5 font-semibold">Chuẩn ValueX</th>
                    <th className="pb-1.5 font-semibold">Đánh giá</th>
                    <th className="pb-1.5 font-semibold text-right">Điểm đạt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                  {sec.criteria.map((crit) => (
                    <tr key={crit.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-2 text-slate-800 dark:text-gray-200 font-medium">
                        {crit.id}. {crit.name}
                      </td>
                      <td className="py-2 text-slate-600 dark:text-gray-300 font-mono">
                        {crit.rawMetricValue}
                      </td>
                      <td className="py-2 text-slate-500 dark:text-gray-400 text-[10px]">
                        {crit.benchmark}
                      </td>
                      <td className="py-2 text-slate-700 dark:text-gray-300">
                        {crit.assessment}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-900 dark:text-white">
                        {scorecard.gatekeepers.isLocked ? '0.00' : crit.score.toFixed(2)}/{crit.maxScore.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Text Analysis / Edit Mode */}
            <div className="pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                Luận điểm & Nhận định Chuyên sâu
              </h4>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={contentValue}
                  onChange={(e) => {
                    if (onSectionDChange) {
                      onSectionDChange({
                        ...sectionD,
                        [contentKey]: e.target.value,
                      });
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed bg-gray-50/50 dark:bg-gray-950/30 p-3 rounded-lg border border-gray-100 dark:border-gray-800/60">
                  {renderMarkdown(contentValue)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. SCORECARD HERO SUMMARY */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-slate-50/60 to-gray-50 dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                TRỤ CỘT 2 • VALUEX GROWTH QUALITY
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-heading">
              Đánh Giá Chất Lượng Tăng Trưởng: {ticker}
            </h2>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5 max-w-2xl leading-relaxed">
              {scorecard.rankDescription}
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            {/* Score Pill */}
            <div className="text-center px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">
                Điểm Trụ Cột
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {scorecard.totalScore.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-gray-500">
                  /{scorecard.maxScore.toFixed(0)}đ
                </span>
              </div>
            </div>

            {/* Rank Badge */}
            <div className={`px-4 py-2.5 rounded-xl border text-center ${getGradeColor(scorecard.rankGrade, scorecard.gatekeepers.isLocked)}`}>
              <span className="text-[10px] uppercase font-bold block opacity-80">
                Xếp Hạng
              </span>
              <span className="text-2xl font-black block tracking-tight">
                {scorecard.rankGrade}
              </span>
            </div>
          </div>
        </div>

        {/* 🔒 2 GATEKEEPERS STATUS BANNER */}
        <div className="mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Cửa 1 */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              scorecard.gatekeepers.gate1_CoreVerified
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/60'
            }`}>
              {scorecard.gatekeepers.gate1_CoreVerified ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-gray-200 block">
                  Cửa 1: Xác minh LNST Cốt lõi (Cầu nối Core)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5">
                  {scorecard.gatekeepers.gate1_Note}
                </p>
              </div>
            </div>

            {/* Cửa 2 */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              scorecard.gatekeepers.gate2_Growth20PercentThreshold
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/60'
            }`}>
              {scorecard.gatekeepers.gate2_Growth20PercentThreshold ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-gray-200 block">
                  Cửa 2: Ngưỡng Tăng Trưởng Core ≥ 20% Tuyệt Đối
                </span>
                <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5">
                  {scorecard.gatekeepers.gate2_Note}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 7 Section Mini Progress Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
          {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((key) => {
            const sec = scorecard.sections[key];
            return (
              <div
                key={key}
                onClick={() => toggleSection(key)}
                className="cursor-pointer p-2 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 hover:border-teal-300 dark:hover:border-teal-700 transition-all"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                  <span>Nhóm {key}</span>
                  <span className="text-slate-800 dark:text-gray-200 font-semibold">
                    {scorecard.gatekeepers.isLocked ? '0.0' : sec.score.toFixed(1)}/{sec.maxScore}đ
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      scorecard.gatekeepers.isLocked ? 'bg-rose-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${scorecard.gatekeepers.isLocked ? 0 : Math.min(100, sec.percentage)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-gray-300 truncate block mt-1 font-medium">
                  {sec.title.split('. ')[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 🌉 BẢNG CẦU NỐI LNST CỐT LÕI (CORE EARNINGS BRIDGE) */}
      <div className="space-y-3.5">
        {/* Khung Cảnh Báo Tự Động Cầu Nối Cốt Lõi (Nếu có bóc tách hoặc cờ đỏ) */}
        {scorecard.coreBridge.warnings && scorecard.coreBridge.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 p-4 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 font-heading">
                  Cảnh Báo Tự Động Cầu Nối Cốt Lõi:
                </h4>
                <ul className="space-y-1 text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  {scorecard.coreBridge.warnings.map((warn, wIdx) => (
                    <li key={wIdx} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Bảng Cầu Nối Core Net Profit Table */}
        <div className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800 gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                BẢNG CẦU NỐI LNST CỐT LÕI (CORE EARNINGS BRIDGE)
              </h3>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-gray-500 font-medium">
              Đơn vị: Tỷ VNĐ / Nghìn đ/cp
            </div>
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 font-medium text-[11px] bg-slate-50/60 dark:bg-gray-800/40">
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Khoản mục / Chỉ tiêu</th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">{scorecard.coreBridge.currentPeriodLabel} Hiện tại</th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">{scorecard.coreBridge.samePeriodLastYearLabel} Cùng kỳ</th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Biến động YoY</th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Nguồn / Thuyết minh &amp; Phân loại</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-sans">
              {scorecard.coreBridge.rows.map((row, idx) => {
                const isCoreRow = row.isCore;
                const isHeadlineRow = row.isHeadline;
                const isAdjRow = row.isAdjustment;

                let rowBgClass = 'hover:bg-gray-50/60 dark:hover:bg-gray-800/30';
                if (isCoreRow) {
                  rowBgClass = 'bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40';
                } else if (isHeadlineRow) {
                  rowBgClass = 'bg-slate-50/80 dark:bg-gray-800/40 font-semibold';
                }

                return (
                  <tr key={idx} className={`${rowBgClass} transition-colors`}>
                    <td className={`py-2.5 px-3 ${
                      isCoreRow
                        ? 'font-black text-emerald-900 dark:text-emerald-200'
                        : isHeadlineRow
                        ? 'font-bold text-slate-900 dark:text-white'
                        : isAdjRow
                        ? 'text-slate-600 dark:text-gray-400 italic pl-5'
                        : 'text-slate-700 dark:text-gray-300 font-medium'
                    }`}>
                      {row.label}
                    </td>

                    <td className={`py-2.5 px-3 text-right font-mono ${
                      isCoreRow
                        ? 'font-black text-emerald-900 dark:text-emerald-200 text-[13px]'
                        : isHeadlineRow
                        ? 'font-bold text-slate-900 dark:text-white'
                        : isAdjRow
                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                        : 'text-slate-800 dark:text-gray-200'
                    }`}>
                      {row.q0Current}
                    </td>

                    <td className={`py-2.5 px-3 text-right font-mono ${
                      isCoreRow
                        ? 'font-black text-emerald-900 dark:text-emerald-200 text-[13px]'
                        : isHeadlineRow
                        ? 'font-bold text-slate-900 dark:text-white'
                        : isAdjRow
                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                        : 'text-slate-600 dark:text-gray-400'
                    }`}>
                      {row.q0SamePeriod}
                    </td>

                    <td className={`py-2.5 px-3 text-right font-mono ${
                      isCoreRow
                        ? 'font-black text-emerald-600 dark:text-emerald-400 text-[13px]'
                        : String(row.yoyPct).startsWith('+')
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : String(row.yoyPct).startsWith('-')
                        ? 'font-bold text-rose-600 dark:text-rose-400'
                        : 'text-slate-400 dark:text-gray-500'
                    }`}>
                      {row.yoyPct}
                    </td>

                    <td className={`py-2.5 px-3 text-[11px] ${
                      isCoreRow
                        ? 'font-bold text-emerald-800 dark:text-emerald-300'
                        : isHeadlineRow
                        ? 'font-semibold text-slate-700 dark:text-gray-300'
                        : 'text-slate-500 dark:text-gray-400'
                    }`}>
                      {row.sourceNote}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* 3. 7 DETAILED SECTIONS A THROUGH G */}
      <div className="space-y-4">
        {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((key) =>
          renderSectionCard(scorecard.sections[key])
        )}
      </div>
    </div>
  );
};
