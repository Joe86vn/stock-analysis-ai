import { NextRequest, NextResponse } from 'next/server';
import { compositeDataProvider, MarketDataSource } from '@/lib/data-providers';

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
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true';
    
    // Nguồn dữ liệu: 'auto' | 'vietcap' | 'mas'
    const sourceParam = (searchParams.get('source') || 'auto').toLowerCase() as MarketDataSource;

    const cleanTicker = ticker.trim().toUpperCase();
    const result = await compositeDataProvider.getFinancials(cleanTicker, {
      maxQuarters,
      forceRefresh,
      source: sourceParam,
    });

    return NextResponse.json({
      ticker: cleanTicker,
      source: result.sourceUsed,
      sourceUsed: result.sourceUsed,
      isFallback: result.isFallback,
      latencyMs: result.latencyMs,
      count: result.data.length,
      quarters: result.data,
    });
  } catch (error: any) {
    console.error('Error fetching financial data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
