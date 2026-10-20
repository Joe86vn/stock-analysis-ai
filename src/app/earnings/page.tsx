import React from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LatestEarningsTable } from '@/components/earnings/LatestEarningsTable';

export const metadata: Metadata = {
  title: 'Cập Nhật Kết Quả Kinh Doanh Mới Nhất | ValueX',
  description:
    'Bảng lọc và theo dõi kết quả kinh doanh tăng trưởng mới nhất từ Ủy ban Chứng khoán Nhà nước (SSC). Tự động số hóa báo cáo tài chính và tính tăng trưởng YoY doanh thu, lợi nhuận sau thuế.',
};

export default function EarningsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#07090E] transition-colors duration-200">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <LatestEarningsTable />
      </main>
      <Footer />
    </div>
  );
}
