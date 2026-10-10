import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchReportDetail } from '@/lib/reports-service';
import { CATEGORY_LABELS } from '@/types/reports';
import { auth } from '@/lib/auth';
import { Lock, Calendar, User, ArrowLeft, Download, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const report = await fetchReportDetail(slug);

  if (!report) {
    return {
      title: 'Không Tìm Thấy Báo Cáo | ValueX',
    };
  }

  return {
    title: `${report.is_vip ? '🔒 VIP | ' : ''}${report.title} | ValueX`,
    description: report.excerpt,
    openGraph: {
      title: report.title,
      description: report.excerpt,
      type: 'article',
      publishedTime: report.created_at,
    },
  };
}

export default async function ReportDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const report = await fetchReportDetail(slug);

  if (!report) {
    notFound();
  }

  // Check user session & role via ValueX Auth
  const session = await auth();
  const user = session?.user;
  const role = user?.role;
  const isVipOrAdmin = role === 'admin' || role === 'member_vip';
  const hasAccess = !report.is_vip || isVipOrAdmin;

  // Server-side truncation to protect VIP content
  let displayContent = report.content;
  if (report.is_vip && !hasAccess) {
    const paragraphs = report.content.split('</p>');
    displayContent = paragraphs.slice(0, 2).join('</p>') + '</p>';
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách báo cáo
        </Link>

        {/* Article Card */}
        <article className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-semibold">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
              {CATEGORY_LABELS[report.category] || report.category}
            </span>
            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(report.created_at).toLocaleDateString('vi-VN')}
            </span>
            {report.is_vip && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                <Lock className="w-3 h-3" /> VIP ONLY
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-heading)] leading-tight tracking-tight mb-4">
            {report.title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-2 pb-6 border-b border-[var(--border-color)] text-sm text-[var(--text-muted)] mb-6">
            <User className="w-4 h-4 opacity-70" />
            <span>Tác giả: <strong className="text-[var(--text-heading)]">{report.author || 'Đội ngũ Phân tích ValueX'}</strong></span>
          </div>

          {/* Excerpt Lead Box */}
          <div className="p-4 rounded-xl bg-slate-500/5 border border-slate-500/10 text-sm sm:text-base text-[var(--text-body)] leading-relaxed italic mb-8">
            <strong className="not-italic text-emerald-600 dark:text-emerald-400 font-semibold">Tóm tắt: </strong>
            {report.excerpt}
          </div>

          {/* Body Content */}
          <div
            className={`prose dark:prose-invert max-w-none text-[var(--text-body)] leading-relaxed space-y-4 ${
              report.is_vip && !hasAccess ? 'relative' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />

          {/* Paywall Overlay for Guest / Free Members on VIP Post */}
          {report.is_vip && !hasAccess && (
            <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
              <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-slate-900/10 border border-amber-500/30 text-center relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-heading)] mb-2">
                  Nội Dung Này Dành Riêng Cho Thành Viên VIP
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto mb-6 leading-relaxed">
                  Để đọc trọn vẹn báo cáo phân tích chuyên sâu chi tiết, xem đầy đủ khuyến nghị điểm mua/bán và tải xuống file tài liệu PDF, vui lòng nâng cấp tài khoản VIP của bạn.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                  {user ? (
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Yêu cầu nâng cấp VIP
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/register"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all"
                      >
                        Đăng ký tài khoản mới
                      </Link>
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[var(--surface)] text-[var(--text-heading)] border border-[var(--border-color)] hover:border-emerald-500/50 transition-all"
                      >
                        Đăng nhập ngay
                      </Link>
                    </>
                  )}
                </div>

                <div className="text-xs text-[var(--text-muted)] border-t border-amber-500/20 pt-4">
                  Liên hệ Hotline/Zalo Hỗ Trợ: <strong className="text-[var(--text-heading)]">090 123 4567</strong> (Duyệt nhanh trong 5 phút)
                </div>
              </div>
            </div>
          )}

          {/* PDF Download Section for Authorized Users */}
          {report.pdf_url && hasAccess && (
            <div className="mt-10 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-[var(--text-heading)] flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Tài liệu đính kèm trọn vẹn theo bài viết
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Bản PDF phân tích chi tiết chất lượng cao được chuẩn hóa phục vụ in ấn hoặc đọc ngoại tuyến.
                </p>
              </div>
              <a
                href={`/api/download?file=${encodeURIComponent(report.pdf_url)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all shrink-0"
              >
                <Download className="w-4 h-4" />
                Tải Báo Cáo Chi Tiết (PDF)
              </a>
            </div>
          )}
        </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
