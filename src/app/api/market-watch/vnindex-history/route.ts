import { NextRequest, NextResponse } from 'next/server';
import { fetchVietcapGapChart } from '@/lib/vietcap-field-mapping';

const UPSTREAM_BASE = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/market-indices/history';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const index = searchParams.get('index') ?? 'VNINDEX';
  const page = searchParams.get('page') ?? '0';
  const size = searchParams.get('size') ?? '3000';

  try {
    // 1. Dùng chung 100% nguồn API Vietcap Gap Chart như biểu đồ nến cổ phiếu
    const countBackNum = Math.min(Math.max(10, parseInt(size, 10) || 3000), 3000);
    const gapBars = await fetchVietcapGapChart(index, { countBack: countBackNum, timeFrame: 'ONE_DAY' });

    if (gapBars && gapBars.length > 0) {
      const data = gapBars.map((b) => ({
        tradingDate: b.tradingDate,
        date: b.tradingDate,
        openIndex: b.openPrice,
        highestIndex: b.highestPrice,
        lowestIndex: b.lowestPrice,
        closeIndex: b.closePrice,
        indexValue: b.closePrice,
        totalMatchVolume: b.volume,
        volume: b.volume,
      }));

      return NextResponse.json({
        success: true,
        source: 'vietcap-gap-chart',
        count: data.length,
        data,
      });
    }

    // 2. Fallback sang Vietcap IQ Insight Service nếu gap-chart không có dữ liệu
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 10);

    const from = searchParams.get('fromDate') ?? fromDate.toISOString().slice(0, 10).replace(/-/g, '');
    const to = searchParams.get('toDate') ?? toDate.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${UPSTREAM_BASE}?index=${index}&fromDate=${from}&toDate=${to}&page=${page}&size=${size}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: 'fetch failed', message: err.message }, { status: 500 });
  }
}
