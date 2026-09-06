# Kế Hoạch Triển Khai: Two-Stage AI Pipeline (ValueX 150 Điểm)

> Căn cứ: Biên bản bàn giao kỹ thuật `docs/session-handoff.md`, đặc tả `docs/prompt-1-extractor.md`, module `src/lib/industry-extractor-templates.ts` và hệ thống dữ liệu Vietcap IQ API.

---

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

Hệ thống giải quyết triệt để vấn đề thời gian chờ và giới hạn Vercel Serverless (timeout 60s) bằng việc tách biệt 2 giai đoạn:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: BATCH QUALITATIVE EXTRACTOR (GitHub Actions / Scheduled Batch)                │
│                                                                                        │
│  Mã CP (Ticker)                                                                       │
│     │                                                                                  │
│     ├─► 1. Vietcap Details API: Lấy icbCodeLv2                                         │
│     │      └─► industry-extractor-templates: Lấy hướng dẫn bóc tách theo ngành         │
│     │                                                                                  │
│     ├─► 2. crawl-report-service: Lấy danh mục URLs & Metadata CTCK từ Simplize         │
│     │      └─► Tải PDFs (BCTN, NQ ĐHCĐ, 2-3 Báo cáo CTCK mới nhất)                    │
│     │                                                                                  │
│     ├─► 3. GoogleAIFileManager: Upload PDF trực tiếp lên Gemini Native File API        │
│     │                                                                                  │
│     ├─► 4. Prompt 1 (Zero-Loss Extractor): Gemini 2.5 Flash đọc PDF & trích xuất       │
│     │      └─► JSON 6 Section (sectionA -> sectionF) chuẩn schema                      │
│     │                                                                                  │
│     └─► 5. r2-storage: Lưu JSON vào Cloudflare R2 (stock-reports/{ticker}/latest.json) │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: REAL-TIME VALUEX SYNTHESIZER (Web App / Next.js on Vercel)                    │
│                                                                                        │
│  User bấm "Phân tích AI" tại Web UI                                                    │
│     │                                                                                  │
│     ├─► 1. r2-storage: Đọc JSON định tính (Section A-F) từ R2 (< 0.2s)                 │
│     │                                                                                  │
│     ├─► 2. vietcap-field-mapping: Lấy 12-20 quý tài chính & P/E thực tế (< 0.5s)       │
│     │                                                                                  │
│     ├─► 3. Prompt 2 (ValueX Synthesizer): Gemini 2.5 Flash tổng hợp báo cáo 150 điểm   │
│     │      └─► Không cần upload PDF nặng nề, tốc độ < 8s, chất lượng đỉnh cao          │
│     │                                                                                  │
│     └─► 4. Render Báo Cáo ValueX 150 Điểm: Đầy đủ chuỗi giá trị, dự án, định giá       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Quyết Định Kỹ Thuật (Architecture Decisions)

1. **Gemini Native File API (`GoogleAIFileManager`)**:
   - Sử dụng package có sẵn `@google/generative-ai/server` để upload PDF trực tiếp lên Gemini File API.
   - Không cần tách trang PDF thành ảnh (tiết kiệm thời gian, chi phí và độ phức tạp mã nguồn).
   - Tự động xóa file trên Gemini sau khi trích xuất để giải phóng tài nguyên.

2. **Cloudflare R2 Storage (`@aws-sdk/client-s3`)**:
   - Tận dụng `@aws-sdk/client-s3` đã có sẵn trong dự án để tương tác với Cloudflare R2 S3-compatible API.
   - Đường dẫn chuẩn hóa: `stock-reports/{ticker}/qualitative-latest.json`.
   - Cơ chế Local Cache Fallback: Khi chạy ở môi trường phát triển (chưa có credentials R2) hoặc offline, tự động lưu và đọc từ `data/insights/{ticker}.json`.

3. **Bảo toàn Metadata Simplize (Nguyên tắc Zero-Loss)**:
   - Các trường `source`, `issueDate`, `title`, `targetPrice`, `recommend` từ Simplize API được inject trực tiếp vào JSON, tuyệt đối không để AI đoán lại nhằm loại trừ hoàn toàn ảo giác (hallucination).

4. **16 Ngành ICB Level 2 Tự Động**:
   - Tự động map `icbCodeLv2` từ Vietcap API qua `getIndustryTemplate()` để hướng dẫn Gemini tập trung đúng bản chất mô hình kinh doanh (ví dụ: Chứng khoán bóc tách 4 mảng doanh thu Margin/Tự doanh/Môi giới/IB; Bất động sản bóc tách Quỹ đất/Pháp lý/Presales).

---

## 3. Danh Sách Nhiệm Vụ Chi Tiết (Phased Task Breakdown)

### Phase 1: Foundation & Types & Storage Client (Infra & Backend)
- **Task 1: Định nghĩa Type Definitions cho Qualitative Insights** (`src/types/qualitative.ts`)
  - Định nghĩa đầy đủ TypeScript interfaces cho JSON 6 Section theo đặc tả `docs/prompt-1-extractor.md`.
- **Task 2: Xây dựng Module Quản Lý Storage Cloudflare R2 & Local Fallback** (`src/lib/r2-storage.ts`)
  - Hàm `putQualitativeReport(ticker, data)`: Ghi lên R2 và đồng bộ local cache.
  - Hàm `getQualitativeReport(ticker)`: Đọc từ R2 với fallback đọc local cache.

### Phase 2: Core Batch Extractor Script (Stage 1)
- **Task 3: Xây dựng Downloader & Gemini File API Manager** (`scripts/lib/gemini-file-uploader.ts`)
  - Tải file PDF từ URLs (Cafef, Vietstock, Simplize CDN) với retry và timeout an toàn.
  - Upload file lên Gemini File API và cung cấp hàm dọn dẹp file tự động.
- **Task 4: Xây dựng Script Extractor Hoàn Chỉnh** (`scripts/extract-qualitative-data.ts`)
  - CLI runner: Hỗ trợ `--ticker=XXX`, `--batch=AAA,BBB,CCC`, hoặc `--auto-adtv5` (tự động lấy toàn bộ danh sách cổ phiếu có ADTV 20 ngày >= 5 Tỷ từ Vietcap Screener API `executeVietcapScreener({ adtvMinBillion: 5 })`).
  - Tích hợp Vietcap ICB, Template 16 ngành, Simplize metadata, Prompt 1 Master, JSON validator và R2 persistence.

### Phase 3: Synthesizer & Web Integration (Stage 2)
- **Task 5: Nâng cấp Prompt 2 trong `src/lib/ai-analyzer.ts` để đọc Qualitative Data từ R2**
  - Tích hợp `getQualitativeReport(ticker)` vào luồng phân tích.
  - Khi có dữ liệu R2: Inject vào prompt để tổng hợp báo cáo 150 điểm siêu tốc (<8s) với luận điểm chuyên sâu.
  - Khi chưa có dữ liệu R2: Tự động fallback êm dịu theo luồng hiện tại.
- **Task 6: Xây dựng API Route Trạng Thái Qualitative** (`src/app/api/analysis/qualitative-status/route.ts`)
  - Endpoint `GET /api/analysis/qualitative-status?ticker=XXX` trả về trạng thái dữ liệu định tính đã có sẵn hay chưa.
- **Task 7: Cập nhật Web UI Hiển Thị Nguồn Dữ Liệu R2** (`src/app/page.tsx`, `src/components/StockAnalysisReport.tsx`)
  - Hiển thị badge trạng thái tự nhiên, trang nhã (không dùng viền thô, không dùng hộp màu mè, tuân thủ typography tự nhiên).

### Phase 4: Automation CI/CD (GitHub Actions)
- **Task 8: Xây dựng GitHub Actions Workflow Tự Động Hóa** (`.github/workflows/daily-stock-extractor.yml`)
  - Lịch chạy định kỳ 18:00 ICT (11:00 UTC) các ngày giao dịch.
  - Hỗ trợ `workflow_dispatch` để trích xuất thủ công 1 mã bất kỳ hoặc danh sách top RS.

---

## 4. Quản Lý Rủi Ro & Giải Pháp (Risks & Mitigations)

| Rủi Ro | Mức Độ | Giải Pháp |
| :--- | :--- | :--- |
| **PDF bị lỗi hoặc link không tải được** | Trung bình | Cơ chế retry 3 lần; nếu 1 file PDF hỏng, tiếp tục với các file còn lại thay vì dừng toàn bộ tiến trình. |
| **Gemini File API rate limit khi chạy batch lớn** | Trung bình | Giãn cách gọi giữa các mã (delay 5s giữa mỗi ticker), xử lý tuần tự từng mã. |
| **Chưa có biến môi trường R2 ở local** | Thấp | Tự động chuyển sang chế độ Local Cache tại `data/insights/{ticker}.json`, không làm gián đoạn việc phát triển. |
| **JSON trả về bị thiếu trường** | Thấp | Viết validator schema đảm bảo fallback các trường rỗng an toàn, không làm crash Prompt 2. |
