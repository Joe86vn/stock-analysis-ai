import { useState, useEffect, useRef, useCallback } from 'react';

export interface LiveCandleData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  refPrice?: number;
  ceiling?: number;
  floor?: number;
  change?: number;
  changePercent?: number;
  bidPrice?: number;
  bidVol?: number;
  askPrice?: number;
  askVol?: number;
}

export interface RealtimeMarketIndex {
  indexId: string;
  indexValue: number;
  change: number;
  changePercent: number;
  totalQtty: number;
  totalValue: number;
  advances: number;
  declines: number;
  nochanges: number;
  ceiling: number;
  floor: number;
  updatedAt: number;
}

interface UseRealtimeStockOptions {
  ticker?: string | null;
  enableMarket?: boolean;
}

export function isIndexTicker(t?: string | null): boolean {
  if (!t) return false;
  const s = t.toUpperCase().trim();
  return ['VNINDEX', 'VN-INDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOM'].includes(s);
}

// Cấu hình URL WebSocket Gateway: Ưu tiên biến môi trường NEXT_PUBLIC_WS_GATEWAY_URL, tự động theo domain hiện tại (/ws)
function getWsGatewayUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_GATEWAY_URL) {
    return process.env.NEXT_PUBLIC_WS_GATEWAY_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8080';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return 'wss://valuex.duckdns.org/ws';
}

const WS_GATEWAY_URL = getWsGatewayUrl();

export function useRealtimeStock({ ticker, enableMarket = false }: UseRealtimeStockOptions) {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveCandle, setLiveCandle] = useState<LiveCandleData | null>(null);
  const [marketIndexes, setMarketIndexes] = useState<Map<string, RealtimeMarketIndex>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTickerRef = useRef<string | null>(ticker || null);

  currentTickerRef.current = ticker || null;

  // ─── HTTP Fallback Polling (khi socket offline) ──────────────────────────
  const pollHttpPrice = useCallback(async (t: string) => {
    try {
      const res = await fetch(`/api/stocks/${t}/price`);
      if (!res.ok) return;
      const data = await res.json();
      if (currentTickerRef.current !== t) return;

      if (data && typeof data.price === 'number' && data.price > 0) {
        setLiveCandle((prev) => {
          const price = data.price;
          const open = data.open ?? (prev?.open || price);
          const high = data.high ?? (prev ? Math.max(prev.high, price) : price);
          const low = data.low ?? (prev ? Math.min(prev.low, price) : price);
          const volume = typeof data.volume === 'number' && data.volume > 0 ? data.volume : (prev?.volume || 0);
          return {
            symbol: t,
            open,
            high,
            low,
            close: price,
            volume,
            timestamp: Date.now(),
            refPrice: data.refPrice,
            change: data.change,
            changePercent: data.changePercent,
            bidPrice: data.bidPrice ?? prev?.bidPrice,
            bidVol: data.bidVol ?? prev?.bidVol,
            askPrice: data.askPrice ?? prev?.askPrice,
            askVol: data.askVol ?? prev?.askVol,
          };
        });
      }
    } catch {}
  }, []);

  // ─── Quản lý WebSocket Gateway ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isUnmounted = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      try {
        const ws = new WebSocket(WS_GATEWAY_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          console.log('[useRealtimeStock] Connected to Realtime WebSocket Gateway');
          setIsSocketConnected(true);

          // Tắt HTTP fallback nếu đang chạy
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }

          // Bắt đầu ping/pong heartbeat
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: 'ping' }));
            }
          }, 25000);

          // Subscribe mã hiện tại
          if (currentTickerRef.current) {
            ws.send(JSON.stringify({ action: 'sub', ticker: currentTickerRef.current }));
          }

          // Subscribe thị trường nếu được yêu cầu hoặc nếu mã hiện tại là chỉ số
          if (enableMarket || isIndexTicker(currentTickerRef.current)) {
            ws.send(JSON.stringify({ action: 'sub_market' }));
          }
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'candle' && msg.data) {
              const candle: LiveCandleData = msg.data;
              if (
                currentTickerRef.current &&
                (candle.symbol === currentTickerRef.current ||
                  (currentTickerRef.current === 'VNINDEX' && candle.symbol === 'VN-INDEX') ||
                  (currentTickerRef.current === 'VN-INDEX' && candle.symbol === 'VNINDEX'))
              ) {
                setLiveCandle(candle);
              }
            } else if (msg.type === 'market' && msg.data) {
              const mkt: RealtimeMarketIndex = msg.data;
              setMarketIndexes((prev) => {
                const next = new Map(prev);
                next.set(mkt.indexId, mkt);
                return next;
              });

              // Nếu ticker hiện tại là index tương ứng -> chuyển đổi sang liveCandle
              if (
                currentTickerRef.current &&
                (mkt.indexId === currentTickerRef.current ||
                  (currentTickerRef.current === 'VNINDEX' && mkt.indexId === 'VNINDEX') ||
                  (currentTickerRef.current === 'VN-INDEX' && mkt.indexId === 'VNINDEX'))
              ) {
                setLiveCandle({
                  symbol: currentTickerRef.current,
                  open: (mkt as any).chartOpen || mkt.indexValue,
                  high: (mkt as any).chartHigh || mkt.indexValue,
                  low: (mkt as any).chartLow || mkt.indexValue,
                  close: mkt.indexValue,
                  volume: mkt.totalQtty,
                  timestamp: mkt.updatedAt || Date.now(),
                  change: mkt.change,
                  changePercent: mkt.changePercent,
                });
              }
            } else if (msg.type === 'market_snapshot' && Array.isArray(msg.indexes)) {
              setMarketIndexes((prev) => {
                const next = new Map(prev);
                for (const idx of msg.indexes) {
                  next.set(idx.indexId, idx);
                }
                return next;
              });

              if (currentTickerRef.current && isIndexTicker(currentTickerRef.current)) {
                const targetId = currentTickerRef.current === 'VN-INDEX' ? 'VNINDEX' : currentTickerRef.current;
                const found = msg.indexes.find((i: RealtimeMarketIndex) => i.indexId === targetId);
                if (found) {
                  setLiveCandle({
                    symbol: currentTickerRef.current,
                    open: (found as any).chartOpen || found.indexValue,
                    high: (found as any).chartHigh || found.indexValue,
                    low: (found as any).chartLow || found.indexValue,
                    close: found.indexValue,
                    volume: found.totalQtty,
                    timestamp: found.updatedAt || Date.now(),
                    change: found.change,
                    changePercent: found.changePercent,
                  });
                }
              }
            }
          } catch {}
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsSocketConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

          // Bật ngay HTTP Fallback nếu có ticker
          if (currentTickerRef.current && !fallbackIntervalRef.current) {
            pollHttpPrice(currentTickerRef.current);
            fallbackIntervalRef.current = setInterval(() => {
              if (currentTickerRef.current) pollHttpPrice(currentTickerRef.current);
            }, 15000);
          }

          // Tự động thử kết nối lại sau 5s
          reconnectTimeout = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch (err) {
        setIsSocketConnected(false);
        // Fallback sang HTTP
        if (currentTickerRef.current && !fallbackIntervalRef.current) {
          pollHttpPrice(currentTickerRef.current);
          fallbackIntervalRef.current = setInterval(() => {
            if (currentTickerRef.current) pollHttpPrice(currentTickerRef.current);
          }, 15000);
        }
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [enableMarket, pollHttpPrice]);

  // ─── Xử lý khi đổi ticker ────────────────────────────────────────────────
  useEffect(() => {
    if (!ticker) {
      setLiveCandle(null);
      return;
    }

    setLiveCandle(null);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'sub', ticker }));
      if (isIndexTicker(ticker)) {
        wsRef.current.send(JSON.stringify({ action: 'sub_market' }));
      }
    } else {
      // Socket chưa sẵn sàng -> gọi ngay 1 lần HTTP
      pollHttpPrice(ticker);
    }
  }, [ticker, pollHttpPrice]);

  return {
    isSocketConnected,
    liveCandle,
    marketIndexes,
  };
}
