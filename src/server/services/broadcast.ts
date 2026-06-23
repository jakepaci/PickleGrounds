import type { WebSocket } from 'ws';
import { loadAppState } from './state.js';

const clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

export function broadcastState() {
  const state = loadAppState();
  const message = JSON.stringify({ type: 'STATE_UPDATE', payload: state });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
