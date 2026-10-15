import { useState, useEffect, useRef } from 'react';
import { LiveQuoteItem } from '@/app/api/stocks/live-quotes/route';

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

interface UseRealtimeWatchlistOptions {
  symbols: string[];
  enabled?: boolean;
}

export function useRealtimeWatchlist({ symbols, enabled = true }: UseRealtimeWatchlistOptions) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuoteItem>>({});
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const symbolsRef = useRef<string[]>(symbols);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  symbolsRef.current = symbols;

  // ─── Gửi danh sách theo dõi động lên WebSocket Gateway ────────────────────
  const sendSubscribeWatchlist = (ws: WebSocket, syms: string[]) => {
    if (ws.readyState === WebSocket.OPEN && syms.length > 0) {
      ws.send(
        JSON.stringify({
          action: 'sub_watchlist',
          symbols: syms,
        })
      );
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      if (wsRef.current) {
        try {
          wsRef.current.send(JSON.stringify({ action: 'unsub_watchlist' }));
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isUnmounted = false;

    const connect = () => {
      try {
        const url = getWsGatewayUrl();
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setIsConnected(true);

          // Bắt đầu ping định kỳ
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: 'ping' }));
            }
          }, 25000);

          // Gửi ngay danh sách symbols của watchlist hiện tại
          if (symbolsRef.current.length > 0) {
            sendSubscribeWatchlist(ws, symbolsRef.current);
          }
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'watchlist_quotes' && msg.quotes) {
              setQuotes((prev) => ({
                ...prev,
                ...msg.quotes,
              }));
            }
          } catch {}
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

          // Tự động kết nối lại sau 4 giây
          reconnectTimeoutRef.current = setTimeout(connect, 4000);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.send(JSON.stringify({ action: 'unsub_watchlist' }));
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, [enabled]);

  // ─── Khi danh sách symbols thay đổi (đổi danh mục / thêm / bớt mã) ─────────
  useEffect(() => {
    if (!enabled || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (symbols.length === 0) {
      wsRef.current.send(JSON.stringify({ action: 'unsub_watchlist' }));
      return;
    }
    sendSubscribeWatchlist(wsRef.current, symbols);
  }, [symbols, enabled]);

  return {
    quotes,
    isConnected,
  };
}
