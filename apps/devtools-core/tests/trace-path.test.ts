import { describe, it, expect, vi, afterEach } from 'vitest';
import { pool } from '../src/db/connection.js';
import { QueryRepository } from '../src/db/repositories/query-repository.js';

// A gateway serving a request that spends most of its time awaiting a downstream
// service. Every gateway span shares a start_time, and the last one in start order
// is a 0ms tcp.connect — the shape that made the naive window computation return 0.
const SPANS = [
  { id: 'g-client', trace_id: 't1', parent_span_id: 'g-server', service_name: 'api-gateway', operation_name: 'GET', span_type: 'client', status: 'ok', start_time: 1000, end_time: 1018, duration_ms: '18', attributes: {} },
  { id: 'g-server', trace_id: 't1', parent_span_id: null, service_name: 'api-gateway', operation_name: 'GET /api/products', span_type: 'server', status: 'ok', start_time: 1000, end_time: 1019, duration_ms: '19', attributes: {} },
  { id: 'g-tcp', trace_id: 't1', parent_span_id: 'g-client', service_name: 'api-gateway', operation_name: 'tcp.connect', span_type: 'internal', status: 'ok', start_time: 1000, end_time: 1000, duration_ms: '0', attributes: {} },
  { id: 'o-server', trace_id: 't1', parent_span_id: 'g-client', service_name: 'order-service', operation_name: 'GET /products', span_type: 'server', status: 'ok', start_time: 1003, end_time: 1018, duration_ms: '15', attributes: {} }
];

describe('getTracePath timing', () => {
  afterEach(() => vi.restoreAllMocks());

  function mockSpans() {
    vi.spyOn(pool, 'query').mockImplementation((q: any) =>
      Promise.resolve({ rows: String(q).includes('FROM spans') ? SPANS : [] } as any)
    );
  }

  it('derives the service window from min(start) and max(end), not span order', async () => {
    mockSpans();
    const result = await new QueryRepository().getTracePath('t1');
    const gateway = result!.path.find((s: any) => s.serviceName === 'api-gateway')!;

    // Naive lastSpan.end - firstSpan.start would be 0 here (tcp.connect sorts last).
    expect(gateway.totalDurationMs).toBe(19);
  });

  it('reports self time excluding downstream work, so hops differ', async () => {
    mockSpans();
    const result = await new QueryRepository().getTracePath('t1');
    const gateway = result!.path.find((s: any) => s.serviceName === 'api-gateway')!;
    const order = result!.path.find((s: any) => s.serviceName === 'order-service')!;

    // 19ms wall clock, 15ms of it waiting on order-service => 4ms of its own work.
    expect(gateway.selfTimeMs).toBe(4);
    expect(order.selfTimeMs).toBe(15);

    // The whole point: hops must not all report the same number.
    expect(gateway.selfTimeMs).not.toBe(order.selfTimeMs);
  });

  it('orders hops by first observation and keeps the representative operation', async () => {
    mockSpans();
    const result = await new QueryRepository().getTracePath('t1');
    expect(result!.path.map((s: any) => s.serviceName)).toEqual(['api-gateway', 'order-service']);
    expect(result!.path[0].representativeOperation).toBe('GET /api/products');
  });
});
