import { NextRequest, NextResponse } from 'next/server';
import { queryEarningsRecords, rolloverToNewPeriod } from '@/lib/earnings-store';
import { EarningsFilterParams, EarningsPeriod, ExchangeType } from '@/types/earnings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/earnings/latest
 * Lấy danh sách kết quả kinh doanh mới nhất kèm bộ lọc
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') as EarningsPeriod | undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;
    const minRevenueYoY = searchParams.get('minRevenueYoY')
      ? parseFloat(searchParams.get('minRevenueYoY')!)
      : undefined;
    const minPatYoY = searchParams.get('minPatYoY')
      ? parseFloat(searchParams.get('minPatYoY')!)
      : undefined;
    const exchange = searchParams.get('exchange') as ExchangeType | undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') as any) || 'publishedAt';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

    const filter: EarningsFilterParams = {
      period,
      year,
      minRevenueYoY,
      minPatYoY,
      exchange,
      search,
      sortBy,
      sortOrder,
    };

    const result = queryEarningsRecords(filter);

    return NextResponse.json({
      success: true,
      activePeriod: result.activePeriod,
      updatedAt: result.updatedAt,
      total: result.total,
      records: result.records,
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
        { success: false, error: 'Thiếu tham số newPeriod (ví dụ: Q4/2026)' },
        { status: 400 }
      );
    }

    const rolloverResult = rolloverToNewPeriod(newPeriod);
    return NextResponse.json({
      success: true,
      message: `Đã lưu trữ kỳ ${rolloverResult.archivedPeriod} (${rolloverResult.archivedCount} bản ghi) và làm mới bảng cho kỳ ${newPeriod}`,
      ...rolloverResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
