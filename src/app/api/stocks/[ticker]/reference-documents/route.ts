import { NextRequest, NextResponse } from 'next/server';
import { getReferenceDocumentCatalog } from '@/lib/crawl-report-service';
import { fetchWorker, isWorkerConfigured } from '@/lib/worker-client';

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

    // Ưu tiên chạy local crawl siêu tốc (< 100ms) từ CafeF, Vietstock, Simplize
    // Đảm bảo giao diện phản hồi tức thì, không bao giờ bị nghẽn 15s bởi Render Cold Start
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
