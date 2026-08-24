import { NextRequest, NextResponse } from 'next/server';
import { fetchFullSimplizeData } from '@/lib/simplize-field-mapping';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
    }

    const cleanTicker = ticker.trim().toUpperCase();
    const quarters = await fetchFullSimplizeData(cleanTicker, 12);

    return NextResponse.json({
      ticker: cleanTicker,
      count: quarters.length,
      quarters,
    });
  } catch (error: any) {
    console.error('Error fetching Simplize financial data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
