# API Contract: Next.js Frontend ↔ Python Worker (FastAPI)

> **Phiên bản:** 1.0 — Phase 0 xác nhận  
> **Môi trường Worker:** Hugging Face Spaces (Docker) — `https://{username}-{space-name}.hf.space`  
> **Auth:** Mọi request từ Next.js đến Worker phải kèm header `X-Worker-Secret: {WORKER_SECRET}` để tránh endpoint bị gọi công khai.

---

## 1. Health Check

```
GET /health
```

**Response 200:**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

## 2. Crawl Danh Mục Tài Liệu Tham Khảo

```
GET /crawl/{ticker}?exchange=HOSE
```

**Path params:**
- `ticker` — Mã cổ phiếu (VD: `HPG`, `VNM`)

**Query params:**
- `exchange` — Sàn giao dịch: `HOSE` | `HNX` | `UPCOM` (default: `HOSE`)

**Response 200:**
```json
{
  "ticker": "HPG",
  "exchange": "HOSE",
  "cached": false,
  "crawledAt": "2026-09-04T15:00:00Z",
  "cacheExpiresAt": "2026-09-05T15:00:00Z",
  "annualReports": [
    {
      "type": "BCTN",
      "year": 2025,
      "label": "Báo Cáo Thường Niên 2025 - HPG",
      "downloadUrl": "https://cafefnew.mediacdn.vn/...",
      "source": "cafef.vn",
      "verified": true
    }
  ],
  "quarterlyFinancials": [
    {
      "type": "BCTC_HN",
      "year": 2025,
      "quarter": 2,
      "label": "BCTC Hợp Nhất Q2/2025 - HPG",
      "downloadUrl": "https://static2.vietstock.vn/...",
      "source": "vietstock.vn",
      "verified": true
    }
  ],
  "agmResolutions": [
    {
      "type": "NQ_DHCD",
      "year": 2025,
      "label": "NQ ĐHCĐ Thường Niên 2025 - HPG",
      "downloadUrl": "https://static2.vietstock.vn/...",
      "source": "vietstock.vn",
      "verified": false
    }
  ],
  "brokerReports": [
    {
      "type": "BROKER_REPORT",
      "title": "HPG - Cập nhật kết quả kinh doanh Q2/2025",
      "date": "2025-08-01",
      "downloadUrl": "https://...",
      "source": "simplize.vn",
      "analyst": "VCSC"
    }
  ],
  "summary": {
    "totalFound": 14,
    "annualReportsFound": 3,
    "quarterlyFinancialsFound": 8,
    "agmResolutionsFound": 3
  }
}
```

**Response 404:** Ticker không tồn tại
```json
{ "error": "Ticker not found", "ticker": "XYZ" }
```

**Response 503:** Tất cả nguồn crawl thất bại
```json
{ "error": "All crawl sources failed", "sources": ["cafef.vn", "vietstock.vn"] }
```

---

## 3. Parse PDF

```
POST /parse-pdf
Content-Type: multipart/form-data
```

**Form fields:**
- `file` — File PDF upload (max 50MB)
- `ticker` _(optional)_ — Mã cổ phiếu để cải thiện độ chính xác khi nhận diện bảng

**Response 200:**
```json
{
  "pageCount": 45,
  "isScanned": false,
  "text": "BẢNG CÂN ĐỐI KẾ TOÁN...",
  "tables": [
    {
      "page": 3,
      "tableType": "income_statement",
      "headers": ["Chỉ tiêu", "Q2/2025", "Q2/2024", "Lũy kế 6T/2025"],
      "rows": [
        ["Doanh thu thuần", "45,230", "38,100", "89,450"],
        ["Lợi nhuận sau thuế", "3,200", "2,800", "6,100"]
      ]
    }
  ],
  "metadata": {
    "fileName": "HPG_BCTC_Q2_2025.pdf",
    "fileSizeMb": 2.3
  }
}
```

**Response 413:** File quá lớn
```json
{ "error": "File too large. Maximum size is 50MB." }
```

**Response 422:** File không phải PDF hoặc bị lỗi
```json
{ "error": "Could not parse PDF file. File may be corrupted." }
```

---

## 4. Lưu ý tích hợp cho Next.js (Proxy Layer)

### Biến môi trường cần thêm vào Netlify:
```
PYTHON_WORKER_URL=https://{username}-{space-name}.hf.space
WORKER_SECRET=<random-secret-string>
```

### Helper `fetchWorker()` (gợi ý implementation):
```typescript
// src/lib/worker-client.ts
const WORKER_URL = process.env.PYTHON_WORKER_URL;
const WORKER_SECRET = process.env.WORKER_SECRET;

export async function fetchWorker(path: string, init?: RequestInit) {
  if (!WORKER_URL) throw new Error('PYTHON_WORKER_URL chưa được cấu hình');
  return fetch(`${WORKER_URL}${path}`, {
    ...init,
    headers: {
      'X-Worker-Secret': WORKER_SECRET || '',
      ...init?.headers,
    },
  });
}
```

### Mapping route Next.js → Worker:
| Next.js Route | Python Worker Endpoint |
|---|---|
| `GET /api/stocks/[ticker]/reference-documents` | `GET /crawl/{ticker}?exchange=...` |
| `POST /api/analysis/parse-pdf` | `POST /parse-pdf` |
| `GET /api/stocks/[ticker]/financials` | **Giữ nguyên Vietcap — không đổi** |
| `POST /api/analysis/generate` | **Giữ nguyên Netlify Edge — không đổi** |
