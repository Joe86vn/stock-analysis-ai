# AGENTS.md — analysis-report (Stock Analysis AI Platform)

## Dự án
Web app phân tích cổ phiếu tự động (ValueX) — Next.js 15 + React 19 + TypeScript + TailwindCSS 4, Gemini AI, Cloudflare R2; dữ liệu thị trường từ Vietcap / Cafef / Vietstock / Simplize.

- Thư mục dự án: `D:/2 ANTIGRAVITY/analysis-report`
- Tài liệu chính: `PRD.md`, `PLAN.md`, `TECH_ARCHITECTURE.md`, `analysis-guide.md`, `docs/session-handoff.md`, `docs/TEAM.md`
- Trạng thái & backlog: `tasks/plan.md`, `tasks/todo.md`

## Quy tắc làm việc (bắt buộc)
1. Đọc file này và tài liệu liên quan TRƯỚC khi sửa code.
2. Không sửa file nằm ngoài thư mục dự án.
3. Phân tích trước, sửa code sau; thay đổi tối thiểu, đúng phạm vi task.
4. Sau khi sửa code: chạy `npx tsc --noEmit`; nếu liên quan build thì chạy `npm run build`.
5. Không bịa dữ liệu API — kiểm chứng bằng request thực tế (curl).
6. API Vietcap yêu cầu header `Referer`/`Origin` đúng domain (`iq.vietcap.com.vn` hoặc `ai.vietcap.com.vn`) — thiếu header sẽ bị 403.

## Team Hermes (7 profile)
- **coordinator** (claude-sonnet-4-6) — Team lead: nhận yêu cầu từ user, phân rã task, điều phối, tổng hợp & báo cáo.
- **developer** (gemini-3.8-flash-high) — Implement code frontend/backend.
- **researcher** (gpt-5.6-luna) — Nghiên cứu API, nguồn dữ liệu, nghiệp vụ.
- **reviewer** (gemini-3.7-flash-high) — Review code & kiến trúc trước khi tích hợp.
- **qa** (gpt-5.6-luna) — Typecheck, build, test API, xác nhận tính năng.
- **writer** (gpt-5.6-luna) — Tài liệu, báo cáo, handoff.
- **designer** (qwen3.8-omni-flash free qua xKiro) — UI/UX, biểu đồ, component trực quan.

## Quy trình phối hợp
1. User gửi yêu cầu tại Discord thread analysis-report → **coordinator** tiếp nhận (thread này đã được route tới coordinator qua `gateway.profile_routes`).
2. Coordinator phân rã yêu cầu thành task trên kanban board `analysis-report` (`hermes kanban --board analysis-report ...`) và gán cho profile phù hợp, hoặc dùng delegate_task.
3. Chuyên gia thực thi theo đúng quy tắc ở trên; **reviewer** kiểm tra; **qa** xác nhận.
4. Coordinator tổng hợp kết quả và báo cáo lại user trong thread.

## Trạng thái hiện tại (2026-09-22)
- PLAN.md: Phase 0–3 hoàn thành; còn Task 4.4 (Docker + Deployment Guide).
- tasks/todo.md: pipeline cache Option A+B (R2 + Prompt Pruning) hoàn thành 100%.
- Đã fix lỗi 403 API Vietcap cho financials & news bằng header Referer/Origin.
- Chưa xử lý: market-watch/liquidity (upstream `trading.vietcap.com.vn/api/chart/v3/OHLCChart/gap-liquidity` trả 404 — cần tìm endpoint thay thế).
