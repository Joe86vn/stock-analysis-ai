'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SafeUser, UserRole, ROLE_LABELS } from '@/types/auth';
import { ShieldCheck, UserPlus, RefreshCw, AlertCircle, CheckCircle2, User, Key, Shield } from 'lucide-react';

export default function AdminPage() {
    const [users, setUsers] = useState<SafeUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // New user form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('member_vip');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setUsers(data.data);
            } else {
                setError(data.error || 'Không thể tải danh sách người dùng');
            }
        } catch (err) {
            setError('Lỗi kết nối máy chủ');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleRoleChange = async (userId: string, targetRole: UserRole) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: targetRole }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Đã cập nhật vai trò người dùng thành công');
                setUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u))
                );
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || 'Cập nhật vai trò thất bại');
                setTimeout(() => setError(null), 3000);
            }
        } catch {
            setError('Lỗi kết nối khi cập nhật vai trò');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    name: newName,
                    password: newPassword,
                    role: newRole,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Đã tạo tài khoản mới thành công');
                setShowAddForm(false);
                setNewEmail('');
                setNewName('');
                setNewPassword('');
                loadUsers();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || 'Tạo tài khoản thất bại');
            }
        } catch {
            setError('Lỗi kết nối máy chủ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#0B0F19]">
            <Header />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center space-x-2.5">
                            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                Quản Trị Người Dùng & Phân Quyền
                            </h1>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Phân bổ vai trò (Admin, VIP, Free) và kiểm soát quyền hạn toàn hệ thống ValueX
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={loadUsers}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            title="Làm mới"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>{showAddForm ? 'Đóng form' : 'Thêm người dùng'}</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {showAddForm && (
                    <div className="mb-6 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in duration-200">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                            <UserPlus className="w-4 h-4 text-emerald-500" />
                            <span>Tạo tài khoản người dùng mới</span>
                        </h3>
                        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    Họ tên
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Tên hiển thị"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    Mật khẩu
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mật khẩu"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    Vai trò (Role)
                                </label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    <option value="member_free">Free Member</option>
                                    <option value="member_vip">VIP Member</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 md:col-span-4 flex justify-end space-x-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                >
                                    {isSubmitting ? 'Đang tạo...' : 'Lưu tài khoản'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* User list table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                                    <th className="py-3 px-4">Người dùng</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Vai trò hiện tại</th>
                                    <th className="py-3 px-4">Ngày tạo</th>
                                    <th className="py-3 px-4 text-right">Thao tác phân quyền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                {users.map((u) => {
                                    const roleMeta = ROLE_LABELS[u.role] || ROLE_LABELS.member_free;
                                    return (
                                        <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center space-x-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300">
                                                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{u.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono">{u.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${roleMeta.badgeClass}`}>
                                                    {roleMeta.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 text-[11px]">
                                                {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                                    className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                >
                                                    <option value="member_free">Free Member</option>
                                                    <option value="member_vip">VIP Member</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
