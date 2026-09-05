# Hướng Dẫn & Thông Tin Triển Khai Python Worker Trên Render.com

Dự án: **Valuex Analysis Worker**  
Nền tảng: **Render.com Free Web Service**  
Workspace: **Joe** (`tea-da2rbr9t0dsc73b1h7v0`)  
Vùng (Region): **Singapore**  
Mã nguồn: Thư mục `worker/` trong repo `Joe86vn/stock-analysis-ai` (nhánh `main`)

---

## 1. Thông Tin Dịch Vụ Đang Chạy Trực Tiếp (Live)

- **Trạng thái:** 🟢 **LIVE** (Hoạt động 100%)
- **URL công khai:** `https://valuex-analysis-worker.onrender.com`
- **Dashboard quản lý:** [https://dashboard.render.com/web/srv-dadooign74is73avl0v0](https://dashboard.render.com/web/srv-dadooign74is73avl0v0)
- **Tài nguyên:** 0.1 CPU, 512 MB RAM (Free Tier)
- **Cơ chế Auto-deploy:** Tự động kích hoạt build & deploy mỗi khi có commit mới đẩy lên nhánh `main`.

---

## 2. Danh Sách Các Endpoint API

| Method | Endpoint | Chức năng | Ví dụ |
|---|---|---|---|
| `GET` | `/health` | Kiểm tra trạng thái máy chủ | `https://valuex-analysis-worker.onrender.com/health` |
| `GET` | `/docs` | Swagger UI tương tác trực tiếp | `https://valuex-analysis-worker.onrender.com/docs` |
| `GET` | `/crawl/{ticker}` | Cào BCTN, BCTC 8 quý, NQ ĐHCĐ, Báo cáo CTCK | `https://valuex-analysis-worker.onrender.com/crawl/HPG` |
| `POST` | `/parse-pdf` | Bóc tách text & bảng tài chính từ file PDF | Upload multipart/form-data qua API |

---

## 3. Cấu Hình Biến Môi Trường Cho Next.js (Netlify)

Để Next.js trên Netlify kết nối đến Render Worker:

1. Đăng nhập [Netlify Dashboard](https://app.netlify.com/).
2. Chọn dự án `stock-analysis-ai` -> **Site configuration** -> **Environment variables**.
3. Thêm biến:
   ```env
   PYTHON_WORKER_URL=https://valuex-analysis-worker.onrender.com
   ```
4. *(Tùy chọn)* Nếu muốn bảo mật endpoint bằng Secret Key:
   - Thêm biến `WORKER_SECRET=<chuỗi_bí_mật>` trên cả Render và Netlify.

---

## 4. Đặc Điểm Render Free Tier & Cơ Chế UX

- **Cold Start:** Nếu không có request trong 15 phút, máy chủ Render sẽ tạm ngủ. Request đầu tiên mất ~30s để thức dậy.
- **Frontend Fallback:** Next.js đã được tích hợp sẵn:
  - Timeout 60s để chờ máy chủ khởi động.
  - Tự động fallback sang service cào nội bộ và `pdf-parse` cục bộ nếu Render chưa kịp phản hồi, đảm bảo trải nghiệm người dùng không bao giờ bị gián đoạn.
