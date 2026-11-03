import { masMcpClient } from '../src/lib/mas-mcp-client';

async function testFeatures() {
  console.log('--- 1. Testing Bank Top Bad Debt (Q2/2026) ---');
  try {
    const badDebt = await masMcpClient.callTool('get_bank_top_bad_debt', { termCode: 'Q2', year: 2026 });
    console.log('Bad Debt keys:', Object.keys(badDebt));
    console.log('Bad Debt result:', JSON.stringify(badDebt).substring(0, 300));
  } catch (err: any) {
    console.warn('Bad debt error:', err.message);
  }

  console.log('\n--- 2. Testing VCB Banking Indicators (ALL, Q2/2026) ---');
  try {
    const vcbMetrics = await masMcpClient.callTool('get_banking_financial_indicator', {
      symbol: 'VCB',
      type: 'ALL',
      termCode: 'Q2',
      year: 2026,
    });
    console.log('VCB Metrics result:', JSON.stringify(vcbMetrics).substring(0, 300));
  } catch (err: any) {
    console.warn('VCB Metrics error:', err.message);
  }
}

testFeatures().catch(console.error);
