import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisReport, StockMarketData, UploadedFile } from '@/types/analysis';
import { fetchFullVietcapData, ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';
import { getQualitativeReport } from '@/lib/r2-storage';
import { QualitativeInsights } from '@/types/qualitative';
import { generateDefaultExpertReport } from '@/lib/default-report';

export { generateDefaultExpertReport };

export function getForecastYearsFromItems(items: ParsedVietcapQuarter[]) {
  const validItems = (items || []).filter((q) => q && q.revenue > 0);
  if (validItems.length > 0) {
    let maxItem = validItems[0];
    validItems.forEach((item) => {
      const qNum = item.quarter || parseInt(item.period?.split('/')[0]?.replace('Q', '') || '1');
      const yNum = item.year || parseInt(item.period?.split('/')[1] || '2026');
      const maxQNum = maxItem.quarter || parseInt(maxItem.period?.split('/')[0]?.replace('Q', '') || '1');
      const maxYNum = maxItem.year || parseInt(maxItem.period?.split('/')[1] || '2026');

      if (yNum * 10 + qNum > maxYNum * 10 + maxQNum) {
        maxItem = item;
      }
    });

    const maxQNum = maxItem.quarter || parseInt(maxItem.period?.split('/')[0]?.replace('Q', '') || '1');
    const maxYNum = maxItem.year || parseInt(maxItem.period?.split('/')[1] || '2026');

    if (maxQNum === 4) {
      const year1 = maxYNum + 1;
      return { year1, year2: year1 + 1, latestQuarter: maxItem.period };
    } else {
      const year1 = maxYNum;
      return { year1, year2: year1 + 1, latestQuarter: maxItem.period };
    }
  }

  const currentYear = new Date().getFullYear();
  return { year1: currentYear, year2: currentYear + 1, latestQuarter: '' };
}

async function fetchVietcapFinancialContext(ticker: string, marketData: StockMarketData): Promise<{ text: string; year1: number; year2: number; latestQuarter: string }> {
  const defaultYear = new Date().getFullYear();
  try {
    const cleanTicker = ticker.trim().toUpperCase();
    const items = await fetchFullVietcapData(cleanTicker);
    if (!items || items.length === 0) return { text: '', year1: defaultYear, year2: defaultYear + 1, latestQuarter: '' };

    const { year1, year2, latestQuarter } = getForecastYearsFromItems(items);

    // Lấy chuỗi P/E từ 12-20 quý gần nhất
    const recentItems = items.slice(-20);
    const peValues = recentItems.map((it) => it.pe).filter((pe) => typeof pe === 'number' && pe > 0);
    if (peValues.length > 0) {
      const realPeMin = Math.round(Math.min(...peValues) * 10) / 10;
      const realPeMax = Math.round(Math.max(...peValues) * 10) / 10;
      const realPeAvg = Math.round((peValues.reduce((s, c) => s + c, 0) / peValues.length) * 10) / 10;

      marketData.pe5YearMin = realPeMin;
      marketData.pe5YearMax = realPeMax;
      marketData.pe5YearAvg = realPeAvg;
    }

    const lastShares = items.slice().reverse().find((it) => it.sharesOutstandingMillions > 0)?.sharesOutstandingMillions;
    if (lastShares) {
      marketData.sharesOutstanding = lastShares;
    }

    let text = `\n--- DỮ LIỆU BÁO CÁO TÀI CHÍNH SỐ HÓA THỰC TẾ VÀ CHỈ SỐ P/E TỪ VIETCAP IQ API CHO ${cleanTicker} (TỪ 2018 - NAY) ---\n`;
    text += `| Quý | Doanh Thu (Tỷ) | LN Gộp (Tỷ) | LNST CĐ Mẹ (Tỷ) | P/E (lần) | P/B (lần) | Biên Gộp (%) | ROE (%) | Nợ Vay (Tỷ) | LCT HĐKD (Tỷ) |\n`;
    text += `|---|---|---|---|---|---|---|---|---|---|\n`;

    // Hiển thị 12 quý gần nhất trong bảng chi tiết cho prompt gọn gàng
    const displayItems = items.slice(-12);
    displayItems.forEach((it: ParsedVietcapQuarter) => {
      text += `| ${it.period} | ${it.revenue.toFixed(1)} | ${it.grossProfit.toFixed(1)} | ${it.netProfit.toFixed(1)} | ${it.pe > 0 ? it.pe.toFixed(1) + 'x' : 'N/A'} | ${it.pb > 0 ? it.pb.toFixed(1) + 'x' : 'N/A'} | ${it.grossMargin.toFixed(1)}% | ${it.roe.toFixed(1)}% | ${it.totalDebt.toFixed(1)} | ${it.netOperatingCashFlow.toFixed(1)} |\n`;
    });

    if (peValues.length > 0) {
      text += `\nCHỈ SỐ P/E THỰC TẾ TRÍCH XUẤT TỪ VIETCAP IQ API:\n`;
      text += `- P/E Thấp nhất (Bear): ${marketData.pe5YearMin}x\n`;
      text += `- P/E Trung bình (Base): ${marketData.pe5YearAvg}x\n`;
      text += `- P/E Cao nhất (Bull): ${marketData.pe5YearMax}x\n`;
    }

    const latestItem = items[items.length - 1];
    if (latestItem?.noteHighlights) {
      text += `\nTHUYẾT MINH BCTC NỔI BẬT (${latestItem.period}):\n`;
      text += `- Tiền gửi ngân hàng & Tiền mặt: ${latestItem.noteHighlights.cashInBankBillion?.toFixed(1) || 0} tỷ VNĐ\n`;
      text += `- Tiền gửi có kỳ hạn ngắn hạn: ${latestItem.noteHighlights.shortTermDepositsBillion?.toFixed(1) || 0} tỷ VNĐ\n`;
      text += `- Doanh thu tài chính / Lãi tiền gửi: ${latestItem.noteHighlights.interestIncomeBillion?.toFixed(1) || 0} tỷ VNĐ\n`;
      text += `- Chi phí lãi vay phát sinh: ${latestItem.noteHighlights.interestExpenseBillion?.toFixed(1) || 0} tỷ VNĐ\n`;
    }

    text += `\nQUÝ MỚI NHẤT ĐÃ CÓ BCTC THỰC TẾ TRÊN VIETCAP IQ LÀ: ${latestQuarter || 'N/A'}.\n`;
    text += `DỰ PHÓNG SẼ THỰC HIỆN CHO 2 NĂM TỚI: NĂM 1 = ${year1}, NĂM 2 = ${year2}.\n`;
    text += `HÃY SỬ DỤNG CHÍNH XÁC CÁC CHỈ SỐ P/E THỰC TẾ TRÊN KHI ĐỊNH GIÁ (Section F): peBear = ${marketData.pe5YearMin || 0}, peBase = ${marketData.pe5YearAvg || 0}, peBull = ${marketData.pe5YearMax || 0}.\n`;

    return { text, year1, year2, latestQuarter };
  } catch (err) {
    console.warn('Failed to fetch Vietcap financial context for AI:', err);
    return { text: '', year1: defaultYear, year2: defaultYear + 1, latestQuarter: '' };
  }
}

export async function generateAnalysisReport(
  ticker: string,
  marketData: StockMarketData,
  uploadedFiles: UploadedFile[],
  preferredModel?: string
): Promise<AnalysisReport> {
  // If running in the browser, fetch from the server-side API route with extended timeout
  if (typeof window !== 'undefined') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3-minute timeout for deep Gemini 3.6 Flash processing
    try {
      const response = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker, marketData, uploadedFiles, preferredModel: preferredModel || 'gemini-3.7-flash' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return await response.json();
      }
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi từ server (${response.status}) khi khởi tạo báo cáo AI`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Quá thời gian kết nối (3 phút) khi tạo báo cáo bằng Gemini 3.6 Flash.');
      }
      throw err;
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;

  let combinedText = uploadedFiles
    .map((f) => `--- File: ${f.name} (${f.type}) ---\n${f.content || 'Nội dung file PDF/Document'}`)
    .join('\n\n');

  // 1. Tự động đọc dữ liệu định tính chuyên sâu từ Cloudflare R2 / Local Disk Cache
  let qualitativeInsights: QualitativeInsights | null = null;
  try {
    qualitativeInsights = await getQualitativeReport(ticker);
    if (qualitativeInsights) {
      console.log(`[AI Analyzer] ✓ Đã tìm thấy dữ liệu định tính chuyên sâu từ R2 cho ${ticker}`);
    }
  } catch (r2Err) {
    console.warn(`[AI Analyzer] Không thể tải dữ liệu định tính từ R2 cho ${ticker}:`, r2Err);
  }

  // Fetch real Vietcap quarterly financial data & real P/E ratios & dynamic forecast years
  const { text: vietcapContext, year1, year2, latestQuarter } = await fetchVietcapFinancialContext(ticker, marketData);
  combinedText = vietcapContext + '\n\n' + combinedText;

  if (qualitativeInsights) {
    combinedText += `\n\n=== DỮ LIỆU ĐỊNH TÍNH CHUYÊN SÂU ĐÃ BÓC TÁCH (PDF BCTN, NQ ĐHCĐ, BÁO CÁO CTCK TỪ CLOUDFLARE R2) ===\n`;
    combinedText += JSON.stringify(qualitativeInsights, null, 2);
  }

  if (apiKey) {
    const prompt = `
Bạn là chuyên gia phân tích đầu tư chứng khoán hàng đầu Việt Nam theo phương pháp ValueX chuẩn hóa (150 điểm Trụ cột Doanh nghiệp).
Hãy lập BÁO CÁO PHÂN TÍCH ĐẦU TƯ hoàn chỉnh cho mã chứng khoán ${ticker} (${marketData.companyName}) dựa trên quy trình chuẩn và tài liệu đính kèm:
${qualitativeInsights ? '\nĐẶC BIỆT LƯU Ý: Đã có sẵn DỮ LIỆU ĐỊNH TÍNH CHUYÊN SÂU TỪ R2 (đính kèm phía dưới). BẮT BUỘC sử dụng các dự án mở rộng công suất, tiến độ đầu tư, luận điểm CTCK và phân tích chuỗi giá trị này kết hợp với số liệu Vietcap IQ để tổng hợp báo cáo siêu tốc, chính xác 100%.' : ''}

YÊU CẦU BẮT BUỘC VỀ NỘI DUNG VÀ ĐỊNH DẠNG:
- Phân tích súc tích, chuyên sâu, giàu dữ liệu định lượng (mỗi trường văn bản khoảng 80-150 từ, có dẫn chứng số liệu rõ ràng).
- TRÌNH BÀY VĂN BẢN MẠCH LẠC, DỄ ĐỌC: Sử dụng các tiêu đề phụ in đậm rõ ràng (ví dụ: **1. Yếu tố Sản lượng (Q):** ...), dùng dấu gạch đầu dòng '-' hoặc '•' để liệt kê ý chi tiết.
- ĐẢM BẢO TRẢ VỀ JSON HỢP LỆ 100%: Cung cấp đầy đủ toàn bộ các trường JSON được yêu cầu bên dưới, không bỏ sót trường nào.

THÔNG SỐ THỊ TRƯỜNG & DỰ PHÓNG NĂM (${year1} VÀ ${year2}):
- Ngành: ${marketData.industry}
- Giá hiện tại: ${marketData.currentPrice ? marketData.currentPrice + ' VND' : 'N/A'}
- Quý thực tế mới nhất: ${latestQuarter || 'N/A'}
- Hai năm cần dự phóng: Năm 1 = ${year1}, Năm 2 = ${year2}
- P/E Trung bình (Base) các quý thực tế từ Vietcap IQ API: ${marketData.pe5YearAvg || 0}x
- P/E Cao nhất (Bull / Max) các quý thực tế từ Vietcap IQ API: ${marketData.pe5YearMax || 0}x
- P/E Thấp nhất (Bear / Min) các quý thực tế từ Vietcap IQ API: ${marketData.pe5YearMin || 0}x

YÊU CẦU CẤU TRÚC BÁO CÁO (JSON 6 PHẦN):
A. Tổng quan doanh nghiệp:
  - historyAndOverview: Lịch sử hình thành chi tiết, cột mốc lớn, địa bàn hoạt động, sản phẩm chính, đối thủ cạnh tranh chính kèm số liệu thị phần.
  - shareholdersAndManagement: Cơ cấu cổ đông lớn, ban lãnh đạo.
  - subsidiariesAndAffiliates: Cơ cấu công ty con, công ty liên kết.

B. Hoạt động kinh doanh & Chuỗi giá trị:
  - valueChainInput: Chuỗi giá trị Đầu vào (tỷ trọng chi phí, nhà cung cấp).
  - valueChainProduction: Quy trình sản xuất/vận hành & Năng lực công suất.
  - valueChainOutput: Đầu ra (Cơ cấu doanh thu sản phẩm/dịch vụ).
  - revenueBreakdown: Mảng JSON các phân khúc doanh thu.

C. Sức khỏe tài chính (ValueX Pillar 1 - 50 điểm):
  - partA_LiquidityAndDebt: Nhóm A - Thanh khoản & Trả nợ (Current/Quick Ratio, Net Debt/EBITDA, Interest Coverage).
  - partB_CashFlowAndEarnings: Nhóm B - Dòng tiền & Chuyển đổi lợi nhuận (CFO/LNST core, FCF sau CAPEX, CFO/EBITDA, tính bền vững dòng tiền).
  - partC_ProfitabilityAndROIC: Nhóm C - Sinh lời & Hiệu quả vốn (ROIC vs WACC, ROE điều chỉnh đòn bẩy D/E, Biên gộp, Biên EBIT, Vòng quay tài sản).
  - partD_WorkingCapitalAndAssetQuality: Nhóm D - Vốn lưu động & Chất lượng tài sản (DSO, DIO, Chu kỳ tiền mặt CCC, chất lượng tài sản & XDCB dở dang).
  - partE_CapitalStructureAndFunding: Nhóm E - Cơ cấu vốn & Khả năng tài trợ (Đòn bẩy D/E, cơ cấu nợ ngắn/dài hạn, khả năng tự tài trợ CAPEX).
  - partF_EarningsQualityAndAccounting: Nhóm F - Chất lượng lợi nhuận & Kế toán (Tỷ trọng LNST cốt lõi, loại trừ một lần, kiểm toán và giao dịch bên liên quan).

D. Chất lượng tăng trưởng (ValueX Pillar 2 - 60 điểm):
  - partA_CurrentGrowth: Nhóm A - Tăng trưởng doanh thu và EPS core hiện tại qua Cầu nối Core.
  - partB_VisibilityNext2To4Q: Nhóm B - Độ chắc chắn 2-4 quý tới (Backlog, công suất mở rộng, chỉ báo cầu).
  - partC_MarginDurability: Nhóm C - Độ bền biên lợi nhuận (Gross margin, EBIT margin, Pricing power).
  - partD_GrowthRunway: Nhóm D - Dư địa tăng trưởng (Dư địa công suất, thị phần TAM/SAM, thị trường mới).
  - partE_GrowthToCash: Nhóm E - Tăng trưởng chuyển thành tiền (CFO, hiệu quả ROIC của vốn tăng trưởng mới).
  - partF_MediumTermGrowth: Nhóm F - Tăng trưởng trung hạn (CAGR 3Y, dư địa tái đầu tư).
  - partG_RiskAdjustedSustainability: Nhóm G - Bền vững sau điều chỉnh rủi ro (Tính chu kỳ, thực thi, pha loãng).

E. Chất lượng doanh nghiệp (ValueX Pillar 3 - 40 điểm):
  - partA_EconomicMoat: Nhóm A - Lợi thế cạnh tranh kinh tế (Moat chi phí, mạng lưới, bản quyền, thương hiệu).
  - partB_IndustryPosition: Nhóm B - Vị thế ngành và xu hướng thị phần.
  - partC_BusinessModel: Nhóm C - Mô hình kinh doanh và hiệu quả kinh tế đơn vị.
  - partD_ManagementAndCapitalAllocation: Nhóm D - Ban lãnh đạo và kỷ luật phân bổ vốn (CAPEX, M&A, Cổ tức).
  - partE_CorporateGovernance: Nhóm E - Quản trị công ty, độc lập HĐQT và quyền lợi cổ đông thiểu số.
  - partF_RoicSustenance: Nhóm F - Khả năng duy trì ROIC cao qua chu kỳ và cơ hội tái đầu tư.
  - partG_ShockResilience: Nhóm G - Khả năng chống chịu suy thoái và thích ứng công nghệ.

F. Triển vọng kinh doanh & Định giá:
  - quarterlyForecastReasoning: Trình bày LUẬN ĐIỂM VÀ GIẢ ĐỊNH DỰ PHÓNG DOANH THU & LNST THEO CHUẨN VALUEX. Yêu cầu chi tiết: (1) Xác định 1-2 mảng kinh doanh cốt lõi (chiếm >= 75% doanh thu); (2) Bóc tách định tính 4 nhân tố điều chỉnh doanh thu trên mảng cốt lõi: Tác động Sản lượng/Công suất (tiến độ công suất mới, đơn hàng backlog), Giá bán bình quân ASP (khả năng chuyển giao chi phí, biến động giá thị trường), Cơ cấu sản phẩm/Thị phần/Nhu cầu, và Mùa vụ/Khác; (3) Cơ sở và xu hướng 3 Biên lợi nhuận (Biên gộp, EBITDA, LNST cốt lõi) so với mức trung bình 4 quý lịch sử (áp lực giá vốn COGS vs ASP, đòn bẩy hoạt động SG&A, khấu hao/lãi vay dự án mới); (4) Tuyệt đối KHÔNG chỉ chép lại các con số trần trụi từng quý mà phải cung cấp luận cứ kinh doanh và nguyên nhân tăng giảm cụ thể.
  - forecastYear1Data: Đối tượng JSON gồm 4 quý (q1, q2, q3, q4) cho Năm ${year1}.
  - forecastYear2Data: Đối tượng JSON gồm 4 quý (q1, q2, q3, q4) cho Năm ${year2}.
  - forecastQ1: LNST dự phóng cả năm ${year1} (số nguyên VND).
  - forecastQ2: LNST dự phóng cả năm ${year2} (số nguyên VND).
  - forecastQ3: Đặt bằng 0.
  - forecastQ4: Đặt bằng 0.
  - sharesOutstandingMillions: Số lượng cổ phiếu lưu hành (triệu cổ phiếu).
  - peBase: BẮT BUỘC dùng P/E Trung bình thực tế từ Vietcap IQ API: ${marketData.pe5YearAvg || 0}.
  - peBull: BẮT BUỘC dùng P/E Cao nhất thực tế từ Vietcap IQ API: ${marketData.pe5YearMax || 0}.
  - peBear: BẮT BUỘC dùng P/E Thấp nhất thực tế từ Vietcap IQ API: ${marketData.pe5YearMin || 0}.

Tài liệu đính kèm:
${combinedText.slice(0, 300000)}

Hãy trả về định dạng JSON thuần túy có cấu trúc sau:
{
  "sectionA": {
    "historyAndOverview": "...",
    "shareholdersAndManagement": "...",
    "subsidiariesAndAffiliates": "..."
  },
  "sectionB": {
    "valueChainInput": "...",
    "valueChainProduction": "...",
    "valueChainOutput": "...",
    "revenueBreakdown": [{"name": "Phân khúc 1", "value": 60}, {"name": "Phân khúc 2", "value": 30}, {"name": "Khác", "value": 10}]
  },
  "sectionC": {
    "partA_LiquidityAndDebt": "...",
    "partB_CashFlowAndEarnings": "...",
    "partC_ProfitabilityAndROIC": "...",
    "partD_WorkingCapitalAndAssetQuality": "...",
    "partE_CapitalStructureAndFunding": "...",
    "partF_EarningsQualityAndAccounting": "..."
  },
  "sectionD": {
    "partA_CurrentGrowth": "...",
    "partB_VisibilityNext2To4Q": "...",
    "partC_MarginDurability": "...",
    "partD_GrowthRunway": "...",
    "partE_GrowthToCash": "...",
    "partF_MediumTermGrowth": "...",
    "partG_RiskAdjustedSustainability": "..."
  },
  "sectionE": {
    "partA_EconomicMoat": "...",
    "partB_IndustryPosition": "...",
    "partC_BusinessModel": "...",
    "partD_ManagementAndCapitalAllocation": "...",
    "partE_CorporateGovernance": "...",
    "partF_RoicSustenance": "...",
    "partG_ShockResilience": "..."
  },
  "sectionF": {
    "growthDriversRevenueAndCost": "...",
    "quarterlyForecastReasoning": "...",
    "forecastYear1Data": {
      "q1": {"revenue": 0, "grossMargin": 0, "netProfit": 0},
      "q2": {"revenue": 0, "grossMargin": 0, "netProfit": 0},
      "q3": {"revenue": 0, "grossMargin": 0, "netProfit": 0},
      "q4": {"revenue": 0, "grossMargin": 0, "netProfit": 0}
    },
    "forecastYear2Data": {
      "q1": {"revenue": 0, "grossMargin": 0, "netProfit": 0},
      "q2": {"revenue": 0, "grossMargin": 0, "netProfit": 0},
      "q3": {"revenue": 0, "grossMargin": 0, "netProfit": 0},
      "q4": {"revenue": 0, "grossMargin": 0, "netProfit": 0}
    },
    "forecastQ1": 0,
    "forecastQ2": 0,
    "forecastQ3": 0,
    "forecastQ4": 0,
    "sharesOutstandingMillions": ${marketData.sharesOutstanding || 0},
    "peBase": ${marketData.pe5YearAvg || 0},
    "peBull": ${marketData.pe5YearMax || 0},
    "peBear": ${marketData.pe5YearMin || 0}
  }
}
      `;

    const rawCandidates = [
      preferredModel,
      process.env.GEMINI_MODEL,
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
    ].filter((m): m is string => Boolean(m && typeof m === 'string' && m.trim().length > 0));

    // Deduplicate candidate models
    const candidateModels = Array.from(new Set(rawCandidates));
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError: any = null;
    let isQuotaDepleted = false;

    for (const modelName of candidateModels) {
      try {
        console.log(`[AI Analyzer] Attempting report generation with model: ${modelName}...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        });

        // 45s timeout per model attempt to quickly fallback if Google AI servers encounter high traffic spikes
        const generatePromise = model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Model ${modelName} phản hồi quá lâu (>45s)`)), 45000);
        });

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const text = result.response.text();

        const parsed = repairAndParseJson(text);
        const report = buildReportFromParsed(ticker, marketData, parsed, year1, year2, qualitativeInsights);
        report.generationModel = modelName;
        console.log(`[AI Analyzer] Successfully generated report using model: ${modelName}`);
        return report;
      } catch (err: any) {
        console.warn(`[AI Analyzer] Model ${modelName} failed, trying next fallback:`, err.message || err);
        lastError = err;
        if (err?.message?.includes('prepayment credits') || err?.message?.includes('429')) {
          isQuotaDepleted = true;
        }
      }
    }

    if (isQuotaDepleted) {
      throw new Error(`Lỗi Google AI Studio (429 - Hết hạn mức/Credit): API Key đã hết ngân sách hoặc vượt quota. Vui lòng cập nhật API Key mới tại Google AI Studio.`);
    }

    throw new Error(`Lỗi Google AI Studio (Tất cả model [${candidateModels.join(', ')}] đều thất bại): ${lastError?.message || 'Không thể kết nối AI Studio'}`);
  }

  // Fallback / High-quality Expert Default Engine when no API key is set
  return generateDefaultExpertReport(ticker, marketData, uploadedFiles, qualitativeInsights);
}

function repairAndParseJson(jsonStr: string): any {
  let cleaned = jsonStr.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    cleaned = cleaned.slice(firstBrace);
  }

  try {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      return JSON.parse(cleaned.slice(0, lastBrace + 1));
    }
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.warn('[AI Analyzer] Standard JSON.parse failed, attempting auto-repair...', e.message);
    let repaired = cleaned;
    const quotes = repaired.match(/(?<!\\)"/g) || [];
    if (quotes.length % 2 !== 0) {
      repaired += '"';
    }
    let openBraces = (repaired.match(/\{/g) || []).length;
    let closeBraces = (repaired.match(/\}/g) || []).length;
    let openBrackets = (repaired.match(/\[/g) || []).length;
    let closeBrackets = (repaired.match(/\]/g) || []).length;

    while (openBrackets > closeBrackets) {
      repaired += ']';
      closeBrackets++;
    }
    while (openBraces > closeBraces) {
      repaired += '}';
      closeBraces++;
    }

    return JSON.parse(repaired);
  }
}

function buildReportFromParsed(
  ticker: string,
  marketData: StockMarketData,
  parsed: any,
  dynamicYear1?: number,
  dynamicYear2?: number,
  qualitativeInsights?: QualitativeInsights | null
): AnalysisReport {
  const valSection = parsed.sectionF || parsed.sectionD || {};
  const shares = valSection.sharesOutstandingMillions || marketData.sharesOutstanding || 0;

  const currentYear = new Date().getFullYear();
  const year1 = dynamicYear1 || valSection.valuation?.year1 || currentYear;
  const year2 = dynamicYear2 || valSection.valuation?.year2 || (year1 + 1);

  const fYear1 = valSection.forecastYear1Data || valSection.forecast2026;
  const fYear2 = valSection.forecastYear2Data || valSection.forecast2027;

  let sumNetProfitYear1Billion = 0;
  if (fYear1) {
    sumNetProfitYear1Billion = (Number(fYear1.q1?.netProfit) || 0) +
      (Number(fYear1.q2?.netProfit) || 0) +
      (Number(fYear1.q3?.netProfit) || 0) +
      (Number(fYear1.q4?.netProfit) || 0);
  }

  let sumNetProfitYear2Billion = 0;
  if (fYear2) {
    sumNetProfitYear2Billion = (Number(fYear2.q1?.netProfit) || 0) +
      (Number(fYear2.q2?.netProfit) || 0) +
      (Number(fYear2.q3?.netProfit) || 0) +
      (Number(fYear2.q4?.netProfit) || 0);
  }

  const q1 = sumNetProfitYear1Billion > 0 ? sumNetProfitYear1Billion * 1e9 : (Number(valSection.forecastQ1) || 0);
  const q2 = sumNetProfitYear2Billion > 0 ? sumNetProfitYear2Billion * 1e9 : (Number(valSection.forecastQ2) || 0);
  const q3 = 0;
  const q4 = 0;

  const totalProfit = q1 || q2;
  const epsForward = (shares > 0 && totalProfit > 0) ? Math.round(totalProfit / (shares * 1000000)) : 0;

  const peBase = valSection.peBase || marketData.pe5YearAvg || 0;
  const peBull = valSection.peBull || marketData.pe5YearMax || 0;
  const peBear = valSection.peBear || marketData.pe5YearMin || 0;

  return {
    ticker,
    companyName: marketData.companyName,
    createdDate: new Date().toLocaleDateString('vi-VN'),
    sectionA: {
      historyAndOverview: parsed.sectionA?.historyAndOverview || 'Thành lập và phát triển trong ngành...',
      shareholdersAndManagement: parsed.sectionA?.shareholdersAndManagement || 'Ban lãnh đạo và cơ cấu cổ đông...',
      subsidiariesAndAffiliates: parsed.sectionA?.subsidiariesAndAffiliates || 'Sở hữu hệ thống các công ty con nòng cốt...',
    },
    sectionB: {
      valueChainInput: parsed.sectionB?.valueChainInput || 'Phụ thuộc vào các yếu tố nguyên liệu đầu vào...',
      valueChainProduction: parsed.sectionB?.valueChainProduction || 'Quy mô sản xuất và công suất vận hành...',
      valueChainOutput: parsed.sectionB?.valueChainOutput || 'Sản phẩm đầu ra và thị trường tiêu thụ...',
      revenueBreakdown: Array.isArray(parsed.sectionB?.revenueBreakdown) && parsed.sectionB.revenueBreakdown.length > 0
        ? parsed.sectionB.revenueBreakdown
        : undefined,
    },
    sectionC: {
      partA_LiquidityAndDebt: parsed.sectionC?.partA_LiquidityAndDebt || parsed.sectionC?.financialHealthAndDebt || 'Đánh giá khả năng thanh toán và đòn bẩy nợ...',
      partB_CashFlowAndEarnings: parsed.sectionC?.partB_CashFlowAndEarnings || 'Đánh giá chất lượng dòng tiền CFO và FCF sau CAPEX...',
      partC_ProfitabilityAndROIC: parsed.sectionC?.partC_ProfitabilityAndROIC || parsed.sectionC?.profitabilityMargins || 'Đánh giá tỷ suất sinh lời ROIC, ROE và biên lợi nhuận...',
      partD_WorkingCapitalAndAssetQuality: parsed.sectionC?.partD_WorkingCapitalAndAssetQuality || 'Đánh giá vòng quay vốn lưu động DSO, DIO, CCC và chất lượng tài sản...',
      partE_CapitalStructureAndFunding: parsed.sectionC?.partE_CapitalStructureAndFunding || 'Đánh giá cơ cấu vốn D/E và khả năng tự tài trợ CAPEX...',
      partF_EarningsQualityAndAccounting: parsed.sectionC?.partF_EarningsQualityAndAccounting || 'Đánh giá tỷ trọng lợi nhuận cốt lõi, kiểm toán và giao dịch bên liên quan...',
    },
    sectionD: {
      partA_CurrentGrowth: parsed.sectionD?.partA_CurrentGrowth || 'Tăng trưởng doanh thu và EPS cốt lõi qua Cầu nối Core...',
      partB_VisibilityNext2To4Q: parsed.sectionD?.partB_VisibilityNext2To4Q || 'Độ chắc chắn 2-4 quý tới từ Backlog và công suất mới...',
      partC_MarginDurability: parsed.sectionD?.partC_MarginDurability || 'Độ bền biên lợi nhuận gộp và đòn bẩy hoạt động...',
      partD_GrowthRunway: parsed.sectionD?.partD_GrowthRunway || 'Dư địa tăng trưởng công suất và mở rộng thị phần...',
      partE_GrowthToCash: parsed.sectionD?.partE_GrowthToCash || 'Tăng trưởng đi kèm dòng tiền CFO thực chất...',
      partF_MediumTermGrowth: parsed.sectionD?.partF_MediumTermGrowth || 'Tăng trưởng kép trung hạn CAGR 3Y và tái đầu tư...',
      partG_RiskAdjustedSustainability: parsed.sectionD?.partG_RiskAdjustedSustainability || 'Tính bền vững sau điều chỉnh rủi ro chu kỳ...',
    },
    sectionE: {
      partA_EconomicMoat: parsed.sectionE?.partA_EconomicMoat || 'Hào kinh tế (Moat) chi phí thấp và tài sản vô hình...',
      partB_IndustryPosition: parsed.sectionE?.partB_IndustryPosition || 'Vị thế đầu ngành và xu hướng thị phần 3 năm...',
      partC_BusinessModel: parsed.sectionE?.partC_BusinessModel || 'Mô hình kinh doanh hiệu quả và tính lặp lại của doanh thu...',
      partD_ManagementAndCapitalAllocation: parsed.sectionE?.partD_ManagementAndCapitalAllocation || 'Năng lực thực thi của ban lãnh đạo và kỷ luật phân bổ vốn...',
      partE_CorporateGovernance: parsed.sectionE?.partE_CorporateGovernance || 'Quản trị công ty và bảo vệ quyền lợi cổ đông thiểu số...',
      partF_RoicSustenance: parsed.sectionE?.partF_RoicSustenance || 'Khả năng duy trì ROIC cao qua chu kỳ và cơ hội tái đầu tư...',
      partG_ShockResilience: parsed.sectionE?.partG_ShockResilience || 'Khả năng chống chịu suy thoái và thích ứng công nghệ...',
    },
    sectionF: {
      growthDriversRevenueAndCost: valSection.growthDriversRevenueAndCost || 'Luận điểm tăng trưởng doanh thu và chi phí.',
      quarterlyForecastReasoning: valSection.quarterlyForecastReasoning || 'Lập luận dự phóng kết quả kinh doanh.',
      valuation: {
        year1,
        year2,
        forecastYear1Data: fYear1,
        forecastYear2Data: fYear2,
        forecast2026: fYear1,
        forecast2027: fYear2,
        forecastNetProfitQ1: q1,
        forecastNetProfitQ2: q2,
        forecastNetProfitQ3: q3,
        forecastNetProfitQ4: q4,
        totalForecastProfit: totalProfit,
        sharesOutstanding: shares,
        epsForward,
        peBase,
        peBull,
        peBear,
      },
    },
    qualitativeInsights: qualitativeInsights || undefined,
    isR2Synchronized: Boolean(qualitativeInsights),
    marketData,
  };
}

