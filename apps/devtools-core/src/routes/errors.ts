import { FastifyInstance, FastifyReply } from 'fastify';

/**
 * Maps repository failures onto honest status codes. A missing telemetry store is a
 * 503 (the tool cannot answer yet), not a 500 and never fabricated sample data.
 */
export function sendRepositoryError(
  fastify: FastifyInstance,
  reply: FastifyReply,
  err: any,
  message: string
) {
  fastify.log.error(err);
  if (err?.code === 'DB_UNAVAILABLE') {
    return reply.status(503).send({
      error: 'Telemetry store unavailable',
      detail: 'No telemetry is being recorded. Connect a product and retry.'
    });
  }
  return reply.status(500).send({ error: message });
}
