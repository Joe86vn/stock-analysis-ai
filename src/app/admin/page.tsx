import React from 'react';
import Link from 'next/link';
import { FileText, Users, Clock, ShieldCheck, Sparkles, ArrowRight, BarChart3 } from 'lucide-react';
import { fetchReports } from '@/lib/reports-service';
import { getAllVipRequests } from '@/lib/vip-requests-store';
import { getSafeUsers } from '@/lib/users-store';

export const metadata = {
  title: 'Admin Dashboard | ValueX Broker Board',
};

export default async function AdminDashboardPage() {
  const [reports, vipRequests, users] = await Promise.all([
    fetchReports('all'),
    Promise.resolve(getAllVipRequests()),
    Promise.resolve(getSafeUsers()),
  ]);

  const pendingRequests = vipRequests.filter((r) => r.status === 'pending');
  const vipUsers = users.filter((u) => u.role === 'member_vip');

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Bảng Điều Khiển Quản Trị Hệ Thống
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--text-heading)]">Tổng Quan Broker Board</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Theo dõi các chỉ số hoạt động, ấn phẩm tư vấn và tiến độ phê duyệt hội viên VIP.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Metric 1 */}
        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Tổng Khách Hàng</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-heading)]">{users.length}</div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Đã đăng ký tài khoản</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-500 uppercase">Hội Viên VIP</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-500">{vipUsers.length}</div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Đang kích hoạt gói VIP</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-rose-500 uppercase">Chờ Duyệt VIP</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-500">{pendingRequests.length}</div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Yêu cầu cần xử lý ngay</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-emerald-600 uppercase">Ấn Phẩm Báo Cáo</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{reports.length}</div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Đã xuất bản trên CMS</p>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Panel 1 */}
        <div className="bg-[var(--surface)] border border-[var(--border-color)] hover:border-emerald-500/40 rounded-3xl p-8 shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-heading)] mb-2">Quản Lý Ấn Phẩm & Báo Cáo CMS</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
              Đăng tải báo cáo chiến lược, phân tích cổ phiếu, đính kèm file PDF và kích hoạt tính năng Teaser Paywall cho thành viên VIP.
            </p>
          </div>
          <Link
            href="/admin/posts"
            className="inline-flex items-center justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400 pt-4 border-t border-[var(--border-color)] hover:translate-x-1 transition-transform"
          >
            <span>Mở CMS Quản lý bài viết</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Panel 2 */}
        <div className="bg-[var(--surface)] border border-[var(--border-color)] hover:border-purple-500/40 rounded-3xl p-8 shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-heading)] mb-2">Quản Lý Khách Hàng & Duyệt VIP</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
              Xem danh sách yêu cầu đăng ký VIP kèm số điện thoại Zalo, duyệt quyền VIP 1-click và điều chỉnh vai trò hội viên.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center justify-between font-bold text-sm text-purple-600 dark:text-purple-400 pt-4 border-t border-[var(--border-color)] hover:translate-x-1 transition-transform"
          >
            <span>Mở Quản lý khách hàng</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
