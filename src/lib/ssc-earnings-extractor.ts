import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import {
  EarningsRecord,
  EarningsPeriod,
  EarningsReportType,
  ExchangeType,
  ExtractedEarningsRaw,
} from '@/types/earnings';
import { isUsingOpenAIProxy, callOpenAIChatCompletion } from './llm-provider';

/**
 * Lấy Gemini API key từ biến môi trường hoặc fallback .env.local
 */
function getGeminiApiKey(): string {
  let key =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  if (!key) {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
        if (match) key = match[1];
      }
    } catch {
      // Ignore reading error
    }
  }

  return key.trim();
}

/**
 * Xử lý chuỗi JSON từ AI phòng trường hợp có markdown codeblock
 */
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Trích xuất các chỉ tiêu KQKD cốt lõi từ văn bản trang Báo cáo KQKD bằng Gemini Flash
 */
export async function extractEarningsFromText(
  textSnippet: string,
  hints?: {
    ticker?: string;
    companyName?: string;
    reportTitle?: string;
  }
): Promise<ExtractedEarningsRaw | null> {

  const prompt = `
Bạn là chuyên gia phân tích báo cáo tài chính kế toán Việt Nam (VAS / Thông tư 200).
Dưới đây là nội dung trích xuất từ trang "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH" của doanh nghiệp.
Gợi ý từ thông báo: Mã CP: "${hints?.ticker || ''}", Công ty: "${hints?.companyName || ''}", Tiêu đề: "${hints?.reportTitle || ''}".

NỘI DUNG VĂN BẢN TRANG BÁO CÁO:
"""
${textSnippet.slice(0, 15000)}
"""

HÃY BÓC TÁCH CHÍNH XÁC CÁC CHỈ TIÊU KẾ TOÁN VÀ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON (không kèm văn bản giải thích):
{
  "ticker": "Mã cổ phiếu viết hoa 3 chữ cái",
  "companyName": "Tên công ty",
  "reportPeriod": "Q1" | "Q2" | "Q3" | "Q4" | "6T" | "9T" | "NAM",
  "reportYear": 2026,
  "reportType": "CONSOLIDATED" | "PARENT",
  "currencyUnit": 1, // Hệ số nhân để quy về Đồng VNĐ tuyệt đối (ví dụ nếu ghi "Đơn vị tính: đồng" thì 1; nếu "nghìn đồng" thì 1000; nếu "triệu đồng" thì 1000000; nếu "tỷ đồng" thì 1000000000)
  "currentPeriod": {
    "netRevenue": 0, // Doanh thu thuần về bán hàng và CCDV kỳ này (Mã số 10)
    "costOfGoodsSold": 0, // Giá vốn hàng bán kỳ này (Mã số 11)
    "grossProfit": 0, // Lợi nhuận gộp về bán hàng và CCDV kỳ này (Mã số 20)
    "netProfitAfterTax": 0 // Lợi nhuận sau thuế TNDN kỳ này (Mã số 60)
  },
  "previousPeriod": {
    "netRevenue": 0, // Doanh thu thuần cùng kỳ năm trước (Mã số 10)
    "costOfGoodsSold": 0, // Giá vốn hàng bán cùng kỳ năm trước (Mã số 11)
    "grossProfit": 0, // Lợi nhuận gộp cùng kỳ năm trước (Mã số 20)
    "netProfitAfterTax": 0 // Lợi nhuận sau thuế cùng kỳ năm trước (Mã số 60)
  },
  "notes": "Ghi chú ngắn nếu có (ví dụ: số liệu lũy kế 6 tháng hoặc số liệu quý 3)"
}

LƯU Ý QUAN TRỌNG:
1. "currentPeriod" là cột "Kỳ này" hoặc "Quý này" hoặc "Năm nay".
2. "previousPeriod" là cột "Cùng kỳ năm trước" hoặc "Kỳ trước" hoặc "Năm trước".
3. Nếu là Báo cáo Quý (ví dụ Quý 3), hãy lấy số liệu của riêng Quý 3 (cột Quý này), không lấy cột Lũy kế từ đầu năm trừ khi báo cáo chỉ có 1 cột duy nhất.
4. Giữ nguyên số âm nếu lỗ (ví dụ: -1500000000).
5. "reportType": Nếu tiêu đề ghi "Hợp nhất" hoặc "Tổng hợp" thì là "CONSOLIDATED"; nếu ghi "Riêng" hoặc "Công ty mẹ" thì là "PARENT".
`;

  // 1. Ưu tiên gọi qua CLIProxyAPI (OpenAI-compatible) trên Oracle VPS nếu được cấu hình
  if (isUsingOpenAIProxy()) {
    try {
      console.log(`[Earnings Extractor] Trích xuất BCTC qua CLIProxyAPI (OpenAI format) cho ${hints?.ticker || 'doanh nghiệp'}...`);
      const rawText = await callOpenAIChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        jsonMode: true,
        temperature: 0.1,
      });
      const parsed = JSON.parse(cleanJsonOutput(rawText));
      if (parsed && (parsed.currentPeriod || parsed.ticker)) {
        return parsed as ExtractedEarningsRaw;
      }
    } catch (proxyErr: any) {
      console.warn(`[Earnings Extractor] CLIProxyAPI failed: ${proxyErr.message}. Fallback sang Google AI Studio trực tiếp...`);
    }
  }

  // 2. Fallback sang Google Generative AI SDK trực tiếp
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY hoặc CLIProxyAPI chưa được cấu hình');
  }

  const baseUrl = process.env.GEMINI_BASE_URL?.trim().replace(/\/+$/, '');
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-3.8-flash',
    'gemini-3.7-flash',
  ].filter((m): m is string => Boolean(m && typeof m === 'string' && m.trim().length > 0));

  const uniqueModels = Array.from(new Set(candidateModels));
  const genAI = new GoogleGenerativeAI(apiKey);

  const requestOptions: any = {};
  if (baseUrl) {
    requestOptions.baseUrl = baseUrl;
    requestOptions.customHeaders = {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  let lastError: any = null;

  for (const modelName of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        },
        Object.keys(requestOptions).length > 0 ? requestOptions : undefined
      );

      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = res.response.text();
      const parsed = JSON.parse(cleanJsonOutput(responseText));

      if (parsed && parsed.currentPeriod && parsed.previousPeriod) {
        return parsed as ExtractedEarningsRaw;
      }
    } catch (err: any) {
      console.warn(`[Earnings Extractor] Model ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  console.error('[Earnings Extractor] All candidate models failed:', lastError?.message);
  return null;
}

/**
 * Chuẩn hóa số liệu thô và tính toán các chỉ số tăng trưởng thành bản ghi hoàn chỉnh
 */
export function buildEarningsRecord(
  raw: ExtractedEarningsRaw,
  meta: {
    exchange?: ExchangeType;
    publishedAt?: string;
    sourceUrl?: string;
  }
): EarningsRecord {
  const multiplier = Number(raw.currencyUnit) || 1;

  // Quy đổi về số tuyệt đối VND
  const revCur = (Number(raw.currentPeriod.netRevenue) || 0) * multiplier;
  const revPrev = (Number(raw.previousPeriod.netRevenue) || 0) * multiplier;

  const gpCur = (Number(raw.currentPeriod.grossProfit) || 0) * multiplier;
  const gpPrev = (Number(raw.previousPeriod.grossProfit) || 0) * multiplier;

  const patCur = (Number(raw.currentPeriod.netProfitAfterTax) || 0) * multiplier;
  const patPrev = (Number(raw.previousPeriod.netProfitAfterTax) || 0) * multiplier;

  // Tính tăng trưởng doanh thu YoY %
  let revenueYoYPercent: number | null = null;
  if (revPrev !== 0) {
    revenueYoYPercent = Number((((revCur - revPrev) / Math.abs(revPrev)) * 100).toFixed(2));
  }

  // Tính tăng trưởng LNST YoY %
  let patYoYPercent: number | null = null;
  if (patPrev !== 0) {
    patYoYPercent = Number((((patCur - patPrev) / Math.abs(patPrev)) * 100).toFixed(2));
  }

  // Tính biên lợi nhuận gộp %
  let grossMarginCurrent: number | null = null;
  if (revCur > 0) {
    grossMarginCurrent = Number(((gpCur / revCur) * 100).toFixed(2));
  }

  let grossMarginPrevious: number | null = null;
  if (revPrev > 0) {
    grossMarginPrevious = Number(((gpPrev / revPrev) * 100).toFixed(2));
  }

  let grossMarginDelta: number | null = null;
  if (grossMarginCurrent !== null && grossMarginPrevious !== null) {
    grossMarginDelta = Number((grossMarginCurrent - grossMarginPrevious).toFixed(2));
  }

  const ticker = (raw.ticker || 'UNKNOWN').trim().toUpperCase();
  const year = raw.reportYear || new Date().getFullYear();
  const period: EarningsPeriod = raw.reportPeriod || 'Q1';
  const reportType: EarningsReportType = raw.reportType || 'CONSOLIDATED';
  const id = `${ticker}_${year}_${period}_${reportType}`;

  return {
    id,
    ticker,
    companyName: raw.companyName || ticker,
    exchange: meta.exchange || 'HOSE',
    year,
    period,
    reportType,
    revenueCurrent: revCur,
    revenuePrevious: revPrev,
    revenueYoYPercent,
    grossProfitCurrent: gpCur,
    grossProfitPrevious: gpPrev,
    grossMarginCurrent,
    grossMarginPrevious,
    grossMarginDelta,
    patCurrent: patCur,
    patPrevious: patPrev,
    patYoYPercent,
    publishedAt: meta.publishedAt || new Date().toISOString().slice(0, 10),
    sourceUrl: meta.sourceUrl || 'https://congbothongtin.ssc.gov.vn/faces/NewsSearch',
    sourceType: 'SSC',
    extractedAt: new Date().toISOString(),
    note: raw.notes,
  };
}

/**
 * Trích xuất trực tiếp từ file PDF (dành cho file scan ảnh hoặc file PDF mờ) qua Gemini File API
 */
export async function extractEarningsFromPdfFile(
  filePath: string,
  hints?: {
    ticker?: string;
    companyName?: string;
    reportTitle?: string;
  }
): Promise<ExtractedEarningsRaw | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileManager = new GoogleAIFileManager(apiKey);
  let uploadedFile: any = null;

  try {
    console.log(`[Earnings Extractor] Uploading scanned PDF to Gemini File API: ${path.basename(filePath)}...`);
    const uploadRes = await fileManager.uploadFile(filePath, {
      mimeType: 'application/pdf',
      displayName: path.basename(filePath),
    });
    uploadedFile = uploadRes.file;

    // Chờ file chuyển trạng thái ACTIVE
    let attempts = 0;
    while (uploadedFile.state === 'PROCESSING' && attempts < 15) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      uploadedFile = await fileManager.getFile(uploadedFile.name);
      attempts++;
    }

    if (uploadedFile.state === 'FAILED') {
      console.warn('[Earnings Extractor] File processing failed on Gemini server');
      return null;
    }

    const prompt = `
Bạn là chuyên gia phân tích báo cáo tài chính kế toán Việt Nam.
Hãy đọc tài liệu PDF đính kèm, tìm đúng bảng "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH" (Statement of Income) của doanh nghiệp.
Gợi ý: Mã CP "${hints?.ticker || ''}", Doanh nghiệp: "${hints?.companyName || ''}", Tiêu đề: "${hints?.reportTitle || ''}".

TRÍCH XUẤT CHÍNH XÁC VÀ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON:
{
  "ticker": "${hints?.ticker || 'Mã CP'}",
  "companyName": "${hints?.companyName || 'Tên công ty'}",
  "reportPeriod": "Q1" | "Q2" | "Q3" | "Q4" | "6T" | "9T" | "NAM",
  "reportYear": 2026,
  "reportType": "CONSOLIDATED" | "PARENT",
  "currencyUnit": 1, // Hệ số nhân để quy về VNĐ tuyệt đối (ví dụ nếu bảng ghi "Đơn vị tính: đồng" là 1; "nghìn đồng" là 1000; "triệu đồng" là 1000000; "tỷ đồng" là 1000000000)
  "currentPeriod": {
    "netRevenue": 0, // Doanh thu thuần về bán hàng và CCDV kỳ này
    "costOfGoodsSold": 0, // Giá vốn hàng bán kỳ này
    "grossProfit": 0, // Lợi nhuận gộp kỳ này
    "netProfitAfterTax": 0 // Lợi nhuận sau thuế kỳ này
  },
  "previousPeriod": {
    "netRevenue": 0, // Doanh thu thuần cùng kỳ năm trước
    "costOfGoodsSold": 0, // Giá vốn hàng bán cùng kỳ năm trước
    "grossProfit": 0, // Lợi nhuận gộp cùng kỳ năm trước
    "netProfitAfterTax": 0 // Lợi nhuận sau thuế cùng kỳ năm trước
  },
  "notes": "Ghi chú ngắn"
}
`;

    const baseUrl = process.env.GEMINI_BASE_URL?.trim().replace(/\/+$/, '');
    const genAI = new GoogleGenerativeAI(apiKey);
    const requestOptions: any = {};
    if (baseUrl) {
      requestOptions.baseUrl = baseUrl;
      requestOptions.customHeaders = { Authorization: `Bearer ${apiKey}` };
    }

    const visionModels = ['gemini-3.8-flash', 'gemini-3.7-flash'];
    let lastVisionError: any = null;

    for (const modelName of visionModels) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          },
          Object.keys(requestOptions).length > 0 ? requestOptions : undefined
        );

        const res = await model.generateContent([
          {
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri,
            },
          },
          { text: prompt },
        ]);

        const parsed = JSON.parse(cleanJsonOutput(res.response.text()));
        return parsed as ExtractedEarningsRaw;
      } catch (mErr: any) {
        lastVisionError = mErr;
        console.warn(`[Earnings Extractor] Vision model ${modelName} failed:`, mErr.message);
      }
    }

    if (lastVisionError) {
      throw lastVisionError;
    }
    return null;
  } catch (err: any) {
    console.error('[Earnings Extractor] Error extracting from PDF file:', err.message);
    return null;
  } finally {
    // Luôn dọn dẹp file trên Gemini File API
    if (uploadedFile?.name) {
      try {
        await fileManager.deleteFile(uploadedFile.name);
        console.log(`[Earnings Extractor] Cleaned up remote file on Gemini: ${uploadedFile.name}`);
      } catch {}
    }
  }
}

