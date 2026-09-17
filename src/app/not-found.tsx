import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">404 - Không tìm thấy trang</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang địa chỉ khác.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
