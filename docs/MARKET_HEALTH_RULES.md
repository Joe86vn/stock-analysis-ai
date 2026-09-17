# Quy Tắc Tính Điểm Sức Khỏe Thị Trường, Exposure & Action Plan (CANSLIM)

Tài liệu quy định chi tiết thuật toán tính điểm sức khỏe thị trường VNINDEX (thang điểm 10), mức quản trị tỷ trọng đòn bẩy Exposure và Kế hoạch hành động (Action Plan) tương ứng.

---

## 1. Thang Điểm & Phân Loại Trạng Thái Thị Trường

Sức khỏe thị trường được tính theo thang điểm từ **0 đến 10**:

| Điểm Sức Khỏe | Trạng Thái Thị Trường | Tỷ Trọng Exposure Khuyến Nghị | Chiến Lược / Action Plan |
| :---: | :---: | :---: | :--- |
| **>= 7 / 10** | **Confirmed Uptrend** *(Xu hướng tăng xác nhận)* | **75% – 100%** (Margin đầy đủ) | Tập trung vào cổ phiếu cơ bản chuẩn bị thoát ra khỏi nền giá đẹp. Gia tăng vị thế, tuân thủ mức cắt lỗ 7–8%. |
| **5 – 6 / 10** | **Uptrend Under Pressure** *(Tăng gặp áp lực)* | **25% – 50%** (Hạ đòn bẩy) | Thận trọng trước bất kỳ quyết định mua mới nào. Lên kế hoạch phòng thủ từng cổ phiếu, hạ Margin. |
| **< 5 / 10** | **Market in Correction** *(Thị trường điều chỉnh)* | **0% – 25%** (Tối đa tiền mặt) | **Giảm toàn bộ Margin trước tiên.** Tránh mua mới, hạ tỷ trọng cổ phiếu yếu và cắt lỗ quyết liệt 7–8%. |

---

## 2. Quy Tắc Khởi Tạo & Trừ Điểm Sức Khỏe (10-Point Scorecard)

### 2.1 Mức Điểm Gốc Ban Đầu
- **Sau phiên FTD (Bùng nổ theo đà)**: Mặc định điểm sức khỏe thị trường = **7 / 10** (*Confirmed Uptrend*).
- **Trong thị trường thông thường / chưa FTD**: Mặc định điểm gốc = **10 / 10**.

### 2.2 Trừ Điểm Khi Xuất Hiện Phiên Phân Phối Sau FTD (Khoảng 1–5 Phiên)
Nếu xuất hiện phiên phân phối trong khoảng từ 1 đến 5 phiên ngay sau ngày FTD, điểm sức khỏe sẽ bị trừ mạnh và Action Plan lập tức cảnh báo xác suất thất bại:

| Thời Gian Xuất Hiện Phân Phối | Điểm Bị Trừ | Điểm Sau Trừ | Xác Suất FTD Thất Bại | Trạng Thái & Action Plan Cảnh Báo |
| :---: | :---: | :---: | :---: | :--- |
| **Phiên thứ 1 hoặc 2 sau FTD** | **-3 điểm** | **4 / 10** | **95%** | **Lập tức chuyển về Market in Correction.** *⚠️ CẢNH BÁO FTD THẤT BẠI 95%! Giảm toàn bộ Margin trước tiên, ngừng mua mới và hạ tỷ trọng quyết liệt.* |
| **Phiên thứ 3 sau FTD** | **-2 điểm** | **5 / 10** | **70%** | **Chuyển sang Uptrend Under Pressure.** *⚠️ CẢNH BÁO FTD THẤT BẠI 70%! Thận trọng mua mới, hạ đòn bẩy Margin, phòng thủ từng vị thế.* |
| **Phiên thứ 4 hoặc 5 sau FTD** | **-1 điểm** | **6 / 10** | **30%** | **Chuyển sang Uptrend Under Pressure.** *⚠️ CẢNH BÁO FTD THẤT BẠI 30%! Thận trọng trước bất kỳ quyết định mua mới nào.* |

### 2.3 Khấu Trừ Bổ Sung Duy Trì Xu Hướng
Sức khỏe thị trường sẽ tiếp tục bị trừ thêm điểm dựa trên diễn biến thị trường thực tế:
- **Mỗi phiên phân phối active bổ sung** (trong vòng 25 phiên & chưa tăng lại ≥ 5% từ giá đóng cửa phiên phân phối đó): **-1 điểm / phiên**.
- **Chỉ số VNINDEX đóng cửa dưới MA20 ngày**: **-1 điểm**.

---

## 3. Quy Tắc Đáy 1 & FTD (Follow-Through Day) Trên Biểu Đồ

1. **Đáy 1 (Attempted Rally - Phiên nỗ lực phục hồi đầu tiên)**:
   - Được xác định khi VNINDEX tạo đáy mới và có 1 phiên đóng cửa cao hơn phiên trước.
   - **Quy tắc chỉ giữ Đáy 1 sau cùng thành công**: Nếu thị trường gãy đáy cũ tạo đáy mới thấp hơn, các nỗ lực phục hồi trước bị coi là thất bại và hủy đánh dấu. Chỉ giữ lại duy nhất 1 mốc **Đáy 1** cuối cùng phát động đợt nỗ lực phục hồi thành công dẫn tới phiên FTD.
2. **FTD (Bùng nổ theo đà)**:
   - Xuất hiện từ **phiên thứ 4 đến phiên thứ 10** tính từ Đáy 1.
   - Điều kiện: VNINDEX tăng **> 1.25%** với **khối lượng cao hơn phiên trước đó**.

---

## 4. Bảng Tổng Hợp Công Thức Tính Điểm Tự Động

$$\text{Điểm Sức Khỏe} = \text{Max}\Big(0, \text{Min}\big(10, \text{Điểm Gốc} - \text{Phạt Phân Phối Sau FTD} - \text{Số Phiên Phân Phối Khác} - \text{Phạt MA20}\big)\Big)$$

- Nếu có FTD: $\text{Điểm Gốc} = 7$.
- Nếu không có FTD: $\text{Điểm Gốc} = 10$.
- $\text{Phạt MA20} = 1$ nếu $\text{VNINDEX} < \text{MA20}$, ngược lại $= 0$.
