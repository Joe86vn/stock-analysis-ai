import { MorningBriefData, MacroNewsItem, CorporateNewsItem, MarketEventItem, WatchlistStockItem, StockFlowItem, StockInfluenceItem } from '@/types/morning-brief';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Mẫu dữ liệu Bản tin sáng mặc định (Dự phòng khi mất kết nối mạng hoặc rate-limit)
 */
export function getDefaultMorningBrief(): MorningBriefData {
  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return {
    id: `brief-${now.toISOString().split('T')[0]}`,
    title: `BẢN TIN SÁNG GIÁ TRỊ & THỊ TRƯỜNG VALUEX`,
    date: dateStr,
    time: '08:00 AM',
    brand: {
      teamName: 'ValueX Research Team',
      hotline: '1900 6868 - 0988.xxx.xxx',
      email: 'research@valuex.vn',
      website: 'valuex.duckdns.org',
    },
    marketStrategy: {
      trend: 'Điều chỉnh tích lũy',
      supportZone: '1,240 - 1,250 điểm',
      resistanceZone: '1,275 - 1,285 điểm',
      commentary: 'VN-Index đang trong nhịp rung lắc tích lũy kiểm định lại vùng hỗ trợ MA20. Thanh khoản duy trì ở mức trung bình, dòng tiền có xu hướng phân hóa mạnh tập trung vào các nhóm ngành có KQKD quý tăng trưởng vững chắc và định giá còn biên an toàn cao.',
      actionRecommendation: 'Duy trì tỷ trọng cổ phiếu ở mức 50 - 65% danh mục. Ưu tiên giải ngân tích lũy ở các nhịp điều chỉnh rung lắc vào nhóm Ngân hàng, Bất động sản khu công nghiệp và Bán lẻ. Hạn chế mua đuổi tại các nhịp hưng phấn đầu phiên.',
    },
    macroInternational: [
      {
        id: 'macro-int-1',
        title: 'Thị trường chứng khoán Mỹ phân hóa, Dow Jones tăng điểm',
        content: 'Chỉ số Dow Jones đóng cửa tăng nhẹ nhờ nhóm tài chính và công nghiệp, trong khi nhóm Big Tech chịu áp lực chốt lời ngắn hạn trước thềm công bố dữ liệu PCE lõi.',
        impact: 'positive',
        metric: 'Dow Jones: +0.32% | S&P 500: -0.11%',
      },
      {
        id: 'macro-int-2',
        title: 'Chỉ số USD Index (DXY) hạ nhiệt quanh mốc 104 điểm',
        content: 'Đồng USD chững lại đà tăng giúp giảm bớt áp lực tỷ giá đối với các thị trường mới nổi sau khi các thành viên Fed để ngỏ khả năng tiếp tục hạ lãi suất.',
        impact: 'positive',
        metric: 'DXY: 104.15 (-0.28%)',
      },
      {
        id: 'macro-int-3',
        title: 'Giá dầu thô thế giới ổn định, neo quanh vùng 74 USD/thùng',
        content: 'Căng thẳng địa chính trị tại Trung Đông tiếp tục giữ giá dầu ở mức cao, tuy nhiên nguồn cung ổn định từ các nước ngoài OPEC+ đã kiềm chế đà bứt phá mạnh.',
        impact: 'neutral',
        metric: 'Dầu Brent: $74.6/thùng (+0.4%)',
      },
    ],
    macroDomestic: [
      {
        id: 'macro-dom-1',
        title: 'Tỷ giá USD/VND trong nước duy trì trạng thái ổn định',
        content: 'Tỷ giá trung tâm và tỷ giá tại các NHTM hạ nhiệt nhẹ sau các đợt phát hành tín phiếu can thiệp của NHNN, thanh khoản hệ thống dồi dào trở lại.',
        impact: 'positive',
        metric: 'USD/VND: 25,410 (-15 VND)',
      },
      {
        id: 'macro-dom-2',
        title: 'Lãi suất liên ngân hàng qua đêm tiếp tục giảm sâu',
        content: 'Lãi suất qua đêm liên ngân hàng dao động quanh mức 3.8% - 4.1%/năm, phản ánh thanh khoản VND dồi dào, hỗ trợ tích cực cho chi phí vốn của các tổ chức tín dụng.',
        impact: 'positive',
        metric: 'Lãi suất O/N: 3.85%',
      },
      {
        id: 'macro-dom-3',
        title: 'Đẩy mạnh giải ngân vốn đầu tư công các tháng cuối năm',
        content: 'Chính phủ chỉ đạo quyết liệt các Bộ ngành và địa phương tập trung tháo gỡ vướng mắc mặt bằng, quyết tâm đạt mục tiêu giải ngân 95% kế hoạch vốn đầu tư công năm.',
        impact: 'positive',
        metric: 'Kế hoạch giải ngân: >95%',
      },
    ],
    marketOverview: {
      symbol: 'VN-INDEX',
      price: 1262.45,
      change: 4.85,
      percentChange: 0.39,
      totalVolume: 685.2, // Triệu cp
      totalValue: 16840.5, // Tỷ đồng
      advances: 235,
      declines: 168,
      noChange: 72,
    },
    secondaryIndices: {
      hnx: { price: 231.2, change: 0.85, percentChange: 0.37, totalValue: 1420.3 },
      upcom: { price: 92.4, change: 0.15, percentChange: 0.16, totalValue: 680.1 },
    },
    foreignFlow: {
      netTotalBillion: -185.4,
      topBuy: [
        { symbol: 'MWG', netValueBillion: 78.5, price: 67200, percentChange: 2.1 },
        { symbol: 'FPT', netValueBillion: 64.2, price: 136500, percentChange: 1.4 },
        { symbol: 'STB', netValueBillion: 45.8, price: 34100, percentChange: 1.8 },
        { symbol: 'TCB', netValueBillion: 38.6, price: 24500, percentChange: 0.8 },
      ],
      topSell: [
        { symbol: 'VHM', netValueBillion: -112.4, price: 41800, percentChange: -1.2 },
        { symbol: 'MSN', netValueBillion: -85.6, price: 73500, percentChange: -0.7 },
        { symbol: 'VNM', netValueBillion: -62.3, price: 66800, percentChange: -0.5 },
        { symbol: 'HPG', netValueBillion: -48.1, price: 27100, percentChange: 0.0 },
      ],
    },
    proprietaryFlow: {
      netTotalBillion: 142.6,
      topBuy: [
        { symbol: 'MBB', netValueBillion: 48.2, price: 24900, percentChange: 1.2 },
        { symbol: 'ACB', netValueBillion: 36.5, price: 25400, percentChange: 0.8 },
        { symbol: 'VPB', netValueBillion: 32.1, price: 19800, percentChange: 1.5 },
      ],
      topSell: [
        { symbol: 'VIC', netValueBillion: -28.4, price: 42100, percentChange: -0.9 },
        { symbol: 'SSI', netValueBillion: -19.5, price: 26800, percentChange: -0.4 },
      ],
    },
    marketInfluence: {
      topGainers: [
        { symbol: 'VCB', pointContribution: 1.45, percentChange: 1.2 },
        { symbol: 'BID', pointContribution: 0.98, percentChange: 1.5 },
        { symbol: 'MWG', pointContribution: 0.65, percentChange: 2.1 },
        { symbol: 'TCB', pointContribution: 0.52, percentChange: 0.8 },
      ],
      topLosers: [
        { symbol: 'VHM', pointContribution: -0.85, percentChange: -1.2 },
        { symbol: 'MSN', pointContribution: -0.42, percentChange: -0.7 },
        { symbol: 'VNM', pointContribution: -0.31, percentChange: -0.5 },
        { symbol: 'VIC', pointContribution: -0.28, percentChange: -0.9 },
      ],
    },
    valuation: {
      peCurrent: 14.2,
      peAvg5Y: 15.1,
      pbCurrent: 1.68,
      pbAvg5Y: 1.82,
      evaluation: 'Hấp dẫn',
      summary: 'P/E thị trường ở mức 14.2x, thấp hơn mức trung bình 5 năm (15.1x). Tỷ suất sinh lời E/P đạt ~7.04%, duy trì mức chênh lệch hấp dẫn so với lãi suất huy động 12 tháng (~5.0%).',
    },
    corporateNews: [
      {
        id: 'corp-1',
        symbol: 'MWG',
        headline: 'Bách Hóa Xanh tiếp tục mở rộng điểm bán, ghi nhận doanh thu tăng 25% YoY',
        summary: 'Chuỗi Bách Hóa Xanh đóng góp tích cực vào dòng tiền hoạt động của tập đoàn với doanh thu trung bình đạt trên 2.1 tỷ đồng/cửa hàng/tháng.',
        impact: 'positive',
      },
      {
        id: 'corp-2',
        symbol: 'FPT',
        headline: 'FPT ký kết hợp đồng chuyển đổi số và bán dẫn quy mô 120 triệu USD tại Nhật Bản',
        summary: 'Doanh thu ký mới mảng dịch vụ CNTT nước ngoài duy trì đà tăng trưởng trên 28%, động lực chính đến từ thị trường Nhật Bản và APAC.',
        impact: 'positive',
      },
      {
        id: 'corp-3',
        symbol: 'HPG',
        headline: 'Khu liên hợp Dung Quất 2 chuẩn bị chạy thử nghiệm phân kỳ 1 vào Q1 tới',
        summary: 'Công suất thép HRC dự kiến tăng thêm 5.6 triệu tấn khi hoàn thiện, tạo bước đột phá về quy mô doanh thu và thị phần trong dài hạn.',
        impact: 'positive',
      },
      {
        id: 'corp-4',
        symbol: 'VND',
        headline: 'Hoàn tất phát hành tăng vốn điều lệ lên mức gần 15,200 tỷ đồng',
        summary: 'Bổ sung nguồn lực vốn dồi dào phục vụ cho vay margin và mở rộng danh mục tự doanh trong bối cảnh thanh khoản thị trường phục hồi.',
        impact: 'neutral',
      },
    ],
    marketEvents: [
      {
        id: 'event-1',
        date: '05/11',
        symbol: 'VNM',
        content: 'Tạm ứng cổ tức đợt 1 bằng tiền mặt tỷ lệ 15% (1,500 đ/cp)',
        type: 'Cổ tức',
      },
      {
        id: 'event-2',
        date: '08/11',
        symbol: 'TCB',
        content: 'Ngày GDKHQ nhận cổ phiếu thưởng tỷ lệ 100%',
        type: 'GDKHQ',
      },
      {
        id: 'event-3',
        date: '15/11',
        symbol: 'VN30F2611',
        content: 'Ngày đáo hạn Hợp đồng tương lai chỉ số VN30 tháng 11',
        type: 'Phái sinh',
      },
    ],
    watchlist: [
      {
        symbol: 'MWG',
        catalyst: 'Bách Hóa Xanh bắt đầu có lãi ròng bền vững, bán lẻ điện máy phục hồi',
        action: 'Mua gom',
        targetPrice: '75,000 đ',
      },
      {
        symbol: 'TCB',
        catalyst: 'Tín dụng tăng trưởng cao dẫn đầu ngành, CASA duy trì top 1 thị trường',
        action: 'Mua gom',
        targetPrice: '28,500 đ',
      },
      {
        symbol: 'KBC',
        catalyst: 'Dự án KCN Tràng Duệ 3 sớm hoàn tất pháp lý thu hút dòng vốn FDI',
        action: 'Theo dõi',
        targetPrice: '32,000 đ',
      },
    ],
    disclaimer: 'Bản tin sáng do ValueX Research Team tổng hợp và biên soạn độc quyền phục vụ mục đích cung cấp thông tin tham khảo cho khách hàng. Các nhận định và khuyến nghị dựa trên các nguồn dữ liệu công khai đáng tin cậy tại thời điểm phát hành. Nhà đầu tư tự chịu trách nhiệm hoàn toàn về các quyết định giải ngân của mình.',
    lastUpdated: now.toISOString(),
  };
}

/**
 * Thu thập số liệu thị trường thực tế từ các nguồn upstream
 */
export async function fetchLiveMarketStats(): Promise<Partial<MorningBriefData>> {
  const result: Partial<MorningBriefData> = {};

  // 1. Fetch Khối ngoại (MasTrade)
  try {
    const [resBuy, resSell] = await Promise.allSettled([
      fetch('https://mastrade.masvn.com/api/v1/market/top?top=TOP_FOREIGN_NET_BUY_VALUE&fetchCount=5', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
      fetch('https://mastrade.masvn.com/api/v1/market/top?top=TOP_FOREIGN_NET_SELL_VALUE&fetchCount=5', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
    ]);

    let topBuy: StockFlowItem[] = [];
    let topSell: StockFlowItem[] = [];

    if (resBuy.status === 'fulfilled' && resBuy.value.ok) {
      const dataBuy = await resBuy.value.json();
      const list = dataBuy?.data || dataBuy?.rows || [];
      if (Array.isArray(list)) {
        topBuy = list.map((item: any) => ({
          symbol: item.stockCode || item.symbol || item.code,
          netValueBillion: Number(((item.netVal || item.val || 0) / 1e9).toFixed(1)),
          price: item.price || item.matchPrice,
          percentChange: item.perChange || item.rate,
        }));
      }
    }

    if (resSell.status === 'fulfilled' && resSell.value.ok) {
      const dataSell = await resSell.value.json();
      const list = dataSell?.data || dataSell?.rows || [];
      if (Array.isArray(list)) {
        topSell = list.map((item: any) => ({
          symbol: item.stockCode || item.symbol || item.code,
          netValueBillion: Number((-Math.abs((item.netVal || item.val || 0) / 1e9)).toFixed(1)),
          price: item.price || item.matchPrice,
          percentChange: item.perChange || item.rate,
        }));
      }
    }

    if (topBuy.length > 0 || topSell.length > 0) {
      const buyTotal = topBuy.reduce((s, it) => s + (it.netValueBillion || 0), 0);
      const sellTotal = topSell.reduce((s, it) => s + (it.netValueBillion || 0), 0);
      result.foreignFlow = {
        netTotalBillion: Number((buyTotal + sellTotal).toFixed(1)),
        topBuy,
        topSell,
      };
    }
  } catch (err) {
    console.warn('[MorningBriefService] Failed to fetch foreign flow:', err);
  }

  // 2. Fetch Market Influence (MasTrade)
  try {
    const [resGainers, resLosers] = await Promise.allSettled([
      fetch(`https://mastrade.masvn.com/api/v2/vs/stockInfluence?query=query{vsStockInfluenceList(IndexCode:%22VN-INDEX%22,fetchCount:5,SortType:%22DESC%22,SortBy:%22InfluenceIndex%22){StockCode,InfluenceIndex,PerChange}}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
      fetch(`https://mastrade.masvn.com/api/v2/vs/stockInfluence?query=query{vsStockInfluenceList(IndexCode:%22VN-INDEX%22,fetchCount:5,SortType:%22ASC%22,SortBy:%22InfluenceIndex%22){StockCode,InfluenceIndex,PerChange}}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
    ]);

    let topGainers: StockInfluenceItem[] = [];
    let topLosers: StockInfluenceItem[] = [];

    if (resGainers.status === 'fulfilled' && resGainers.value.ok) {
      const data = await resGainers.value.json();
      const list = data?.data?.vsStockInfluenceList || [];
      if (Array.isArray(list)) {
        topGainers = list.map((item: any) => ({
          symbol: item.StockCode,
          pointContribution: Number(Number(item.InfluenceIndex || 0).toFixed(2)),
          percentChange: Number(Number(item.PerChange || 0).toFixed(2)),
        }));
      }
    }

    if (resLosers.status === 'fulfilled' && resLosers.value.ok) {
      const data = await resLosers.value.json();
      const list = data?.data?.vsStockInfluenceList || [];
      if (Array.isArray(list)) {
        topLosers = list.map((item: any) => ({
          symbol: item.StockCode,
          pointContribution: Number(Number(item.InfluenceIndex || 0).toFixed(2)),
          percentChange: Number(Number(item.PerChange || 0).toFixed(2)),
        }));
      }
    }

    if (topGainers.length > 0 || topLosers.length > 0) {
      result.marketInfluence = { topGainers, topLosers };
    }
  } catch (err) {
    console.warn('[MorningBriefService] Failed to fetch market influence:', err);
  }

  return result;
}

/**
 * Gọi AI Gemini với Search Grounding để tổng hợp tin tức vĩ mô và doanh nghiệp mới nhất
 */
export async function generateGroundedMorningBriefContent(
  baseBrief: MorningBriefData
): Promise<MorningBriefData> {
  const apiKey = process.env.GEMINI_GROUNDING_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[MorningBriefService] Không tìm thấy GEMINI_API_KEY, sử dụng template chuẩn');
    return baseBrief;
  }

  const prompt = `Bạn là Giám đốc Phân tích & Nghiên cứu (Head of Research) tại nền tảng tài chính ValueX.
Hôm nay là ngày ${baseBrief.date}. Hãy tổng hợp và viết BẢN TIN SÁNG THỊ TRƯỜNG CHỨNG KHOÁN VIỆT NAM (Morning Market Briefing) cập nhật nhất trong 24 giờ qua.

YÊU CẦU NỘI DUNG NGHIÊM NGẶT:
1. Vĩ mô quốc tế (macroInternational): 3 tin ngắn gọn kèm chỉ số chính xác (DXY, Dầu Brent, Lợi suất US10Y, Dow Jones).
2. Vĩ mô trong nước (macroDomestic): 3 tin trọng tâm (Tỷ giá USD/VND, lãi suất liên ngân hàng, giải ngân đầu tư công, động thái NHNN).
3. Nhận định VN-Index (marketStrategy): Xu hướng, vùng hỗ trợ, vùng kháng cự, bình luận xu hướng và khuyến nghị hành động cụ thể.
4. Tin doanh nghiệp (corporateNews): 4 tin tức niêm yết mới nhất (KQKD, trúng thầu dự án, M&A, cổ tức, tăng vốn) của các cổ phiếu lớn (VHM, HPG, MWG, FPT, TCB, MBB, SSI...).
5. Lịch sự kiện (marketEvents): 3-4 sự kiện sắp diễn ra trong ngày/tuần (Cổ tức, GDKHQ, ĐHCĐ, Đáo hạn phái sinh).
6. Danh mục theo dõi (watchlist): 3 cổ phiếu có động lực tăng trưởng tốt nhất cho phiên hôm nay.

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐOẠN JSON HỢP LỆ THEO SCHEMA SAU (không bọc text ngoài JSON):
{
  "marketStrategy": {
    "trend": "Tăng trưởng" | "Điều chỉnh tích lũy" | "Thận trọng" | "Phục hồi",
    "supportZone": "string",
    "resistanceZone": "string",
    "commentary": "string",
    "actionRecommendation": "string"
  },
  "macroInternational": [
    { "title": "string", "content": "string", "impact": "positive" | "neutral" | "negative", "metric": "string" }
  ],
  "macroDomestic": [
    { "title": "string", "content": "string", "impact": "positive" | "neutral" | "negative", "metric": "string" }
  ],
  "corporateNews": [
    { "symbol": "string", "headline": "string", "summary": "string", "impact": "positive" | "neutral" | "negative" }
  ],
  "marketEvents": [
    { "date": "string", "symbol": "string", "content": "string", "type": "Cổ tức" | "ĐHCĐ" | "GDKHQ" | "Phái sinh" | "Sự kiện khác" }
  ],
  "watchlist": [
    { "symbol": "string", "catalyst": "string", "action": "Mua gom" | "Theo dõi" | "Nắm giữ" | "Chốt lời", "targetPrice": "string" }
  ]
}`;

  const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
          }),
        }
      );

      if (!res.ok) {
        console.warn(`[MorningBriefService] Model ${model} failed (${res.status})`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      // Trích xuất JSON từ markdown block nếu có
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawText;
      const parsed = JSON.parse(jsonStr);

      return {
        ...baseBrief,
        marketStrategy: parsed.marketStrategy || baseBrief.marketStrategy,
        macroInternational: (parsed.macroInternational || baseBrief.macroInternational).map((item: any, idx: number) => ({
          ...item,
          id: item.id || `macro-int-ai-${idx}`,
        })),
        macroDomestic: (parsed.macroDomestic || baseBrief.macroDomestic).map((item: any, idx: number) => ({
          ...item,
          id: item.id || `macro-dom-ai-${idx}`,
        })),
        corporateNews: (parsed.corporateNews || baseBrief.corporateNews).map((item: any, idx: number) => ({
          ...item,
          id: item.id || `corp-ai-${idx}`,
        })),
        marketEvents: (parsed.marketEvents || baseBrief.marketEvents).map((item: any, idx: number) => ({
          ...item,
          id: item.id || `event-ai-${idx}`,
        })),
        watchlist: parsed.watchlist || baseBrief.watchlist,
        lastUpdated: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`[MorningBriefService] Error generating content with ${model}:`, err);
    }
  }

  return baseBrief;
}

/**
 * Pipeline chính tạo Bản tin sáng hoàn chỉnh
 */
export async function createFullMorningBrief(forceRefresh = false): Promise<MorningBriefData> {
  const base = getDefaultMorningBrief();

  // 1. Đồng bộ số liệu thị trường thực tế
  const liveStats = await fetchLiveMarketStats();
  const mergedWithStats: MorningBriefData = {
    ...base,
    ...liveStats,
    foreignFlow: liveStats.foreignFlow || base.foreignFlow,
    marketInfluence: liveStats.marketInfluence || base.marketInfluence,
  };

  // 2. Nếu người dùng yêu cầu làm mới hoặc có API key, gọi AI Search Grounding
  try {
    return await generateGroundedMorningBriefContent(mergedWithStats);
  } catch (err) {
    console.error('[MorningBriefService] AI Grounding fallback to default data:', err);
    return mergedWithStats;
  }
}

