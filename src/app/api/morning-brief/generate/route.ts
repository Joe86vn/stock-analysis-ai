import { NextRequest, NextResponse } from 'next/server';
import { createFullMorningBrief, getDefaultMorningBrief } from '@/lib/morning-brief-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const brief = await createFullMorningBrief(forceRefresh);
    return NextResponse.json({ success: true, data: brief });
  } catch (error) {
    console.error('[API MorningBrief] GET error:', error);
    return NextResponse.json(
      { success: true, data: getDefaultMorningBrief(), isFallback: true },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const forceRefresh = body?.forceRefresh ?? true;

    const brief = await createFullMorningBrief(forceRefresh);
    return NextResponse.json({ success: true, data: brief });
  } catch (error) {
    console.error('[API MorningBrief] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Không thể tạo bản tin sáng từ AI, đang dùng bản tin dự phòng',
        data: getDefaultMorningBrief(),
      },
      { status: 200 }
    );
  }
}

