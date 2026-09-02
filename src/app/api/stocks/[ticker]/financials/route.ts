import { NextRequest, NextResponse } from 'next/server';
import { fetchFullVietcapData } from '@/lib/vietcap-field-mapping';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const maxQuartersParam = searchParams.get('maxQuarters') || searchParams.get('size');
    const maxQuarters = maxQuartersParam ? parseInt(maxQuartersParam, 10) : undefined;

    const cleanTicker = ticker.trim().toUpperCase();
    const quarters = await fetchFullVietcapData(cleanTicker, { maxQuarters });

    return NextResponse.json({
      ticker: cleanTicker,
      source: 'VIETCAP_IQ',
      count: quarters.length,
      quarters,
    });
  } catch (error: any) {
    console.error('Error fetching Vietcap financial data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Vietcap financial data' },
      { status: 500 }
    );
  }
}
