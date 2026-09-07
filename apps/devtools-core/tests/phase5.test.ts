import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { pool } from '../src/db/connection.js';
import Fastify from 'fastify';

describe('Phase 5: Topology API', () => {
  let server: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    vi.spyOn(pool, 'query').mockImplementation((queryText: any) => {
      // Nodes come from the services registry so that call targets which never emit
      // spans of their own (a database) still appear.
      if (typeof queryText === 'string' && queryText.includes('FROM services sv')) {
        return Promise.resolve({
          rows: [
            { id: 'api-gateway', label: 'api-gateway', kind: 'gateway', span_count: 12, error_count: 1, avg_duration_ms: 40, p95_duration_ms: 90 },
            { id: 'postgres', label: 'postgres', kind: 'database', span_count: 0, error_count: 0, avg_duration_ms: 0, p95_duration_ms: 0 }
          ]
        } as any);
      }
      // Edges are aggregated from client spans, not from a maintained counter table.
      if (typeof queryText === 'string' && queryText.includes("s.span_type = 'client'")) {
        return Promise.resolve({
          rows: [{ source: 'api-gateway', target: 'postgres', request_count: 12, error_count: 1, avg_duration_ms: 6, p95_duration_ms: 11 }]
        } as any);
      }
      return Promise.resolve({ rows: [] } as any);
    });
    server = await buildServer();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('returns nodes and edges derived from telemetry', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/v1/topology' });
    expect(response.statusCode).toBe(200);

    const { data } = JSON.parse(response.payload);
    expect(data.nodes.length).toBe(2);
    expect(data.edges.length).toBe(1);
  });

  it('exposes node kind and measured latency, not name-derived guesses', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/v1/topology' });
    const { data } = JSON.parse(response.payload);

    const gateway = data.nodes.find((n: any) => n.id === 'api-gateway');
    const db = data.nodes.find((n: any) => n.id === 'postgres');
    expect(gateway.kind).toBe('gateway');
    expect(db.kind).toBe('database');
    expect(gateway.avgDurationMs).toBe(40);
    expect(gateway.p95DurationMs).toBe(90);

    // A target that emits no spans of its own still appears as a node.
    expect(db.spanCount).toBe(0);

    const edge = data.edges[0];
    expect(edge).toMatchObject({
      source: 'api-gateway',
      target: 'postgres',
      requestCount: 12,
      errorCount: 1,
      avgDurationMs: 6
    });
  });
});
