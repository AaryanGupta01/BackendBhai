import { FastifyInstance } from 'fastify';
import { OtlpReceiver } from '../services/otlp-receiver.js';
import { wsHandler } from '../ws/handler.js';

const receiver = new OtlpReceiver();

function makeHandler(fastify: FastifyInstance) {
  return async function handleTraces(request: any, reply: any) {
    try {
      let payload = request.body;
      // Handle protobuf binary buffer (decode to JSON)
      if (Buffer.isBuffer(payload)) {
        try {
          const protobuf = require('protobufjs');
          const path = require('path');
          const root = new protobuf.Root();
          root.resolvePath = function(origin: string, target: string) {
            return require('path').resolve(__dirname, '../../proto', target);
          };
          root.loadSync([
            'opentelemetry/proto/collector/trace/v1/trace_service.proto',
            'opentelemetry/proto/trace/v1/trace.proto',
            'opentelemetry/proto/common/v1/common.proto',
            'opentelemetry/proto/resource/v1/resource.proto'
          ]);
          const ReqType = root.lookupType('opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest');
          const decoded = ReqType.decode(payload);
          payload = JSON.parse(JSON.stringify(decoded, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        } catch (decodeErr) {
          fastify.log.warn('Protobuf decode failed, trying JSON: ' + decodeErr);
          payload = JSON.parse(payload.toString('utf-8'));
        }
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
  const handler = makeHandler(fastify);
  fastify.post('/v1/traces', handler);
  fastify.post('/api/v1/telemetry/traces', handler);

  fastify.post('/v1/logs', async (request, reply) => {
    return reply.send({ partialSuccess: null });
  });

  fastify.post('/api/v1/telemetry/demo-event', async (request, reply) => {
    try {
      const payload = request.body as any;
      wsHandler.broadcastNewRequest(payload);
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed' });
    }
  });
}
