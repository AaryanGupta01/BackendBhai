import { pool } from '../connection.js';

export class TraceRepository {
  /**
   * A trace is written once per batch that mentions it, and the collector batches on a
   * timer, so the same trace arrives repeatedly and out of order. The entry point's span
   * finishes LAST (it is waiting on everything downstream), so with DO NOTHING the first
   * writer won and a 5s POST /api/orders was permanently recorded as whatever downstream
   * span happened to export first — typically an 8ms /auth/verify.
   *
   * Identity therefore belongs to the root span and only the root span. Everything else
   * merges: the window widens, the service list unions, and an error anywhere makes the
   * trace an error.
   */
  async insertTrace(trace: any) {
    const query = `
      INSERT INTO traces (
        id, name, root_service, start_time, end_time, status, method, path, status_code,
        request_headers, request_body, response_headers, response_body, response_size, services, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        name             = CASE WHEN $17 THEN EXCLUDED.name             ELSE traces.name             END,
        root_service     = CASE WHEN $17 THEN EXCLUDED.root_service     ELSE traces.root_service     END,
        method           = CASE WHEN $17 THEN EXCLUDED.method           ELSE traces.method           END,
        path             = CASE WHEN $17 THEN EXCLUDED.path             ELSE traces.path             END,
        status_code      = CASE WHEN $17 THEN EXCLUDED.status_code      ELSE traces.status_code      END,
        request_headers  = CASE WHEN $17 THEN EXCLUDED.request_headers  ELSE traces.request_headers  END,
        request_body     = CASE WHEN $17 THEN EXCLUDED.request_body     ELSE traces.request_body     END,
        response_headers = CASE WHEN $17 THEN EXCLUDED.response_headers ELSE traces.response_headers END,
        response_body    = CASE WHEN $17 THEN EXCLUDED.response_body    ELSE traces.response_body    END,
        start_time = LEAST(traces.start_time, EXCLUDED.start_time),
        end_time   = GREATEST(traces.end_time, EXCLUDED.end_time),
        status     = CASE WHEN EXCLUDED.status = 'error' OR traces.status = 'error' THEN 'error' ELSE traces.status END,
        services   = ARRAY(SELECT DISTINCT unnest(traces.services || EXCLUDED.services))
    `;
    await pool.query(query, [
      trace.id, trace.name, trace.root_service, trace.start_time, trace.end_time, trace.status, trace.method, trace.path, trace.status_code,
      trace.request_headers, trace.request_body, trace.response_headers, trace.response_body, trace.response_size, trace.services, trace.metadata,
      trace.is_root === true
    ]);
  }

  async insertSpans(spans: any[]) {
    if (!spans || spans.length === 0) return;

    // The collector batches on a timer, so a request's spans routinely split across
    // batches and a batch can carry spans whose trace row was created by neither this
    // batch nor an earlier one (a service's middleware spans arriving before its server
    // span, for instance). Inserting those raises a foreign key violation that rejects
    // the whole HTTP request, and the collector then drops every span in the batch as a
    // permanent failure. Skip the orphans instead and keep the rest.
    const traceIds = Array.from(new Set(spans.map((s) => s.trace_id)));
    const { rows } = await pool.query(
      'SELECT id FROM traces WHERE id = ANY($1::varchar[])',
      [traceIds]
    );
    const known = new Set(rows.map((r: any) => r.id));
    const insertable = spans.filter((s) => known.has(s.trace_id));

    if (insertable.length < spans.length) {
      console.warn(
        `[OtlpReceiver] Skipped ${spans.length - insertable.length} span(s) whose trace has not been recorded yet.`
      );
    }
    if (insertable.length === 0) return;

    const query = `
      INSERT INTO spans (
        id, trace_id, parent_span_id, service_name, operation_name, span_type, start_time, end_time, status, status_message, attributes, depth, "order"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `;
    for (const span of insertable) {
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

  // Services arrive with a kind derived from span attributes at ingest. Evidence that a
  // service is instrumented (it emits its own spans, so gateway/service) always beats a
  // guess made from the calling side, which can otherwise land first and stick.
  async upsertServices(services: { name: string; kind?: string }[]) {
    if (!services || services.length === 0) return;
    const query = `
      INSERT INTO services (name, kind, last_seen)
      VALUES ($1, $2, NOW())
      ON CONFLICT (name) DO UPDATE SET
        last_seen = EXCLUDED.last_seen,
        kind = CASE
          WHEN EXCLUDED.kind IN ('gateway', 'service') THEN EXCLUDED.kind
          WHEN services.kind IN ('gateway', 'service') THEN services.kind
          ELSE COALESCE(EXCLUDED.kind, services.kind)
        END,
        request_count = services.request_count + 1
    `;
    for (const svc of services) {
      await pool.query(query, [svc.name, svc.kind ?? null]);
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
