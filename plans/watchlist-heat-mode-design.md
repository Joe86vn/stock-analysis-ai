# Thiết kế: Chế độ Heat Mode cho Bảng giá Danh mục (Sidepanel)

> Phạm vi: [`WatchlistMiniTab.tsx`](../src/components/chart/sidebar/WatchlistMiniTab.tsx)
> Trạng thái: **Bản nháp thiết kế — chờ duyệt**

---

## 1. Hiện trạng

- Có 3 chế độ xem: `Bảng` | `Lưới` | `Thẻ` ([`ViewMode`](../src/components/chart/sidebar/WatchlistMiniTab.tsx:39)).
- `Lưới` và `Thẻ` có 2 kiểu màu: `Tinh gọn` (chỉ chữ đổi màu) và `Tint mờ` (nền pastel) ([`getTileStyle()`](../src/components/chart/sidebar/WatchlistMiniTab.tsx:438)).
- **Còn thiếu:** một chế độ nhìn lướt là nắm được sức nóng của thị trường. Cần màu nền đặc, đậm nhạt theo mức tăng/giảm, và ô lớn nhỏ theo độ quan trọng của mã.

---

## 2. Ý tưởng chính

Thêm **chế độ xem thứ 4: `🔥 Nhiệt`**, có 3 đặc điểm:

1. **Màu nền đặc, đậm dần theo biên độ %**, theo quy ước TTCK VN:
   tím = trần · xanh lá = tăng · vàng = tham chiếu · đỏ = giảm · xanh lơ = sàn.
2. **Kích thước ô theo trọng số**: chọn được `Đều` / `GTGD` / `Vốn hóa`. Mã lớn chiếm ô 2×2 hoặc 2×1, mã nhỏ chiếm 1×1. Dùng CSS Grid `grid-flow-dense` để các ô xếp khít nhau.
3. **Header ngành gọn**: thanh độ rộng thị trường (breadth bar) cho thấy tỷ lệ mã tăng/đứng/giảm, kèm % trung bình của ngành.

---

## 3. Mockup giao diện (sidepanel rộng ~360px, Dark mode)

```
┌────────────────────────────────────────────────┐
│ 👑 Top 150 Vốn hóa  (150)        ▾       [⧉]  │
├────────────────────────────────────────────────┤
│ 🔍 Tìm mã hoặc tên công ty...                  │
│ [≡ Bảng][▦ Lưới][▤ Thẻ][🔥 Nhiệt]  ⇅ Nhiều mã │
│ Cỡ ô: ( Đều | ●GTGD | Vốn hóa )                │  ← chỉ hiện ở chế độ Nhiệt
│ Sàn ■■■■■■■ ■ ■■■■■■■ Trần                     │  ← thanh chú giải màu
│     -7%     0     +7%                          │
├────────────────────────────────────────────────┤
│ ▾ Ngân hàng 18  ▰▰▰▰▰▰▰▱▱▱▱  11↑ 2• 5↓   +0.8%  │  ← breadth bar
│ ┌───────────┬───────────┬──────┬──────┐        │
│ │ VCB       │ BID       │ CTG  │ TCB  │        │
│ │           │           │ +2.1 │ +0.3 │        │
│ │  +1.24%   │  -0.42%   ├──────┼──────┤        │
│ │  92.50    │  48.10    │ MBB  │ ACB  │        │
│ │           │           │ +6.9▲│ -1.8 │        │  ← MBB trần = tím
│ ├─────┬─────┼─────┬─────┼──────┴──────┤        │
│ │ VPB │ HDB │ STB │ SHB │ VIB   TPB   │        │
│ │+0.0 │-3.4 │+1.0 │-0.5 │ +0.4  -0.9  │        │
│ └─────┴─────┴─────┴─────┴─────────────┘        │
│ ▸ Bất động sản 14  ▰▰▰▱▱▱▱▱▱▱  4↑ 1• 9↓  -1.6%  │  ← đang thu gọn
│ ▾ Thép 5          ▰▰▰▰▰▰▰▰▱▱  4↑ 0• 1↓  +2.3%  │
│ ┌───────────┬──────┬──────┐                    │
│ │ HPG       │ HSG  │ NKG  │                    │
│ │  +3.10%   │ +2.4 │ +1.1 │                    │
│ │  27.65    ├──────┼──────┤                    │
│ │           │ TLH  │ SMC  │                    │
│ └───────────┴──────┴──────┘                    │
├────────────────────────────────────────────────┤
│ Tổng: 150 mã   ↑78  •12  ↓60    ● Realtime    │  ← footer thêm breadth tổng
└────────────────────────────────────────────────┘
```

### Cấu trúc ô (tile) theo kích thước

| Cỡ ô | Grid span | Nội dung hiển thị |
|------|-----------|-------------------|
| **L** (top ~10% trọng số trong ngành) | `col-span-2 row-span-2` | Mã (13px, đậm) · % (12px) · Giá (10px, mờ 70%) |
| **M** (10–30%) | `col-span-2 row-span-1` | Mã · % trên cùng một dòng |
| **S** (còn lại) | `1×1` | Mã (10.5px) · % (9px) xếp chồng |

- Lưới 4 cột, chiều cao mỗi hàng cố định khoảng **30px**, khoảng cách giữa các ô **2px** (khe nhỏ như heatmap chuyên nghiệp).
- Bo góc `rounded-[3px]`, không viền, không đổ bóng. Màu nền là thứ phân tách các ô.
- **Mã đang chọn**: viền trong `ring-2 ring-white/90` (dark) hoặc `ring-slate-900` (light), không phóng to để lưới không bị xô lệch.
- **Hover**: `brightness-110` và tooltip chi tiết (giữ tooltip hiện có).
- **Danh mục tự tạo**: giữ nút ✕ xóa nhanh ở góc ô khi hover.

---

## 4. Thang màu Heat

Độ đậm tính **liên tục** theo `|%| / biên độ sàn` (HOSE 7%, HNX 10%, UPCOM 15%), giới hạn trong khoảng 0.25 → 1.0. Nhờ vậy dải màu mượt, không bị nhảy bậc.

| Trạng thái | Điều kiện | Dark mode | Light mode | Chữ |
|-----------|-----------|-----------|-----------|-----|
| Trần | ≥ biên trần | `#A855F7` đặc | `#9333EA` | trắng |
| Tăng mạnh | ≥ +3% | `#10B981` α 0.85–1.0 | `#059669` | trắng |
| Tăng | +1% → +3% | `#10B981` α 0.50–0.85 | `#10B981` α 0.55–0.85 | trắng |
| Tăng nhẹ | 0 → +1% | `#10B981` α 0.25–0.50 | `#10B981` α 0.20–0.45 | emerald-950 / trắng (dark) |
| Tham chiếu | = 0 | `#F59E0B` α 0.35 | `#F59E0B` α 0.30 | amber-950 / trắng (dark) |
| Giảm nhẹ | 0 → −1.5% | `#EF4444` α 0.25–0.50 | `#EF4444` α 0.20–0.45 | rose-950 / trắng (dark) |
| Giảm | −1.5% → −3% | `#EF4444` α 0.50–0.85 | tương tự | trắng |
| Giảm mạnh | ≤ −3% | `#EF4444` α 0.85–1.0 | `#DC2626` | trắng |
| Sàn | ≤ biên sàn | `#06B6D4` đặc | `#0891B2` | trắng |

Ghi chú:
- Màu chính bám theo [`DESIGN.md`](../DESIGN.md): Bullish Emerald `#10B981`, Bearish Red `#EF4444`, VIP Gold `#F59E0B`.
- Dark mode: các ô màu nằm trên nền `#0B0F19` nên độ trong suốt (α) cho cảm giác "phát sáng" tự nhiên.
- Light mode: nền khối ngành `slate-100`. Ô nhạt dùng chữ tối để giữ độ tương phản WCAG AA.

### Thanh chú giải (Legend)
Gồm 9 ô màu nhỏ (14×6px) liền nhau: `Sàn · −5 · −3 · −1 · 0 · +1 · +3 · +5 · Trần`. Nhãn 9px màu `text-muted`. Thanh chỉ cao 1 dòng nên không tốn chỗ.

### Breadth bar (header ngành)
- Thanh ngang 56×4px, bo tròn, chia 3 đoạn tỷ lệ theo số mã: emerald (tăng), amber (đứng), rose (giảm).
- Bên cạnh là `11↑ 2• 5↓` (9.5px, font mono) và % trung bình ngành (giữ như hiện tại).

---

## 5. Phương án thay thế (để so sánh)

| Phương án | Mô tả | Ưu | Nhược |
|-----------|-------|----|-------|
| **A. View mode `Nhiệt` riêng (đề xuất)** | Thêm nút thứ 4, ô lớn nhỏ theo trọng số, legend, breadth bar | Đúng chất heatmap, nhìn lướt nhanh, tách biệt với các chế độ cũ | Thêm khoảng 1 component và helper |
| B. Kiểu màu thứ 3 `Nhiệt` cho Lưới/Thẻ | Chỉ thêm nút `Nhiệt` cạnh `Tinh gọn`/`Tint mờ`, ô đều nhau | Rất ít thay đổi code | Không có kích thước theo trọng số, kém "heatmap" |
| C. Treemap thật (squarified) | Thuật toán treemap tỷ lệ diện tích chính xác | Giống Vietstock/FireAnt nhất | Panel hẹp nên ô nhỏ khó đọc; phức tạp; dễ giật khi giá realtime cập nhật |

---

## 6. Kế hoạch triển khai (sau khi duyệt)

1. Tạo helper [`watchlist-heat.ts`](../src/components/chart/sidebar/watchlist-heat.ts): `getHeatColor(pct, exchange, isDark)` trả về `{ background, textClass }`; `getTileSize(stock, groupStocks, sizeMode)` trả về `'L' | 'M' | 'S'`.
2. Tạo component [`WatchlistHeatGrid.tsx`](../src/components/chart/sidebar/WatchlistHeatGrid.tsx): render lưới 4 cột `grid-flow-dense` cho từng ngành.
3. Tạo component nhỏ `HeatLegend` và `BreadthBar` (đặt cùng file hoặc trong helper).
4. Trong [`WatchlistMiniTab.tsx`](../src/components/chart/sidebar/WatchlistMiniTab.tsx):
   - Mở rộng `ViewMode` thêm `'heatmap'`; cập nhật whitelist localStorage tại [dòng 172](../src/components/chart/sidebar/WatchlistMiniTab.tsx:172).
   - Thêm nút `🔥 Nhiệt` (icon `Flame` từ lucide-react) vào bộ chuyển chế độ.
   - Thêm state `heatSizeMode: 'equal' | 'value' | 'cap'` và lưu vào localStorage key `valuex_watchlist_heat_size`.
   - Ẩn toggle `Tinh gọn/Tint mờ` khi ở chế độ Nhiệt; hiện thanh `Cỡ ô` và legend.
   - Header ngành: thêm `BreadthBar` (hiển thị ở mọi chế độ hoặc chỉ ở chế độ Nhiệt, tùy lựa chọn).
   - Footer: thêm tổng `↑ • ↓`.
5. Phát hiện dark mode qua `ThemeProvider` hiện có, hoặc dùng class `dark:` với CSS variable để tránh phải truyền prop.
6. Chạy `npx tsc --noEmit` và `npm run build`, rồi khởi chạy `npm run dev` để nghiệm thu.
