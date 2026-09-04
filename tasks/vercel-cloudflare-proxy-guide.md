# Hướng Dẫn: Kết Hợp Vercel + Cloudflare (Khi Chưa Có Tên Miền Riêng)

Hiện tại bạn đã có sẵn 2 đường dẫn:
- **Link gốc Vercel (Backend mạnh mẽ, chạy đủ 89+ mã)**:  
  `https://stock-analysis-ai-ten.vercel.app/`
- **Link Cloudflare Worker**:  
  `https://stock-analysis-ai.hungntvt.workers.dev/`

Vì bạn **chưa có tên miền riêng** (không thể cấu hình DNS CNAME thông thường), giải pháp chuẩn nhất là biến **Cloudflare Worker** của bạn thành một **Cổng Đệm Thông Minh (Reverse Proxy & Edge Cache)** đứng phía trước Vercel.

---

## 🎯 Lợi Ích Của Mô Hình Này:

1. **Chấm điểm Tầng 2 đầy đủ 100%**: Khi bạn bấm "Quét thị trường", Worker chuyển tiếp tác vụ về Vercel xử lý -> **chấm điểm toàn bộ 89+ mã siêu nhanh** mà không bị giới hạn 50 subrequests.
2. **Cứu cánh dung lượng 10 GB Vercel**: Cloudflare Worker tự động lưu đệm (cache) vĩnh viễn toàn bộ file CSS, JS, hình ảnh, font trên mạng lưới toàn cầu của Cloudflare -> **Vercel không bị ngốn dung lượng Fast Origin Transfer nữa**!
3. **Chi phí 0 đồng**: Không cần mua tên miền, sử dụng ngay link `.workers.dev`.

---

## 🚀 Cách Thiết Lập Chỉ Trong 1 Phút (Trên Cloudflare Dashboard)

### Bước 1: Mở Trình Soạn Thảo Code Của Worker
1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Ở thanh menu bên trái, vào **Compute (Workers & Pages)** -> Chọn Worker **`stock-analysis-ai`**.
3. Bấm vào tab hoặc nút **Edit code** (hoặc **Quick edit** ở góc trên bên phải).

---

### Bước 2: Dán Đoạn Code Sau Vào Worker

Xóa toàn bộ nội dung cũ trong trình soạn thảo và dán đoạn code chuẩn hóa này vào:

```javascript
/**
 * Cloudflare Worker Reverse Proxy & Edge Cache cho Vercel
 * Origin: https://stock-analysis-ai-ten.vercel.app
 */

const VERCEL_ORIGIN = "https://stock-analysis-ai-ten.vercel.app";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, VERCEL_ORIGIN);

    // 1. Kiểm tra Cache Edge đối với tài nguyên tĩnh (JS, CSS, Hình ảnh, Font)
    const cache = caches.default;
    const isStaticAsset =
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2|woff|ttf|css|js)$/);

    if (request.method === "GET" && isStaticAsset) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // 2. Chuyển tiếp Request sang Vercel
    const headers = new Headers(request.headers);
    headers.set("Host", new URL(VERCEL_ORIGIN).host);
    headers.set("X-Forwarded-Host", url.host);
    headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
      redirect: "manual",
    });

    // 3. Thiết lập Header phản hồi & Tự động lưu Cache tại Cloudflare Edge
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    if (isStaticAsset && response.status === 200) {
      responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
      const clonedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
      // Lưu vào Cloudflare Cache ngầm
      ctx.waitUntil(cache.put(request, clonedResponse.clone()));
      return clonedResponse;
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
```

---

### Bước 3: Bấm "Save and Deploy"

1. Nhìn lên góc trên bên phải màn hình Cloudflare, bấm nút **Save and deploy** (hoặc **Deploy**).
2. Đợi 3 giây để hệ thống thông báo Deploy thành công.

---

## 🏁 Kiểm Tra Kết Quả

Bây giờ bạn hãy mở link:
👉 **`https://stock-analysis-ai.hungntvt.workers.dev/ranking`**

1. Bạn sẽ thấy giao diện tải nhanh tức thì.
2. Bấm nút **"Bắt đầu quét thị trường"**:
   - Tầng 1 lọc nhanh Vietcap: ~89 mã.
   - Tầng 2 chấm điểm chuyên sâu: **Chấm đầy đủ toàn bộ 89 mã** (vì Vercel ở đằng sau xử lý không bị trần 50 subrequests).
3. Toàn bộ file tĩnh (Next.js chunks, CSS, icons) sẽ được Cloudflare Edge CDN gánh 100%, Vercel không còn bị email báo hết 10 GB nữa!
