import { NextRequest, NextResponse } from 'next/server';
import { getReferenceDocumentCatalog } from '@/lib/crawl-report-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const searchParams = request.nextUrl.searchParams;
    const exchange = (searchParams.get('exchange') || 'HOSE').toUpperCase() as
      | 'HOSE'
      | 'HNX'
      | 'UPCOM';

    const catalog = await getReferenceDocumentCatalog(ticker, exchange);
    return NextResponse.json(catalog);
  } catch (error) {
    console.error('Error fetching reference documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reference document catalog' },
      { status: 500 }
    );
  }
}
