import { NextResponse } from 'next/server';
import { listAllServerReports } from '@/lib/server-report-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reports = await listAllServerReports();
    return NextResponse.json({
      success: true,
      total: reports.length,
      reports,
    });
  } catch (error: any) {
    console.error('API /api/reports GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list reports' },
      { status: 500 }
    );
  }
}
