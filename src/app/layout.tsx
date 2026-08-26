import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ValueX - Phân Tích Cơ Bản & Định Giá Bứt Phá',
  description: 'Hệ thống phân tích cơ hội đầu tư chứng khoán và định giá chuyên sâu ValueX. Đồng hành bứt phá giá trị - Đầu tư bền vững.',
  icons: {
    icon: '/brand/logo/logo-icon-dark.svg',
    shortcut: '/brand/logo/logo-icon-dark.svg',
    apple: '/brand/logo/logo-avatar-dark.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`dark ${plusJakartaSans.variable} ${inter.variable}`}>
      <body className="bg-[#0B0F19] text-gray-200 antialiased selection:bg-emerald-500 selection:text-white font-body">
        {children}
      </body>
    </html>
  );
}
