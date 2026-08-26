---
name: ValueX Fintech Design Spec
version: 1.1.0
colors:
  primary: "#10B981"
  primary-hover: "#059669"
  secondary: "#064E3B"
  primary-light: "#D1FAE5"
  neutral-bg: "#0B0F19"
  surface: "#111827"
  surface-card: "#1E293B"
  border: "#374151"
  text-heading: "#F8FAFC"
  text-body: "#E2E8F0"
  text-muted: "#94A3B8"
  bull-case: "#10B981"
  base-case: "#3B82F6"
  bear-case: "#EF4444"
  vip-gold: "#F59E0B"
typography:
  headline-display: { fontFamily: "Plus Jakarta Sans", fontSize: 32px, fontWeight: 800, lineHeight: 1.2 }
  headline-lg: { fontFamily: "Plus Jakarta Sans", fontSize: 24px, fontWeight: 700, lineHeight: 1.3 }
  headline-md: { fontFamily: "Plus Jakarta Sans", fontSize: 18px, fontWeight: 600, lineHeight: 1.4 }
  body-md: { fontFamily: "Inter", fontSize: 14px, fontWeight: 400, lineHeight: 1.6 }
  body-sm: { fontFamily: "Inter", fontSize: 12px, fontWeight: 400, lineHeight: 1.5 }
  label-bold: { fontFamily: "Inter", fontSize: 12px, fontWeight: 600, lineHeight: 1.2 }
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.md}"
    padding: 10px 18px
  card-finance:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: 20px
---

# ValueX Fintech Design Spec

## Overview
Bộ quy chuẩn thiết kế giao diện cho nền tảng phân tích tài chính và định giá chứng khoán chuyên sâu **ValueX**. Tôn chỉ thương hiệu: *"Đồng hành bứt phá giá trị - Đầu tư bền vững"*.

Giao diện áp dụng phong cách Dark Mode tài chính hiện đại (Fintech Sleek Dark):
- Nền tối sâu Midnight Navy mang tính bảo mật và chuyên nghiệp cao.
- Màu nhấn Bullish Emerald (`#10B981`) thể hiện xu hướng tăng giá và bứt phá lợi nhuận.
- Typography tinh tế, sạch sẽ: Font tiêu đề **Plus Jakarta Sans** sang trọng và font nội dung **Inter** tối ưu hiển thị số liệu BCTC dài.

## Colors
- **Bullish Emerald (`#10B981`)**: Màu nhấn chính của thương hiệu, nút CTA, chữ X trong Logo, chỉ số tăng giá và Kịch bản Lạc quan (Bull Case).
- **Deep Emerald (`#059669`)**: Trạng thái hover, viền card tương tác đậm nét.
- **Forest Green (`#064E3B`)**: Nền gradient chiều sâu, banner tài chính.
- **Mint Light (`#D1FAE5`)**: Nền tag, badge phân loại thông tin.
- **Midnight Navy (`#0B0F19`)**: Nền tối chính của ứng dụng.
- **Surface Dark (`#111827` & `#1E293B`)**: Thẻ card, sidebar, khung chứa nội dung và bảng biểu.
- **Bearish Red (`#EF4444`)**: Cảnh báo rủi ro, điểm cắt lỗ, Kịch bản Tiêu cực (Bear Case).
- **VIP Gold (`#F59E0B`)**: Điểm đánh giá cao cấp, cơ hội đặc biệt.

## Typography
- **Heading & Logo**: `Plus Jakarta Sans` (Bold 700 / ExtraBold 800) mang lại vẻ hiện đại, dứt khoát.
- **Body & Data Tables**: `Inter` (Regular 400 / Medium 500 / SemiBold 600) đảm bảo độ tương phản cao, dễ đọc trên biểu đồ và bảng báo cáo tài chính phức tạp.

## Elevation & Depth
- Header Glassmorphism tinh tế: `backdrop-blur-md bg-[#0B0F19]/90 border-b border-gray-800`.
- Hiệu ứng phát sáng nhẹ khi hover: `hover:border-emerald-500/40 hover:shadow-emerald-500/10`.

## Do's and Don'ts
- **Do**: Đặt logo ValueX chính thức trên Header, Báo cáo phân tích và Watermark PDF.
- **Do**: Giữ đúng tỷ lệ màu 60-30-10 (60% Midnight Navy, 30% Slate/Charcoal, 10% Bullish Emerald).
- **Don't**: Không dùng viền trái dày, không đóng hộp rườm rà, giữ kiểu chữ tự nhiên và tinh giản theo gu thẩm mỹ cao cấp.
- **Don't**: Không đổi màu mũi tên xanh của Logo sang màu khác.
