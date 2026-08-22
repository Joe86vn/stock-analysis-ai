# Kế Hoạch Triển Khai Chi Tiết (PLAN.md)
## Dự Án: Web App Phân Tích Cơ Hội Đầu Tư Chứng Khoán Tự Động (Stock Analysis AI Platform)

---

## 1. Tổng Quan Lộ Trình Triển Khai (Phased Roadmap Strategy)

Dự án được triển khai theo mô hình **Agile/Scrum (7 Sprints - ~7-8 tuần)** với 4 Giai đoạn chính nhằm đảm bảo tính khả thi, kiểm thử liên tục và giao hàng từng phần (Incremental Delivery).

```
[Phase 1: Ingestion & Extraction] ──> [Phase 2: AI Core Engine A-D] ──> [Phase 3: Web UI & Export] ──> [Phase 4: Data API & E2E]
     (Sprint 1 - 2)                           (Sprint 3 - 4)                    (Sprint 5 - 6)                (Sprint 7)
```

---

## 2. Chi Tiết Các Giai Đoạn Triển Khai (Sprint-by-Sprint Breakdown)

### 🚀 Giai Đoạn 1: Khởi Tạo Dự Án & Động Cơ Trích Xuất Tài Liệu (Sprint 1 - 2)
**Mục tiêu**: Xây dựng khung ứng dụng (Next.js + FastAPI), cơ sở dữ liệu và Engine nhận dạng/trích xuất dữ liệu từ các tài liệu PDF/Docx do người dùng upload.

- [ ] **Task 1.1**: Khởi tạo Repository & Cấu hình môi trường phát triển (Next.js 15 TailwindCSS Shadcn + FastAPI Python 3.11+ + PostgreSQL).
- [ ] **Task 1.2**: Thiết kế & Triển khai Schema Database (PostgreSQL với SQLAlchemy & Alembic Migrations).
- [ ] **Task 1.3**: Xây dựng UI Upload Zone (Kéo thả nhiều file PDF/DOCX, hiển thị tiến độ upload & dung lượng).
- [ ] **Task 1.4**: Triển khai Module Backend Trích Xuất PDF (`pdfplumber` / `PyMuPDF`):
  - Trích xuất văn bản có định dạng.
  - Trích xuất Bảng BCTC & Thuyết minh BCTC thành dạng Structured JSON/Pandas DataFrame.
- [ ] **Task 1.5**: Lưu trữ bảo mật tài liệu vào File Storage và cập nhật Session status.

---

### 🧠 Giai Đoạn 2: Xây Dựng AI Analysis Core Phân Tích 4 Phần (Sprint 3 - 4)
**Mục tiêu**: Tích hợp Gemini 1.5 Pro Long-Context, xây dựng chuỗi Prompting chuyên sâu xử lý trọn vẹn 4 phần A-B-C-D theo đúng quy chuẩn `analysis-guide.md`.

- [ ] **Task 2.1**: Cấu hình Gemini SDK & Xây dựng Module Prompt Orchestrator.
- [ ] **Task 2.2**: Triển khai Prompt Phần A (Tổng Quan Doanh Nghiệp):
  - Chi tiết lịch sử, sản phẩm chính, đối thủ.
  - Bóc tách cơ cấu cổ đông lớn, ban lãnh đạo.
  - Bóc tách danh sách công ty con / công ty liên kết trọng số lớn.
- [ ] **Task 2.3**: Triển khai Prompt Phần B (Hoạt Động Kinh Doanh & Chuỗi Giá Trị):
  - Phân tích Yếu tố Đầu vào (Chi phí, nhà cung cấp, biến động).
  - Phân tích Quy trình Sản xuất (Công suất nhà máy hiện tại, kế hoạch mở rộng).
  - Phân tích Đầu ra (Cơ cấu doanh thu sản phẩm trọng yếu, giá bán, sản lượng).
- [ ] **Task 2.4**: Triển khai Prompt Phần C (Tình Hình Tài Chính):
  - Phân tích Doanh thu 3 năm gần nhất.
  - Phân tích Biên lợi nhuận gộp, Biên lợi nhuận ròng, ROE.
  - Đánh giá Sức khỏe tài chính: Tỷ lệ Nợ vay / Vốn chủ sở hữu (D/E).
- [ ] **Task 2.5**: Triển khai Prompt Phần D (Triển Vọng & Định Giá 3 Kịch Bản):
  - Phân tích yếu tố tăng trưởng Sản lượng & Giá bán.
  - Dự báo KQKD (Doanh thu & LNST) cho **4 quý tiếp theo**.
  - Tự động tính toán EPS Forward & Định giá 3 kịch bản: Cơ sở ($PE_{Avg}$), Tích cực ($PE_{Max}$), Tiêu cực ($PE_{Min}$).

---

### 💻 Giai Đoạn 3: Trình Biên Tập Báo Cáo Tương Tác & Engine Xuất File (Sprint 5 - 6)
**Mục tiêu**: Phát triển giao diện Web Dashboard chỉnh sửa báo cáo nháp, bộ công cụ tính toán giả định thời gian thực và xuất báo cáo file PDF / Word chuyên nghiệp.

- [ ] **Task 3.1**: Phát triển Web Report Editor Interface:
  - Hiển thị bài phân tích theo từng Tab / Mục A, B, C, D trực quan.
  - Tích hợp Rich-Text Editor (TipTap/Slate) cho phép người dùng sửa đổi văn bản trực tiếp.
- [ ] **Task 3.2**: Phát triển Interactive Valuation Calculator:
  - Form thay đổi con số LNST dự báo 4 quý -> Tự động cập nhật EPS Forward.
  - Cho phép điều chỉnh $PE_{Base}, PE_{Bull}, PE_{Bear}$ -> Cập nhật biểu đồ giá mục tiêu 3 kịch bản ngay lập tức.
- [ ] **Task 3.3**: Triển khai PDF Export Engine:
  - Thiết kế Template PDF chuyên nghiệp (Trang bìa, Header/Footer, Mục lục, Bảng số liệu, Biểu đồ kịch bản).
  - Xuất file PDF chất lượng in ấn với WeasyPrint / Puppeteer.
- [ ] **Task 3.4**: Triển khai DOCX Export Engine:
  - Cho phép xuất toàn bộ nội dung báo cáo ra file Microsoft Word (.docx) chuẩn format.

---

### 🌐 Giai Đoạn 4: Tích Hợp Market Data API, Testing & Hoàn Thiện (Sprint 7)
**Mục tiêu**: Tự động kết nối dữ liệu P/E 5 năm & P/E ngành của thị trường chứng khoán Việt Nam, kiểm thử toàn diện và bàn giao hệ thống.

- [ ] **Task 4.1**: Tích hợp Data Fetcher Crawl/API dữ liệu chứng khoán Việt Nam:
  - Tự động tra cứu P/E 5 năm ($PE_{Min}, PE_{Max}, PE_{Avg}$).
  - Tự động lấy P/E, P/B ngành và đối thủ cạnh tranh.
- [ ] **Task 4.2**: Kiểm thử Hallucination & Accuracy Benchmark:
  - Thử nghiệm trên 5 mã cổ phiếu tiêu biểu (HPG, FPT, VNM, MWG, VHM) với đầy đủ BCTN & BCTC.
  - Đánh giá độ chính xác số liệu trích xuất & chất lượng luận điểm AI.
- [ ] **Task 4.3**: Tối ưu hiệu năng & Trải nghiệm người dùng:
  - Cải thiện tốc độ parse PDF & Stream phản hồi AI từ Gemini.
  - Responsive UI & Dark/Light Mode refinement.
- [ ] **Task 4.4**: Đóng gói Docker & Hướng dẫn Triển khai (Deployment Guide).

---

## 3. Tiêu Chí Hoàn Thành (Definition of Done - DoD)

Một Task/Sprint được coi là hoàn tất khi:
1. Code tuân thủ 100% tiêu chuẩn TypeScript & Python Async Best Practices.
2. Các phần báo cáo tạo ra khớp 100% với cấu trúc 4 phần A-B-C-D trong `analysis-guide.md`.
3. Số liệu trích xuất từ tài liệu PDF (Doanh thu, LNST, D/E) có độ chính xác $>98\%$.
4. Bộ tính toán định giá phản hồi thời gian thực trên Web UI ($<100ms$).
5. File PDF / Word xuất ra không vỡ khung, trình bày thẩm mỹ chuẩn báo cáo phân tích tài chính.
