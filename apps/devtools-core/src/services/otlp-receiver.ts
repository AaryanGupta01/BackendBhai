import { TraceRepository } from '../db/repositories/trace-repository.js';
import { redactSpanAttributes, redactHeaders, redactBody } from './redactor.js';
import { wsHandler } from '../ws/handler.js';
import { recordObservedEndpoints } from './discovery.js';

const repo = new TraceRepository();

// Trace/span ids reach us in three encodings and must all land as hex:
//  - OTLP/JSON (what the Collector sends with encoding: json) uses HEX already
//  - protobuf decoded via toObject({ bytes: String }) yields base64
//  - a raw Buffer when decoded straight from the wire
// A hex id is exactly 32 chars (16-byte trace) or 16 chars (8-byte span); base64
// of those is 24/12 chars and padded, so length + charset is an unambiguous test.
function toHex(input: string | Buffer): string {
  if (!input) return '';
  if (Buffer.isBuffer(input)) return input.toString('hex');
  if ((input.length === 32 || input.length === 16) && /^[0-9a-f]+$/i.test(input)) {
    return input.toLowerCase();
  }
  return Buffer.from(input, 'base64').toString('hex');
}

// Nanosecond timestamps exceed Number.MAX_SAFE_INTEGER, so parsing them as a
// float loses precision and skews span durations by up to a millisecond.
// BigInt division keeps the value exact before it is narrowed to millis.
function nanosToMillis(nano: unknown): number {
  if (nano === null || nano === undefined || nano === '') return 0;
  try {
    return Number(BigInt(typeof nano === 'number' ? Math.trunc(nano) : String(nano)) / 1000000n);
  } catch {
    return 0;
  }
}

// db.system values that represent caches rather than durable stores.
const CACHE_DB_SYSTEMS = new Set(['redis', 'memcached', 'valkey', 'hazelcast']);

export class OtlpReceiver {
  async processOtlpTraces(payload: any) {
    if (!payload?.resourceSpans) return;

    const tracesMap = new Map<string, any>();
    const allSpans: any[] = [];
    const allLogs: any[] = [];
    const serviceNames = new Set<string>();
    const rootServices = new Set<string>();
    const observedEndpoints: Array<{ serviceName: string; method: string; path: string }> = [];
    const dependencies = new Map<string, { source: string, target: string, type: string, targetKind: string }>();

    for (const rs of payload.resourceSpans) {
      const resourceAttrs = rs.resource?.attributes || [];
      const serviceNameAttr = resourceAttrs.find((a: any) => a.key === 'service.name');
      const serviceName = serviceNameAttr?.value?.stringValue || 'unknown';
      serviceNames.add(serviceName);

      for (const ss of rs.scopeSpans || []) {
        for (const s of ss.spans || []) {
          const traceId = toHex(s.traceId);
          const spanId = toHex(s.spanId);
          const parentSpanId = s.parentSpanId ? toHex(s.parentSpanId) : null;
          if (!parentSpanId) rootServices.add(serviceName);
          
          const startTimeMs = nanosToMillis(s.startTimeUnixNano);
          const endTimeMs = nanosToMillis(s.endTimeUnixNano);
          const durationMs = endTimeMs - startTimeMs;

          const attributes: any = {};
          for (const attr of s.attributes || []) {
            attributes[attr.key] = attr.value?.stringValue ?? attr.value?.intValue ?? attr.value?.boolValue;
          }

          let spanType = 'internal';
          if (s.kind === 2) spanType = 'server';
          else if (s.kind === 3) spanType = 'client';
          else if (s.kind === 4) spanType = 'producer';
          else if (s.kind === 5) spanType = 'consumer';

          const status = s.status?.code === 2 ? 'error' : 'ok';
          // Support both new (http.request.method) and old (http.method) semconv
          const statusCode = attributes['http.response.status_code']
            ? parseInt(attributes['http.response.status_code'], 10)
            : (attributes['http.status_code'] ? parseInt(attributes['http.status_code'], 10) : null);
          const method = attributes['http.request.method'] || attributes['http.method'];
          const path = attributes['url.path'] || attributes['http.target'] || attributes['http.route'];

          // Using the product is enough to teach the platform its API surface.
          // Prefer the templated route so /orders/123 and /orders/456 collapse into one.
          const routeTemplate = attributes['http.route'] || path;
          if (spanType === 'server' && method && routeTemplate) {
            observedEndpoints.push({ serviceName, method: String(method), path: String(routeTemplate) });
          }

          const redactedAttrs = redactSpanAttributes(attributes);

          allSpans.push({
            id: spanId,
            trace_id: traceId,
            parent_span_id: parentSpanId,
            service_name: serviceName,
            operation_name: s.name,
            span_type: spanType,
            start_time: startTimeMs,
            end_time: endTimeMs,
            status,
            status_message: s.status?.message || null,
            attributes: redactedAttrs,
            depth: 0, // Computed later
            order: 0  // Computed later
          });

          if (!parentSpanId || spanType === 'server') {
             if (!tracesMap.has(traceId)) {
                tracesMap.set(traceId, {
                  id: traceId,
                  name: s.name,
                  root_service: serviceName,
                  start_time: startTimeMs,
                  end_time: endTimeMs,
                  status,
                  method,
                  path,
                  status_code: statusCode,
                  request_headers: redactHeaders(attributes['custom.http.request.headers'] ? JSON.parse(attributes['custom.http.request.headers']) : {}),
                  request_body: redactBody(attributes['custom.http.request.body']),
                  response_headers: redactHeaders(attributes['custom.http.response.headers'] ? JSON.parse(attributes['custom.http.response.headers']) : {}),
                  response_body: redactBody(attributes['custom.http.response.body']),
                  response_size: 0,
                  services: new Set<string>([serviceName]),
                  metadata: {}
                });
             } else {
                const existing = tracesMap.get(traceId);
                existing.services.add(serviceName);
                if (!parentSpanId) {
                  existing.root_service = serviceName;
                  existing.name = s.name;
                  existing.start_time = Math.min(existing.start_time, startTimeMs);
                  existing.end_time = Math.max(existing.end_time, endTimeMs);
                  if (status === 'error') existing.status = 'error';
                  if (method) existing.method = method;
                  if (path) existing.path = path;
                  if (statusCode) existing.status_code = statusCode;
                }
             }
          } else {
             const existing = tracesMap.get(traceId);
             if (existing) {
               existing.services.add(serviceName);
               if (status === 'error') existing.status = 'error';
             }
          }

          const peerTarget = attributes['server.address'] || attributes['net.peer.name'];
          if (spanType === 'client' && peerTarget) {
            // Prefer bare service names (net.peer.name = 'auth-service') over host:port
            // ('auth-service:3001') so targets always match entries in the services table.
            const dbSystem = attributes['db.system'];
            const messagingSystem = attributes['messaging.system'];
            // Kind comes from the semantic attributes the caller emitted, never from the name.
            const targetKind = dbSystem
              ? (CACHE_DB_SYSTEMS.has(String(dbSystem).toLowerCase()) ? 'cache' : 'database')
              : messagingSystem ? 'queue' : 'http';
            const depType = String(dbSystem || messagingSystem || 'http');
            const depKey = `${serviceName}->${peerTarget}`;
            if (!dependencies.has(depKey)) {
              dependencies.set(depKey, { source: serviceName, target: peerTarget, type: depType, targetKind });
            }
          }

          for (const event of s.events || []) {
            if (event.name === 'log' || event.name === 'exception') {
               const logAttrs: any = {};
               for (const attr of event.attributes || []) {
                 logAttrs[attr.key] = attr.value?.stringValue ?? attr.value?.intValue ?? attr.value?.boolValue;
               }
               const logTimeMs = nanosToMillis(event.timeUnixNano);
               allLogs.push({
                 trace_id: traceId,
                 span_id: spanId,
                 service_name: serviceName,
                 level: logAttrs['level'] || (event.name === 'exception' ? 'error' : 'info'),
                 message: logAttrs['message'] || event.name,
                 attributes: logAttrs,
                 timestamp: logTimeMs
               });
            }
          }
        }
      }
    }

    const tracesToInsert = Array.from(tracesMap.values()).map(t => ({
      ...t,
      services: Array.from(t.services)
    }));

    // Register ALL services (including dependency targets) BEFORE inserting traces/spans,
    // otherwise service_dependencies FK constraints can fail and drop the whole batch.
    // A service that emits a root span is the entry point; one we only ever see as a
    // call target and never as an instrumented resource is external to the system.
    const serviceKinds = new Map<string, string>();
    for (const name of serviceNames) {
      serviceKinds.set(name, rootServices.has(name) ? 'gateway' : 'service');
    }
    for (const dep of dependencies.values()) {
      if (!serviceKinds.has(dep.target)) {
        serviceKinds.set(dep.target, dep.targetKind === 'http' ? 'external' : dep.targetKind);
      }
    }
    await repo.upsertServices(Array.from(serviceKinds, ([name, kind]) => ({ name, kind })));

    for (const trace of tracesToInsert) {
       await repo.insertTrace(trace);
       wsHandler.broadcastNewRequest(trace);
    }
    
    await repo.insertSpans(allSpans);
    await repo.insertLogEvents(allLogs);
    await repo.upsertDependencies(Array.from(dependencies.values()));
    await recordObservedEndpoints(observedEndpoints);
  }
}
