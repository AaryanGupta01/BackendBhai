import { FastifyInstance } from 'fastify';
import { getRepository } from '../db/repositories/query-repository.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/v1/requests', async (request: any, reply) => {
    try {
      const repo = getRepository();
      const result = await repo.getRequestsSummary(request.query || {});
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch requests' });
    }
  });

  fastify.get('/api/v1/requests/:id', async (request: any, reply) => {
    try {
      const repo = getRepository();
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

  fastify.get('/api/v1/traces/:id/logs', async (request: any, reply) => {
    try {
      const repo = getRepository();
      const id = request.params.id;
      const result = await repo.getLogsByTraceId(id);
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch trace logs' });
    }
  });

  fastify.get('/api/v1/traces/:id/waterfall', async (request: any, reply) => {
    try {
      const repo = getRepository();
      const id = request.params.id;
      const result = await repo.getTraceWaterfall(id);
      if (!result) return reply.status(404).send({ error: 'Trace not found' });
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch trace waterfall' });
    }
  });
}
