import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
    }

    const cleanTicker = ticker.trim().toUpperCase();
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    };

    // Lấy từ 2018 đến 2 năm sau (để bắt cả sự kiện cổ tức tương lai đã công bố)
    const url = `https://iq.vietcap.com.vn/api/iq-insight-service/v1/events?ticker=${cleanTicker}&fromDate=20180101&toDate=20281231&eventCode=DIV,ISS&page=0&size=100`;

    const res = await fetch(url, {
      headers,
      next: { revalidate: 300 }, // Cache 5 phút
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Vietcap events API returned ${res.status}` }, { status: res.status });
    }

    const json = await res.json();
    const rawEvents: any[] = json?.data?.content || json?.data || [];

    // Chuẩn hóa và sắp xếp theo ngày GDKHQ mới nhất lên đầu
    const events = rawEvents.map((it: any) => ({
      id: it.id,
      ticker: it.ticker || cleanTicker,
      eventNameVi: it.eventNameVi || 'Cổ tức / Sự kiện',
      eventNameEn: it.eventNameEn,
      eventCode: it.eventCode,
      eventTitleVi: it.eventTitleVi || it.eventNameVi,
      eventTitleEn: it.eventTitleEn,
      exrightDate: it.exrightDate,
      recordDate: it.recordDate,
      publicDate: it.publicDate,
      displayDate1: it.displayDate1,
      displayDate2: it.displayDate2,
      exerciseRatio: it.exerciseRatio,
      category: it.category,
      isUpcoming: it.exrightDate ? new Date(it.exrightDate).getTime() > Date.now() : false,
    }));

    events.sort((a, b) => {
      const dateA = new Date(a.exrightDate || a.publicDate || 0).getTime();
      const dateB = new Date(b.exrightDate || b.publicDate || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      ticker: cleanTicker,
      count: events.length,
      data: events,
    });
  } catch (error: any) {
    console.error('[API Events] Error fetching Vietcap events:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
