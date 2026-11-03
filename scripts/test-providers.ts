import { compositeDataProvider } from '../src/lib/data-providers/index';

async function testProviders() {
  console.log('====================================================');
  console.log('   KIỂM THỬ CHECKPOINT 1: DUAL-SOURCE PROVIDERS    ');
  console.log('====================================================\n');

  // Test 1: BCTC qua Vietcap
  console.log('1. Thử nghiệm BCTC nguồn Vietcap (FPT)...');
  try {
    const vcFin = await compositeDataProvider.getFinancials('FPT', { source: 'vietcap', maxQuarters: 4 });
    console.log(`✅ Vietcap BCTC thành công: ${vcFin.data.length} quý, Nguồn: ${vcFin.sourceUsed}, Latency: ${vcFin.latencyMs}ms`);
  } catch (err: any) {
    console.warn('⚠️ Vietcap BCTC gặp lỗi:', err.message);
  }

  // Test 2: BCTC qua MASVN
  console.log('\n2. Thử nghiệm BCTC nguồn MASVN (FPT)...');
  try {
    const masFin = await compositeDataProvider.getFinancials('FPT', { source: 'mas', maxQuarters: 4 });
    console.log(`✅ MASVN BCTC thành công: ${masFin.data.length} quý, Nguồn: ${masFin.sourceUsed}, Latency: ${masFin.latencyMs}ms`);
    if (masFin.data.length > 0) {
      const q = masFin.data[0];
      console.log(`   Kỳ: ${q.period}, Doanh thu: ${q.revenue.toFixed(1)} tỷ, LNST: ${q.netProfit.toFixed(1)} tỷ, ROE: ${q.roe}%`);
    }
  } catch (err: any) {
    console.error('❌ MASVN BCTC gặp lỗi:', err.message);
  }

  // Test 3: BCTC chế độ AUTO
  console.log('\n3. Thử nghiệm BCTC chế độ AUTO (FPT)...');
  try {
    const autoFin = await compositeDataProvider.getFinancials('FPT', { source: 'auto', maxQuarters: 4 });
    console.log(`✅ AUTO BCTC thành công: ${autoFin.data.length} quý, Nguồn phục vụ: ${autoFin.sourceUsed}, Fallback: ${autoFin.isFallback}, Latency: ${autoFin.latencyMs}ms`);
  } catch (err: any) {
    console.error('❌ AUTO BCTC gặp lỗi:', err.message);
  }

  // Test 4: Giá EOD 26 năm qua MASVN (REE từ năm 2000)
  console.log('\n4. Thử nghiệm Lịch sử giá EOD MASVN mã REE (01/01/2000 - 31/12/2003)...');
  try {
    const masPrice = await compositeDataProvider.getPriceHistory('REE', {
      source: 'mas',
      fromDate: '01/01/2000',
      toDate: '31/12/2003',
    });
    console.log(`✅ MASVN Giá EOD thành công: ${masPrice.data.length} phiên, Nguồn: ${masPrice.sourceUsed}`);
    if (masPrice.data.length > 0) {
      const oldest = masPrice.data[masPrice.data.length - 1];
      const newest = masPrice.data[0];
      console.log(`   Phiên sớm nhất: ${oldest.tradingDate} (Đóng cửa: ${oldest.closePrice}đ, KL: ${oldest.totalVolume})`);
      console.log(`   Phiên muộn nhất cửa sổ: ${newest.tradingDate} (Đóng cửa: ${newest.closePrice}đ, KL: ${newest.totalVolume})`);
    }
  } catch (err: any) {
    console.error('❌ MASVN Giá EOD gặp lỗi:', err.message);
  }

  console.log('\n====================================================');
  console.log('            KẾT THÚC KIỂM THỬ CHECKPOINT 1          ');
  console.log('====================================================\n');
}

testProviders().catch(console.error);
