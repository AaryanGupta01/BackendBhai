import { pool } from '../connection.js';

export class QueryRepository {
  async getRequestsSummary() {
    const query = `
      SELECT trace_id, method, path, status_code, status, duration_ms, 
             root_service, services, start_time, created_at, span_count, log_count, error_count
      FROM request_summary
      ORDER BY start_time DESC
      LIMIT 100
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  async getTraceById(traceId: string) {
    const traceQuery = `SELECT * FROM traces WHERE id = $1`;
    const { rows: traceRows } = await pool.query(traceQuery, [traceId]);
    if (traceRows.length === 0) return null;

    const spanQuery = `SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_time ASC`;
    const { rows: spanRows } = await pool.query(spanQuery, [traceId]);

    const trace = traceRows[0];
    return {
      trace,
      spans: spanRows
    };
  }

  async getLogsByTraceId(traceId: string) {
    const query = `
      SELECT * FROM log_events 
      WHERE trace_id = $1 
      ORDER BY timestamp ASC
    `;
    const { rows } = await pool.query(query, [traceId]);
    return rows;
  }

  async getTopology() {
    const nodesQuery = `SELECT name as id, name as label, request_count, error_count, avg_duration_ms FROM services`;
    const edgesQuery = `
      SELECT source_service as source, target_service as target, request_count, error_count, avg_duration_ms 
      FROM service_dependencies
    `;
    
    const [nodesRes, edgesRes] = await Promise.all([
      pool.query(nodesQuery),
      pool.query(edgesQuery)
    ]);
    
    return {
      nodes: nodesRes.rows,
      edges: edgesRes.rows
    };
  }
}
