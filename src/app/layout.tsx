import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quantum Stock AI - Phân Tích Đầu Tư Chứng Khoán Tự Động',
  description: 'Hệ thống tự động phân tích cơ hội đầu tư chứng khoán và trình bày thành báo cáo phân tích theo mẫu chuẩn.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-[#0B0F19] text-gray-200 antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
