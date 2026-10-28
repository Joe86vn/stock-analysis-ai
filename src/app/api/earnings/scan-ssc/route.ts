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

    // Bước 1: Quét và số hóa báo cáo tài chính chính thức từ UBCKNN (SSC)
    const result = await runSscEarningsPipeline({
      maxPages,
      maxItemsToProcess: maxItems,
      fromDate,
      fullScanUntilFromDate: fullScan,
    });

    // Cập nhật trạng thái tiến trình sang bước đồng bộ WiData
    if (globalThis.__SSC_SCAN_PROGRESS__) {
      globalThis.__SSC_SCAN_PROGRESS__.currentStep = 'Đang đồng bộ dữ liệu bổ sung từ nguồn WiData...';
      globalThis.__SSC_SCAN_PROGRESS__.updatedAt = new Date().toISOString();
    }

    // Bước 2: Đồng bộ thêm từ nguồn WiData cho các mã SSC chưa có
    let widataResult: any = null;
    try {
      const { syncWiDataEarnings } = await import('@/lib/widata-crawler-service');
      widataResult = await syncWiDataEarnings();
      console.log(
        `[API /api/earnings/scan-ssc] WiData backup synced: added ${widataResult.addedCount}, updated ${widataResult.updatedCount}, preserved ${widataResult.skippedExistingSscCount} SSC records.`
      );
    } catch (wErr: any) {
      console.warn('[API /api/earnings/scan-ssc] WiData backup sync warning:', wErr.message);
    }

    const sscMsg = `SSC: Số hóa thành công ${result.processedCount} doanh nghiệp`;
    const widataMsg = widataResult
      ? ` • WiData: Bổ sung mới ${widataResult.addedCount} mã, giữ nguyên ${widataResult.skippedExistingSscCount} mã SSC`
      : '';
    const message = `Đã hoàn tất quét BCTC: ${sscMsg}${widataMsg}.`;

    return NextResponse.json({
      success: true,
      message,
      ssc: result,
      widata: widataResult,
      processedCount: result.processedCount + (widataResult?.addedCount || 0),
    });
  } catch (err: any) {
    console.error('[API /api/earnings/scan-ssc] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi khi quét báo cáo từ SSC' },
      { status: 500 }
    );
  }
}
