import { NextRequest, NextResponse } from 'next/server';
import { fetchVietcapStatisticsFinancial, fetchVietcapEvents, VietcapStatisticItem } from '@/lib/vietcap-field-mapping';

function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function calculateMetricStats(rawValues: { period: string; value: number }[]) {
  // 1. Loại bỏ các giá trị âm, 0 hoặc cực đoan không tưởng (> 250x)
  const valid = rawValues.filter((item) => typeof item.value === 'number' && item.value > 0 && item.value <= 250);
  if (valid.length === 0) {
    return {
      values: [],
      mean: 0,
      median: 0,
      std: 0,
      minus1Sigma: 0,
      plus1Sigma: 0,
      min: 0,
      max: 0,
      outlierCount: 0,
    };
  }

  // 2. Lọc ngoại lai (Outlier Filter bằng IQR)
  const nums = valid.map((v) => v.value).sort((a, b) => a - b);
  let filtered = valid;
  let outlierCount = 0;

  if (nums.length >= 4) {
    const q25 = getPercentile(nums, 0.25);
    const q75 = getPercentile(nums, 0.75);
    const iqr = q75 - q25;
    const lowerBound = Math.max(0.1, q25 - 1.5 * iqr);
    const upperBound = q75 + 1.5 * iqr;

    filtered = valid.filter((v) => v.value >= lowerBound && v.value <= upperBound);
    outlierCount = valid.length - filtered.length;
    // Nếu lọc quá chặt làm mất gần hết dữ liệu, fallback về toàn bộ valid
    if (filtered.length < 3) {
      filtered = valid;
      outlierCount = 0;
    }
  }

  const values = filtered.map((v) => v.value);
  const sortedValues = [...values].sort((a, b) => a - b);

  // 3. Tính Mean
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  // 4. Tính Median
  const mid = Math.floor(sortedValues.length / 2);
  const median =
    sortedValues.length % 2 !== 0
      ? sortedValues[mid]
      : (sortedValues[mid - 1] + sortedValues[mid]) / 2;

  // 5. Tính Độ lệch chuẩn (Sample Standard Deviation)
  let std = 0;
  if (values.length > 1) {
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
    std = Math.sqrt(variance);
  }

  return {
    values: filtered,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    std: Number(std.toFixed(2)),
    minus1Sigma: Number(Math.max(0.1, median - std).toFixed(2)),
    plus1Sigma: Number((median + std).toFixed(2)),
    min: Number(sortedValues[0].toFixed(2)),
    max: Number(sortedValues[sortedValues.length - 1].toFixed(2)),
    outlierCount,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const cleanTicker = ticker.trim().toUpperCase();
    
    // Gọi song song cả thống kê tài chính và lịch sử sự kiện trả cổ tức
    const [rawItems, rawEvents] = await Promise.all([
      fetchVietcapStatisticsFinancial(cleanTicker),
      fetchVietcapEvents(cleanTicker),
    ]);

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json({
        ticker: cleanTicker,
        validQuarters: 0,
        quarterlySeries: [],
        pe: calculateMetricStats([]),
        pb: calculateMetricStats([]),
        evEbitda: calculateMetricStats([]),
        dividendPolicy: {
          annualCashDividend: 0,
          payoutRatio: 0,
          hasCashDividend: false,
          recentEvents: [],
        },
        warning: 'Không tìm thấy dữ liệu thống kê từ Vietcap IQ API',
      });
    }

    // Lọc chỉ lấy 4 quý chính quy (quarter 1 đến 4), sắp xếp tăng dần theo thời gian
    const quarterItems = rawItems
      .filter((item: VietcapStatisticItem) => item.quarter >= 1 && item.quarter <= 4)
      .sort((a, b) => {
        const yA = Number(a.year) || 0;
        const yB = Number(b.year) || 0;
        if (yA !== yB) return yA - yB;
        return a.quarter - b.quarter;
      });

    // Lấy tối đa 20 quý gần nhất (khoảng 5 năm)
    const recent20Q = quarterItems.slice(-20);

    const peRaw = recent20Q.map((item) => ({
      period: `Q${item.quarter}/${item.year}`,
      value: typeof item.pe === 'number' ? item.pe : 0,
    }));

    const pbRaw = recent20Q.map((item) => ({
      period: `Q${item.quarter}/${item.year}`,
      value: typeof item.pb === 'number' ? item.pb : 0,
    }));

    const evRaw = recent20Q.map((item) => ({
      period: `Q${item.quarter}/${item.year}`,
      value: typeof item.evToEbitda === 'number' ? item.evToEbitda : 0,
    }));

    const peStats = calculateMetricStats(peRaw);
    const pbStats = calculateMetricStats(pbRaw);
    const evStats = calculateMetricStats(evRaw);

    const latestItem = quarterItems[quarterItems.length - 1];

    // Tính chính sách cổ tức & Tỷ lệ chi trả (Payout Ratio) từ lịch sử sự kiện
    const cashDivEvents = (rawEvents || []).filter(
      (ev) => ev.eventCode === 'DIV' && typeof ev.valuePerShare === 'number' && ev.valuePerShare > 0
    );

    // Tính tổng cổ tức tiền mặt của 1-2 đợt gần nhất (khoảng 1 năm tài chính)
    const annualCashDividend = cashDivEvents
      .slice(0, 2)
      .reduce((sum, ev) => sum + (ev.valuePerShare || 0), 0);

    // Ước tính EPS thực tế gần nhất
    const latestPrice = latestItem?.marketCap && latestItem?.numberOfSharesMktCap
      ? Math.round(latestItem.marketCap / latestItem.numberOfSharesMktCap)
      : 0;
    const latestEps = typeof latestItem?.eps === 'number' && latestItem.eps > 0
      ? latestItem.eps
      : (latestPrice > 0 && typeof latestItem?.pe === 'number' && latestItem.pe > 0
          ? Math.round(latestPrice / latestItem.pe)
          : 2500);

    const payoutRatio =
      annualCashDividend > 0 && latestEps > 0
        ? Number(Math.min(1.0, Math.max(0.0, annualCashDividend / latestEps)).toFixed(2))
        : 0.0;

    return NextResponse.json({
      ticker: cleanTicker,
      validQuarters: recent20Q.length,
      latestQuarter: latestItem ? `Q${latestItem.quarter}/${latestItem.year}` : null,
      currentPrice: latestPrice || null,
      quarterlySeries: recent20Q.map((item) => ({
        period: `Q${item.quarter}/${String(item.year).slice(-2)}`,
        fullPeriod: `Q${item.quarter}/${item.year}`,
        pe: typeof item.pe === 'number' && item.pe > 0 && item.pe < 250 ? Number(item.pe.toFixed(1)) : null,
        pb: typeof item.pb === 'number' && item.pb > 0 && item.pb < 50 ? Number(item.pb.toFixed(2)) : null,
        roe: typeof item.roe === 'number' ? Number((item.roe * 100).toFixed(1)) : null,
        eps: typeof item.eps === 'number' ? item.eps : null,
        bvps: typeof item.bvps === 'number' ? item.bvps : null,
      })),
      pe: peStats,
      pb: pbStats,
      evEbitda: evStats,
      dividendPolicy: {
        annualCashDividend,
        payoutRatio,
        hasCashDividend: annualCashDividend > 0,
        recentEvents: (rawEvents || []).slice(0, 5).map((e) => ({
          title: e.eventTitleVi || e.eventNameVi,
          code: e.eventCode,
          valuePerShare: e.valuePerShare,
          ratio: e.exerciseRatio,
          date: e.recordDate || e.displayDate1,
        })),
      },
    });
  } catch (error: any) {
    console.error(`[Valuation Stats API] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tính thống kê định giá lịch sử' },
      { status: 500 }
    );
  }
}
