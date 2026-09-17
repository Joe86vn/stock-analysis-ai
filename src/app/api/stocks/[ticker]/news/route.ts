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
    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get('pageSize') || '30';
    const isMarketGeneral = searchParams.get('general') === 'true' || cleanTicker === 'ALL';

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    };

    const targetTicker = isMarketGeneral ? '' : cleanTicker;
    const url = `https://ai.vietcap.com.vn/api/v3/news_info?page=1&ticker=${targetTicker}&page_size=${pageSize}&language=vi`;

    const res = await fetch(url, {
      headers,
      next: { revalidate: 180 }, // Cache 3 phút
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Vietcap news API returned ${res.status}` }, { status: res.status });
    }

    const json = await res.json();
    const rawNews: any[] = json?.news_info || [];

    const newsList = rawNews.map((it: any) => ({
      id: it.id,
      ticker: it.ticker,
      industry: it.industry,
      title: it.news_title,
      summary: it.news_short_content,
      sourceLink: it.news_source_link,
      imageUrl: it.news_image_url,
      updateDate: it.update_date,
      sourceName: it.news_from_name || it.news_from,
      sentiment: it.sentiment, // 'Positive' | 'Negative' | 'Neutral'
      sentimentScore: it.score,
      slug: it.slug,
    }));

    return NextResponse.json({
      success: true,
      ticker: cleanTicker,
      count: newsList.length,
      data: newsList,
    });
  } catch (error: any) {
    console.error('[API News] Error fetching Vietcap AI news:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
