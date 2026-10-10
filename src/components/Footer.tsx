import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Sparkles, MapPin, Mail, Phone, ExternalLink, ArrowRight } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800/80 bg-white dark:bg-[#0B0F19] text-slate-600 dark:text-gray-400 text-sm transition-colors duration-200 print:hidden mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Cột 1: Giới thiệu Thương hiệu */}
          <div className="space-y-4">
            <Link href="/" className="inline-block relative h-9 w-36 sm:h-10 sm:w-40">
              <Image
                src="/brand/logo/logo-full-light.svg"
                alt="ValueX Logo"
                fill
                className="object-contain object-left dark:hidden"
              />
              <Image
                src="/brand/logo/logo-full-dark.svg"
                alt="ValueX Logo"
                fill
                className="object-contain object-left hidden dark:block"
              />
            </Link>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              Nền tảng phân tích cơ bản & công cụ định lượng hỗ trợ nhà đầu tư cá nhân và chuyên viên kiến tạo tài sản bền vững, bứt phá lợi nhuận với kỷ luật nghiêm ngặt.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3 h-3" />
              Đồng hành bứt phá giá trị
            </div>
          </div>

          {/* Cột 2: Sứ mệnh & Tầm nhìn */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Sứ Mệnh & Tầm Nhìn
            </h4>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              Trở thành đội ngũ tư vấn đầu tư chứng khoán uy tín, chuyên nghiệp hàng đầu <strong>Bà Rịa - Vũng Tàu</strong>. Giúp nhà đầu tư tiếp cận kiến thức chuẩn xác, thông tin đáng tin cậy và cơ hội đầu tư vượt trội.
            </p>
            <div className="text-xs font-medium text-slate-700 dark:text-gray-300">
              Giá trị cốt lõi: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Chính trực • Chuyên môn • Kỷ luật • Đồng hành</span>
            </div>
          </div>

          {/* Cột 3: Liên kết nhanh */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Hệ Sinh Thái ValueX
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/reports" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-emerald-500" /> Ấn phẩm báo cáo phân tích
                </Link>
              </li>
              <li>
                <Link href="/ranking" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-amber-500" /> Bộ lọc cổ phiếu & Xếp hạng RS
                </Link>
              </li>
              <li>
                <Link href="/chart" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-indigo-500" /> Biểu đồ kỹ thuật KLineCharts
                </Link>
              </li>
              <li>
                <Link href="/analysis" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-emerald-500" /> Phân tích doanh nghiệp AI
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-purple-500" /> Hồ sơ & Đăng ký gói VIP
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Thông tin Liên hệ Broker */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tư Vấn & Hỗ Trợ
            </h4>
            <ul className="space-y-2.5 text-xs text-[var(--text-muted)]">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Khu vực hỗ trợ: TP. Vũng Tàu, TP. Bà Rịa & Nhà đầu tư trên toàn quốc</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>contact@valuex.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Hotline / Zalo: <strong className="text-slate-900 dark:text-white font-mono">090 123 4567</strong></span>
              </li>
            </ul>
            <div className="pt-2">
              <a
                href="https://zalo.me/0901234567"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
              >
                Chat Zalo cùng Chuyên viên <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-gray-200/80 dark:border-gray-800/80 text-[11px] leading-relaxed text-slate-500 dark:text-gray-500 text-center space-y-3">
          <p className="max-w-4xl mx-auto">
            <strong>Tuyên bố miễn trừ trách nhiệm:</strong> Các báo cáo, ấn phẩm nhận định và mô hình phân tích định giá trên ValueX chỉ mang tính chất tham khảo cho khách hàng và không cấu thành lời mời hay khuyến nghị mua bán chứng khoán trực tiếp. Thị trường chứng khoán luôn tiềm ẩn rủi ro biến động giá, nhà đầu tư cần tự chịu trách nhiệm cho quyết định giao dịch và quản trị danh mục của mình.
          </p>
          <p className="text-slate-400 dark:text-gray-600">
            © {currentYear} ValueX Platform. Mọi quyền được bảo lưu. Thiết kế đồng hành cùng nhà đầu tư chứng khoán Việt Nam.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
