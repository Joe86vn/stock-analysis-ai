# Hướng Dẫn Chi Tiết: Triển Khai Lên Cloudflare Pages & Kết Nối R2 + Supabase

Tài liệu này hướng dẫn từng bước để đưa dự án **Stock Analysis Report AI** lên Cloudflare Pages (kết nối trực tiếp GitHub Repo) và liên kết Cloudflare R2 để lưu trữ dữ liệu báo cáo miễn phí không giới hạn băng thông.

---

## BƯỚC 1: Tạo Cloudflare R2 Bucket (Lưu Báo Cáo JSON)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Ở thanh menu bên trái, chọn **R2 Object Storage**.
3. Bấm **Create bucket**:
   - **Bucket name**: `stock-analysis-reports`
   - **Location**: Automatic (hoặc APAC nếu muốn gần Việt Nam)
   - Bấm **Create Bucket**.
4. **Tạo R2 API Token** (để ứng dụng kết nối bảo mật):
   - Tại trang R2 chính, nhìn bên phải chọn **Manage R2 API Tokens**.
   - Bấm **Create API token**.
   - Quyền hạn (Permissions): Chọn **Admin Read & Write** (Object Read & Write).
   - TTL: Chọn Forever hoặc thời gian mong muốn.
   - Bấm **Create API Token**.
   - Lưu lại các giá trị:
     - `Access Key ID` (tương ứng với `R2_ACCESS_KEY_ID`)
     - `Secret Access Key` (tương ứng với `R2_SECRET_ACCESS_KEY`)
     - `Account ID` (hiển thị trên thanh địa chỉ hoặc mục overview R2)

---

## BƯỚC 2: Kết Nối GitHub Repository Vào Cloudflare Pages

1. Tại Cloudflare Dashboard, ở thanh menu trái chọn **Compute (Workers & Pages)** -> **Overview** (hoặc **Pages**).
2. Bấm **Create application** -> Chọn tab **Pages** -> Bấm **Connect to Git**.
3. Chọn tài khoản GitHub của bạn và chọn Repository: `stock-analysis-ai` (hoặc tên repo của bạn).
4. Bấm **Begin setup**.

### Cấu Hình Build Settings:
- **Project name**: `stock-analysis-report-ai`
- **Production branch**: `main` (hoặc `master`)
- **Framework preset**: Chọn **Next.js**
- **Build command**: `npx @cloudflare/next-on-pages` (hoặc `npm run build`)
- **Build output directory**: `.vercel/output/static`

---

## BƯỚC 3: Cấu Hình Biến Môi Trường (Environment Variables)

Tại trang cấu hình Pages trước khi bấm Deploy (hoặc vào mục **Settings** -> **Environment variables** sau khi tạo):

Thêm các biến môi trường sau:

> 💡 **LƯU Ý QUAN TRỌNG**: Dự án hiện tại **KHÔNG CẦN CƠ SỞ DỮ LIỆU SQL / SUPABASE**. Toàn bộ dữ liệu tài chính được fetch trực tiếp từ các API (SSI, Vietcap, Simplize...) và báo cáo phân tích được lưu trữ thẳng vào **Cloudflare R2 Bucket** dạng JSON. Bạn không cần cấu hình `DATABASE_URL`.

| Tên biến (Variable Name) | Giá trị (Value) | Ghi chú |
|---|---|---|
| `NODE_VERSION` | `20` hoặc `22` | Khuyên dùng Node 20/22 |
| `GEMINI_API_KEY` | Khóa API Google Gemini của bạn | Bắt buộc để chạy AI Analyzer |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | Lấy từ Bước 1 |
| `R2_ACCESS_KEY_ID` | R2 Access Key ID | Lấy từ Bước 1 |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key | Lấy từ Bước 1 |
| `R2_BUCKET_NAME` | `stock-analysis-reports` | Tên Bucket đã tạo ở Bước 1 |

### Cấu Hình Compatibility Flags:
- Vào mục **Settings** -> **Functions** -> **Compatibility flags**.
- Thêm flag: `nodejs_compat` cho cả **Production** và **Preview**.

---

## BƯỚC 4: Bấm "Save and Deploy"

1. Bấm **Save and Deploy**.
2. Cloudflare Pages sẽ tự động clone repo, cài đặt dependencies và build dự án.
3. Sau khi build thành công, bạn sẽ nhận được một domain miễn phí dạng:
   `https://stock-analysis-report-ai.pages.dev`
4. Mọi lần bạn `git push` lên GitHub, Cloudflare sẽ tự động build và deploy phiên bản mới nhất!

---

## BƯỚC 5: Tận Hưởng Lợi Ích
- **Băng thông**: Không giới hạn (Zero Egress Transfer Fee, không lo bị email cảnh báo 10 GB như Vercel).
- **Lưu trữ**: 10 GB R2 miễn phí, lưu trữ hàng trăm nghìn file JSON báo cáo tài chính.
- **Database**: Supabase PostgreSQL kết nối ổn định qua Connection Pooling.
