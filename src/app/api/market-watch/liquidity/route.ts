import { NextResponse } from 'next/server';
import { fetchVietcapGapChart } from '@/lib/vietcap-field-mapping';

export async function GET() {
  try {
    const bars = await fetchVietcapGapChart('VNINDEX', { countBack: 60, timeFrame: 'ONE_DAY' });
    if (!bars || bars.length === 0) {
      return NextResponse.json({ error: 'No data' }, { status: 404 });
    }

    const data = bars.map((b) => ({
      date: b.tradingDate,
      time: b.tradingDate,
      totalValue: b.closePrice * b.volume,
      matchValue: b.closePrice * b.volume,
      value: b.closePrice * b.volume,
    }));

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'fetch failed' }, { status: 500 });
  }
}
