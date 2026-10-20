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
    const result = await runSscEarningsPipeline({
      maxPages: 3, // Quét 3 trang gần nhất trong mỗi lần chạy định kỳ (8h sáng và 17h chiều)
      maxItemsToProcess: 15,
    });

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CRON SSC] Finished in ${durationSeconds}s. Processed: ${result.processedCount}, Failed: ${result.failedCount}`);

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      durationSeconds: `${durationSeconds}s`,
      ...result,
    });
  } catch (err: any) {
    console.error('[CRON SSC] Execution error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message, executedAt: new Date().toISOString() },
      { status: 500 }
    );
  }
}
