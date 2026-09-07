import { NextRequest, NextResponse } from 'next/server';
import { generateAnalysisReport } from '@/lib/ai-analyzer';
import { getFullReportCache, putFullReportCache } from '@/lib/r2-storage';

export const maxDuration = 300; // Serverless Function timeout (300 seconds)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { ticker, marketData, uploadedFiles, preferredModel, forceRefresh } = await request.json();

    // 1. Nếu không yêu cầu ép phân tích lại (forceRefresh = false) và không có file mới đính kèm, kiểm tra Cache
    if (!forceRefresh && (!uploadedFiles || uploadedFiles.length === 0)) {
      try {
        const cached = await getFullReportCache(ticker);
        if (cached) {
          console.log(`[API Generate] Returning cached report for ${ticker} (Cached at: ${cached.cachedAt})`);
          return NextResponse.json(cached);
        }
      } catch (cacheErr) {
        console.warn(`[API Generate] Error checking cache for ${ticker}:`, cacheErr);
      }
    }

    // 2. Gọi AI sinh báo cáo mới
    console.log(`[API Generate] Generating fresh analysis report for ${ticker} (forceRefresh: ${Boolean(forceRefresh)})...`);
    const report = await generateAnalysisReport(ticker, marketData, uploadedFiles, preferredModel);

    // 3. Tự động lưu báo cáo mới vào Cache (Local + R2)
    try {
      await putFullReportCache(ticker, report);
      report.cachedAt = new Date().toISOString();
      report.isFromCache = false;
    } catch (saveCacheErr) {
      console.warn(`[API Generate] Failed to save full report cache for ${ticker}:`, saveCacheErr);
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating report on server:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
