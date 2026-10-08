# Thiết kế Giao diện: Chế độ Heat Mode Tinh chỉnh (Tham khảo Treemap Chuyên nghiệp)

> **Cập nhật:** Theo yêu cầu tinh chỉnh của người dùng (tham khảo hình ảnh bảng nhiệt chuẩn CTCK):
> 1. Kích thước ô chia nhỏ hơn nữa; đối với các ô quá nhỏ (S/XS/TINY) sẽ có **Card nổi bật (Floating Tooltip)** hiển thị chi tiết khi rê chuột.
> 2. Các ngành quá ít mã sẽ có kích thước khối ngành nhỏ hơn, **xếp gọn vào nhau** (dạng đa cột / packed blocks) thay vì mỗi ngành chiếm riêng một hàng dài.

---

## 1. So sánh Cấu trúc Hiện tại vs Thiết kế Mới

| Tiêu chí | Cấu trúc Trước đây | Cấu trúc Tinh chỉnh Mới |
|---|---|---|
| **Bố cục Ngành** | Mỗi ngành 1 thanh Accordion dài 100% full-width. Ngành 1 mã cũng chiếm cả hàng. | **Các khối ngành linh hoạt (Packed Industry Blocks)**. Ngành lớn chiếm 2 cột, ngành nhỏ (1-3 mã) thu nhỏ và xếp lồng ghép cạnh nhau (2 cột). |
| **Kích thước Ô** | Chỉ có L (2x2), M (2x1), S (1x1). Ô thấp nhất 30px. | **5 cấp độ: L, M, S, XS, TINY**. Base grid thu nhỏ (16px - 22px), tạo mật độ dày đặc, trực quan như bản đồ nhiệt thị trường thực tế. |
| **Xử lý Ô quá nhỏ** | Cố nhét chữ vào ô nhỏ gây chật chội hoặc tràn chữ. | **Ô nhỏ chỉ hiện mã / ô li ti chỉ hiện màu**. Khi rê chuột (hover), **hiện Card nổi bật (Floating Tooltip)** đầy đủ Ticker, Tên công ty, Giá, KL/GTGD, % thay đổi. |
| **Không gian Sidepanel** | Cuộn trang rất dài vì mỗi ngành là 1 hàng. | Gọn gàng, vừa vặn khung nhìn, nhìn thấy toàn cảnh thị trường trong 1-2 lần cuộn chuột. |

---

## 2. Mockup Giao diện Trực quan (Sidepanel ~380px)

```text
┌────────────────────────────────────────────────────────┐
│ 👑 Top 50 Cổ phiếu          [🔥 Nhiệt] [GTGD ▾]  [⧉]   │
│ Sàn ■■■■■■■ ■ ■■■■■■■ Trần    (78↑  12─  60↓)          │
├────────────────────────────────────────────────────────┤
│ ┌─ TÀI CHÍNH (12) ──────────┐ ┌─ BẤT ĐỘNG SẢN (8) ────┐│
│ │ ┌──────────┬──────────┐   │ │ ┌──────────┬────┬────┐││
│ │ │ VIX      │ HDB      │   │ │ │ NVL      │KDH │VHM │││
│ │ │ -0.85%   │ -0.18%   │   │ │ │ -0.49%   ├────┴────┤││
│ │ ├──────────┼─────┬────┤   │ │ │          │ PDR -1.3│││
│ │ │ VPB      │SHB  │SSI │   │ │ ├────┬─────┼────┬────┤││
│ │ │ +0.43%   │-0.9 │-1.2│   │ │ │DRH │HPX  │■ ■ │■ ■ │││
│ │ ├────┬─────┼─────┼────┤   │ │ └────┴─────┴────┴────┘││
│ │ │TCB │MBB  │■ ■  │■ ■ │   │ └───────────────────────┘│
│ │ └────┴─────┴─────┴────┘   │ ┌─ VẬT LIỆU (3) ────────┐│  ← Ngành ít mã
│ └───────────────────────────┘ │ │ HPG +0.0% │ NKG │HSG││     xếp gọn bên phải
│ ┌─ HÀNG TIÊU DÙNG (3) ──────┐ └───────────────────────┘│     không tốn dòng!
│ │ PNJ -1.06%  │ MSN │ DBC   │ ┌─ CÔNG NGHỆ ┐┌─ DẦU KHÍ┐│
│ └─────────────┴─────┴───────┘ │ │ FPT +0.8%│││ PLX BSR││  ← 2 ngành nhỏ
│                               └────────────┘└─────────┘│     đứng cạnh nhau
├────────────────────────────────────────────────────────┤
│ ┌─ FLOATING TOOLTIP CARD (Nổi lên khi hover ô NAB) ───┐│
│ │ 🏢 NAB - Ngân hàng TMCP Nam Á                       ││
│ │ Giá: 12.50          Thay đổi: -1.57%                ││
│ │ Khối lượng: 1,299,500 CP  (GTGD: 16.2 Tỷ)           ││
│ │ RS Rating: 68       Sàn: HNX                        ││
│ └─────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

---

## 3. Quy cách Kích thước Ô (Tile Sizing Hierarchy)

1. **Khối Ngành (Industry Block):**
   - Phân loại độ lớn của ngành dựa trên số mã cổ phiếu và tổng GTGD:
     - **Ngành Lớn (≥ 6 mã)**: Chiếm toàn bộ bề ngang (`col-span-2` hoặc full-width) với lưới nội bộ 4-6 cột.
     - **Ngành Vừa & Nhỏ (1 - 5 mã)**: Chiếm nửa bề ngang (`col-span-1`), tự động ghép cặp 2 ngành cạnh nhau hoặc xếp chồng trong cột phụ.
   - Mỗi khối ngành có thanh Header mỏng gọn: Tên ngành, số mã, % thay đổi trung bình ngành.

2. **Ô Cổ phiếu (Stock Tile):**
   - **L (Large - Top 8% GTGD ngành)**: `col-span-2 row-span-2` (~50px cao). Hiển thị Ticker (đậm), % thay đổi lớn ở giữa, Giá và GTGD ở chân ô.
   - **M (Medium - Top 25% GTGD ngành)**: `col-span-2 row-span-1` (~26px cao). Hiển thị Ticker và % thay đổi cạnh nhau.
   - **S (Small - Top 55% GTGD ngành)**: `col-span-1 row-span-1` (~26px cao). Hiển thị Ticker (text-[10px]) và % nhỏ.
   - **XS (Extra Small - Các mã thanh khoản thấp)**: `col-span-1 row-span-1` (~20px cao). Chỉ hiển thị Ticker 3-4 ký tự (text-[8.5px]).
   - **TINY (Mã thanh khoản rất nhỏ / lẻ ô)**: Ô vuông li ti (14px - 18px). Chỉ hiển thị màu nhiệt độ để lấp đầy khoảng trống (như các ô vuông góc dưới trong ảnh mẫu).

---

## 4. Thiết kế Card Nổi Bật (Floating Tooltip)

Khi di chuột qua **bất kỳ ô nào** (đặc biệt là ô S, XS, TINY):
- **Vị trí**: Nằm nổi bật (`z-50`), bám theo con trỏ chuột hoặc neo vào ô, tự động đổi hướng nếu chạm cạnh màn hình.
- **Giao diện**:
  - Light mode: Nền trắng sạch sẽ, viền xám nhạt `border-slate-200`, shadow mềm mại `shadow-2xl`.
  - Dark mode: Nền `#161a23` / `#1e222d`, viền `border-slate-700/80`, shadow `shadow-black/70`.
- **Nội dung thẻ**:
  - Dòng 1: **Mã cổ phiếu (In đậm lớn)** - **Tên doanh nghiệp đầy đủ**.
  - Dòng 2: **Giá hiện tại** (đổi màu theo tăng/giảm) • **Thay đổi: +/- %** (kèm icon mũi tên).
  - Dòng 3: **Khối lượng GD: {vol} CP** • **GTGD: {val} Tỷ**.
  - Dòng 4: **RS Rating: {rs}** (nếu có) • **Sàn: HSX/HNX/UPCOM**.

---

## 5. Kế hoạch Triển khai (Code Plan)

1. **`watchlist-heat.ts`**:
   - Mở rộng phân loại cấp độ ô: `'L' | 'M' | 'S' | 'XS' | 'TINY'`.
   - Bổ sung hàm tính kích thước khối ngành (`getIndustrySpan()`) để xác định ngành nào chiếm 2 cột, ngành nào chiếm 1 cột.
2. **`WatchlistHeatGrid.tsx`**:
   - Tích hợp **Floating Tooltip Portal/State**: Khi di chuột vào ô bất kỳ, hiển thị card nổi sắc nét với đầy đủ thông tin.
   - Thêm xử lý hiển thị cho các ô cỡ `XS` và `TINY`.
   - Tạo component `PackedIndustryHeatmap`: Lưới layout 2 cột linh hoạt gom các ngành ít mã vào cạnh nhau.
3. **`WatchlistMiniTab.tsx`**:
   - Kết nối dữ liệu vào `PackedIndustryHeatmap`.
   - Giữ lại tính năng chọn mã, đổi kiểu kích thước (GTGD / Vốn hóa / Đều).
