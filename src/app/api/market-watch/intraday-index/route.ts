import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const MASTRADE_URL = 'https://mastrade.masvn.com/api/v1/market/minuteChart?symbol=VN-INDEX';
const VIETCAP_URL = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/VNINDEX/price-chart?lengthReport=1';

export async function GET() {
  try {
    const res = await fetch(MASTRADE_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 30 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.c) || Array.isArray(data))) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    console.error('MasTrade intraday fetch failed:', err);
  }

  // Fallback to Vietcap price-chart if MasTrade fails
  try {
    const vcRes = await fetch(VIETCAP_URL, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    });
    if (vcRes.ok) {
      const vcData = await vcRes.json();
      return NextResponse.json(vcData);
    }
  } catch (err) {
    console.error('Vietcap intraday fallback failed:', err);
  }

  return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
}

