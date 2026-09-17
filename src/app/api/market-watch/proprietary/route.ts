import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_BASE = 'https://mastrade.masvn.com/api/v1/proprietaryHistory';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Default: last 30 trading days
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 45); // 45 calendar days ≈ 30 trading days

  const from = searchParams.get('from') ?? fromDate.toISOString().slice(0, 10).replace(/-/g, '');
  const to = searchParams.get('to') ?? toDate.toISOString().slice(0, 10).replace(/-/g, '');

  const url = `${UPSTREAM_BASE}?from=${from}&to=${to}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
