import { FastifyInstance } from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import protobuf from 'protobufjs';
import type { Type as ProtobufType } from 'protobufjs';
import { OtlpReceiver } from '../services/otlp-receiver.js';

const receiver = new OtlpReceiver();

// Both src/routes/otlp.ts and dist/routes/otlp.js sit two levels below the
// package root, which is where proto/ lives (the Dockerfile copies it to /app/proto).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_ROOT = path.resolve(__dirname, '../../proto');

const PROTO_FILES = [
  'opentelemetry/proto/collector/trace/v1/trace_service.proto',
  'opentelemetry/proto/trace/v1/trace.proto',
  'opentelemetry/proto/common/v1/common.proto',
  'opentelemetry/proto/resource/v1/resource.proto'
];

// loadSync reads and parses four files off disk, so the compiled type is cached
// for the process instead of being rebuilt on every export batch.
let exportRequestType: ProtobufType | null = null;

function getExportRequestType(): ProtobufType {
  if (!exportRequestType) {
    const root = new protobuf.Root();
    root.resolvePath = (_origin: string, target: string) => path.resolve(PROTO_ROOT, target);
    root.loadSync(PROTO_FILES);
    exportRequestType = root.lookupType(
      'opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest'
    );
  }
  return exportRequestType;
}

// Decodes binary OTLP into the same shape the OTLP/JSON encoding produces, so
// OtlpReceiver needs no knowledge of which wire format arrived: bytes become
// base64 strings (traceId/spanId, which toHex() expects) and 64-bit ints become
// strings (startTimeUnixNano, which is read with parseInt).
export function decodeProtobufTraces(buf: Buffer) {
  const type = getExportRequestType();
  return type.toObject(type.decode(buf), {
    bytes: String,
    longs: String,
    enums: Number,
    defaults: false
  });
}

function parseBinaryBody(buf: Buffer, contentType: string) {
  // Prefer the declared content type; fall back to sniffing the first byte so a
  // sender with a missing or wrong header still gets decoded correctly.
  const looksJson = contentType.includes('json') || buf[0] === 0x7b; // '{'
  return looksJson ? JSON.parse(buf.toString('utf-8')) : decodeProtobufTraces(buf);
}

function makeHandler(fastify: FastifyInstance) {
  return async function handleTraces(request: any, reply: any) {
    try {
      let payload = request.body;
      if (Buffer.isBuffer(payload)) {
        payload = parseBinaryBody(payload, String(request.headers['content-type'] || ''));
      }
      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }
      await receiver.processOtlpTraces(payload);
      return reply.send({ partialSuccess: null });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to process traces', detail: err.message });
    }
  };
}

export default async function (fastify: FastifyInstance) {
  // Fastify only parses JSON out of the box. Without these, a binary OTLP export
  // is rejected with 415 before it ever reaches the handler.
  for (const mime of ['application/x-protobuf', 'application/protobuf', 'application/octet-stream']) {
    fastify.addContentTypeParser(mime, { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });
  }

  const handler = makeHandler(fastify);
  fastify.post('/v1/traces', handler);
  fastify.post('/api/v1/telemetry/traces', handler);

  fastify.post('/v1/logs', async (request, reply) => {
    return reply.send({ partialSuccess: null });
  });

}
