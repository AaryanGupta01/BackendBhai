import { FastifyInstance } from 'fastify';
import { OtlpReceiver } from '../services/otlp-receiver.js';
import { wsHandler } from '../ws/handler.js';

const receiver = new OtlpReceiver();

export default async function (fastify: FastifyInstance) {
  fastify.post('/api/v1/telemetry/traces', async (request, reply) => {
    try {
      const payload = request.body;
      await receiver.processOtlpTraces(payload);
      return reply.send({ partialSuccess: null });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to process traces' });
    }
  });

  fastify.post('/v1/logs', async (request, reply) => {
    // Minimal implementation for now
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
