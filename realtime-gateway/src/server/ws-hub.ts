import { WebSocketServer, WebSocket } from 'ws';
import { SsiMqttClient } from '../ssi/ssi-mqtt-client.js';
import { CandleAggregator, LiveCandle } from '../aggregator/candle-aggregator.js';
import { MarketAggregator, MarketSummary } from '../aggregator/market-aggregator.js';
import { CONFIG } from '../config.js';

export interface LiveQuoteItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  sessionVolume: number;
  sessionValueBillion: number;
  refPrice: number;
  open: number;
  high: number;
  low: number;
}

interface ClientState {
  ws: WebSocket;
  isAlive: boolean;
  subscriptions: Set<string>; // set of single chart ticker symbols
  watchlist: Set<string>;     // set of symbols viewed in side panel
  subMarket: boolean;
}

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientState>();
  private tickerSubscribers = new Map<string, Set<WebSocket>>();
  private tickerUnsubTimers = new Map<string, NodeJS.Timeout>();

  // In-memory quote cache cho toàn bộ thị trường
  private quoteCache = new Map<string, LiveQuoteItem>();
  private isFetchingWatchlist = false;

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
    this.startWatchlistPolling();
  }

  // ─── Polling cho các mã biểu đồ đơn lẻ (Single Chart Ticker) ──────────────
  private startActiveTickersPolling(): void {
    setInterval(() => {
      if (this.tickerSubscribers.size === 0) return;
      const activeTickers = Array.from(this.tickerSubscribers.keys());
      for (const t of activeTickers) {
        this.fetchAndBroadcastSnapshot(t);
      }
    }, 3000);
  }

  // ─── Polling định kỳ cho toàn bộ Watchlist động của mọi client ────────────
  private startWatchlistPolling(): void {
    setInterval(async () => {
      const allSymbols = new Set<string>();
      for (const state of this.clients.values()) {
        for (const sym of state.watchlist) {
          allSymbols.add(sym);
        }
      }

      if (allSymbols.size === 0 || this.isFetchingWatchlist) return;

      this.isFetchingWatchlist = true;
      try {
        await this.fetchWatchlistBatch(Array.from(allSymbols));
        this.broadcastWatchlistQuotes();
      } catch (err: any) {
        console.warn('[WS Hub] startWatchlistPolling error:', err.message);
      } finally {
        this.isFetchingWatchlist = false;
      }
    }, 2000); // Chu kỳ 2 giây/lần
  }

  // Chia nhỏ thành các nhóm 40 mã để gửi đồng thời tới MAS API
  private async fetchWatchlistBatch(symbols: string[]): Promise<void> {
    if (symbols.length === 0) return;

    const chunkSize = 40;
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += chunkSize) {
      chunks.push(symbols.slice(i, i + chunkSize));
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://masboard.masvn.com/',
      'Accept': 'application/json',
    };

    await Promise.all(
      chunks.map(async (chunk) => {
        const symbolList = chunk.join(',');
        try {
          const res = await fetch(`https://masboard.masvn.com/api/v1/market/symbolLatest?symbolList=${symbolList}`, {
            headers,
          });
          if (!res.ok) return;
          const data = await res.json();
          if (!Array.isArray(data)) return;

          for (const item of data) {
            if (!item || !item.s) continue;
            const s = String(item.s).toUpperCase();
            const price = item.c || item.odC || item.a || 0;
            const change = typeof item.ch === 'number' ? item.ch : 0;
            const changePercent = typeof item.r === 'number' ? Math.round(item.r * 10000) / 100 : 0;
            const sessionValueBillion = typeof item.va === 'number'
              ? Math.round((item.va / 1_000_000_000) * 10) / 10
              : 0;
            const sessionVolume = typeof item.vo === 'number' ? item.vo : (item.v || 0);
            const refPrice = price && change !== undefined ? price - change : 0;

            const quote: LiveQuoteItem = {
              symbol: s,
              price,
              change,
              changePercent,
              sessionVolume,
              sessionValueBillion,
              refPrice,
              open: item.o || price,
              high: item.h || price,
              low: item.l || price,
            };

            this.quoteCache.set(s, quote);
          }
        } catch (err: any) {
          console.warn(`[WS Hub] fetchWatchlistBatch chunk error:`, err.message);
        }
      })
    );
  }

  // Phát dữ liệu watchlist tới từng client tương ứng với danh sách mã họ đang xem
  private broadcastWatchlistQuotes(): void {
    for (const [ws, state] of this.clients.entries()) {
      if (state.watchlist.size === 0 || ws.readyState !== WebSocket.OPEN) continue;

      const quotes: Record<string, LiveQuoteItem> = {};
      for (const sym of state.watchlist) {
        const q = this.quoteCache.get(sym);
        if (q) {
          quotes[sym] = q;
        }
      }

      if (Object.keys(quotes).length > 0) {
        this.sendJson(ws, {
          type: 'watchlist_quotes',
          quotes,
        });
      }
    }
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

      // Cập nhật luôn vào quoteCache
      this.quoteCache.set(ticker, {
        symbol: ticker,
        price,
        change: item.ch || 0,
        changePercent: typeof item.r === 'number' ? Math.round(item.r * 10000) / 100 : 0,
        sessionVolume: item.vo || 0,
        sessionValueBillion: typeof item.va === 'number' ? Math.round((item.va / 1_000_000_000) * 10) / 10 : 0,
        refPrice: item.c && item.ch !== undefined ? item.c - item.ch : 0,
        open: item.o || price,
        high: item.h || price,
        low: item.l || price,
      });

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
        watchlist: new Set(),
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

    // ─── Single Ticker Subscription (Chart) ─────────────────────────────────
    if (action === 'sub' && payload.ticker) {
      const ticker = String(payload.ticker).toUpperCase().trim();
      state.subscriptions.add(ticker);

      if (!this.tickerSubscribers.has(ticker)) {
        this.tickerSubscribers.set(ticker, new Set());
      }
      this.tickerSubscribers.get(ticker)!.add(ws);

      if (this.tickerUnsubTimers.has(ticker)) {
        clearTimeout(this.tickerUnsubTimers.get(ticker)!);
        this.tickerUnsubTimers.delete(ticker);
      }

      this.ssiClient.subscribeStock(ticker);

      const cached = this.candleAggregator.getCandle(ticker);
      if (cached) {
        this.sendJson(ws, { type: 'candle', data: cached });
      }

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

    // ─── Watchlist Subscription (Side Panel - Hỗ trợ danh mục động) ─────────
    if (action === 'sub_watchlist') {
      const rawSymbols: string[] = Array.isArray(payload.symbols) ? payload.symbols : [];
      const symbols = rawSymbols.map((s) => String(s).toUpperCase().trim()).filter(Boolean);

      state.watchlist = new Set(symbols);

      // Nếu trong RAM cache đã có sẵn mã nào, gửi ngay 0ms cho client
      const immediateQuotes: Record<string, LiveQuoteItem> = {};
      const missingSymbols: string[] = [];

      for (const s of symbols) {
        const cached = this.quoteCache.get(s);
        if (cached) {
          immediateQuotes[s] = cached;
        } else {
          missingSymbols.push(s);
        }
      }

      if (Object.keys(immediateQuotes).length > 0) {
        this.sendJson(ws, {
          type: 'watchlist_quotes',
          quotes: immediateQuotes,
        });
      }

      // Nếu có mã chưa có trong cache, kích hoạt ngay 1 đợt fetch bổ sung
      if (missingSymbols.length > 0) {
        this.fetchWatchlistBatch(missingSymbols).then(() => {
          const freshQuotes: Record<string, LiveQuoteItem> = {};
          for (const s of missingSymbols) {
            const q = this.quoteCache.get(s);
            if (q) freshQuotes[s] = q;
          }
          if (Object.keys(freshQuotes).length > 0 && ws.readyState === WebSocket.OPEN) {
            this.sendJson(ws, {
              type: 'watchlist_quotes',
              quotes: freshQuotes,
            });
          }
        });
      }
      return;
    }

    if (action === 'unsub_watchlist') {
      state.watchlist.clear();
      return;
    }

    // ─── Market Indexes Subscription ────────────────────────────────────────
    if (action === 'sub_market') {
      state.subMarket = true;
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

      // Cập nhật quoteCache
      const sym = candle.symbol.toUpperCase();
      const existing = this.quoteCache.get(sym);
      const quote: LiveQuoteItem = {
        symbol: sym,
        price: candle.close,
        change: candle.change ?? existing?.change ?? 0,
        changePercent: candle.changePercent ?? existing?.changePercent ?? 0,
        sessionVolume: candle.volume > 0 ? candle.volume : (existing?.sessionVolume ?? 0),
        sessionValueBillion: existing?.sessionValueBillion ?? 0,
        refPrice: candle.refPrice ?? existing?.refPrice ?? candle.close,
        open: candle.open ?? existing?.open ?? candle.close,
        high: candle.high ?? existing?.high ?? candle.close,
        low: candle.low ?? existing?.low ?? candle.close,
      };
      this.quoteCache.set(sym, quote);

      // Nếu có client đang xem watchlist chứa mã này, gửi ngay delta
      for (const [ws, state] of this.clients.entries()) {
        if (state.watchlist.has(sym) && ws.readyState === WebSocket.OPEN) {
          this.sendJson(ws, {
            type: 'watchlist_quotes',
            quotes: { [sym]: quote },
          });
        }
      }
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
