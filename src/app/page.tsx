import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { fetchReports } from '@/lib/reports-service';
import { CATEGORY_LABELS } from '@/types/reports';
import {
  Sparkles,
  BarChart3,
  Trophy,
  CandlestickChart,
  Lock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Target,
  Award,
  ChevronRight,
  ExternalLink,
  Phone,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export const metadata = {
  title: 'ValueX - Đối Tác Đồng Hành Đầu Tư Bền Vững & Tăng Trưởng Vượt Trội',
  description: 'Nền tảng tư vấn đầu tư chứng khoán và công cụ phân tích doanh nghiệp AI toàn diện. Đồng hành cùng nhà đầu tư kiến tạo tài sản bền vững.',
};

export default async function HomePage() {
  const reports = await fetchReports('all');
  const latestReports = reports.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                          */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-[var(--border-color)]">
          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
          <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Sparkles className="w-3.5 h-3.5" />
              Nền Tảng Tư Vấn & Phân Tích Chứng Khoán Chuyên Nghiệp
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-heading)] tracking-tight leading-[1.15] max-w-4xl mx-auto">
              Đồng Hành Đầu Tư,<br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 bg-clip-text text-transparent">
                Kiến Tạo Tài Sản Bền Vững
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-5 text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
              Tiếp cận kiến thức đúng, ấn phẩm báo cáo chuyên sâu và bộ công cụ định lượng AI từ đội ngũ tư vấn chuyên nghiệp hàng đầu <strong>Bà Rịa - Vũng Tàu</strong>.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5"
              >
                <BookOpen className="w-4 h-4" />
                Xem Báo Cáo Phân Tích
              </Link>
              <Link
                href="/analysis"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-[var(--surface)] hover:bg-slate-500/5 text-[var(--text-heading)] border border-[var(--border-color)] hover:border-emerald-500/50 transition-all transform hover:-translate-y-0.5"
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Công Cụ Phân Tích AI
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-md shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                Đăng Ký Gói VIP
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. CÔNG CỤ THỰC CHIẾN (3 CORE WEAPONS)                                   */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Công Nghệ & Định Lượng
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] mt-1.5">
              Bộ Ba Vũ Khí Phân Tích Thực Chiến
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Sự kết hợp hoàn hảo giữa cơ bản, kỹ thuật và mô hình trí tuệ nhân tạo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tool 1: AI Valuation */}
            <div className="group flex flex-col justify-between bg-[var(--surface)] border border-[var(--border-color)] hover:border-emerald-500/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-heading)] group-hover:text-emerald-600 transition-colors mb-2.5">
                  Phân Tích Doanh Nghiệp AI
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                  Mô hình chuẩn 4 phần A-B-C-D với dữ liệu tài chính Vietcap IQ API, định giá 3 kịch bản P/E, EPS Forward và 3 Scorecard chất lượng tăng trưởng.
                </p>
                <ul className="space-y-2 text-xs text-[var(--text-body)] mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Phân tích chuỗi giá trị & catalyst
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Tự động tính toán định giá 3 kịch bản
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Xuất báo cáo PDF chuẩn in ấn A4
                  </li>
                </ul>
              </div>
              <Link
                href="/analysis"
                className="inline-flex items-center justify-between font-bold text-xs text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform pt-4 border-t border-[var(--border-color)]"
              >
                <span>Vào phân tích ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tool 2: RS Screener */}
            <div className="group flex flex-col justify-between bg-[var(--surface)] border border-[var(--border-color)] hover:border-amber-500/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-amber-500/5 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-6">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-heading)] group-hover:text-amber-600 transition-colors mb-2.5">
                  Bộ Lọc & Xếp Hạng RS
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                  Chấm điểm sức mạnh giá tương đối (RS Rating) độc quyền theo phương pháp CANSLIM, phân loại dòng tiền theo ngành và phát hiện sớm cổ phiếu bứt phá.
                </p>
                <ul className="space-y-2 text-xs text-[var(--text-body)] mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Xếp hạng sức mạnh RS 100+ cổ phiếu
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Bộ lọc tài chính đa tiêu chí Tier 1
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Xem nhanh đồ thị & xuất dữ liệu
                  </li>
                </ul>
              </div>
              <Link
                href="/ranking"
                className="inline-flex items-center justify-between font-bold text-xs text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform pt-4 border-t border-[var(--border-color)]"
              >
                <span>Mở bộ lọc cổ phiếu</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tool 3: KLineCharts */}
            <div className="group flex flex-col justify-between bg-[var(--surface)] border border-[var(--border-color)] hover:border-indigo-500/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-6">
                  <CandlestickChart className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-heading)] group-hover:text-indigo-600 transition-colors mb-2.5">
                  Biểu Đồ Kỹ Thuật Chuyên Sâu
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                  Đồ thị nến Nhật KLineCharts tối ưu tốc độ, nhận diện cấu trúc đỉnh đáy SMC, tín hiệu đảo chiều CHoCH/BOS, bộ 10 công cụ vẽ và sự kiện cổ tức.
                </p>
                <ul className="space-y-2 text-xs text-[var(--text-body)] mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Đa khung thời gian Ngày, Tuần, Tháng
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Đánh dấu sự kiện cổ tức D/S trực quan
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Sidebar Market Watch VN-Index CANSLIM
                  </li>
                </ul>
              </div>
              <Link
                href="/chart"
                className="inline-flex items-center justify-between font-bold text-xs text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform pt-4 border-t border-[var(--border-color)]"
              >
                <span>Xem biểu đồ kỹ thuật</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. BÁO CÁO MỚI NHẤT (LATEST ADVISORY REPORTS)                             */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 bg-slate-500/5 border-y border-[var(--border-color)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Ấn Phẩm Độc Quyền
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] mt-1.5">
                  Báo Cáo Phân Tích Mới Nhất
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Đánh giá xu hướng vĩ mô, chiến lược phân bổ tài sản và nghiên cứu cơ hội đầu tư.
                </p>
              </div>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Xem tất cả báo cáo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestReports.map((report) => (
                <div
                  key={report.id}
                  className="group flex flex-col justify-between bg-[var(--surface)] rounded-2xl border border-[var(--border-color)] hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all overflow-hidden"
                >
                  <div>
                    {/* Header Banner */}
                    <div className="h-32 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-5 flex flex-col justify-between relative">
                      <div className="flex justify-between items-center z-10">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                          {CATEGORY_LABELS[report.category] || report.category}
                        </span>
                        {report.is_vip ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                            <Lock className="w-2.5 h-2.5" /> VIP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                            Cơ bản
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-white/90 z-10">
                        {report.cover_label || 'VALUEX REPORT'}
                      </span>
                    </div>

                    <div className="p-6">
                      <h3 className="text-base font-bold text-[var(--text-heading)] group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug mb-2">
                        {report.title}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                        {report.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{new Date(report.created_at).toLocaleDateString('vi-VN')}</span>
                    <Link
                      href={`/reports/${report.slug}`}
                      className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      Đọc tiếp →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. HIỆU SUẤT DANH MỤC THỰC CHIẾN (TRACK RECORD)                          */}
        {/* ========================================================================= */}
        <section id="portfolio-performance" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Chứng Minh Năng Lực
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] mt-1.5">
              Hiệu Suất Danh Mục Khuyến Nghị
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Số liệu kiểm toán thực tế mức sinh lời danh mục khuyến nghị của ValueX vượt trội so với chỉ số VN-Index.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-500/5 border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Năm</th>
                    <th className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">Danh Mục ValueX</th>
                    <th className="px-6 py-4 font-semibold">Chỉ Số VN-Index</th>
                    <th className="px-6 py-4 font-semibold text-right">Mức Sinh Lời Vượt Trội</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-heading)]">2024</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">+28.5%</td>
                    <td className="px-6 py-4 font-medium text-[var(--text-muted)]">+10.2%</td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400 text-right">+18.3%</td>
                  </tr>
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-heading)]">2025</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">+34.2%</td>
                    <td className="px-6 py-4 font-medium text-[var(--text-muted)]">+12.5%</td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400 text-right">+21.7%</td>
                  </tr>
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-heading)]">2026 (YTD)</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">+18.7%</td>
                    <td className="px-6 py-4 font-medium text-[var(--text-muted)]">+5.1%</td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400 text-right">+13.6%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-emerald-500/5 border-t border-[var(--border-color)] text-center text-xs text-[var(--text-muted)]">
              Kỷ luật cắt lỗ nghiêm ngặt $\le 7\%$ và nắm giữ siêu cổ phiếu tăng trưởng giúp bảo vệ thành quả và nhân đôi tài sản.
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. VỀ CHÚNG TÔI (ABOUT US & CORE VALUES)                                 */}
        {/* ========================================================================= */}
        <section id="about-us" className="py-16 md:py-24 bg-slate-500/5 border-t border-[var(--border-color)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Giá Trị Cốt Lõi
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] mt-1.5">
                Chúng Tôi Là ValueX
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Đội ngũ môi giới và chuyên viên phân tích tài chính tận tâm vì sự an toàn và tăng trưởng tài sản của quý khách hàng.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Tầm nhìn */}
              <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl p-8 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4">
                  👁️
                </div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] mb-2">Tầm Nhìn</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Trở thành đội ngũ tư vấn đầu tư uy tín, chuyên nghiệp hàng đầu <strong>Bà Rịa - Vũng Tàu</strong> và vươn tầm toàn quốc. Kiến tạo cộng đồng nhà đầu tư thông thái và vững vàng tài chính.
                </p>
              </div>

              {/* Sứ mệnh */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-8 shadow-lg shadow-emerald-600/20">
                <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-lg mb-4">
                  🎯
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Sứ Mệnh</h3>
                <p className="text-xs text-white/90 leading-relaxed">
                  Giúp nhà đầu tư tiếp cận kiến thức đúng, thông tin đáng tin cậy và cơ hội đầu tư tiềm năng; đồng hành cùng khách hàng trong quản trị rủi ro và xây dựng tài sản bền vững theo năm tháng.
                </p>
              </div>

              {/* Giá trị cốt lõi */}
              <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl p-8 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-lg mb-4">
                  💎
                </div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] mb-2">Giá Trị Cốt Lõi</h3>
                <ul className="space-y-1.5 text-xs text-[var(--text-body)]">
                  <li><strong>• Chính trực:</strong> Đặt đạo đức nghề nghiệp lên hàng đầu.</li>
                  <li><strong>• Chuyên môn:</strong> Năng lực phân tích sắc bén, sâu rộng.</li>
                  <li><strong>• Kỷ luật:</strong> Tuân thủ phương pháp và kiểm soát rủi ro.</li>
                  <li><strong>• Đồng hành:</strong> Song hành cùng khách hàng trên mọi chặng đường.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. CALL TO ACTION - KẾT NỐI BROKER                                       */}
        {/* ========================================================================= */}
        <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Sẵn Sàng Bứt Phá Lợi Nhuận Cùng ValueX?
              </h2>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Đăng ký tài khoản VIP ngay hôm nay để nhận báo cáo khuyến nghị điểm mua/bán chi tiết, mở khóa toàn bộ công cụ AI Valuation và được chuyên viên tư vấn trực tiếp 1-1.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/profile"
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all"
                >
                  Yêu Cầu Nâng Cấp VIP Ngay
                </Link>
                <a
                  href="https://zalo.me/0901234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  Hotline / Zalo: 090 123 4567
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
