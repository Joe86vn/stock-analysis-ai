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

## Phase 5: Bộ Lọc Chuyên Sâu Đa Tiêu Chí (PAT Tuyệt Đối, ADTV 20P, RS Rating)
- [x] Task 5.1: Mở rộng Model & Data Types (`EarningsRecord`, `EarningsFilterParams`) hỗ trợ `rsRating`, `adtv20Billion`, `minPatAbsolute`, `minAdtv20`, `minRs`.
- [x] Task 5.2: Xây dựng Module `src/lib/earnings-market-enricher.ts` kết nối Screener IQ Vietcap lấy RS & ADTV 20 phiên theo thời gian thực (in-memory cache 15p).
- [x] Task 5.3: Nâng cấp API `/api/earnings/latest` hỗ trợ dynamic enrichment và truy vấn kết hợp đa tiêu chí.
- [x] Task 5.4: Nâng cấp Giao diện `src/components/earnings/LatestEarningsTable.tsx` với thanh "Lọc chuyên sâu":
  - LNST kỳ này: > 5 tỷ, > 10 tỷ, > 20 tỷ, > 50 tỷ, > 100 tỷ
  - Thanh khoản 20 phiên: > 1 tỷ, > 3 tỷ, > 5 tỷ, > 10 tỷ, > 20 tỷ
  - Sức mạnh giá RS: > 60, > 70, > 80
  - Bổ sung 2 cột hiển thị trực quan `RS` (Badge màu) và `GTGD 20P` (tỷ VNĐ) kèm tính năng click tiêu đề sắp xếp.
## Phase 6: Tự Động Hóa Kỳ Báo Cáo Theo Lịch Dương & Lọc Nhập Liệu Trực Tiếp
- [x] Task 6.1: Tự động hóa xác định kỳ báo cáo theo thời gian thực trong `calculateCurrentReportPeriod()`:
  - 01/01 - 31/03: Quý 4 năm trước (fromDate: 01/01)
  - 01/04 - 30/06: Quý 1 năm nay (fromDate: 01/04)
  - 01/07 - 30/09: Quý 2 năm nay (fromDate: 01/07)
  - 01/10 - 31/12: Quý 3 năm nay (fromDate: 01/10)
  - Tự động lưu trữ (archive) kỳ cũ và khởi tạo kỳ mới khi bước qua mốc thời gian tiếp theo mà không cần thao tác người dùng.
- [x] Task 6.2: Xóa bỏ nút bấm "Chuyển kỳ" và Modal chuyển kỳ thủ công trên giao diện ValueX.
- [x] Task 6.3: Thiết kế lại toàn diện thanh "Lọc theo chỉ tiêu tài chính & thị trường" cho phép **nhập trực tiếp giá trị cụ thể**:
  - Doanh thu tối thiểu (tỷ VNĐ)
  - Tăng trưởng doanh thu (% YoY)
  - LNST tối thiểu (tỷ VNĐ)
  - Tăng trưởng LNST (% YoY)
  - GTGD 20P tối thiểu (tỷ VNĐ/phiên)
  - Chỉ số RS tối thiểu (0 - 99)
  - Bổ sung nút "Xóa bộ lọc" khi đang có bộ lọc hoạt động.
- [x] Task 6.4: Thêm tính năng click sắp xếp theo giá trị Doanh Thu Thuần trên header bảng (`revenueCurrent`).
- [x] Task 6.5: Typecheck `tsc --noEmit` đạt 100%, commit GitHub và build deploy thành công lên Oracle Cloud VPS (`valuex.duckdns.org`).

## Phase 7: Hoàn Thiện Trải Nghiệm Bộ Lọc & Tối Ưu Bảng KQKD
- [x] Task 7.1: Khắc phục triệt để lỗi ấn phím ESC bị hiển thị `null` ở các ô lọc (gán `handleInputKeyDown` với `preventDefault()` & `stopPropagation()`, làm sạch DOM value và reset trang về 1).
- [x] Task 7.2: Tối ưu kích thước các ô lọc bằng Grid 8 cột (`grid-cols-2 sm:grid-cols-4 lg:grid-cols-8`) rộng đều nhau, lấp đầy toàn bộ chiều ngang thanh công cụ.
- [x] Task 7.3: Xóa bỏ cột "Thao tác" và tái cấu trúc tỉ lệ phần trăm các cột còn lại (`w-[...]`) để bảng vừa vặn màn hình, không bị cuộn ngang (horizontal scroll).
- [x] Task 7.4: Gán liên kết trực tiếp trên Mã CP tới trang Phân tích AI & Biểu đồ kỹ thuật.
- [x] Task 7.5: Bổ sung thanh phân trang (Pagination) chuyên nghiệp với mặc định **50 mã / trang**, hỗ trợ điều hướng trang đầu, trang trước, số trang, trang tiếp và trang cuối.
- [x] Checkpoint: Kiểm thử `npx tsc --noEmit` và `npm run build` thành công, đã deploy và reload PM2 lên Oracle VPS `valuex.duckdns.org`.

---

# Task Checklist: Đa Nguồn Dữ Liệu Thị Trường & BCTC (Vietcap ⇄ MAS-MCP Dual-Source)
*Chi tiết kiến trúc & phân tích tại: [tasks/plan.md](file:///d:/2%20ANTIGRAVITY/analysis-report/tasks/plan.md)*

## Phase 1: Nền Tảng Client & Chuẩn Hóa Provider Layer
- [x] Task 1.1: Xây dựng MAS-MCP Core Client (`src/lib/mas-mcp-client.ts`) quản lý session, Bearer token, auto retry & unwrap JSON
- [x] Task 1.2: Định nghĩa Data Provider Interface & Adapter (`src/lib/data-providers/`) ánh xạ MASVN & Vietcap về chuẩn chung `ParsedQuarter` & `PriceHistoryItem`
- [x] Task 1.3: Xây dựng Fallback Provider (Composite Provider) tự động đảo nguồn khi một bên lỗi (403/timeout/500)
- [x] Checkpoint 1: Xác nhận kết nối MAS-MCP, ánh xạ thử 2 mã FPT & REE, giả lập fallback thành công (Passed 100%)

## Phase 2: Nâng Cấp API Routes Hỗ Trợ Đa Nguồn (?source=)
- [x] Task 2.1: Nâng cấp API BCTC (`/api/stocks/[ticker]/financials/route.ts`) hỗ trợ query `?source=auto|vietcap|mas`
- [x] Task 2.2: Nâng cấp API Lịch sử giá EOD (`/api/stocks/[ticker]/price-history/route.ts`) hỗ trợ 26 năm lịch sử khi chọn `mas`
- [x] Checkpoint 2: Kiểm thử `curl` các API routes với 3 chế độ nguồn khác nhau (Passed 100%)

## Phase 3: Giao Diện Người Dùng (UI Switcher & Source Badge)
- [x] Task 3.1: Xây dựng `DataSourceContext` & hook `useDataSource` lưu trạng thái người dùng trong `localStorage`
- [x] Task 3.2: Thiết kế Component `DataSourceSelector` trên Navbar / Header (Tự động ⇄ Vietcap ⇄ MASVN)
- [x] Task 3.3: Hiển thị `SourceBadge` trên biểu đồ giá & bảng BCTC minh bạch nguồn dữ liệu phục vụ
- [x] Checkpoint 3: Kiểm thử chuyển đổi nguồn trên UI mượt mà, không gián đoạn giao diện (Passed 100%)

## Phase 4: Khai Thác Tính Năng Chuyên Sâu Của MAS-MCP
- [x] Task 4.1: Bổ sung API & UI Dòng tiền Tự doanh (`get_proprietary_flow`) trên Market Watch
- [x] Task 4.2: Tích hợp Bảng Chỉ số chuyên sâu Ngân hàng (`get_banking_financial_indicator`, `get_bank_top_bad_debt`)
- [x] Checkpoint 4: Xác nhận dữ liệu tự doanh và ngân hàng hiển thị chuẩn xác (Passed 100%)

## Phase 5: Pipeline Cào Dữ Liệu Sâu (Deep Crawler) & Đồng Bộ Tự Động
- [x] Task 5.1: Xây dựng Script cào sâu 26 năm EOD & 21 năm BCTC (`scripts/crawl-mas-universe-deep.ts`) theo cơ chế windowing an toàn
- [x] Task 5.2: Tích hợp nguồn MAS-MCP vào Cronjob đồng bộ EOD hàng ngày 15:15 (`scripts/sync-eod-ohlc.ts`)
- [x] Checkpoint 5: Chạy thử script cào sâu mẫu cho top cổ phiếu lâu năm và xác nhận dung lượng nhẹ (Passed 100%)

## Phase 6: Kiểm Thử Toàn Diện, Build & Đồng Bộ VPS Oracle
- [x] Task 6.1: Typecheck `npx tsc --noEmit` & Production Build `npm run build` (Passed 100% 0 errors)
- [x] Task 6.2: Git commit & push `origin/main` (Commit `1020311`)
- [x] Task 6.3: Đồng bộ lên Oracle Cloud VPS (`valuex.duckdns.org` qua MCP `oracle-vps:remote-ssh`): `git pull`, `npm run build`, `pm2 reload valuex`
- [x] Final Checkpoint: Kiểm tra trực tiếp trên `https://valuex.duckdns.org` hoạt động hoàn hảo cả 3 chế độ nguồn, auto-fallback bảo vệ hệ thống trước firewall ngoại cảnh.
