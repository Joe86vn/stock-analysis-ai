# Valuex Analysis Worker (Python FastAPI)

Backend Worker chuyên dụng cho hệ thống **Stock Analysis AI**, triển khai trên **Render.com Free Web Service** (Singapore Region):
- **API `/crawl/{ticker}`:** Tự động lấy danh mục BCTN 3 năm (CafeF), BCTC hợp nhất 8 quý (Vietstock), Nghị quyết ĐHCĐ (Vietstock), và Báo cáo phân tích CTCK (Simplize).
- **API `/parse-pdf`:** Bóc tách dữ liệu bảng tài chính và text từ PDF bằng `pdfplumber`.
- **API `/health`:** Kiểm tra tình trạng hoạt động của worker.
- **Bảo mật:** Xác thực qua header `X-Worker-Secret` giữa Next.js Frontend và Python Worker.
