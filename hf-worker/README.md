---
title: Valuex Analysis Worker
emoji: 📊
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Valuex Analysis Worker (Python FastAPI)

Backend Worker chuyên dụng cho hệ thống **Stock Analysis AI**, chạy trên Hugging Face Spaces:
- **Crawl Service:** Tự động lấy danh mục BCTN (CafeF), BCTC hợp nhất 8 quý (Vietstock), Nghị quyết ĐHCĐ (Vietstock), và Báo cáo phân tích CTCK (Simplize).
- **PDF Parser:** Bóc tách text và bảng số liệu tài chính từ BCTC PDF dung lượng lớn bằng `pdfplumber`.
- **Cổng giao tiếp:** Port `7860`, REST API chuẩn tương thích với Next.js Frontend.
