# Hướng Dẫn: Kết Hợp Vercel (Backend Siêu Tốc) + Cloudflare CDN (Miễn Phí Băng Thông 100%)

## 1. Tại Sao Đây Là Giải Pháp Tối Ưu Nhất?

| Tiêu chí | Chạy thuần Vercel | Chạy thuần Cloudflare Workers | **Vercel + Cloudflare Proxy 🟠 (Giải pháp này)** |
|---|---|---|---|
| **Chấm điểm Tầng 2 (89+ mã)** | ✅ Hoàn hảo (Không giới hạn) | ❌ Lỗi (Bị chặn ở 16 mã do trần 50 subrequests) | ✅ **Hoàn hảo (Toàn bộ 89+ mã chạy mượt)** |
| **Băng thông (Fast Origin Transfer)** | ❌ Dễ chạm trần 10 GB/tháng | ✅ Không giới hạn | ✅ **Giảm 90-95% dung lượng Vercel, không lo hết hạn mức** |
| **Chi phí** | 20$/tháng (nếu nâng Pro) | 5$/tháng (nếu nâng Workers) | 🎁 **0 ĐỒNG / THÁNG (Hoàn toàn Miễn phí)** |

---

## 2. Các Bước Cấu Hình Từng Bước

### BƯỚC 1: Thêm Tên Miền (Custom Domain) Vào Vercel

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/) -> Chọn dự án `stock-analysis-report-ai` (hoặc tên dự án của bạn).
2. Vào mục **Settings** -> **Domains**.
3. Nhập tên miền hoặc subdomain của bạn muốn dùng (Ví dụ: `stock.tenmiencuaban.com` hoặc `tenmiencuaban.com`).
4. Bấm **Add**.
5. Vercel sẽ hiển thị thông số DNS cần trỏ:
   - **Type**: `CNAME`
   - **Name**: `stock` (hoặc `@` nếu dùng domain chính)
   - **Value**: `cname.vercel-dns.com`

---

### BƯỚC 2: Cấu Hình DNS Trên Cloudflare (Bật Đám Mây Cam 🟠)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/) -> Chọn Domain của bạn.
2. Vào mục **DNS** -> **Records** -> Bấm **Add record**:
   - **Type**: `CNAME`
   - **Name**: tên subdomain bạn đã nhập ở Bước 1 (Ví dụ: `stock` hoặc `@`)
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: **Bật ĐÁM MÂY MÀU CAM 🟠 (Proxied)** *(Đây là chìa khóa để Cloudflare gánh toàn bộ băng thông thay cho Vercel).*
   - **TTL**: `Auto`
3. Bấm **Save**.

---

### BƯỚC 3: Cấu Hình SSL/TLS Trên Cloudflare (Rất Quan Trọng - Tránh Lỗi 521)

Để kết nối giữa Cloudflare và Vercel không bị lỗi vòng lặp SSL:
1. Trên Cloudflare Dashboard, vào menu bên trái chọn **SSL/TLS**.
2. Tại mục **Overview** -> Chọn chế độ mã hóa: **Full** hoặc **Full (strict)**.
   *(Không chọn Flexible vì sẽ gây lỗi Too Many Redirects).*

---

### BƯỚC 4: (Tùy Chọn - Cực Mạnh) Tạo Cache Rule Để Cloudflare Cache Tối Đa

Để Cloudflare giữ toàn bộ file JS, CSS, Font và không bao giờ hỏi lại Vercel:
1. Trên Cloudflare Dashboard, vào mục **Caching** -> **Cache Rules** -> Bấm **Create rule**.
2. **Rule name**: `Cache Next.js Static Assets`
3. **When incoming requests match**:
   - Field: `URI Path`
   - Operator: `starts with`
   - Value: `/_next/static/`
4. **Then**:
   - Cache eligibility: **Eligible for cache**
   - Edge TTL: **Override origin** -> Chọn **1 month** (hoặc 1 year)
5. Bấm **Deploy**.

---

## 3. Kết Quả Sau Khi Hoàn Tất

1. Bạn truy cập vào tên miền của bạn (ví dụ `https://stock.tenmiencuaban.com`):
   - Mọi file giao diện, hình ảnh, tài nguyên tĩnh sẽ được Cloudflare CDN phục vụ trực tiếp với tốc độ siêu nhanh và **0 byte origin transfer trên Vercel**.
2. Khi bạn bấm **Bắt đầu quét thị trường**:
   - Vercel sẽ thực hiện quét Tầng 1 và chấm điểm Tầng 2 cho **toàn bộ 89 mã** (hoặc nhiều hơn) mà không gặp bất kỳ giới hạn 50 subrequests nào.
3. Hạn mức 10 GB trên Vercel của bạn sẽ giảm mạnh tới 95%, giải quyết dứt điểm nỗi lo bị pause trang web!
