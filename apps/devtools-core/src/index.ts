import fastifyWebsocket from '@fastify/websocket';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runMigrations } from './db/migrate.js';
import { pool, isDbAvailable } from './db/connection.js';
import { seedIfEmpty } from './fixtures/seed.js';

const fastify = Fastify({ logger: true });

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
      try {
        await seedIfEmpty();
      } catch (err) {
        console.warn('Failed to run seed:', err);
      }
    } catch (err) {
      console.warn('Database unavailable, running in standalone mode with in-memory data');
    }
    await server.listen({ port: 4001, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:4001');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
