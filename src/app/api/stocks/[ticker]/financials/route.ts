import { NextRequest, NextResponse } from 'next/server';
import { parseSimplizeItem, ParsedSimplizeQuarter } from '@/lib/simplize-field-mapping';

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
    const simplizeUrl = `https://api2.simplize.vn/api/company/fi/ratio/${cleanTicker}?period=Q&size=12`;

    const res = await fetch(simplizeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Simplize API responded with status ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    if (!json || json.status !== 200 || !json.data || !Array.isArray(json.data.items)) {
      return NextResponse.json(
        { error: 'Invalid response structure from Simplize API' },
        { status: 500 }
      );
    }

    // Process & transform raw Simplize items into clean quarterly metrics
    const rawItems = json.data.items;
    const quarters: ParsedSimplizeQuarter[] = rawItems.map(parseSimplizeItem);

    // Sort chronologically (oldest to newest)
    quarters.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter - b.quarter;
    });

    return NextResponse.json({
      ticker: cleanTicker,
      count: quarters.length,
      quarters,
    });
  } catch (error: any) {
    console.error('Error fetching Simplize financial data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
