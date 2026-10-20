import { NextRequest, NextResponse } from 'next/server';
import { runSscEarningsPipeline } from '@/lib/ssc-crawler-service';
import { cleanInvalidEarningsRecords } from '@/lib/earnings-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Hỗ trợ chạy tối đa 120s trên server

/**
 * POST /api/earnings/scan-ssc
 * Kích hoạt quét thủ công từ giao diện người dùng
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxPages = Number(body.pages) || 3;
    const maxItems = Number(body.limit) || 15;

    console.log(`[API /api/earnings/scan-ssc] Manual trigger: pages=${maxPages}, limit=${maxItems}`);

    // Dọn dẹp dữ liệu rác nếu có
    cleanInvalidEarningsRecords();

    const result = await runSscEarningsPipeline({
      maxPages,
      maxItemsToProcess: maxItems,
    });

    return NextResponse.json({
      success: true,
      message: `Đã quét xong: Phát hiện ${result.newReportsFoundCount} báo cáo hợp lệ mới, số hóa thành công ${result.processedCount} doanh nghiệp niêm yết.`,
      ...result,
    });
  } catch (err: any) {
    console.error('[API /api/earnings/scan-ssc] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi khi quét báo cáo từ SSC' },
      { status: 500 }
    );
  }
}
