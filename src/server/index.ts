import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { registerClient } from './services/broadcast.js';
import { startCourtTimerLoop } from './services/court-timer.js';
import { playerRoutes } from './routes/players.js';
import { courtRoutes } from './routes/courts.js';
import { financeRoutes } from './routes/finances.js';
import { loadAppState } from './services/state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(fastifyWebsocket);
  await app.register(playerRoutes);
  await app.register(courtRoutes);
  await app.register(financeRoutes);

  app.get('/api/state', async () => loadAppState());

  app.get('/ws', { websocket: true }, (socket) => {
    registerClient(socket);
    socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: loadAppState() }));
  });

  if (!isDev) {
    const clientRoot = path.join(__dirname, '../client');
    if (fs.existsSync(clientRoot)) {
      await app.register(fastifyStatic, { root: clientRoot, prefix: '/' });
      app.setNotFoundHandler((req, reply) => {
        if (!req.url.startsWith('/api') && req.url !== '/ws') {
          return reply.sendFile('index.html');
        }
        return reply.code(404).send({ error: 'Not found' });
      });
    }
  }

  startCourtTimerLoop();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Picklegrounds API at http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
