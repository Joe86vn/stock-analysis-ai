import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_BASE = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/market-indices/history';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const index = searchParams.get('index') ?? 'VNINDEX';
  const page = searchParams.get('page') ?? '0';
  const size = searchParams.get('size') ?? '3000';

  // Mặc định: 10 năm gần nhất để đồng bộ 2.000+ nến lịch sử với biểu đồ cổ phiếu
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 10);

  const from = searchParams.get('fromDate') ?? fromDate.toISOString().slice(0, 10).replace(/-/g, '');
  const to = searchParams.get('toDate') ?? toDate.toISOString().slice(0, 10).replace(/-/g, '');

  const url = `${UPSTREAM_BASE}?index=${index}&fromDate=${from}&toDate=${to}&page=${page}&size=${size}`;

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
