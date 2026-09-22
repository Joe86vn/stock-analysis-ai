# TEAM.md — Hermes Multi-Profile Team (analysis-report)

> Tạo 2026-09-22. Định nghĩa phân công và quy trình phối hợp của 7 Hermes profile cho dự án analysis-report.

## Phân công công việc

- **coordinator** (claude-sonnet-4-6, commandcode) — Team lead: tiếp nhận yêu cầu từ user, phân rã thành task, gán cho đúng chuyên gia, tổng hợp và báo cáo kết quả.
- **developer** (gemini-3.8-flash-high, commandcode) — Implement code frontend/backend: phân tích trước khi sửa, thay đổi tối thiểu, chạy typecheck/build sau khi sửa.
- **researcher** (gpt-5.6-luna, commandcode) — Nghiên cứu API & nguồn dữ liệu (Vietcap, Cafef, Vietstock, Simplize), nghiệp vụ chứng khoán, đề xuất giải pháp.
- **reviewer** (gemini-3.7-flash-high, commandcode) — Phản biện code & kiến trúc trước khi tích hợp: chất lượng, tuân thủ quy tắc, rủi ro bảo mật.
- **qa** (gpt-5.6-luna, commandcode) — Kiểm thử: `npx tsc --noEmit`, `npm run build`, test API bằng curl, xác nhận tính năng hoạt động thực tế.
- **writer** (gpt-5.6-luna, commandcode) — Viết/cập nhật tài liệu: `TECH_ARCHITECTURE.md`, `docs/session-handoff.md`, báo cáo tiến độ.
- **designer** (qwen/qwen3.8-omni-flash:free, api.xkiro.com) — Thiết kế UI/UX, biểu đồ, component trực quan (chart, dashboard, dark/light theme).

## Routing & hạ tầng phối hợp

- Discord thread `1551782745233948745` (kênh #general / analysis-report) được route tới **coordinator** qua `gateway.profile_routes` trong `config.yaml` của Hermes (yêu cầu `hermes gateway restart` sau khi thay đổi).
- Kanban board chung: **analysis-report** (`hermes kanban --board analysis-report ...`). Coordinator tạo task và gán (`assign`) cho profile phù hợp; các profile nhận task, thực thi, `complete`; reviewer kiểm tra trước khi đóng task.
- Mô tả vai trò từng profile đã lưu qua `hermes profile describe` (kanban orchestrator đọc mô tả này khi phân task).

## Quy trình làm việc chuẩn

1. User gửi yêu cầu trong thread → coordinator tiếp nhận.
2. Coordinator đọc tài liệu dự án (PRD.md, PLAN.md, docs/session-handoff.md, file này), phân rã yêu cầu thành task trên kanban board `analysis-report`.
3. Chuyên gia thực thi theo quy tắc bên dưới; developer/researcher làm trước, reviewer phản biện, qa xác nhận, writer cập nhật tài liệu nếu cần.
4. Coordinator tổng hợp kết quả và báo cáo lại user trong thread.

## Quy tắc chung (bắt buộc với mọi profile)

1. Đọc tài liệu dự án TRƯỚC khi sửa code.
2. Không sửa file nằm ngoài `D:/2 ANTIGRAVITY/analysis-report`.
3. Phân tích trước, sửa code sau; thay đổi tối thiểu, đúng phạm vi task.
4. Sau khi sửa code: chạy `npx tsc --noEmit`; liên quan build thì chạy `npm run build`.
5. Không bịa dữ liệu API — kiểm chứng bằng request thực tế.
6. API Vietcap cần header `Referer`/`Origin` đúng domain (`iq.vietcap.com.vn` / `ai.vietcap.com.vn`), thiếu sẽ bị 403.

## Trạng thái hiện tại (2026-09-22)

- PLAN.md: Phase 0–3 hoàn thành; còn Task 4.4 (Docker + Deployment Guide).
- tasks/todo.md: pipeline cache Option A+B (R2 + Prompt Pruning) hoàn thành 100%.
- Đã fix lỗi 403 Vietcap cho financials & news (thêm header Referer/Origin).
- Chưa xử lý: market-watch/liquidity — upstream `trading.vietcap.com.vn/api/chart/v3/OHLCChart/gap-liquidity` trả 404, cần researcher tìm endpoint thay thế.