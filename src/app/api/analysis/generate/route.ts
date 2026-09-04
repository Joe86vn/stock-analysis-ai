import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Edge Runtime: Netlify deploys this as an Edge Function with no wall-clock timeout
// (unlike Serverless Functions which have 10s limit on free tier)
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const { ticker, marketData, uploadedFiles, preferredModel } = await request.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Chưa cấu hình GEMINI_API_KEY trên server. Vui lòng thêm vào Netlify Environment Variables.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build prompt data on the edge — import the builder from a shared module
  // We inline the Gemini call here since Edge Runtime cannot use Node.js APIs (fs, path)
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        // Fetch Vietcap data via internal API (works in Edge via fetch)
        let vietcapText = '';
        let year1 = new Date().getFullYear();
        let year2 = year1 + 1;
        let latestQuarter = '';

        try {
          const vietcapRes = await fetch(
            new URL(`/api/stocks/${encodeURIComponent(ticker.trim().toUpperCase())}/financials`, request.url).toString()
          );
          if (vietcapRes.ok) {
            const vietcapJson = await vietcapRes.json();
            const quarters: any[] = vietcapJson.quarters || [];

            if (quarters.length > 0) {
              const last = quarters[quarters.length - 1];
              latestQuarter = last.period || '';

              // Determine forecast years from latest quarter
              const periodParts = latestQuarter.split('/');
              const qNum = parseInt(periodParts[0]?.replace('Q', '') || '1');
              const yNum = parseInt(periodParts[1] || String(year1));
              year1 = qNum === 4 ? yNum + 1 : yNum;
              year2 = year1 + 1;

              // P/E stats
              const peValues = quarters.map((q: any) => q.pe).filter((pe: any) => typeof pe === 'number' && pe > 0);
              if (peValues.length > 0) {
                marketData.pe5YearMin = Math.round(Math.min(...peValues) * 10) / 10;
                marketData.pe5YearMax = Math.round(Math.max(...peValues) * 10) / 10;
                marketData.pe5YearAvg = Math.round((peValues.reduce((s: number, c: number) => s + c, 0) / peValues.length) * 10) / 10;
              }

              // Build context table (last 12 quarters)
              const display = quarters.slice(-12);
              vietcapText = `\n--- DỮ LIỆU BÁO CÁO TÀI CHÍNH SỐ HÓA THỰC TẾ VÀ CHỈ SỐ P/E TỪ VIETCAP IQ API CHO ${ticker.trim().toUpperCase()} (TỪ 2018 - NAY) ---\n`;
              vietcapText += `| Quý | Doanh Thu (Tỷ) | LN Gộp (Tỷ) | LNST CĐ Mẹ (Tỷ) | P/E (lần) | P/B (lần) | Biên Gộp (%) | ROE (%) | Nợ Vay (Tỷ) | LCT HĐKD (Tỷ) |\n`;
              vietcapText += `|---|---|---|---|---|---|---|---|---|---|\n`;
              display.forEach((it: any) => {
                vietcapText += `| ${it.period} | ${(it.revenue||0).toFixed(1)} | ${(it.grossProfit||0).toFixed(1)} | ${(it.netProfit||0).toFixed(1)} | ${it.pe > 0 ? it.pe.toFixed(1) + 'x' : 'N/A'} | ${it.pb > 0 ? it.pb.toFixed(1) + 'x' : 'N/A'} | ${(it.grossMargin||0).toFixed(1)}% | ${(it.roe||0).toFixed(1)}% | ${(it.totalDebt||0).toFixed(1)} | ${(it.netOperatingCashFlow||0).toFixed(1)} |\n`;
              });

              vietcapText += `\nQUÝ MỚI NHẤT ĐÃ CÓ BCTC THỰC TẾ TRÊN VIETCAP IQ LÀ: ${latestQuarter || 'N/A'}.\n`;
              vietcapText += `DỰ PHÓNG SẼ THỰC HIỆN CHO 2 NĂM TỚI: NĂM 1 = ${year1}, NĂM 2 = ${year2}.\n`;
              vietcapText += `HÃY SỬ DỤNG CHÍNH XÁC CÁC CHỈ SỐ P/E THỰC TẾ TRÊN KHI ĐỊNH GIÁ: peBear = ${marketData.pe5YearMin || 0}, peBase = ${marketData.pe5YearAvg || 0}, peBull = ${marketData.pe5YearMax || 0}.\n`;
            }
          }
        } catch (_e) {
          // Vietcap unavailable — continue without it
        }

        // Build file context
        const fileContext = (uploadedFiles || [])
          .map((f: any) => `--- File: ${f.name} (${f.type}) ---\n${typeof f.content === 'string' ? f.content.slice(0, 50000) : ''}`)
          .join('\n\n');

        const combinedText = (vietcapText + '\n\n' + fileContext).slice(0, 300000);

        const prompt = `
Bạn là chuyên gia phân tích đầu tư chứng khoán hàng đầu Việt Nam theo phương pháp ValueX chuẩn hóa (150 điểm Trụ cột Doanh nghiệp).
Hãy lập BÁO CÁO PHÂN TÍCH ĐẦU TƯ hoàn chỉnh cho mã chứng khoán ${ticker} (${marketData.companyName}) dựa trên quy trình chuẩn và tài liệu đính kèm:

YÊU CẦU BẮT BUỘC VỀ NỘI DUNG VÀ ĐỊNH DẠNG:
- Phân tích súc tích, chuyên sâu, giàu dữ liệu định lượng (mỗi trường văn bản khoảng 80-150 từ, có dẫn chứng số liệu rõ ràng).
- TRÌNH BÀY VĂN BẢN MẠCH LẠC, DỄ ĐỌC: Sử dụng các tiêu đề phụ in đậm rõ ràng, dùng dấu gạch đầu dòng '-' hoặc '•' để liệt kê ý chi tiết.
- ĐẢM BẢO TRẢ VỀ JSON HỢP LỆ 100%: Cung cấp đầy đủ toàn bộ các trường JSON được yêu cầu bên dưới, không bỏ sót trường nào.

THÔNG SỐ THỊ TRƯỜNG & DỰ PHÓNG NĂM (${year1} VÀ ${year2}):
- Ngành: ${marketData.industry}
- Giá hiện tại: ${marketData.currentPrice ? marketData.currentPrice + ' VND' : 'N/A'}
- Quý thực tế mới nhất: ${latestQuarter || 'N/A'}
- Hai năm cần dự phóng: Năm 1 = ${year1}, Năm 2 = ${year2}
- P/E Trung bình (Base): ${marketData.pe5YearAvg || 0}x
- P/E Cao nhất (Bull): ${marketData.pe5YearMax || 0}x
- P/E Thấp nhất (Bear): ${marketData.pe5YearMin || 0}x

Tài liệu đính kèm:
${combinedText}

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
}`;

        const genAI = new GoogleGenerativeAI(apiKey);

        const rawCandidates = [
          'gemini-3.7-flash',
          preferredModel,
          process.env.GEMINI_MODEL,
          'gemini-3.6-flash',
          'gemini-3.8-flash',
          'gemini-3.5-flash-lite',
          'gemini-flash-latest',
        ].filter((m): m is string => Boolean(m && typeof m === 'string' && m.trim().length > 0));

        const candidateModels = Array.from(new Set(rawCandidates));
        let lastError: any = null;

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
                topP: 0.8,
                maxOutputTokens: 32768,
              },
            });

            // Use streaming to keep the edge connection alive
            const streamResult = await model.generateContentStream({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            // Stream chunks to client as they arrive
            for await (const chunk of streamResult.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                controller.enqueue(encoder.encode(chunkText));
              }
            }

            controller.close();
            return; // Success — stop trying other models
          } catch (err: any) {
            console.warn(`[Edge Route] Model ${modelName} failed:`, err.message || err);
            lastError = err;
          }
        }

        // All models failed
        const errMsg = JSON.stringify({
          __error: `Lỗi Google AI Studio (Tất cả model [${candidateModels.join(', ')}] đều thất bại): ${lastError?.message || 'Không thể kết nối AI Studio'}`
        });
        controller.enqueue(encoder.encode(errMsg));
        controller.close();
      } catch (err: any) {
        const errMsg = JSON.stringify({ __error: err.message || 'Lỗi không xác định trên Edge Function' });
        controller.enqueue(new TextEncoder().encode(errMsg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
