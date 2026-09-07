import { FastifyInstance } from 'fastify';
import { getRepository } from '../db/repositories/query-repository.js';
import { sendRepositoryError } from './errors.js';
import http from 'http';
import https from 'https';

interface ReplaySession {
  replayId: string;
  originalTraceId: string;
  url: string;
  method: string;
  status: 'completed' | 'failed';
  statusCode: number | null;
  durationMs: number;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  error?: string;
  original: { statusCode: number | null; durationMs: number | null; body: string | null };
  timestamp: string;
}

const replaySessions = new Map<string, ReplaySession>();

// Headers that describe the original hop and must not be replayed verbatim.
const STRIPPED_HEADERS = new Set([
  'host', 'content-length', 'connection', 'traceparent', 'tracestate', 'accept-encoding'
]);

function performRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body: string | null
): Promise<{ statusCode: number; headers: Record<string, string>; body: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const transport = parsed.protocol === 'https:' ? https : http;
    const started = Date.now();

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers as Record<string, string>,
            body: data,
            durationMs: Date.now() - started
          })
        );
      }
    );

    req.on('error', (err: any) => {
      // Node wraps connection failures in an AggregateError whose message is empty;
      // surface the underlying cause so the console is actionable.
      if (err?.errors?.length) {
        const causes = err.errors.map((e: any) => e.code || e.message).join(', ');
        reject(new Error(`${err.message || err.name}: ${causes}`));
        return;
      }
      reject(err);
    });
    req.setTimeout(30000, () => req.destroy(new Error('Replay request timed out after 30s')));
    if (body) req.write(body);
    req.end();
  });
}

export default async function (fastify: FastifyInstance) {
  fastify.post('/api/v1/replay', async (request: any, reply) => {
    const { traceId, overrides } = (request.body || {}) as {
      traceId?: string;
      overrides?: { headers?: Record<string, string>; body?: any };
    };
    if (!traceId) return reply.status(400).send({ error: 'traceId is required' });

    try {
      const repo = getRepository();
      const target = await repo.getReplayRequest(traceId);
      if (!target) return reply.status(404).send({ error: 'Trace not found' });
      if (!target.origin) {
        return reply.status(422).send({
          error: 'Replay target unknown',
          detail: 'The recorded trace has no server span carrying a request URL, so there is nothing to replay against.'
        });
      }

      const original = await repo.getTraceById(traceId);

      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(target.headers || {})) {
        if (!STRIPPED_HEADERS.has(k.toLowerCase())) headers[k] = String(v);
      }
      Object.assign(headers, overrides?.headers || {});

      let body: string | null = target.body;
      if (overrides?.body !== undefined) {
        body = typeof overrides.body === 'string' ? overrides.body : JSON.stringify(overrides.body);
      }
      if (body && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
        headers['content-type'] = 'application/json';
      }
      // Lets the replayed request be told apart from organic traffic downstream.
      headers['x-replay-mode'] = 'true';

      // The origin recorded in telemetry is the caller's view of the product, which the
      // platform cannot necessarily reach (localhost:3000 means something different
      // inside a container). PRODUCT_BASE_URL lets the operator state the reachable
      // address; without it we trust what was recorded.
      const effectiveOrigin = process.env.PRODUCT_BASE_URL || target.origin;
      const url = `${effectiveOrigin}${target.path}`;
      const replayId = `sess-${Date.now().toString(36)}`;
      const originalSnapshot = {
        statusCode: (original as any)?.statusCode ?? null,
        durationMs: (original as any)?.durationMs ?? null,
        body: (original as any)?.responseBody ?? null
      };

      let session: ReplaySession;
      try {
        const result = await performRequest(url, target.method, headers, body);
        session = {
          replayId,
          originalTraceId: traceId,
          url,
          method: target.method,
          status: 'completed',
          statusCode: result.statusCode,
          durationMs: result.durationMs,
          responseHeaders: result.headers,
          responseBody: result.body,
          original: originalSnapshot,
          timestamp: new Date().toISOString()
        };
      } catch (err: any) {
        session = {
          replayId,
          originalTraceId: traceId,
          url,
          method: target.method,
          status: 'failed',
          statusCode: null,
          durationMs: 0,
          responseHeaders: {},
          responseBody: null,
          error: err?.message || String(err),
          original: originalSnapshot,
          timestamp: new Date().toISOString()
        };
      }

      replaySessions.set(replayId, session);
      return reply.send(session);
    } catch (err) {
      return sendRepositoryError(fastify, reply, err, 'Failed to replay trace');
    }
  });

  fastify.get('/api/v1/replay/:id', async (request: any, reply) => {
    const session = replaySessions.get(request.params.id);
    if (!session) return reply.status(404).send({ error: 'Replay session not found' });
    return reply.send(session);
  });

  fastify.get('/api/v1/compare/:replayId', async (request: any, reply) => {
    const session = replaySessions.get(request.params.replayId);
    if (!session) return reply.status(404).send({ error: 'Replay session not found' });

    // Every field below is measured from the two runs; nothing is assumed.
    const durationDeltaMs =
      session.original.durationMs === null ? null : session.durationMs - session.original.durationMs;

    return reply.send({
      replayId: session.replayId,
      originalTraceId: session.originalTraceId,
      url: session.url,
      diff: {
        statusMatch: session.original.statusCode === null ? null : session.original.statusCode === session.statusCode,
        originalStatusCode: session.original.statusCode,
        replayStatusCode: session.statusCode,
        originalDurationMs: session.original.durationMs,
        replayDurationMs: session.durationMs,
        durationDeltaMs,
        bodyMatch:
          session.original.body === null || session.responseBody === null
            ? null
            : session.original.body === session.responseBody
      }
    });
  });
}
