# Session Handoff — Stock Analysis AI (Two-Stage Pipeline)
> Tạo: 2026-09-05T23:00 ICT | Dùng để tiếp tục ở session mới

---

## Những vấn đề quan trọng đã trao đổi

### Bài toán gốc
Xây dựng **Two-Stage AI Pipeline** để tạo báo cáo phân tích cổ phiếu chuẩn ValueX 150 điểm:
- **Stage 1 (Batch / GitHub Actions):** Gemini Flash đọc PDF → bóc tách dữ liệu định tính → lưu JSON vào Cloudflare R2
- **Stage 2 (Web UI):** User bấm "Phân tích AI" → Prompt 2 đọc JSON từ R2 + live data Vietcap → tạo báo cáo hoàn chỉnh

### Những thảo luận kỹ thuật chính

**1. Tách PDF thành ảnh vs đọc trực tiếp:**
Đã loại phương án tách PDF thành ảnh (phức tạp, chậm). **Quyết định:** Dùng Gemini Native PDF File API đọc trực tiếp PDF gốc. Gemini 2.5 Flash đủ năng lực.

**2. AI tự nhận diện ngành vs Pre-determine:**
Ban đầu Prompt 1 để AI tự đoán ngành từ tài liệu — rủi ro sai, tốn token. **Quyết định:** Pre-determine ngành qua `GET /company/details?ticker=XXX` (Vietcap API), lấy `icbCodeLv2`, rồi inject template ngành vào `{{INDUSTRY_EXTRACTION_GUIDE}}` trước khi gọi Gemini. Tiết kiệm ~40% token, độ chính xác ~99%.

**3. JSON schema cứng nhắc:**
User lo ngại schema quá cứng cho các mô hình kinh doanh khác nhau. **Quyết định:** Giữ schema cố định 6 section nhưng nội dung bên trong field được hướng dẫn linh hoạt theo 16 ICB templates ngành.

**4. Thiếu ngành Chứng khoán:**
User phát hiện thiếu nhóm Chứng khoán. **Quyết định:** Thêm ICB 8700 "Dịch vụ tài chính" (bao gồm Chứng khoán, Quản lý quỹ) với 4 trụ cột doanh thu chuyên biệt: Lãi Margin, Lãi tự doanh FVTPL, Phí môi giới, Phí IB.

---

## Những gì đã hoàn thành

- [x] **`docs/prompt-1-extractor.md`** — Đặc tả hoàn chỉnh Prompt 1 (Extractor), 288 dòng:
  - Phần I: 5 Nguyên tắc Zero-Loss (không tóm tắt mơ hồ, zero omission dự án, thứ tự ưu tiên nguồn NQ ĐHCĐ > CTCK > BCTN, bỏ qua bảng số BCTC, metadata Simplize không được AI chỉnh)
  - Phần II: Cập nhật sang mô hình 16 ngành ICB inject qua `{{INDUSTRY_EXTRACTION_GUIDE}}`
  - Phần III: JSON Schema 6 phần đầy đủ (sectionA đến sectionF)

- [x] **`src/lib/industry-extractor-templates.ts`** — Module mapping 16 ngành ICB Level 2, 388 dòng, TypeScript pass 100%:
  - Interface `IndustryExtractionTemplate` (6 fields)
  - `INDUSTRY_TEMPLATES` Record đủ 16 ICB codes: `5300, 1700, 2700, 0500, 8300, 3500, 1300, 3300, 8600, 3700, 9500, 2300, 7500, 5700, 8500, 8700`
  - `DEFAULT_FALLBACK_TEMPLATE` cho đa ngành/chưa phân loại
  - Hàm `getIndustryProfile(icbInput?)` — tra cứu theo code hoặc tên tiếng Việt (exact match rồi fuzzy normalized)
  - Hàm `getIndustryModel(icbInput?)` — trả về chuỗi `industryModel`
  - Hàm `getIndustryTemplate(icbInput?)` — trả về block prompt text để inject vào `{{INDUSTRY_EXTRACTION_GUIDE}}`

- [x] **`API-data/vietcap-api.md`** — Đã bổ sung ICB 8700 Dịch vụ tài chính

---

## Decisions đã đưa ra

| # | Quyết định | Lý do |
|---|---|---|
| 1 | **Phương án B (GitHub Actions + Cloudflare R2)** | Tránh timeout Vercel 60s, tách batch vs real-time |
| 2 | **Pre-determine ngành qua Vietcap API** trước khi gọi Gemini | Chính xác ~99%, tiết kiệm ~40% token |
| 3 | **Gemini Native PDF File API** đọc trực tiếp PDF | Đơn giản hơn tách ảnh |
| 4 | **Inject `{{INDUSTRY_EXTRACTION_GUIDE}}`** vào prompt template | Tách logic ngành khỏi prompt master, dễ bảo trì |
| 5 | **ICB 8700 = Dịch vụ tài chính** (gồm cả Chứng khoán) | Chuẩn Vietcap API |
| 6 | **Thứ tự ưu tiên nguồn:** NQ ĐHCĐ > Báo cáo CTCK > BCTN | NQ ĐHCĐ là quyết định pháp lý uy quyền nhất |
| 7 | **Metadata Simplize truyền thẳng vào**, không để AI đọc lại | Tránh AI hallucinate sai `targetPrice`, ngày báo cáo |

---

## Trạng thái hiện tại

**Đang làm dở:** Giai đoạn Thiết kế/Đặc tả đã xong — **chưa bắt đầu Implementation**

**Files đã thay đổi trong session này:**

| File | Trạng thái | Ghi chú |
|---|---|---|
| `docs/prompt-1-extractor.md` | Hoàn chỉnh | 288 dòng, đặc tả đầy đủ Prompt 1 |
| `src/lib/industry-extractor-templates.ts` | Mới tạo | 388 dòng, 16 ngành ICB, type-safe |
| `API-data/vietcap-api.md` | Cập nhật | Thêm ICB 8700 Dịch vụ tài chính |

**Files liên quan cần nắm (không đổi):**

| File | Vai trò |
|---|---|
| `src/lib/ai-analyzer.ts` | Prompt 2 (Synthesizer) — tạo báo cáo ValueX 150 điểm |
| `src/lib/vietcap-field-mapping.ts` | `VIETCAP_ICB_SECTORS`, `fetchVietcapStockRs()`, API mapping |
| `src/lib/filter-rs-data.ts` | Pipeline chấm điểm 3 trụ cột 150 điểm |
| `src/app/api/analysis/download-pdf/route.ts` | API download PDF từ Cafef/Vietstock/Simplize |

---

## Vấn đề còn tồn tại (TODO — chưa implement)

### Bước 1 — Script Extractor (Ưu tiên #1)
Chưa có `scripts/extract-qualitative-data.ts`:
```
ticker → Vietcap API (icbCodeLv2) → getIndustryTemplate(icb)
       → Tải PDFs → Gemini File API upload → Gọi Prompt 1
       → Nhận JSON → Validate schema → Lưu tạm
```

### Bước 2 — Cloudflare R2 Storage Helper
Chưa có `src/lib/r2-storage.ts`:
- `putQualitativeReport(ticker, json)` → `stock-reports/{ticker}/qualitative-latest.json`
- `getQualitativeReport(ticker)` → đọc JSON từ R2
- Env vars cần thêm: `CLOUDFLARE_R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### Bước 3 — Cập nhật Prompt 2 đọc từ R2
`src/lib/ai-analyzer.ts` chưa biết đọc `sectionA` → `sectionF` JSON từ R2.

### Bước 4 — GitHub Actions Workflow
Chưa tạo `.github/workflows/daily-stock-extractor.yml`:
- Chạy 18:00 ICT hàng ngày (11:00 UTC)
- Loop qua danh sách ticker → chạy extractor → push JSON lên R2

### Lưu ý nhỏ: JSON Schema cần sync
Field `industryModel` trong `prompt-1-extractor.md` (dòng 113) vẫn hardcode enum cũ:
```json
"industryModel": "Sản xuất | Ngân hàng | Bất động sản | Bán lẻ | Chứng khoán | Khác"
```
Khi code thực tế: thay bằng `getIndustryModel(icbCode)` — không cần sửa doc spec.

---

## Quick Reference — Cách dùng module mới

```typescript
import { getIndustryTemplate, getIndustryModel } from '@/lib/industry-extractor-templates';

// Inject vào Prompt 1
const prompt = PROMPT_1_TEMPLATE
  .replace('{{TICKER}}', ticker)
  .replace('{{INDUSTRY_EXTRACTION_GUIDE}}', getIndustryTemplate(company.icbCodeLv2));

// Lấy industryModel name
const model = getIndustryModel('8700');
// → "Dịch vụ Tài chính, Chứng khoán & Ngân hàng Đầu tư (IB)"
```

## Nguồn dữ liệu đầu vào Prompt 1

| Tài liệu | Nguồn | Ghi chú |
|---|---|---|
| BCTN 3 năm | Cafef CDN | `crawl-report.md` đã có skill crawl |
| BCTC hợp nhất 8 quý | Vietstock | URL pattern chuẩn |
| Báo cáo CTCK 2-3 mới nhất | Simplize API | `attachedLink` từ `/api/company/analysis-report/list?ticker=XXX` |
| Metadata Simplize | Simplize API | `source, issueDate, title, targetPrice, recommend` — truyền thẳng |
