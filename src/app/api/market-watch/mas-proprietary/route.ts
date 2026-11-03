import { NextRequest, NextResponse } from 'next/server';
import { masMcpClient } from '@/lib/mas-mcp-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const res = await masMcpClient.getProprietaryFlow({
      start_date: startDate,
      end_date: endDate,
    });

    return NextResponse.json({
      success: true,
      source: 'MASVN',
      data: res,
    });
  } catch (error: any) {
    console.error('[API /market-watch/mas-proprietary] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch proprietary flow from MASVN' },
      { status: 500 }
    );
  }
}

