import { NextRequest, NextResponse } from 'next/server';
import { runSscEarningsPipeline } from '@/lib/ssc-crawler-service';
import { cleanInvalidEarningsRecords, calculateCurrentReportPeriod } from '@/lib/earnings-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Hỗ trợ chạy tối đa 120s trên server

/**
 * POST /api/earnings/scan-ssc
 * Kích hoạt quét thủ công từ giao diện người dùng
 */
export async function POST(request: NextRequest) {
  try {
    const currentPeriod = calculateCurrentReportPeriod();
    const body = await request.json().catch(() => ({}));
    const maxPages = Number(body.pages) || 20;
    const maxItems = Number(body.limit) || 100;
    const fromDate = body.fromDate || currentPeriod.fromDate;
    const fullScan = Boolean(body.fullScan);

    console.log(`[API /api/earnings/scan-ssc] Manual trigger: period=${currentPeriod.label}, pages=${maxPages}, limit=${maxItems}, fromDate=${fromDate}, fullScan=${fullScan}`);

    // Dọn dẹp dữ liệu rác nếu có
    cleanInvalidEarningsRecords();

    const result = await runSscEarningsPipeline({
      maxPages,
      maxItemsToProcess: maxItems,
      fromDate,
      fullScanUntilFromDate: fullScan,
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
