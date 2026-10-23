'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Key,
  Check,
  Info,
  Layers,
  ChevronDown,
  Loader2,
  X,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { FeatureKey, FeatureCategory, FeatureDefinition, RoleDefinition } from '@/types/auth';

const BADGE_PRESETS = [
  { label: 'Xanh Lá (Emerald)', badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', color: '#10b981' },
  { label: 'Vàng Hổ Phách (Amber)', badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', color: '#f59e0b' },
  { label: 'Xanh Dương (Blue)', badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', color: '#3b82f6' },
  { label: 'Tím Quản Trị (Purple)', badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30', color: '#a855f7' },
  { label: 'Đỏ Hồng (Rose)', badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', color: '#f43f5e' },
  { label: 'Xám Cơ Bản (Slate)', badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', color: '#64748b' },
  { label: 'Cam Năng Động (Orange)', badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', color: '#f97316' },
  { label: 'Xanh Cyan (Teal)', badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30', color: '#14b8a6' },
];

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [featureRegistry, setFeatureRegistry] = useState<FeatureDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal State for Role Editor
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormId, setRoleFormId] = useState('');
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormColor, setRoleFormColor] = useState('#10b981');
  const [roleFormBadge, setRoleFormBadge] = useState(BADGE_PRESETS[0].badgeClass);
  const [roleFormPermissions, setRoleFormPermissions] = useState<FeatureKey[]>([]);
  const [roleFormSubmitting, setRoleFormSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, reqsRes, rolesRes] = await Promise.all([
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/vip-requests').then((r) => r.json()),
        fetch('/api/admin/roles').then((r) => r.json()),
      ]);

      if (usersRes.users) setUsers(usersRes.users);
      if (reqsRes.requests) setRequests(reqsRes.requests.filter((r: any) => r.status === 'pending'));
      if (rolesRes.roles) setRoles(rolesRes.roles);
      if (rolesRes.featureRegistry) setFeatureRegistry(rolesRes.featureRegistry);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu người dùng.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Map Category to Features
  const featuresByCategory = useMemo(() => {
    const groups: Record<FeatureCategory, { label: string; features: FeatureDefinition[] }> = {
      analysis: { label: '📊 Phân Tích Cơ Bản & Định Giá', features: [] },
      ranking: { label: '🔍 Bộ Lọc & Xếp Hạng RS', features: [] },
      chart: { label: '📈 Biểu Đồ Kỹ Thuật', features: [] },
      market_earnings: { label: '🌐 Thị Trường & BCTC Mới Nhất', features: [] },
      reports: { label: '📑 Ấn Phẩm & Báo Cáo Chiến Lược', features: [] },
      admin: { label: '⚙️ Quản Trị Hệ Thống', features: [] },
    };

    featureRegistry.forEach((feat) => {
      if (groups[feat.category]) {
        groups[feat.category].features.push(feat);
      }
    });

    return groups;
  }, [featureRegistry]);

  // Handle VIP Approval
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
      showToast('Đã phê duyệt yêu cầu VIP thành công!');
      await loadData();
    } catch (err: any) {
      alert('Lỗi phê duyệt: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle VIP Rejection
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
      showToast('Đã từ chối yêu cầu VIP.');
      await loadData();
    } catch (err: any) {
      alert('Lỗi từ chối: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Role Change for User
  const handleAssignRole = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Đã cập nhật vai trò người dùng thành công!');
      await loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật vai trò: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Open Create Role Modal
  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleFormId('');
    setRoleFormName('');
    setRoleFormDesc('');
    setRoleFormColor('#10b981');
    setRoleFormBadge(BADGE_PRESETS[0].badgeClass);
    // Mặc định chọn các tính năng VIP cơ bản
    setRoleFormPermissions(
      featureRegistry.filter((f) => !f.key.startsWith('admin_')).map((f) => f.key)
    );
    setIsRoleModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEditRole = (role: RoleDefinition) => {
    setEditingRoleId(role.id);
    setRoleFormId(role.id);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description || '');
    setRoleFormColor(role.color || '#10b981');
    setRoleFormBadge(role.badgeClass || BADGE_PRESETS[0].badgeClass);
    setRoleFormPermissions(role.permissions || []);
    setIsRoleModalOpen(true);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (key: FeatureKey) => {
    setRoleFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Toggle all permissions in a category
  const handleToggleCategory = (categoryKey: FeatureCategory, shouldSelectAll: boolean) => {
    const categoryFeatures = featuresByCategory[categoryKey]?.features.map((f) => f.key) || [];
    setRoleFormPermissions((prev) => {
      if (shouldSelectAll) {
        return Array.from(new Set([...prev, ...categoryFeatures]));
      } else {
        return prev.filter((key) => !categoryFeatures.includes(key));
      }
    });
  };

  // Submit Role Form
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormId.trim() || !roleFormName.trim()) {
      alert('Vui lòng nhập đầy đủ Mã vai trò và Tên vai trò');
      return;
    }

    setRoleFormSubmitting(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roleFormId.trim().toLowerCase(),
          name: roleFormName.trim(),
          description: roleFormDesc.trim(),
          color: roleFormColor,
          badgeClass: roleFormBadge,
          permissions: roleFormPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(editingRoleId ? 'Đã lưu cấu hình vai trò thành công!' : 'Đã tạo vai trò mới thành công!');
      setIsRoleModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Lỗi lưu vai trò: ' + err.message);
    } finally {
      setRoleFormSubmitting(false);
    }
  };

  // Delete Role
  const handleDeleteRole = async (role: RoleDefinition) => {
    if (role.isSystem) {
      alert('Không thể xóa vai trò mặc định của hệ thống.');
      return;
    }

    const confirm = window.confirm(
      `Bạn có chắc chắn muốn xóa vai trò "${role.name}" (${role.id})?\nCác thành viên đang giữ vai trò này sẽ được tự động chuyển về vai trò "Thành Viên Cơ Bản".`
    );
    if (!confirm) return;

    setActionLoading(`del-${role.id}`);
    try {
      const res = await fetch(`/api/admin/roles?id=${encodeURIComponent(role.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Đã xóa vai trò "${role.name}" thành công.`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi xóa vai trò: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper get role info
  const getRoleMeta = (roleId: string) => {
    const found = roles.find((r) => r.id === roleId);
    if (found) return found;
    return {
      id: roleId,
      name: roleId,
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      color: '#64748b',
      permissions: [],
    };
  };

  if (loading && users.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="mt-4 text-xs font-medium text-[var(--text-muted)]">Đang tải trung tâm phân quyền...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-lg flex items-center space-x-2 animate-in slide-in-from-bottom">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Quản Trị Người Dùng & Phân Quyền Vai Trò
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)]">Trung Tâm Phân Quyền ValueX</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Quản lý tài khoản hội viên, duyệt yêu cầu VIP và cấu hình ma trận phân quyền chi tiết cho từng vai trò.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm mb-6 flex items-center gap-2">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-[var(--border-color)] mb-8 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Người Dùng ({users.length})</span>
          {requests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {requests.length} chờ duyệt
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Cấu Hình Phân Quyền Vai Trò ({roles.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DANH SÁCH NGƯỜI DÙNG & YÊU CẦU VIP                      */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-10">
          {/* 1. Yêu cầu VIP chờ duyệt */}
          <section>
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
                            {req.note || '-'}
                          </td>
                          <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                            {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading === req.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                            >
                              Duyệt VIP
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={actionLoading === req.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-500/10 hover:bg-red-500/20 text-red-600 transition-all cursor-pointer"
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

          {/* 2. Danh sách toàn bộ thành viên */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-[var(--text-heading)]">
                  Danh Sách Tài Khoản Thành Viên ({users.length})
                </h2>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-500/5 border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] uppercase">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Tài khoản</th>
                      <th className="px-5 py-3 font-semibold">Vai trò hiện tại</th>
                      <th className="px-5 py-3 font-semibold">Ngày tham gia</th>
                      <th className="px-5 py-3 font-semibold text-right">Phân bổ vai trò</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {users.map((u) => {
                      const meta = getRoleMeta(u.role);
                      return (
                        <tr key={u.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-bold text-[var(--text-heading)]">{u.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${meta.badgeClass}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: meta.color || '#10b981' }}
                              />
                              {meta.name}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                            {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {actionLoading === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                              ) : (
                                <select
                                  value={u.role}
                                  onChange={(e) => handleAssignRole(u.id, e.target.value)}
                                  className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-heading)] hover:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition"
                                >
                                  {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CẤU HÌNH PHÂN QUYỀN VAI TRÒ (RBAC MATRIX)                */}
      {/* ============================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div>
              <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                Ma Trận Phân Quyền Chi Tiết (Role-Based Access Control)
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Tạo các vai trò tùy chỉnh và thiết lập checklist các chức năng mà vai trò đó được phép sử dụng.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateRole}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Vai Trò Mới</span>
            </button>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => {
              const memberCount = users.filter((u) => u.role === role.id).length;
              const permCount = role.permissions?.length || 0;
              const totalPerms = featureRegistry.length;

              return (
                <div
                  key={role.id}
                  className="bg-[var(--surface)] border border-[var(--border-color)] hover:border-emerald-500/40 rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Role Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${role.badgeClass}`}>
                          {role.name}
                        </span>
                        <div className="text-xs font-mono text-[var(--text-muted)] mt-1">
                          ID: <span className="text-[var(--text-body)] font-semibold">{role.id}</span>
                        </div>
                      </div>
                      {role.isSystem && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/10 text-[var(--text-muted)]">
                          Hệ thống
                        </span>
                      )}
                    </div>

                    {/* Role Description */}
                    <p className="text-xs text-[var(--text-body)] leading-relaxed mb-4 min-h-[36px]">
                      {role.description || 'Chưa có mô tả cho vai trò này.'}
                    </p>

                    {/* Meta stats */}
                    <div className="space-y-2 py-3 border-t border-b border-[var(--border-color)] text-xs mb-4">
                      <div className="flex justify-between items-center text-[var(--text-muted)]">
                        <span>Số lượng thành viên:</span>
                        <span className="font-bold text-[var(--text-heading)]">{memberCount} người dùng</span>
                      </div>
                      <div className="flex justify-between items-center text-[var(--text-muted)]">
                        <span>Quyền hạn kích hoạt:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {permCount} / {totalPerms} chức năng
                        </span>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full h-1.5 bg-slate-500/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.round((permCount / (totalPerms || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRole(role)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Sửa Phân Quyền</span>
                    </button>

                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        disabled={actionLoading === `del-${role.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CẤU HÌNH PHÂN QUYỀN VAI TRÒ (CHECKLIST MATRIX)           */}
      {/* ============================================================== */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-heading)]">
                    {editingRoleId ? `Chỉnh Sửa Phân Quyền Vai Trò: ${roleFormName}` : 'Tạo Vai Trò Mới & Phân Quyền'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Tích chọn các chức năng trong checklist bên dưới để cấp quyền cho vai trò này.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-heading)] rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Role Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-500/5 border border-[var(--border-color)]">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">
                    Mã Vai Trò (ID / Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRoleId}
                    value={roleFormId}
                    onChange={(e) => setRoleFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="VD: broker, analyst, pro_investor"
                    className="w-full text-xs font-mono py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Chữ thường không dấu, dùng dấu gạch dưới _</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">
                    Tên Hiển Thị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleFormName}
                    onChange={(e) => setRoleFormName(e.target.value)}
                    placeholder="VD: Môi Giới Chứng Khoán"
                    className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">Mô Tả Vai Trò</label>
                  <input
                    type="text"
                    value={roleFormDesc}
                    onChange={(e) => setRoleFormDesc(e.target.value)}
                    placeholder="VD: Dành cho chuyên viên môi giới hỗ trợ tư vấn và viết bài nhận định"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Badge Color Preset Selection */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-heading)] mb-2">Giao Diện Huy Hiệu</label>
                  <div className="flex flex-wrap gap-2">
                    {BADGE_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRoleFormBadge(p.badgeClass);
                          setRoleFormColor(p.color);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${p.badgeClass} ${
                          roleFormBadge === p.badgeClass ? 'ring-2 ring-emerald-500 ring-offset-2' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span>{p.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Permission Matrix Checklist */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-heading)] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Checklist Danh Mục Phân Quyền Chi Tiết ({roleFormPermissions.length}/{featureRegistry.length})
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Tích chọn từng quyền hạn cụ thể cho vai trò này
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoleFormPermissions(featureRegistry.map((f) => f.key))}
                      className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-[var(--border-color)]">•</span>
                    <button
                      type="button"
                      onClick={() => setRoleFormPermissions([])}
                      className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                {/* Category Groups */}
                <div className="space-y-6">
                  {Object.entries(featuresByCategory).map(([catKey, catData]) => {
                    const allCatSelected = catData.features.every((f) => roleFormPermissions.includes(f.key));
                    const someCatSelected = catData.features.some((f) => roleFormPermissions.includes(f.key));

                    return (
                      <div
                        key={catKey}
                        className="border border-[var(--border-color)] rounded-2xl p-5 bg-[var(--surface)] shadow-xs"
                      >
                        {/* Group Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                          <span className="font-bold text-xs sm:text-sm text-[var(--text-heading)]">
                            {catData.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(catKey as FeatureCategory, !allCatSelected)}
                              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              {allCatSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                            </button>
                          </div>
                        </div>

                        {/* Feature Items Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {catData.features.map((feat) => {
                            const isChecked = roleFormPermissions.includes(feat.key);
                            return (
                              <label
                                key={feat.key}
                                onClick={() => handleTogglePermission(feat.key)}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                                  isChecked
                                    ? 'border-emerald-500/40 bg-emerald-500/5 text-[var(--text-heading)]'
                                    : 'border-[var(--border-color)] hover:border-slate-400/40 bg-transparent text-[var(--text-muted)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // Handled by container onClick
                                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                                />
                                <div className="space-y-0.5">
                                  <div className="font-bold text-xs text-[var(--text-heading)]">
                                    {feat.label}
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                                    {feat.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={roleFormSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {roleFormSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu Cấu Hình Vai Trò</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
