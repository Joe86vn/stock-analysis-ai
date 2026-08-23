# Kế Hoạch Triển Khai Chi Tiết (PLAN.md)
## Dự Án: Web App Phân Tích Cơ Hội Đầu Tư Chứng Khoán Tự Động (Stock Analysis AI Platform)

---

## 1. Tổng Quan Lộ Trình Triển Khai (Phased Roadmap Strategy)

Dự án được triển khai theo mô hình **Agile/Scrum (7 Sprints - ~7-8 tuần)** với 4 Giai đoạn chính nhằm đảm bảo tính khả thi, kiểm thử liên tục và giao hàng từng phần (Incremental Delivery).

```
[Phase 0: crawl-report Skill & Infra] --> [Phase 1: Ingestion & Extraction] --> [Phase 2: AI Core Engine A-D] --> [Phase 3: Web UI & Export] --> [Phase 4: Data API & E2E]
   (Sprint 0 - 0.5 tuần)                      (Sprint 1 - 2)                       (Sprint 3 - 4)                   (Sprint 5 - 6)               (Sprint 7)
```

---

## 2. Chi Tiết Các Giai Đoạn Triển Khai (Sprint-by-Sprint Breakdown)

### 🔍 Giai Đoạn 0: Reference Document Catalog & Hạ Tầng Crawl (Sprint 0 - ~0.5 tuần)
**Mục tiêu**: Xây dựng skill `crawl-report` và hạ tầng cache Redis để tự động thu thập danh mục tài liệu tham khảo từ 3 nguồn chuyên biệt, tích hợp vào Module 1.

- [x] **Task 0.1**: Cài đặt & cấu hình Redis / In-memory TTL cache vào dependency stack.
- [x] **Task 0.2**: Tạo schema DB & Type definitions cho bảng `reference_document_catalogs` (JSONB fields: annual_reports, quarterly_financials, agm_resolution, broker_reports).
- [x] **Task 0.3**: Triển khai `CrawlReportService` (`src/lib/crawl-report-service.ts`) theo skill `@crawl-report`:
  - `_crawl_bctn_cafef()`: HEAD-check 3 URL pattern `{ticker}_{YY}CN_BCTN.pdf` từ cafef.
  - `_crawl_bctc_vietstock()`: HEAD-check 8 quý URL pattern `QUY%20{Q}/{ticker}_Baocaotaichinh_Q{Q}_{year}_Hopnhat.pdf`.
  - `_crawl_agm_vietstock()`: HEAD-check NQ ĐHCĐ năm hiện tại rồi fallback năm trước.
  - `_crawl_broker_simplize()`: GET `api2.simplize.vn/api/company/analysis-report/list`.
  - Gather 4 nguồn song song + Cache TTL=86400.
- [x] **Task 0.4**: API endpoint `GET /api/stocks/{ticker}/reference-documents`.
- [x] **Task 0.5**: Frontend — Reference Document Catalog UI (`ReferenceDocumentCatalog.tsx`):
  - Accordion 4 nhóm: BCTN / BCTC / NQ ĐHCĐ / Broker Reports.
  - Mỗi item: icon trạng thái ✅/❌, link tải PDF direct, nút "+ Thêm vào phân tích".
  - Nút "🚀 Tải tất cả đã chọn & Bắt đầu Phân Tích AI" → auto-select & trigger `runAnalysis`.

---

### 🚀 Giai Đoạn 1: Khởi Tạo Dự Án & Động Cơ Trích Xuất Tài Liệu (Sprint 1 - 2)
**Mục tiêu**: Xây dựng khung ứng dụng (Next.js + TailwindCSS), cơ sở dữ liệu và Engine nhận dạng/trích xuất dữ liệu từ các tài liệu PDF/Docx do người dùng upload.

- [x] **Task 1.1**: Khởi tạo Repository & Cấu hình môi trường phát triển (Next.js 15 TailwindCSS Shadcn + TypeScript + React 19).
- [x] **Task 1.2**: Thiết kế & Triển khai Schema Database (Prisma ORM & PostgreSQL).
- [x] **Task 1.3**: Xây dựng UI Upload Zone (`DocumentUploader.tsx`: Kéo thả nhiều file PDF/DOCX, hiển thị tiến độ upload & dung lượng).
- [x] **Task 1.4**: Triển khai Module Backend/Client Trích Xuất PDF & Parse văn bản có định dạng.
- [x] **Task 1.5**: Lưu trữ tài liệu vào Session state (`UploadedFile[]`) và cập nhật Session status.

---

### 🧠 Giai Đoạn 2: Xây Dựng AI Analysis Core Phân Tích 4 Phần (Sprint 3 - 4)
**Mục tiêu**: Tích hợp Gemini 1.5 Pro Long-Context, xây dựng chuỗi Prompting chuyên sâu xử lý trọn vẹn 4 phần A-B-C-D theo đúng quy chuẩn `analysis-guide.md`.

- [x] **Task 2.1**: Cấu hình Gemini SDK & Xây dựng Module Prompt Orchestrator (`src/lib/ai-analyzer.ts`).
- [x] **Task 2.2**: Triển khai Prompt Phần A (Tổng Quan Doanh Nghiệp):
  - Chi tiết lịch sử, sản phẩm chính, đối thủ.
  - Bóc tách cơ cấu cổ đông lớn, ban lãnh đạo.
  - Bóc tách danh sách công ty con / công ty liên kết trọng số lớn.
- [x] **Task 2.3**: Triển khai Prompt Phần B (Hoạt Động Kinh Doanh & Chuỗi Giá Trị):
  - Phân tích Yếu tố Đầu vào (Chi phí, nhà cung cấp, biến động).
  - Phân tích Quy trình Sản xuất (Công suất nhà máy hiện tại, kế hoạch mở rộng).
  - Phân tích Đầu ra (Cơ cấu doanh thu sản phẩm trọng yếu, giá bán, sản lượng).
- [x] **Task 2.4**: Triển khai Prompt Phần C (Tình Hình Tài Chính):
  - Phân tích Doanh thu 3 năm gần nhất.
  - Phân tích Biên lợi nhuận gộp, Biên lợi nhuận ròng, ROE.
  - Đánh giá Sức khỏe tài chính: Tỷ lệ Nợ vay / Vốn chủ sở hữu (D/E).
- [x] **Task 2.5**: Triển khai Prompt Phần D (Triển Vọng & Định Giá 3 Kịch Bản):
  - Phân tích yếu tố tăng trưởng Sản lượng & Giá bán.
  - Dự báo KQKD (Doanh thu & LNST) cho **4 quý tiếp theo**.
  - Tự động tính toán EPS Forward & Định giá 3 kịch bản: Cơ sở ($PE_{Avg}$), Tích cực ($PE_{Max}$), Tiêu cực ($PE_{Min}$).

---

### 💻 Giai Đoạn 3: Trình Biên Tập Báo Cáo Tương Tác & Engine Xuất File (Sprint 5 - 6)
**Mục tiêu**: Phát triển giao diện Web Dashboard chỉnh sửa báo cáo nháp, bộ công cụ tính toán giả định thời gian thực và xuất báo cáo file PDF / Word chuyên nghiệp.

- [x] **Task 3.1**: Phát triển Web Report Editor Interface (`ReportViewer.tsx`):
  - Hiển thị bài phân tích theo từng Tab / Mục A, B, C, D trực quan.
  - Cho phép người dùng chỉnh sửa văn bản trực tiếp.
- [x] **Task 3.2**: Phát triển Interactive Valuation Calculator (`ValuationCalculator.tsx`):
  - Form thay đổi con số LNST dự báo 4 quý -> Tự động cập nhật EPS Forward.
  - Cho phép điều chỉnh $PE_{Base}, PE_{Bull}, PE_{Bear}$ -> Cập nhật biểu đồ giá mục tiêu 3 kịch bản ngay lập tức.
- [x] **Task 3.3**: Triển khai PDF Export Engine (`ExportModal.tsx`):
  - Thiết kế Template PDF chuyên nghiệp (Trang bìa, Header/Footer, Mục lục, Bảng số liệu, Biểu đồ kịch bản).
- [x] **Task 3.4**: Triển khai DOCX Export Engine (`ExportModal.tsx`):
  - Cho phép xuất toàn bộ nội dung báo cáo ra file Microsoft Word (.docx) chuẩn format.

---

### 🌐 Giai Đoạn 4: Tích Hợp Market Data API, Testing & Hoàn Thiện (Sprint 7)
**Mục tiêu**: Tự động kết nối dữ liệu P/E 5 năm & P/E ngành của thị trường chứng khoán Việt Nam, kiểm thử toàn diện và bàn giao hệ thống.

- [x] **Task 4.1**: Tích hợp Data Fetcher Crawl/API dữ liệu chứng khoán Việt Nam (`stock-data.ts` & `MarketDataSummary.tsx`):
  - Market Data: Tự động tra cứu P/E 5 năm ($PE_{Min}, PE_{Max}, PE_{Avg}$), P/E & P/B ngành và đối thủ cạnh tranh.
  - Reference Documents (từ Phase 0): Đảm bảo crawl-report service hoạt động ổn định E2E với 5 mã test (HPG, HDC, FPT, VNM, MWG).
- [x] **Task 4.2**: Kiểm thử Hallucination & Accuracy Benchmark:
  - Thử nghiệm trên 5 mã cổ phiếu tiêu biểu với đầy đủ BCTN & BCTC.
- [x] **Task 4.3**: Tối ưu hiệu năng & Trải nghiệm người dùng:
  - Responsive UI & Dark/Light Mode refinement chuẩn SaaS tài chính.
- [ ] **Task 4.4**: Đóng gói Docker & Hướng dẫn Triển khai (Deployment Guide).

---

## 3. Tiêu Chí Hoàn Thành (Definition of Done - DoD)

Một Task/Sprint được coi là hoàn tất khi:
1. Code tuân thủ 100% tiêu chuẩn TypeScript & Python Async Best Practices.
2. Các phần báo cáo tạo ra khớp 100% với cấu trúc 4 phần A-B-C-D trong `analysis-guide.md`.
3. Số liệu trích xuất từ tài liệu PDF (Doanh thu, LNST, D/E) có độ chính xác $>98\%$.
4. Bộ tính toán định giá phản hồi thời gian thực trên Web UI ($<100ms$).
5. File PDF / Word xuất ra không vỡ khung, trình bày thẩm mỹ chuẩn báo cáo phân tích tài chính.
