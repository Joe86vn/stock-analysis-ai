import { NextRequest, NextResponse } from 'next/server';
import { getQualitativeReport } from '@/lib/r2-storage';
import { QualitativeStatusResponse } from '@/types/qualitative';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker')?.trim().toUpperCase();

    if (!ticker) {
      return NextResponse.json({ error: 'Mã cổ phiếu (ticker) là bắt buộc' }, { status: 400 });
    }

    const data = await getQualitativeReport(ticker);

    if (!data) {
      const emptyResponse: QualitativeStatusResponse = {
        hasData: false,
        ticker,
      };
      return NextResponse.json(emptyResponse);
    }

    const response: QualitativeStatusResponse = {
      hasData: true,
      ticker,
      analyzedAt: data.analyzedAt,
      industryModel: data.industryModel,
      documentSources: data.documentSources,
      totalProjects: data.sectionC_GrowthProjectsAndExpansion?.length || 0,
      totalBrokerReports: data.sectionE_BrokerConsensusAndTheses?.reportsAnalyzed?.length || 0,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API Qualitative Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi kiểm tra trạng thái dữ liệu định tính' },
      { status: 500 }
    );
  }
}
