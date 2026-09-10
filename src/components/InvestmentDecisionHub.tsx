'use client';

import React, { useState, useMemo } from 'react';
import {
  AnalysisReport,
  PostInvestmentFramework,
  ThesisStatus,
  HeadwindRiskItem,
} from '@/types/analysis';
import {
  ShieldCheck,
  Target,
  Sparkles,
  TrendingUp,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  CheckSquare,
  Activity,
  Calendar,
  DollarSign,
  PieChart,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import {
  computeOpportunityScoreAC,
  computeTimingScoreD,
  computeMasterOpportunityScore,
} from '@/lib/opportunity-scoring-engine';
import { calculateFinancialHealthScore } from '@/lib/financial-health-calculator';
import { calculateBusinessQualityScore } from '@/lib/business-quality-calculator';

interface InvestmentDecisionHubProps {
  report: AnalysisReport;
  realQuarterlyFinancials?: any[];
  priceHistory?: any[];
  onNavigateToTab?: (tabId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I') => void;
  onUpdateReport?: (updatedReport: AnalysisReport) => void;
}

export const InvestmentDecisionHub: React.FC<InvestmentDecisionHubProps> = ({
  report,
  realQuarterlyFinancials = [],
  priceHistory = [],
  onNavigateToTab,
  onUpdateReport,
}) => {
  const currentPrice = report.marketData?.currentPrice || 10000;
  const hub = report.sectionF?.valuationHub;

  // 1. Lấy dữ liệu 3 kịch bản từ Tab H
  const bearFv = hub?.bear?.fairValue || Math.round(currentPrice * 0.85);
  const baseFv = hub?.base?.fairValue || Math.round(currentPrice * 1.35);
  const bullFv = hub?.bull?.fairValue || Math.round(currentPrice * 1.65);

  const bearDownsidePct = Number((((bearFv - currentPrice) / currentPrice) * 100).toFixed(1));
  const baseUpsidePct = Number((((baseFv - currentPrice) / currentPrice) * 100).toFixed(1));
  const bullUpsidePct = Number((((bullFv - currentPrice) / currentPrice) * 100).toFixed(1));

  const bearProb = hub?.bear?.probability ?? 20;
  const baseProb = hub?.base?.probability ?? 55;
  const bullProb = hub?.bull?.probability ?? 25;

  const rrRatio = Math.abs(bearDownsidePct) > 0
    ? Number((baseUpsidePct / Math.abs(bearDownsidePct)).toFixed(2))
    : 3.5;

  // Lợi nhuận kỳ vọng = Sum(Xác suất * Tỷ suất sinh lời)
  const expectedReturnPct = Number(
    ((bearProb * bearDownsidePct + baseProb * baseUpsidePct + bullProb * bullUpsidePct) / 100).toFixed(1)
  );

  // 2. Trạng thái luận điểm (INTACT / MONITOR / BROKEN)
  const thesisStatus: ThesisStatus = (hub?.opportunityScorecard?.thesisStatus as ThesisStatus) || 'INTACT';

  // 3. Tính điểm Doanh Nghiệp ValueX (150 điểm)
  const healthResult = useMemo(() => {
    if (realQuarterlyFinancials && realQuarterlyFinancials.length > 0) {
      try {
        return calculateFinancialHealthScore(realQuarterlyFinancials);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [realQuarterlyFinancials]);

  const businessResult = useMemo(() => {
    if (realQuarterlyFinancials && realQuarterlyFinancials.length > 0) {
      try {
        return calculateBusinessQualityScore(realQuarterlyFinancials);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [realQuarterlyFinancials]);

  const bizHealthScore = healthResult?.totalScore ?? 38.0;
  const bizGrowthScore = report.sectionD?.totalScore ?? 45.0;
  const bizQualityScore = businessResult?.totalScore ?? 30.0;
  const totalBusinessScore150 = Number((bizHealthScore + bizGrowthScore + bizQualityScore).toFixed(1));

  // 4. Lấy / Tính điểm Mục A (40đ) & Mục C (25đ)
  const scoreAC = useMemo(() => {
    return computeOpportunityScoreAC({
      baseUpsidePct,
      bearDownsidePct,
      rrRatio,
      dispersion: 12.0,
      currentPe: report.marketData?.currentPrice ? report.marketData.currentPrice / 2500 : 12,
      medianPe: hub?.historicalStats?.peMedian,
      peerMedianPe: hub?.peerMedians?.pe,
      growthTier: report.sectionD?.rankGrade || 'B+',
      netDebt: 0,
      currentPrice,
      adtvBillion: report.marketData?.adtv1MonthBillion || 25,
      thesisStatus,
      manualOverrides: hub?.opportunityScorecard?.manualOverrides || {},
    });
  }, [baseUpsidePct, bearDownsidePct, rrRatio, currentPrice, report.marketData, hub, thesisStatus, report.sectionD]);

  // 5. Lấy điểm Mục B (25đ) từ Tab G
  const scoreB = report.sectionCatalysts?.scorecard?.totalScore ?? 18.0;

  // 6. Lấy điểm Mục D (10đ) từ Tab G
  const scoreD = report.sectionCatalysts?.timingScorecard?.totalScore ?? 7.5;

  // 7. Tính Master Opportunity Score (100 điểm) & Ma trận diễn giải
  const masterScore = useMemo(() => {
    return computeMasterOpportunityScore(
      scoreAC.sectionA.totalScore,
      scoreB,
      scoreAC.sectionC.totalScore,
      scoreD,
      totalBusinessScore150
    );
  }, [scoreAC, scoreB, scoreD, totalBusinessScore150]);

  // Quản lý trạng thái Khung Giám Sát Sau Đầu Tư (Post-Investment Framework)
  const [framework, setFramework] = useState<PostInvestmentFramework>(() => {
    const existing = report.postInvestmentFramework || {};
    return {
      positionTier: existing.positionTier || masterScore.matrixAction.positionTier,
      targetWeightPct: existing.targetWeightPct ?? (masterScore.matrixAction.positionTier === 'TẬP TRUNG' ? 25 : masterScore.matrixAction.positionTier === 'CHUẨN' ? 15 : 5),
      currentWeightPct: existing.currentWeightPct ?? 0,
      buyZone: existing.buyZone || `${Math.round(currentPrice * 0.96).toLocaleString('vi-VN')} – ${Math.round(currentPrice * 1.02).toLocaleString('vi-VN')} đ`,
      takeProfitZone: existing.takeProfitZone || `${Math.round(baseFv * 0.95).toLocaleString('vi-VN')} – ${Math.round(bullFv * 0.95).toLocaleString('vi-VN')} đ`,
      nextReviewDate: existing.nextReviewDate || 'Sau kỳ BCTC quý kế tiếp (60 ngày)',
      kpiTrackingList: existing.kpiTrackingList && existing.kpiTrackingList.length > 0 ? existing.kpiTrackingList : [
        {
          id: 'kpi-1',
          kpiName: 'Doanh thu & LNST cốt lõi quý tới',
          currentValue: 'Duy trì nền tăng trưởng > 15%',
          targetValue: 'Đạt tối thiểu 90% kế hoạch quý',
          warningThreshold: 'Tăng trưởng < 5% YoY',
          status: 'on_track',
          notes: 'Theo dõi báo cáo KQKD hàng tháng / quý',
        },
        {
          id: 'kpi-2',
          kpiName: 'Biên lợi nhuận gộp',
          currentValue: 'Mở rộng ổn định',
          targetValue: 'Duy trì hoặc tăng ≥ 0.5% điểm',
          warningThreshold: 'Thu hẹp > 1.5% điểm',
          status: 'on_track',
          notes: 'Kiểm tra giá vốn và giá bán bình quân',
        },
        {
          id: 'kpi-3',
          kpiName: 'Tiến độ Chất xúc tác chính',
          currentValue: 'Đang triển khai đúng kế hoạch',
          targetValue: 'Hoàn thành các mốc nghiệm thu/vận hành',
          warningThreshold: 'Trì hoãn > 6 tháng',
          status: 'on_track',
          notes: 'Nghị quyết HĐQT & Báo cáo giám sát đầu tư',
        },
      ],
      thesisBreakers: existing.thesisBreakers && existing.thesisBreakers.length > 0 ? existing.thesisBreakers : [
        {
          id: 'tb-1',
          variableName: 'Lợi nhuận cốt lõi suy giảm bất ngờ liên tiếp 2 quý',
          warningThreshold: 'LNST giảm > 20% YoY không do yếu tố mùa vụ',
          probability: 20,
          impact: 'Rất lớn',
          actionIfViolated: 'Hạ định giá cơ sở về mức thận trọng, giảm 50% tỷ trọng',
          status: 'safe',
        },
        {
          id: 'tb-2',
          variableName: 'Dự án trọng điểm bị chậm tiến độ hoặc vướng pháp lý nghiêm trọng',
          warningThreshold: 'Thời gian vận hành thương mại lùi quá 2 quý',
          probability: 25,
          impact: 'Lớn',
          actionIfViolated: 'Đánh giá lại chất xúc tác, chuyển trạng thái Cần theo dõi',
          status: 'safe',
        },
        {
          id: 'tb-3',
          variableName: 'Tỷ lệ nợ ròng / EBITDA tăng vọt do sử dụng đòn bẩy quá mức',
          warningThreshold: 'Nợ ròng / EBITDA vượt ngưỡng 3.0x',
          probability: 15,
          impact: 'Lớn',
          actionIfViolated: 'Cắt giảm vị thế về mức an toàn (dưới 5% danh mục)',
          status: 'safe',
        },
      ],
      preTradeChecklist: existing.preTradeChecklist && existing.preTradeChecklist.length > 0 ? existing.preTradeChecklist : [
        { id: 'chk-1', question: '1. Luận điểm về lợi thế cạnh tranh cốt lõi của doanh nghiệp có còn nguyên vẹn không?', passed: true },
        { id: 'chk-2', question: '2. EPS cốt lõi và các KPI sản lượng/giá bán có đi đúng kỳ vọng dự phóng?', passed: true },
        { id: 'chk-3', question: '3. Chất xúc tác ngắn hạn 6–12 tháng đang tiến gần hay bị trì hoãn?', passed: true },
        { id: 'chk-4', question: '4. Giá trị hợp lý kịch bản cơ sở có bị thay đổi tiêu cực đáng kể sau thông tin mới?', passed: true },
        { id: 'chk-5', question: '5. Tỷ lệ Lợi nhuận / Rủi ro (R/R) hiện tại còn hấp dẫn sau biến động thị giá?', passed: true },
        { id: 'chk-6', question: '6. Kịch bản thận trọng (Bear case) có rủi ro xấu hơn dự tính ban đầu không?', passed: true },
      ],
      headwindRisks: existing.headwindRisks && existing.headwindRisks.length > 0
        ? existing.headwindRisks
        : (report.postInvestmentFramework?.headwindRisks && report.postInvestmentFramework.headwindRisks.length > 0)
        ? report.postInvestmentFramework.headwindRisks
        : [
            {
              id: `risk-${report.ticker.toLowerCase()}-1`,
              name: 'Áp lực biến động tỷ giá USD/VND & Chi phí hàng nhập khẩu',
              category: 'Vĩ mô & Tỷ giá',
              severity: 'Trung bình',
              probability: 45,
              impactedMetric: 'Biên lợi nhuận gộp & Chi phí tài chính',
              headwindDetail: 'Biến động tỷ giá USD/VND có thể làm tăng giá vốn hàng hóa và chi phí lãi vay ngoại tệ nếu thị trường biến động mạnh.',
              defenseAction: 'Quan sát biên gộp hàng quý và hoạt động phòng ngừa rủi ro phái sinh; tuân thủ ngưỡng cắt lỗ 7%.',
              evidenceSource: 'Dữ liệu phân tích vĩ mô & Thời sự thị trường',
            },
            {
              id: `risk-${report.ticker.toLowerCase()}-2`,
              name: 'Cạnh tranh gay gắt về giá & Chiết khấu bán hàng',
              category: 'Ngành & Cạnh tranh',
              severity: 'Trung bình',
              probability: 40,
              impactedMetric: 'Biên EBITDA & Chi phí SG&A',
              headwindDetail: 'Cạnh tranh mở rộng từ các đối thủ trong ngành có thể buộc doanh nghiệp phải gia tăng chiết khấu thương mại để giữ thị phần.',
              defenseAction: 'Theo dõi thị phần ngành hàng cốt lõi và tỷ lệ chi phí bán hàng trên doanh thu.',
              evidenceSource: 'Báo cáo ngành & Khuyến nghị CTCK',
            },
            {
              id: `risk-${report.ticker.toLowerCase()}-3`,
              name: 'Sức mua phân khúc thứ cấp phục hồi chậm hơn dự kiến',
              category: 'Vận hành & Chi phí',
              severity: 'Thấp',
              probability: 35,
              impactedMetric: 'Vòng quay hàng tồn kho (DIO) & Dòng tiền CFO',
              headwindDetail: 'Tâm lý thận trọng của người tiêu dùng đối với các dòng sản phẩm giá trị cao có thể kéo dài chu kỳ lưu kho.',
              defenseAction: 'Kiểm soát số ngày tồn kho bình quân và ưu tiên doanh nghiệp có dòng tiền kinh doanh dương.',
              evidenceSource: 'Khảo sát bán lẻ & Tin tức Google AI',
            },
          ],
    };
  });

  const handleToggleChecklist = (id: string) => {
    if (!framework.preTradeChecklist) return;
    const updated = framework.preTradeChecklist.map((c) =>
      c.id === id ? { ...c, passed: !c.passed } : c
    );
    const newFw = { ...framework, preTradeChecklist: updated };
    setFramework(newFw);
    if (onUpdateReport) {
      onUpdateReport({ ...report, postInvestmentFramework: newFw });
    }
  };

  return (
    <div className="space-y-8 font-sans text-slate-800 dark:text-gray-200">
      {/* =========================================================================
          1. EXECUTIVE ACTION BOARD: TỔNG HỢP QUYẾT ĐỊNH ĐẦU TƯ
         ========================================================================= */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white via-gray-50/40 to-white dark:from-gray-900 dark:via-gray-900/60 dark:to-gray-900 p-5 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading">
                  Phiếu Quyết Định Đầu Tư &amp; Tổng Hợp Cơ Hội: {report.ticker}
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Chuẩn hóa theo tài liệu ValueX Investment Opportunity Guide &amp; Post-Investment Decision
                </p>
              </div>
            </div>
          </div>

          {/* 2 Trụ Cột Độc Lập: Điểm Doanh Nghiệp (150đ) & Điểm Cơ Hội (100đ) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cột 1: Điểm Doanh Nghiệp 150đ */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 text-right">
              <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-medium block">
                Doanh Nghiệp (ValueX 150đ)
              </span>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {totalBusinessScore150}
                </span>
                <span className="text-xs text-slate-400">/ 150đ</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ml-1">
                  Hạng {masterScore.matrixAction.businessGrade}
                </span>
              </div>
            </div>

            {/* Cột 2: Điểm Cơ Hội Đầu Tư 100đ */}
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 text-right">
              <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 font-medium block">
                Cơ Hội Đầu Tư (100đ)
              </span>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {masterScore.totalScore}
                </span>
                <span className="text-xs text-slate-400">/ 100đ</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 ml-1">
                  Hạng {masterScore.rankGrade}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Khung Khuyến Nghị Hành Động Theo Ma Trận Diễn Giải */}
        <div className="p-4 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ma Trận Diễn Giải (ValueX Matrix):
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Doanh nghiệp [{masterScore.matrixAction.businessGrade}] × Cơ hội [{masterScore.matrixAction.opportunityGrade}]
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Trạng thái luận điểm:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                thesisStatus === 'INTACT'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : thesisStatus === 'MONITOR'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}>
                {thesisStatus === 'INTACT' ? '🟢 Còn nguyên vẹn' : thesisStatus === 'MONITOR' ? '🟡 Cần theo dõi' : '🔴 Đã phá vỡ'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Card 1: Kết luận cơ hội */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Đánh Giá Cơ Hội</span>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {masterScore.matrixAction.interpretation}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-snug">
                {masterScore.matrixAction.actionFramework}
              </p>
            </div>

            {/* Card 2: Cấp vị thế & Tỷ trọng */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Cấp Vị Thế &amp; Phân Bổ</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Vị thế {framework.positionTier}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  (Mục tiêu: {framework.targetWeightPct}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-snug">
                Đề xuất danh mục: {masterScore.matrixAction.suggestedAllocationPct}
              </p>
            </div>

            {/* Card 3: Vùng mua & Vùng chốt */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Vùng Giá Hành Động</span>
              <div className="text-[11px] text-slate-700 dark:text-gray-300 space-y-0.5">
                <div>• <span className="font-semibold text-emerald-600 dark:text-emerald-400">Vùng mua gom:</span> {framework.buyZone}</div>
                <div>• <span className="font-semibold text-amber-600 dark:text-amber-400">Vùng chốt lời:</span> {framework.takeProfitZone}</div>
              </div>
              <span className="text-[10px] text-slate-400 block pt-0.5">
                Lợi nhuận kỳ vọng 3 kịch bản: <strong>+{expectedReturnPct}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MASTER SCORECARD CƠ HỘI ĐẦU TƯ 100 ĐIỂM
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Bảng Tổng Hợp Điểm Cơ Hội Đầu Tư ValueX (100 Điểm)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Hợp nhất từ 4 nhóm tiêu chí: Định giá (40đ), Chất xúc tác (25đ), Rủi ro/Luận điểm (25đ), Thời điểm &amp; RS 1M (10đ).
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Tỷ lệ đạt được: <strong className="text-slate-900 dark:text-white">{masterScore.pctAchievement}%</strong>
          </span>
        </div>

        {/* 4 Khối Nhóm Tiêu Chí */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Nhóm A: Định giá */}
          <div
            onClick={() => onNavigateToTab?.('H')}
            className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-emerald-500/50 cursor-pointer transition space-y-2 group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-emerald-600 transition">
                Mục A: Định Giá &amp; Biên An Toàn
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {masterScore.sectionA.score} <span className="text-xs text-slate-400">/ 40.0đ</span>
              </span>
              <span className="text-xs font-semibold font-mono text-slate-500">
                {masterScore.sectionA.pct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${masterScore.sectionA.pct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              7 tiêu chí: Dư địa tăng, Mức giảm, So lịch sử, Peers, Lợi nhuận chuẩn hóa.
            </p>
          </div>

          {/* Nhóm B: Chất xúc tác */}
          <div
            onClick={() => onNavigateToTab?.('G')}
            className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-500/50 cursor-pointer transition space-y-2 group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-amber-600 transition">
                Mục B: Chất Xúc Tác &amp; Tái Định Giá
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                {masterScore.sectionB.score} <span className="text-xs text-slate-400">/ 25.0đ</span>
              </span>
              <span className="text-xs font-semibold font-mono text-slate-500">
                {masterScore.sectionB.pct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${masterScore.sectionB.pct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              5 tiêu chí: Động lực lợi nhuận, Dự án/M&amp;A, Độ chắc chắn, Chưa phản ánh.
            </p>
          </div>

          {/* Nhóm C: Rủi ro / Luận điểm */}
          <div
            onClick={() => onNavigateToTab?.('H')}
            className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-purple-500/50 cursor-pointer transition space-y-2 group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-purple-600 transition">
                Mục C: Rủi Ro / Luận Điểm
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-purple-600 dark:text-purple-400">
                {masterScore.sectionC.score} <span className="text-xs text-slate-400">/ 25.0đ</span>
              </span>
              <span className="text-xs font-semibold font-mono text-slate-500">
                {masterScore.sectionC.pct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${masterScore.sectionC.pct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              5 tiêu chí: Tỷ lệ R/R, Khả năng chống chịu Bear case, Trạng thái luận điểm.
            </p>
          </div>

          {/* Nhóm D: Thời điểm & RS 1M */}
          <div
            onClick={() => onNavigateToTab?.('G')}
            className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-teal-500/50 cursor-pointer transition space-y-2 group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-teal-600 transition">
                Mục D: Thời Điểm &amp; RS 1M
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-teal-600 dark:text-teal-400">
                {masterScore.sectionD.score} <span className="text-xs text-slate-400">/ 10.0đ</span>
              </span>
              <span className="text-xs font-semibold font-mono text-slate-500">
                {masterScore.sectionD.pct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${masterScore.sectionD.pct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              4 tiêu chí: Động lượng cơ bản, Consensus CTCK, MA20/50 &amp; RS 1M, Điểm vào.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. BẢNG TÓM TẮT ĐỊNH GIÁ 3 KỊCH BẢN & THƯỚC ĐO R/R (5-BAO-CAO-TOM-TAT.MD)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-slate-600 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Bảng Kịch Bản Định Giá 6–12 Tháng &amp; Cấu Trúc Lợi Nhuận / Rủi Ro
          </h3>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 shadow-2xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-850 font-semibold text-slate-700 dark:text-gray-300">
                <th className="py-3 px-3">Kịch bản</th>
                <th className="py-3 px-3 font-mono">Giá trị hợp lý</th>
                <th className="py-3 px-3 text-center">Dư địa / Mức giảm</th>
                <th className="py-3 px-3 text-center">Xác suất</th>
                <th className="py-3 px-3">Phương pháp / Cơ sở chính</th>
                <th className="py-3 px-3 text-center">Thời hạn</th>
                <th className="py-3 px-3 text-center">Lợi nhuận/Rủi ro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {/* Kịch bản Thận trọng */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition">
                <td className="py-3 px-3 font-bold text-rose-600 dark:text-rose-400">
                  Thận trọng (Bear)
                </td>
                <td className="py-3 px-3 font-bold font-mono text-slate-900 dark:text-white">
                  {bearFv.toLocaleString('vi-VN')} đ
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                  {bearDownsidePct > 0 ? `+${bearDownsidePct}%` : `${bearDownsidePct}%`}
                </td>
                <td className="py-3 px-3 text-center font-mono">{bearProb}%</td>
                <td className="py-3 px-3 text-slate-600 dark:text-gray-400">
                  Chiết khấu định giá thận trọng, loại bỏ yếu tố tăng trưởng mới
                </td>
                <td className="py-3 px-3 text-center text-slate-500">6–12 tháng</td>
                <td rowSpan={3} className="py-3 px-3 text-center align-middle border-l border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20">
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {rrRatio}x
                  </div>
                  <span className={`text-[10px] font-bold block ${rrRatio >= 2.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                    {rrRatio >= 2.0 ? 'Cấu trúc hấp dẫn' : 'Rủi ro/LN trung bình'}
                  </span>
                </td>
              </tr>

              {/* Kịch bản Cơ sở */}
              <tr className="bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 transition font-medium">
                <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                  Cơ sở (Base)
                </td>
                <td className="py-3 px-3 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {baseFv.toLocaleString('vi-VN')} đ
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{baseUpsidePct}%
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold">{baseProb}%</td>
                <td className="py-3 px-3 text-slate-700 dark:text-gray-300 font-normal">
                  Định giá dựa trên EPS chuẩn hóa &amp; P/E mục tiêu bình quân chu kỳ
                </td>
                <td className="py-3 px-3 text-center text-slate-500">6–12 tháng</td>
              </tr>

              {/* Kịch bản Tích cực */}
              <tr className="hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition">
                <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                  Tích cực (Bull)
                </td>
                <td className="py-3 px-3 font-bold font-mono text-slate-900 dark:text-white">
                  {bullFv.toLocaleString('vi-VN')} đ
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                  +{bullUpsidePct}%
                </td>
                <td className="py-3 px-3 text-center font-mono">{bullProb}%</td>
                <td className="py-3 px-3 text-slate-600 dark:text-gray-400">
                  Chất xúc tác phản ánh trọn vẹn, công suất mở rộng đạt tối đa
                </td>
                <td className="py-3 px-3 text-center text-slate-500">6–12 tháng</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          4. GÓC NHÌN CÂN BẰNG 2 CHIỀU: ĐỘNG LỰC TĂNG GIÁ (UPSIDE) VS. RỦI RO THỜI SỰ (DOWNSIDE)
          (Tính năng nâng cao: Giúp nhà đầu tư có cái nhìn khách quan 2 chiều trước khi ra quyết định)
         ========================================================================= */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading">
                  Góc Nhìn Cân Bằng 2 Chiều Trước Quyết Định Đầu Tư
                </h3>
                <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  ValueX 2-Sided Balance
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Đối chiếu độc lập giữa <strong>Cơ hội tăng giá 6–12 tháng (Tab G)</strong> và <strong>Ma trận rủi ro thời sự (Google AI &amp; CTCK)</strong> nhằm triệt tiêu tâm lý thiên vị trước khi giải ngân.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-500">Tỷ lệ Lợi nhuận / Rủi ro:</span>
            <span className="text-xs font-black font-mono px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              {rrRatio}x (Hấp dẫn)
            </span>
          </div>
        </div>

        {/* Grid 2 Cột: Cột Trái (Upside Catalysts) vs Cột Phải (Downside Headwinds) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* CỘT TRÁI: CƠ HỘI & ĐỘNG LỰC TĂNG GIÁ (UPSIDE) */}
          <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                  Động Lực Tăng Giá &amp; Chất Xúc Tác (Upside Drivers)
                </h4>
              </div>
              <button
                onClick={() => onNavigateToTab?.('G')}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
              >
                <span>Xem Tab G</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {report.sectionCatalysts?.catalystList && report.sectionCatalysts.catalystList.length > 0 ? (
                report.sectionCatalysts.catalystList.slice(0, 4).map((cat, idx) => (
                  <div
                    key={cat.id || idx}
                    className="p-3 rounded-lg bg-white dark:bg-gray-850 border border-emerald-100 dark:border-emerald-900/40 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {idx + 1}. {cat.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        {cat.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-gray-400">
                      <div>• Mốc thời gian: <strong className="text-slate-800 dark:text-gray-200">{cat.expectedTiming}</strong></div>
                      <div>• Xác suất: <strong className="text-emerald-600 dark:text-emerald-400">{cat.probability}%</strong></div>
                      <div>• Tác động: <strong className="text-slate-800 dark:text-gray-200">{cat.impactLevel}</strong></div>
                    </div>

                    {cat.evidenceSource && (
                      <div className="text-[10px] text-slate-400 dark:text-gray-500 pt-0.5 flex items-center gap-1">
                        <span>Nguồn:</span>
                        <span className="italic truncate max-w-[280px]">{cat.evidenceSource}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Chưa có dữ liệu chất xúc tác từ Tab G.
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: RỦI RO & THÁCH THỨC THỜI SỰ (DOWNSIDE HEADWINDS - TỪ GOOGLE AI) */}
          <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wide">
                  Ma Trận Rủi Ro Thời Sự (Downside Headwinds)
                </h4>
              </div>
              <span className="rounded bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-300">
                Google AI &amp; CTCK
              </span>
            </div>

            <div className="space-y-2.5">
              {(framework.headwindRisks || []).slice(0, 4).map((risk, idx) => (
                <div
                  key={risk.id || idx}
                  className="p-3 rounded-lg bg-white dark:bg-gray-850 border border-rose-100 dark:border-rose-900/40 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {idx + 1}. {risk.name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                      risk.severity === 'Cao'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    }`}>
                      {risk.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-gray-300 leading-relaxed">
                    {risk.headwindDetail}
                  </p>

                  <div className="pt-1 border-t border-gray-100 dark:border-gray-800 text-[11px] space-y-0.5">
                    <div className="text-slate-600 dark:text-gray-400">
                      • Chỉ số bị ảnh hưởng: <strong className="text-slate-800 dark:text-gray-200">{risk.impactedMetric}</strong> (Xác suất: {risk.probability}%)
                    </div>
                    <div className="text-rose-700 dark:text-rose-400">
                      • <span className="font-semibold">Hành động phòng vệ:</span> {risk.defenseAction}
                    </div>
                  </div>

                  {risk.evidenceSource && (
                    <div className="text-[10px] text-slate-400 dark:text-gray-500 pt-0.5 flex items-center gap-1">
                      <span>Nguồn:</span>
                      <span className="italic truncate max-w-[280px]">{risk.evidenceSource}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Banner: Khuyến nghị Cân bằng Quyết Định */}
        <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-gray-300">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span>
              <strong>Quy tắc ValueX:</strong> Chỉ giải ngân khi <em>Upside Catalysts</em> có xác suất cao hơn <em>Downside Headwinds</em> và Tỷ lệ Lợi nhuận/Rủi ro $\ge 2.0x$.
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[11px] text-slate-500">Đánh giá cân bằng:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
              Cơ Hội Áp Đảo Rủi Ro
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. KHUNG GIÁM SÁT SAU ĐẦU TƯ (POST-INVESTMENT FRAMEWORK)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Khối Trái: Biến số phá vỡ luận điểm (Thesis Breakers) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Điều Kiện Phá Vỡ Luận Điểm (Thesis Breakers)</span>
            </h4>
            <span className="text-[11px] text-slate-500">Đánh giá lại nếu vi phạm</span>
          </div>

          <div className="space-y-2.5">
            {framework.thesisBreakers?.map((tb) => (
              <div
                key={tb.id}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-1.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                    {tb.variableName}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 whitespace-nowrap">
                    Xác suất: {tb.probability}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-gray-400 space-y-0.5">
                  <div>• <span className="font-medium">Ngưỡng cảnh báo:</span> {tb.warningThreshold}</div>
                  <div>• <span className="font-medium text-amber-600 dark:text-amber-400">Hành động nếu vi phạm:</span> {tb.actionIfViolated}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khối Phải: Danh sách 6 câu hỏi kiểm tra trước khi thay đổi vị thế */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Kiểm Tra Trước Khi Thay Đổi Vị Thế (Pre-Trade Checklist)</span>
            </h4>
            <span className="text-[11px] text-slate-500">6 câu hỏi cốt lõi</span>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2.5 shadow-2xs">
            {framework.preTradeChecklist?.map((chk) => (
              <div
                key={chk.id}
                onClick={() => handleToggleChecklist(chk.id)}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition"
              >
                <div className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"></div>
                  )}
                </div>
                <span className={`text-xs ${chk.passed ? 'text-slate-800 dark:text-gray-200' : 'text-slate-400 line-through'}`}>
                  {chk.question}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
