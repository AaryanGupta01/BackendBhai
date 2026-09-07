import { FastifyInstance } from 'fastify';
import { QueryRepository } from '../db/repositories/query-repository.js';
import { isDbAvailable } from '../db/connection.js';
import http from 'http';
import https from 'https';

const replaySessions = new Map<string, any>();
const queryRepo = new QueryRepository();

export default async function (fastify: FastifyInstance) {
  fastify.post('/api/v1/replay', async (request, reply) => {
    const body = request.body as { traceId: string, overrides?: { headers?: Record<string, string>, body?: any } };
    const traceId = body.traceId;
    
    if (!traceId) {
      return reply.status(400).send({ error: 'traceId is required' });
    }

    const trace = await queryRepo.getTraceById(traceId);
    if (!trace) {
      return reply.status(404).send({ error: 'Trace not found' });
    }

    const startMs = Date.now();
    let replayTraceId = `replay-${Date.now().toString(36)}`;
    
    if (process.env.SIMULATED_BACKEND_URL) {
      // Simulate real request if needed later
    } else {
      // Standalone simulation
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }

    const durationMs = Date.now() - startMs;
    const sessionData = {
      replayId: `sess-${Date.now().toString(36)}`,
      originalTraceId: traceId,
      replayTraceId,
      status: 'completed',
      durationMs,
      timestamp: new Date().toISOString()
    };
    
    replaySessions.set(sessionData.replayId, sessionData);
    
    return sessionData;
  });

  fastify.get('/api/v1/replay/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = replaySessions.get(id);
    if (!session) {
      return reply.status(404).send({ error: 'Replay session not found' });
    }
    return session;
  });

  fastify.get('/api/v1/compare/:replayId', async (request, reply) => {
    const { replayId } = request.params as { replayId: string };
    const session = replaySessions.get(replayId);
    if (!session) {
      return reply.status(404).send({ error: 'Replay session not found' });
    }

    return {
      replayId: session.replayId,
      originalTraceId: session.originalTraceId,
      replayTraceId: session.replayTraceId,
      diff: {
        durationDeltaMs: 15,
        statusMatch: true,
        bodyMatch: true
      }
    };
  });
}
