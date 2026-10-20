import { NextRequest, NextResponse } from 'next/server';
import { getEarningsStore, rolloverToNewPeriod } from '@/lib/earnings-store';
import { enrichEarningsWithMarketMetrics } from '@/lib/earnings-market-enricher';
import { EarningsFilterParams, EarningsPeriod, ExchangeType, EarningsRecord } from '@/types/earnings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/earnings/latest
 * Lấy danh sách kết quả kinh doanh mới nhất kèm chỉ số kỹ thuật/thanh khoản và bộ lọc nâng cao
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') as EarningsPeriod | undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;
    const minRevenueYoY = searchParams.get('minRevenueYoY')
      ? parseFloat(searchParams.get('minRevenueYoY')!)
      : undefined;
    const minRevenueAbsolute = searchParams.get('minRevenueAbsolute')
      ? parseFloat(searchParams.get('minRevenueAbsolute')!)
      : undefined;
    const minPatYoY = searchParams.get('minPatYoY')
      ? parseFloat(searchParams.get('minPatYoY')!)
      : undefined;
    const minPatAbsolute = searchParams.get('minPatAbsolute')
      ? parseFloat(searchParams.get('minPatAbsolute')!)
      : undefined;
    const minAdtv20 = searchParams.get('minAdtv20')
      ? parseFloat(searchParams.get('minAdtv20')!)
      : undefined;
    const minRs = searchParams.get('minRs')
      ? parseFloat(searchParams.get('minRs')!)
      : undefined;
    const exchange = searchParams.get('exchange') as ExchangeType | undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') as any) || 'publishedAt';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

    const filter: EarningsFilterParams = {
      period,
      year,
      minRevenueYoY,
      minRevenueAbsolute,
      minPatYoY,
      minPatAbsolute,
      minAdtv20,
      minRs,
      exchange,
      search,
      sortBy,
      sortOrder,
    };

    const store = getEarningsStore();

    // Bổ sung dữ liệu thị trường (RS Rating, GTGD 20 ngày, giá hiện tại)
    const enrichedRecords = await enrichEarningsWithMarketMetrics(store.records);

    let list = [...enrichedRecords];

    // Lọc theo kỳ
    if (filter.period) {
      list = list.filter((r) => r.period === filter.period);
    }

    // Lọc theo năm
    if (filter.year) {
      list = list.filter((r) => r.year === filter.year);
    }

    // Lọc theo sàn
    if (filter.exchange && filter.exchange !== ('ALL' as any)) {
      list = list.filter((r) => r.exchange === filter.exchange);
    }

    // Lọc doanh thu tuyệt đối tối thiểu (VNĐ)
    if (typeof filter.minRevenueAbsolute === 'number') {
      list = list.filter((r) => r.revenueCurrent >= filter.minRevenueAbsolute!);
    }

    // Lọc tăng trưởng doanh thu tối thiểu
    if (typeof filter.minRevenueYoY === 'number') {
      list = list.filter((r) => r.revenueYoYPercent !== null && r.revenueYoYPercent >= filter.minRevenueYoY!);
    }

    // Lọc tăng trưởng LNST tối thiểu
    if (typeof filter.minPatYoY === 'number') {
      list = list.filter((r) => r.patYoYPercent !== null && r.patYoYPercent >= filter.minPatYoY!);
    }

    // Lọc LNST tuyệt đối tối thiểu (VNĐ)
    if (typeof filter.minPatAbsolute === 'number') {
      list = list.filter((r) => r.patCurrent >= filter.minPatAbsolute!);
    }

    // Lọc GTGD bình quân 20 phiên tối thiểu (Tỷ VNĐ)
    if (typeof filter.minAdtv20 === 'number') {
      list = list.filter((r) => (r.adtv20Billion ?? 0) >= filter.minAdtv20!);
    }

    // Lọc sức mạnh giá RS Rating tối thiểu
    if (typeof filter.minRs === 'number') {
      list = list.filter((r) => (r.rsRating ?? 0) >= filter.minRs!);
    }

    // Tìm kiếm theo mã hoặc tên công ty
    if (filter.search) {
      const q = filter.search.trim().toLowerCase();
      list = list.filter(
        (r) => r.ticker.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q)
      );
    }

    // Sắp xếp
    list.sort((a, b) => {
      let valA: any = a[sortBy as keyof EarningsRecord];
      let valB: any = b[sortBy as keyof EarningsRecord];

      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      activePeriod: store.activePeriod,
      updatedAt: store.updatedAt,
      total: list.length,
      records: list,
    });
  } catch (err: any) {
    console.error('[API /api/earnings/latest] Error:', err.message);
    return NextResponse.json(
      { success: false, error: 'Không thể truy vấn bảng kết quả kinh doanh' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/earnings/latest
 * Hỗ trợ rollover sang kỳ báo cáo mới (ví dụ từ Q3 sang Q4)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const newPeriod = body.newPeriod?.trim();

    if (!newPeriod) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp mã kỳ báo cáo mới (ví dụ: Q4/2026)' },
        { status: 400 }
      );
    }

    const result = rolloverToNewPeriod(newPeriod);

    return NextResponse.json({
      success: true,
      message: `Đã đóng gói kỳ ${result.archivedPeriod} (${result.archivedCount} bản ghi) và làm mới bảng cho kỳ ${result.newActivePeriod}`,
      ...result,
    });
  } catch (err: any) {
    console.error('[API /api/earnings/latest] Rollover error:', err.message);
    return NextResponse.json(
      { success: false, error: 'Không thể thực hiện rollover kỳ báo cáo' },
      { status: 500 }
    );
  }
}
