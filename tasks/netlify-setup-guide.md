# Hướng Dẫn Chi Tiết: Triển Khai Lên Netlify (100 GB Băng Thông Miễn Phí)

Netlify cung cấp **100 GB bandwidth / tháng** (gấp 10 lần mốc 10 GB của Vercel) và **không có giới hạn 50 subrequests** như Cloudflare Workers. Thuật toán quét thị trường Tầng 2 sẽ chấm điểm trọn vẹn toàn bộ 89+ mã siêu nhanh!

---

## BƯỚC 1: Đăng Nhập & Kết Nối GitHub Trên Netlify

1. Truy cập [app.netlify.com](https://app.netlify.com/) và đăng nhập bằng tài khoản GitHub của bạn.
2. Tại trang tổng quan (Sites), bấm nút **Add new site** -> Chọn **Import an existing project**.
3. Chọn nhà cung cấp Git: Bấm vào **GitHub**.
4. Cấp quyền cho Netlify truy cập repository của bạn và chọn:
   👉 **`Joe86vn/stock-analysis-ai`**

---

## BƯỚC 2: Cấu Hình Build Settings

Netlify sẽ tự động đọc file `netlify.toml` đã được tạo sẵn trong mã nguồn. Bạn chỉ cần xác nhận các thông số sau:

- **Branch to deploy**: `main`
- **Base directory**: *(Để trống)*
- **Build command**: `npm run build`
- **Publish directory**: `.next`

---

## BƯỚC 3: Cấu Hình Biến Môi Trường (Environment Variables)

Trước khi bấm Deploy (hoặc sau khi tạo vào mục **Site configuration** -> **Environment variables**):
Bấm **Add a variable** (hoặc Import .env) và thêm các khóa sau:

| Biến môi trường (Key) | Giá trị (Value) | Ghi chú |
|---|---|---|
| `GEMINI_API_KEY` | Khóa API Google Gemini của bạn | Bắt buộc để phân tích AI |
| `GEMINI_MODEL` | `gemini-3.7-flash` | Model AI tốc độ cao |
| `R2_ACCOUNT_ID` | Cloudflare Account ID *(Tùy chọn)* | Để lưu báo cáo JSON lên R2 |
| `R2_ACCESS_KEY_ID` | R2 Access Key ID *(Tùy chọn)* | |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key *(Tùy chọn)* | |
| `R2_BUCKET_NAME` | `stock-analysis-reports` *(Tùy chọn)* | |

> 💡 **LƯU Ý**: Không cần cấu hình `DATABASE_URL` hay bất kỳ cơ sở dữ liệu nào khác!

---

## BƯỚC 4: Bấm "Deploy stock-analysis-ai"

1. Bấm nút **Deploy stock-analysis-ai**.
2. Netlify sẽ tiến hành kéo code, cài dependencies và build tự động trong khoảng 1–2 phút.
3. Khi hoàn tất, bạn sẽ nhận được một đường link miễn phí dạng:
   👉 `https://stock-analysis-ai-xxxxxx.netlify.app`
   *(Bạn có thể đổi tên subdomain này trong mục **Site configuration** -> **Change site name** thành `stock-analysis-ai.netlify.app`).*

---

## BƯỚC 5: Tận Hưởng Thành Quả

- **Băng thông**: 100 GB/tháng miễn phí (dùng thoải mái gấp 10 lần Vercel).
- **Bộ lọc Tầng 2**: Chấm điểm đầy đủ toàn bộ 89+ mã siêu cổ phiếu ValueX.
- **Tự động hóa CI/CD**: Mỗi lần `git push` lên nhánh `main`, Netlify sẽ tự động cập nhật bản mới nhất.
