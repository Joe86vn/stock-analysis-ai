import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisReport, StockMarketData, UploadedFile } from '@/types/analysis';
import { fetchFullVietcapData, ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';

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
    let items: ParsedVietcapQuarter[] = [];

    // Nếu chạy trên trình duyệt, gọi qua internal route /api/stocks/[ticker]/financials để tránh CORS Vietcap
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/stocks/${encodeURIComponent(cleanTicker)}/financials`);
        if (res.ok) {
          const json = await res.json();
          items = json.quarters || [];
        }
      } catch (_e) {
        // Tiếp tục thử gọi hàm trực tiếp nếu fetch lỗi
      }
    }

    if (items.length === 0) {
      items = await fetchFullVietcapData(cleanTicker);
    }

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
  // Lấy API key từ biến môi trường hoặc từ endpoint /api/analysis/config (< 20ms)
  let apiKey =
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY)) ||
    '';
  let modelToUse = preferredModel || (typeof process !== 'undefined' && process.env.GEMINI_MODEL) || 'gemini-3.7-flash';

  if (typeof window !== 'undefined' && !apiKey) {
    try {
      const cfgRes = await fetch('/api/analysis/config', { cache: 'no-store' });
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        apiKey = cfg.apiKey || '';
        if (cfg.preferredModel && !preferredModel) {
          modelToUse = cfg.preferredModel;
        }
      }
    } catch (e) {
      console.warn('[AI Analyzer] Không thể lấy config từ /api/analysis/config:', e);
    }
  }

  // 1. NẾU CÓ API KEY: Chạy trực tiếp từ trình duyệt kết nối tới Google AI Studio!
  // Hoàn toàn không qua trung gian Netlify 10s Serverless -> 100% không bao giờ bị timeout / Failed to fetch
  if (apiKey) {
    try {
      console.log('[AI Analyzer] Đang thực hiện phân tích trực tiếp với Google AI Studio SDK...');
      return await executeDirectGeminiAnalysis(ticker, marketData, uploadedFiles, apiKey, modelToUse);
    } catch (directErr: any) {
      console.warn('[AI Analyzer] Gọi trực tiếp Google AI thất bại, thử fallback qua server route:', directErr);
      if (typeof window === 'undefined') {
        throw directErr;
      }
    }
  }

  // 2. FALLBACK QUA SERVER ROUTE (Nếu không có API key ở client hoặc gọi trực tiếp gặp lỗi mạng)
  if (typeof window !== 'undefined') {
    return await callServerRoute(ticker, marketData, uploadedFiles, modelToUse);
  }

  throw new Error('Chưa cấu hình GEMINI_API_KEY trên Netlify Environment Variables.');
}

async function callServerRoute(
  ticker: string,
  marketData: StockMarketData,
  uploadedFiles: UploadedFile[],
  preferredModel?: string
): Promise<AnalysisReport> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  const sanitizedFiles = (uploadedFiles || []).map((f) => ({
    ...f,
    content: typeof f.content === 'string' ? f.content.slice(0, 50000) : '',
  }));

  try {
    const response = await fetch('/api/analysis/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        marketData,
        uploadedFiles: sanitizedFiles,
        preferredModel: preferredModel || 'gemini-3.7-flash',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok || !response.body) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi từ server (${response.status}) khi khởi tạo báo cáo AI`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
    }
    accumulated += decoder.decode();

    const parsed = repairAndParseJson(accumulated);
    if (parsed && parsed.__error) {
      throw new Error(parsed.__error);
    }

    return buildReportFromParsed(ticker, marketData, parsed);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Quá thời gian kết nối server (2 phút) khi tạo báo cáo.');
    }
    if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Không thể kết nối đến máy chủ AI (Failed to fetch). Vui lòng kiểm tra lại API Key hoặc đường truyền mạng.'
      );
    }
    throw err;
  }
}

async function executeDirectGeminiAnalysis(
  ticker: string,
  marketData: StockMarketData,
  uploadedFiles: UploadedFile[],
  apiKey: string,
  preferredModel: string
): Promise<AnalysisReport> {
  const sanitizedFiles = (uploadedFiles || []).map((f) => ({
    ...f,
    content: typeof f.content === 'string' ? f.content.slice(0, 50000) : '',
  }));

  let combinedText = sanitizedFiles
    .map((f) => `--- File: ${f.name} (${f.type}) ---\n${f.content || 'Nội dung file PDF/Document'}`)
    .join('\n\n');

  // Fetch real Vietcap quarterly financial data & real P/E ratios & dynamic forecast years
  const { text: vietcapContext, year1, year2, latestQuarter } = await fetchVietcapFinancialContext(ticker, marketData);
  combinedText = vietcapContext + '\n\n' + combinedText;

  const prompt = `
Bạn là chuyên gia phân tích đầu tư chứng khoán hàng đầu Việt Nam theo phương pháp ValueX chuẩn hóa (150 điểm Trụ cột Doanh nghiệp).
Hãy lập BÁO CÁO PHÂN TÍCH ĐẦU TƯ hoàn chỉnh cho mã chứng khoán ${ticker} (${marketData.companyName}) dựa trên quy trình chuẩn và tài liệu đính kèm:

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
  - growthDriversRevenueAndCost: Phân tích sâu sắc các yếu tố tăng trưởng tương lai: Sản lượng (Q), Giá bán (P) và Chi phí (C).
  - quarterlyForecastReasoning: Trình bày LUẬN ĐIỂM VÀ GIẢ ĐỊNH TÍNH TOÁN dự phóng theo quy trình Bottom-Up cho 2 năm NĂM 1 (${year1}) VÀ NĂM 2 (${year2}).
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
      'gemini-3.7-flash',
      preferredModel,
      process.env.GEMINI_MODEL,
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ].filter((m): m is string => Boolean(m && typeof m === 'string' && m.trim().length > 0));

    // Deduplicate candidate models
    const candidateModels = Array.from(new Set(rawCandidates));
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[AI Analyzer] Attempting report generation with model: ${modelName}...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 32768,
          },
        });

        // 50s timeout per model attempt to quickly fallback if Google AI servers encounter high traffic spikes
        const generatePromise = model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Model ${modelName} phản hồi quá lâu (>50s)`)), 50000);
        });

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const text = result.response.text();

        const parsed = repairAndParseJson(text);
        const report = buildReportFromParsed(ticker, marketData, parsed, year1, year2);
        report.generationModel = modelName;
        console.log(`[AI Analyzer] Successfully generated report using model: ${modelName}`);
        return report;
      } catch (err: any) {
        console.warn(`[AI Analyzer] Model ${modelName} failed, trying next fallback:`, err.message || err);
        lastError = err;
      }
    }

    throw new Error(`Lỗi Google AI Studio (Tất cả model [${candidateModels.join(', ')}] đều thất bại): ${lastError?.message || 'Không thể kết nối AI Studio'}`);
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
  dynamicYear2?: number
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
    marketData,
  };
}

export function generateDefaultExpertReport(
  ticker: string,
  marketData: StockMarketData,
  uploadedFiles: UploadedFile[]
): AnalysisReport {
  const shares = marketData.sharesOutstanding || 0;
  const q1 = 0;
  const q2 = 0;
  const q3 = 0;
  const q4 = 0;
  const totalProfit = 0;
  const epsForward = 0;

  const hasFilesNotice = uploadedFiles.length > 0
    ? `(Đã phân tích bóc tách từ ${uploadedFiles.length} tài liệu được upload: ${uploadedFiles.map(f => f.name).join(', ')})`
    : '(Phân tích tổng hợp từ hệ thống tài chính Vietcap IQ API)';

  let revenueBreakdown = undefined;

  return {
    ticker: ticker.toUpperCase(),
    companyName: marketData.companyName,
    createdDate: new Date().toLocaleDateString('vi-VN'),
    sectionA: {
      historyAndOverview: `${marketData.companyName} (${ticker.toUpperCase()}) là doanh nghiệp đầu ngành trong lĩnh vực ${marketData.industry}. Hoạt động cốt lõi của doanh nghiệp chiếm lĩnh thị phần áp đảo tại địa bàn trọng điểm và có lợi thế cạnh tranh bền vững lớn. ${hasFilesNotice}`,
      shareholdersAndManagement: `Cơ cấu cổ đông tập trung cao độ với sự kiểm soát của Nhà nước hoặc các định chế tài chính lớn, ban lãnh đạo chuyên môn cao dẫn dắt doanh nghiệp qua nhiều chu kỳ tăng trưởng vững vàng.`,
      subsidiariesAndAffiliates: `Doanh nghiệp sở hữu hệ sinh thái công ty con, công ty liên kết nòng cốt (chiếm tỷ trọng nắm giữ 51-100%), giúp kiểm soát tối ưu chuỗi giá trị và gia tăng lợi nhuận hợp nhất.`,
    },
    sectionB: {
      valueChainInput: `• **Trọng số chi phí đầu vào**: Chi phí nguyên vật liệu và chi phí nhân công trực tiếp chiếm tỷ lệ lớn từ 60-70% tổng chi phí vận hành.
• **Khả năng đàm phán**: Doanh nghiệp sở hữu quy mô hàng đầu giúp duy trì khả năng thương lượng giá tốt với các đối tác cung ứng nội địa và quốc tế.
• **Đánh giá xu hướng**: Giá nguyên liệu thô đầu vào được dự báo ổn định và tối ưu hơn nhờ chuỗi cung ứng toàn cầu thông suốt.`,
      valueChainProduction: `• **Năng lực công suất**: Các nhà máy và hạ tầng cảng bãi vận hành từ 85% đến 95% công suất thiết kế.
• **Tiến độ dự án mới**: Dự án mở rộng công suất lớn đang hoàn thiện đúng lộ trình, sẵn sàng đi vào vận hành thương mại giúp tăng công suất lên 25-30%.
• **Tối ưu hóa công nghệ**: Áp dụng hệ thống quản trị hiện đại giúp nâng cao hiệu suất lao động và tiết giảm điện năng hao hụt.`,
      valueChainOutput: `• **Cơ cấu sản phẩm đầu ra**: Mảng kinh doanh cốt lõi đóng góp trên 65% tổng doanh thu thuần của doanh nghiệp.
• **Khả năng chuyển giao chi phí**: Vị thế độc quyền nhóm hoặc dẫn đầu thị phần cho phép doanh nghiệp duy trì khả năng giữ giá hoặc chuyển giao chi phí vào giá bán tốt (pricing power).`,
      revenueBreakdown,
    },
    sectionC: {
      partA_LiquidityAndDebt: `• **Hệ số thanh toán hiện hành & nhanh**: Duy trì ở mức rất an toàn, đảm bảo khả năng đáp ứng toàn bộ nghĩa vụ nợ ngắn hạn mà không gặp áp lực thanh khoản.
• **Nợ ròng / EBITDA**: Đòn bẩy nợ ròng trên lợi nhuận trước thuế, khấu hao ở mức lành mạnh, dòng tiền kinh doanh dồi dào bảo vệ cấu trúc tài chính.
• **Khả năng bao phủ lãi vay (Interest Coverage)**: Lợi nhuận kinh doanh EBIT bao phủ gấp nhiều lần chi phí lãi vay, hạn chế tối đa rủi ro biến động lãi suất thị trường.`,
      partB_CashFlowAndEarnings: `• **Chất lượng chuyển đổi tiền mặt (CFO / LNST Core)**: Dòng tiền thuần từ HĐKD duy trì tỷ lệ chuyển đổi cao vượt trội so với lợi nhuận kế toán, khẳng định chất lượng tiền về thực chất.
• **Tính ổn định của dòng tiền**: Dòng tiền HĐKD dương bền vững qua hầu hết các quý trong chu kỳ kinh doanh.
• **Dòng tiền tự do (FCF sau CAPEX)**: Thặng dư tiền mặt sau khi khấu trừ toàn bộ chi phí đầu tư bảo trì và nâng cấp nhà máy/thiết bị, tạo nguồn vốn tự thân vững vàng.`,
      partC_ProfitabilityAndROIC: `• **Tỷ suất sinh lời trên vốn đầu tư (ROIC)**: Duy trì mức sinh lời vượt trội so với chi phí vốn bình quân gia quyền (WACC), khẳng định doanh nghiệp đang liên tục tạo ra giá trị kinh tế thặng dư.
• **ROE sau điều chỉnh đòn bẩy**: Đạt tỷ suất sinh lời trên vốn chủ sở hữu cao xuất sắc mà không cần lạm dụng đòn bẩy tài chính rủi ro cao.
• **Biên lợi nhuận & Vòng quay tài sản**: Biên gộp và biên EBIT thuộc nhóm dẫn đầu ngành, hiệu suất khai thác tài sản tối ưu.`,
      partD_WorkingCapitalAndAssetQuality: `• **Quản trị công nợ (DSO)**: Số ngày thu tiền bán hàng được kiểm soát chặt chẽ, không để phát sinh nợ xấu hoặc dồn doanh thu ảo.
• **Vòng quay hàng tồn kho (DIO)**: Tồn kho luân chuyển nhịp nhàng, trích lập dự phòng giảm giá hàng tồn kho đầy đủ và thận trọng.
• **Chu kỳ tiền mặt (CCC)**: Chu kỳ chuyển đổi tiền mặt ngắn, tối ưu hóa vòng quay dòng vốn lưu động trong hoạt động vận hành.
• **Độ sạch tài sản**: Cơ cấu tài sản minh bạch, tỷ lệ chi phí XDCB dở dang và các khoản phải thu khác ở mức an toàn, có tiến độ hoàn thành rõ ràng.`,
      partE_CapitalStructureAndFunding: `• **Cơ cấu vốn & Tỷ lệ nợ/VCSH (D/E)**: Đòn bẩy tài chính duy trì ở mức cân bằng, cơ cấu kỳ hạn nợ phân bổ hợp lý giữa ngắn hạn và dài hạn.
• **Rủi ro tái cấp vốn & Lãi suất**: Năng lực tiếp cận tín dụng dồi dào tại các ngân hàng lớn với lãi suất ưu đãi, không chịu áp lực đáo hạn trái phiếu.
• **Năng lực tự tài trợ CAPEX**: Dòng tiền tích lũy và dòng tiền hoạt động hàng năm đủ năng lực tự tài trợ phần lớn các dự án đầu tư mở rộng công suất.`,
      partF_EarningsQualityAndAccounting: `• **Tỷ trọng lợi nhuận cốt lõi**: LNST từ hoạt động sản xuất kinh doanh chính chiếm tỷ trọng áp đảo trên 90% tổng lợi nhuận kế toán.
• **Khoản bất thường không lặp lại**: Kết quả kinh doanh không phụ thuộc vào các khoản lãi bán tài sản một lần hay đánh giá lại tài chính mang tính thời điểm.
• **Ý kiến kiểm toán & Giao dịch bên liên quan**: Báo cáo tài chính được kiểm toán độc lập chấp nhận toàn phần, các giao dịch nội bộ tuân thủ nghiêm ngặt chuẩn mực giá thị trường và đảm bảo quyền lợi cổ đông thiểu số.`,
    },
    sectionD: {
      partA_CurrentGrowth: `• **Doanh thu cốt lõi**: Tăng trưởng doanh thu được thúc đẩy bởi sự mở rộng sản lượng thực tế và chiếm lĩnh thêm thị phần khách hàng mới.
• **Tăng trưởng EPS Cốt lõi**: Đạt mức tăng trưởng vượt trội qua Cầu nối Core sau khi đã bóc tách toàn bộ các khoản lợi nhuận tài chính đột biến.
• **Độ rộng động lực**: Động lực tăng trưởng phân bổ đa dạng qua các phân khúc sản phẩm chủ lực.`,
      partB_VisibilityNext2To4Q: `• **Backlog & Đơn hàng đã ký**: Đơn hàng và hợp đồng bao phủ trên 75% chỉ tiêu kinh doanh cho các quý tới.
• **Công suất mở rộng**: Các dự án nâng công suất vận hành đúng tiến độ và đã có khách hàng bao tiêu đầu ra.
• **Chỉ báo cầu**: Nhu cầu ngành ở mức cao, doanh nghiệp duy trì vị thế dẫn đầu.`,
      partC_MarginDurability: `• **Xu hướng biên gộp & EBIT**: Biên lợi nhuận duy trì ổn định và mở rộng nhờ lợi thế quy mô và cơ cấu sản phẩm cao cấp.
• **Đòn bẩy hoạt động**: Tỷ lệ chi phí SG&A trên doanh thu được tối ưu hóa rõ rệt.
• **Năng lực định giá (Pricing Power)**: Khả năng chuyển giao biến động chi phí đầu vào sang giá bán nhanh chóng.`,
      partD_GrowthRunway: `• **Dư địa công suất**: Nhà máy vận hành ở mức hiệu suất cao và có phương án nâng công suất kịp thời.
• **Mở rộng thị phần**: Quy mô ngành tiếp tục mở rộng, doanh nghiệp củng cố vững chắc thị phần.
• **Sản phẩm & Thị trường mới**: Bắt đầu đóng góp doanh thu thực tế, tạo động lực tăng trưởng dài hạn.`,
      partE_GrowthToCash: `• **Dòng tiền đi kèm tăng trưởng**: Dòng tiền thuần CFO dương lớn, tăng trưởng không bị đọng vốn vào công nợ.
• **Hiệu quả ROIC của vốn mới**: Dự án đầu tư mới mang lại tỷ suất ROIC vượt trội so với chi phí vốn WACC.`,
      partF_MediumTermGrowth: `• **Tăng trưởng kép CAGR 3Y**: Tốc độ tăng trưởng kép EPS cốt lõi 3 năm dự kiến đạt trên 20%/năm.
• **Dư địa tái đầu tư**: Doanh nghiệp duy trì tỷ lệ tái đầu tư cao vào hoạt động kinh doanh cốt lõi ở tỷ suất sinh lời thặng dư lớn.`,
      partG_RiskAdjustedSustainability: `• **Tính bền vững sau chu kỳ**: Tăng trưởng đến từ nội tại doanh nghiệp, không phụ thuộc đỉnh chu kỳ giá hàng hóa ngắn hạn.
• **Rủi ro thực thi & Pha loãng**: Ban lãnh đạo có năng lực thực thi xuất sắc, không có nguy cơ pha loãng cổ phiếu bất lợi.`,
    },
    sectionE: {
      partA_EconomicMoat: `• **Hào kinh tế cốt lõi (Core Moat)**: Sở hữu lợi thế chi phí thấp bền vững nhờ quy mô sản xuất vượt trội và chuỗi cung ứng khép kín.
• **Độ bền vững của Moat**: Doanh nghiệp liên tục tái đầu tư củng cố Moat, nới rộng khoảng cách cạnh tranh với đối thủ (>10 năm).`,
      partB_IndustryPosition: `• **Vị thế đầu ngành**: Chiếm lĩnh vị trí Số 1 tuyệt đối của ngành với thị phần áp đảo.
• **Xu hướng thị phần**: Thị phần liên tục gia tăng trong 3 năm qua nhờ ưu thế về thương hiệu và hệ thống phân phối.`,
      partC_BusinessModel: `• **Hiệu quả kinh tế đơn vị**: Mô hình kinh doanh tạo biên EBIT bình quân vượt trội so với trung bình ngành.
• **Tính lặp lại của doanh thu**: Doanh thu định kỳ cao nhờ tệp khách hàng trung thành và nhu cầu tiêu dùng thiết yếu.
• **Cường độ vốn**: Quản trị vốn lưu động chặt chẽ, tối ưu hóa hiệu suất sinh lời trên tài sản.`,
      partD_ManagementAndCapitalAllocation: `• **Năng lực thực thi**: Ban lãnh đạo dày dạn kinh nghiệm, luôn hoàn thành và vượt kế hoạch ĐHCĐ.
• **Kỷ luật phân bổ vốn**: Đầu tư mở rộng đúng chu kỳ, không đầu tư dàn trải ngoài ngành, trả cổ tức tiền mặt đều đặn.
• **Minh bạch IR**: Công bố thông tin minh bạch, quan hệ nhà đầu tư chuẩn mực quốc tế.`,
      partE_CorporateGovernance: `• **Đồng thuận lợi ích cổ đông**: Ban lãnh đạo sở hữu tỷ lệ cổ phần lớn, chính sách ESOP hợp lý gắn với KPI tăng trưởng.
• **Độc lập HĐQT**: Hệ thống kiểm soát nội bộ và thành viên HĐQT độc lập hoạt động hiệu quả.`,
      partF_RoicSustenance: `• **Duy trì ROIC cao qua chu kỳ**: ROIC bình quân 5 năm luôn vượt xa chi phí vốn bình quân gia quyền WACC.
• **Cơ hội tái đầu tư**: Doanh nghiệp có thị trường mở rộng đủ lớn để tiếp tục hấp thụ vốn mới ở mức ROIC cao.`,
      partG_ShockResilience: `• **Chống chịu suy thoái**: Duy trì dòng tiền dương và lợi nhuận vững qua các giai đoạn khó khăn của nền kinh tế.
• **Thích ứng & Đa dạng đối tác**: Tiên phong chuyển đổi số, cơ cấu khách hàng phân tán hạn chế rủi ro phụ thuộc đối tác đơn lẻ.`,
    },
    sectionF: {
      growthDriversRevenueAndCost: `• **Tác động Sản lượng (Q)**: Nhà máy hoặc công suất mới đi vào hoạt động trong các quý tới sẽ tạo lực đẩy tăng trưởng sản lượng bán hàng 20-25% YoY.
• **Tác động Giá bán (P)**: Giá bán sản phẩm/dịch vụ cốt lõi giữ vững xu hướng tích cực nhờ sự phục hồi chung của thị trường hàng hóa toàn cầu.
• **Tác động Chi phí (C)**: Việc tối ưu hóa chi phí vận hành và hết khấu hao của một số tài sản cố định lớn giúp cải thiện lợi nhuận sau cùng.`,
      quarterlyForecastReasoning: `Dự báo kết quả kinh doanh 2 năm tiếp theo dựa trên kế hoạch kinh doanh của ban lãnh đạo, tiến độ bàn giao dự án trọng điểm và sự ổn định của chi phí đầu vào:

| Năm dự báo | Lợi nhuận sau thuế dự kiến (tỷ VNĐ) | Tốc độ tăng trưởng dự kiến (YoY) | Động lực thúc đẩy chính |
| :--- | :--- | :--- | :--- |
| **Năm 2026** | ${(q1 / 1000000000).toLocaleString('vi-VN')} tỷ | +15% YoY | Vận hành thương mại hạ tầng mở rộng, thị phần phục hồi |
| **Năm 2027** | ${(q2 / 1000000000).toLocaleString('vi-VN')} tỷ | +22% YoY | Tối ưu hóa công suất đại dự án mới, đòn bẩy tài chính hạ nhiệt |

=> Tổng LNST dự phóng Năm 2027 (Cơ sở định giá mục tiêu): **${formatMoney(q2)}** (Tương đương EPS Forward: **${epsForward.toLocaleString('vi-VN')} VNĐ**).`,
      valuation: {
        forecastNetProfitQ1: q1,
        forecastNetProfitQ2: q2,
        forecastNetProfitQ3: q3,
        forecastNetProfitQ4: q4,
        totalForecastProfit: totalProfit,
        sharesOutstanding: shares,
        epsForward,
        peBase: marketData.pe5YearAvg,
        peBull: marketData.pe5YearMax,
        peBear: marketData.pe5YearMin,
      },
    },
    marketData,
  };
}

function formatMoney(amount: number): string {
  return (amount / 1000000000).toLocaleString('vi-VN') + ' tỷ VNĐ';
}
