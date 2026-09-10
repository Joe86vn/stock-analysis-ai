import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleAIGroundedInsights } from '@/lib/crawl-report-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const searchParams = request.nextUrl.searchParams;
    const companyName = searchParams.get('companyName') || undefined;

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const insights = await fetchGoogleAIGroundedInsights(ticker, companyName);
    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error in google-insights route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google AI grounded insights' },
      { status: 500 }
    );
  }
}
