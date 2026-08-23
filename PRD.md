# Product Requirement Document (PRD)
## Hệ Thống Phân Tích Cơ Hội Đầu Tư Chứng Khoán Tự Động (Stock Analysis AI Platform)

---

## 1. Tổng Quan & Mục Tiêu (Overview & Objectives)

### 1.1 Tổng Quan
Ứng dụng Web App phân tích chứng khoán tự động là công cụ trợ lý thông minh dành cho nhà đầu tư cá nhân và nhà phân tích tài chính. Hệ thống tiếp nhận các tài liệu đầu vào do người dùng cung cấp (Báo cáo tài chính, Báo cáo thường niên, Báo cáo phân tích từ các công ty chứng khoán) kết hợp với dữ liệu thị trường thực tế (P/E lịch sử 5 năm, P/E & P/B ngành/đối thủ), từ đó sử dụng AI (Gemini 1.5 Pro/Flash Long-Context) để tự động tổng hợp, phân tích và lập báo cáo đầu tư chuyên nghiệp tuân thủ 100% quy trình chuẩn tại `analysis-guide.md`.

### 1.2 Mục Tiêu Chiến Lược
- **Tối ưu hóa 80% thời gian nghiên cứu**: Giảm thời gian đọc và bóc tách BCTN (50-100 trang) & BCTC từ hàng giờ xuống còn 3-5 phút.
- **Chuẩn hóa quy trình phân tích**: Đảm bảo mọi báo cáo đầu tư đều đi theo khung 4 phần cốt lõi: Tổng quan, Chuỗi giá trị kinh doanh, Sức khỏe tài chính, Triển vọng & Định giá 3 kịch bản.
- **Tự chỉnh sửa giả định (Hybrid Model)**: Cho phép nhà đầu tư tùy chỉnh các tham số dự phóng (doanh thu, lợi nhuận 4 quý tiếp theo, EPS forward, P/E mục tiêu) trước khi chốt báo cáo cuối cùng.

---

## 2. Chân Dung Người Dùng (Target Persona & User Stories)

### 2.1 Chân Dung Người Dùng Target
- **Nhà đầu tư cá nhân chuyên nghiệp**: Cần công cụ phân tích sâu bài bản theo chuẩn cơ bản (Value/Growth Investing), tự tin đưa ra giả định định giá.
- **Chuyên viên phân tích (Equity Analyst)**: Cần công cụ tạo nhanh bản nháp báo cáo (Draft Report) từ tập hợp tài liệu thu thập được.

### 2.2 User Stories Key
1. **Upload tài liệu**: Là nhà đầu tư, tôi muốn tải lên nhiều file PDF/Excel (BCTC, BCTN, Báo cáo CTCK) cho 1 mã cổ phiếu để AI tự tổng hợp dữ liệu.
2. **Thu thập chỉ số thị trường**: Là nhà đầu tư, tôi muốn hệ thống tự tìm hoặc cho phép nhập P/E 5 năm gần nhất, P/E & P/B ngành của mã chứng khoán đó.
3. **Sinh báo cáo 4 phần**: Là nhà đầu tư, tôi muốn hệ thống lập báo cáo tự động theo đúng mẫu:
   - Phần A: Tổng quan doanh nghiệp, cổ đông, ban lãnh đạo, công ty liên kết.
   - Phần B: Mô hình kinh doanh & Chuỗi giá trị (Đầu vào, Quy trình sản xuất, Đầu ra).
   - Phần C: Tình hình tài chính (Doanh thu 3 năm, Tỷ suất lợi nhuận gộp/ròng, ROE, Nợ vay/VCSH).
   - Phần D: Triển vọng (Doanh thu = Sản lượng x Giá bán, Chi phí), Dự báo KQKD 4 quý tiếp theo, Định giá 3 kịch bản (Cơ sở, Tích cực, Tiêu cực) & So sánh P/E PB ngành.
4. **Hiệu chỉnh giả định**: Là nhà đầu tư, tôi muốn chỉnh sửa các con số dự báo EPS forward, PE kỳ vọng, nội dung phân tích trên Web UI trước khi xuất file.
5. **Xuất báo cáo**: Là nhà đầu tư, tôi muốn xuất báo cáo thành file PDF / Word có định dạng trình bày đẹp mắt để lưu trữ hoặc chia sẻ.

---

## 3. Yêu Cầu Chức Năng Chi Tiết (Detailed Functional Requirements)

### 3.0 Module 0: Tự Động Thu Thập Danh Mục Tài Liệu Tham Khảo (Reference Document Catalog Engine)
- **Crawl Tự Động Từ 3 Nguồn Chuyên Biệt**:
  - **Báo cáo thường niên (BCTN)**: 3 năm gần nhất từ `cafef.vn`.
  - **Báo cáo tài chính (BCTC) hợp nhất**: 8 quý gần nhất từ `vietstock.vn`.
  - **Nghị quyết Đại hội cổ đông (NQ ĐHCĐ) thường niên**: Năm gần nhất từ `vietstock.vn`.
  - **Báo cáo phân tích (Broker Reports)**: Thu thập danh sách từ `simplize.vn` (có thông tin CTCK, ngày phát hành, khuyến nghị MUA/BÁN/TRUNG LẬP, giá mục tiêu).
- **Mô Hình Hybrid & Caching**:
  - Crawl on-demand khi người dùng nhập Mã cổ phiếu (Ticker).
  - Đóng gói Redis TTL cache 24 giờ (86400s) cho mỗi mã cổ phiếu để tránh quá tải server nguồn & tăng tốc độ phản hồi.
- **Trải Nghiệm Người Dùng (UX)**:
  - Hiển thị danh mục tài liệu trực quan với link tải trực tiếp (PDF CDN).
  - Cung cấp nút **"Tự động tải & phân tích"** cho phép chọn tài liệu và nạp thẳng vào phiên phân tích AI mà không cần người dùng tìm kiếm và upload thủ công.

### 3.1 Module 1: Quản Lý Dự Án Phân Tích & Ingestion Engine
- **Tạo mới Session phân tích**: Người dùng nhập **Mã Cổ Phiếu (Ticker)** (Ví dụ: HPG, FPT, VNM, MWG...).
- **Tự động đề xuất & Upload File Tài Liệu**:
  - Tự động hiển thị Danh mục tài liệu tham khảo tìm thấy từ Module 0.
  - Cho phép Upload thủ công thêm các file PDF, DOCX, XLSX ngoài danh mục tự động.
  - Phân loại tài liệu: Báo cáo tài chính (BCTC), Báo cáo thường niên (BCTN), Báo cáo phân tích CTCK (Broker Report), Tài liệu ĐHCĐ / IR presentation.
  - Hỗ trợ nạp nhiều file cùng lúc (tối đa 50MB/file, tổng 200MB/mã).
- **Trích xuất văn bản & Bảng biểu**: Sử dụng kỹ thuật OCR & PDF Table Parser để trích xuất chính xác dữ liệu bảng biểu tài chính.

### 3.2 Module 2: Tích Hợp Dữ Liệu Thị Trường (Market Data Integration)
- **Tự động lấy dữ liệu tài chính công khai** (qua API/Crawler công khai):
  - Lịch sử P/E 5 năm gần nhất (Min PE, Max PE, Average PE).
  - P/E ngành & P/B ngành hiện tại.
  - P/E & P/B của đối thủ cạnh tranh chính.
  - Giá cổ phiếu hiện tại & Số lượng cổ phiếu đang lưu hành.
- **Form cho phép người dùng tùy chỉnh/bổ sung** các chỉ số định giá nếu nguồn tự động bị thiếu.

### 3.3 Module 3: Động Cơ AI Phân Tích & Tổng Hợp (AI Analysis Core)
Sử dụng Gemini 1.5 Pro / Flash (Long Context) với Multi-Step Prompting tương ứng với từng phần trong `analysis-guide.md`:

#### 📌 Phần A. Tổng quan doanh nghiệp
- **Lịch sử & Ngành nghề**: Lịch sử hình thành, địa bàn hoạt động, ngành nghề chính, sản phẩm cốt lõi, đối thủ cạnh tranh chính.
- **Cơ cấu cổ đông & Ban lãnh đạo**: Cổ đông lớn, ban quản trị.
- **Cơ cấu công ty**: Danh sách & tỷ lệ sở hữu tại các công ty con, công ty liên kết có trọng số lớn.

#### 📌 Phần B. Hoạt động kinh doanh & Chuỗi giá trị
- **Bản chất mô hình KD**: Xác định mô hình (Sản xuất, thương mại, dịch vụ, ngân hàng, BĐS...).
- **Đầu vào (Input)**: Bóc tách trọng số yếu tố đầu vào, phụ thuộc nhà cung cấp, đánh giá khả năng tăng/giảm chi phí đầu vào tương lai.
- **Quy trình sản xuất**: Đánh giá công suất, năng lực sản xuất hiện tại, khả năng duy trì/mở rộng nhà máy mới, lợi thế công nghệ so với đối thủ.
- **Đầu ra (Output)**: Cơ cấu doanh thu theo sản phẩm/mảng kinh doanh; phân tích sản phẩm trọng yếu (nhu cầu, sản lượng, giá bán, yếu tố ảnh hưởng tương lai).

#### 📌 Phần C. Tình hình tài chính
- **Doanh thu 3 năm**: Phân tích diễn biến doanh thu 3 năm gần nhất, yếu tố tác động.
- **Tỷ suất lợi nhuận & Eficiency**: Tỷ suất Lợi nhuận gộp (Gross Margin), Tỷ suất Lợi nhuận ròng (Net Margin), ROE 3 năm.
- **Sức khỏe tài chính**: Đánh giá Tỷ lệ Nợ vay tài chính / Vốn chủ sở hữu (D/E ratio), rủi ro đòn bẩy tài chính trong môi trường lãi suất.

#### 📌 Phần D. Triển vọng kinh doanh & Định giá
- **Yếu tố tăng trưởng**:
  - Tác động Sản lượng: Nhà máy mới, mở rộng thị phần, tăng công suất, chính sách nhà nước, công nghệ mới...
  - Tác động Giá bán: Nguồn cung hạn chế, vị thế độc quyền/thị phần lớn, giá hàng hóa thế giới, xu hướng công nghệ (AI/Bán dẫn...).
  - Tác động Chi phí: Giá nguyên liệu, khấu hao nhà máy hết hạn, tiết kiệm quy mô.
- **Ước lượng KQKD (Forward Projections)**:
  - Dự báo Doanh thu & LNST cho ít nhất **4 quý tiếp theo** (Q+1, Q+2, Q+3, Q+4).
  - Tự động tính toán **EPS Forward**.
- **Mô hình Định giá 3 Kịch bản**:
  - **Kịch bản Cơ sở (Base Case)**: $PE_{Average} \times EPS_{Forward}$
  - **Kịch bản Tích cực (Bull Case)**: $PE_{Max} \times EPS_{Forward}$
  - **Kịch bản Tiêu cực (Bear Case)**: $PE_{Min} \times EPS_{Forward}$
  - **So sánh tương quan**: So sánh PE/PB dự phóng với PE/PB bình quân ngành và đối thủ cạnh tranh trực tiếp.

### 3.4 Module 4: Trình Biên Tập Báo Cáo Tương Tác (Interactive Report Editor)
- **Web Dashboard**: Hiển thị báo cáo nháp trực quan theo định dạng Markdown/Rich Text.
- **Interactive Valuation Calculator**: Bộ công cụ tính toán định giá phản hồi thời gian thực:
  - Người dùng thay đổi giả định LNST 4 quý -> Hệ thống tự động tính lại EPS Forward -> Cập nhật giá mục tiêu 3 kịch bản ngay lập tức.
  - Cho phép người dùng trực tiếp sửa nội dung văn bản AI đã tạo.

### 3.5 Module 5: Xuất Báo Cáo (Export Engine)
- Xuất file **PDF** chuyên nghiệp: Có trang bìa, mục lục, bảng biểu tài chính, biểu đồ định giá 3 kịch bản, logo/thông tin định dạng đẹp mắt.
- Xuất file **DOCX (Word)**: Phục vụ mục đích biên tập chuyên sâu.

---

## 4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

- **Chính xác & Ngăn ngừa Bốc phét (Hallucination Control)**: AI phải trích dẫn nguồn số liệu từ file tài liệu nào (trang bao nhiêu, báo cáo nào).
- **Hiệu năng (Performance)**: Thời gian phân tích và tổng hợp toàn bộ báo cáo từ tập tài liệu 100 trang không quá 60 giây.
- **Bảo mật & Riêng tư**: Tài liệu người dùng upload được lưu trữ bảo mật, không được đưa vào dữ liệu huấn luyện công khai của AI.
- **Trải nghiệm người dùng (UX/UI)**: Giao diện hiện đại, tối giản, chuẩn SaaS tài chính (Dark/Light mode, biểu đồ trực quan).

---

## 5. Phạm Vi Không Thực Hiện Trong Phase 1 (Out of Scope)

- Tự động kết nối tài khoản chứng khoán để đặt lệnh mua/bán (Auto-trading).
- Quản lý danh mục đầu tư theo thời gian thực (Portfolio Management).
- Phân tích kỹ thuật (Technical Analysis / TA Charting).
