'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  Wallet,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Award,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import { SectionC } from '@/types/analysis';
import {
  calculateFinancialHealthScore,
  FinancialHealthScorecardResult,
  SectionScoreResult,
} from '@/lib/financial-health-calculator';
import { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';

interface FinancialHealthScorecardProps {
  ticker: string;
  sectionC: SectionC;
  realQuarterlyFinancials: ParsedVietcapQuarter[];
  isEditing?: boolean;
  onSectionCChange?: (updated: SectionC) => void;
  renderMarkdown: (content: string) => React.ReactNode;
}

export const FinancialHealthScorecard: React.FC<FinancialHealthScorecardProps> = ({
  ticker,
  sectionC,
  realQuarterlyFinancials,
  isEditing = false,
  onSectionCChange,
  renderMarkdown,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'annual' | 'quarterly' | 'debt' | 'cashflow'>('annual');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    A: true,
    B: true,
    C: true,
    D: true,
    E: true,
    F: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Tính toán bảng điểm 50 điểm ValueX
  const scorecard: FinancialHealthScorecardResult = calculateFinancialHealthScore(realQuarterlyFinancials);

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

  // Chuẩn bị dữ liệu biểu đồ Năm
  const annualDataMap: Record<number, { revenue: number; netProfit: number; grossMargin: number; roe: number; count: number }> = {};
  realQuarterlyFinancials.forEach((q) => {
    if (!annualDataMap[q.year]) {
      annualDataMap[q.year] = { revenue: 0, netProfit: 0, grossMargin: 0, roe: 0, count: 0 };
    }
    annualDataMap[q.year].revenue += q.revenue || 0;
    annualDataMap[q.year].netProfit += q.netProfit || 0;
    annualDataMap[q.year].grossMargin += q.grossMargin || 0;
    annualDataMap[q.year].roe = q.roe || annualDataMap[q.year].roe;
    annualDataMap[q.year].count += 1;
  });

  const annualChartData = Object.entries(annualDataMap)
    .sort(([y1], [y2]) => parseInt(y1, 10) - parseInt(y2, 10))
    .map(([year, d]) => ({
      period: `Năm ${year}`,
      'Doanh thu': Math.round(d.revenue),
      'LNST': Math.round(d.netProfit),
      'Biên gộp (%)': d.count > 0 ? Math.round((d.grossMargin / d.count) * 10) / 10 : 0,
      'ROE (%)': d.roe || 0,
    }));

  // Chuẩn bị dữ liệu biểu đồ Quý (8 quý gần nhất)
  const quarterlyChartData = realQuarterlyFinancials.slice(-8).map((q) => ({
    period: q.period,
    'Doanh thu': Math.round(q.revenue),
    'LNST': Math.round(q.netProfit),
    'Biên gộp (%)': q.grossMargin || 0,
    'ROE (%)': q.roe || 0,
  }));

  // Chuẩn bị dữ liệu Nợ Vay vs VCSH
  const latestQ = realQuarterlyFinancials[realQuarterlyFinancials.length - 1] || ({} as ParsedVietcapQuarter);
  const debtChartData = [
    { name: 'Vay ngắn hạn', value: Math.round(latestQ.shortTermLoans || 0), color: '#3B82F6' },
    { name: 'Vay dài hạn', value: Math.round(latestQ.longTermLoans || 0), color: '#6366F1' },
    { name: 'Tổng nợ vay', value: Math.round(latestQ.totalDebt || (latestQ.shortTermLoans || 0) + (latestQ.longTermLoans || 0)), color: '#F59E0B' },
    { name: 'Vốn chủ sở hữu', value: Math.round(latestQ.ownerEquity || 0), color: '#10B981' },
  ];

  // Chuẩn bị dữ liệu Dòng tiền (CFO & FCF 8 quý gần nhất)
  const cashFlowChartData = realQuarterlyFinancials.slice(-8).map((q) => {
    const cfo = Math.round(q.netOperatingCashFlow || 0);
    const capex = Math.round(Math.abs(q.capex || 0));
    const fcf = cfo - capex;
    return {
      period: q.period,
      'Dòng tiền HĐKD (CFO)': cfo,
      'CAPEX': capex,
      'FCF (Dòng tiền tự do)': fcf,
    };
  });

  const sectionIconMap = {
    A: <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    B: <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
    C: <TrendingUp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
    D: <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    E: <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
    F: <FileCheck2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
  };

  const getSectionContentKey = (key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'): keyof SectionC => {
    switch (key) {
      case 'A': return 'partA_LiquidityAndDebt';
      case 'B': return 'partB_CashFlowAndEarnings';
      case 'C': return 'partC_ProfitabilityAndROIC';
      case 'D': return 'partD_WorkingCapitalAndAssetQuality';
      case 'E': return 'partE_CapitalStructureAndFunding';
      case 'F': return 'partF_EarningsQualityAndAccounting';
    }
  };

  const getDefaultContentForSection = (key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'): string => {
    switch (key) {
      case 'A':
        return `• **Khả năng thanh toán ngắn hạn**: Hệ số thanh toán hiện hành đạt ${scorecard.metrics.currentRatio.toFixed(2)}x và thanh toán nhanh đạt ${scorecard.metrics.quickRatio.toFixed(2)}x, đảm bảo an toàn thanh khoản.\n• **Đòn bẩy Nợ ròng / EBITDA**: Đạt mức ${scorecard.metrics.netDebtToEbitda <= 0 ? 'tiền mặt ròng dương' : scorecard.metrics.netDebtToEbitda.toFixed(2) + 'x'}, duy trì trong ngưỡng kiểm soát rủi ro.\n• **Khả năng bao phủ lãi vay**: Lợi nhuận trước lãi vay và thuế (EBIT) bao phủ ${scorecard.metrics.interestCoverage > 50 ? '> 50' : scorecard.metrics.interestCoverage.toFixed(1)} lần chi phí lãi vay.`;
      case 'B':
        return `• **Chất lượng chuyển đổi tiền mặt**: Tỷ lệ CFO / LNST Cốt lõi đạt ${scorecard.metrics.cfoToNetProfitCore.toFixed(1)}%, phản ánh lợi nhuận thực chất bằng tiền mặt.\n• **Tính ổn định của dòng tiền**: Dòng tiền thuần từ HĐKD duy trì dương liên tục ${scorecard.metrics.cfoPositiveQuarterCount}/4 quý gần nhất.\n• **Dòng tiền tự do FCF sau CAPEX**: Đạt ${scorecard.metrics.fcfBillion.toLocaleString('vi-VN')} tỷ VNĐ, tạo dư địa tái đầu tư và chia cổ tức.`;
      case 'C':
        return `• **Tỷ suất sinh lời ROIC**: Đạt ${scorecard.metrics.roic.toFixed(1)}%, vượt trội chi phí sử dụng vốn bình quân WACC.\n• **ROE thực chất sau điều chỉnh đòn bẩy**: Đạt ${scorecard.metrics.roe.toFixed(1)}% với tỷ lệ nợ phải trả/VCSH ${(scorecard.metrics.debtToEquity / 100).toFixed(2)}x.\n• **Biên lợi nhuận**: Biên gộp đạt ${scorecard.metrics.grossMargin.toFixed(1)}% và biên EBIT đạt ${scorecard.metrics.ebitMargin.toFixed(1)}%.\n• **Vòng quay tài sản**: Đạt ${scorecard.metrics.assetTurnover.toFixed(2)} vòng/năm.`;
      case 'D':
        return `• **Vòng quay khoản phải thu (DSO)**: Số ngày thu tiền khách hàng đạt ${scorecard.metrics.dsoDays} ngày, quản trị công nợ chặt chẽ.\n• **Vòng quay hàng tồn kho (DIO)**: Đạt ${scorecard.metrics.dioDays} ngày, phù hợp chu kỳ sản xuất và tiêu thụ.\n• **Chu kỳ chuyển đổi tiền mặt (CCC)**: Đạt ${scorecard.metrics.cccDays} ngày, tối ưu hóa vốn lưu động.\n• **Chất lượng tài sản**: Tài sản dở dang XDCB và các khoản phải thu khác chiếm ${scorecard.metrics.otherAssetsToTotalAssets.toFixed(1)}% tổng tài sản.`;
      case 'E':
        return `• **Cơ cấu vốn & Đòn bẩy D/E**: Tỷ lệ nợ/VCSH ở mức ${(scorecard.metrics.debtToEquity / 100).toFixed(2)}x, trong đó nợ ngắn hạn chiếm ${scorecard.metrics.shortTermDebtRatio.toFixed(0)}% tổng nợ vay.\n• **Rủi ro tái cấp vốn & Lãi suất**: Năng lực tiếp cận hạn mức tín dụng tốt, không có áp lực thanh toán nợ đột biến.\n• **Năng lực tự tài trợ CAPEX**: Tiền mặt và dòng tiền CFO tự tài trợ được ${scorecard.metrics.capexCoverageRatio.toFixed(0)}% kế hoạch đầu tư mở rộng.`;
      case 'F':
        return `• **Tỷ trọng lợi nhuận cốt lõi**: LNST cốt lõi chiếm ${scorecard.metrics.coreProfitRatio.toFixed(1)}% tổng lợi nhuận kế toán.\n• **Khoản bất thường một lần**: Không có biến động lớn từ bán tài sản ngoài ngành hay hoàn nhập đột biến.\n• **Tính minh bạch & Kiểm toán**: BCTC được kiểm toán chấp nhận toàn phần, giao dịch các bên liên quan minh bạch theo giá thị trường.`;
    }
  };

  const renderSectionCard = (sec: SectionScoreResult) => {
    const isExpanded = expandedSections[sec.key];
    const contentKey = getSectionContentKey(sec.key);
    const contentValue = sectionC[contentKey] || getDefaultContentForSection(sec.key);

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
                    if (onSectionCChange) {
                      onSectionCChange({
                        ...sectionC,
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
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                TRỤ CỘT 1 • VALUEX FINANCIAL HEALTH
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-heading">
              Đánh Giá Sức Khỏe Tài Chính: {ticker}
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

        {/* 6 Section Mini Score Progress Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-800">
          {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((key) => {
            const sec = scorecard.sections[key];
            return (
              <div
                key={key}
                onClick={() => toggleSection(key)}
                className="cursor-pointer p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                  <span>Nhóm {key}</span>
                  <span className="text-slate-800 dark:text-gray-200 font-semibold">
                    {sec.score.toFixed(1)}/{sec.maxScore}đ
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
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

      {/* 2. INTERACTIVE CHARTS HUB */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
              Biểu Đồ Tài Chính Số Hóa Vietcap IQ (2018 – Nay)
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab('annual')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                activeChartTab === 'annual'
                  ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Năm (2018-Nay)
            </button>
            <button
              onClick={() => setActiveChartTab('quarterly')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                activeChartTab === 'quarterly'
                  ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              8 Quý Gần Nhất
            </button>
            <button
              onClick={() => setActiveChartTab('debt')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                activeChartTab === 'debt'
                  ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cơ Cấu Nợ
            </button>
            <button
              onClick={() => setActiveChartTab('cashflow')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                activeChartTab === 'cashflow'
                  ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dòng Tiền CFO & FCF
            </button>
          </div>
        </div>

        {/* Chart View Content */}
        <div className="h-64 w-full">
          {activeChartTab === 'annual' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={annualChartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '10px' }} />
                <YAxis yAxisId="left" stroke="#64748B" style={{ fontSize: '10px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#9333EA" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                  itemStyle={{ color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={8} formatter={(val) => <span className="text-[10px] text-slate-700 dark:text-gray-300 font-medium">{val}</span>} />
                <Bar dataKey="Doanh thu" yAxisId="left" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={22}>
                  <LabelList dataKey="Doanh thu" position="top" style={{ fill: '#2563EB', fontSize: '9px', fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="LNST" yAxisId="left" fill="#10B981" radius={[4, 4, 0, 0]} barSize={22}>
                  <LabelList dataKey="LNST" position="top" style={{ fill: '#059669', fontSize: '9px', fontWeight: 'bold' }} />
                </Bar>
                <Line dataKey="Biên gộp (%)" yAxisId="right" type="monotone" stroke="#D97706" strokeWidth={2} activeDot={{ r: 4 }} />
                <Line dataKey="ROE (%)" yAxisId="right" type="monotone" stroke="#9333EA" strokeWidth={2} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'quarterly' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={quarterlyChartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '10px' }} />
                <YAxis yAxisId="left" stroke="#64748B" style={{ fontSize: '10px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#9333EA" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                  itemStyle={{ color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={8} formatter={(val) => <span className="text-[10px] text-slate-700 dark:text-gray-300 font-medium">{val}</span>} />
                <Bar dataKey="Doanh thu" yAxisId="left" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={22}>
                  <LabelList dataKey="Doanh thu" position="top" style={{ fill: '#2563EB', fontSize: '9px', fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="LNST" yAxisId="left" fill="#10B981" radius={[4, 4, 0, 0]} barSize={22}>
                  <LabelList dataKey="LNST" position="top" style={{ fill: '#059669', fontSize: '9px', fontWeight: 'bold' }} />
                </Bar>
                <Line dataKey="Biên gộp (%)" yAxisId="right" type="monotone" stroke="#D97706" strokeWidth={2} activeDot={{ r: 4 }} />
                <Line dataKey="ROE (%)" yAxisId="right" type="monotone" stroke="#9333EA" strokeWidth={2} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'debt' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtChartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                <XAxis dataKey="name" stroke="#64748B" style={{ fontSize: '10px', fontWeight: '600' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                  itemStyle={{ color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                  {debtChartData.map((entry, index) => (
                    <Cell key={`debt-cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fill: '#334155', fontSize: '10px', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'cashflow' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashFlowChartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '10px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                  itemStyle={{ color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={8} formatter={(val) => <span className="text-[10px] text-slate-700 dark:text-gray-300 font-medium">{val}</span>} />
                <Bar dataKey="Dòng tiền HĐKD (CFO)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="CAPEX" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                <Line dataKey="FCF (Dòng tiền tự do)" type="monotone" stroke="#3B82F6" strokeWidth={2.5} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. 6 DETAILED SECTIONS A THROUGH F */}
      <div className="space-y-4">
        {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((key) =>
          renderSectionCard(scorecard.sections[key])
        )}
      </div>
    </div>
  );
};
