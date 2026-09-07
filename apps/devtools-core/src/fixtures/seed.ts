import { pool } from '../db/connection.js';
import { SEED_SERVICES, SEED_SERVICE_DEPS, SEED_TRACES, SEED_TRACE_DETAILS } from './in-memory-store.js';

export async function seedIfEmpty() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COUNT(*) as count FROM traces');
    if (parseInt(rows[0].count) > 0) {
      console.log('Database already seeded');
      return;
    }

    console.log('Seeding database from in-memory-store...');

    // Insert services
    for (const srv of SEED_SERVICES) {
      await client.query(
        `INSERT INTO services (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [srv.name]
      );
    }

    // Insert service dependencies
    for (const dep of SEED_SERVICE_DEPS) {
      await client.query(
        `INSERT INTO service_dependencies (source_service, target_service, dependency_type)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [dep.source, dep.target, dep.type]
      );
    }

    // Insert traces
    for (const t of SEED_TRACE_DETAILS.values()) {
      await client.query(
        `INSERT INTO traces (id, name, root_service, start_time, end_time, status, method, path, status_code, request_headers, request_body, response_headers, response_body, services)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          t.traceId,
          t.name,
          t.rootService,
          t.startTime,
          t.endTime,
          t.statusCode && t.statusCode >= 400 ? 'error' : 'ok',
          t.method,
          t.path,
          t.statusCode,
          t.requestHeaders,
          JSON.stringify(t.requestBody),
          t.responseHeaders,
          JSON.stringify(t.responseBody),
          SEED_TRACES.find(st => st.traceId === t.traceId)?.services || []
        ]
      );

      // Insert spans
      for (const s of t.spans) {
        await client.query(
          `INSERT INTO spans (id, trace_id, parent_span_id, service_name, operation_name, span_type, start_time, end_time, status, depth, "order")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            s.spanId,
            t.traceId,
            s.parentSpanId,
            s.service,
            s.operation,
            s.kind,
            s.startTime,
            s.endTime,
            s.status.toLowerCase(),
            s.depth,
            s.order
          ]
        );
      }

      // Insert log events
      if (t.logs) {
        for (const l of t.logs) {
          await client.query(
            `INSERT INTO log_events (trace_id, span_id, service_name, level, message, attributes, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              t.traceId,
              l.spanId,
              l.service,
              l.level,
              l.message,
              l.attributes,
              l.time
            ]
          );
        }
      }
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    client.release();
  }
}

// Run directly
const currentFileUrl = import.meta.url;
if (process.argv[1] && currentFileUrl.includes(process.argv[1].replace(/\\\\/g, '/').split('/').pop() || '')) {
  seedIfEmpty()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
