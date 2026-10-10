'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, CheckCircle, Clock, XCircle, Phone, MessageSquare, ArrowRight, UserCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [phoneContact, setPhoneContact] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vipRequest, setVipRequest] = useState<any>(null);
  const [loadingReq, setLoadingReq] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
      return;
    }

    if (session?.user) {
      fetch('/api/vip-request')
        .then((res) => res.json())
        .then((data) => {
          if (data.request) {
            setVipRequest(data.request);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingReq(false));
    }
  }, [status, session, router]);

  const handleRequestVip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/vip-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneContact, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi gửi yêu cầu.');
      }
      setVipRequest(data.request);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loadingReq) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-[var(--text-muted)]">Đang tải thông tin tài khoản...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const user = session?.user;
  const role = user?.role;
  const isVip = role === 'member_vip';
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--text-heading)]">Hồ Sơ Thành Viên</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Quản lý thông tin tài khoản và quyền hạn truy cập dịch vụ trên nền tảng ValueX.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Thông tin tài khoản */}
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-[var(--border-color)] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-heading)]">{user?.name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
                  </div>
                </div>
                {isAdmin ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 uppercase">
                    Admin
                  </span>
                ) : isVip ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> VIP
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
                    Thường
                  </span>
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)]">Mã định danh:</span>
                  <span className="font-mono text-xs text-[var(--text-heading)]">{user?.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)]">Vai trò hiện tại:</span>
                  <span className="font-semibold text-[var(--text-heading)]">
                    {isAdmin ? 'Quản trị viên toàn hệ thống' : isVip ? 'Hội viên VIP Đầu tư' : 'Thành viên Cơ bản (Free)'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[var(--text-muted)]">Quyền hạn:</span>
                  <span className="text-xs text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {isAdmin ? 'Toàn quyền CMS & Phân tích' : isVip ? 'Trọn gói AI, Chart & Báo cáo' : 'Bảng xếp hạng & Biểu đồ mặc định'}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                <a
                  href="/admin/posts"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all"
                >
                  Truy cập Quản trị Admin <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Card 2: Quyền VIP / Form Nâng cấp */}
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-sm">
            {isVip || isAdmin ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-heading)] mb-2">Tài Khoản Đang Kích Hoạt Quyền VIP</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                  Chúc mừng bạn! Bạn đang sở hữu đặc quyền truy cập trọn vẹn toàn bộ các Báo cáo chiến lược chuyên sâu, công cụ sinh báo cáo AI Valuation và toàn quyền tùy biến đồ thị kỹ thuật.
                </p>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Cần hỗ trợ tư vấn 1-1 chuyên sâu? Liên hệ Broker qua Zalo: <strong>090 123 4567</strong>
                </div>
              </div>
            ) : vipRequest ? (
              <div>
                <h3 className="text-xl font-bold text-[var(--text-heading)] mb-2">Trạng Thái Yêu Cầu Nâng Cấp VIP</h3>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  Bạn đã gửi thông tin đăng ký nâng cấp tài khoản VIP đến đội ngũ chuyên viên ValueX.
                </p>

                {vipRequest.status === 'pending' && (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mb-6">
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                      <Clock className="w-4 h-4" /> Đang chờ chuyên viên phê duyệt
                    </div>
                    <p className="text-xs text-[var(--text-body)] mt-2 leading-relaxed">
                      SĐT liên hệ: <strong>{vipRequest.phoneContact}</strong>
                      <br />
                      Ngày gửi: {new Date(vipRequest.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                )}

                {vipRequest.status === 'approved' && (
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 mb-6">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle className="w-4 h-4" /> Yêu cầu đã được phê duyệt thành công!
                    </div>
                  </div>
                )}

                {vipRequest.status === 'rejected' && (
                  <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 mb-6">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <XCircle className="w-4 h-4" /> Yêu cầu chưa được duyệt. Vui lòng liên hệ Hotline.
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-slate-500/5 border border-[var(--border-color)] text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-3">
                    Để được duyệt tài khoản nhanh trong 5 phút, bạn có thể nhắn tin trực tiếp qua Zalo:
                  </p>
                  <a
                    href="https://zalo.me/0901234567"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat Zalo Broker: 090 123 4567
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-[var(--text-heading)] mb-2">Đăng Ký Nâng Cấp VIP</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
                  Vui lòng cung cấp số điện thoại Zalo và lời nhắn (VD: ID tài khoản VPS để gắn môi giới). Đội ngũ ValueX sẽ hỗ trợ duyệt quyền VIP nhanh chóng.
                </p>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs mb-4">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleRequestVip} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">
                      Số điện thoại Zalo liên hệ:
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneContact}
                      onChange={(e) => setPhoneContact(e.target.value)}
                      placeholder="VD: 0901234567"
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">
                      Ghi chú / Mã ID môi giới VPS (Không bắt buộc):
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Đã mở tài khoản chứng khoán VPS..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu nâng cấp VIP'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
