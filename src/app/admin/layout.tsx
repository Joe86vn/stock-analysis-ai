import React from 'react';
import Link from 'next/link';
import { FileText, Users, Home, Shield, Sparkles } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[var(--surface)] border-b md:border-b-0 md:border-r border-[var(--border-color)] p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" /> Broker Board
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-heading)]">Admin Portal</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Quản trị nội dung & Hội viên</p>
          </div>

          {/* Nav links */}
          <nav className="space-y-1.5">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-body)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-600" />
              Tổng quan Board
            </Link>
            <Link
              href="/admin/posts"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-body)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              Quản lý bài viết CMS
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-body)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
            >
              <Users className="w-4 h-4 text-purple-600" />
              Quản lý khách hàng
            </Link>
          </nav>
        </div>

        {/* Return Home */}
        <div className="pt-6 border-t border-[var(--border-color)] mt-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
          >
            <Home className="w-4 h-4" /> Quay lại Trang chủ ValueX
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
