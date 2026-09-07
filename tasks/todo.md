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
