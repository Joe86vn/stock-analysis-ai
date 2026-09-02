# Danh Sách Nhiệm Vụ: Kiến Trúc Lọc 2 Tầng Siêu Tốc (ValueX Screener 2-Tier)

## Phase 1: Service Backend & Vietcap Screener Client (Tầng 1)

### Task 1: Xây dựng Vietcap Screener Service (`src/lib/vietcap-screener-service.ts`)
**Description:** Xây dựng module client tương tác với `POST /api/iq-insight-service/v1/screening/filter` của Vietcap IQ, hỗ trợ tạo payload lọc động theo sàn, RS, ADTV và EPS growth.
**Acceptance criteria:**
- [x] Gửi payload đúng định dạng `ScreeningFilterRequest[]` tới endpoint Vietcap.
- [x] Xử lý và trích xuất danh sách mã cổ phiếu khớp điều kiện cùng các chỉ số cơ bản (Giá, ADTV, RS, ICB Sector).
- [x] Xử lý lỗi kết nối và timeout an toàn.
**Verification:**
- [x] Test node script gọi thành công và nhận về danh sách mã từ Vietcap API.
- [x] Build thành công không có lỗi type (`npx tsc --noEmit`).
**Dependencies:** None
**Files touched:** `src/lib/vietcap-screener-service.ts`
**Estimated scope:** Small (1 file)

### Task 2: Xây dựng API Route Quét Trực Tuyến (`src/app/api/screening/live/route.ts`)
**Description:** Endpoint nhận tiêu chí từ giao diện, gọi Vietcap Screener Tầng 1 và kích hoạt luồng chấm điểm Tầng 2.
**Acceptance criteria:**
- [x] Nhận các tham số filter: `rsMin`, `adtvMin`, `epsGrowthMin`, `exchanges`.
- [x] Trả về danh sách ứng viên kèm metadata quét và điểm số 3 trụ cột sơ bộ.
**Verification:**
- [x] Kiểm thử request `POST /api/screening/live` với bộ tiêu chí mẫu.
**Dependencies:** Task 1
**Files touched:** `src/app/api/screening/live/route.ts`
**Estimated scope:** Small (1-2 files)

---

## Checkpoint 1: Sau Phase 1
- [x] API quét trực tiếp từ Vietcap IQ hoạt động trơn tru.
- [x] `npx tsc --noEmit` pass 100%.

---

## Phase 2: Pipeline Chấm Điểm Động & Bộ Đệm (Tầng 2)

### Task 3: Tích hợp chấm điểm động danh sách bất kỳ trong `src/lib/filter-rs-data.ts`
**Description:** Mở rộng hàm tính toán để có thể nhận mảng mã cổ phiếu động từ Tầng 1, chấm điểm 3 trụ cột (150đ) theo cơ chế batch song song kèm bộ đệm cache.
**Acceptance criteria:**
- [x] Hàm `scoreDynamicStockList(tickers: string[])` chấm điểm theo lô (concurrency = 6).
- [x] Lưu bộ nhớ đệm kết quả BCTC để không phải tải lại các mã đã có dữ liệu trong 15 phút.
- [x] Sắp xếp kết quả theo Tổng điểm từ cao xuống thấp.
**Verification:**
- [x] Chấm điểm thành công cho danh sách ứng viên từ Tầng 1.
**Dependencies:** Task 1, Task 2
**Files touched:** `src/lib/filter-rs-data.ts`
**Estimated scope:** Small (1 file)

---

## Phase 3: Giao Diện Dashboard Quét Thị Trường (UI/UX)

### Task 4: Chế độ chuyển đổi tab & Bảng điều khiển Tầng 1 trên `/ranking`
**Description:** Bổ sung thanh chuyển đổi 2 chế độ: "75 Mã Chuẩn Q2/2026" vs "Quét Trực Tiếp Toàn Thị Trường (1.600+ Mã)", kèm bảng điều khiển tham số Tầng 1.
**Acceptance criteria:**
- [x] Tab 1 hiển thị ngay 75 mã có sẵn không có độ trễ.
- [x] Tab 2 hiển thị bảng điều khiển chọn ngưỡng: RS, ADTV, EPS Growth, Sàn giao dịch.
- [x] Nút "Quét Toàn Thị Trường 🚀" kích hoạt tiến trình quét.
**Verification:**
- [x] Chuyển tab mượt mà, không giật lag.
**Dependencies:** Task 3
**Files touched:** `src/app/ranking/page.tsx`
**Estimated scope:** Medium (1-2 files)

### Task 5: Thanh tiến trình Real-time & Bảng kết quả tương tác
**Description:** Hiển thị thanh tiến trình quét 2 tầng và hiển thị bảng kết quả đầy đủ tính năng sắp xếp, lọc, xuất CSV và nút "Phân tích ⚡".
**Acceptance criteria:**
- [x] Hiển thị thông báo tiến độ từng bước ("Đang quét 1.600 mã..." -> "Tìm thấy N mã" -> "Đang chấm điểm 3 trụ cột...").
- [x] Bảng kết quả hiển thị chuẩn xác Tổng điểm / 150, Sức khỏe (50đ), Tăng trưởng (60đ), Chất lượng (40đ), RS, Giá, ADTV.
- [x] Nút "Phân tích ⚡" hoạt động chính xác sang `/?ticker=XXX`.
**Verification:**
- [x] Kiểm tra toàn diện trên trình duyệt (Dark & Light mode).
- [x] Chạy `npm run build` thành công.
**Dependencies:** Task 4
**Files touched:** `src/app/ranking/page.tsx`
**Estimated scope:** Small (1 file)

---

## Checkpoint 2: Hoàn Thành & Bàn Giao
- [x] Toàn bộ 2 tầng lọc hoạt động hoàn hảo từ toàn thị trường đến phân tích chi tiết.
- [x] Build production Next.js thành công.
- [x] Push git sạch lên GitHub repository.
