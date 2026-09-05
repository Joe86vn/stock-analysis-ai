import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';

  const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Chưa cấu hình GEMINI_API_KEY trên server. Vui lòng thêm vào Netlify Environment Variables.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    apiKey,
    preferredModel,
  });
}
