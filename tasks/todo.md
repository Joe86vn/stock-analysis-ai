# Task Checklist: Tối Ưu Hóa Pipeline AI (Option A + B)

## Phase 1: Full Report Caching Engine (Option B)
- [x] Task 1: Bổ sung hàm lưu & đọc Full Report Cache trong `src/lib/r2-storage.ts` (`putFullReportCache`, `getFullReportCache`)
- [x] Task 2: Tích hợp Cache vào API Route `/api/analysis/generate/route.ts` (nhận `forceRefresh`, tự động đọc/ghi cache)
- [x] Task 3: Giao diện Web UI (`src/app/page.tsx`, `src/components/ReportViewer.tsx`) hiển thị badge Cache và nút "Phân tích lại (Bắt buộc)"
- [x] Checkpoint 1: Kiểm thử Caching: lần 1 lưu cache, lần 2 trả về tức thì 0 token, lần 3 force refresh gọi lại AI

## Phase 2: Prompt Pruning & Smart Merge R2 (Option A)
- [x] Task 4: Tái cấu trúc Prompt Stage 2 trong `src/lib/ai-analyzer.ts`: loại bỏ yêu cầu sinh Section A & B khi đã có R2
- [x] Task 5: Xây dựng cơ chế Smart Merge trong `buildReportFromParsed`: kế thừa trực tiếp Section A & B từ R2 ghép với C, D, E, F
- [x] Task 6: Tinh chỉnh chỉ dẫn Section F: bắt buộc luận giải 4 nhân tố (Q, P, Thị phần, Mùa vụ) & 3 biên lợi nhuận
- [x] Checkpoint 2: Kiểm thử Output JSON ngắn gọn, đo lường giảm 50% token, kiểm tra hiển thị 6 tabs trên UI

## Phase 3: Final Validation & Clean Code
- [x] Task 7: Kiểm thử toàn diện: `npx tsc --noEmit` & `npm run build` (Passed 100%)
- [x] Task 8: Cập nhật tài liệu `TECH_ARCHITECTURE.md` và `docs/session-handoff.md`
- [x] Final Checkpoint: Hệ thống hoạt động hoàn hảo, sẵn sàng triển khai lên Vercel

---

# Task Checklist: Tự Động Thu Thập & Số Hóa BCTC từ SSC (UBCKNN)
*Chi tiết kiến trúc & tiêu chí nghiệm thu tại: [task-ssc-bctc-earnings-crawler.md](file:///d:/2%20ANTIGRAVITY/analysis-report/tasks/task-ssc-bctc-earnings-crawler.md)*

## Phase 1: Nền tảng Dữ liệu, Manifest Chống trùng & Bộ lọc Ngành
- [x] Task 1.1: Định nghĩa Types & Contracts cho Module KQKD (`src/types/earnings.ts`)
- [x] Task 1.2: Xây dựng Manifest Engine chống trùng lặp (`src/lib/ssc-manifest-store.ts`)
- [x] Task 1.3: Crawler lấy tin tức từ SSC & Bộ lọc loại trừ ngành tài chính (`src/lib/ssc-crawler-service.ts`)
- [x] Checkpoint 1: Xác nhận Crawler & Deduplication (chạy thử cào 1 trang, lọc mã NH/CK/BH, chạy lại không trùng)

## Phase 2: Tải PDF Tạm, Định vị Trang KQKD & Số Hóa Gemini
- [x] Task 2.1: Bộ định vị trang KQKD (`src/lib/ssc-pdf-locator.ts`) & Xóa tệp PDF tự động
- [x] Task 2.2: Trích xuất số liệu chuẩn hóa & Tính % YoY bằng Gemini Flash (`src/lib/ssc-earnings-extractor.ts`)
- [x] Checkpoint 2: Xác nhận độ chính xác số hóa 3 BCTC mẫu & Dọn dẹp sạch thư mục tạm

## Phase 3: Quản Lý Bảng Dữ Liệu & API Endpoints
- [x] Task 3.1: Earnings Store & Cơ chế Rollover theo kỳ báo cáo (`src/lib/earnings-store.ts`)
- [x] Task 3.2: API Endpoints cho Manual Trigger & Scheduled Cronjob (`/api/earnings/...`)
- [x] Checkpoint 3: Xác nhận API endpoints hoạt động chuẩn xác

## Phase 4: Giao Diện Người Dùng (ValueX UI) & Vận Hành Cronjob
- [x] Task 4.1: Component Bảng "Cập nhật Kết Quả Kinh Doanh Mới Nhất" kèm bộ lọc nhanh
- [x] Task 4.2: Tích hợp Nút Bấm "Quét BCTC Mới Nhất" (Manual Trigger UI) kèm trạng thái
- [x] Task 4.3: Thiết lập Cronjob 8h & 17h trên VPS Oracle + Push git & Reload PM2
- [x] Final Checkpoint: Typecheck `npx tsc --noEmit` & `npm run build` thành công 100%

