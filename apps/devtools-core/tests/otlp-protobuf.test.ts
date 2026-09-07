import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import protobuf from 'protobufjs';
import Fastify from 'fastify';
import { buildServer } from '../src/index.js';
import { pool } from '../src/db/connection.js';

// Real OTLP ids are fixed-width bytes on the wire; these are the W3C spec examples.
const TRACE_ID_HEX = '0af7651916cd43dd8448eb211c80319c';
const SPAN_ID_HEX = 'b7ad6b7169203331';

const PROTO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../proto'
);

function buildExportRequestType() {
  const root = new protobuf.Root();
  root.resolvePath = (_origin: string, target: string) => path.resolve(PROTO_ROOT, target);
  root.loadSync([
    'opentelemetry/proto/collector/trace/v1/trace_service.proto',
    'opentelemetry/proto/trace/v1/trace.proto',
    'opentelemetry/proto/common/v1/common.proto',
    'opentelemetry/proto/resource/v1/resource.proto'
  ]);
  return root.lookupType('opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest');
}

describe('OTLP binary protobuf ingestion', () => {
  let server: ReturnType<typeof Fastify>;
  let querySpy: any;
  let protobufBody: Buffer;

  beforeAll(async () => {
    querySpy = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1, rows: [{}] } as any);
    server = await buildServer();

    const ExportRequest = buildExportRequestType();
    protobufBody = Buffer.from(
      ExportRequest.encode(
        ExportRequest.create({
          resourceSpans: [
            {
              resource: {
                attributes: [{ key: 'service.name', value: { stringValue: 'protobuf-service' } }]
              },
              scopeSpans: [
                {
                  spans: [
                    {
                      traceId: Buffer.from(TRACE_ID_HEX, 'hex'),
                      spanId: Buffer.from(SPAN_ID_HEX, 'hex'),
                      name: 'GET /protobuf',
                      kind: 2,
                      startTimeUnixNano: '1725345600000000000',
                      endTimeUnixNano: '1725345600250000000',
                      attributes: [
                        { key: 'http.request.method', value: { stringValue: 'GET' } },
                        { key: 'url.path', value: { stringValue: '/protobuf' } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        })
      ).finish()
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('accepts application/x-protobuf instead of rejecting it with 415', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/traces',
      headers: { 'content-type': 'application/x-protobuf' },
      payload: protobufBody
    });

    expect(response.statusCode).toBe(200);
  });

  it('decodes binary ids to hex rather than to Buffer JSON', async () => {
    querySpy.mockClear();

    await server.inject({
      method: 'POST',
      url: '/v1/traces',
      headers: { 'content-type': 'application/x-protobuf' },
      payload: protobufBody
    });

    const insertTraceCall = querySpy.mock.calls.find((call: any[]) =>
      call[0].includes('INSERT INTO traces')
    );
    expect(insertTraceCall).toBeDefined();

    const [id, name, rootService, startTime, endTime, , method, urlPath] = insertTraceCall[1];
    expect(id).toBe(TRACE_ID_HEX);
    expect(name).toBe('GET /protobuf');
    expect(rootService).toBe('protobuf-service');
    expect(method).toBe('GET');
    expect(urlPath).toBe('/protobuf');
    // 64-bit nano timestamps must survive as numbers, not as Long objects.
    expect(endTime - startTime).toBe(250);
  });

  it('still accepts OTLP/JSON on the same route', async () => {
    querySpy.mockClear();

    const response = await server.inject({
      method: 'POST',
      url: '/v1/traces',
      headers: { 'content-type': 'application/json' },
      payload: {
        resourceSpans: [
          {
            resource: {
              attributes: [{ key: 'service.name', value: { stringValue: 'json-service' } }]
            },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: Buffer.from(TRACE_ID_HEX, 'hex').toString('base64'),
                    spanId: Buffer.from(SPAN_ID_HEX, 'hex').toString('base64'),
                    name: 'GET /json',
                    kind: 2,
                    startTimeUnixNano: '1725345600000000000',
                    endTimeUnixNano: '1725345600250000000',
                    attributes: []
                  }
                ]
              }
            ]
          }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const insertTraceCall = querySpy.mock.calls.find((call: any[]) =>
      call[0].includes('INSERT INTO traces')
    );
    expect(insertTraceCall[1][0]).toBe(TRACE_ID_HEX);
  });
});
