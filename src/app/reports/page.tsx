import React from 'react';
import Link from 'next/link';
import { fetchReports } from '@/lib/reports-service';
import { CATEGORY_LABELS, ReportCategory } from '@/types/reports';
import { Lock, FileText, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Ấn Phẩm Phân Tích & Báo Cáo Tư Vấn | ValueX',
  description: 'Tổng hợp các báo cáo nhận định vĩ mô, chiến lược dòng tiền, phân tích doanh nghiệp và case study thực chiến từ đội ngũ ValueX.',
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả báo cáo' },
  { value: 'macro', label: 'Báo cáo Vĩ mô' },
  { value: 'strategy', label: 'Báo cáo Chiến lược' },
  { value: 'enterprise', label: 'Phân tích Doanh nghiệp' },
  { value: 'case_study', label: 'Case Study thực chiến' },
];

export default async function ReportsPage(props: {
  searchParams: Promise<{ category?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentCategory = searchParams.category || 'all';
  const reports = await fetchReports(currentCategory);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Ấn phẩm Độc quyền ValueX
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-heading)] tracking-tight">
            Ấn Phẩm Phân Tích & Tư Vấn
          </h1>
          <p className="mt-3 text-base text-[var(--text-muted)] leading-relaxed">
            Tổng hợp đầy đủ các báo cáo nhận định, chiến lược phân bổ tài sản, nghiên cứu doanh nghiệp và case study đúc rút kinh nghiệm thực chiến đầu tư.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10 pb-5 border-b border-[var(--border-color)]">
          {CATEGORIES.map((cat) => {
            const isActive = currentCategory === cat.value;
            return (
              <Link
                key={cat.value}
                href={cat.value === 'all' ? '/reports' : `/reports?category=${cat.value}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-color)] hover:border-emerald-500/40'
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {/* Reports Listing Grid */}
        {reports.length === 0 ? (
          <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border-color)]">
            <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--text-muted)] text-base font-medium">
              Không tìm thấy báo cáo nào trong danh mục này.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <div
                key={report.id}
                className="group flex flex-col bg-[var(--surface)] rounded-2xl border border-[var(--border-color)] hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 overflow-hidden"
              >
                {/* Card Banner / Cover Label */}
                <div className="h-36 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="flex justify-between items-start z-10">
                    <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                      {CATEGORY_LABELS[report.category] || report.category}
                    </span>
                    {report.is_vip ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-sm">
                        <Lock className="w-3 h-3" /> VIP
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        Cơ bản
                      </span>
                    )}
                  </div>
                  <div className="z-10">
                    <span className="text-sm font-bold text-white/90 tracking-wide font-mono">
                      {report.cover_label || 'VALUEX REPORT'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-heading)] group-hover:text-emerald-500 transition-colors line-clamp-2 leading-snug mb-2.5">
                      {report.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-3 leading-relaxed mb-6">
                      {report.excerpt}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 opacity-60" />
                      {new Date(report.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <Link
                      href={`/reports/${report.slug}`}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform"
                    >
                      Đọc báo cáo <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
