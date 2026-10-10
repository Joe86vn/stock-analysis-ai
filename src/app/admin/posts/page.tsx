'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, ExternalLink, ArrowLeft, Lock, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { CATEGORY_LABELS } from '@/types/reports';

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('strategy');
  const [isVip, setIsVip] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadPosts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/posts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải bài viết.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  // Tự động sinh slug từ tiêu đề
  useEffect(() => {
    if (viewState === 'create') {
      const generatedSlug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generatedSlug);
    }
  }, [title, viewState]);

  const handleEditClick = (post: any) => {
    setCurrentPostId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContent(post.content || '');
    setCategory(post.category);
    setIsVip(post.is_vip);
    setPdfUrl(post.pdf_url || '');
    setViewState('edit');
  };

  const handleCreateClick = () => {
    setCurrentPostId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCategory('strategy');
    setIsVip(false);
    setPdfUrl('');
    setViewState('create');
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`/api/admin/posts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadPosts();
    } catch (err: any) {
      alert('Lỗi xóa bài viết: ' + err.message);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const postData = {
        id: currentPostId,
        title,
        slug,
        excerpt,
        content,
        category,
        is_vip: isVip,
        pdf_url: pdfUrl || null,
      };

      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setViewState('list');
      loadPosts();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu bài viết.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)]">Quản Lý Bài Viết CMS</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Đăng tải báo cáo vĩ mô, chiến lược và quản lý quyền truy cập VIP cho ấn phẩm.
          </p>
        </div>

        {viewState === 'list' && (
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Đăng bài viết mới
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm mb-6">
          {error}
        </div>
      )}

      {/* VIEW: CREATE / EDIT FORM */}
      {viewState !== 'list' ? (
        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-10 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-[var(--border-color)] mb-8">
            <h2 className="text-xl font-bold text-[var(--text-heading)]">
              {viewState === 'create' ? 'Thêm Bài Viết Mới' : 'Chỉnh Sửa Bài Viết'}
            </h2>
            <button
              onClick={() => setViewState('list')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-heading)]"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">Tiêu đề bài viết:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Báo cáo Chiến lược Q4/2026..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">Đường dẫn Slug (URL):</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="bao-cao-chien-luoc-q4-2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">Danh mục bài viết:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="macro">Báo cáo Vĩ mô</option>
                  <option value="strategy">Báo cáo Chiến lược</option>
                  <option value="enterprise">Phân tích Doanh nghiệp</option>
                  <option value="case_study">Case Study thực chiến</option>
                  <option value="portfolio">Hiệu suất danh mục</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="vipToggle"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="vipToggle" className="text-sm font-bold text-[var(--text-heading)] cursor-pointer flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-500" />
                  Đánh dấu là Nội dung VIP (Áp dụng Teaser Paywall)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">Tóm tắt ngắn (Excerpt / Teaser):</label>
              <textarea
                required
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Tóm tắt nội dung chính để hiển thị trên thẻ card và cho người dùng chưa lên VIP đọc trước..."
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">Nội dung chi tiết (HTML / Markdown):</label>
              <textarea
                required
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung bài viết dưới dạng HTML (VD: <h3>I. Tiêu đề</h3><p>Nội dung...</p>)..."
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] font-mono text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-heading)] mb-1.5">Đường dẫn file PDF đính kèm (Tùy chọn):</label>
              <input
                type="text"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="reports/ten-file-bao-cao.pdf"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setViewState('list')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:bg-slate-500/10 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
              >
                {submitting ? 'Đang lưu bài viết...' : 'Lưu và Xuất bản'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* VIEW: POSTS TABLE LIST */
        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-xs text-[var(--text-muted)]">Đang tải danh sách bài viết...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center text-sm text-[var(--text-muted)]">
              Chưa có bài viết nào được đăng tải.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-500/5 border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Tiêu đề bài viết</th>
                    <th className="px-5 py-3 font-semibold">Danh mục</th>
                    <th className="px-5 py-3 font-semibold">Chế độ</th>
                    <th className="px-5 py-3 font-semibold">Ngày tạo</th>
                    <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[var(--text-heading)] line-clamp-1">{post.title}</div>
                        <div className="text-xs font-mono text-[var(--text-muted)]">/{post.slug}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {CATEGORY_LABELS[post.category] || post.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {post.is_vip ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                            <Lock className="w-3 h-3" /> VIP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
                            Cơ bản
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                        {new Date(post.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <Link
                          href={`/reports/${post.slug}`}
                          target="_blank"
                          className="inline-flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          title="Xem trên web"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEditClick(post)}
                          className="inline-flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="inline-flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors"
                          title="Xóa bài viết"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
