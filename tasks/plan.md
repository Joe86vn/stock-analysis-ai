# Kế Hoạch Triển Khai: Chuyển Đổi Hosting & Storage Sang Cloudflare (Pages + R2 / KV)

## 1. Tổng Quan (Overview)
Dự án `stock-analysis-report-ai` (Next.js 15 App Router + Gemini AI + Prisma PostgreSQL) hiện gặp giới hạn **10 GB Fast Origin Transfer** trên gói Vercel Free. Mục tiêu của kế hoạch này là chuyển đổi toàn bộ ứng dụng sang hạ tầng **Cloudflare (Cloudflare Pages / OpenNext + R2 Storage)** nhằm tận dụng:
- **Băng thông không giới hạn (Unlimited Bandwidth / $0 Egress)** của Cloudflare Pages.
- **Lưu trữ báo cáo miễn phí trên Cloudflare R2** (10 GB lưu trữ, 10 triệu lượt đọc/tháng, không tính phí egress data transfer) thay thế cho việc ghi đè file local `fs.writeFile` vốn không khả thi trên môi trường Serverless/Edge.
- Kết nối cơ sở dữ liệu PostgreSQL an toàn và tối ưu thông qua Cloudflare Hyperdrive hoặc Prisma Edge Driver.

---

## 2. Phân Tích Hiện Trạng & Thách Thức Kỹ Thuật (Architecture Gap Analysis)

```
[KIẾN TRÚC CŨ: VERCEL]
User Request ──► Vercel Edge ──► Serverless Function (Node.js) ──► fs.writeFile ('data/saved-reports/*.json')
                                                              └──► Prisma DB (TCP)
[VẤN ĐỀ]: Hết hạn mức 10GB Fast Origin Transfer; fs không an toàn trên môi trường phân tán.

                                                ▼

[KIẾN TRÚC MỚI: CLOUDFLARE]
User Request ──► Cloudflare Edge (Pages / OpenNext)
                      │
                      ├──► Static Assets & Client UI (Free CDN Unmetered)
                      ├──► Serverless Routes / API Functions (Edge Runtime / nodejs_compat)
                      ├──► Cloudflare R2 Bucket (Lưu trữ JSON báo cáo phân tích thay thế fs)
                      └──► External PostgreSQL (Render/Neon/Supabase) qua Prisma Accelerate / Hyperdrive
```

### Các Thách thức cần giải quyết:
1. **Lưu trữ file báo cáo (`server-report-storage.ts`)**: Hiện tại đang dùng `fs/promises` ghi vào thư mục local `data/saved-reports/`. Trên Cloudflare, môi trường Edge là ephemeral (không có ổ cứng ghi bền vững). **Giải pháp**: Xây dựng storage adapter hỗ trợ **Cloudflare R2** (hoặc Cloudflare KV) khi deploy, đồng thời giữ fallback `fs` khi chạy local dev (`npm run dev`).
2. **Runtime Next.js 15 trên Cloudflare**: Next.js 15 yêu cầu adapter `@opennextjs/cloudflare` hoặc cấu hình Cloudflare Pages với `nodejs_compat`.
3. **Database Client (Prisma + PostgreSQL)**: Cần đảm bảo kết nối từ Cloudflare Workers tới PostgreSQL không bị nghẽn pool (dùng connection pooling hoặc Prisma Accelerate).
4. **Xử lý PDF (`pdf-parse`)**: `pdf-parse` dùng buffer và Node API truyền thống. Cần bật cờ tương thích `nodejs_compat` trong `wrangler.jsonc` hoặc chuẩn hóa sang `pdfjs-dist` khi xử lý trên Edge.

---

## 3. Lộ Trình & Danh Sách Nhiệm Vụ (Task Breakdown)

### Phase 1: Chuẩn Bị & Cấu Hình Môi Trường Cloudflare
- **Task 1: Khởi tạo cấu hình Cloudflare & Wrangler**
  - **Mô tả**: Thiết lập `wrangler.jsonc` (hoặc `wrangler.toml`) và cài đặt adapter `@opennextjs/cloudflare`.
  - **Acceptance criteria**:
    - Dự án có file `wrangler.jsonc` chuẩn với cấu hình `compatibility_flags = ["nodejs_compat"]`.
    - Script build Cloudflare được khai báo trong `package.json` (`npm run build:cf` hoặc OpenNext build).
  - **Verification**: Chạy lệnh build thử nghiệm không báo lỗi cú pháp config.
  - **Dependencies**: Không.
  - **Files**: `wrangler.jsonc`, `package.json`, `next.config.mjs`.
  - **Scope**: S (2-3 files).

- **Task 2: Trừu tượng hóa Storage Adapter (Hỗ trợ Local FS + Cloudflare R2)**
  - **Mô tả**: Refactor `src/lib/server-report-storage.ts` thành kiến trúc Storage Provider:
    - Khi `NODE_ENV === 'development'` hoặc không có R2 binding: ghi đọc file local `data/saved-reports/*.json` như cũ.
    - Khi chạy trên Cloudflare (có R2 binding hoặc S3 SDK S3Client): ghi đọc trực tiếp vào R2 Bucket.
  - **Acceptance criteria**:
    - Chạy local `npm run dev` vẫn lưu và đọc báo cáo từ `data/saved-reports/` bình thường.
    - Hàm đọc/ghi có cơ chế tương thích với Cloudflare R2.
  - **Verification**: Tạo và đọc thử 1 report test thành công ở cả 2 môi trường.
  - **Dependencies**: Task 1.
  - **Files**: `src/lib/server-report-storage.ts`, `src/lib/r2-storage.ts`.
  - **Scope**: M (2-3 files).

---

### Checkpoint 1: Nền tảng Storage & Config sẵn sàng
- [ ] Config Wrangler chuẩn hóa `nodejs_compat`.
- [ ] Storage Provider hoạt động trơn tru cả local lẫn remote.

---

### Phase 2: Tối Ưu Hóa Runtime & Kết Nối Database
- **Task 3: Tối ưu kết nối Prisma PostgreSQL trên Cloudflare**
  - **Mô tả**: Kiểm tra kết nối từ Edge/Workers tới PostgreSQL `DATABASE_URL` (Neon / Supabase / Render). Cấu hình connection pool an toàn để không bị quá tải kết nối.
  - **Acceptance criteria**:
    - `src/lib/db.ts` khởi tạo PrismaClient an toàn trên môi trường Edge / Serverless.
    - Không bị rò rỉ connection khi gọi nhiều request đồng thời.
  - **Verification**: Test query bảng `Stock` qua script hoặc route kiểm tra.
  - **Dependencies**: Task 1.
  - **Files**: `src/lib/db.ts`, `prisma/schema.prisma`.
  - **Scope**: S (1-2 files).

- **Task 4: Đảm bảo khả năng tương thích của AI Analyzer & PDF Parse**
  - **Mô tả**: Rà soát `src/lib/ai-analyzer.ts` và logic trích xuất PDF để đảm bảo tương thích hoàn toàn với Cloudflare Workers runtime (hỗ trợ streaming, xử lý buffer an toàn).
  - **Acceptance criteria**:
    - API phân tích AI hoạt động ổn định, không dùng các thư viện C-binding không hỗ trợ trên V8 isolate.
    - File upload và crawl tài liệu xử lý trơn tru.
  - **Verification**: Chạy kiểm tra chức năng phân tích cổ phiếu mẫu trên bản preview Cloudflare.
  - **Dependencies**: Task 2, Task 3.
  - **Files**: `src/lib/ai-analyzer.ts`, `src/app/api/analysis/route.ts`.
  - **Scope**: M (2-3 files).

---

### Checkpoint 2: Toàn bộ Logic Backend hoạt động trên Cloudflare Runtime
- [ ] Build dự án bằng OpenNext/Cloudflare hoàn tất không lỗi compile.
- [ ] Kết nối DB & gọi Gemini API hoạt động.

---

### Phase 3: Triển Khai (Deployment) & Chuyển Đổi Domain
- **Task 5: Tạo Cloudflare Pages Project & R2 Bucket trên Dashboard**
  - **Mô tả**: Hướng dẫn thiết lập trên giao diện Cloudflare Dashboard:
    - Tạo R2 Bucket: `stock-analysis-reports`.
    - Liên kết Git repo với Cloudflare Pages.
    - Cấu hình Environment Variables (`GEMINI_API_KEY`, `DATABASE_URL`, `R2_BUCKET_NAME`,...).
  - **Acceptance criteria**:
    - R2 Bucket được bind chính xác vào Cloudflare Pages.
    - Đầy đủ các biến môi trường bảo mật trên Cloudflare Dashboard.
  - **Verification**: Triển khai preview build đầu tiên trên Cloudflare Pages thành công.
  - **Dependencies**: Task 1, 2, 3, 4.
  - **Files**: `tasks/cloudflare-setup-guide.md`.
  - **Scope**: S (Tài liệu hướng dẫn + setup).

- **Task 6: Kiểm Thử Tải, Đo Băng Thông & Chuyển Domain**
  - **Mô tả**: Test toàn bộ quy trình: Quét bộ lọc 1.600 mã (`/ranking`), Mở báo cáo đã lưu (`/reports`), Tạo báo cáo mới bằng AI. Cấu hình Custom Domain (nếu có).
  - **Acceptance criteria**:
    - Mọi tính năng hoạt động 100% như trên Vercel.
    - Băng thông chuyển sang Cloudflare, không còn tiêu tốn 10 GB Origin Transfer của Vercel.
  - **Verification**: Kiểm tra HTTP status 200 trên domain mới, kiểm tra dữ liệu được ghi vào R2 Bucket.
  - **Dependencies**: Task 5.
  - **Files**: Kiểm thử toàn hệ thống.
  - **Scope**: M.

---

## 4. Quản Trị Rủi Ro & Giải Pháp (Risks and Mitigations)

| Rủi ro (Risk) | Mức độ | Biện pháp giảm thiểu (Mitigation) |
|---|---|---|
| **Giới hạn CPU Time 50ms của Cloudflare Workers Free** | Med | Tác vụ AI Gemini phân tích là I/O bound (chờ API network), Cloudflare không tính thời gian network vào CPU time. Tuy nhiên với tác vụ nặng như parse PDF lớn, có thể dùng worker riêng hoặc xử lý parse ở phía client/chunk nhỏ. |
| **Không ghi được file JSON vào ổ cứng** | High | Tích hợp Cloudflare R2 (hoặc S3 client). R2 có 10GB miễn phí trọn đời, zero egress fee, cực kỳ phù hợp để lưu hàng chục nghìn file JSON báo cáo. |
| **Prisma TCP connection trên Edge** | Med | Sử dụng Postgres pooler (ví dụ PgBouncer của Neon / Supabase / Render) hoặc Prisma Accelerate để quản lý kết nối. |
| **Lỗi tương thích Node.js API** | Low | Đã kích hoạt flag `nodejs_compat` trên Cloudflare Workers v2, hỗ trợ hầu hết `crypto`, `buffer`, `stream`, `async_hooks`. |

---

## 5. Câu Hỏi Mở & Quyết Định Cần Xác Nhận (Open Questions)

1. **Cơ sở dữ liệu PostgreSQL hiện tại**: Bạn đang host database ở đâu (Render, Supabase, Neon, hay máy local)? (Nếu là Neon hoặc Supabase thì kết nối sang Cloudflare rất mượt mà).
2. **Bạn muốn tự động hóa deploy qua GitHub Repo**: Kết nối thẳng GitHub vào Cloudflare Pages hay bạn muốn deploy qua lệnh CLI `wrangler pages deploy`?
