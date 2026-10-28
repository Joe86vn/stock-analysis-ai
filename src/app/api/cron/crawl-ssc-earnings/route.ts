import { NextRequest, NextResponse } from 'next/server';
import { runSscEarningsPipeline } from '@/lib/ssc-crawler-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Hỗ trợ chạy tối đa 120s

function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Nếu chưa cấu hình secret trong development, cho phép chạy
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.replace(/^Bearer\s+/i, '').trim() === secret) {
    return true;
  }

  const urlSecret = new URL(request.url).searchParams.get('secret');
  if (urlSecret && urlSecret.trim() === secret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  return handleCronJob(request);
}

export async function POST(request: NextRequest) {
  return handleCronJob(request);
}

async function handleCronJob(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[CRON SSC] Scheduled task started at:', new Date().toISOString());

  try {
    const { calculateCurrentReportPeriod } = await import('@/lib/earnings-store');
    const currentPeriod = calculateCurrentReportPeriod();
    // Bước 1: Quét các báo cáo mới từ Cổng UBCKNN (SSC)
    const result = await runSscEarningsPipeline({
      maxPages: 15, // Tự động dừng theo mốc ngày nộp báo cáo (quét nốt hết ngày gặp mã cũ rồi dừng)
      maxItemsToProcess: 50,
      fromDate: currentPeriod.fromDate,
    });

    // Bước 2: Đồng bộ bổ sung từ nguồn WiData cho các mã SSC chưa kịp có
    let widataResult: any = null;
    try {
      const { syncWiDataEarnings } = await import('@/lib/widata-crawler-service');
      widataResult = await syncWiDataEarnings();
      console.log(
        `[CRON] WiData sync completed: added ${widataResult.addedCount}, updated ${widataResult.updatedCount}, preserved ${widataResult.skippedExistingSscCount} SSC records.`
      );
    } catch (wErr: any) {
      console.warn('[CRON] WiData backup sync warning:', wErr.message);
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[CRON] Finished in ${durationSeconds}s. SSC Processed: ${result.processedCount}, WiData Added: ${widataResult?.addedCount || 0}`
    );

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      durationSeconds: `${durationSeconds}s`,
      ssc: result,
      widata: widataResult,
      totalProcessed: result.processedCount + (widataResult?.addedCount || 0),
    });
  } catch (err: any) {
    console.error('[CRON SSC] Execution error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message, executedAt: new Date().toISOString() },
      { status: 500 }
    );
  }
}
