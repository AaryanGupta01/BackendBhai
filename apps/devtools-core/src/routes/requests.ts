import { FastifyInstance } from 'fastify';
import { QueryRepository } from '../db/repositories/query-repository.js';

const repo = new QueryRepository();

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/v1/requests', async (request, reply) => {
    try {
      const traces = await repo.getRequestsSummary();
      return reply.send({ data: traces });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch requests' });
    }
  });

  fastify.get('/api/v1/requests/:id', async (request: any, reply) => {
    try {
      const id = request.params.id;
      const trace = await repo.getTraceById(id);
      if (!trace) {
        return reply.status(404).send({ error: 'Trace not found' });
      }
      return reply.send(trace);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch trace details' });
    }
  });

  fastify.get('/api/v1/requests/:id/logs', async (request: any, reply) => {
    try {
      const id = request.params.id;
      const logs = await repo.getLogsByTraceId(id);
      return reply.send({ data: logs });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch trace logs' });
    }
  });
}
