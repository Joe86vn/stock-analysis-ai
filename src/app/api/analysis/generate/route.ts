import { NextRequest, NextResponse } from 'next/server';
import { generateAnalysisReport } from '@/lib/ai-analyzer';

export const maxDuration = 300; // Serverless Function timeout (300 seconds for Gemini 3.8 Flash)
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { ticker, marketData, uploadedFiles, preferredModel } = await request.json();
    
    // Call the server-side single-stage analysis
    const report = await generateAnalysisReport(ticker, marketData, uploadedFiles, preferredModel);
    
    return NextResponse.json(report, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error generating report on server:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500, headers: corsHeaders }
    );
  }
}
