import { NextRequest, NextResponse } from 'next/server';
import { generateAnalysisReport } from '@/lib/ai-analyzer';

export async function POST(request: NextRequest) {
  try {
    const { ticker, marketData, uploadedFiles } = await request.json();
    
    // Call the server-side single-stage analysis
    const report = await generateAnalysisReport(ticker, marketData, uploadedFiles);
    
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating report on server:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
