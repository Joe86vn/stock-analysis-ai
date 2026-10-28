import { NextRequest, NextResponse } from 'next/server';
import { syncWiDataEarnings } from '@/lib/widata-crawler-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/earnings/sync-widata
 * Kích hoạt đồng bộ kết quả kinh doanh quý mới nhất từ nguồn WiData
 */
export async function POST(request: NextRequest) {
  try {
    const result = await syncWiDataEarnings();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/earnings/sync-widata] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi khi đồng bộ dữ liệu từ WiData' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/earnings/sync-widata
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

