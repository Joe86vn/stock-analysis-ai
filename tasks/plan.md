# Implementation Plan: Đa Nguồn Dữ Liệu Thị Trường & BCTC (Vietcap ⇄ MAS-MCP Dual-Source)

## Overview
Xây dựng kiến trúc **Đa nguồn Dữ liệu (Dual-Source Provider Pattern)** cho ValueX, tích hợp **MAS-MCP (Mirae Asset Securities MCP)** song song với nguồn **Vietcap IQ API** hiện tại. 

Hệ thống cho phép:
1. **Không thay thế ngay Vietcap**: Giữ nguyên toàn bộ luồng dữ liệu Vietcap đang chạy ổn định.
2. **Chuyển đổi linh hoạt (Source Switcher)**: Người dùng có thể chủ động chọn nguồn xem trên giao diện Web UI (`Tự động (Dự phòng thông minh)`, `Vietcap IQ`, `MASVN`).
3. **Dự phòng lỗi tự động (Auto-Fallback)**: Khi nguồn ưu tiên gặp sự cố (403 Forbidden, 404 Not Found, Timeout), hệ thống tự động trích xuất dữ liệu từ nguồn dự phòng giúp giao diện không bao giờ bị gián đoạn.
4. **Mở rộng năng lực dữ liệu chuyên sâu**: Tận dụng lợi thế 26 năm lịch sử giá EOD (từ năm 2000), 21 năm BCTC (từ 2005), dữ liệu Dòng tiền Tự doanh và Chỉ số Ngân hàng (CAMEL, CASA, Nợ xấu) từ MASVN.

---

## Architecture Decisions

- **Decision 1: Provider Pattern & Unified Data Contracts (src/lib/providers/)**:
  - Tạo Interface chuẩn hóa `FinancialDataProvider` và `PriceDataProvider` để chuẩn hóa output của cả Vietcap và MAS-MCP về cùng kiểu dữ liệu (`ParsedQuarter`, `PriceHistoryItem`).
  - Gồm 3 Provider:
    - `VietcapProvider`: Đóng gói logic Vietcap hiện tại.
    - `MasMcpProvider`: Gọi trực tiếp Streamable HTTP endpoint `https://mcp.masvn.com/mcp` có quản lý token và session ID.
    - `FallbackProvider`: Chạy cơ chế Circuit Breaker / Try-Catch: Gọi nguồn A, nếu lỗi chuyển tức thì sang nguồn B và đính kèm cờ `sourceUsed` trong response.

- **Decision 2: Quản lý Phiên & Token MAS-MCP linh hoạt**:
  - MAS-MCP hỗ trợ Bearer Token cấu hình qua `.env` (`MASVN_TOKEN` / `mcp_config.json`).
  - Xây dựng `src/lib/mas-mcp-client.ts` tự động quản lý `mcp-session-id`, parse JSON an toàn (loại bỏ display rules), tự động retry khi gặp lỗi tạm thời.

- **Decision 3: API Query Routing (?source=auto|vietcap|mas)**:
  - Các API routes (`/api/stocks/[ticker]/financials`, `/api/stocks/[ticker]/price-history`, `/api/market-watch/...`) nhận query param `source`.
  - Nếu không truyền `source`, mặc định dùng `auto` (ưu tiên Vietcap, fallback sang MAS, hoặc cấu hình qua biến môi trường `DEFAULT_DATA_SOURCE`).

- **Decision 4: State & UI Switcher trên Frontend (React Context & LocalStorage)**:
  - Tạo `DataSourceContext` lưu lựa chọn nguồn dữ liệu trong `localStorage` (default: `'auto'`).
  - Đặt một Switcher component tinh tế trên thanh Navbar hoặc thanh công cụ phân tích:
    - ⚡ `Nguồn: Tự động (Vietcap ⇄ MAS)`
    - 🔵 `Nguồn: Vietcap IQ`
    - 🔴 `Nguồn: MASVN (Mirae Asset)`
  - Hiển thị Badge nguồn dữ liệu (`SourceBadge`) cạnh tiêu đề biểu đồ hoặc bảng BCTC để người dùng luôn biết dữ liệu đang tải từ đâu.

---

## Dependency Graph

```
MAS-MCP Token / .env & Vietcap Headers
                │
    ┌───────────┴───────────┐
    ▼                       ▼
mas-mcp-client.ts     vietcap-field-mapping.ts
    │                       │
    ▼                       ▼
MasMcpProvider        VietcapProvider
    │                       │
    └───────────┬───────────┘
                ▼
     FallbackProvider (Auto)
                │
                ▼
     Stock Data API Routes
(/api/stocks/[ticker]/financials, /price-history)
                │
    ┌───────────┴───────────┐
    ▼                       ▼
DataSourceContext (React)  Deep Crawler & Sync Cronjobs
    │                       │
    ▼                       ▼
UI Switcher & Badges       R2 / Local Storage Cache
(Navbar, Charts, Tables)
```

---

## Task List

### Phase 1: Nền Tảng Client & Chuẩn Hóa Provider Layer
- [ ] **Task 1.1: Xây dựng MAS-MCP Core Client (`src/lib/mas-mcp-client.ts`)**
  - **Description**: Module kết nối Streamable HTTP MAS-MCP, quản lý `mcp-session-id`, gọi `tools/call`, trích xuất JSON loại bỏ display text quy tắc, xử lý lỗi timeout và tái xác thực.
  - **Acceptance criteria**:
    - Gọi thành công các tool `get_price_history`, `get_income_statement`, `get_balance_sheet`, `get_cash_flow`, `get_financial_indicators`.
    - Phản hồi JSON chuẩn, parse không bị crash bởi text thừa.
  - **Verification**: Chạy script test node độc lập kiểm tra 2 mã đại diện (FPT, REE).
  - **Files**: `src/lib/mas-mcp-client.ts`, `.env.example`.
  - **Scope**: S (1-2 files).

- [ ] **Task 1.2: Định nghĩa Data Provider Interface & Adapter (`src/lib/data-providers/`)**
  - **Description**: Xây dựng interface chuẩn `IDataProvider` ánh xạ các trường dữ liệu của MAS-MCP về đúng cấu trúc chuẩn của ValueX (`ParsedVietcapQuarter`, `VietcapPriceHistoryItem`).
  - **Acceptance criteria**:
    - `MasMcpProvider` chuyển đổi đầy đủ bảng KQKD, CĐKT, LCTT, Chỉ số tài chính của MASVN sang `ParsedVietcapQuarter`.
    - Dữ liệu 26 năm giá EOD của MASVN chuyển đổi sang mảng `PriceHistoryItem` tương thích 100% với biểu đồ TradingView / Lightweight Charts hiện tại.
  - **Verification**: Unit test ánh xạ dữ liệu REE giữa 2 nguồn khớp nhau về cấu trúc trường.
  - **Files**: `src/lib/data-providers/types.ts`, `src/lib/data-providers/mas-provider.ts`, `src/lib/data-providers/vietcap-provider.ts`.
  - **Scope**: M (3 files).

- [ ] **Task 1.3: Xây dựng Fallback Provider (Bộ điều phối tự động)**
  - **Description**: Bộ điều phối `CompositeDataProvider`: nhận yêu cầu `source` (`auto` | `vietcap` | `mas`), nếu `auto` sẽ gọi nguồn chính, nếu thất bại (403/timeout/network error) tự động kích hoạt nguồn phụ và gắn kèm `meta: { sourceUsed: 'MASVN' | 'VIETCAP', isFallback: boolean }`.
  - **Acceptance criteria**:
    - Khi ngắt Vietcap (giả lập 403), hệ thống tự động trả lời bằng dữ liệu MASVN mà không quăng exception 500 ra ngoài.
  - **Verification**: Test giả lập timeout/lỗi API Vietcap, kiểm tra response fallback về MAS thành công.
  - **Files**: `src/lib/data-providers/index.ts`.
  - **Scope**: S (1-2 files).

---

### Checkpoint 1: Nền tảng Provider & Abstraction
- [ ] Core client gọi được MAS-MCP ổn định.
- [ ] Data mapper chuyển đổi dữ liệu MASVN sang format của ValueX không bị thiếu trường.
- [ ] Fallback tự động hoạt động mượt mà khi một nguồn bị lỗi.

---

### Phase 2: Nâng Cấp API Routes Hỗ Trợ Đa Nguồn (?source=)
- [ ] **Task 2.1: Nâng cấp API BCTC (`/api/stocks/[ticker]/financials/route.ts`)**
  - **Description**: Hỗ trợ query parameter `source=auto|vietcap|mas`. Gọi qua `CompositeDataProvider`. Trả về thêm trường `source` và `sourceUsed` trong JSON.
  - **Acceptance criteria**:
    - `GET /api/stocks/REE/financials?source=vietcap` trả về dữ liệu Vietcap.
    - `GET /api/stocks/REE/financials?source=mas` trả về dữ liệu MASVN (hỗ trợ tới 21 năm).
    - `GET /api/stocks/REE/financials?source=auto` tự động chọn và fallback an toàn.
  - **Verification**: `curl` test cả 3 tham số trên localhost.
  - **Files**: `src/app/api/stocks/[ticker]/financials/route.ts`.
  - **Scope**: S (1 file).

- [ ] **Task 2.2: Nâng cấp API Lịch sử giá EOD (`/api/stocks/[ticker]/price-history/route.ts`)**
  - **Description**: Hỗ trợ query parameter `source=auto|vietcap|mas`. Khi chọn `mas`, cho phép lấy độ sâu tối đa lên tới 26 năm lịch sử (thay vì giới hạn 5-10 năm của Vietcap).
  - **Acceptance criteria**:
    - Endpoint trả về OHLCV chuẩn xác cho cả 2 nguồn.
    - Giữ nguyên cấu trúc cache R2 nhưng phân tách key hoặc đánh dấu nguồn dữ liệu.
  - **Verification**: `curl` kiểm tra dữ liệu giá của mã REE từ năm 2000 khi truyền `source=mas`.
  - **Files**: `src/app/api/stocks/[ticker]/price-history/route.ts`.
  - **Scope**: S (1 file).

---

### Checkpoint 2: API Endpoints Đa Nguồn
- [ ] Cả 2 API then chốt (BCTC & Lịch sử giá) đều đáp ứng đúng 3 mode: `auto`, `vietcap`, `mas`.
- [ ] Không làm phá vỡ các component đang tiêu thụ API hiện tại.

---

### Phase 3: Giao Diện Người Dùng (UI Switcher & Source Badge)
- [ ] **Task 3.1: Xây dựng DataSourceContext & Hook (`useDataSource`)**
  - **Description**: Context React lưu trạng thái nguồn dữ liệu được chọn (`currentSource: 'auto' | 'vietcap' | 'mas'`), đồng bộ với `localStorage` và tự động gắn vào query string của các hàm fetch.
  - **Acceptance criteria**:
    - Người dùng đổi nguồn ở một trang thì toàn bộ ứng dụng cập nhật theo.
    - Refresh trình duyệt không bị mất lựa chọn đã chọn.
  - **Files**: `src/contexts/DataSourceContext.tsx`.
  - **Scope**: S (1-2 files).

- [ ] **Task 3.2: Component `DataSourceSelector` trên Navbar / Thanh công cụ**
  - **Description**: Nút bấm chọn nguồn dữ liệu dạng Segmented Control hoặc Dropdown Menu nhỏ gọn, hiện đại với icon trực quan:
    - ⚡ **Tự động (Dự phòng thông minh)** (Khuyên dùng)
    - 🌐 **Vietcap IQ**
    - 🏛️ **MASVN (Mirae Asset)**
  - **Acceptance criteria**:
    - Thiết kế giao diện sang trọng, dark/light theme nhất quán, không chiếm dụng không gian làm việc.
    - Có tooltip giải thích đặc điểm từng nguồn (ví dụ: MASVN hỗ trợ 26 năm lịch sử giá & 21 năm BCTC).
  - **Files**: `src/components/common/DataSourceSelector.tsx`, `src/components/layout/Navbar.tsx` (hoặc header phân tích).
  - **Scope**: S (2 files).

- [ ] **Task 3.3: Hiển thị `SourceBadge` trên Biểu đồ & Bảng BCTC**
  - **Description**: Gắn badge nhỏ gọn thông báo nguồn dữ liệu đang phục vụ thực tế (ví dụ: `[Nguồn: MASVN · 26 năm]` hoặc `[Nguồn: Vietcap IQ]`, có tooltip hiển thị thời gian đồng bộ và cờ `Fallback: Có/Không`).
  - **Acceptance criteria**:
    - Người dùng dễ dàng nhận biết dữ liệu trên màn hình đang đến từ nguồn nào.
  - **Files**: `src/components/analysis/FinancialTable.tsx`, `src/components/charts/PriceChart.tsx`.
  - **Scope**: S (2 files).

---

### Checkpoint 3: Hoàn Thiện Trải Nghiệm Chuyển Đổi Trên UI
- [ ] Chuyển đổi nguồn trên UI mượt mà, bảng số liệu và biểu đồ tự động cập nhật lại theo nguồn mới.
- [ ] Badge hiển thị minh bạch nguồn đang phục vụ.

---

### Phase 4: Khai Thác Tính Năng Chuyên Sâu Của MAS-MCP
- [ ] **Task 4.1: Tích hợp Dữ liệu Dòng Tiền Tự Doanh (`get_proprietary_flow`)**
  - **Description**: Bổ sung endpoint `/api/market-watch/mas-proprietary` và hiển thị tab Tự doanh trong trang Market Watch (giúp giải quyết bài toán thiếu số liệu tự doanh chi tiết của Vietcap).
  - **Files**: `src/app/api/market-watch/mas-proprietary/route.ts`, `src/components/market-watch/ProprietaryFlowTab.tsx`.
  - **Scope**: M (2-3 files).

- [ ] **Task 4.2: Tích hợp Bảng Chỉ Số Chuyên Biệt Nhóm Ngân Hàng**
  - **Description**: Tích hợp các tool `get_banking_financial_indicator` và `get_bank_top_bad_debt` để phân tích sâu nhóm cổ phiếu Vua (Nợ xấu, Tỷ lệ bao phủ nợ xấu, CASA, NIM, CAR).
  - **Files**: `src/app/api/stocks/[ticker]/banking-metrics/route.ts`.
  - **Scope**: S (2 files).

---

### Phase 5: Pipeline Cào Dữ Liệu Sâu (Deep Crawler) & Đồng Bộ Tự Động
- [ ] **Task 5.1: Script cào sâu 26 năm EOD & 21 năm BCTC (`scripts/crawl-mas-universe-deep.ts`)**
  - **Description**: Script chạy batch crawling an toàn theo cơ chế windowing 3 năm cho EOD và 8 quý cho BCTC, có sleep giãn cách 500ms - 1s giữa các request để không kích hoạt WAF MASVN, lưu trữ vào SQLite / Parquet / R2.
  - **Acceptance criteria**:
    - Thu thập thành công toàn bộ dữ liệu lịch sử tối đa của top VN30, VN100 và toàn sàn.
    - Có resume checkpoint (nếu gián đoạn chạy lại từ mã kế tiếp, không cào lại từ đầu).
  - **Files**: `scripts/crawl-mas-universe-deep.ts`.
  - **Scope**: M (1 script).

- [ ] **Task 5.2: Tích hợp MAS-MCP vào Cronjob đồng bộ EOD hàng ngày (15:15)**
  - **Description**: Cập nhật `scripts/sync-eod-ohlc.ts` để sử dụng MAS-MCP làm nguồn đồng bộ bổ trợ cho phiên chiều mỗi ngày sau giờ ATC.
  - **Files**: `scripts/sync-eod-ohlc.ts`.
  - **Scope**: S (1 file).

---

### Phase 6: Kiểm Thử Toàn Diện, Build & Đồng Bộ VPS Oracle
- [ ] **Task 6.1: Typecheck & Production Build**
  - **Description**: Chạy `npx tsc --noEmit` và `npm run build` đảm bảo không có lỗi kiểu TypeScript hay lỗi đóng gói Next.js.
  - **Acceptance criteria**: 100% Passed.
  - **Files**: Workspace.
  - **Scope**: S.

- [ ] **Task 6.2: Git Push & Đồng Bộ Oracle VPS qua MCP `oracle-vps:remote-ssh`**
  - **Description**: Push commit lên GitHub `origin/main`, kết nối SSH vào VPS `valuex.duckdns.org` tại thư mục `/home/ubuntu/valuex`, thực hiện `git pull`, `npm run build`, `pm2 reload valuex` và kiểm tra hoạt động trực tiếp.
  - **Acceptance criteria**: Ứng dụng chạy mượt mà trên production, switcher hoạt động tốt trên `valuex.duckdns.org`.
  - **Scope**: S.

---

## Risks and Mitigations

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
| :--- | :---: | :--- |
| **Token MASVN hết hạn (Expired Bearer Token)** | Trung bình | `mas-mcp-client.ts` bắt mã lỗi 401/403, tự động fallback về Vietcap IQ và ghi log cảnh báo; cung cấp script làm mới token nhanh. |
| **Sai lệch tên chỉ tiêu giữa 2 nguồn** | Thấp | Xây dựng từ điển ánh xạ chuẩn `VIETCAP_TO_MAS_MAPPING` đồng nhất các chỉ tiêu doanh thu, chi phí, tài sản, EPS về đúng chuẩn kế toán Việt Nam. |
| **MAS-MCP bị giới hạn tốc độ (Rate Limit) khi cào sâu** | Trung bình | Script crawl chia batch nhỏ, có khoảng nghỉ ngẫu nhiên (jittered delay 500-1200ms), cào theo từng nhóm ngành và có cơ chế ghi nhớ checkpoint để tiếp tục khi bị dừng. |
| **Tải trang bị chậm khi chọn chế độ Auto** | Thấp | Đặt timeout cho nguồn chính là 2.5 giây. Nếu quá 2.5s không phản hồi, tự động switch sang nguồn phụ ngay để người dùng không phải chờ lâu. |

---

## Open Questions & Next Steps
- Cần người dùng phê duyệt kế hoạch chi tiết trước khi bước vào triển khai code (Bắt đầu từ Phase 1).
