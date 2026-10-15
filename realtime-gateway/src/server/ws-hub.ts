import { WebSocketServer, WebSocket } from 'ws';
import { SsiMqttClient } from '../ssi/ssi-mqtt-client.js';
import { CandleAggregator, LiveCandle } from '../aggregator/candle-aggregator.js';
import { MarketAggregator, MarketSummary } from '../aggregator/market-aggregator.js';
import { CONFIG } from '../config.js';

interface ClientState {
  ws: WebSocket;
  isAlive: boolean;
  subscriptions: Set<string>; // set of ticker symbols
  subMarket: boolean;
}

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientState>();
  private tickerSubscribers = new Map<string, Set<WebSocket>>();
  private tickerUnsubTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private port: number,
    private ssiClient: SsiMqttClient,
    private candleAggregator: CandleAggregator,
    private marketAggregator: MarketAggregator
  ) {
    this.wss = new WebSocketServer({ port: this.port });
    this.setupServer();
    this.setupSsiListeners();
    this.startHeartbeat();
    this.startActiveTickersPolling();
  }

  private startActiveTickersPolling(): void {
    setInterval(() => {
      if (this.tickerSubscribers.size === 0) return;
      const activeTickers = Array.from(this.tickerSubscribers.keys());
      for (const t of activeTickers) {
        this.fetchAndBroadcastSnapshot(t);
      }
    }, 3000);
  }

  private async fetchAndBroadcastSnapshot(ticker: string, targetWs?: WebSocket): Promise<void> {
    try {
      const res = await fetch(`https://masboard.masvn.com/api/v1/market/symbolLatest?symbolList=${ticker}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://masboard.masvn.com/',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      const item = data[0];
      const price = item.c || item.odC || item.a || 0;
      if (price <= 0) return;

      const bestBid = Array.isArray(item.bb) && item.bb.length > 0 ? item.bb[0] : null;
      const bestAsk = Array.isArray(item.bo) && item.bo.length > 0 ? item.bo[0] : null;

      const candle: LiveCandle = {
        symbol: ticker,
        open: item.o || price,
        high: item.h || price,
        low: item.l || price,
        close: price,
        volume: item.vo || 0,
        timestamp: Date.now(),
        refPrice: item.c && item.ch !== undefined ? item.c - item.ch : undefined,
        change: item.ch,
        changePercent: typeof item.r === 'number' ? Math.round(item.r * 10000) / 100 : 0,
        bidPrice: bestBid?.p,
        bidVol: bestBid?.v,
        askPrice: bestAsk?.p,
        askVol: bestAsk?.v,
      };

      this.candleAggregator.setCandle(candle);

      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        this.sendJson(targetWs, { type: 'candle', data: candle });
      } else {
        this.broadcastCandle(ticker, candle);
      }
    } catch (e: any) {
      console.warn(`[WS Hub] fetchAndBroadcastSnapshot error for ${ticker}:`, e.message);
    }
  }

  private setupServer(): void {
    console.log(`[WS Hub] WebSocket server listening on port ${this.port}`);

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`[WS Hub] New client connected from ${clientIp}`);

      const state: ClientState = {
        ws,
        isAlive: true,
        subscriptions: new Set(),
        subMarket: false,
      };
      this.clients.set(ws, state);

      // Gửi xác nhận kết nối và các chỉ số thị trường hiện có
      this.sendJson(ws, {
        type: 'connected',
        timestamp: Date.now(),
        indexes: this.marketAggregator.getAllIndexes(),
      });

      ws.on('pong', () => {
        state.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const payload = JSON.parse(message.toString());
          this.handleClientMessage(ws, state, payload);
        } catch (e: any) {
          console.warn('[WS Hub] Invalid message JSON:', e.message);
        }
      });

      ws.on('close', () => {
        console.log(`[WS Hub] Client disconnected (${clientIp})`);
        this.cleanupClient(ws, state);
      });

      ws.on('error', (err) => {
        console.error('[WS Hub] Client error:', err.message);
      });
    });
  }

  private handleClientMessage(ws: WebSocket, state: ClientState, payload: any): void {
    const action = payload.action;

    if (action === 'ping') {
      this.sendJson(ws, { type: 'pong', timestamp: Date.now() });
      return;
    }

    if (action === 'sub' && payload.ticker) {
      const ticker = String(payload.ticker).toUpperCase().trim();
      state.subscriptions.add(ticker);

      if (!this.tickerSubscribers.has(ticker)) {
        this.tickerSubscribers.set(ticker, new Set());
      }
      this.tickerSubscribers.get(ticker)!.add(ws);

      // Nếu đang có bộ hẹn giờ unsubscribe thì huỷ
      if (this.tickerUnsubTimers.has(ticker)) {
        clearTimeout(this.tickerUnsubTimers.get(ticker)!);
        this.tickerUnsubTimers.delete(ticker);
      }

      // Yêu cầu SSI MQTT client subscribe mã này
      this.ssiClient.subscribeStock(ticker);

      // Nếu đã có nến gần nhất trong RAM, bắn ngay cho client xem
      const cached = this.candleAggregator.getCandle(ticker);
      if (cached) {
        this.sendJson(ws, { type: 'candle', data: cached });
      }

      // Kích hoạt ngay snapshot mới nhất
      this.fetchAndBroadcastSnapshot(ticker, ws);
      return;
    }

    if (action === 'unsub' && payload.ticker) {
      const ticker = String(payload.ticker).toUpperCase().trim();
      state.subscriptions.delete(ticker);

      const subscribers = this.tickerSubscribers.get(ticker);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.scheduleUnsubscribe(ticker);
        }
      }
      return;
    }

    if (action === 'sub_market') {
      state.subMarket = true;
      // Gửi snapshot thị trường hiện tại
      this.sendJson(ws, {
        type: 'market_snapshot',
        indexes: this.marketAggregator.getAllIndexes(),
      });
      return;
    }
  }

  private broadcastCandle(ticker: string, candle: LiveCandle): void {
    const subscribers = this.tickerSubscribers.get(ticker.toUpperCase().trim());
    if (subscribers && subscribers.size > 0) {
      const msg = JSON.stringify({ type: 'candle', data: candle });
      for (const clientWs of subscribers) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(msg);
        }
      }
    }
  }

  private setupSsiListeners(): void {
    // Khi có cập nhật cổ phiếu từ SSI
    this.ssiClient.onStockData((symbol, data) => {
      const candle = this.candleAggregator.processStockUpdate(symbol, data);
      if (!candle) return;
      this.broadcastCandle(candle.symbol, candle);
    });

    // Khi có cập nhật chỉ số thị trường từ SSI
    this.ssiClient.onIndexData((indexId, data) => {
      const summary = this.marketAggregator.processIndexUpdate(indexId, data);
      const msg = JSON.stringify({ type: 'market', data: summary });

      for (const [ws, state] of this.clients.entries()) {
        if (state.subMarket && ws.readyState === WebSocket.OPEN) {
          ws.send(msg);
        }
      }
    });
  }

  private scheduleUnsubscribe(ticker: string): void {
    // Giữ kết nối trong 3 phút, nếu không có ai xem mới ngắt subscribe SSI
    const timer = setTimeout(() => {
      const subscribers = this.tickerSubscribers.get(ticker);
      if (!subscribers || subscribers.size === 0) {
        this.ssiClient.unsubscribeStock(ticker);
        this.tickerSubscribers.delete(ticker);
        console.log(`[WS Hub] Auto-unsubscribed ${ticker} after inactivity.`);
      }
      this.tickerUnsubTimers.delete(ticker);
    }, 180000);

    this.tickerUnsubTimers.set(ticker, timer);
  }

  private cleanupClient(ws: WebSocket, state: ClientState): void {
    this.clients.delete(ws);

    for (const ticker of state.subscriptions) {
      const subscribers = this.tickerSubscribers.get(ticker);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.scheduleUnsubscribe(ticker);
        }
      }
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      for (const [ws, state] of this.clients.entries()) {
        if (!state.isAlive) {
          console.log('[WS Hub] Terminating unresponsive client');
          ws.terminate();
          this.cleanupClient(ws, state);
          continue;
        }
        state.isAlive = false;
        ws.ping();
      }
    }, CONFIG.CLIENT_PING_INTERVAL_MS);
  }

  private sendJson(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}
