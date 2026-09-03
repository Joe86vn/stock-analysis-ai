import { NextRequest, NextResponse } from 'next/server';
import { executeVietcapScreener, ScreenerFilterCriteria } from '@/lib/vietcap-screener-service';
import { scoreDynamicStockList } from '@/lib/filter-rs-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // Cho phép lên tới 180s để quét toàn thị trường & chấm điểm toàn bộ danh sách Tầng 1

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const criteria: ScreenerFilterCriteria = {
      exchanges: body.exchanges || ['HSX', 'HNX', 'UPCOM'],
      rsMin: typeof body.rsMin === 'number' ? body.rsMin : 70,
      adtvMinBillion: typeof body.adtvMinBillion === 'number' ? body.adtvMinBillion : 5,
      epsGrowthMinYoY: typeof body.epsGrowthMinYoY === 'number' ? body.epsGrowthMinYoY : undefined,
      revenueGrowthMinYoY: typeof body.revenueGrowthMinYoY === 'number' ? body.revenueGrowthMinYoY : undefined,
      rsiMin: typeof body.rsiMin === 'number' ? body.rsiMin : undefined,
      rsiMax: typeof body.rsiMax === 'number' ? body.rsiMax : undefined,
      priceAboveEma: body.priceAboveEma || undefined,
    };

    // TẦNG 1: Sàng lọc nhanh qua Vietcap Screener API
    const tier1Start = Date.now();
    const matchedStocks = await executeVietcapScreener(criteria);
    const tier1DurationMs = Date.now() - tier1Start;

    if (!matchedStocks || matchedStocks.length === 0) {
      return NextResponse.json({
        success: true,
        criteria,
        meta: {
          totalMarketScanned: '1.600+ Cổ phiếu (3 sàn)',
          matchedCount: 0,
          scoredCount: 0,
          tier1DurationMs,
          totalDurationMs: Date.now() - startTime,
        },
        data: [],
      });
    }

    // TẦNG 2: Chấm điểm 3 trụ cột chuyên sâu ValueX (150đ) & Bóc tách LNST cốt lõi cho TOÀN BỘ danh sách khớp Tầng 1
    const candidateList = matchedStocks;
    const tier2Start = Date.now();
    const rankedData = await scoreDynamicStockList(candidateList);
    const tier2DurationMs = Date.now() - tier2Start;

    return NextResponse.json({
      success: true,
      criteria,
      meta: {
        totalMarketScanned: '1.600+ Cổ phiếu (3 sàn)',
        matchedCount: matchedStocks.length,
        scoredCount: rankedData.length,
        tier1DurationMs,
        tier2DurationMs,
        totalDurationMs: Date.now() - startTime,
      },
      data: rankedData,
    });
  } catch (error: any) {
    console.error('[API /api/screening/live] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Lỗi khi thực thi bộ lọc 2 tầng',
      },
      { status: 500 }
    );
  }
}
