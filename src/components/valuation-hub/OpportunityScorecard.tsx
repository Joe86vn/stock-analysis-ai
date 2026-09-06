import React, { useState } from 'react';
import {
  OpportunityScoreResult,
  OpportunityCriterionScore,
  ThesisStatus,
} from '@/lib/opportunity-scoring-engine';
import {
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Scale,
  Sparkles,
} from 'lucide-react';

interface OpportunityScorecardProps {
  scoreResult: OpportunityScoreResult;
  thesisStatus: ThesisStatus;
  onUpdateThesisStatus: (status: ThesisStatus) => void;
  manualOverrides: Record<string, { overrideScore?: number; reason?: string }>;
  onUpdateOverride: (id: string, overrideScore?: number, reason?: string) => void;
  onResetOverrides: () => void;
}

export const OpportunityScorecard: React.FC<OpportunityScorecardProps> = ({
  scoreResult,
  thesisStatus,
  onUpdateThesisStatus,
  manualOverrides,
  onUpdateOverride,
  onResetOverrides,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { sectionA, sectionC } = scoreResult;

  const overrideCount = Object.keys(manualOverrides).filter(
    (k) => typeof manualOverrides[k]?.overrideScore === 'number'
  ).length;

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors shadow-xs dark:shadow-none space-y-3.5">
      {/* ========================================================
          TIER 1: EXECUTIVE MINI-BAR (Luôn hiển thị)
          Hiển thị độc lập Mục A (40đ) và Mục C (25đ) - Không gộp tổng
         ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
        {/* Tiêu đề & Icon */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-heading">
                Điểm Cơ Hội Đầu Tư: Định Giá &amp; Rủi Ro
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Mục A &amp; Mục C
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Chuẩn hóa theo ValueX Investment Opportunity Guide
            </p>
          </div>
        </div>

        {/* 2 Khối Điểm Độc Lập: Mục A & Mục C */}
        <div className="flex flex-wrap items-center gap-3">
          {/* MỤC A */}
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-medium">
                Mục A: Định Giá &amp; Biên An Toàn
              </span>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {sectionA.totalScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 40.0 đ</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-1 font-mono">
                  ({sectionA.pctAchievement}%)
                </span>
              </div>
            </div>
            <div className="w-1.5 h-8 rounded-full bg-emerald-500/80"></div>
          </div>

          {/* MỤC C */}
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-medium">
                Mục C: Rủi Ro / Luận Điểm
              </span>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                  {sectionC.totalScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 25.0 đ</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-1 font-mono">
                  ({sectionC.pctAchievement}%)
                </span>
              </div>
            </div>
            <div className="w-1.5 h-8 rounded-full bg-amber-500/80"></div>
          </div>

          {/* Nút Mở Rộng / Thu Gọn */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all shadow-2xs cursor-pointer"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Chi tiết 12 tiêu chí'}</span>
            {overrideCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title={`Đang điều chỉnh ${overrideCount} tiêu chí`} />
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* ========================================================
          TIER 2: BẢNG CHẤM ĐIỂM CHI TIẾT TƯƠNG TÁC (Khi mở rộng)
         ======================================================== */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
          {/* Thanh hướng dẫn & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>
                Điểm tự động nhảy theo thời gian thực từ 3 kịch bản định giá, P/E lịch sử và đối thủ ngành.
              </span>
            </div>
            {overrideCount > 0 && (
              <button
                type="button"
                onClick={onResetOverrides}
                className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Khôi phục {overrideCount} điểm tự động
              </button>
            )}
          </div>

          {/* 2 Cột: Mục A (7 tiêu chí) & Mục C (5 tiêu chí) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CỘT TRÁI: MỤC A (40.0 ĐIỂM) */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-heading">
                    Mục A. Định Giá &amp; Biên An Toàn
                  </span>
                </div>
                <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {sectionA.totalScore} / 40.0 đ
                </div>
              </div>

              <div className="space-y-2.5">
                {sectionA.items.map((item) => (
                  <CriterionCard
                    key={item.id}
                    item={item}
                    onUpdateOverride={onUpdateOverride}
                  />
                ))}
              </div>
            </div>

            {/* CỘT PHẢI: MỤC C (25.0 ĐIỂM) */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-heading">
                    Mục C. Rủi Ro / Lợi Nhuận &amp; Luận Điểm
                  </span>
                </div>
                <div className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                  {sectionC.totalScore} / 25.0 đ
                </div>
              </div>

              {/* Bộ chọn trạng thái luận điểm nhanh cho C.3 */}
              <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Trạng thái Luận Điểm Đầu Tư (C.3):
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    Tối đa 5.0 đ
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateThesisStatus('INTACT')}
                    className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all border text-center ${
                      thesisStatus === 'INTACT'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-400 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                    }`}
                  >
                    🟢 Nguyên vẹn (5đ)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateThesisStatus('MONITOR')}
                    className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all border text-center ${
                      thesisStatus === 'MONITOR'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-400 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                    }`}
                  >
                    🟡 Theo dõi (3đ)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateThesisStatus('BROKEN')}
                    className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all border text-center ${
                      thesisStatus === 'BROKEN'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-400 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                    }`}
                  >
                    🔴 Phá vỡ (0đ)
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {sectionC.items.map((item) => (
                  <CriterionCard
                    key={item.id}
                    item={item}
                    onUpdateOverride={onUpdateOverride}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent thẻ tiêu chí chấm điểm
interface CriterionCardProps {
  item: OpportunityCriterionScore;
  onUpdateOverride: (id: string, overrideScore?: number, reason?: string) => void;
}

const CriterionCard: React.FC<CriterionCardProps> = ({ item, onUpdateOverride }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localScore, setLocalScore] = useState<string>(
    item.overrideScore !== undefined ? String(item.overrideScore) : ''
  );
  const [localReason, setLocalReason] = useState<string>(item.manualReason || '');

  const hasOverride = item.overrideScore !== undefined;

  const handleApplyOverride = () => {
    if (localScore === '') {
      onUpdateOverride(item.id, undefined, undefined);
    } else {
      const num = Number(localScore);
      if (!isNaN(num)) {
        onUpdateOverride(item.id, Math.min(item.maxScore, Math.max(0, num)), localReason);
      }
    }
    setIsEditing(false);
  };

  const handleClearOverride = () => {
    setLocalScore('');
    setLocalReason('');
    onUpdateOverride(item.id, undefined, undefined);
    setIsEditing(false);
  };

  // Grade color
  const gradeBadge =
    item.grade === 'RẤT TỐT'
      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
      : item.grade === 'TỐT'
      ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800'
      : item.grade === 'TRUNG BÌNH'
      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800';

  return (
    <div
      className={`p-2.5 rounded-lg border text-xs transition-colors ${
        hasOverride
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Hàng 1: Mã, Tên, Điểm */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-[11px] text-slate-500 dark:text-slate-400">
              {item.code}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {item.name}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Dữ liệu: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.rawValueDisplay}</strong></span>
          </div>
        </div>

        {/* Cụm Điểm & Đánh giá */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${gradeBadge}`}>
            {item.grade}
          </span>
          <div className="text-right">
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
              {item.finalScore} <span className="text-[10px] text-slate-400 font-normal">/ {item.maxScore}đ</span>
            </div>
            {hasOverride && (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium block">
                (Gốc: {item.autoScore}đ)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hàng 2: Nhận định định lượng */}
      <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
        {item.assessmentNote}
      </div>

      {/* Lý do điều chỉnh (nếu có) */}
      {hasOverride && item.manualReason && (
        <div className="mt-1.5 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200 dark:border-amber-800/40">
          <strong>Lý do điều chỉnh:</strong> {item.manualReason}
        </div>
      )}

      {/* Nút & Khung Điều Chỉnh Thủ Công */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        {!isEditing ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-slate-400">
              {hasOverride ? 'Đã điều chỉnh thủ công' : 'Chấm điểm tự động'}
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-[10px] font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              {hasOverride ? 'Sửa điều chỉnh' : 'Điều chỉnh điểm'}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Điểm thủ công (0 – {item.maxScore}đ):
              </label>
              <input
                type="number"
                min="0"
                max={item.maxScore}
                step="0.5"
                value={localScore}
                onChange={(e) => setLocalScore(e.target.value)}
                placeholder={String(item.autoScore)}
                className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-center font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <input
              type="text"
              value={localReason}
              onChange={(e) => setLocalReason(e.target.value)}
              placeholder="Ghi rõ lý do điều chỉnh (đặc thù ngành, tài sản ẩn...)"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end gap-2 pt-0.5">
              {hasOverride && (
                <button
                  type="button"
                  onClick={handleClearOverride}
                  className="px-2 py-0.5 rounded text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer"
                >
                  Xóa điều chỉnh
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2 py-0.5 rounded text-[10px] text-slate-500 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyOverride}
                className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500 text-white hover:bg-amber-600 cursor-pointer shadow-2xs"
              >
                Lưu điểm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
