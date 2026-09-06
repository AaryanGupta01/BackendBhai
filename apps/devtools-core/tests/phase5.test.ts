import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { pool } from '../src/db/connection.js';
import Fastify from 'fastify';

describe('Phase 5: Topology API', () => {
  let server: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    vi.spyOn(pool, 'query').mockImplementation((queryText: any) => {
      if (queryText.includes('FROM services')) {
        return Promise.resolve({ rows: [{ id: 'api', label: 'api' }] } as any);
      }
      if (queryText.includes('FROM service_dependencies')) {
        return Promise.resolve({ rows: [{ source: 'api', target: 'db' }] } as any);
      }
      return Promise.resolve({ rows: [] } as any);
    });
    server = await buildServer();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/topology should return nodes and edges', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/topology'
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.nodes.length).toBe(1);
    expect(body.data.edges.length).toBe(1);
  });
});
