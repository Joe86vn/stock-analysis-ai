import { runSscEarningsPipeline } from '@/lib/ssc-crawler-service';

async function main() {
  console.log('=== VALUEX CLI: SYNC SSC EARNINGS ===');
  const pages = Number(process.argv[2]) || 20;
  const limit = Number(process.argv[3]) || 150;
  const fromDate = process.argv[4] || '01/10/2026';
  const fullScan = process.argv.includes('--full') || process.argv[5] === 'full' || process.argv[5] === 'true';

  console.log(`Starting crawl with pages=${pages}, limit=${limit}, fromDate=${fromDate}, fullScan=${fullScan}...`);
  const result = await runSscEarningsPipeline({
    maxPages: pages,
    maxItemsToProcess: limit,
    fromDate,
    fullScanUntilFromDate: fullScan,
  });

  console.log('\n--- Sync Result ---');
  console.log(`Total scanned: ${result.scannedCount}`);
  console.log(`New reports found: ${result.newReportsFoundCount}`);
  console.log(`Processed: ${result.processedCount}`);
  console.log(`Failed: ${result.failedCount}`);

  if (result.records.length > 0) {
    console.table(
      result.records.map((r) => ({
        ticker: r.ticker,
        period: `${r.period}/${r.year}`,
        revYoY: `${r.revenueYoYPercent}%`,
        patYoY: `${r.patYoYPercent}%`,
        grossMargin: `${r.grossMarginCurrent}%`,
      }))
    );
  }
}

main().catch((err) => {
  console.error('Fatal CLI sync error:', err);
  process.exit(1);
});
