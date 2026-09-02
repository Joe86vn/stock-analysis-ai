# Kế Hoạch Triển Khai: Kiến Trúc Lọc 2 Tầng Siêu Tốc & Chuyên Sâu (Phương Án 1)

## 1. Tổng Quan (Overview)
Nâng cấp trang Dashboard Bộ Lọc & Bảng Xếp Hạng (`/ranking`) từ việc chỉ xử lý danh mục tĩnh 75 mã sang **Kiến trúc Lọc 2 Tầng (2-Tier Hybrid Screening Architecture)** kết hợp sức mạnh của Vietcap Screener API trên toàn bộ 1.600+ cổ phiếu 3 sàn (HOSE, HNX, UPCoM) và Bộ máy chấm điểm chuyên sâu 3 trụ cột (150đ) của ValueX.

---

## 2. Kiến Trúc Hệ Thống (Architecture)

```
                       ┌─────────────────────────────────────────────────────────┐
                       │           Toàn Bộ 1.600+ Cổ Phiếu Thị Trường            │
                       └────────────────────────────┬────────────────────────────┘
                                                    │
                                                    ▼
                       ┌─────────────────────────────────────────────────────────┐
                       │  TẦNG 1: VIETCAP SCREENER ENGINE (Tốc độ < 0.5s)        │
                       │  - POST /api/iq-insight-service/v1/screening/filter     │
                       │  - Lọc đa chiều: RS >= 70, ADTV >= 5 Tỷ, EPS >= 20%... │
                       └────────────────────────────┬────────────────────────────┘
                                                    │
                                                    ▼ (Danh sách 30 - 80 mã đạt chuẩn)
                       ┌─────────────────────────────────────────────────────────┐
                       │  TẦNG 2: VALUEX DEEP 3-PILLAR SCORING (Chuyên sâu)      │
                       │  - Bóc tách LNST cốt lõi 100% (Loại bỏ thu nhập 1 lần)  │
                       │  - Chấm điểm Sức Khỏe Tài Chính (50đ / 6 nhóm A-F)     │
                       │  - Chấm điểm Chất Lượng Tăng Trưởng (60đ / 7 nhóm A-G)  │
                       │  - Chấm điểm Chất Lượng Doanh Nghiệp (40đ / 7 nhóm A-G) │
                       └────────────────────────────┬────────────────────────────┘
                                                    │
                                                    ▼
                       ┌─────────────────────────────────────────────────────────┐
                       │  BẢNG XẾP HẠNG SIÊU CỔ PHIẾU VALUEX (150 ĐIỂM)          │
                       │  - Phân hạng A+, A, B+, B, C, D                         │
                       │  - Deep-dive 1-chạm sang Báo Cáo Phân Tích & Định Giá AI│
                       └─────────────────────────────────────────────────────────┘
```

---

## 3. Danh Sách Nhiệm Vụ Chi Tiết (Task Breakdown)

### Phase 1: Service Backend & Vietcap Screener Client (Tầng 1)
- **Task 1**: Xây dựng client gọi API Vietcap Screener Execution (`POST v1/screening/filter`) trong `src/lib/vietcap-screener-service.ts`.
  - Hỗ trợ xây dựng payload lọc động: Sàn (HSX/HNX/UPCOM), Ngưỡng RS (70/80/90), Ngưỡng ADTV (5 Tỷ/10 Tỷ/20 Tỷ), Ngưỡng EPS Growth (20%/50%/100%).
  - Chuyển đổi dữ liệu kết quả trả về thành cấu trúc chuẩn.
- **Task 2**: Xây dựng API Route `/api/screening/live` hỗ trợ:
  - Nhận tham số bộ lọc từ client.
  - Gọi Vietcap Screener Tầng 1 lấy danh sách mã thỏa mãn.
  - Tích hợp pipeline chấm điểm Tầng 2 theo luồng batch thông minh.

### Phase 2: Chế Độ Quét & Bộ Đệm Chấm Điểm 2 Tầng (Tầng 2)
- **Task 3**: Nâng cấp `src/lib/filter-rs-data.ts` để hỗ trợ chấm điểm danh sách động bất kỳ trả về từ Tầng 1.
  - Cơ chế cache thông minh theo mã cổ phiếu để tái sử dụng điểm số BCTC đã tính (tránh tính lại các mã đã có dữ liệu gần nhất).
  - Tối ưu hóa xử lý song song (concurrency pool = 6) với timeout an toàn.

### Phase 3: Giao Diện Dashboard Quét Thị Trường & Bộ Lọc Nâng Cao (UI/UX)
- **Task 4**: Bổ sung bộ điều khiển chuyển đổi chế độ lọc trên `src/app/ranking/page.tsx`:
  - **Chế độ 1**: *Danh mục 75 mã chuẩn Q2/2026* (Load tức thì).
  - **Chế độ 2**: *Quét trực tiếp toàn thị trường (1.600+ mã)*.
- **Task 5**: Xây dựng thanh công cụ cấu hình Tầng 1 trực quan:
  - Chọn ngưỡng RS ($RS \ge 70$, $RS \ge 80$, $RS \ge 90$).
  - Chọn thanh khoản tối thiểu ($ADTV \ge 5\text{ Tỷ}$, $\ge 10\text{ Tỷ}$, $\ge 20\text{ Tỷ}$).
  - Chọn tăng trưởng tối thiểu ($EPS \ge 20\%$, $\ge 50\%$, $\ge 100\%$).
  - Nút **"Quét Toàn Thị Trường 🚀"** kèm thanh tiến trình trực quan (Progress Bar: *"Đang quét 1.600 mã..."* $\rightarrow$ *"Tìm thấy 45 mã"* $\rightarrow$ *"Đang chấm điểm 3 trụ cột..."*).
- **Task 6**: Hoàn thiện tính năng xuất báo cáo Excel/CSV và tối ưu giao diện Dark/Light mode theo chuẩn ValueX.

---

## 4. Quản Lý Rủi Ro & Giải Pháp (Risks & Mitigations)

| Rủi Ro | Mức Độ | Giải Pháp Khắc Phục |
| :--- | :--- | :--- |
| **Vietcap API nghẽn khi quét nhiều mã cùng lúc** | Trung bình | Xử lý theo lô (batch size = 6) và áp dụng Cache TTL 15 phút cho BCTC của từng mã. |
| **Không có kết quả khi đặt tiêu chí quá khắt khe** | Thấp | Hiển thị thông báo gợi ý nới lỏng bộ lọc kèm nút "Khôi phục mặc định". |
| **Tải trang bị chậm khi người dùng chuyển tab** | Thấp | Mặc định giữ dữ liệu 75 mã có sẵn, chỉ chạy quét toàn thị trường khi người dùng chủ động nhấn nút. |
