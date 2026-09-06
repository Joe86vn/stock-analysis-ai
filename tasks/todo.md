# Task Checklist: Tab Định Giá (Tab H) — ValueX Valuation Hub

## Phase 1: Foundation
- [x] Task 1: Bổ sung Types trong `src/types/analysis.ts`
- [x] Task 2: API Route `/api/stocks/[ticker]/valuation-stats` (Lịch sử P/E, P/B 20 quý + IQR filter)
- [x] Task 3: API Route `/api/stocks/[ticker]/peers` (Top 3 ICB peers theo vốn hóa)
- [x] Checkpoint 1: Foundation build & API verification

## Phase 2: Statistical Engine
- [x] Task 4: Thư viện thuần túy `src/lib/valuation-engine.ts` (7 presets, $\mu \pm 1\sigma$, R/R ratio, narrative)
- [x] Checkpoint 2: Engine pure functions & typecheck verification

## Phase 3: UI Sub-Components
- [x] Task 5: `src/components/valuation-hub/DataBridgeBanner.tsx` (6 metric TTM Forward)
- [x] Task 6: `src/components/valuation-hub/MethodSelector.tsx` (Chọn ngành, toggle, trọng số, thống kê)
- [x] Task 7: `src/components/valuation-hub/MethodDetailPanels.tsx` (Accordion chi tiết, DCF 3x3)
- [x] Task 8: `src/components/valuation-hub/ScenarioSummary.tsx` (3 kịch bản, R/R, Recharts bar chart)
- [x] Checkpoint 3: UI sub-components typecheck verification

## Phase 4: Integration
- [x] Task 9: `src/components/ValuationHub.tsx` (Orchestrator kết nối data & sub-components)
- [x] Task 10: `src/components/ReportViewer.tsx` (Gắn Tab H vào ValuationHub)
- [x] Checkpoint 4: Full integration & Next.js production build

## Phase 5: Polish & Guard Rules
- [x] Task 11: 5 Guard Rules (Bull PE capped by peer max, weight normalization, valid quarters warning, R/R red flag banner, DCF sensitivity)

## Phase 6: Executive Layout & Visual Refinement (Approved Adjustments)
- [x] Task 12: API `/api/stocks/[ticker]/price-history` (Lịch sử giá 6 tháng ~130 phiên từ Vietcap IQ API)
- [x] Task 13: `ReportViewer.tsx` — Chuyển luận điểm ước lượng KQKD sang Tab F; xóa bỏ 2 biểu đồ dự phóng độc lập cũ
- [x] Task 14: `ValuationHub.tsx` — Đưa Phân khu Tổng Hợp Kịch Bản & Thước Đo R/R lên đầu (Executive First); fetch lịch sử giá
- [x] Task 15: `ScenarioSummary.tsx` — Tương thích 100% Light/Dark mode, biểu đồ giá 6 tháng dạng Area nét đứt với 4 đường mục tiêu (Bear, Base, Bull, Hiện tại), cấu trúc hóa chi tiết các giả định
- [x] Task 16: Chuẩn hóa Light/Dark mode cho `DataBridgeBanner.tsx`, `MethodSelector.tsx`, và `MethodDetailPanels.tsx`
- [x] Final Checkpoint: Next.js production build clean (0 errors)
