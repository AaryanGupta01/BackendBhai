import { pool } from '../connection.js';

export class TraceRepository {
  async insertTrace(trace: any) {
    const query = `
      INSERT INTO traces (
        id, name, root_service, start_time, end_time, status, method, path, status_code, 
        request_headers, request_body, response_headers, response_body, response_size, services, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING
    `;
    await pool.query(query, [
      trace.id, trace.name, trace.root_service, trace.start_time, trace.end_time, trace.status, trace.method, trace.path, trace.status_code,
      trace.request_headers, trace.request_body, trace.response_headers, trace.response_body, trace.response_size, trace.services, trace.metadata
    ]);
  }

  async insertSpans(spans: any[]) {
    if (!spans || spans.length === 0) return;
    const query = `
      INSERT INTO spans (
        id, trace_id, parent_span_id, service_name, operation_name, span_type, start_time, end_time, status, status_message, attributes, depth, "order"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `;
    for (const span of spans) {
      await pool.query(query, [
        span.id, span.trace_id, span.parent_span_id, span.service_name, span.operation_name, span.span_type, span.start_time, span.end_time, span.status, span.status_message, span.attributes, span.depth, span.order
      ]);
    }
  }

  async insertLogEvents(logs: any[]) {
    if (!logs || logs.length === 0) return;
    const query = `
      INSERT INTO log_events (trace_id, span_id, service_name, level, message, attributes, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (trace_id, span_id, timestamp, message) DO NOTHING
    `;
    for (const log of logs) {
      await pool.query(query, [
        log.trace_id, log.span_id, log.service_name, log.level, log.message, log.attributes, log.timestamp
      ]);
    }
  }

  async upsertServices(serviceNames: string[]) {
    if (!serviceNames || serviceNames.length === 0) return;
    const query = `
      INSERT INTO services (name, last_seen)
      VALUES ($1, NOW())
      ON CONFLICT (name) DO UPDATE SET
        last_seen = EXCLUDED.last_seen,
        request_count = services.request_count + 1
    `;
    for (const name of serviceNames) {
      await pool.query(query, [name]);
    }
  }

  async upsertDependencies(deps: { source: string, target: string, type: string }[]) {
    if (!deps || deps.length === 0) return;
    const query = `
      INSERT INTO service_dependencies (source_service, target_service, dependency_type, request_count)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (source_service, target_service, dependency_type) DO UPDATE SET
        request_count = service_dependencies.request_count + 1
    `;
    for (const dep of deps) {
      // Defensive: skip dependencies referencing unknown services instead of
      // failing (FK violation) and dropping the entire OTLP batch.
      try {
        await pool.query(query, [dep.source, dep.target, dep.type]);
      } catch (err: any) {
        if (err?.code === '23503') {
          console.warn(`[TraceRepository] Skipping dependency with unknown service: ${dep.source} -> ${dep.target}`);
          continue;
        }
        throw err;
      }
    }
  }
}
