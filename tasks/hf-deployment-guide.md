# Hướng Dẫn Triển Khai Python Worker Lên Hugging Face Spaces

Dự án: **Valuex Analysis Worker**  
Tài khoản HF: **`hungntvt`**  
Tên Space: **`valuex-analysis`**  
URL dự kiến: **`https://hungntvt-valuex-analysis.hf.space`**

---

## Bước 1: Tạo Space trên Hugging Face

1. Truy cập [https://huggingface.co/new-space](https://huggingface.co/new-space)
2. Điền các thông tin:
   - **Space name:** `valuex-analysis`
   - **License:** `apache-2.0` (hoặc MIT tùy chọn)
   - **Select the Space SDK:** Chọn **Docker** *(Bắt buộc chọn Docker)*
   - **Docker template:** Chọn **Blank**
   - **Space hardware:** Chọn **CPU basic • 2 vCPU • 16 GB RAM • Free** *(Mặc định miễn phí)*
   - **Visibility:** Chọn **Public** (hoặc Public read-only để Next.js gọi được mà không cần token)
3. Nhấn **Create Space**.

---

## Bước 2: Push mã nguồn từ thư mục `hf-worker` lên Hugging Face Space

Mỗi Space trên Hugging Face bản chất là một Git Repository. Bạn chỉ cần thực hiện các lệnh sau trên terminal:

### Cách A: Dùng Git trực tiếp (Khuyên dùng)

Mở PowerShell tại thư mục dự án và chạy:

```powershell
# 1. Di chuyển vào thư mục hf-worker
cd "d:\2 ANTIGRAVITY\analysis-report\hf-worker"

# 2. Khởi tạo git repo cho hf-worker nếu chưa có
git init -b main

# 3. Thêm remote của Hugging Face Space
git remote add origin https://huggingface.co/spaces/hungntvt/valuex-analysis

# 4. Add file và commit
git add .
git commit -m "feat: initial commit for valuex-analysis python worker"

# 5. Push lên Hugging Face (nó sẽ hỏi Username và Access Token)
git push -u origin main --force
```

> **Lưu ý về mật khẩu khi git push lên Hugging Face:**  
> Hugging Face không dùng mật khẩu tài khoản thông thường khi push git. Bạn dùng **User Access Token**:
> - Vào [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
> - Bấm **New token** -> Chọn quyền **Write** -> Tạo và copy token (`hf_...`)
> - Khi Git hỏi `Password`, dán token này vào.

---

## Bước 3: Kiểm tra Space hoạt động (Build & Live)

1. Mở trang Space của bạn: `https://huggingface.co/spaces/hungntvt/valuex-analysis`
2. Bạn sẽ thấy tab **Building** -> Chờ khoảng 1-2 phút để Docker build xong -> Chuyển sang màu xanh **Running**.
3. Thử kiểm tra các đường dẫn sau trên trình duyệt hoặc Postman:
   - `https://hungntvt-valuex-analysis.hf.space/health`  
     *(Phải trả về: `{"status": "ok", "version": "1.0.0", ...}`)*
   - `https://hungntvt-valuex-analysis.hf.space/crawl/HPG`  
     *(Trả về danh mục BCTN, BCTC 8 quý, NQ ĐHCĐ và Báo cáo CTCK của HPG)*
   - `https://hungntvt-valuex-analysis.hf.space/docs`  
     *(Giao diện Swagger UI trực quan để test mọi API)*

---

## Bước 4: Tích hợp vào Next.js (Netlify)

Sau khi Space chạy thành công:
1. Vào **Netlify Dashboard** -> **Environment variables**
2. Thêm biến:
   ```
   PYTHON_WORKER_URL=https://hungntvt-valuex-analysis.hf.space
   ```
3. Chúng ta sẽ kích hoạt **Phase 4** để kết nối Next.js với URL này!
