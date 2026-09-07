import { FastifyInstance } from 'fastify';
import { getRepository } from '../db/repositories/query-repository.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/v1/topology', async (request, reply) => {
    try {
      const repo = getRepository();
      const topology = await repo.getTopology();
      return reply.send({ data: topology });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch topology' });
    }
  });
}
