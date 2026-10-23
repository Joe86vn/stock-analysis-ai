import { NextResponse } from 'next/server';

export async function GET() {
    const isConfigured = Boolean(
        (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
        (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)
    );

    return NextResponse.json({
        configured: isConfigured,
    });
}
