# Stock Analysis AI Platform 🚀

> Web App phân tích chứng khoán tự động sử dụng AI (Gemini) — tạo báo cáo đầu tư chuyên nghiệp từ tài liệu PDF/Excel.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-1.5_Pro-4285F4?logo=google)](https://ai.google.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

---

## 📋 Tổng Quan

Ứng dụng trợ lý AI thông minh dành cho nhà đầu tư cá nhân và chuyên viên phân tích tài chính. Hệ thống tự động tổng hợp, phân tích và lập báo cáo đầu tư chuyên nghiệp từ tập tài liệu người dùng cung cấp.

### ✨ Tính Năng Chính

- 📄 **Upload & Parse tài liệu**: PDF (BCTC, BCTN, Broker Report), DOCX, XLSX
- 🤖 **AI phân tích 4 phần**: Tổng quan → Chuỗi giá trị → Tài chính → Định giá
- 📊 **Định giá 3 kịch bản**: Base Case / Bull Case / Bear Case theo PE × EPS Forward
- ✏️ **Interactive Report Editor**: Chỉnh sửa giả định realtime, cập nhật giá mục tiêu ngay lập tức
- 📥 **Xuất file**: PDF chuyên nghiệp & Word editable

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | TailwindCSS 4, Shadcn/ui |
| AI Engine | Google Gemini 1.5 Pro (Long Context) |
| Charts | Recharts |
| PDF Parse | pdf-parse |

---

## 🚀 Bắt Đầu Nhanh

### Yêu Cầu

- Node.js 18+
- Google Gemini API Key ([Lấy tại đây](https://aistudio.google.com/apikey))

### Cài Đặt

```bash
# Clone repo
git clone https://github.com/Joe86vn/stock-analysis-ai.git
cd stock-analysis-ai

# Cài dependencies
npm install

# Cấu hình API Key
cp .env.example .env.local
# Điền GEMINI_API_KEY vào .env.local
```

### Chạy Development

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

---

## 📁 Cấu Trúc Dự Án

```
stock-analysis-ai/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Trang chính
│   │   └── globals.css
│   ├── components/       # React Components
│   │   ├── DocumentUploader.tsx    # Upload zone drag & drop
│   │   ├── StockSelector.tsx       # Chọn mã cổ phiếu
│   │   ├── MarketDataSummary.tsx   # Hiển thị dữ liệu thị trường
│   │   ├── ReportViewer.tsx        # Trình xem báo cáo 4 phần
│   │   ├── ValuationCalculator.tsx # Bộ tính định giá 3 kịch bản
│   │   ├── ExportModal.tsx         # Xuất PDF/Word
│   │   └── Header.tsx
│   ├── lib/              # Logic & Utilities
│   │   ├── ai-analyzer.ts          # Gemini AI integration
│   │   └── stock-data.ts           # Market data functions
│   └── types/
│       └── analysis.ts             # TypeScript type definitions
├── PRD.md                # Product Requirements Document
├── PLAN.md               # Implementation Plan (7 Sprints)
├── TECH_ARCHITECTURE.md  # Technical Architecture
├── DESIGN.md             # Design Specification
└── analysis-guide.md     # Quy trình phân tích chuẩn
```

---

## 📐 Kiến Trúc Báo Cáo (4 Phần)

Hệ thống tạo báo cáo theo chuẩn `analysis-guide.md`:

| Phần | Nội Dung |
|------|----------|
| **A. Tổng Quan** | Lịch sử doanh nghiệp, cổ đông, ban lãnh đạo, công ty liên kết |
| **B. Chuỗi Giá Trị** | Đầu vào, Quy trình sản xuất, Đầu ra theo mô hình kinh doanh |
| **C. Tài Chính** | Doanh thu 3 năm, Biên lợi nhuận, ROE, D/E ratio |
| **D. Định Giá** | Dự báo 4 quý, EPS Forward, Định giá 3 kịch bản |

---

## ⚙️ Cấu Hình Môi Trường

Tạo file `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 📖 Tài Liệu

- [PRD.md](./PRD.md) — Product Requirements Document
- [PLAN.md](./PLAN.md) — Sprint-by-sprint implementation plan
- [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) — Technical architecture & DB schema
- [DESIGN.md](./DESIGN.md) — UI/UX Design specification
- [analysis-guide.md](./analysis-guide.md) — Quy trình phân tích chuẩn

---

## 🤝 Contributing

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/ten-tinh-nang`)
3. Commit changes (`git commit -m 'feat: thêm tính năng X'`)
4. Push branch (`git push origin feature/ten-tinh-nang`)
5. Tạo Pull Request

---

## 📄 License

MIT License — © 2026 Nguyen Joe
