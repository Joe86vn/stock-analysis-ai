import { syncWiDataEarnings } from '../src/lib/widata-crawler-service';

async function main() {
  console.log('=== VALUEX CLI: SYNC WIDATA EARNINGS BACKUP ===');
  const result = await syncWiDataEarnings();

  console.log('\n--- Sync WiData Result ---');
  console.log(`Period: ${result.activePeriod}`);
  console.log(`Total WiData items: ${result.totalWiData}`);
  console.log(`Added new records: ${result.addedCount}`);
  console.log(`Updated records: ${result.updatedCount}`);
  console.log(`Skipped existing SSC records: ${result.skippedExistingSscCount}`);
  console.log(`Message: ${result.message}`);
}

main().catch((err) => {
  console.error('Fatal CLI sync error:', err);
  process.exit(1);
});

