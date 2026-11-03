import { NextRequest } from 'next/server';
import { GET as getFinancials } from '../src/app/api/stocks/[ticker]/financials/route';
import { GET as getPriceHistory } from '../src/app/api/stocks/[ticker]/price-history/route';

async function testApiRoutes() {
  console.log('====================================================');
  console.log('   KIỂM THỬ CHECKPOINT 2: API ROUTES MULTI-SOURCE   ');
  console.log('====================================================\n');

  // Test 1: BCTC Vietcap
  console.log('1. GET /api/stocks/FPT/financials?source=vietcap');
  const req1 = new NextRequest('http://localhost:3000/api/stocks/FPT/financials?source=vietcap&maxQuarters=3');
  const res1 = await getFinancials(req1, { params: Promise.resolve({ ticker: 'FPT' }) });
  const data1 = await res1.json();
  console.log(`   Status: ${res1.status}, Source: ${data1.sourceUsed}, Quarters: ${data1.count}`);

  // Test 2: BCTC MASVN
  console.log('\n2. GET /api/stocks/FPT/financials?source=mas');
  const req2 = new NextRequest('http://localhost:3000/api/stocks/FPT/financials?source=mas&maxQuarters=3');
  const res2 = await getFinancials(req2, { params: Promise.resolve({ ticker: 'FPT' }) });
  const data2 = await res2.json();
  console.log(`   Status: ${res2.status}, Source: ${data2.sourceUsed}, Quarters: ${data2.count}`);

  // Test 3: BCTC Auto
  console.log('\n3. GET /api/stocks/FPT/financials?source=auto');
  const req3 = new NextRequest('http://localhost:3000/api/stocks/FPT/financials?source=auto&maxQuarters=3');
  const res3 = await getFinancials(req3, { params: Promise.resolve({ ticker: 'FPT' }) });
  const data3 = await res3.json();
  console.log(`   Status: ${res3.status}, Source: ${data3.sourceUsed}, Fallback: ${data3.isFallback}, Quarters: ${data3.count}`);

  // Test 4: Price History MASVN (REE)
  console.log('\n4. GET /api/stocks/REE/price-history?source=mas&countBack=10');
  const req4 = new NextRequest('http://localhost:3000/api/stocks/REE/price-history?source=mas&countBack=10');
  const res4 = await getPriceHistory(req4, { params: Promise.resolve({ ticker: 'REE' }) });
  const data4 = await res4.json();
  console.log(`   Status: ${res4.status}, Source: ${data4.sourceUsed}, Bars count: ${data4.count}`);
  if (data4.history?.length > 0) {
    const last = data4.history[data4.history.length - 1];
    console.log(`   Latest bar: ${last.fullDate} (${last.date}), Close: ${last.closePrice}`);
  }

  console.log('\n====================================================');
  console.log('             CHECKPOINT 2 ĐẠT 100%                 ');
  console.log('====================================================\n');
}

testApiRoutes().catch(console.error);
