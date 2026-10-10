'use client';

import React, { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle, XCircle, ArrowUpDown, Phone, Mail, Shield, Sparkles } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, reqsRes] = await Promise.all([
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/vip-requests').then((r) => r.json()),
      ]);

      if (usersRes.users) setUsers(usersRes.users);
      if (reqsRes.requests) setRequests(reqsRes.requests.filter((r: any) => r.status === 'pending'));
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu người dùng.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (reqId: string) => {
    setActionLoading(reqId);
    try {
      const res = await fetch('/api/admin/vip-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqId, action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadData();
    } catch (err: any) {
      alert('Lỗi phê duyệt: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reqId: string) => {
    setActionLoading(reqId);
    try {
      const res = await fetch('/api/admin/vip-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqId, action: 'reject' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadData();
    } catch (err: any) {
      alert('Lỗi từ chối: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'member_vip' ? 'member_free' : 'member_vip';
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadData();
    } catch (err: any) {
      alert('Lỗi đổi vai trò: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">Đang tải danh sách khách hàng...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)]">Quản Lý Khách Hàng</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Duyệt yêu cầu nâng cấp VIP và phân bổ vai trò hội viên trong hệ thống ValueX.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm mb-6">
          {error}
        </div>
      )}

      {/* 1. Yêu cầu VIP chờ duyệt */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-[var(--text-heading)]">
            Yêu Cầu Nâng Cấp VIP Chờ Duyệt ({requests.length})
          </h2>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-muted)]">
            Hiện không có yêu cầu nâng cấp VIP nào đang chờ xử lý.
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-500/5 border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Khách hàng</th>
                    <th className="px-5 py-3 font-semibold">SĐT Zalo</th>
                    <th className="px-5 py-3 font-semibold">Ghi chú</th>
                    <th className="px-5 py-3 font-semibold">Thời gian</th>
                    <th className="px-5 py-3 font-semibold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[var(--text-heading)]">{req.userName || 'Thành viên'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{req.userEmail}</div>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {req.phoneContact}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--text-body)] max-w-xs truncate">
                        {req.note || '—'}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                        >
                          Duyệt VIP
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoading === req.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-500/10 hover:bg-red-500/20 text-red-600 transition-all"
                        >
                          Từ chối
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 2. Danh sách toàn bộ khách hàng */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-[var(--text-heading)]">
            Danh Sách Người Dùng ({users.length})
          </h2>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-500/5 border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tài khoản</th>
                  <th className="px-5 py-3 font-semibold">Vai trò</th>
                  <th className="px-5 py-3 font-semibold">Ngày tham gia</th>
                  <th className="px-5 py-3 font-semibold text-right">Điều chỉnh quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-[var(--text-heading)]">{u.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      {u.role === 'admin' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          ADMIN
                        </span>
                      ) : u.role === 'member_vip' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-1 w-fit">
                          <Sparkles className="w-3 h-3" /> VIP
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
                          Cơ bản
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          disabled={actionLoading === u.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface)] border border-[var(--border-color)] hover:border-emerald-500/40 text-[var(--text-heading)] transition-all"
                        >
                          <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                          {u.role === 'member_vip' ? 'Hạ xuống Free' : 'Nâng cấp VIP'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
