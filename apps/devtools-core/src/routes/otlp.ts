import { FastifyInstance } from 'fastify';
import { OtlpReceiver } from '../services/otlp-receiver.js';

const receiver = new OtlpReceiver();

export default async function (fastify: FastifyInstance) {
  fastify.post('/v1/traces', async (request, reply) => {
    try {
      const payload = request.body;
      await receiver.processSyntheticTrace(payload);
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
}
