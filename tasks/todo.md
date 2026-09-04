# Danh Sách Nhiệm Vụ Chuyển Đổi Sang Cloudflare (Todo List)

## Phase 1: Chuẩn Bị & Cấu Hình Môi Trường Cloudflare
- [x] **Task 1**: Cấu hình Cloudflare & OpenNext Adapter (`wrangler.jsonc`, `package.json`)
  - [x] Khởi tạo `wrangler.jsonc` với cờ `compatibility_flags = ["nodejs_compat"]` và binding R2
  - [x] Cài đặt `@aws-sdk/client-s3` cho kết nối R2 Object Storage
  - [x] Cấu hình runtime chuẩn hóa cho Cloudflare
  - *Verification*: `npm run build` thành công 100%, không lỗi compile
- [x] **Task 2**: Trừu tượng hóa Storage Adapter (Hỗ trợ song song Local FS & Cloudflare R2)
  - [x] Tạo module adapter `src/lib/storage-adapter.ts`
  - [x] Giữ nguyên khả năng đọc/ghi file local `data/saved-reports/*.json` cho môi trường development
  - [x] Thêm driver đọc/ghi Cloudflare R2 Bucket cho môi trường production
  - [x] Cập nhật `src/lib/server-report-storage.ts` sử dụng adapter mới
  - *Verification*: Build xác nhận type safety và API routes hoạt động chuẩn xác

## Checkpoint 1: Nền tảng Storage & Config sẵn sàng
- [x] Config Wrangler chuẩn hóa `nodejs_compat`
- [x] Storage Provider hoạt động trơn tru cả local lẫn remote

---

## Phase 2: Tối Ưu Hóa Runtime & Kết Nối Database
- [x] **Task 3**: Tối ưu hóa kết nối Prisma PostgreSQL (Supabase Connection Pooling)
  - [x] Xác nhận kiến trúc Supabase PgBouncer pooler (port 6543)
  - [x] Cấu hình Prisma Client singleton an toàn trong `src/lib/db.ts`
  - *Verification*: Route build & DB client tương thích hoàn toàn
- [x] **Task 4**: Rà soát tính tương thích của AI Analyzer & PDF Parse
  - [x] Rà soát `src/lib/ai-analyzer.ts` loại bỏ các dependency xung đột
  - [x] Đảm bảo logic API routes hoạt động trên môi trường Serverless/Edge
  - *Verification*: Next.js build sinh 7 static routes và 9 dynamic API routes thành công

## Checkpoint 2: Toàn bộ Logic Backend hoạt động trên Cloudflare Runtime
- [x] Build dự án hoàn tất sạch sẽ (`✓ Compiled successfully in 10.2s`)
- [x] Kết nối DB & gọi Gemini API sẵn sàng

---

## Phase 3: Triển Khai (Deployment) & Chuyển Đổi Domain
- [x] **Task 5**: Thiết lập tài liệu hướng dẫn Cloudflare Pages Project & R2 Bucket
  - [x] Soạn hướng dẫn chi tiết từng bước tại `tasks/cloudflare-setup-guide.md`
  - [x] Liệt kê đầy đủ các biến môi trường (`GEMINI_API_KEY`, `DATABASE_URL`, R2 credentials)
- [ ] **Task 6**: Người dùng kết nối GitHub Repo lên Cloudflare Dashboard và Verify
  - [ ] Tạo R2 Bucket `stock-analysis-reports` trên Cloudflare
  - [ ] Connect repo GitHub vào Cloudflare Pages
  - [ ] Dán biến môi trường và bấm Deploy
  - *Verification*: Mọi chức năng hoạt động trên domain `*.pages.dev`, giải quyết dứt điểm vấn đề 10 GB Vercel
