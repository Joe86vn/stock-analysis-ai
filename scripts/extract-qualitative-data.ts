import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { fetchVietcapCompanyDetails } from '@/lib/vietcap-field-mapping';
import { getIndustryTemplate, getIndustryModel } from '@/lib/industry-extractor-templates';
import { getReferenceDocumentCatalog } from '@/lib/crawl-report-service';
import { putQualitativeReport, checkQualitativeReportExists, getLocalCacheFilePath } from '@/lib/r2-storage';
import { downloadPdfToTemp, uploadPdfToGemini, cleanupGeminiFiles, cleanupLocalFiles } from './lib/gemini-file-uploader';
import { QualitativeInsights } from '@/types/qualitative';
import { executeVietcapScreener } from '@/lib/vietcap-screener-service';

/**
 * Tự động tải biến môi trường từ .env.local hoặc .env nếu chạy từ dòng lệnh độc lập
 */
function loadEnvVariables() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let value = trimmed.slice(idx + 1).trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  }
}

loadEnvVariables();

const PROMPT_1_BASE_TEMPLATE = `
Bạn là Trưởng bộ phận Phân tích Định tính Cấp cao (Chief Qualitative Analyst) tại ValueX.
Nhiệm vụ: Phân tích toàn bộ các tài liệu đính kèm (Báo cáo Thường niên, Nghị quyết ĐHCĐ, Báo cáo phân tích CTCK) của mã cổ phiếu {{TICKER}}.
Bóc tách và xuất TOÀN BỘ dữ liệu định tính và dữ liệu vận hành theo đúng JSON Schema quy định.

════════════════════════════════════════════════════════════
PHẦN I: NGUYÊN TẮC BẮT BUỘC (ZERO-LOSS PRINCIPLE)
════════════════════════════════════════════════════════════
1. TUYỆT ĐỐI KHÔNG TÓM TẮT MƠ HỒ:
   Không dùng từ chung chung như "đang mở rộng", "tăng trưởng tốt". Giữ nguyên: tên riêng dự án/đối tác, số vốn đầu tư (tỷ VNĐ), tỷ lệ % tiến độ giải ngân, và mốc thời gian cụ thể (Quý/Năm).
2. NGUYÊN TẮC BẢO TOÀN DỰ ÁN (ZERO OMISSION):
   Mọi dự án đang đầu tư, nhà máy mới, khu đô thị mới, chuỗi mở rộng, kế hoạch CAPEX trong tài liệu đều PHẢI được liệt kê đầy đủ trong mảng "sectionC_GrowthProjectsAndExpansion".
3. THỨ TỰ ƯU TIÊN KHI MÂU THUẪN:
   1) Nghị quyết ĐHCĐ (văn bản pháp lý cao nhất)
   2) Báo cáo CTCK mới nhất (cập nhật thị trường sát nhất)
   3) Báo cáo Thường niên (bối cảnh lịch sử và tầm nhìn)
4. BỎ QUA BẢNG BCTC SỐ THÔ:
   Bỏ qua các bảng cân đối kế toán số thô ở cuối file vì hệ thống đã có số liệu API 20 quý. Tập trung vào: Báo cáo Ban Giám đốc, Kế hoạch kinh doanh, Thuyết minh dự án dở dang, Luận điểm CTCK.
5. METADATA SIMPLIZE — KHÔNG ĐƯỢC SỬA ĐỔI:
   Các trường brokerName, reportDate, reportTitle, targetPrice, recommendation trong "sectionE_BrokerConsensusAndTheses" phải lấy NGUYÊN VẸN từ METADATA SIMPLIZE được cấp bên dưới, KHÔNG ĐƯỢC tự suy đoán.

════════════════════════════════════════════════════════════
PHẦN II: HƯỚNG DẪN BÓC TÁCH THEO MÔ HÌNH NGÀNH
════════════════════════════════════════════════════════════
{{INDUSTRY_EXTRACTION_GUIDE}}

════════════════════════════════════════════════════════════
PHẦN III: METADATA SIMPLIZE (CÁC BÁO CÁO CTCK ĐÃ CUNG CẤP)
════════════════════════════════════════════════════════════
{{SIMPLIZE_METADATA}}

════════════════════════════════════════════════════════════
PHẦN IV: ĐỊNH DẠNG JSON SCHEMA ĐẦU RA BẮT BUỘC
════════════════════════════════════════════════════════════
Hãy trả về JSON thuần túy (không bọc trong markdown, không thêm lời chào) theo cấu trúc chính xác sau:
{
  "ticker": "{{TICKER}}",
  "analyzedAt": "{{ANALYZED_DATE}}",
  "industryModel": "{{INDUSTRY_MODEL}}",
  "documentSources": [
    "Danh sách các tài liệu đã dùng"
  ],
  "sectionA_CorporateOverview": {
    "businessHistoryAndMilestones": "Năm thành lập, cột mốc phát triển bước ngoặt.",
    "operatingFootprint": "Địa bàn sản xuất kinh doanh, nhà máy/chi nhánh/thị trường trọng điểm.",
    "keyManagementAndShareholders": "Chủ tịch HĐQT, TGĐ và tỷ lệ sở hữu. Cổ đông lớn.",
    "majorSubsidiariesAndAffiliates": "3-5 công ty con/liên kết đóng góp lớn vào KQKD hợp nhất.",
    "competitiveLandscapeAndMarketShare": "Đối thủ cạnh tranh chính, thị phần (%) của doanh nghiệp."
  },
  "sectionB_IndustrySpecificValueChain": {
    "modelDescription": "Mô tả ngắn gọn bản chất mô hình kinh doanh và kiếm tiền.",
    "inputOrFundingEngine": "Chi tiết yếu tố đầu vào theo mô hình ngành.",
    "operationOrProductionCapacity": "Chi tiết năng lực sản xuất/vận hành.",
    "outputOrRevenueStreams": "Chi tiết đầu ra và kênh doanh thu.",
    "revenueBreakdownEstimate": [
      { "segment": "Mảng lớn nhất", "percentage": 60 },
      { "segment": "Mảng thứ hai", "percentage": 30 },
      { "segment": "Khác", "percentage": 10 }
    ]
  },
  "sectionC_GrowthProjectsAndExpansion": [
    {
      "projectName": "Tên đầy đủ dự án/nhà máy/khu đô thị",
      "projectType": "Nhà máy mới | Mở rộng công suất | Dự án BĐS | Mở chuỗi | M&A | Khác",
      "totalCapexOrInvestmentBillion": 0,
      "disbursedToDatePct": "Đã giải ngân X%",
      "currentConstructionOrLegalProgress": "Tiến độ thực tế",
      "expectedCommercialStart": "Quý X/Năm Y",
      "capacityOrScaleAddition": "Gia tăng công suất/quy mô",
      "estimatedRevenueOrProfitImpact": "Ước tính đóng góp doanh thu hoặc lợi nhuận",
      "sourceDocument": "Tên tài liệu nguồn"
    }
  ],
  "sectionD_CorporateStrategyAndAGM": {
    "agmRevenueTargetBillion": 0,
    "agmNetProfitTargetBillion": 0,
    "dividendPolicy": "Kế hoạch cổ tức ĐHCĐ: X% tiền mặt, Y% cổ phiếu",
    "capitalPlansAndDilutionRisk": "Kế hoạch ESOP, chào bán riêng lẻ, trái phiếu chuyển đổi",
    "strategicPrioritiesFromLeadership": "Thông điệp chiến lược cốt lõi từ ban lãnh đạo"
  },
  "sectionE_BrokerConsensusAndTheses": {
    "reportsAnalyzed": [
      {
        "brokerName": "Lấy từ Simplize Metadata",
        "reportDate": "Lấy từ Simplize Metadata",
        "reportTitle": "Lấy từ Simplize Metadata",
        "targetPrice": 0,
        "recommendation": "Lấy từ Simplize Metadata",
        "keyThesis": "Luận điểm đầu tư cốt lõi từ nội dung PDF",
        "catalysts": {
          "volumeDriversQ": "Yếu tố tác động đến sản lượng Q",
          "priceAndMarginDriversP": "Yếu tố tác động đến giá bán P",
          "costEfficiencyDriversC": "Yếu tố tối ưu chi phí C"
        },
        "forecastAssumptions": "Giả định dự phóng KQKD",
        "downsideRisks": "Rủi ro cảnh báo"
      }
    ],
    "consensusSummary": "Điểm đồng thuận chung giữa các CTCK"
  },
  "sectionF_EarningsQualityAndRisks": {
    "oneOffItemsAndCoreEarnings": {
      "recentOneOffItems": "Các khoản thu nhập/chi phí bất thường (tên khoản và giá trị tỷ VNĐ)",
      "coreEarningsDrivers": "Các động lực lợi nhuận cốt lõi tái diễn"
    },
    "capitalStructureChanges": {
      "esopOrNewShareIssuance": "Kế hoạch ESOP hoặc phát hành mới (triệu CP)",
      "convertibleBondsOrWarrants": "Trái phiếu chuyển đổi/chứng quyền gây pha loãng",
      "estimatedFullyDilutedSharesMillion": 0
    },
    "riskFactors": {
      "industryAndMacroRisks": "Rủi ro chu kỳ ngành, vĩ mô, lãi suất, tỷ giá...",
      "companySpecificRisks": "Rủi ro pháp lý dự án, tập trung khách hàng, nợ vay...",
      "executionRisks": "Rủi ro tiến độ, vượt ngân sách, thị trường tiêu thụ..."
    }
  }
}
`;

export interface ExtractOptions {
  ticker: string;
  force?: boolean;
  modelName?: string;
}

/**
 * Trích xuất dữ liệu định tính cho 1 mã cổ phiếu duy nhất
 */
export async function extractQualitativeForTicker(options: ExtractOptions): Promise<QualitativeInsights | null> {
  const cleanTicker = options.ticker.trim().toUpperCase();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment or .env.local');
  }

  console.log(`\n======================================================`);
  console.log(`🚀 [Stage 1 Extractor] Processing: ${cleanTicker}`);
  console.log(`======================================================`);

  // 1. Kiểm tra nếu đã có dữ liệu và không bật force
  if (!options.force) {
    const exists = await checkQualitativeReportExists(cleanTicker);
    if (exists) {
      console.log(`ℹ️ [Stage 1 Extractor] ${cleanTicker} already extracted. Use --force to re-extract.`);
      const localPath = getLocalCacheFilePath(cleanTicker);
      if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      }
    }
  }

  // 2. Tra cứu thông tin ngành và ICB từ Vietcap API
  console.log(`🔍 [1/6] Fetching company details & ICB sector for ${cleanTicker}...`);
  const companyDetails = await fetchVietcapCompanyDetails(cleanTicker);
  const icbCodeLv2 = companyDetails?.icbCodeLv2 || '';
  const exchange = companyDetails?.exchange || 'HSX';
  const industryModel = getIndustryModel(icbCodeLv2);
  const industryGuide = getIndustryTemplate(icbCodeLv2);

  console.log(`   - Ticker: ${cleanTicker} (${companyDetails?.companyNameVi || cleanTicker})`);
  console.log(`   - Exchange: ${exchange} | ICB: ${icbCodeLv2 || 'N/A'}`);
  console.log(`   - Industry Model: ${industryModel}`);

  // 3. Lấy danh mục tài liệu tham khảo theo chuẩn @crawl-report
  console.log(`📚 [2/6] Querying document catalog (BCTN, NQ ĐHCĐ, Báo cáo CTCK)...`);
  const catalogExchange: 'HOSE' | 'HNX' | 'UPCOM' = exchange === 'HSX' ? 'HOSE' : exchange;
  const catalog = await getReferenceDocumentCatalog(cleanTicker, catalogExchange);

  const downloadedPdfPaths: string[] = [];
  const geminiFileNamesToCleanup: string[] = [];
  const geminiFileParts: any[] = [];
  const documentSourceLabels: string[] = [];

  const tempDir = path.join(process.cwd(), 'scratch', 'temp_pdfs', cleanTicker);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileManager = new GoogleAIFileManager(apiKey);

  try {
    // 4. Chuẩn bị danh sách PDF cần tải
    // a) BCTN gần nhất (1 file)
    const latestBctn = catalog.documents.annualReports?.[0];
    if (latestBctn?.downloadUrl) {
      console.log(`⬇️ Downloading BCTN: ${latestBctn.label}...`);
      const localBctn = await downloadPdfToTemp(latestBctn.downloadUrl, tempDir, `${cleanTicker}_BCTN_${latestBctn.year}.pdf`);
      if (localBctn) {
        downloadedPdfPaths.push(localBctn);
        documentSourceLabels.push(`${latestBctn.label} (Cafef)`);
      }
    }

    // b) Nghị quyết ĐHCĐ (1 file)
    const agm = catalog.documents.agmResolution;
    if (agm?.downloadUrl) {
      console.log(`⬇️ Downloading NQ ĐHCĐ: ${agm.label}...`);
      const localAgm = await downloadPdfToTemp(agm.downloadUrl, tempDir, `${cleanTicker}_NQ_DHCD_${agm.year}.pdf`);
      if (localAgm) {
        downloadedPdfPaths.push(localAgm);
        documentSourceLabels.push(`${agm.label} (Vietstock)`);
      }
    }

    // c) Báo cáo CTCK mới nhất (tối đa 2-3 files)
    const brokerReports = (catalog.documents.brokerReports || []).slice(0, 3);
    for (let i = 0; i < brokerReports.length; i++) {
      const rep = brokerReports[i];
      if (rep.downloadUrl) {
        console.log(`⬇️ Downloading CTCK Report [${i + 1}/${brokerReports.length}]: ${rep.source} - ${rep.title}...`);
        const localRep = await downloadPdfToTemp(
          rep.downloadUrl,
          tempDir,
          `${cleanTicker}_Broker_${rep.source}_${i + 1}.pdf`
        );
        if (localRep) {
          downloadedPdfPaths.push(localRep);
          documentSourceLabels.push(`Báo cáo ${rep.source} (${rep.issueDate})`);
        }
      }
    }

    console.log(`📥 [3/6] Total valid PDFs downloaded: ${downloadedPdfPaths.length}`);

    // 5. Upload các file PDF lên Gemini Native File API
    console.log(`☁️ [4/6] Uploading PDFs to Gemini Native File API...`);
    for (let i = 0; i < downloadedPdfPaths.length; i++) {
      const filePath = downloadedPdfPaths[i];
      const displayName = path.basename(filePath);
      const uploaded = await uploadPdfToGemini(fileManager, filePath, displayName);
      if (uploaded && uploaded.uri) {
        geminiFileParts.push({
          fileData: {
            mimeType: 'application/pdf',
            fileUri: uploaded.uri,
          },
        });
        geminiFileNamesToCleanup.push(uploaded.name);
      }
    }

    // 6. Xây dựng Prompt 1 hoàn chỉnh
    console.log(`🧠 [5/6] Invoking Gemini 2.5 Flash for Zero-Loss Qualitative Extraction...`);
    const todayStr = new Date().toISOString().split('T')[0];
    const simplizeMetadataPayload = JSON.stringify(
      brokerReports.map((b) => ({
        brokerName: b.source,
        reportDate: b.issueDate,
        reportTitle: b.title,
        targetPrice: b.targetPrice || 0,
        recommendation: b.recommend || 'KHẢ QUAN',
      })),
      null,
      2
    );

    const compiledPrompt = PROMPT_1_BASE_TEMPLATE
      .replace(/{{TICKER}}/g, cleanTicker)
      .replace(/{{ANALYZED_DATE}}/g, todayStr)
      .replace(/{{INDUSTRY_MODEL}}/g, industryModel)
      .replace('{{INDUSTRY_EXTRACTION_GUIDE}}', industryGuide)
      .replace('{{SIMPLIZE_METADATA}}', simplizeMetadataPayload);

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = [
      options.modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      'gemini-1.5-flash',
    ];

    let resultText = '';
    let usedModel = '';

    for (const modelCandidate of candidateModels) {
      try {
        console.log(`   - Calling model: ${modelCandidate}...`);
        const model = genAI.getGenerativeModel({
          model: modelCandidate,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        });

        const contents = [
          {
            role: 'user',
            parts: [{ text: compiledPrompt }, ...geminiFileParts],
          },
        ];

        const res = await model.generateContent({ contents });
        resultText = res.response.text();
        usedModel = modelCandidate;
        break;
      } catch (callErr: any) {
        console.warn(`   - Model ${modelCandidate} failed:`, callErr.message);
      }
    }

    if (!resultText) {
      throw new Error(`Failed to generate qualitative insights for ${cleanTicker} with all candidate models.`);
    }

    // 7. Parse và kiểm tra JSON
    let parsed: any;
    try {
      let cleaned = resultText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch (parseErr: any) {
      console.error(`[Stage 1 Extractor] JSON Parse error:`, parseErr.message);
      throw new Error(`Invalid JSON returned from Gemini for ${cleanTicker}`);
    }

    // Đảm bảo cấu trúc đầy đủ
    const finalInsights: QualitativeInsights = {
      ticker: cleanTicker,
      analyzedAt: todayStr,
      industryModel,
      icbCodeLv2,
      documentSources: documentSourceLabels.length > 0 ? documentSourceLabels : (parsed.documentSources || ['BCTN', 'NQ ĐHCĐ', 'Báo cáo CTCK']),
      sectionA_CorporateOverview: parsed.sectionA_CorporateOverview || {},
      sectionB_IndustrySpecificValueChain: parsed.sectionB_IndustrySpecificValueChain || {},
      sectionC_GrowthProjectsAndExpansion: Array.isArray(parsed.sectionC_GrowthProjectsAndExpansion) ? parsed.sectionC_GrowthProjectsAndExpansion : [],
      sectionD_CorporateStrategyAndAGM: parsed.sectionD_CorporateStrategyAndAGM || {},
      sectionE_BrokerConsensusAndTheses: parsed.sectionE_BrokerConsensusAndTheses || { reportsAnalyzed: [], consensusSummary: '' },
      sectionF_EarningsQualityAndRisks: parsed.sectionF_EarningsQualityAndRisks || {},
    };

    // 8. Lưu kết quả vào Cloudflare R2 & Local Disk Cache
    console.log(`💾 [6/6] Persisting Qualitative Insights to R2 & Local Disk...`);
    const storeRes = await putQualitativeReport(cleanTicker, finalInsights);
    console.log(`✅ [Stage 1 Extractor] ${cleanTicker} successfully extracted! (Destination: ${storeRes.destination})`);
    console.log(`   - Model used: ${usedModel}`);
    console.log(`   - Projects found: ${finalInsights.sectionC_GrowthProjectsAndExpansion.length}`);
    console.log(`   - Broker theses analyzed: ${finalInsights.sectionE_BrokerConsensusAndTheses.reportsAnalyzed?.length || 0}`);

    return finalInsights;
  } finally {
    // 9. Dọn dẹp tài nguyên
    console.log(`🧹 Cleaning up temporary local files and Gemini storage...`);
    cleanupLocalFiles(downloadedPdfPaths);
    await cleanupGeminiFiles(fileManager, geminiFileNamesToCleanup);
  }
}

/**
 * CLI Runner
 */
async function main() {
  const args = process.argv.slice(2);
  const tickerArg = args.find((a) => a.startsWith('--ticker='))?.split('=')[1];
  const batchArg = args.find((a) => a.startsWith('--batch='))?.split('=')[1];
  const autoAdtv5 = args.includes('--auto-adtv5');
  const force = args.includes('--force');
  const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;

  let targetTickers: string[] = [];

  if (tickerArg) {
    targetTickers = [tickerArg.trim().toUpperCase()];
  } else if (batchArg) {
    targetTickers = batchArg.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  } else if (autoAdtv5) {
    console.log(`📊 [Vietcap Screener] Querying all stocks with ADTV 20D >= 5 Tỷ VNĐ...`);
    const screenerResults = await executeVietcapScreener({ adtvMinBillion: 5 });
    // Sắp xếp theo RS giảm dần
    screenerResults.sort((a, b) => (b.rs1Month || 0) - (a.rs1Month || 0));
    targetTickers = screenerResults.map((s) => s.ticker);
    console.log(`🎯 Found ${targetTickers.length} stocks with ADTV 20D >= 5 Tỷ.`);
  } else {
    console.log(`
Usage:
  npx tsx scripts/extract-qualitative-data.ts --ticker=HPG
  npx tsx scripts/extract-qualitative-data.ts --batch=HPG,MBB,MWG
  npx tsx scripts/extract-qualitative-data.ts --auto-adtv5 [--limit=20] [--force]
`);
    return;
  }

  if (typeof limit === 'number' && limit > 0) {
    targetTickers = targetTickers.slice(0, limit);
  }

  console.log(`📋 Processing ${targetTickers.length} tickers: [${targetTickers.join(', ')}]`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetTickers.length; i++) {
    const ticker = targetTickers[i];
    console.log(`\n[${i + 1}/${targetTickers.length}] Processing ${ticker}...`);
    try {
      const res = await extractQualitativeForTicker({ ticker, force });
      if (res) successCount++;
      else failCount++;
    } catch (err: any) {
      console.error(`❌ Error extracting ${ticker}:`, err.message);
      failCount++;
    }

    // Delay 4 giây giữa các mã trong batch để tôn trọng giới hạn tốc độ của API
    if (i < targetTickers.length - 1) {
      console.log(`⏳ Waiting 4s before next ticker...`);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  console.log(`\n======================================================`);
  console.log(`🏁 Batch completed! Success: ${successCount} | Failed: ${failCount}`);
  console.log(`======================================================`);
}

// Chạy trực tiếp nếu được gọi qua CLI
if (require.main === module || process.argv[1]?.includes('extract-qualitative-data')) {
  main().catch((err) => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}
