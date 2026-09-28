import { CONFIG } from './config.js';
import { SsiMqttClient } from './ssi/ssi-mqtt-client.js';
import { CandleAggregator } from './aggregator/candle-aggregator.js';
import { MarketAggregator } from './aggregator/market-aggregator.js';
import { WsHub } from './server/ws-hub.js';

console.log('==================================================');
console.log('🚀 ValueX Mini Realtime WebSocket Gateway Starting');
console.log('==================================================');

const ssiClient = new SsiMqttClient();
const candleAggregator = new CandleAggregator();
const marketAggregator = new MarketAggregator();

const hub = new WsHub(CONFIG.PORT, ssiClient, candleAggregator, marketAggregator);

process.on('SIGINT', () => {
  console.log('\n[Gateway] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Gateway] SIGTERM received. Shutting down...');
  process.exit(0);
});
