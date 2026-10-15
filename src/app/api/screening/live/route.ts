import { NextRequest, NextResponse } from 'next/server';
import { executeVietcapScreener, ScreenerFilterCriteria } from '@/lib/vietcap-screener-service';
import { scoreDynamicStockList, getPrecomputedRankings, savePrecomputedRankings } from '@/lib/filter-rs-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // Cho phép lên tới 180s để quét toàn thị trường & chấm điểm toàn bộ danh sách Tầng 1

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const forceRefresh = body.forceRefresh === true;

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

    // ========================================================================
    // CẢI TIẾN 1 & 4: PHỤC VỤ SIÊU TỐC TỪ PRECOMPUTED IN-MEMORY RAM CACHE VPS (< 5ms)
    // ========================================================================
    if (!forceRefresh) {
      const precomputed = await getPrecomputedRankings(24);
      if (precomputed && precomputed.length > 0) {
        let filtered = [...precomputed];

        // 1. Sàn
        if (criteria.exchanges && criteria.exchanges.length > 0) {
          const exSet = new Set(criteria.exchanges.map((e) => e.toUpperCase()));
          filtered = filtered.filter((item) => exSet.has(item.exchange.toUpperCase()));
        }

        // 2. RS Rating tối thiểu
        if (typeof criteria.rsMin === 'number' && criteria.rsMin > 0) {
          filtered = filtered.filter((item) => (item.rsRating ?? 0) >= criteria.rsMin!);
        }

        // 3. Thanh khoản ADTV 20 tối thiểu (Tỷ)
        if (typeof criteria.adtvMinBillion === 'number' && criteria.adtvMinBillion > 0) {
          filtered = filtered.filter((item) => (item.adtv20Billion ?? 0) >= criteria.adtvMinBillion!);
        }

        // 4. Tăng trưởng EPS cốt lõi tối thiểu (%)
        if (typeof criteria.epsGrowthMinYoY === 'number' && criteria.epsGrowthMinYoY > 0) {
          filtered = filtered.filter((item) => (item.coreEpsGrowthYoY ?? 0) >= criteria.epsGrowthMinYoY!);
        }

        // 5. Tăng trưởng Doanh thu tối thiểu (%)
        if (typeof criteria.revenueGrowthMinYoY === 'number' && criteria.revenueGrowthMinYoY > 0) {
          filtered = filtered.filter((item) => (item.q0RevenueGrowthYoY ?? 0) >= criteria.revenueGrowthMinYoY!);
        }

        // Cập nhật lại STT thứ hạng sau khi lọc
        filtered.forEach((item, index) => {
          item.stt = index + 1;
        });

        return NextResponse.json({
          success: true,
          criteria,
          meta: {
            source: 'VPS_PRECOMPUTED_RAM_SSD',
            isPrecomputed: true,
            totalMarketScanned: `Toàn bộ ${precomputed.length} cổ phiếu Universe ValueX`,
            matchedCount: filtered.length,
            scoredCount: filtered.length,
            tier1DurationMs: 0,
            tier2DurationMs: 0,
            totalDurationMs: Date.now() - startTime,
          },
          data: filtered,
        });
      }
    }

    // ========================================================================
    // NẾU FORCE REFRESH HOẶC CHƯA CÓ CACHE: QUÉT TRỰC TIẾP TỪNG TẦNG
    // ========================================================================
    // TẦNG 1: Sàng lọc nhanh qua Vietcap Screener API
    const tier1Start = Date.now();
    const matchedStocks = await executeVietcapScreener(criteria);
    const tier1DurationMs = Date.now() - tier1Start;

    if (!matchedStocks || matchedStocks.length === 0) {
      return NextResponse.json({
        success: true,
        criteria,
        meta: {
          source: 'VIETCAP_LIVE_SCREENING',
          isPrecomputed: false,
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

    // Lưu vào cache nếu danh sách đủ lớn
    if (rankedData.length >= 30) {
      await savePrecomputedRankings(rankedData).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      criteria,
      meta: {
        source: 'VIETCAP_LIVE_SCREENING',
        isPrecomputed: false,
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

