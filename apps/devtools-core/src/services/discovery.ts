import { pool, requireDb } from '../db/connection.js';
import http from 'http';
import https from 'https';

export type EndpointSource = 'observed' | 'spec' | 'probe';

export interface DiscoveredEndpoint {
  serviceName: string;
  method: string;
  path: string;
  source: EndpointSource;
  baseUrl?: string | null;
}

// Methods that cannot change server state. Anything outside this set must be asked
// for explicitly, because this platform is meant to point at real products.
export const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const KNOWN_METHODS = ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

/**
 * Records an endpoint learned from telemetry. Called during ingest, so simply using
 * the product teaches the platform its surface area at zero risk.
 */
export async function recordObservedEndpoints(
  endpoints: Array<{ serviceName: string; method: string; path: string }>
) {
  if (endpoints.length === 0) return;
  const query = `
    INSERT INTO discovered_endpoints (service_name, method, path, source, observation_count, last_seen)
    VALUES ($1, $2, $3, 'observed', 1, NOW())
    ON CONFLICT (service_name, method, path) DO UPDATE SET
      observation_count = discovered_endpoints.observation_count + 1,
      last_seen = NOW()
  `;
  for (const e of endpoints) {
    try {
      await pool.query(query, [e.serviceName, e.method, e.path]);
    } catch {
      // Endpoint bookkeeping must never break telemetry ingestion.
    }
  }
}

export async function listEndpoints(filter: { service?: string; source?: string } = {}) {
  requireDb();
  const where: string[] = [];
  const params: any[] = [];
  if (filter.service) {
    params.push(filter.service);
    where.push('service_name = $' + params.length);
  }
  if (filter.source) {
    params.push(filter.source);
    where.push('source = $' + params.length);
  }

  const sql =
    `SELECT service_name, method, path, source, base_url, observation_count,
            last_status_code, last_duration_ms, last_probed_at, first_seen, last_seen
     FROM discovered_endpoints ` +
    (where.length ? 'WHERE ' + where.join(' AND ') + ' ' : '') +
    'ORDER BY service_name, path, method';

  const { rows } = await pool.query(sql, params);
  return rows.map((r: any) => ({
    serviceName: r.service_name,
    method: r.method,
    path: r.path,
    source: r.source,
    baseUrl: r.base_url,
    observationCount: r.observation_count,
    lastStatusCode: r.last_status_code,
    lastDurationMs: r.last_duration_ms,
    lastProbedAt: r.last_probed_at,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen
  }));
}

/**
 * Imports an OpenAPI document. This is the complete-coverage path: it enumerates
 * endpoints the product has never served, without guessing at URLs.
 */
export async function importOpenApi(spec: any, serviceName: string, baseUrl?: string | null) {
  requireDb();
  if (!spec || typeof spec !== 'object' || !spec.paths) {
    throw Object.assign(new Error('Document has no "paths" object - not an OpenAPI spec'), {
      code: 'INVALID_SPEC'
    });
  }

  // Prefer an explicit base URL, else the first server the spec declares.
  const specServer =
    Array.isArray(spec.servers) && spec.servers[0] && spec.servers[0].url ? spec.servers[0].url : null;
  const effectiveBase = baseUrl || specServer || null;

  const imported: DiscoveredEndpoint[] = [];
  for (const [path, item] of Object.entries<any>(spec.paths)) {
    for (const method of Object.keys(item || {})) {
      const upper = method.toUpperCase();
      if (!KNOWN_METHODS.includes(upper)) continue;
      imported.push({ serviceName, method: upper, path, source: 'spec', baseUrl: effectiveBase });
    }
  }

  for (const e of imported) {
    await pool.query(
      `INSERT INTO discovered_endpoints (service_name, method, path, source, base_url, last_seen)
       VALUES ($1, $2, $3, 'spec', $4, NOW())
       ON CONFLICT (service_name, method, path) DO UPDATE SET
         base_url = COALESCE(EXCLUDED.base_url, discovered_endpoints.base_url),
         last_seen = NOW()`,
      [e.serviceName, e.method, e.path, e.baseUrl]
    );
  }
  return { imported: imported.length, baseUrl: effectiveBase, endpoints: imported };
}

export function fetchJson(url: string, timeoutMs = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Response from ' + url + ' was not JSON'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timed out fetching ' + url)));
  });
}

function request(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
  timeoutMs: number
): Promise<{ statusCode: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
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
        res.resume();
        res.on('end', () =>
          resolve({ statusCode: res.statusCode || 0, durationMs: Date.now() - started })
        );
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timed out after ' + timeoutMs + 'ms')));
    if (body) req.write(body);
    req.end();
  });
}

export interface ProbeOptions {
  baseUrl: string;
  service?: string;
  /** Mutating verbs stay off unless the caller opts in for a non-production target. */
  allowMutating?: boolean;
  methods?: string[];
  /** Report what would run without sending anything. */
  dryRun?: boolean;
  delayMs?: number;
  timeoutMs?: number;
  maxEndpoints?: number;
  headers?: Record<string, string>;
}

/**
 * Executes discovered endpoints against a target so the resulting telemetry builds the
 * dependency graph. Skips endpoints whose path still contains unfilled parameters,
 * since guessing identifiers produces noise at best and damage at worst.
 */
export async function probeEndpoints(options: ProbeOptions) {
  requireDb();
  const {
    baseUrl,
    service,
    allowMutating = false,
    dryRun = false,
    delayMs = 150,
    timeoutMs = 10000,
    maxEndpoints = 100,
    headers = {}
  } = options;

  if (!baseUrl) {
    throw Object.assign(new Error('baseUrl is required'), { code: 'INVALID_PROBE' });
  }

  const requested = (options.methods || Array.from(SAFE_METHODS)).map((m) => m.toUpperCase());
  const unsafeRequested = requested.filter((m) => !SAFE_METHODS.has(m));
  if (unsafeRequested.length > 0 && !allowMutating) {
    throw Object.assign(
      new Error(
        'Refusing to send ' +
          unsafeRequested.join(', ') +
          ' without allowMutating: true. These can change or destroy data in the target product.'
      ),
      { code: 'MUTATING_NOT_ALLOWED' }
    );
  }

  const all = await listEndpoints(service ? { service } : {});
  const candidates = all
    .filter((e: any) => requested.includes(e.method))
    // A templated path ({id}, :id) needs a real identifier we do not have.
    .filter((e: any) => !/[{:]/.test(e.path))
    .slice(0, maxEndpoints);

  const planned = candidates.map((e: any) => ({
    method: e.method,
    path: e.path,
    url: baseUrl + e.path
  }));

  if (dryRun) {
    return { dryRun: true, target: baseUrl, plannedCount: planned.length, planned, results: [] };
  }

  const results: any[] = [];
  for (const endpoint of candidates) {
    const url = baseUrl + endpoint.path;
    try {
      const res = await request(
        url,
        endpoint.method,
        // Tagged so probe traffic can be told apart from organic requests.
        Object.assign({ 'x-backendbhai-probe': 'true' }, headers),
        null,
        timeoutMs
      );
      results.push({
        method: endpoint.method,
        path: endpoint.path,
        url,
        statusCode: res.statusCode,
        durationMs: res.durationMs
      });
      await pool.query(
        `UPDATE discovered_endpoints
         SET last_status_code = $1, last_duration_ms = $2, last_probed_at = NOW(), base_url = $3
         WHERE service_name = $4 AND method = $5 AND path = $6`,
        [res.statusCode, res.durationMs, baseUrl, endpoint.serviceName, endpoint.method, endpoint.path]
      );
    } catch (err: any) {
      results.push({
        method: endpoint.method,
        path: endpoint.path,
        url,
        error: err && err.message ? err.message : String(err)
      });
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  return {
    dryRun: false,
    target: baseUrl,
    plannedCount: planned.length,
    executedCount: results.length,
    results
  };
}
