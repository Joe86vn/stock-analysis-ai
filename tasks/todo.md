# Danh Sách Nhiệm Vụ: Triển Khai Two-Stage AI Pipeline (ValueX 150 Điểm)

> Căn cứ theo kế hoạch `tasks/plan.md` và biên bản bàn giao kỹ thuật `docs/session-handoff.md`.

---

## Phase 1: Foundation & Storage Helper (Infra & Backend)

### Task 1: Định nghĩa Type Definitions cho Qualitative Insights (`src/types/qualitative.ts`)
**Description:** Tạo interface chuẩn TypeScript đại diện cho JSON 6 Section bóc tách định tính theo đặc tả `docs/prompt-1-extractor.md` (Section A đến Section F, kèm metadata CTCK và tiến độ dự án).
**Acceptance criteria:**
- [x] Định nghĩa `QualitativeInsights` với đầy đủ 6 sections (`sectionA_CorporateOverview`, `sectionB_IndustrySpecificValueChain`, `sectionC_GrowthProjectsAndExpansion`, `sectionD_CorporateStrategyAndAGM`, `sectionE_BrokerConsensusAndTheses`, `sectionF_EarningsQualityAndRisks`).
- [x] Export các sub-types chi tiết: `GrowthProjectItem`, `BrokerReportThesis`, `EarningsQualityAndRisks`.
- [x] Không có lỗi type khi compile (`npx tsc --noEmit`).
**Verification:**
- [x] `npx tsc --noEmit` pass 100%.
**Dependencies:** None
**Files touched:**
- `src/types/qualitative.ts`
**Estimated scope:** Small (1 file)

---

### Task 2: Xây dựng Module Quản Lý Storage Cloudflare R2 & Local Fallback (`src/lib/r2-storage.ts`)
**Description:** Xây dựng module kết nối Cloudflare R2 thông qua S3Client (`@aws-sdk/client-s3`), hỗ trợ ghi và đọc JSON định tính với đường dẫn chuẩn hóa, đồng thời hỗ trợ bộ đệm local file system khi dev offline hoặc chưa cấu hình R2.
**Acceptance criteria:**
- [x] Hàm `putQualitativeReport(ticker: string, data: QualitativeInsights): Promise<boolean>` đẩy JSON lên R2 (`stock-reports/${ticker}/qualitative-latest.json`) và lưu bản sao local (`data/insights/${ticker}.json`).
- [x] Hàm `getQualitativeReport(ticker: string): Promise<QualitativeInsights | null>` đọc từ R2, nếu lỗi hoặc thiếu credentials thì fallback đọc từ local cache.
- [x] Xử lý an toàn các biến môi trường: `CLOUDFLARE_R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
**Verification:**
- [x] Test script ghi và đọc JSON mẫu qua local cache và R2.
- [x] `npx tsc --noEmit` pass không lỗi.
**Dependencies:** Task 1
**Files touched:**
- `src/lib/r2-storage.ts`
**Estimated scope:** Small (1-2 files)

---

## Checkpoint 1: Sau Phase 1
- [x] Type definitions hoàn chỉnh, type-safe 100%.
- [x] Module R2 storage hoạt động trơn tru cả chế độ R2 cloud lẫn Local Cache fallback.

---

## Phase 2: Core Batch Extractor Script (Stage 1)

### Task 3: Xây dựng PDF Downloader & Gemini File API Manager (`scripts/lib/gemini-file-uploader.ts`)
**Description:** Xây dựng module tiện ích hỗ trợ tải PDF từ CDN (Cafef, Vietstock, Simplize) về thư mục tạm, upload trực tiếp lên Gemini File API qua `GoogleAIFileManager`, và dọn dẹp file sau khi xử lý.
**Acceptance criteria:**
- [x] Hàm `downloadPdfToTemp(url: string, localFilename: string): Promise<string | null>` tải file với timeout 30s và retry.
- [x] Hàm `uploadPdfToGemini(fileManager: GoogleAIFileManager, localFilePath: string, displayName: string): Promise<File | null>` upload file PDF lên Gemini Native File API.
- [x] Hàm `cleanupGeminiFiles(fileManager: GoogleAIFileManager, fileNames: string[]): Promise<void>` xóa file tạm và gọi `fileManager.deleteFile` trên Gemini để giải phóng bộ nhớ.
**Verification:**
- [x] Test upload 1 file PDF lên Gemini File API thành công và lấy được `fileUri`.
**Dependencies:** Task 1
**Files touched:**
- `scripts/lib/gemini-file-uploader.ts`
**Estimated scope:** Small (1 file)

---

### Task 4: Xây dựng Script Extractor Hoàn Chỉnh (`scripts/extract-qualitative-data.ts`)
**Description:** Hoàn thiện kịch bản trích xuất dữ liệu định tính Stage 1: Nhận ticker -> Lấy ICB code từ Vietcap -> Lấy template 16 ngành -> Tải PDF & upload Gemini File API -> Lắp ráp Prompt 1 -> Gọi Gemini 2.5 Flash -> Validate schema -> Lưu R2.
**Acceptance criteria:**
- [x] Hỗ trợ các tham số dòng lệnh CLI: `--ticker=HPG` (1 mã), `--batch=HPG,MBB,MWG` (nhiều mã), `--auto-adtv5` (tự động truy vấn toàn bộ cổ phiếu có ADTV 20 ngày >= 5 tỷ từ Vietcap Screener API qua `executeVietcapScreener({ adtvMinBillion: 5 })`).
- [x] Tích hợp `getIndustryTemplate(icbCodeLv2)` từ `src/lib/industry-extractor-templates.ts`.
- [x] Truyền trực tiếp `brokerMetadata` từ Simplize vào Prompt 1 mà không để AI đoán (Zero-Loss Principle).
- [x] Gọi Gemini với `responseMimeType: "application/json"`, nhiệt độ `temperature: 0.1` để bóc tách chuẩn xác.
- [x] Kiểm tra và lưu kết quả thông qua `putQualitativeReport()`.
**Verification:**
- [x] Chạy thử nghiệm trích xuất thành công cho 1 mã (`HDC`) và kiểm tra file JSON kết quả đủ 6 section và đẩy lên Cloudflare R2 + Local Disk.
- [x] `npx tsc --noEmit` pass.
**Dependencies:** Task 2, Task 3
**Files touched:**
- `scripts/extract-qualitative-data.ts`
**Estimated scope:** Medium (2 files)

---

## Checkpoint 2: Sau Phase 2
- [x] Pipeline Stage 1 trích xuất thành công dữ liệu định tính từ PDF gốc qua Gemini File API.
- [x] File JSON định tính 6 section được lưu trữ thành công lên Cloudflare R2 / Local cache.

---

## Phase 3: Synthesizer & Web Integration (Stage 2)

### Task 5: Nâng cấp Prompt 2 trong `src/lib/ai-analyzer.ts` để đọc Qualitative Data từ R2
**Description:** Cập nhật hàm `generateStockAnalysisReport` để trước khi phân tích sẽ kiểm tra và lấy `QualitativeInsights` từ `getQualitativeReport(ticker)`.
**Acceptance criteria:**
- [x] Nếu có qualitative data từ R2: Bơm dữ liệu định tính vào Prompt 2, kết hợp với bảng số liệu tài chính Vietcap 12 quý. Prompt 2 tập trung tổng hợp báo cáo 150 điểm, thời gian phản hồi rút ngắn xuống < 8 giây.
- [x] Nếu chưa có qualitative data từ R2: Fallback êm dịu, phân tích dựa trên uploadedFiles hoặc số liệu Vietcap API mà không làm gián đoạn trải nghiệm người dùng.
- [x] Khớp các trường định tính: chuỗi giá trị đa ngành, danh mục dự án trọng điểm (Section C), rủi ro & chất lượng lợi nhuận (Section F).
**Verification:**
- [x] Kiểm thử tạo báo cáo cho mã đã có dữ liệu R2 và mã chưa có dữ liệu R2.
- [x] Báo cáo hiển thị đầy đủ, không thiếu mục.
**Dependencies:** Task 4
**Files touched:**
- `src/lib/ai-analyzer.ts`
**Estimated scope:** Medium (1-2 files)

---

### Task 6: Xây dựng API Route Trạng Thái Qualitative (`src/app/api/analysis/qualitative-status/route.ts`)
**Description:** Xây dựng endpoint nhẹ để Web UI kiểm tra mã cổ phiếu hiện tại đã có bản bóc tách định tính trên R2 chưa.
**Acceptance criteria:**
- [x] Endpoint `GET /api/analysis/qualitative-status?ticker=XXX` trả về: `{ hasData: boolean, analyzedAt?: string, industryModel?: string, sources?: string[] }`.
- [x] Thời gian phản hồi cực nhanh (< 100ms) nhờ đọc metadata hoặc file cache.
**Verification:**
- [x] Test request GET `/api/analysis/qualitative-status?ticker=HDC`.
**Dependencies:** Task 2
**Files touched:**
- `src/app/api/analysis/qualitative-status/route.ts`
**Estimated scope:** Small (1 file)

---

### Task 7: Cập nhật Web UI Hiển Thị Trạng Thái R2 & Luận Điểm Định Tính
**Description:** Cập nhật giao diện trang phân tích để người dùng biết báo cáo đã được tích hợp dữ liệu định tính chuyên sâu từ R2 (BCTN, NQ ĐHCĐ, Báo cáo CTCK).
**Acceptance criteria:**
- [x] Hiển thị thông báo trạng thái đồng bộ R2 tinh tế, trang nhã.
- [x] Tuân thủ nguyên tắc typography tự nhiên của người dùng (không dùng viền kẻ trái đậm thô, không dùng hộp viền màu mè, không dùng badge xanh thô).
- [x] Các phần hiển thị Chuỗi giá trị và Dự án trọng điểm render dữ liệu từ R2 sắc nét.
**Verification:**
- [x] Kiểm tra hiển thị trên trình duyệt ở cả giao diện Sáng & Tối (Light & Dark mode).
**Dependencies:** Task 5, Task 6
**Files touched:**
- `src/components/ReportViewer.tsx`
- `src/app/page.tsx`
**Estimated scope:** Small (1-2 files)

---

## Checkpoint 3: Sau Phase 3
- [x] Toàn bộ trải nghiệm người dùng từ Web UI được tối ưu tốc độ (< 8s) và hiển thị sâu sắc dữ liệu định tính từ R2.
- [x] Tất cả các bài test giao diện và API route hoạt động trơn tru.

---

## Phase 4: Automation CI/CD (GitHub Actions)

### Task 8: Xây dựng GitHub Actions Workflow Tự Động Hóa (`.github/workflows/daily-stock-extractor.yml`)
**Description:** Tạo file workflow chạy định kỳ hàng ngày và hỗ trợ chạy thủ công theo yêu cầu để tự động hóa quy trình trích xuất Stage 1.
**Acceptance criteria:**
- [x] Lịch chạy tự động cron: `0 11 * * 1-5` (18:00 ICT thứ 2 đến thứ 6 sau giờ giao dịch).
- [x] Hỗ trợ trigger thủ công `workflow_dispatch` với input `ticker` (để trích xuất ngay 1 mã bất kỳ) hoặc `mode: auto-adtv5`.
- [x] Thiết lập đầy đủ các biến Secrets cần thiết: `GEMINI_API_KEY`, `CLOUDFLARE_R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
**Verification:**
- [x] Kiểm tra cú pháp YAML của GitHub Actions hợp lệ.
**Dependencies:** Task 4
**Files touched:**
- `.github/workflows/daily-stock-extractor.yml`
**Estimated scope:** Small (1 file)

---

## Checkpoint 4: Phase X - Tổng Kiểm Thử & Nghiệm Thu
- [x] Chạy kiểm tra tĩnh toàn diện: `npx tsc --noEmit` không có lỗi.
- [x] Build production: `npm run build` thành công 100%.
- [x] Cập nhật tài liệu `.env.example` với các biến môi trường R2 mới.
- [x] Bàn giao sản phẩm hoàn chỉnh theo đúng biên bản handoff.
