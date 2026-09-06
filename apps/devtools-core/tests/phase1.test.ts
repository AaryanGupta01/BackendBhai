import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { pool } from '../src/db/connection.js';
import Fastify from 'fastify';

describe('Phase 1: Server Foundation', () => {
  let server: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    // Mock the pool.query to simulate DB connectivity without real Postgres
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1, rows: [{}] } as any);
    server = await buildServer();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('should return 200 OK from /health', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok', version: '0.1.0' });
  });
});
