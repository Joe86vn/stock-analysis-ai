import { runSscEarningsPipeline } from '@/lib/ssc-crawler-service';

async function main() {
  console.log('=== VALUEX CLI: SYNC SSC EARNINGS ===');
  const pages = Number(process.argv[2]) || 1;
  const limit = Number(process.argv[3]) || 5;

  console.log(`Starting crawl with pages=${pages}, limit=${limit}...`);
  const result = await runSscEarningsPipeline({
    maxPages: pages,
    maxItemsToProcess: limit,
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
