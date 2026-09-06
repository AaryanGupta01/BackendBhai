import { FastifyInstance } from 'fastify';
import { QueryRepository } from '../db/repositories/query-repository.js';

const repo = new QueryRepository();

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/v1/topology', async (request, reply) => {
    try {
      const topology = await repo.getTopology();
      return reply.send({ data: topology });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch topology' });
    }
  });
}
