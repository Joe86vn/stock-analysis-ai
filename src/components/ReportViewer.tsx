'use client';

import React, { useState } from 'react';
import { AnalysisReport, SectionA, SectionB, SectionC, SectionD } from '@/types/analysis';
import { FileText, Building2, Factory, LineChart, Target, Edit3, Check, Eye } from 'lucide-react';

interface ReportViewerProps {
  report: AnalysisReport;
  onUpdateReport: (updatedReport: AnalysisReport) => void;
}

export function ReportViewer({ report, onUpdateReport }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [isEditing, setIsEditing] = useState(false);

  // Editable states
  const [secA, setSecA] = useState<SectionA>(report.sectionA);
  const [secB, setSecB] = useState<SectionB>(report.sectionB);
  const [secC, setSecC] = useState<SectionC>(report.sectionC);
  const [secDGrowth, setSecDGrowth] = useState<string>(report.sectionD.growthDriversRevenueAndCost);

  const handleSaveEdits = () => {
    onUpdateReport({
      ...report,
      sectionA: secA,
      sectionB: secB,
      sectionC: secC,
      sectionD: {
        ...report.sectionD,
        growthDriversRevenueAndCost: secDGrowth,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-3">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">
            Báo Cáo Phân Tích Chi Tiết theo Mẫu (`analysis-guide.md`)
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {isEditing ? (
            <button
              onClick={handleSaveEdits}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-400 transition"
            >
              <Check className="h-4 w-4" />
              <span>Lưu Thay Đổi</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 hover:text-white transition"
            >
              <Edit3 className="h-4 w-4 text-sky-400" />
              <span>Chỉnh Sửa Văn Bản</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs for A, B, C, D */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => setActiveTab('A')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'A'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
              : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>A. Tổng Quan Doanh Nghiệp</span>
        </button>

        <button
          onClick={() => setActiveTab('B')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'B'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Factory className="h-4 w-4" />
          <span>B. Hoạt Động KD & Chuỗi Giá Trị</span>
        </button>

        <button
          onClick={() => setActiveTab('C')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'C'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
              : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <LineChart className="h-4 w-4" />
          <span>C. Tình Hình Tài Chính</span>
        </button>

        <button
          onClick={() => setActiveTab('D')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'D'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
              : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Target className="h-4 w-4" />
          <span>D. Triển Vọng & Định Giá</span>
        </button>
      </div>

      {/* Tab Content Display / Edit */}
      <div className="mt-5 space-y-6">
        {/* TAB A: TỔNG QUAN DOANH NGHIỆP */}
        {activeTab === 'A' && (
          <div className="space-y-5">
            <SectionCard title="1. Tổng quan doanh nghiệp" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={secA.historyAndOverview}
                  onChange={(e) => setSecA({ ...secA, historyAndOverview: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secA.historyAndOverview}
                </p>
              )}
            </SectionCard>

            <SectionCard title="2. Cơ cấu cổ đông & ban lãnh đạo" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={secA.shareholdersAndManagement}
                  onChange={(e) => setSecA({ ...secA, shareholdersAndManagement: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secA.shareholdersAndManagement}
                </p>
              )}
            </SectionCard>

            <SectionCard title="3. Cơ cấu doanh nghiệp & Công ty liên kết (trọng số lớn)" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={secA.subsidiariesAndAffiliates}
                  onChange={(e) => setSecA({ ...secA, subsidiariesAndAffiliates: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secA.subsidiariesAndAffiliates}
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* TAB B: HOẠT ĐỘNG KINH DOANH & CHUỖI GIÁ TRỊ */}
        {activeTab === 'B' && (
          <div className="space-y-5">
            <SectionCard title="1. Chuỗi giá trị: Đầu vào (Yếu tố chi phí & Nhà cung cấp)" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={5}
                  value={secB.valueChainInput}
                  onChange={(e) => setSecB({ ...secB, valueChainInput: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secB.valueChainInput}
                </p>
              )}
            </SectionCard>

            <SectionCard title="2. Quy trình sản xuất & Năng lực công suất" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={5}
                  value={secB.valueChainProduction}
                  onChange={(e) => setSecB({ ...secB, valueChainProduction: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secB.valueChainProduction}
                </p>
              )}
            </SectionCard>

            <SectionCard title="3. Đầu ra (Cơ cấu doanh thu & Phân tích sản phẩm chính)" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={5}
                  value={secB.valueChainOutput}
                  onChange={(e) => setSecB({ ...secB, valueChainOutput: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secB.valueChainOutput}
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* TAB C: TÌNH HÌNH TÀI CHÍNH */}
        {activeTab === 'C' && (
          <div className="space-y-5">
            <SectionCard title="1. Phân tích doanh thu 3 năm gần nhất" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={secC.revenueHistory3Years}
                  onChange={(e) => setSecC({ ...secC, revenueHistory3Years: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secC.revenueHistory3Years}
                </p>
              )}
            </SectionCard>

            <SectionCard title="2. Phân tích tỷ suất lợi nhuận (Gross/Net Margin & ROE)" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={secC.profitabilityMargins}
                  onChange={(e) => setSecC({ ...secC, profitabilityMargins: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secC.profitabilityMargins}
                </p>
              )}
            </SectionCard>

            <SectionCard title="3. Sức khỏe tài chính & Tỷ lệ nợ vay/VCSH (D/E)" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={secC.financialHealthAndDebt}
                  onChange={(e) => setSecC({ ...secC, financialHealthAndDebt: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secC.financialHealthAndDebt}
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* TAB D: TRIỂN VỌNG KINH DOANH & ĐỊNH GIÁ */}
        {activeTab === 'D' && (
          <div className="space-y-5">
            <SectionCard title="1. Phân tích yếu tố ảnh hưởng tăng trưởng (Sản lượng, Giá bán, Chi phí)" isEditing={isEditing}>
              {isEditing ? (
                <textarea
                  rows={6}
                  value={secDGrowth}
                  onChange={(e) => setSecDGrowth(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                  {secDGrowth}
                </p>
              )}
            </SectionCard>

            <SectionCard title="2. Luận điểm ước lượng KQKD 4 quý tiếp theo" isEditing={false}>
              <p className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                {report.sectionD.quarterlyForecastReasoning}
              </p>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  isEditing,
}: {
  title: string;
  children: React.ReactNode;
  isEditing: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 transition ${isEditing ? 'border-sky-500/50 bg-gray-900/90' : 'border-gray-800 bg-gray-900/60'}`}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2.5">
        {title}
      </h3>
      {children}
    </div>
  );
}
