import { NextRequest, NextResponse } from 'next/server';
import { masMcpClient } from '@/lib/mas-mcp-client';

const VIETNAM_BANKS = new Set([
  'VCB', 'BID', 'CTG', 'TCB', 'MBB', 'VPB', 'ACB', 'HDB',
  'VIB', 'SHB', 'LPB', 'SSB', 'MSB', 'OCB', 'TPB', 'EIB',
  'STB', 'NAB', 'BAB', 'BVB', 'ABB', 'NVB', 'KLB', 'PGB',
  'SGB', 'VAB'
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const cleanTicker = (ticker || '').trim().toUpperCase();

    if (!cleanTicker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    if (!VIETNAM_BANKS.has(cleanTicker)) {
      return NextResponse.json({
        ticker: cleanTicker,
        isBank: false,
        message: `${cleanTicker} không thuộc nhóm cổ phiếu Ngân hàng`,
      });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultYear = now.getFullYear();
    const defaultTermCode = 'Q2'; // Quý đóng gần nhất đã có BCTC đầy đủ

    const year = parseInt(searchParams.get('year') || String(defaultYear), 10);
    const termCode = searchParams.get('termCode') || defaultTermCode;

    const res = await masMcpClient.callTool('get_banking_financial_indicator', {
      symbol: cleanTicker,
      type: 'ALL',
      termCode,
      year,
    });

    return NextResponse.json({
      ticker: cleanTicker,
      isBank: true,
      year,
      termCode,
      source: 'MASVN',
      data: res,
    });
  } catch (error: any) {
    console.error(`[API /stocks/[ticker]/banking-metrics] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch banking metrics' },
      { status: 500 }
    );
  }
}
