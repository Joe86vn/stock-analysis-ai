import React, { useState, useMemo, useEffect } from 'react';
import {
  AnalysisReport,
  CatalystItem,
  CatalystScorecardData,
  SectionCatalysts,
  TimingScorecardData,
} from '@/types/analysis';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  HelpCircle,
  Clock,
  Zap,
  Activity,
  BarChart3,
  TrendingUp,
  RotateCcw,
  Gauge,
  Compass,
} from 'lucide-react';
import { computeTimingScoreD } from '@/lib/opportunity-scoring-engine';

interface CatalystTrackerProps {
  report: AnalysisReport;
  isEditing: boolean;
  growthDriversText: string;
  onUpdateGrowthDriversText: (text: string) => void;
  onUpdateReport: (updatedReport: AnalysisReport) => void;
  renderMarkdown: (text: string) => React.ReactNode;
  priceHistory?: any[];
}

// Dữ liệu mẫu chuẩn hóa cho Chất Xúc Tác 6-12 tháng theo từng cổ phiếu
const getDefaultCatalystsForTicker = (ticker: string): CatalystItem[] => {
  const t = ticker.toUpperCase();
  if (t === 'HPG') {
    return [
      {
        id: 'cat-hpg-1',
        name: 'Vận hành thương mại Dung Quất 2 (Phân kỳ 1)',
        type: 'Dự án / Mở rộng',
        expectedTiming: 'Q1/2026',
        probability: 90,
        impactLevel: 'Rất lớn',
        pricedInStatus: 'Phản ánh một phần',
        evidenceSource: 'Nghị quyết ĐHCĐ 2025 & Báo cáo tiến độ xây dựng',
        verificationKPI: 'Lò cao 1 chạy thử nghiệm và đạt 50% công suất thiết kế',
        status: 'on_track',
      },
      {
        id: 'cat-hpg-2',
        name: 'Biên lợi nhuận gộp HRC phục hồi nhờ thuế chống bán phá giá',
        type: 'Chính sách / Ngành',
        expectedTiming: '6–12 tháng',
        probability: 75,
        impactLevel: 'Lớn',
        pricedInStatus: 'Chưa phản ánh',
        evidenceSource: 'Quyết định điều tra AD03 của Bộ Công Thương',
        verificationKPI: 'Biên gộp mảng thép cuộn cán nóng HRC vượt 15%',
        status: 'on_track',
      },
      {
        id: 'cat-hpg-3',
        name: 'Cung cấp thép đường ray tàu cao tốc Bắc - Nam',
        type: 'Lợi nhuận',
        expectedTiming: 'Cuối 2026',
        probability: 65,
        impactLevel: 'Lớn',
        pricedInStatus: 'Chưa phản ánh',
        evidenceSource: 'Biên bản làm việc với Bộ Giao thông Vận tải',
        verificationKPI: 'Ký kết hợp đồng khung cung cấp ray thép kỹ thuật cao',
        status: 'on_track',
      },
    ];
  }

  if (t === 'FPT') {
    return [
      {
        id: 'cat-fpt-1',
        name: 'Doanh thu ký mới dịch vụ CNTT Nước Ngoài vượt mốc 1.5 tỷ USD',
        type: 'Lợi nhuận',
        expectedTiming: 'Q4/2025 - Q1/2026',
        probability: 85,
        impactLevel: 'Lớn',
        pricedInStatus: 'Phản ánh một phần',
        evidenceSource: 'Báo cáo KQKD định kỳ hàng tháng & Backlog hợp đồng',
        verificationKPI: 'Tăng trưởng doanh thu ký mới tại Nhật Bản & Mỹ duy trì trên 25%',
        status: 'on_track',
      },
      {
        id: 'cat-fpt-2',
        name: 'Mở rộng trung tâm dữ liệu AI Factory hợp tác cùng NVIDIA',
        type: 'Dự án / Mở rộng',
        expectedTiming: '6–12 tháng',
        probability: 80,
        impactLevel: 'Lớn',
        pricedInStatus: 'Chưa phản ánh',
        evidenceSource: 'Thông cáo báo chí thỏa thuận chiến lược với NVIDIA',
        verificationKPI: 'Tỷ lệ lấp đầy cụm máy chủ GPU đạt trên 70%',
        status: 'on_track',
      },
      {
        id: 'cat-fpt-3',
        name: 'Chính sách cổ tức tiền mặt đều đặn & tăng vốn cổ phần',
        type: 'Cổ tức / Tái cấu trúc',
        expectedTiming: 'Q2/2026',
        probability: 95,
        impactLevel: 'Vừa',
        pricedInStatus: 'Đã phản ánh hết',
        evidenceSource: 'Kế hoạch phân phối lợi nhuận thường niên',
        verificationKPI: 'Cổ tức tiền mặt 20% + Cổ tức cổ phiếu 15%',
        status: 'on_track',
      },
    ];
  }

  if (t === 'PHP') {
    return [
      {
        id: 'cat-php-1',
        name: 'Đưa bến cảng container nước sâu Lạch Huyện 3 & 4 vào khai thác',
        type: 'Dự án / Mở rộng',
        expectedTiming: 'Q1/2026',
        probability: 85,
        impactLevel: 'Rất lớn',
        pricedInStatus: 'Chưa phản ánh',
        evidenceSource: 'Nghị quyết ĐHCĐ & Báo cáo giám sát đầu tư Hải Phòng Port',
        verificationKPI: 'Tiếp nhận tàu mẹ container trọng tải đến 100.000 DWT cập bến',
        status: 'on_track',
      },
      {
        id: 'cat-php-2',
        name: 'Nhận tiền bồi thường di dời cảng Hoàng Diệu phục vụ cầu Nguyễn Trãi',
        type: 'Lợi nhuận',
        expectedTiming: '6–12 tháng',
        probability: 70,
        impactLevel: 'Lớn',
        pricedInStatus: 'Chưa phản ánh',
        evidenceSource: 'Quyết định phê duyệt phương án bồi thường của UBND TP Hải Phòng',
        verificationKPI: 'Dòng tiền bồi thường được hạch toán vào báo cáo tài chính',
        status: 'on_track',
      },
    ];
  }

  return [
    {
      id: 'cat-gen-1',
      name: 'Mở rộng công suất hoặc kênh phân phối mới đi vào hoạt động',
      type: 'Dự án / Mở rộng',
      expectedTiming: '6–12 tháng',
      probability: 75,
      impactLevel: 'Lớn',
      pricedInStatus: 'Chưa phản ánh',
      evidenceSource: 'Nghị quyết ĐHCĐ & Báo cáo thường niên',
      verificationKPI: 'Sản lượng tiêu thụ tăng trưởng trên 15% so với cùng kỳ',
      status: 'on_track',
    },
    {
      id: 'cat-gen-2',
      name: 'Hưởng lợi từ chu kỳ giá bán hoặc nhu cầu ngành phục hồi',
      type: 'Lợi nhuận',
      expectedTiming: '2–4 quý tới',
      probability: 70,
      impactLevel: 'Vừa',
      pricedInStatus: 'Phản ánh một phần',
      evidenceSource: 'Báo cáo phân tích ngành của các công ty chứng khoán',
      verificationKPI: 'Biên lợi nhuận gộp cốt lõi mở rộng từ 1–2% điểm phần trăm',
      status: 'on_track',
    },
  ];
};

export const CatalystTracker: React.FC<CatalystTrackerProps> = ({
  report,
  isEditing,
  growthDriversText,
  onUpdateGrowthDriversText,
  onUpdateReport,
  renderMarkdown,
  priceHistory = [],
}) => {
  // 1. Quản lý danh sách Chất Xúc Tác
  const [catalysts, setCatalysts] = useState<CatalystItem[]>(() => {
    if (report.sectionCatalysts?.catalystList && report.sectionCatalysts.catalystList.length > 0) {
      return report.sectionCatalysts.catalystList;
    }
    return getDefaultCatalystsForTicker(report.ticker);
  });

  // Quản lý lịch sử giá nến để tính toán chỉ báo kỹ thuật D3
  const [history, setHistory] = useState<any[]>(priceHistory || []);
  useEffect(() => {
    if (priceHistory && priceHistory.length > 0) {
      setHistory(priceHistory);
    } else if (report.ticker) {
      fetch(`/api/stocks/${report.ticker}/price-history`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.history)) {
            setHistory(data.history);
          }
        })
        .catch((err) => console.warn('[CatalystTracker] Could not fetch price history:', err));
    }
  }, [priceHistory, report.ticker]);

  // Quản lý điều chỉnh thủ công cho Mục D (Thời điểm)
  const [timingOverrides, setTimingOverrides] = useState<Record<string, { overrideScore?: number; reason?: string }>>(
    () => report.sectionCatalysts?.timingScorecard?.manualOverrides || {}
  );

  // 2. Chấm điểm 25 điểm Chất Xúc Tác ValueX (theo Co-hoi-dau-tu-guide.md)
  const scorecard: CatalystScorecardData = useMemo(() => {
    if (report.sectionCatalysts?.scorecard) {
      return report.sectionCatalysts.scorecard;
    }

    let earningsScore = 0;
    let eventScore = 0;
    let certScore = 0;
    let timeScore = 0;
    let unpricedScore = 0;

    const hasEarningsCat = catalysts.some((c) => c.type === 'Lợi nhuận' && (c.impactLevel === 'Rất lớn' || c.impactLevel === 'Lớn'));
    earningsScore = hasEarningsCat ? 7.0 : catalysts.some((c) => c.type === 'Lợi nhuận') ? 5.0 : 3.5;

    const hasEventCat = catalysts.some((c) => c.type === 'Dự án / Mở rộng' || c.type === 'M&A / Sự kiện');
    eventScore = hasEventCat ? 3.5 : 2.0;

    const avgProb = catalysts.length > 0 ? catalysts.reduce((s, c) => s + (c.probability || 70), 0) / catalysts.length : 70;
    certScore = avgProb >= 80 ? 4.5 : avgProb >= 65 ? 3.5 : 2.5;

    const hasNearCat = catalysts.some((c) => c.expectedTiming.includes('Q1') || c.expectedTiming.includes('Q2') || c.expectedTiming.includes('6'));
    timeScore = hasNearCat ? 3.5 : 2.5;

    const hasUnpriced = catalysts.some((c) => c.pricedInStatus === 'Chưa phản ánh');
    unpricedScore = hasUnpriced ? 3.5 : 2.5;

    const total = Math.round((earningsScore + eventScore + certScore + timeScore + unpricedScore) * 10) / 10;
    let tier: 'Rất mạnh' | 'Khá' | 'Trung bình' | 'Yếu' = 'Khá';
    if (total >= 20.0) tier = 'Rất mạnh';
    else if (total >= 16.0) tier = 'Khá';
    else if (total >= 12.0) tier = 'Trung bình';
    else tier = 'Yếu';

    return {
      earningsCatalystScore: earningsScore,
      corporateEventScore: eventScore,
      certaintyScore: certScore,
      timingScore: timeScore,
      unpricedScore,
      totalScore: total,
      tier,
    };
  }, [catalysts, report.sectionCatalysts?.scorecard]);

  // 3. Chấm điểm 10 điểm Thời Điểm & Điểm Vào (Mục D - theo 4-thoi-diem-dau-tu.md)
  const timingScorecard: TimingScorecardData = useMemo(() => {
    return computeTimingScoreD({
      currentPrice: report.marketData?.currentPrice || 10000,
      priceHistory: history,
      rsRating: report.marketData?.rsRating ?? report.marketData?.rs1Month ?? null,
      rs1Month: report.marketData?.rs1Month ?? null,
      growthMomentum: {
        revenueGrowthYoY: report.sectionForecast8Q?.ttmForward?.revenueGrowthYoY ?? (report.sectionForecast8Q?.quarters?.[0]?.revenueGrowthQoQ ?? 18),
        epsGrowthYoY: report.sectionForecast8Q?.ttmForward?.netProfitGrowthYoY ?? 22,
        growthTier: report.sectionD?.rankGrade || (report.sectionD?.totalScore ? (report.sectionD.totalScore >= 48 ? 'A' : 'B') : 'B'),
        forwardEpsGrowth: report.sectionForecast8Q?.ttmForward?.netProfitGrowthYoY,
      },
      consensusData: {
        totalReports: report.qualitativeInsights?.sectionE_BrokerConsensusAndTheses?.reportsAnalyzed?.length || 3,
        buyCount: report.qualitativeInsights?.sectionE_BrokerConsensusAndTheses?.reportsAnalyzed?.filter(
          (r) => r.recommendation.toLowerCase().includes('mua') || r.recommendation.toLowerCase().includes('khả quan')
        ).length || 2,
        targetPriceTrend: 'UP',
      },
      catalysts,
      manualOverrides: timingOverrides,
    });
  }, [report.marketData, report.sectionD, report.sectionForecast8Q, report.qualitativeInsights, history, catalysts, timingOverrides]);

  // Cập nhật danh sách chất xúc tác
  const handleUpdateCatalyst = (id: string, field: keyof CatalystItem, value: any) => {
    const updated = catalysts.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setCatalysts(updated);
    saveSectionToReport(updated, growthDriversText, scorecard, timingScorecard);
  };

  const handleAddCatalyst = () => {
    const newItem: CatalystItem = {
      id: `cat-${Date.now()}`,
      name: 'Chất xúc tác mới',
      type: 'Dự án / Mở rộng',
      expectedTiming: '6–12 tháng',
      probability: 75,
      impactLevel: 'Lớn',
      pricedInStatus: 'Chưa phản ánh',
      evidenceSource: 'Nghị quyết ĐHCĐ / Tài liệu công bố',
      verificationKPI: 'Chỉ số hoàn thành cụ thể',
      status: 'on_track',
    };
    const updated = [...catalysts, newItem];
    setCatalysts(updated);
    saveSectionToReport(updated, growthDriversText, scorecard, timingScorecard);
  };

  const handleDeleteCatalyst = (id: string) => {
    const updated = catalysts.filter((c) => c.id !== id);
    setCatalysts(updated);
    saveSectionToReport(updated, growthDriversText, scorecard, timingScorecard);
  };

  const handleUpdateTimingOverride = (id: string, overrideScore?: number, reason?: string) => {
    const updated = {
      ...timingOverrides,
      [id]: { overrideScore, reason },
    };
    setTimingOverrides(updated);
    const newTiming = computeTimingScoreD({
      currentPrice: report.marketData?.currentPrice || 10000,
      priceHistory: history,
      rsRating: report.marketData?.rsRating ?? report.marketData?.rs1Month ?? null,
      rs1Month: report.marketData?.rs1Month ?? null,
      catalysts,
      manualOverrides: updated,
    });
    saveSectionToReport(catalysts, growthDriversText, scorecard, newTiming);
  };

  const handleResetTimingOverrides = () => {
    setTimingOverrides({});
    const newTiming = computeTimingScoreD({
      currentPrice: report.marketData?.currentPrice || 10000,
      priceHistory: history,
      rsRating: report.marketData?.rsRating ?? report.marketData?.rs1Month ?? null,
      rs1Month: report.marketData?.rs1Month ?? null,
      catalysts,
      manualOverrides: {},
    });
    saveSectionToReport(catalysts, growthDriversText, scorecard, newTiming);
  };

  const saveSectionToReport = (
    catList: CatalystItem[],
    driversText: string,
    sc: CatalystScorecardData,
    tc: TimingScorecardData = timingScorecard
  ) => {
    const updatedSection: SectionCatalysts = {
      growthDriversAnalysis: driversText,
      catalystList: catList,
      scorecard: sc,
      timingScorecard: tc,
    };
    onUpdateReport({
      ...report,
      sectionCatalysts: updatedSection,
    });
  };

  return (
    <div className="space-y-8 font-sans text-slate-800 dark:text-gray-200">
      {/* EXECUTIVE MINI-BANNER: TỔNG HỢP CHẤT XÚC TÁC & TIMING (35 ĐIỂM) */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-transparent border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
              G. Chất Xúc Tác &amp; Timing Đầu Tư
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              Nhóm B (25đ) + Nhóm D (10đ)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
            Đánh giá sức mạnh chất xúc tác 6–12 tháng kết hợp cùng động lượng cơ bản, cấu trúc giá và sức mạnh giá RS 1M.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Điểm Chất Xúc Tác */}
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-right">
            <span className="text-[10px] uppercase text-slate-500 block">Chất Xúc Tác (B)</span>
            <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
              {scorecard.totalScore} <span className="text-[10px] text-slate-400">/ 25.0đ</span>
            </span>
          </div>

          {/* Điểm Timing */}
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-right">
            <span className="text-[10px] uppercase text-slate-500 block">Timing &amp; RS 1M (D)</span>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {timingScorecard.totalScore} <span className="text-[10px] text-slate-400">/ 10.0đ</span>
            </span>
          </div>

          {/* Tổng Điểm Tab G */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-right shadow-xs">
            <span className="text-[10px] uppercase text-slate-300 block">Tổng Tab G</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {(scorecard.totalScore + timingScorecard.totalScore).toFixed(1)} <span className="text-[10px] text-slate-400">/ 35.0đ</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. KHỐI PHÂN TÍCH ĐỘNG LỰC TĂNG TRƯỞNG CỐT LÕI (TRIỂN VỌNG) */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-center space-x-2.5 mb-2">
          <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            1. Phân Tích Động Lực Tăng Trưởng Cốt Lõi (Sản Lượng, Giá Bán, Chi Phí)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
          Đánh giá chiều sâu về 3 trục vận hành: Sản lượng/Công suất (Volume), Giá bán bình quân (ASP &amp; Pricing Power), và Cơ cấu chi phí/Biên lợi nhuận.
        </p>

        {isEditing ? (
          <textarea
            rows={8}
            value={growthDriversText}
            onChange={(e) => {
              onUpdateGrowthDriversText(e.target.value);
              saveSectionToReport(catalysts, e.target.value, scorecard);
            }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
            placeholder="Nhập phân tích các yếu tố ảnh hưởng tăng trưởng..."
          />
        ) : (
          <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed space-y-2">
            {renderMarkdown(growthDriversText)}
          </div>
        )}
      </div>

      {/* 2. MA TRẬN THEO DÕI CHẤT XÚC TÁC 6–12 THÁNG (BẢNG 9 CỘT THEO 2-CHAT-XUC-TAC.MD) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Ma Trận Theo Dõi Chất Xúc Tác | Khung Thời Gian 6–12 Tháng
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Theo quy tắc ValueX: Chất xúc tác tốt phải có tác động trực tiếp, xác suất cao, đủ gần 6–12 tháng, chưa phản ánh hết vào giá và có KPI kiểm chứng.
            </p>
          </div>

          <button
            onClick={handleAddCatalyst}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm Chất Xúc Tác</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 font-semibold text-slate-700 dark:text-gray-300">
                <th className="py-2.5 px-3 min-w-[200px]">Chất xúc tác</th>
                <th className="py-2.5 px-2.5 min-w-[130px]">Loại</th>
                <th className="py-2.5 px-2.5 min-w-[90px]">Thời gian</th>
                <th className="py-2.5 px-2 text-center w-16">Xác suất</th>
                <th className="py-2.5 px-2 text-center w-20">Tác động</th>
                <th className="py-2.5 px-2.5 min-w-[120px]">Phản ánh vào giá</th>
                <th className="py-2.5 px-3 min-w-[160px]">Bằng chứng / Nguồn</th>
                <th className="py-2.5 px-3 min-w-[160px]">KPI xác nhận</th>
                <th className="py-2.5 px-2.5 text-center min-w-[110px]">Trạng thái</th>
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {catalysts.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/40 text-slate-800 dark:text-gray-200">
                  {/* Tên chất xúc tác */}
                  <td className="py-2.5 px-3 font-medium">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'name', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none text-xs text-slate-900 dark:text-white"
                    />
                  </td>

                  {/* Loại */}
                  <td className="py-2.5 px-2.5">
                    <select
                      value={cat.type}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'type', e.target.value as any)}
                      className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-gray-200 focus:outline-none"
                    >
                      <option value="Lợi nhuận">Lợi nhuận</option>
                      <option value="Dự án / Mở rộng">Dự án / Mở rộng</option>
                      <option value="M&A / Sự kiện">M&A / Sự kiện</option>
                      <option value="Chính sách / Ngành">Chính sách / Ngành</option>
                      <option value="Cổ tức / Tái cấu trúc">Cổ tức / Tái cấu trúc</option>
                    </select>
                  </td>

                  {/* Thời gian */}
                  <td className="py-2.5 px-2.5">
                    <input
                      type="text"
                      value={cat.expectedTiming}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'expectedTiming', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none text-xs"
                    />
                  </td>

                  {/* Xác suất */}
                  <td className="py-2.5 px-2 text-center tabular-nums">
                    <input
                      type="number"
                      value={cat.probability}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'probability', parseInt(e.target.value, 10) || 0)}
                      className="w-12 text-center bg-transparent border border-gray-200 dark:border-gray-700 rounded p-1 text-xs"
                    />
                    <span className="text-[10px] text-slate-500 ml-0.5">%</span>
                  </td>

                  {/* Mức tác động */}
                  <td className="py-2.5 px-2 text-center">
                    <select
                      value={cat.impactLevel}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'impactLevel', e.target.value as any)}
                      className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1.5 py-1 text-xs text-slate-800 dark:text-gray-200"
                    >
                      <option value="Rất lớn">Rất lớn</option>
                      <option value="Lớn">Lớn</option>
                      <option value="Vừa">Vừa</option>
                      <option value="Nhỏ">Nhỏ</option>
                    </select>
                  </td>

                  {/* Đã phản ánh vào giá */}
                  <td className="py-2.5 px-2.5">
                    <select
                      value={cat.pricedInStatus}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'pricedInStatus', e.target.value as any)}
                      className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-gray-200"
                    >
                      <option value="Chưa phản ánh">Chưa phản ánh</option>
                      <option value="Phản ánh một phần">Phản ánh một phần</option>
                      <option value="Đã phản ánh hết">Đã phản ánh hết</option>
                    </select>
                  </td>

                  {/* Bằng chứng / Nguồn */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={cat.evidenceSource}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'evidenceSource', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none text-xs text-slate-600 dark:text-gray-400"
                    />
                  </td>

                  {/* KPI xác nhận */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={cat.verificationKPI}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'verificationKPI', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none text-xs text-slate-600 dark:text-gray-400"
                    />
                  </td>

                  {/* Trạng thái */}
                  <td className="py-2.5 px-2.5 text-center">
                    <select
                      value={cat.status}
                      onChange={(e) => handleUpdateCatalyst(cat.id, 'status', e.target.value as any)}
                      className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs font-medium"
                    >
                      <option value="on_track">🟢 Đúng hạn</option>
                      <option value="delayed">🟡 Chậm tiến độ</option>
                      <option value="broken">🔴 Bị hủy</option>
                    </select>
                  </td>

                  {/* Nút xóa */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      onClick={() => handleDeleteCatalyst(cat.id)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                      title="Xóa chất xúc tác"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. BẢNG ĐIỂM CHẤT XÚC TÁC & TÁI ĐỊNH GIÁ (25 ĐIỂM VALUEX) */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>3. Bảng Điểm Chất Xúc Tác &amp; Khả Năng Tái Định Giá</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md">
                {scorecard.totalScore} / 25.0 Điểm ({scorecard.tier})
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
              Trích từ Khung 100 Điểm Cơ Hội Đầu Tư ValueX (Nhóm B). Điểm số đo lường mức độ chắc chắn và tính hiện thực của các động lực 6–12 tháng.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Đánh Giá Tổng Quan</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {scorecard.tier === 'Rất mạnh' && '🟢 Động lực tăng trưởng rất mạnh & rõ ràng'}
              {scorecard.tier === 'Khá' && '🟢 Chất xúc tác khả thi, độ tin cậy khá'}
              {scorecard.tier === 'Trung bình' && '🟡 Chất xúc tác nhỏ hoặc đã phản ánh vào giá'}
              {scorecard.tier === 'Yếu' && '🔴 Thiếu chất xúc tác ngắn hạn hỗ trợ'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {/* Tiêu chí 1 */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>1. Tác động lợi nhuận</span>
              <span className="font-bold text-slate-900 dark:text-white">{scorecard.earningsCatalystScore} / 8.0</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400">
              Có chất xúc tác tác động trực tiếp và đủ lớn đến LNST cốt lõi.
            </p>
          </div>

          {/* Tiêu chí 2 */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>2. Sự kiện doanh nghiệp</span>
              <span className="font-bold text-slate-900 dark:text-white">{scorecard.corporateEventScore} / 4.0</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400">
              Dự án mới, M&amp;A, mở rộng thị phần hoặc chính sách hỗ trợ.
            </p>
          </div>

          {/* Tiêu chí 3 */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>3. Độ chắc chắn</span>
              <span className="font-bold text-slate-900 dark:text-white">{scorecard.certaintyScore} / 5.0</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400">
              Xác suất thực thi cao, có bằng chứng pháp lý / thực địa rõ ràng.
            </p>
          </div>

          {/* Tiêu chí 4 */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>4. Thời điểm 6–12T</span>
              <span className="font-bold text-slate-900 dark:text-white">{scorecard.timingScore} / 4.0</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400">
              Điểm rơi sự kiện đủ gần trong 2–4 quý tới, không dùng kỳ vọng xa.
            </p>
          </div>

          {/* Tiêu chí 5 */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>5. Chưa phản ánh</span>
              <span className="font-bold text-slate-900 dark:text-white">{scorecard.unpricedScore} / 4.0</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400">
              Thị trường chưa chiết khấu hết tiềm năng vào thị giá hiện tại.
            </p>
          </div>
        </div>
      </div>

      {/* 4. ĐÁNH GIÁ THỜI ĐIỂM & ĐIỂM VÀO (MỤC D - 10 ĐIỂM VALUEX) */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>4. Đánh Giá Thời Điểm &amp; Điểm Vào Lệnh</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md">
                {timingScorecard.totalScore} / 10.0 Điểm ({timingScorecard.tier})
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
              Quy chuẩn 10 điểm ValueX: Động lượng tăng trưởng cơ bản, kỳ vọng thị trường, cấu trúc giá/khối lượng (MA20/50 &amp; RS 1M) và khoảng cách tới chất xúc tác.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {Object.keys(timingOverrides).length > 0 && (
              <button
                type="button"
                onClick={handleResetTimingOverrides}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại điểm tự động</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Kỹ Thuật & Sức Mạnh Giá (D3) */}
        {timingScorecard.technicalSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Xu Hướng Kỹ Thuật */}
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-1">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Cấu Trúc Xu Hướng</span>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {timingScorecard.technicalSummary.trendStatus}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono block">
                So MA20: {timingScorecard.technicalSummary.priceVsMa20Pct > 0 ? '+' : ''}{timingScorecard.technicalSummary.priceVsMa20Pct}%
              </span>
            </div>

            {/* Card 2: Thanh Khoản & Dòng Tiền */}
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-1">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Xác Nhận Thanh Khoản</span>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Vol / V20: {timingScorecard.technicalSummary.volVsVol20Pct}%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                {timingScorecard.technicalSummary.volVsVol20Pct >= 120 ? 'Dòng tiền chủ động' : 'Thanh khoản ổn định'}
              </span>
            </div>

            {/* Card 3: Sức Mạnh Giá RS 1M */}
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-1">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Sức Mạnh Giá RS 1M</span>
              <div className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-500" />
                <span className={`text-xs font-bold ${
                  (timingScorecard.technicalSummary.rs1Month || 75) >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : (timingScorecard.technicalSummary.rs1Month || 75) >= 65
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-600 dark:text-gray-400'
                }`}>
                  RS Rating: {timingScorecard.technicalSummary.rs1Month || 75}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                {(timingScorecard.technicalSummary.rs1Month || 75) >= 80 ? 'Top 20% khỏe nhất thị trường' : 'Vận động cân bằng'}
              </span>
            </div>

            {/* Card 4: Xung Lực RSI */}
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-1">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Chỉ Báo RSI (14)</span>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {timingScorecard.technicalSummary.rsi14 || 55.0}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                {(timingScorecard.technicalSummary.rsi14 || 55) > 70 ? 'Vùng quá mua' : (timingScorecard.technicalSummary.rsi14 || 55) < 35 ? 'Vùng quá bán' : 'Vùng vận động lành mạnh'}
              </span>
            </div>
          </div>
        )}

        {/* Bảng Chi Tiết 4 Tiêu Chí Mục D */}
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 font-semibold text-slate-700 dark:text-gray-300">
                <th className="py-2.5 px-3 min-w-[200px]">Tiêu chí đánh giá</th>
                <th className="py-2.5 px-3 min-w-[180px]">Dữ liệu / Chỉ số</th>
                <th className="py-2.5 px-2.5 text-center w-28">Đánh giá</th>
                <th className="py-2.5 px-2 text-center w-24">Điểm tự động</th>
                <th className="py-2.5 px-2.5 text-center w-36">Chỉnh sửa</th>
                <th className="py-2.5 px-3 min-w-[200px]">Điểm cuối &amp; Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {timingScorecard.items.map((item) => {
                const isOverridden = typeof timingOverrides[item.id]?.overrideScore === 'number';
                return (
                  <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{item.code}. {item.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400">Tối đa: {item.maxScore} điểm</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-gray-300">
                      {item.displayValue}
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.grade === 'RẤT TỐT'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : item.grade === 'TỐT'
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                          : item.grade === 'TRUNG BÌNH'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.grade}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono text-slate-700 dark:text-gray-300">
                      {item.autoScore}
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={item.maxScore}
                          value={isOverridden ? timingOverrides[item.id]?.overrideScore : ''}
                          placeholder={String(item.autoScore)}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            handleUpdateTimingOverride(item.id, val, timingOverrides[item.id]?.reason);
                          }}
                          className="w-16 px-1.5 py-1 text-xs font-mono font-bold text-center rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-emerald-500"
                        />
                        {isOverridden && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTimingOverride(item.id, undefined, undefined)}
                            title="Xóa điều chỉnh thủ công"
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                          {item.finalScore} / {item.maxScore}đ
                        </span>
                        {isOverridden && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                            (Điều chỉnh)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5 leading-snug">
                        {item.note}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
