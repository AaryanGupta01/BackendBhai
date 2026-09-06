import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.post('/api/v1/replay', async (request, reply) => {
    return reply.status(501).send({ error: 'Replay not fully implemented yet' });
  });

  fastify.get('/api/v1/replay/:id', async (request, reply) => {
    return reply.status(501).send({ error: 'Replay not fully implemented yet' });
  });

  fastify.get('/api/v1/compare/:replayId', async (request, reply) => {
    return reply.status(501).send({ error: 'Compare not fully implemented yet' });
  });
}
