# Danh Sách Nhiệm Vụ & Tiến Trình Dự Án (Todo List)

## Phase 0: Dọn Dẹp Kỹ Thuật & Kiến Trúc
- [x] Chuyển đổi AI Analyzer sang Streaming Edge trên Netlify (`runtime = 'edge'`, `ReadableStream`)
- [x] Xóa sạch các artifact không dùng (Cloudflare wrangler, OpenNext)
- [x] Thống nhất API Contract tại `tasks/api-contract.md`
- [x] Giữ nguyên Vietcap IQ API cho dữ liệu báo cáo tài chính lịch sử

---

## Phase 1: Python Worker trên Render.com Free Web Service
- [x] **Chuẩn hóa mã nguồn Worker (`worker/`):**
  - [x] Xóa bỏ `gradio`, tinh gọn `requirements.txt` tối ưu RAM 512MB
  - [x] Cấu hình `$PORT` linh hoạt và an toàn module path trong `main.py`
  - [x] Tạo `render.yaml` Blueprint (Infrastructure-as-Code)
- [x] **Triển khai lên Render.com:**
  - [x] Tạo Web Service `valuex-analysis-worker` (Region Singapore, Workspace Joe)
  - [x] Verify live: `/health` phản hồi 200 OK (< 200ms)
  - [x] Verify live: `/crawl/HPG` cào thành công 22 tài liệu thực tế từ CafeF, Vietstock, Simplize (< 2s)
- [x] **Tích hợp Next.js Frontend:**
  - [x] Tạo `src/lib/worker-client.ts` hỗ trợ timeout 60s và auth `X-Worker-Secret`
  - [x] Cập nhật `/api/stocks/[ticker]/reference-documents` gọi Python Worker với local fallback
  - [x] Tạo `/api/analysis/parse-pdf` ủy nhiệm bóc tách bảng PDF bằng `pdfplumber` với local fallback
  - [x] Build Next.js verify thành công 100% không lỗi compile

---

## Phase 2: Cấu Hình Môi Trường & Vận Hành
- [x] Push toàn bộ mã nguồn lên nhánh `main` GitHub `Joe86vn/stock-analysis-ai`
- [x] **Khắc phục triệt để lỗi Netlify chậm & AI "Failed to fetch":**
  - [x] Đưa crawl tài liệu tham khảo về chạy trực tiếp local service (< 100ms), loại bỏ hoàn toàn tình trạng treo 15s do Render Free ngủ đông.
  - [x] Bổ sung route `/api/analysis/config` cung cấp cấu hình Gemini siêu tốc (< 20ms).
  - [x] Kích hoạt cơ chế gọi trực tiếp Google AI Studio SDK từ trình duyệt (Client-side), hoàn toàn thoát khỏi giới hạn 10s của Netlify Serverless Function.
