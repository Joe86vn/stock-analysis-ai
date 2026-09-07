# Implementation Plan: Tối Ưu Hóa Pipeline AI (Full Report Caching & Prompt Pruning)

## Overview
Kế hoạch nâng cấp và tối ưu hóa toàn diện luồng phân tích AI của hệ thống ValueX. Giải quyết triệt để vấn đề hạn mức API Gemini (RPM / RPD / Token Limits) bằng cách kết hợp:
1. **Option B (Full Report Caching)**: Lưu trữ báo cáo hoàn chỉnh vào Cloudflare R2 & Local Disk Cache (TTL 7 ngày), giảm 80-90% số lượt gọi API trùng lặp cho cùng một mã cổ phiếu.
2. **Option A (Prompt Pruning & Smart Merge)**: Tái sử dụng 100% dữ liệu Section A (Lịch sử, Cổ đông) và Section B (Chuỗi giá trị) đã có sẵn từ Cloudflare R2; chỉ yêu cầu Gemini tập trung luận giải Section C, D, E (150 điểm ValueX) và Section F (Dự phóng 4 quý & Định giá). Giảm 50% Output Token và giảm 50% thời gian phản hồi.

---

## Architecture Decisions

- **Decision 1 (Two-Tier Cache Hierarchy)**:
  - Tầng 1: Local Cache (`data/reports/{ticker}.json`) cho tốc độ đọc siêu tốc < 5ms.
  - Tầng 2: Cloudflare R2 Storage (`stock-reports/{ticker}/full-report-latest.json`) để đồng bộ xuyên suốt các phiên và các môi trường (Vercel Serverless).
  - TTL: 7 ngày (168 giờ). Sau 7 ngày hoặc khi người dùng yêu cầu `forceRefresh`, hệ thống mới kích hoạt Gemini chạy lại.

- **Decision 2 (Smart Merge Pattern)**:
  - Khi `qualitativeInsights` đã có trên R2 (từ Stage 1 Batch Extractor), loại bỏ chỉ dẫn yêu cầu sinh Section A và Section B khỏi prompt gửi tới Gemini.
  - Sau khi nhận JSON Section C, D, E, F từ Gemini, hàm `buildReportFromParsed` sẽ tự động ghép Section A và Section B từ R2 vào báo cáo cuối cùng. Đảm bảo dữ liệu chi tiết, không bị AI tóm tắt ngắn cụt, đồng thời tiết kiệm hàng ngàn token.

- **Decision 3 (Explicit User Control - Force Refresh)**:
  - Bổ sung nút "Phân tích lại (Bắt buộc)" trên giao diện để người dùng có thể xóa cache và ép AI phân tích lại khi có tin tức mới.
  - Hiển thị nhãn trực quan: `⚡ Báo cáo từ bộ nhớ đệm (Cache: [Thời gian])` hoặc `✨ Phân tích mới từ Gemini 3.7 Flash`.

---

## Task List

### Phase 1: Full Report Caching Engine (Option B)
- [ ] **Task 1**: Bổ sung hàm lưu & đọc Full Report Cache trong `src/lib/r2-storage.ts` (`putFullReportCache`, `getFullReportCache`).
- [ ] **Task 2**: Tích hợp Cache vào API Route `/api/analysis/generate/route.ts` (hỗ trợ cờ `forceRefresh` và tự động ghi cache sau khi sinh).
- [ ] **Task 3**: Cập nhật Frontend UI (`src/app/page.tsx`, `src/components/ReportViewer.tsx`) hiển thị trạng thái Cache và nút "Phân tích lại (Bắt buộc)".

### Checkpoint 1: Caching Engine Verification
- [ ] Chạy kiểm thử API `/api/analysis/generate` lần 1: Tạo báo cáo và ghi nhận cache.
- [ ] Chạy kiểm thử lần 2: Báo cáo trả về tức thì (< 100ms), không tiêu tốn token Gemini.
- [ ] Test nút Force Refresh: Hệ thống xóa cache cũ và gọi AI sinh mới.

### Phase 2: Prompt Pruning & Smart Merge R2 (Option A)
- [ ] **Task 4**: Tinh gọn Prompt Stage 2 trong `src/lib/ai-analyzer.ts`: bỏ qua Section A & B khi đã có dữ liệu R2.
- [ ] **Task 5**: Xây dựng cơ chế Smart Merge trong `buildReportFromParsed`: kế thừa trực tiếp Section A & B từ R2 ghép cùng Section C, D, E, F từ AI.
- [ ] **Task 6**: Chuẩn hóa sâu chỉ dẫn Section F (Cầu nối dự phóng 4 nhân tố: Q, P, Thị phần, Mùa vụ & 3 Biên LN).

### Checkpoint 2: Token & Output Quality Verification
- [ ] Đo lường kích thước Output JSON (giảm từ ~4.500 xuống ~2.000 tokens).
- [ ] Đo lường thời gian sinh báo cáo (giảm ~50%).
- [ ] Kiểm tra tính toàn vẹn của 6 Tabs hiển thị trên `ReportViewer.tsx`.

### Phase 3: Final Validation & Clean Code
- [ ] **Task 7**: Typecheck `npx tsc --noEmit` & Next.js production build `npm run build`.
- [ ] **Task 8**: Đồng bộ tài liệu kỹ thuật `TECH_ARCHITECTURE.md` và `docs/session-handoff.md`.

---

## Risks and Mitigations

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
| :--- | :---: | :--- |
| **Dữ liệu R2 cũ không đồng bộ với quý mới nhất** | Trung bình | Cache có TTL 7 ngày; nếu phát hiện quý thực tế từ Vietcap mới hơn thời điểm cache, tự động hủy cache để phân tích lại. |
| **Cổ phiếu chưa có dữ liệu trên R2** | Thấp | Fallback tự động: Nếu chưa có R2, prompt sẽ quay lại sinh đầy đủ cả Section A, B như trước mà không gây lỗi. |
| **Lỗi mạng khi upload lên Cloudflare R2** | Thấp | Luôn ghi bản copy vào Local Disk Cache trước; nếu R2 lỗi mạng thì vẫn dùng được Local Cache an toàn. |

---

## Open Questions
- Không có (Đã thống nhất hướng kết hợp A + B).
