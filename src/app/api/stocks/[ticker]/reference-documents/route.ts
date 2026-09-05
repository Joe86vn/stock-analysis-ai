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

    // 1. Thử gọi Python Worker (Render) nếu đã cấu hình
    if (isWorkerConfigured()) {
      try {
        const workerRes = await fetchWorker(
          `/crawl/${ticker.toUpperCase()}?exchange=${exchange}`,
          { cache: 'no-store' },
          15000 // 15s timeout
        );

        if (workerRes.ok) {
          const workerData = await workerRes.json();
          return NextResponse.json(workerData);
        } else {
          console.warn(`[Worker] /crawl returned ${workerRes.status}, falling back to local service`);
        }
      } catch (workerErr) {
        console.warn('[Worker] Crawl request failed or timed out, falling back to local service:', workerErr);
      }
    }

    // 2. Fallback: Dùng local service crawl nếu Worker chưa bật hoặc đang cold start
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
