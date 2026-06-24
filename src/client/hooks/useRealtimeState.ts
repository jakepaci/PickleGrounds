import { useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { AppState, WsMessage } from '../../shared/types';

export function useRealtimeState() {
  const setState = useAppStore((s) => s.setState);
  const setConnected = useAppStore((s) => s.setConnected);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<AppState>('/api/state')
      .then((state) => {
        if (!cancelled) setState(state);
      })
      .catch(() => {
        /* WebSocket will retry; avoid blocking the UI */
      });

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        retryRef.current = setTimeout(connect, 2000);
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as WsMessage;
        if (msg.type === 'STATE_UPDATE') setState(msg.payload);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [setState, setConnected]);
}
