---
name: Quantum Finance Dark
version: 1.0.0
colors:
  primary: "#0EA5E9"
  primary-hover: "#0284C7"
  secondary: "#10B981"
  secondary-hover: "#059669"
  neutral-bg: "#0B0F19"
  surface: "#111827"
  surface-card: "#1F2937"
  border: "#374151"
  text-heading: "#F9FAFB"
  text-body: "#D1D5DB"
  text-muted: "#9CA3AF"
  bull-case: "#10B981"
  base-case: "#0EA5E9"
  bear-case: "#EF4444"
typography:
  headline-display: { fontFamily: Inter, fontSize: 32px, fontWeight: 700, lineHeight: 1.2 }
  headline-lg: { fontFamily: Inter, fontSize: 24px, fontWeight: 600, lineHeight: 1.3 }
  headline-md: { fontFamily: Inter, fontSize: 18px, fontWeight: 600, lineHeight: 1.4 }
  body-md: { fontFamily: Inter, fontSize: 14px, fontWeight: 400, lineHeight: 1.6 }
  body-sm: { fontFamily: Inter, fontSize: 12px, fontWeight: 400, lineHeight: 1.5 }
  label-bold: { fontFamily: Inter, fontSize: 12px, fontWeight: 600, lineHeight: 1.2 }
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
    rounded: "{rounded.sm}"
    padding: 10px 18px
  card-finance:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: 20px
---

# Quantum Finance Dark Design Spec

## Overview
Giao diện Web App phân tích chứng khoán chuyên nghiệp theo phong cách Dark Mode cao cấp (SaaS Financial Dashboard). Tối ưu hóa cho trải nghiệm xem dữ liệu BCTC, biểu đồ định giá 3 kịch bản, và trình biên tập báo cáo tài chính.

## Colors
- **Primary (#0EA5E9 - Sky Blue)**: Màu chủ đạo cho các hành động chính, CTA, Kịch bản Định giá Cơ sở (Base Case).
- **Secondary (#10B981 - Emerald Green)**: Điểm nhấn tích cực, chỉ số tăng trưởng, Kịch bản Tích cực (Bull Case).
- **Bear Case (#EF4444 - Rose Red)**: Điểm nhấn cảnh báo rủi ro, Kịch bản Tiêu cực (Bear Case).
- **Neutral Background (#0B0F19)**: Nền tối sâu sắc nét, tạo độ tương phản cao với chữ và đồ thị.
- **Surface (#111827 & #1F2937)**: Khung chứa thông tin (Cards, Sidebar, Editors) với border tinh tế (`#374151`).

## Typography
Sử dụng bộ font **Inter** chuẩn UI/UX tài chính hiện đại:
- **Headline Display**: Dùng cho Tiêu đề Mã cổ phiếu (ví dụ: `HPG - Tập đoàn Hòa Phát`).
- **Headline Large/Medium**: Dùng cho tiêu đề các phần A, B, C, D của Báo cáo.
- **Body Medium/Small**: Dùng cho văn bản lập luận phân tích và bảng số liệu tài chính.

## Elevation & Depth
- Sử dụng hiệu ứng Glassmorphism nhẹ (`backdrop-blur-md bg-opacity-80`) cho Top Navigation Header.
- Subtly glowing borders (`border border-gray-800 hover:border-sky-500/50 transition-colors`).

## Components
- **Upload Zone**: Khung kéo thả tài liệu hỗ trợ xem nhanh danh sách file BCTC, BCTN đã tải lên.
- **Report Editor Panel**: Trình biên tập văn bản phân tích theo từng mục A, B, C, D.
- **Valuation Scenario Calculator**: Bảng tương tác điều chỉnh EPS Forward và P/E mục tiêu với chart Recharts phản hồi thời gian thực.

## Do's and Don'ts
- **Do**: Giữ tỷ lệ tương phản WCAG AA cao giữa chữ sáng màu và nền tối (`#F9FAFB` trên `#111827`).
- **Do**: Phân biệt rõ rệt 3 kịch bản định giá qua mã màu cố định (Xanh lá - Bull, Xanh dương - Base, Đỏ - Bear).
- **Don't**: Không sử dụng màu sắc chói mắt không thuộc bảng màu tokens.
- **Don't**: Không nhồi nhét quá nhiều số liệu trên 1 màn hình mà không phân chia thẻ (Card) hoặc Tab rõ ràng.
