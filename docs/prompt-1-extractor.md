# Prompt 1 — Extractor Prompt (Chạy Cuối Ngày Trên GitHub Actions)

> **Vai trò:** Đọc tài liệu PDF (BCTN, Báo cáo CTCK, NQ ĐHCĐ) thông qua Gemini Native PDF File API.
> Bóc tách toàn bộ dữ liệu định tính vào file JSON Insights lưu trên Cloudflare R2.
> File JSON này là đầu vào duy nhất từ tài liệu cho Prompt 2 (Synthesizer) khi người dùng bấm Phân Tích AI.

---

## Đầu Vào Của Prompt 1

Mỗi lần chạy cho 1 mã cổ phiếu, Prompt 1 nhận:

| Đầu vào | Nguồn | Ghi chú |
| :--- | :--- | :--- |
| `TICKER` | Tham số script | Ví dụ: `HPG`, `VHM`, `MBB` |
| `brokerMetadata[]` | Simplize API (đã có sẵn) | Mảng JSON gồm `source`, `issueDate`, `title`, `targetPrice`, `recommend`, `attachedLink` — **KHÔNG để AI suy đoán lại** |
| File PDF 1: BCTN | Cafef CDN | `https://cafefnew.mediacdn.vn/.../HPG_25CN_BCTN.pdf` |
| File PDF 2-3: Báo cáo CTCK | Simplize CDN | Lấy từ `attachedLink` của 2-3 báo cáo mới nhất |
| File PDF 4: NQ ĐHCĐ | Vietstock | `https://static2.vietstock.vn/data/HOSE/{year}/NGHI%20QUYET%20DHCD/VN/{TICKER}_Nghiquyet_DHDCD_thuong_nien_{year}.pdf` |

---

## Văn Bản Prompt 1 (Hoàn Chỉnh)

```
Bạn là Chuyên gia Nghiên cứu Phân tích Tài chính Cấp cao (Senior Equity Research Analyst).

Nhiệm vụ: Đọc TOÀN BỘ các tài liệu đính kèm (BCTN, Báo cáo Phân tích CTCK, NQ ĐHCĐ)
của mã chứng khoán: {{TICKER}}.

Bóc tách và xuất TOÀN BỘ dữ liệu định tính và dữ liệu vận hành theo đúng JSON Schema
quy định — để cung cấp nguyên liệu cho bước phân tích chuyên sâu tiếp theo.

════════════════════════════════════════════════════════════
PHẦN I: NGUYÊN TẮC BẮT BUỘC (ZERO-LOSS PRINCIPLE)
════════════════════════════════════════════════════════════

1. TUYỆT ĐỐI KHÔNG TÓM TẮT MƠ HỒ
   Không dùng cụm từ chung chung như "công ty đang mở rộng", "doanh thu tốt",
   "có một số dự án". Phải giữ nguyên: tên riêng, số tiền vốn đầu tư (tỷ VNĐ),
   tỷ lệ % tiến độ, và mốc thời gian cụ thể (Quý/Năm).

2. NGUYÊN TẮC BẢO TOÀN DỰ ÁN (ZERO OMISSION)
   Mọi dự án đang đầu tư, nhà máy mới, khu đô thị mới, chuỗi mở rộng, hay kế hoạch
   CAPEX được nhắc đến BẤT KỲ ĐÂU trong tài liệu đều PHẢI được liệt kê đầy đủ trong
   mảng "sectionC_GrowthProjectsAndExpansion". Không được bỏ sót dù một dự án.

3. THỨ TỰ ƯU TIÊN KHI CÁC NGUỒN MÂU THUẪN NHAU
   Khi số liệu kế hoạch không nhất quán giữa các tài liệu, ưu tiên theo thứ tự:
   1) Nghị quyết ĐHCĐ         ← Quyết định pháp lý mới nhất, uy quyền cao nhất
   2) Báo cáo CTCK (gần nhất) ← Cập nhật thực tế gần nhất
   3) Báo cáo Thường niên     ← Bối cảnh lịch sử và định tính
   Ghi rõ tên tài liệu nguồn cho mỗi số liệu quan trọng.

4. BỎ QUA BẢNG BCTC SỐ THÔ
   Bỏ qua hoàn toàn: Bảng cân đối kế toán, KQKD, LCTT (bảng số liệu ở cuối tài liệu).
   Lý do: Hệ thống đã có 100% số liệu tài chính 20 quý từ Vietcap IQ API.
   Tập trung vào: Báo cáo Ban Giám đốc, Kế hoạch kinh doanh,
   Thuyết minh dự án dở dang, Luận điểm đầu tư của CTCK.

5. METADATA SIMPLIZE — KHÔNG ĐƯỢC SỬA ĐỔI
   Các trường brokerName, reportDate, targetPrice, recommendation trong mảng
   "sectionE_BrokerConsensusAndTheses" phải lấy NGUYÊN VẸN từ mảng brokerMetadata[]
   được cung cấp sẵn — không được suy đoán lại.
   Chỉ dùng AI để bóc tách: keyThesis, catalysts, forecastAssumptions, downsideRisks
   từ nội dung bên trong file PDF.

════════════════════════════════════════════════════════════
PHẦN II: THÍCH ỨNG THEO MÔ HÌNH KINH DOANH (16 NGÀNH ICB VIETCAP)
════════════════════════════════════════════════════════════

Hệ thống ĐÃ XÁC ĐỊNH TRƯỚC ngành nghề của mã cổ phiếu qua Vietcap API (mã ICB / tên ngành)
trước khi gọi Gemini. AI KHÔNG cần tự đoán ngành mà tuân thủ đúng chỉ dẫn chuyên biệt
được truyền vào biến {{INDUSTRY_EXTRACTION_GUIDE}} dưới đây:

{{INDUSTRY_EXTRACTION_GUIDE}}

(Mã nguồn mapping 16 ngành được quản lý tập trung tại `src/lib/industry-extractor-templates.ts`
với đầy đủ 16 nhóm ICB Level 2 chuẩn Vietcap:
  1. 5300: Bán lẻ
  2. 1700: Tài nguyên cơ bản (Thép, Khai khoáng)
  3. 2700: Hàng & Dịch vụ công nghiệp (Cảng biển, Logistics)
  4. 0500: Dầu khí
  5. 8300: Ngân hàng
  6. 3500: Thực phẩm và đồ uống
  7. 1300: Hóa chất & Phân bón
  8. 3300: Ô tô và phụ tùng
  9. 8600: Bất động sản (Dân dụng & KCN)
  10. 3700: Hàng cá nhân & gia dụng (Dệt may, Da giày)
  11. 9500: Công nghệ thông tin
  12. 2300: Xây dựng và vật liệu
  13. 7500: Điện, nước & xăng dầu khí đốt
  14. 5700: Du lịch và giải trí (Hàng không, Khách sạn)
  15. 8500: Bảo hiểm
  16. 8700: Dịch vụ tài chính (Chứng khoán, Quản lý tài sản)
)

════════════════════════════════════════════════════════════
PHẦN III: ĐỊNH DẠNG ĐẦU RA — JSON SCHEMA HOÀN CHỈNH
════════════════════════════════════════════════════════════

Trả về JSON thuần túy (không markdown, không giải thích) theo cấu trúc bên dưới.
```

---

## JSON Schema Hoàn Chỉnh (Output Của Prompt 1)

```json
{
  "ticker": "{{TICKER}}",
  "analyzedAt": "YYYY-MM-DD",
  "industryModel": "Sản xuất | Ngân hàng | Bất động sản | Bán lẻ | Chứng khoán | Khác",
  "documentSources": [
    "BCTN_2024.pdf (Cafef)",
    "BaoCao_Vietcap_2025.pdf (Simplize CDN)",
    "NQ_DHCD_2025.pdf (Vietstock)"
  ],

  "sectionA_CorporateOverview": {
    "businessHistoryAndMilestones": "Năm thành lập, cột mốc phát triển bước ngoặt. Giữ nguyên năm tháng cụ thể.",
    "operatingFootprint": "Địa bàn sản xuất/kinh doanh, khu liên hợp/chi nhánh/thị trường xuất khẩu trọng điểm.",
    "keyManagementAndShareholders": "Chủ tịch HĐQT, TGĐ và tỷ lệ sở hữu. Cổ đông tổ chức/nước ngoài nổi bật.",
    "majorSubsidiariesAndAffiliates": "3-5 công ty con/liên kết đóng góp lớn vào KQKD hợp nhất, tỷ lệ sở hữu và mảng hoạt động.",
    "competitiveLandscapeAndMarketShare": "Đối thủ cạnh tranh chính, thị phần (%) cụ thể của doanh nghiệp và đối thủ lớn nhất."
  },

  "sectionB_IndustrySpecificValueChain": {
    "modelDescription": "2-3 câu mô tả bản chất mô hình kiếm tiền của doanh nghiệp.",
    "inputOrFundingEngine": "Chi tiết theo mô hình ngành (xem Phần II). BẮT BUỘC có số liệu định lượng.",
    "operationOrProductionCapacity": "Chi tiết theo mô hình ngành (xem Phần II). BẮT BUỘC có số liệu định lượng.",
    "outputOrRevenueStreams": "Chi tiết theo mô hình ngành (xem Phần II).",
    "revenueBreakdownEstimate": [
      { "segment": "Mảng kinh doanh lớn nhất", "percentage": 65 },
      { "segment": "Mảng thứ hai", "percentage": 25 },
      { "segment": "Khác", "percentage": 10 }
    ]
  },

  "sectionC_GrowthProjectsAndExpansion": [
    {
      "projectName": "Tên đầy đủ chính thức của dự án/nhà máy/khu đô thị/chuỗi mở rộng",
      "projectType": "Nhà máy mới | Mở rộng công suất | Dự án BĐS | Mở chuỗi | M&A | Khác",
      "totalCapexOrInvestmentBillion": 0,
      "disbursedToDatePct": "Đã giải ngân X% tính đến thời điểm báo cáo",
      "currentConstructionOrLegalProgress": "Tiến độ thực tế: đang lắp máy, đang GPMB, đã có pháp lý 1/3 phân khu...",
      "expectedCommercialStart": "Quý X/NămY — Thời điểm dự kiến chạy thử hoặc bàn giao thương mại",
      "capacityOrScaleAddition": "Tăng thêm bao nhiêu công suất/sản phẩm/cửa hàng khi hoàn thành",
      "estimatedRevenueOrProfitImpact": "Ước tính đóng góp doanh thu hoặc lợi nhuận khi hoạt động full công suất",
      "sourceDocument": "Tên tài liệu nguồn ghi nhận thông tin này"
    }
  ],

  "sectionD_CorporateStrategyAndAGM": {
    "agmRevenueTargetBillion": 0,
    "agmNetProfitTargetBillion": 0,
    "dividendPolicy": "Kế hoạch cổ tức ĐHCĐ đã thông qua: X% tiền mặt, Y% cổ phiếu — hoặc chưa có kế hoạch",
    "capitalPlansAndDilutionRisk": "Kế hoạch ESOP, chào bán riêng lẻ, trái phiếu chuyển đổi (số lượng cổ phiếu và thời gian)",
    "strategicPrioritiesFromLeadership": "Thông điệp chiến lược cốt lõi từ Chủ tịch/TGĐ: hướng ưu tiên dài hạn, thị trường mới, công nghệ mới"
  },

  "sectionE_BrokerConsensusAndTheses": {
    "reportsAnalyzed": [
      {
        "brokerName": "Lấy nguyên từ brokerMetadata[].source — KHÔNG SỬA ĐỔI",
        "reportDate": "Lấy nguyên từ brokerMetadata[].issueDate — KHÔNG SỬA ĐỔI",
        "reportTitle": "Lấy nguyên từ brokerMetadata[].title — KHÔNG SỬA ĐỔI",
        "targetPrice": 0,
        "recommendation": "MUA | KHẢ QUAN | TRUNG LẬP | BÁN — Lấy nguyên từ brokerMetadata[].recommend",
        "keyThesis": "Luận điểm đầu tư cốt lõi từ nội dung PDF: Tại sao CTCK khuyến nghị? Yếu tố nào thay đổi định giá?",
        "catalysts": {
          "volumeDriversQ": "Yếu tố tác động đến sản lượng/quy mô: nhà máy mới, presales, số cửa hàng mới...",
          "priceAndMarginDriversP": "Yếu tố tác động đến giá bán/NIM/biên lợi nhuận: quyền định giá, chính sách thuế...",
          "costEfficiencyDriversC": "Yếu tố tối ưu chi phí: giá nguyên liệu giảm, tiết kiệm quy mô, hết khấu hao..."
        },
        "forecastAssumptions": "Giả định dự phóng KQKD của CTCK: doanh thu/LNST năm X và các giả định chính",
        "downsideRisks": "Rủi ro CTCK cảnh báo nhà đầu tư cần theo dõi"
      }
    ],
    "consensusSummary": "Điểm đồng thuận chung giữa các CTCK? Có CTCK nào bất đồng quan điểm và lý do?"
  },

  "sectionF_EarningsQualityAndRisks": {
    "oneOffItemsAndCoreEarnings": {
      "recentOneOffItems": "Các khoản thu nhập/chi phí bất thường trong 1-2 năm gần nhất: lãi thanh lý tài sản, hoàn nhập dự phòng, tiền bồi thường... (tên khoản và giá trị tỷ VNĐ)",
      "coreEarningsDrivers": "Các động lực lợi nhuận cốt lõi tái diễn, phân biệt với khoản thu nhập một lần"
    },
    "capitalStructureChanges": {
      "esopOrNewShareIssuance": "Số lượng cổ phiếu ESOP hoặc phát hành mới theo kế hoạch ĐHCĐ phê duyệt (triệu cổ phiếu)",
      "convertibleBondsOrWarrants": "Trái phiếu chuyển đổi hoặc chứng quyền gây pha loãng trong 1-2 năm tới",
      "estimatedFullyDilutedSharesMillion": 0
    },
    "riskFactors": {
      "industryAndMacroRisks": "Rủi ro chu kỳ ngành, vĩ mô, tỷ giá, lãi suất, chính sách nhà nước, cạnh tranh quốc tế...",
      "companySpecificRisks": "Rủi ro riêng: pháp lý dự án, tập trung khách hàng lớn, phụ thuộc nhà cung cấp, nợ vay cao...",
      "executionRisks": "Rủi ro thực thi: tiến độ xây dựng chậm, chi phí vượt ngân sách, thiếu hụt nhân lực..."
    }
  }
}
```

---

## Cách Tích Hợp Vào Script GitHub Actions

```typescript
// scripts/sync-market-data.ts

async function extractInsightsForTicker(ticker: string) {
  // 1. Lấy metadata từ Simplize API (không cần AI đọc lại)
  const brokerMetadata = await fetchSimplizeBrokerMetadata(ticker);

  // 2. Upload PDF lên Gemini File API (Native Multimodal)
  const bctnFile    = await uploadPdfToGemini(getCafefBctnUrl(ticker, 2024));
  const agmFile     = await uploadPdfToGemini(getVietstockAgmUrl(ticker, 2025));
  const brokerFiles = await Promise.all(
    brokerMetadata.slice(0, 3).map(b => uploadPdfToGemini(b.attachedLink))
  );

  // 3. Gọi Gemini với toàn bộ PDF (Native PDF Understanding — không cần tách ảnh thủ công)
  const prompt = PROMPT_1_TEMPLATE
    .replace('{{TICKER}}', ticker)
    + `\n\nMETADATA SIMPLIZE (Không được sửa đổi):\n${JSON.stringify(brokerMetadata.slice(0, 3))}`;

  const result = await gemini.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { fileData: { mimeType: 'application/pdf', fileUri: bctnFile.uri } },
        { fileData: { mimeType: 'application/pdf', fileUri: agmFile.uri } },
        ...brokerFiles.map(f => ({ fileData: { mimeType: 'application/pdf', fileUri: f.uri } }))
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,       // Thấp để đảm bảo độ chính xác khi trích xuất
      maxOutputTokens: 8192,
    }
  });

  // 4. Lưu JSON insights lên Cloudflare R2
  const insightsJson = JSON.parse(result.response.text());
  await uploadToR2(`insights/${ticker}.json`, insightsJson);
  console.log(`✅ ${ticker}: Insights extracted and saved to R2`);
}
```

---

## Cách Prompt 2 Sử Dụng File Insights

```typescript
// src/lib/ai-analyzer.ts — Prompt 2 (Synthesizer)

const insightsData = await fetch(`${CDN_BASE_URL}/insights/${ticker}.json`).then(r => r.json());

const prompt2 = `
Bạn là chuyên gia phân tích đầu tư theo phương pháp ValueX 150 điểm.
Hãy lập BÁO CÁO PHÂN TÍCH ĐẦU TƯ hoàn chỉnh cho ${ticker}.

--- SỐ LIỆU TÀI CHÍNH THỰC TẾ (VIETCAP IQ API - 12 QUÝ GẦN NHẤT) ---
${vietcapTableMarkdown}

--- DỮ LIỆU ĐỊNH TÍNH & DỰ ÁN (BCTN, NQ ĐHCĐ & BÁO CÁO CTCK) ---
${JSON.stringify(insightsData, null, 2)}

YÊU CẦU: Viết báo cáo 6 Section theo chuẩn ValueX, súc tích 80-150 từ/trường...
`;
```

---

## Bảng Đảm Bảo Chất Lượng Toàn Diện

| Section Prompt 2 Cần | Cung Cấp Bởi Prompt 1 | Trường JSON |
| :--- | :--- | :--- |
| A: Tổng quan doanh nghiệp | ✅ | `sectionA_CorporateOverview` |
| B: Chuỗi giá trị (đa ngành) | ✅ | `sectionB_IndustrySpecificValueChain` |
| C + D: Dự án mở rộng (Pillar 1 & 2) | ✅ | `sectionC_GrowthProjectsAndExpansion` |
| D: Độ bền tăng trưởng (Pillar 2) | ✅ | `sectionD.agmTargets` + `sectionE.catalysts` |
| E: Quản trị & Phân bổ vốn (Pillar 3) | ✅ | `sectionD_CorporateStrategyAndAGM` |
| F: Catalyst P/Q/C & Dự phóng Bottom-Up | ✅ | `sectionE.catalysts` |
| F: EPS Diluted (tính pha loãng đúng) | ✅ | `sectionF.capitalStructureChanges.estimatedFullyDilutedSharesMillion` |
| C: Chất lượng lợi nhuận (Pillar 1-F) | ✅ | `sectionF.oneOffItemsAndCoreEarnings` |
| D + E: Rủi ro điều chỉnh | ✅ | `sectionF.riskFactors` |
| Tất cả Section: Luận điểm CTCK | ✅ | `sectionE_BrokerConsensusAndTheses` |
