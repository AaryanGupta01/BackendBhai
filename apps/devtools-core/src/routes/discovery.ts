import { FastifyInstance } from 'fastify';
import { sendRepositoryError } from './errors.js';
import {
  listEndpoints,
  importOpenApi,
  probeEndpoints,
  fetchJson,
  SAFE_METHODS
} from '../services/discovery.js';

export default async function (fastify: FastifyInstance) {
  // Everything the platform knows about the target product's API surface.
  fastify.get('/api/v1/discovery/endpoints', async (request: any, reply) => {
    try {
      const endpoints = await listEndpoints({
        service: request.query?.service,
        source: request.query?.source
      });
      return reply.send({
        data: endpoints,
        meta: {
          total: endpoints.length,
          bySource: endpoints.reduce((acc: Record<string, number>, e: any) => {
            acc[e.source] = (acc[e.source] || 0) + 1;
            return acc;
          }, {})
        }
      });
    } catch (err) {
      return sendRepositoryError(fastify, reply, err, 'Failed to list endpoints');
    }
  });

  // Spec-driven discovery: complete coverage without guessing at URLs.
  fastify.post('/api/v1/discovery/openapi', async (request: any, reply) => {
    const { specUrl, spec, serviceName, baseUrl } = request.body || {};
    if (!serviceName) {
      return reply.status(400).send({ error: 'serviceName is required' });
    }
    if (!spec && !specUrl) {
      return reply.status(400).send({ error: 'Provide either spec or specUrl' });
    }
    try {
      const document = spec || (await fetchJson(specUrl));
      const result = await importOpenApi(document, serviceName, baseUrl);
      return reply.send(result);
    } catch (err: any) {
      if (err?.code === 'INVALID_SPEC') {
        return reply.status(422).send({ error: err.message });
      }
      return sendRepositoryError(fastify, reply, err, 'Failed to import OpenAPI document');
    }
  });

  // Active probing. Safe methods only unless the caller explicitly opts in, because
  // this can be pointed at any product the platform is connected to.
  fastify.post('/api/v1/discovery/probe', async (request: any, reply) => {
    const body = request.body || {};
    if (!body.baseUrl) {
      return reply.status(400).send({ error: 'baseUrl is required' });
    }
    try {
      const result = await probeEndpoints({
        baseUrl: body.baseUrl,
        service: body.service,
        allowMutating: body.allowMutating === true,
        methods: body.methods,
        dryRun: body.dryRun === true,
        delayMs: body.delayMs,
        timeoutMs: body.timeoutMs,
        maxEndpoints: body.maxEndpoints,
        headers: body.headers
      });
      return reply.send(result);
    } catch (err: any) {
      if (err?.code === 'MUTATING_NOT_ALLOWED') {
        return reply.status(403).send({
          error: err.message,
          safeMethods: Array.from(SAFE_METHODS)
        });
      }
      if (err?.code === 'INVALID_PROBE') {
        return reply.status(400).send({ error: err.message });
      }
      return sendRepositoryError(fastify, reply, err, 'Failed to probe endpoints');
    }
  });
}
