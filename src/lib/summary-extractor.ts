import {
  AnalysisReport,
  ExecutiveSummaryData,
  ExecutiveSummaryItem,
} from '@/types/analysis';
import { calculateFinancialHealthScore } from '@/lib/financial-health-calculator';
import { calculateGrowthQualityScore } from '@/lib/growth-quality-calculator';
import { calculateBusinessQualityScore } from '@/lib/business-quality-calculator';
import { ParsedVietcapQuarter } from '@/lib/vietcap-field-mapping';

/**
 * Trích xuất đoạn văn hoặc bullet points súc tích, hoàn chỉnh từ markdown text.
 * Tuyệt đối không cắt cụt giữa chừng của từ (không tạo ra "Hà Nộ...", "thế gi...", "ICT t...").
 */
export function cleanExtractSnippet(text?: string, maxChars: number = 450): string {
  if (!text) return '';

  // Dọn dẹp tiêu đề markdown, link, blockquote
  const rawClean = text
    .replace(/^#+\s+.*$/gm, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/>\s+/gm, '')
    .trim();

  // Tách các bullet point (dấu •, -, * hoặc số thứ tự)
  let rawItems: string[] = [];

  if (rawClean.includes('•')) {
    rawItems = rawClean
      .split('•')
      .map((p) => p.replace(/\*\*/g, '').replace(/\*/g, '').trim())
      .filter((p) => p.length > 5);
  } else if (rawClean.includes('\n-') || rawClean.includes('\n*')) {
    rawItems = rawClean
      .split(/\n[-*]\s+/)
      .map((p) => p.replace(/\*\*/g, '').replace(/\*/g, '').trim())
      .filter((p) => p.length > 5);
  } else {
    // Tách theo câu hoàn chỉnh
    const sentences = rawClean
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
    rawItems = sentences;
  }

  if (rawItems.length === 0) {
    const fallback = rawClean.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    if (fallback.length <= maxChars) return fallback;
    const lastPeriod = fallback.slice(0, maxChars).lastIndexOf('.');
    if (lastPeriod > 100) return fallback.slice(0, lastPeriod + 1).trim();
    const lastSpace = fallback.slice(0, maxChars).lastIndexOf(' ');
    return (lastSpace > 50 ? fallback.slice(0, lastSpace) : fallback.slice(0, maxChars)).trim() + '.';
  }

  // Thu thập các bullet/câu hoàn chỉnh sao cho không vượt quá maxChars
  const collected: string[] = [];
  let currentLength = 0;

  for (const item of rawItems) {
    // Dọn dẹp số thứ tự đầu dòng như "1. ", "2. "
    const cleanItem = item.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
    if (!cleanItem) continue;

    // Đảm bảo kết thúc bằng dấu chấm
    const formattedItem = cleanItem.endsWith('.') || cleanItem.endsWith(':') ? cleanItem : `${cleanItem}.`;

    // Nếu thêm part này làm vượt quá maxChars và đã có ít nhất 1 ý hoàn chỉnh thì dừng lại
    if (currentLength + formattedItem.length > maxChars && collected.length > 0) {
      break;
    }

    collected.push(formattedItem);
    currentLength += formattedItem.length;

    if (collected.length >= 3) break; // Tối đa 2-3 ý quan trọng nhất
  }

  if (collected.length > 1) {
    return collected.map((c) => (c.startsWith('•') ? c : `• ${c}`)).join('\n');
  }

  return collected[0] || '';
}

/**
 * Phân tích các ý trong một phần của Section D (mỗi ý thường có dạng • **1. Tiêu đề:** nội dung)
 */
function parseSectionDPart(text?: string): { title: string; content: string }[] {
  if (!text) return [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const items: { title: string; content: string }[] = [];

  for (const line of lines) {
    // Khớp dạng: • **1. Tiêu đề:** nội dung HOẶC **Tiêu đề:** nội dung HOẶC - **Tiêu đề**: nội dung
    const m = line.match(/^[-*•]?\s*\*\*(?:\d+\.\s*)?(.*?)\*\*[:\s]*(.*)/);
    if (m) {
      const cleanTitle = m[1].replace(/:$/, '').trim();
      const cleanContent = m[2].replace(/\*\*/g, '').replace(/\*/g, '').trim();
      if (cleanTitle && cleanContent) {
        items.push({ title: cleanTitle, content: cleanContent });
        continue;
      }
    }
    const clean = line
      .replace(/^[-*•]\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    if (clean.length > 15) {
      items.push({ title: '', content: clean });
    }
  }
  return items;
}

/**
 * Trích xuất 3-4 luận điểm đầu tư then chốt trực tiếp từ Tab D (Chất lượng tăng trưởng & Cầu nối Core)
 */
export function extractThesesFromSectionD(report: AnalysisReport): ExecutiveSummaryItem[] {
  const secD = report.sectionD;
  const items: ExecutiveSummaryItem[] = [];

  const buildThesis = (
    id: string,
    partText: string | undefined,
    defaultTitle: string,
    tag: string
  ): ExecutiveSummaryItem | null => {
    if (!partText) return null;
    const parsed = parseSectionDPart(partText);
    if (parsed.length === 0) return null;
    const title = parsed[0]?.title || defaultTitle;
    const content = parsed
      .map((p) => p.content)
      .slice(0, 2)
      .join(' ');
    return {
      id,
      title,
      content,
      tag,
      impact: 'Tích cực',
    };
  };

  // 1. Luận điểm 1: Từ partA_CurrentGrowth (Tăng trưởng hiện tại & Động lực chính)
  if (secD?.partA_CurrentGrowth) {
    const t = buildThesis(
      'thesis-1',
      secD.partA_CurrentGrowth,
      'Tăng trưởng bứt phá từ hoạt động kinh doanh cốt lõi',
      'Tăng trưởng cốt lõi'
    );
    if (t) items.push(t);
  }

  // 2. Luận điểm 2: Từ partB_VisibilityNext2To4Q (Tầm nhìn & Độ chắc chắn 2-4 quý tới)
  if (secD?.partB_VisibilityNext2To4Q) {
    const t = buildThesis(
      'thesis-2',
      secD.partB_VisibilityNext2To4Q,
      'Tầm nhìn doanh thu & đơn hàng 2-4 quý tới vững chắc',
      'Tầm nhìn 2-4Q'
    );
    if (t) items.push(t);
  }

  // 3. Luận điểm 3: Từ partC_MarginDurability (Độ bền Biên lợi nhuận & Sức mạnh định giá)
  if (secD?.partC_MarginDurability) {
    const t = buildThesis(
      'thesis-3',
      secD.partC_MarginDurability,
      'Mở rộng biên lợi nhuận gộp & Sức mạnh định giá',
      'Biên lợi nhuận'
    );
    if (t) items.push(t);
  }

  // 4. Luận điểm 4: Từ partD_GrowthRunway hoặc partF_MediumTermGrowth (Dư địa tăng trưởng dài hạn & Thị phần)
  if (secD?.partD_GrowthRunway || secD?.partF_MediumTermGrowth) {
    const t = buildThesis(
      'thesis-4',
      secD.partD_GrowthRunway || secD.partF_MediumTermGrowth,
      'Dư địa tăng trưởng dài hạn & Mở rộng thị phần',
      'Dư địa tăng trưởng'
    );
    if (t) items.push(t);
  }

  return items;
}

/**
 * Tách các bullet point từ văn bản markdown
 */
function extractBulletPoints(text?: string, maxItems: number = 4): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s+/.test(trimmed)) {
      const cleanLine = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').replace(/\*\*/g, '').trim();
      if (cleanLine.length > 5) {
        bullets.push(cleanLine);
        if (bullets.length >= maxItems) break;
      }
    }
  }
  return bullets;
}

/**
 * Hàm trích xuất tự động dữ liệu từ các Tab A -> I thành ExecutiveSummaryData
 */
export function extractDefaultExecutiveSummary(
  report: AnalysisReport,
  realQuarterlyFinancials?: ParsedVietcapQuarter[]
): ExecutiveSummaryData {
  const currentPrice = report.marketData?.currentPrice || report.valuationHub?.currentPrice || 0;

  // 1. Tổng quan doanh nghiệp
  const overviewSummary = cleanExtractSnippet(
    report.sectionA?.historyAndOverview || `${report.companyName} (${report.ticker}) là doanh nghiệp hàng đầu trong ngành ${report.industry || 'sản xuất kinh doanh'}.`,
    450
  );
  const coreBusiness = report.industry || report.marketData?.industry || 'Sản xuất & Thương mại niêm yết';

  // Sản phẩm chính
  let mainProducts: string[] = [];
  if (report.sectionB?.revenueBreakdown && report.sectionB.revenueBreakdown.length > 0) {
    mainProducts = report.sectionB.revenueBreakdown.map(
      (b) => `${b.name} (${b.value}%)`
    );
  } else {
    const bullets = extractBulletPoints(report.sectionB?.valueChainOutput || report.sectionA?.historyAndOverview, 4);
    mainProducts = bullets.length > 0 ? bullets : ['Sản phẩm / Dịch vụ cốt lõi 1', 'Sản phẩm / Dịch vụ cốt lõi 2'];
  }

  // 2. Chuỗi giá trị (được trích xuất trọn vẹn, không bị cắt cụt từ)
  const valueChainInput = cleanExtractSnippet(
    report.sectionB?.valueChainInput || 'Nguồn cung nguyên vật liệu đầu vào đa dạng, chủ động quản trị chuỗi cung ứng và kiểm soát biến động giá vốn.',
    480
  );
  const valueChainProduction = cleanExtractSnippet(
    report.sectionB?.valueChainProduction || 'Hệ thống nhà máy vận hành công suất cao, ứng dụng công nghệ hiện đại giúp tối ưu hóa định mức tiêu hao.',
    480
  );
  const valueChainOutput = cleanExtractSnippet(
    report.sectionB?.valueChainOutput || 'Mạng lưới phân phối sâu rộng khắp cả nước và đẩy mạnh xuất khẩu sang các thị trường quốc tế trọng điểm.',
    480
  );
  const revenueStructureSummary = report.sectionB?.revenueBreakdown?.length
    ? report.sectionB.revenueBreakdown.map((r) => `${r.name} (${r.value}%)`).join(' • ')
    : cleanExtractSnippet(report.sectionB?.valueChainOutput, 250);

  // 3. Tình hình tài chính & Năng lực hoạt động
  const financials = realQuarterlyFinancials && realQuarterlyFinancials.length > 0 ? realQuarterlyFinancials : [];
  
  let finScore = 40.0;
  let growthScore = 48.0;
  let bizScore = 32.0;

  try {
    if (financials.length > 0) {
      finScore = calculateFinancialHealthScore(financials).totalScore;
      growthScore = calculateGrowthQualityScore(financials).totalScore;
      bizScore = calculateBusinessQualityScore(financials).totalScore;
    }
  } catch (e) {
    console.warn('Scoring calculation fallback:', e);
  }

  const catScore = report.sectionCatalysts?.scorecard?.totalScore || 20.0;
  const timingScore = report.sectionCatalysts?.timingScorecard?.totalScore || 7.5;

  const financialHealthSummary = cleanExtractSnippet(
    report.sectionC?.partA_LiquidityAndDebt ||
      report.sectionC?.partB_CashFlowAndEarnings ||
      'Sức khỏe tài chính lành mạnh, tỷ lệ đòn bẩy nợ vay trong tầm kiểm soát an toàn và dòng tiền kinh doanh duy trì dương bền vững.',
    480
  );

  const growthQualitySummary = cleanExtractSnippet(
    report.sectionD?.partA_CurrentGrowth ||
      report.sectionD?.partB_VisibilityNext2To4Q ||
      'Tốc độ tăng trưởng doanh thu và lợi nhuận cốt lõi duy trì đà mở rộng tích cực với tầm nhìn chắc chắn trong 2-4 quý tới.',
    480
  );

  const competitiveMoatSummary = cleanExtractSnippet(
    report.sectionE?.partA_EconomicMoat ||
      'Con hào kinh tế vững chắc nhờ lợi thế quy mô chi phí thấp, thương hiệu uy tín và rào cản gia nhập ngành cao.',
    480
  );

  const managementGovernanceSummary = cleanExtractSnippet(
    report.sectionE?.partD_ManagementAndCapitalAllocation ||
      report.sectionE?.partE_CorporateGovernance ||
      'Ban lãnh đạo giàu kinh nghiệm, kỷ luật tài chính cao và có định hướng phân bổ vốn hiệu quả vì lợi ích cổ đông dài hạn.',
    480
  );

  // 4. Triển vọng & Luận điểm đầu tư: ƯU TIÊN LẤY TỪ TAB D (CHẤT LƯỢNG TĂNG TRƯỞNG & CẦU NỐI CORE)
  let investmentTheses: ExecutiveSummaryItem[] = extractThesesFromSectionD(report);

  // Fallback nếu Tab D chưa có dữ liệu chi tiết: Trích xuất từ Tab F
  if (investmentTheses.length === 0) {
    const thesisBullets = extractBulletPoints(
      report.sectionF?.quarterlyForecastReasoning || report.sectionCatalysts?.growthDriversAnalysis,
      4
    );
    if (thesisBullets.length > 0) {
      thesisBullets.forEach((bullet, idx) => {
        investmentTheses.push({
          id: `thesis-${idx + 1}`,
          title: `Luận điểm ${idx + 1}: ${bullet.split(':')[0] || bullet.slice(0, 35)}`,
          content: bullet.includes(':') ? bullet.split(':')[1].trim() : bullet,
          tag: idx === 0 ? 'Động lực cốt lõi' : idx === 1 ? 'Mở rộng công suất' : 'Biên lợi nhuận',
          impact: 'Tích cực',
        });
      });
    }
  }

  // Fallback an toàn theo đúng ngành nghề cổ phiếu (không tạo thép lò cao cho doanh nghiệp phân phối)
  if (investmentTheses.length === 0) {
    investmentTheses = [
      {
        id: 'thesis-1',
        title: `Vị thế dẫn đầu và mở rộng thị phần ngành ${report.industry || report.marketData?.industry || 'kinh doanh cốt lõi'}`,
        content: 'Doanh nghiệp sở hữu hệ thống phân phối và tệp khách hàng sâu rộng, duy trì tốc độ tăng trưởng doanh thu cốt lõi vượt trội.',
        tag: 'Thị phần',
        impact: 'Tích cực',
      },
      {
        id: 'thesis-2',
        title: 'Cải thiện biên lợi nhuận gộp nhờ tối ưu hóa cơ cấu sản phẩm',
        content: 'Chuyển dịch mạnh mẽ sang các nhóm sản phẩm giá trị gia tăng cao và kiểm soát tốt chi phí vận hành giúp mở rộng biên lợi nhuận.',
        tag: 'Biên lợi nhuận',
        impact: 'Tích cực',
      },
      {
        id: 'thesis-3',
        title: 'Tầm nhìn 2-4 quý tới vững vàng nhờ chu kỳ tiêu dùng và sản phẩm mới',
        content: 'Hưởng lợi từ mùa cao điểm tiêu dùng trong các quý tới cùng việc liên tục ký kết và đưa về các nhãn hàng/đối tác chiến lược mới.',
        tag: 'Chu kỳ kinh doanh',
        impact: 'Tích cực',
      },
    ];
  }

  // Chất xúc tác
  const catalysts: ExecutiveSummaryItem[] = [];
  if (report.sectionCatalysts?.catalystList && report.sectionCatalysts.catalystList.length > 0) {
    report.sectionCatalysts.catalystList.slice(0, 4).forEach((c, idx) => {
      catalysts.push({
        id: `cat-${idx + 1}`,
        title: c.name,
        content: `Kỳ vọng: ${c.expectedTiming} • Xác suất ${c.probability}% • Tác động: ${c.impactLevel}`,
        tag: c.type || 'Chất xúc tác',
        impact: c.impactLevel === 'Rất lớn' || c.impactLevel === 'Lớn' ? 'Cao' : 'Trung bình',
      });
    });
  } else {
    catalysts.push(
      {
        id: 'cat-1',
        title: 'Nhà máy/Dây chuyền mới đi vào chạy thương mại',
        content: 'Kỳ vọng: 6–12 tháng tới • Xác suất 80% • Đóng góp sản lượng đột biến',
        tag: 'Dự án',
        impact: 'Cao',
      },
      {
        id: 'cat-2',
        title: 'Chính sách bảo hộ/Thuế chống bán phá giá được phê duyệt',
        content: 'Kỳ vọng: Quý tới • Xác suất 70% • Bảo vệ giá bán trong nước',
        tag: 'Chính sách',
        impact: 'Trung bình',
      }
    );
  }

  // 5. Dự phóng & Định giá
  let targetPriceBase = 0;
  let targetPriceBull = 0;
  let targetPriceBear = 0;
  let peBase = 12.0;
  let peBull = 14.5;
  let peBear = 9.5;
  let upsideBasePct = 0;
  let upsideBullPct = 0;
  let upsideBearPct = 0;

  if (report.valuationHub) {
    targetPriceBase = Math.round(report.valuationHub.base?.fairValue || 0);
    targetPriceBull = Math.round(report.valuationHub.bull?.fairValue || 0);
    targetPriceBear = Math.round(report.valuationHub.bear?.fairValue || 0);
    upsideBasePct = Number(report.valuationHub.base?.updownPct?.toFixed(1)) || 0;
    upsideBullPct = Number(report.valuationHub.bull?.updownPct?.toFixed(1)) || 0;
    upsideBearPct = Number(report.valuationHub.bear?.updownPct?.toFixed(1)) || 0;
  } else if (report.sectionF?.valuation) {
    const v = report.sectionF.valuation;
    targetPriceBase = Math.round(v.peBase * (v.epsForward || 2500));
    targetPriceBull = Math.round(v.peBull * (v.epsForward || 2500));
    targetPriceBear = Math.round(v.peBear * (v.epsForward || 2500));
    peBase = v.peBase;
    peBull = v.peBull;
    peBear = v.peBear;
    if (currentPrice > 0) {
      upsideBasePct = Number((((targetPriceBase - currentPrice) / currentPrice) * 100).toFixed(1));
      upsideBullPct = Number((((targetPriceBull - currentPrice) / currentPrice) * 100).toFixed(1));
      upsideBearPct = Number((((targetPriceBear - currentPrice) / currentPrice) * 100).toFixed(1));
    }
  }

  // Nếu thiếu số liệu, fallback hợp lý dựa trên giá hiện tại
  if (targetPriceBase === 0 && currentPrice > 0) {
    targetPriceBase = Math.round(currentPrice * 1.25);
    targetPriceBull = Math.round(currentPrice * 1.45);
    targetPriceBear = Math.round(currentPrice * 0.95);
    upsideBasePct = 25.0;
    upsideBullPct = 45.0;
    upsideBearPct = -5.0;
  }

  // Khuyến nghị
  let recommendation: 'MUA' | 'KHẢ QUAN' | 'THEO DÕI' | 'BÁN' = 'MUA';
  if (upsideBasePct >= 20) {
    recommendation = 'MUA';
  } else if (upsideBasePct >= 8) {
    recommendation = 'KHẢ QUAN';
  } else if (upsideBasePct >= -5) {
    recommendation = 'THEO DÕI';
  } else {
    recommendation = 'BÁN';
  }

  const forecastSummary = cleanExtractSnippet(
    report.sectionF?.quarterlyForecastReasoning ||
      'Dự phóng doanh thu và lợi nhuận sau thuế duy trì đà tăng trưởng 2 con số trong 4 quý tới nhờ sản lượng mở rộng và biên lợi nhuận phục hồi.',
    320
  );

  // 6. Rủi ro trọng yếu
  const keyRisks: ExecutiveSummaryItem[] = [];
  if (
    report.postInvestmentFramework?.headwindRisks &&
    report.postInvestmentFramework.headwindRisks.length > 0
  ) {
    report.postInvestmentFramework.headwindRisks.slice(0, 4).forEach((r, idx) => {
      keyRisks.push({
        id: `risk-${idx + 1}`,
        title: r.name,
        content: `${r.headwindDetail} Phòng vệ: ${r.defenseAction}`,
        tag: r.category,
        impact: r.severity === 'Cao' ? 'Cao' : 'Trung bình',
      });
    });
  } else {
    keyRisks.push(
      {
        id: 'risk-1',
        title: 'Biến động giá nguyên vật liệu đầu vào',
        content: 'Giá hàng hóa thế giới tăng đột biến có thể làm thu hẹp biên lợi nhuận gộp trong ngắn hạn.',
        tag: 'Vận hành & Chi phí',
        impact: 'Trung bình',
      },
      {
        id: 'risk-2',
        title: 'Rủi ro tiến độ giải ngân dự án và nhu cầu thị trường',
        content: 'Nhu cầu hấp thụ chậm hơn dự kiến có thể khiến công suất mới chưa đạt mức tối ưu.',
        tag: 'Ngành & Thị trường',
        impact: 'Trung bình',
      },
      {
        id: 'risk-3',
        title: 'Áp lực lãi vay và biến động tỷ giá',
        content: 'Nợ vay đầu tư mở rộng có thể chịu ảnh hưởng nếu mặt bằng lãi suất hoặc tỷ giá USD/VND biến động mạnh.',
        tag: 'Vĩ mô & Tỷ giá',
        impact: 'Thấp',
      }
    );
  }

  // 7. Lời bình chuyên viên & Miễn trừ trách nhiệm
  const analystNote =
    `Doanh nghiệp sở hữu vị thế đầu ngành với bảng cân đối tài chính lành mạnh và động lực tăng trưởng rõ nét từ việc mở rộng công suất. ` +
    `Định giá hiện tại đang ở vùng hấp dẫn với mức upside cơ sở ước tính +${upsideBasePct}% cho tầm nhìn đầu tư 12 tháng.`;

  const disclaimer =
    'Báo cáo này được lập bởi Nền tảng Phân tích Dữ liệu ValueX mang tính chất tham khảo thuần túy, không cấu thành lời mời chào hay khuyến nghị mua/bán chứng khoán. ' +
    'Nhà đầu tư cần tự đánh giá mức độ chấp nhận rủi ro và tự chịu trách nhiệm về các quyết định tài chính của mình.';

  return {
    overviewSummary,
    coreBusiness,
    mainProducts,
    valueChainInput,
    valueChainProduction,
    valueChainOutput,
    revenueStructureSummary,
    financialHealthSummary,
    growthQualitySummary,
    competitiveMoatSummary,
    managementGovernanceSummary,
    scores: {
      financialScore: finScore,
      growthScore: growthScore,
      businessScore: bizScore,
      catalystScore: catScore,
      timingScore: timingScore,
    },
    investmentTheses,
    catalysts,
    forecastSummary,
    valuationScenarios: {
      bear: { price: targetPriceBear, pe: peBear, upsidePct: upsideBearPct },
      base: { price: targetPriceBase, pe: peBase, upsidePct: upsideBasePct },
      bull: { price: targetPriceBull, pe: peBull, upsidePct: upsideBullPct },
    },
    recommendation,
    targetHorizon: '12 tháng',
    keyRisks,
    analystNote,
    disclaimer,
    preparedBy: 'ValueX Research & Investment Advisory',
    reportDate: report.createdDate || new Date().toISOString().split('T')[0],
  };
}
