'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Crown,
  Briefcase,
  Users,
  Scale,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SectionE_BusinessQuality } from '@/types/analysis';
import {
  calculateBusinessQualityScore,
  BusinessQualityScorecardResult,
  BusinessSectionScoreResult,
} from '@/lib/business-quality-calculator';
import { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';

interface BusinessQualityScorecardProps {
  ticker: string;
  sectionE: SectionE_BusinessQuality;
  realQuarterlyFinancials: ParsedVietcapQuarter[];
  isEditing?: boolean;
  onSectionEChange?: (updated: SectionE_BusinessQuality) => void;
  renderMarkdown: (content: string) => React.ReactNode;
}

export const BusinessQualityScorecard: React.FC<BusinessQualityScorecardProps> = ({
  ticker,
  sectionE,
  realQuarterlyFinancials,
  isEditing = false,
  onSectionEChange,
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

  // Tính toán bảng điểm 40 điểm ValueX
  const scorecard: BusinessQualityScorecardResult = calculateBusinessQualityScore(realQuarterlyFinancials);

  const getGradeColor = (grade: string) => {
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
    A: <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    B: <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    C: <Briefcase className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
    D: <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
    E: <Scale className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
    F: <Award className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
    G: <Zap className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
  };

  const getSectionContentKey = (key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'): keyof SectionE_BusinessQuality => {
    switch (key) {
      case 'A': return 'partA_EconomicMoat';
      case 'B': return 'partB_IndustryPosition';
      case 'C': return 'partC_BusinessModel';
      case 'D': return 'partD_ManagementAndCapitalAllocation';
      case 'E': return 'partE_CorporateGovernance';
      case 'F': return 'partF_RoicSustenance';
      case 'G': return 'partG_ShockResilience';
    }
  };

  const getDefaultContentForSection = (key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'): string => {
    switch (key) {
      case 'A':
        return `• **Hào kinh tế cốt lõi (Core Moat)**: Sở hữu lợi thế chi phí thấp bền vững nhờ quy mô sản xuất vượt trội và chuỗi cung ứng tích hợp dọc khép kín.\n• **Độ bền vững của Moat**: Doanh nghiệp liên tục tái đầu tư vào công nghệ và năng lực vận hành, nới rộng khoảng cách cạnh tranh với các đối thủ trong ngành (>10 năm).`;
      case 'B':
        return `• **Vị thế đầu ngành**: Chiếm lĩnh vị trí Số 1 tuyệt đối trong lĩnh vực hoạt động cốt lõi với thị phần áp đảo.\n• **Xu hướng thị phần**: Thị phần liên tục được mở rộng vững chắc trong 3 năm qua nhờ ưu thế về chất lượng sản phẩm, dịch vụ và hệ thống phân phối sâu rộng.`;
      case 'C':
        return `• **Khả năng tạo biên lợi nhuận**: Biên EBIT bình quân đạt ${scorecard.metrics.avgEbitMargin.toFixed(1)}%, phản ánh mô hình kinh doanh có hiệu quả kinh tế đơn vị vượt trội.\n• **Tính lặp lại của doanh thu**: Doanh thu có tính dự đoán cao nhờ tệp khách hàng trung thành và nhu cầu tiêu dùng thiết yếu.\n• **Cường độ vốn**: Quản trị vòng quay vốn lưu động chặt chẽ, tối ưu hóa hiệu suất sinh lời trên tài sản.`;
      case 'D':
        return `• **Năng lực thực thi chiến lược**: Ban lãnh đạo dày dạn kinh nghiệm, có lịch sử hoàn thành và vượt các chỉ tiêu kinh doanh ĐHCĐ giao phó qua nhiều chu kỳ.\n• **Kỷ luật phân bổ vốn**: Lịch sử đầu tư mở rộng nhà máy/dự án đúng thời điểm, trả cổ tức tiền mặt đều đặn và không đầu tư ngoài ngành dàn trải.\n• **Tính minh bạch IR**: Công bố thông tin đầy đủ, minh bạch và quan hệ nhà đầu tư chuẩn mực.`;
      case 'E':
        return `• **Đồng thuận lợi ích với cổ đông**: Ban lãnh đạo sở hữu tỷ lệ lợi ích kinh tế gắn liền với sự phát triển dài hạn, chính sách ESOP hợp lý.\n• **Quản trị rủi ro & Độc lập HĐQT**: Cơ cấu HĐQT có sự tham gia của các thành viên độc lập uy tín, hệ thống kiểm soát nội bộ hoạt động hiệu quả.`;
      case 'F':
        return `• **Duy trì ROIC cao qua chu kỳ**: Tỷ suất sinh lời trên vốn đầu tư (ROIC) bình quân 5 năm đạt ${scorecard.metrics.avgRoic5Years.toFixed(1)}%, vượt xa chi phí vốn bình quân WACC (${scorecard.metrics.waccEstimated}%).\n• **Dư địa tái đầu tư sinh lời cao**: Doanh nghiệp có thị trường mở rộng đủ lớn để tiếp tục hấp thụ vốn tái đầu tư ở mức ROIC thặng dư hấp dẫn.`;
      case 'G':
        return `• **Khả năng chống chịu suy thoái**: Doanh nghiệp duy trì dòng tiền hoạt động dương và lợi nhuận ổn định ngay cả trong các giai đoạn nền kinh tế gặp biến động mạnh.\n• **Thích ứng công nghệ & Đa dạng đối tác**: Tiên phong chuyển đổi số và sở hữu cơ cấu khách hàng phân tán, giảm thiểu tối đa rủi ro phụ thuộc đối tác đơn lẻ.`;
    }
  };

  const renderSectionCard = (sec: BusinessSectionScoreResult) => {
    const isExpanded = expandedSections[sec.key];
    const contentKey = getSectionContentKey(sec.key);
    const contentValue = sectionE[contentKey] || getDefaultContentForSection(sec.key);

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
                {sec.score.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 dark:text-gray-500">/{sec.maxScore.toFixed(1)}đ</span>
              <div className="w-20 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, sec.percentage)}%` }}
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
                    <th className="pb-1.5 font-semibold">Số liệu / Bằng chứng</th>
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
                        {crit.score.toFixed(2)}/{crit.maxScore.toFixed(1)}
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
                    if (onSectionEChange) {
                      onSectionEChange({
                        ...sectionE,
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
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                TRỤ CỘT 3 • VALUEX BUSINESS QUALITY
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-heading">
              Đánh Giá Chất Lượng Doanh Nghiệp: {ticker}
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
            <div className={`px-4 py-2.5 rounded-xl border text-center ${getGradeColor(scorecard.rankGrade)}`}>
              <span className="text-[10px] uppercase font-bold block opacity-80">
                Xếp Hạng
              </span>
              <span className="text-2xl font-black block tracking-tight">
                {scorecard.rankGrade}
              </span>
            </div>
          </div>
        </div>

        {/* 7 Section Mini Progress Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-800">
          {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((key) => {
            const sec = scorecard.sections[key];
            return (
              <div
                key={key}
                onClick={() => toggleSection(key)}
                className="cursor-pointer p-2 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                  <span>Nhóm {key}</span>
                  <span className="text-slate-800 dark:text-gray-200 font-semibold">
                    {sec.score.toFixed(1)}/{sec.maxScore}đ
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, sec.percentage)}%` }}
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

      {/* 2. 7 DETAILED SECTIONS A THROUGH G */}
      <div className="space-y-4">
        {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((key) =>
          renderSectionCard(scorecard.sections[key])
        )}
      </div>
    </div>
  );
};
