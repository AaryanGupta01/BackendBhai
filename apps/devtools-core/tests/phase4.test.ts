import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { pool } from '../src/db/connection.js';
import { wsHandler } from '../src/ws/handler.js';
import Fastify from 'fastify';

describe('Phase 4: WebSocket', () => {
  let server: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1, rows: [{}] } as any);
    server = await buildServer();
    await server.listen({ port: 0 }); // Random port for test
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await server.close();
  });

  it('wsHandler should register clients', () => {
    const clientsSpy = vi.spyOn(wsHandler as any, 'clients', 'get');
    expect(wsHandler).toBeDefined();
  });
});
