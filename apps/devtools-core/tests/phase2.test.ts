import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { pool } from '../src/db/connection.js';
import Fastify from 'fastify';
import syntheticTrace from '../src/fixtures/synthetic-trace.json';

describe('Phase 2: OTLP Ingestion', () => {
  let server: ReturnType<typeof Fastify>;
  let querySpy: any;

  beforeAll(async () => {
    querySpy = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1, rows: [{}] } as any);
    server = await buildServer();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('should accept OTLP payload and redact secrets', async () => {
    const syntheticPayload = {
      resourceSpans: [
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'test-service' } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'test-123',
                  spanId: 'span-1',
                  name: 'GET /test',
                  startTimeUnixNano: '1725345600000000000',
                  endTimeUnixNano: '1725345610000000000',
                  kind: 2,
                  attributes: [
                    { key: 'http.request.method', value: { stringValue: 'POST' } },
                    { key: 'custom.http.request.body', value: { stringValue: '{"password":"mysecretpassword","credit_card":"1234-5678-9012-3456"}' } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/telemetry/traces',
      payload: syntheticPayload
    });

    expect(response.statusCode).toBe(200);
    
    // Check if repository inserts were called with redacted body
    expect(pool.query).toHaveBeenCalled();
    
    const insertTraceCall = querySpy.mock.calls.find((call: any[]) => call[0].includes('INSERT INTO traces'));
    expect(insertTraceCall).toBeDefined();
    
    const requestBodyParam = insertTraceCall[1][10]; // request_body is 11th param ($11) -> index 10
    expect(requestBodyParam).toContain('"***"'); // password/credit_card should be redacted
    expect(requestBodyParam).not.toContain('1234-5678');
  });
});
