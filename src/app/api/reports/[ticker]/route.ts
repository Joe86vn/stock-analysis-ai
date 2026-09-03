import { NextRequest, NextResponse } from 'next/server';
import { getServerReport, saveServerReport, deleteServerReport } from '@/lib/server-report-storage';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ ticker: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const data = await getServerReport(ticker);
    if (!data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticker: data.ticker,
      companyName: data.companyName,
      savedAt: data.savedAt,
      generationModel: data.generationModel,
      report: data.report,
    });
  } catch (error: any) {
    console.error('API /api/reports/[ticker] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const body = await request.json();
    const { report, model } = body;

    if (!report) {
      return NextResponse.json({ error: 'Report payload is required' }, { status: 400 });
    }

    const saved = await saveServerReport(ticker, report, model);

    return NextResponse.json({
      success: true,
      ticker: saved.ticker,
      companyName: saved.companyName,
      savedAt: saved.savedAt,
      generationModel: saved.generationModel,
    });
  } catch (error: any) {
    console.error('API /api/reports/[ticker] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save report' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const deleted = await deleteServerReport(ticker);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    console.error('API /api/reports/[ticker] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete report' },
      { status: 500 }
    );
  }
}
