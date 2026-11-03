import { masMcpClient } from '../src/lib/mas-mcp-client';

async function testAllStatements() {
  const ticker = 'REE';
  const periods = ['Q2/2026'];

  console.log('--- BALANCE SHEET ---');
  const bs = await masMcpClient.getBalanceSheet(ticker, periods);
  const bsItems = bs.items || (bs.content ? JSON.parse(bs.content).items : []);
  console.log('BS total items:', bsItems.length);
  console.log('BS first 10 names:', bsItems.slice(0, 10).map((i: any) => i.name));

  console.log('\n--- CASH FLOW ---');
  const cf = await masMcpClient.getCashFlow(ticker, periods);
  const cfItems = cf.items || (cf.content ? JSON.parse(cf.content).items : []);
  console.log('CF total items:', cfItems.length);
  console.log('CF first 10 names:', cfItems.slice(0, 10).map((i: any) => i.name));

  console.log('\n--- FINANCIAL INDICATORS ---');
  const fi = await masMcpClient.getFinancialIndicators(ticker, periods);
  const fiItems = fi.items || (fi.content ? JSON.parse(fi.content).items : []);
  console.log('FI total items:', fiItems.length);
  console.log('FI names:', fiItems.map((i: any) => i.name));
}

testAllStatements().catch(console.error);
