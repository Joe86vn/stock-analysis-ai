# Plan: Triển khai Mini WebSocket Gateway (Nguồn SSI iBoard) cho ValueX

## 📋 Overview
Xây dựng một dịch vụ **Mini WebSocket Gateway** độc lập (Node.js/TypeScript) lấy dữ liệu thời gian thực từ nguồn **SSI iBoard (MQTT over WebSocket + Protobuf)**, đóng vai trò hub phân phối dữ liệu cho nền tảng ValueX:
1. **Biểu đồ Kỹ thuật (`StockChartPanel.tsx`):** Cập nhật nhấp nháy nến OHLCV thời gian thực (sub-second) thay thế hoàn toàn cơ chế Polling 15s hiện tại.
2. **Thị trường chung (`Market Watch`):** Thay thế dứt điểm 2 endpoint lỗi 404 (`market-watch/liquidity` và `market-watch/breadth`) bằng luồng stream chỉ số VNINDEX, độ rộng thị trường (xanh/đỏ/trần/sàn) và thanh khoản so sánh thời gian thực.
3. **Bảng theo dõi (`Watchlist`):** Cập nhật giá khớp, % tăng/giảm và khối lượng tích lũy tức thì.
*(Lưu ý: Không triển khai module mới như soi dòng tiền / Tape reading theo đúng phạm vi thống nhất).*

---

## 🎯 Success Criteria
1. **Biểu đồ kỹ thuật phản hồi tức thì:** Cây nến ngày/phút hiện tại trên KLineCharts cập nhật realtime ngay khi có lệnh khớp trên sàn SSI (độ trễ < 300ms).
2. **Khắc phục lỗi 404 Market Watch:** Endpoint `market-watch/liquidity` và `breadth` hoạt động trở lại với dữ liệu live chuẩn xác từ SSI.
3. **Tiết kiệm tài nguyên:** Gateway chỉ mở duy nhất 1 kết nối MQTT tới SSI iBoard; phía client kết nối về Gateway theo cơ chế On-Demand Subscription (chỉ nhận mã đang xem).
4. **Cơ chế Fallback an toàn:** Nếu Gateway mất kết nối hoặc ngoài giờ giao dịch, client tự động fallback về Polling HTTP 15s hiện tại, không gây crash hoặc gián đoạn UI.
5. **Độ ổn định cao:** Triển khai được trên Render (Region Singapore) hoàn toàn miễn phí hoặc chạy local container.

---

## 🛠️ Tech Stack & Architecture

```mermaid
flowchart TD
    subgraph Upstream_Data [Nguồn SSI iBoard]
        SSI[wss://price-streaming.ssi.com.vn/mqtt\nUser/Pass: mqtt-ssi / Subprotocol: mqtt]
    end

    subgraph Realtime_Gateway [Realtime Gateway Service (Node.js/TS)]
        MQTTClient[MQTT Client Wrapper]
        ProtoDecoder[Protobuf Decoder Engine]
        Aggregator[Intraday Candle & Index Aggregator]
        WSServer[WebSocket Hub Server (ws/socket.io)]
    end

    subgraph ValueX_Frontend [ValueX Web App (Next.js)]
        Hook[useRealtimeStock Hook]
        Chart[StockChartPanel.tsx - KLineCharts]
        Watchlist[Watchlist Table]
        MarketWatch[Market Watch Components]
    end

    SSI -->|Protobuf Packets| MQTTClient
    MQTTClient --> ProtoDecoder
    ProtoDecoder --> Aggregator
    Aggregator --> WSServer
    WSServer -->|Sub: Ticker / Index| Hook
    Hook -->|updateData| Chart
    Hook --> Watchlist
    Hook --> MarketWatch
```

- **Runtime Gateway:** Node.js (v20+) + TypeScript.
- **Upstream Client:** `mqtt` (MQTT.js client) kết nối WebSocket SSL (`wss://`).
- **Protobuf Engine:** `@protobuf-ts/runtime` hoặc `protobufjs` sử dụng schema trích xuất từ iBoard (`StockData`, `IndexRealtimeData`, `LeTableData`).
- **Downstream Server:** `ws` (Lightweight WebSocket Server) với kênh phân phối Pub/Sub theo room.
- **Frontend Client:** React Custom Hook (`useRealtimeStock`) tích hợp trực tiếp vào `StockChartPanel.tsx`.

---

## 📁 File Structure

```
d:\2 ANTIGRAVITY\analysis-report\
├── realtime-gateway/                 # [MỚI] Thư mục dịch vụ Mini WebSocket Gateway
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  # Entrypoint server (khởi tạo WS Hub & MQTT Client)
│   │   ├── config.ts                 # Cấu hình SSI WSS, credentials, port
│   │   ├── ssi/
│   │   │   ├── ssi-mqtt-client.ts    # Kết nối MQTT tới wss://price-streaming.ssi.com.vn/mqtt
│   │   │   ├── proto-decoder.ts      # Giải mã binary Protobuf thành đối tượng JSON
│   │   │   └── topics.ts             # Danh mục topic (stockRealtimeByListV2, notifyIndexRealtimeByListV2)
│   │   ├── aggregator/
│   │   │   ├── candle-aggregator.ts  # Gom tick thành nến OHLCV ngày/phút hiện tại
│   │   │   └── market-aggregator.ts  # Tính toán độ rộng & thanh khoản thị trường
│   │   └── server/
│   │       └── ws-hub.ts             # Quản lý client rooms & broadcast message
│   ├── Dockerfile                    # Đóng gói container deploy Render
│   └── render.yaml                   # Blueprint tự động deploy qua Render MCP
│
├── src/
│   ├── hooks/
│   │   └── useRealtimePrice.ts       # [MỚI] Custom Hook kết nối WebSocket Hub + Fallback HTTP Polling
│   ├── components/
│   │   └── StockChartPanel.tsx       # [CẬP NHẬT] Đổi từ Polling 15s sang useRealtimePrice
│   ├── app/api/market-watch/
│   │   ├── liquidity/route.ts        # [CẬP NHẬT] Lấy data thanh khoản từ SSI Gateway
│   │   └── breadth/route.ts          # [CẬP NHẬT] Lấy độ rộng thị trường từ SSI Gateway
│   └── lib/
│       └── realtime-config.ts        # URL Gateway config (dev: ws://localhost:8080, prod: wss://...onrender.com)
```

---

## 🚀 Task Breakdown

### Phase 1: Xây dựng Lõi Mini WebSocket Gateway (`realtime-gateway`)

#### Task 1.1: Khởi tạo Project & Cấu hình MQTT SSI Client
- **Agent:** `backend-specialist`
- **Skills:** `@[skills/clean-code]`, `@[skills/nodejs-best-practices]`
- **Priority:** P0 (Nền tảng)
- **Dependencies:** None
- **INPUT:** Thông số kết nối SSI iBoard đã kiểm chứng (`wss://price-streaming.ssi.com.vn/mqtt`, user/pass `mqtt-ssi`).
- **OUTPUT:** Thư mục `realtime-gateway/` với TypeScript, kết nối thành công và nhận binary payload từ SSI.
- **VERIFY:** Chạy lệnh `npm run dev` trong `realtime-gateway`, console log xác nhận `[SSI MQTT] Connected successfully`.

#### Task 1.2: Triển khai Bộ giải mã Protobuf (Protobuf Decoder)
- **Agent:** `backend-specialist`
- **Skills:** `@[skills/clean-code]`
- **Priority:** P0
- **Dependencies:** Task 1.1
- **INPUT:** Binary buffer từ các topic `stockRealtimeByListV2/SSI` và `notifyIndexRealtimeByListV2/VNINDEX`.
- **OUTPUT:** File `src/ssi/proto-decoder.ts` chuyển đổi chính xác binary payload thành object JSON chứa giá, khối lượng, trần/sàn/TC, số mã tăng/giảm.
- **VERIFY:** Chạy test script in ra object JSON rõ ràng của mã SSI (giá khớp, volume, change).

#### Task 1.3: Module Gom Tick thành Nến (Candle Aggregator) & Hub WebSocket
- **Agent:** `backend-specialist`
- **Skills:** `@[skills/clean-code]`, `@[skills/architecture]`
- **Priority:** P1
- **Dependencies:** Task 1.2
- **INPUT:** Dòng ticks thô từ SSI.
- **OUTPUT:** `src/aggregator/candle-aggregator.ts` duy trì cây nến `OhlcBar` hiện tại trong RAM và `src/server/ws-hub.ts` bắn message tới client theo phòng `subscribe:{ticker}`.
- **VERIFY:** Kết nối thử từ wscat/Node client tới `ws://localhost:8080`, gửi `{"action":"sub","ticker":"SSI"}` và nhận về bản tin nến `{open, high, low, close, volume, timestamp}`.

---

### Phase 2: Tích hợp Frontend ValueX & Tự Động Fallback

#### Task 2.1: Xây dựng Hook `useRealtimePrice` (Smart Fallback)
- **Agent:** `frontend-specialist`
- **Skills:** `@[skills/nextjs-react-expert]`, `@[skills/clean-code]`
- **Priority:** P1
- **Dependencies:** Task 1.3
- **INPUT:** URL WebSocket Gateway và endpoint REST API dự phòng.
- **OUTPUT:** File `src/hooks/useRealtimePrice.ts` quản lý vòng đời socket, heartbeat ping/pong, tự động chuyển về REST Polling nếu socket offline.
- **VERIFY:** Giả lập tắt Gateway -> Hook tự động bật polling 15s; bật lại Gateway -> Hook tự động chuyển sang socket.

#### Task 2.2: Tích hợp vào `StockChartPanel.tsx` (Realtime Candle)
- **Agent:** `frontend-specialist`
- **Skills:** `@[skills/nextjs-react-expert]`, `@[skills/clean-code]`
- **Priority:** P1
- **Dependencies:** Task 2.1
- **INPUT:** `useRealtimePrice` hook và hàm `chartRef.current.updateData()`.
- **OUTPUT:** `StockChartPanel.tsx` được nối với live candle stream. Cây nến của ngày hôm nay nhấp nháy co giãn trực tiếp khi có lệnh khớp.
- **VERIFY:** Mở mã cổ phiếu trên giao diện web, kiểm tra cây nến cuối cùng cập nhật giá và volume theo thời gian thực không bị giật lag hay lệch nến.

---

### Phase 3: Nâng cấp Module Market Watch & Watchlist

#### Task 3.1: Khắc phục lỗi 404 cho `market-watch/liquidity` & `breadth`
- **Agent:** `backend-specialist`
- **Skills:** `@[skills/clean-code]`
- **Priority:** P2
- **Dependencies:** Task 1.3
- **INPUT:** Dữ liệu chỉ số thị trường từ topic `notifyIndexRealtimeByListV2` của SSI.
- **OUTPUT:** Sửa `src/app/api/market-watch/liquidity/route.ts` và `breadth/route.ts` đọc dữ liệu tổng hợp từ Gateway/SSI.
- **VERIFY:** Gọi GET `/api/market-watch/liquidity` và `/api/market-watch/breadth` trả về status 200 kèm số liệu phân bổ độ rộng thị trường thực tế.

#### Task 3.2: Cập nhật Bảng Watchlist Thời Gian Thực
- **Agent:** `frontend-specialist`
- **Skills:** `@[skills/nextjs-react-expert]`
- **Priority:** P2
- **Dependencies:** Task 2.1
- **INPUT:** Bảng theo dõi Watchlist.
- **OUTPUT:** Các hàng cổ phiếu trong Watchlist đổi màu xanh/đỏ nhấp nháy khi có biến động giá từ socket.
- **VERIFY:** Quan sát bảng Watchlist nhảy giá theo nhịp thị trường mà không cần bấm reload.

---

### Phase 4: Đóng gói Docker & Triển khai lên Render

#### Task 4.1: Tạo Dockerfile & Cấu hình Blueprint Render
- **Agent:** `devops-engineer`
- **Skills:** `@[skills/server-management]`
- **Priority:** P2
- **Dependencies:** Phase 1 hoàn thành
- **INPUT:** Thư mục `realtime-gateway/`.
- **OUTPUT:** `Dockerfile` tối ưu nhiều tầng (multi-stage build) và cấu hình service trên Render (Region Singapore).
- **VERIFY:** Build docker image nội bộ thành công, chạy kiểm thử với `docker run`.

#### Task 4.2: Tích hợp Deploy Render qua MCP Tool
- **Agent:** `devops-engineer`
- **Skills:** `@[skills/shipping-and-launch]`
- **Priority:** P2
- **Dependencies:** Task 4.1
- **INPUT:** Tool MCP Render sẵn có trong IDE (`create_web_service`).
- **OUTPUT:** Deploy dịch vụ Gateway lên Render và cập nhật biến môi trường `NEXT_PUBLIC_WS_GATEWAY_URL`.
- **VERIFY:** Kiểm tra link `wss://...onrender.com` kết nối trực tiếp từ trình duyệt trên môi trường production.

---

## 🔍 Phase X: Final Verification Checklist
- [ ] `npm run lint` & `npx tsc --noEmit` không có lỗi.
- [ ] `npm run build` thành công 100%.
- [ ] Gateway duy trì kết nối ổn định với SSI iBoard > 30 phút không bị disconnect.
- [ ] Heartbeat ping/pong giữa client và Render Gateway hoạt động chuẩn (tránh bị timeout 100s của Render proxy).
- [ ] Chuyển đổi mã cổ phiếu trên biểu đồ (`StockChartPanel`) tức thì, unsub mã cũ và sub mã mới chính xác trong RAM Gateway.
- [ ] Cơ chế Fallback sang HTTP Polling hoạt động trơn tru khi ngắt kết nối WebSocket.
- [ ] Endpoint `market-watch/liquidity` và `breadth` trả về HTTP 200 và dữ liệu hiển thị đẹp mắt trên dashboard.
