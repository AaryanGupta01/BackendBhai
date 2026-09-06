import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { pool } from '../src/db/connection.js';
import Fastify from 'fastify';

describe('Phase 3: Core Read APIs', () => {
  let server: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    vi.spyOn(pool, 'query').mockImplementation((queryText: any) => {
      if (queryText.includes('SELECT COUNT(*) FROM request_summary')) {
        return Promise.resolve({ rows: [{ count: '1' }] } as any);
      }
      if (queryText.includes('FROM request_summary')) {
        return Promise.resolve({ rows: [{ trace_id: '123', status_code: 200, start_time: '1725345600000', error_count: 0 }] } as any);
      }
      if (queryText.includes('FROM traces WHERE id')) {
        return Promise.resolve({ rows: [{ id: '123', start_time: '1725345600000' }] } as any);
      }
      if (queryText.includes('FROM spans WHERE trace_id')) {
        return Promise.resolve({ rows: [{ id: 'span-1', start_time: '1725345600000', attributes: '{}' }] } as any);
      }
      if (queryText.includes('FROM log_events') && queryText.includes('WHERE trace_id')) {
        return Promise.resolve({ rows: [{ id: 'log-1', message: 'test', timestamp: '1725345600000', attributes: '{}' }] } as any);
      }
      return Promise.resolve({ rows: [] } as any);
    });
    server = await buildServer();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/requests should return summary', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/requests'
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data[0].traceId).toBe('123');
    expect(body.pagination.total).toBe(1);
    expect(body.pagination.page).toBe(1);
  });

  it('GET /api/v1/requests/:id should return trace details', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/requests/123'
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.traceId).toBe('123');
    expect(body.spans[0].spanId).toBe('span-1');
  });

  it('GET /api/v1/traces/:id/logs should return logs', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/traces/123/logs'
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).traceId).toBe('123');
  });
});
