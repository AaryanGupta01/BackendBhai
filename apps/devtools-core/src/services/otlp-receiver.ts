import { TraceRepository } from '../db/repositories/trace-repository.js';
import { redactSpanAttributes, redactHeaders, redactBody } from './redactor.js';
import { wsHandler } from '../ws/handler.js';

const repo = new TraceRepository();

export class OtlpReceiver {
  async processOtlpTraces(payload: any) {
    if (!payload?.resourceSpans) return;

    const tracesMap = new Map<string, any>();
    const allSpans: any[] = [];
    const allLogs: any[] = [];
    const serviceNames = new Set<string>();
    const dependencies = new Map<string, { source: string, target: string, type: string }>();

    for (const rs of payload.resourceSpans) {
      const resourceAttrs = rs.resource?.attributes || [];
      const serviceNameAttr = resourceAttrs.find((a: any) => a.key === 'service.name');
      const serviceName = serviceNameAttr?.value?.stringValue || 'unknown';
      serviceNames.add(serviceName);

      for (const ss of rs.scopeSpans || []) {
        for (const s of ss.spans || []) {
          const traceId = s.traceId;
          const spanId = s.spanId;
          const parentSpanId = s.parentSpanId || null;
          
          const startTimeMs = Math.floor(parseInt(s.startTimeUnixNano || '0', 10) / 1000000);
          const endTimeMs = Math.floor(parseInt(s.endTimeUnixNano || '0', 10) / 1000000);
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
          const statusCode = attributes['http.response.status_code'] ? parseInt(attributes['http.response.status_code'], 10) : null;
          const method = attributes['http.request.method'] || attributes['http.method'];
          const path = attributes['url.path'] || attributes['http.target'];

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

          if (spanType === 'client' && attributes['server.address']) {
            const targetService = attributes['server.address'];
            const depKey = `${serviceName}->${targetService}`;
            if (!dependencies.has(depKey)) {
               dependencies.set(depKey, { source: serviceName, target: targetService, type: 'http' });
            }
          }

          for (const event of s.events || []) {
            if (event.name === 'log' || event.name === 'exception') {
               const logAttrs: any = {};
               for (const attr of event.attributes || []) {
                 logAttrs[attr.key] = attr.value?.stringValue ?? attr.value?.intValue ?? attr.value?.boolValue;
               }
               const logTimeMs = Math.floor(parseInt(event.timeUnixNano || '0', 10) / 1000000);
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

    for (const trace of tracesToInsert) {
       await repo.insertTrace(trace);
       wsHandler.broadcastNewRequest(trace);
    }
    
    await repo.insertSpans(allSpans);
    await repo.insertLogEvents(allLogs);
    await repo.upsertServices(Array.from(serviceNames));
    await repo.upsertDependencies(Array.from(dependencies.values()));
  }
}
