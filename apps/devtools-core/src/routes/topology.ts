import { FastifyInstance } from 'fastify';
import { getRepository } from '../db/repositories/query-repository.js';
import { sendRepositoryError } from './errors.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/v1/topology', async (request, reply) => {
    try {
      const topology = await getRepository().getTopology();
      return reply.send({ data: topology });
    } catch (err) {
      return sendRepositoryError(fastify, reply, err, 'Failed to fetch topology');
    }
  });

  fastify.get('/api/v1/traces/:traceId/path', async (request: any, reply) => {
    try {
      const path = await getRepository().getTracePath(request.params.traceId);
      if (!path) return reply.status(404).send({ error: 'Trace not found' });
      return reply.send(path);
    } catch (err) {
      return sendRepositoryError(fastify, reply, err, 'Failed to fetch trace path');
    }
  });

  fastify.get('/api/v1/traces/:traceId/node/:nodeId', async (request: any, reply) => {
    try {
      const detail = await getRepository().getTraceNodeDetail(
        request.params.traceId,
        request.params.nodeId,
        request.query?.nodeType || 'service'
      );
      if (!detail) return reply.status(404).send({ error: 'Node not found in trace' });
      return reply.send(detail);
    } catch (err) {
      return sendRepositoryError(fastify, reply, err, 'Failed to fetch node detail');
    }
  });

  fastify.get('/api/v1/traces/:traceId/summary', async (request: any, reply) => {
    try {
      const summary = await getRepository().getTraceSummary(request.params.traceId);
      if (!summary) return reply.status(404).send({ error: 'Trace not found' });
      return reply.send(summary);
    } catch (err) {
      return sendRepositoryError(fastify, reply, err, 'Failed to fetch trace summary');
    }
  });
}
