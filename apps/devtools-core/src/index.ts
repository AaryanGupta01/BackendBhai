import fastifyWebsocket from '@fastify/websocket';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runMigrations } from './db/migrate.js';
import { pool, isDbAvailable } from './db/connection.js';

const fastify = Fastify({ logger: true });

// Deployment details belong in the environment, not in the bundle.
const PORT = Number(process.env.PORT || 4001);
const HOST = process.env.HOST || '0.0.0.0';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildServer() {
  await fastify.register(cors, { origin: '*' });

  fastify.get('/health', async (request, reply) => {
    if (!isDbAvailable()) {
      return { status: 'ok', version: '0.1.0', mode: 'standalone', database: 'unavailable' };
    }
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', version: '0.1.0' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(503).send({ status: 'error', database: 'disconnected' });
    }
  });

  await fastify.register(fastifyWebsocket);
  fastify.register(import('./routes/websocket.js'));
  fastify.register(import('./routes/otlp.js'));
  fastify.register(import('./routes/requests.js'));
  fastify.register(import('./routes/topology.js'));
  fastify.register(import('./routes/replay.js'));
  fastify.register(import('./routes/discovery.js'));
  fastify.register(import('./routes/config.js'));

  fastify.register(import('@fastify/static').then(m => m.default), {
    root: path.join(__dirname, '../../devtools-ui/dist'),
    prefix: '/'
  });

  return fastify;
}

const start = async () => {
  try {
    const server = await buildServer();
    try {
      await runMigrations();
    } catch (err) {
      console.warn('Telemetry database unavailable — API will report 503 until it is reachable.');
    }
    await server.listen({ port: PORT, host: HOST });
    console.log(`BackendBhai platform listening on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
