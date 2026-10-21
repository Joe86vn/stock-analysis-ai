import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/earnings/scan-status
 * Lấy trạng thái tiến độ quét SSC theo thời gian thực
 */
export async function GET() {
  const progress = globalThis.__SSC_SCAN_PROGRESS__ || {
    isScanning: false,
    currentStep: 'Hệ thống sẵn sàng',
    page: 1,
    totalScanned: 0,
    foundNewCount: 0,
    processedCount: 0,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    progress,
  });
}
