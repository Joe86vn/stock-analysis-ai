import mqtt, { MqttClient } from 'mqtt';
import { CONFIG } from '../config.js';
import { decodeStockData, decodeIndexData, DecodedStockData, DecodedIndexData } from './proto-decoder.js';

export type StockDataListener = (symbol: string, data: DecodedStockData) => void;
export type IndexDataListener = (indexId: string, data: DecodedIndexData) => void;

export class SsiMqttClient {
  private client: MqttClient | null = null;
  private subscribedSymbols = new Set<string>();
  private subscribedIndexes = new Set<string>();
  private stockListeners: StockDataListener[] = [];
  private indexListeners: IndexDataListener[] = [];
  private isConnected = false;

  constructor() {
    this.connect();
  }

  public connect(): void {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
    }

    console.log(`[SSI MQTT] Connecting to ${CONFIG.SSI_MQTT_ENDPOINT}...`);

    this.client = mqtt.connect(CONFIG.SSI_MQTT_ENDPOINT, {
      protocol: 'wss',
      username: CONFIG.SSI_USERNAME,
      password: CONFIG.SSI_PASSWORD,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      rejectUnauthorized: false,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('[SSI MQTT] Successfully connected to SSI iBoard streaming server!');

      // Luôn subscribe các chỉ số thị trường chính
      this.subscribeIndex('VNINDEX');
      this.subscribeIndex('VN30');
      this.subscribeIndex('HNXIndex');

      // Tái đăng ký các mã cổ phiếu đang được theo dõi
      for (const symbol of this.subscribedSymbols) {
        this.doSubscribeSymbol(symbol);
      }
    });

    this.client.on('message', (topic: string, payload: Buffer) => {
      this.handleMessage(topic, payload);
    });

    this.client.on('error', (err) => {
      console.error('[SSI MQTT] Error:', err.message);
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        console.warn('[SSI MQTT] Connection closed. Will attempt reconnect...');
        this.isConnected = false;
      }
    });
  }

  public onStockData(fn: StockDataListener): () => void {
    this.stockListeners.push(fn);
    return () => {
      this.stockListeners = this.stockListeners.filter((l) => l !== fn);
    };
  }

  public onIndexData(fn: IndexDataListener): () => void {
    this.indexListeners.push(fn);
    return () => {
      this.indexListeners = this.indexListeners.filter((l) => l !== fn);
    };
  }

  public subscribeStock(symbol: string): void {
    const clean = symbol.toUpperCase().trim();
    if (!clean) return;
    this.subscribedSymbols.add(clean);
    if (this.isConnected && this.client) {
      this.doSubscribeSymbol(clean);
    }
  }

  public unsubscribeStock(symbol: string): void {
    const clean = symbol.toUpperCase().trim();
    this.subscribedSymbols.delete(clean);
    if (this.isConnected && this.client) {
      const topic = `s/${clean}/#`;
      this.client.unsubscribe(topic, (err) => {
        if (!err) console.log(`[SSI MQTT] Unsubscribed from ${topic}`);
      });
    }
  }

  public subscribeIndex(indexId: string): void {
    const clean = indexId.toUpperCase().trim();
    this.subscribedIndexes.add(clean);
    if (this.isConnected && this.client) {
      const topic = `i/${clean}`;
      this.client.subscribe(topic, { qos: 0 }, (err) => {
        if (!err) console.log(`[SSI MQTT] Subscribed to Index topic ${topic}`);
      });
    }
  }

  private doSubscribeSymbol(symbol: string): void {
    const topic = `s/${symbol}/#`;
    this.client?.subscribe(topic, { qos: 0 }, (err) => {
      if (err) {
        console.error(`[SSI MQTT] Failed to subscribe ${topic}:`, err);
      } else {
        console.log(`[SSI MQTT] Subscribed to Stock topic ${topic}`);
      }
    });
  }

  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const parts = topic.split('/');
      const prefix = parts[0];

      if (prefix === 's') {
        const symbol = parts[1];
        if (symbol && payload.length > 0) {
          const decoded = decodeStockData(new Uint8Array(payload));
          for (const listener of this.stockListeners) {
            listener(symbol, decoded);
          }
        }
      } else if (prefix === 'i') {
        const indexId = parts[1];
        if (indexId && payload.length > 0) {
          const decoded = decodeIndexData(new Uint8Array(payload));
          for (const listener of this.indexListeners) {
            listener(indexId, decoded);
          }
        }
      }
    } catch (err: any) {
      // Bỏ qua lỗi nếu payload là dạng tin heartbeat nội bộ không khớp schema
      // console.debug('[SSI MQTT] Decode error on topic', topic, err.message);
    }
  }
}
