import { pool } from '../connection.js';

export class QueryRepository {
  async getRequestsSummary(params: any = {}) {
    let {
      page = 1,
      limit = 50,
      method,
      status,
      service,
      search,
      minDuration,
      maxDuration,
      sort = 'timestamp',
      order = 'desc'
    } = params;

    page = Math.max(1, parseInt(page as any, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit as any, 10) || 50));
    
    const conditions = [];
    const values: any[] = [];
    let paramCount = 1;

    if (method) {
      conditions.push(`method = $${paramCount++}`);
      values.push(method.toUpperCase());
    }

    if (status) {
      const classMatch = status.match(/^([2345])xx$/i);
      if (classMatch) {
        const base = parseInt(classMatch[1], 10) * 100;
        conditions.push(`status_code >= $${paramCount++} AND status_code < $${paramCount++}`);
        values.push(base, base + 100);
      } else {
        const exactCode = parseInt(status, 10);
        if (!isNaN(exactCode)) {
           conditions.push(`status_code = $${paramCount++}`);
           values.push(exactCode);
        }
      }
    }

    if (service) {
      conditions.push(`$${paramCount++} = ANY(services)`);
      values.push(service);
    }

    if (search) {
      conditions.push(`path ILIKE $${paramCount++}`);
      values.push(`%${search}%`);
    }

    if (minDuration) {
      conditions.push(`duration_ms >= $${paramCount++}`);
      values.push(parseInt(minDuration, 10));
    }
    if (maxDuration) {
      conditions.push(`duration_ms <= $${paramCount++}`);
      values.push(parseInt(maxDuration, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts: Record<string, string> = {
      timestamp: 'start_time',
      duration: 'duration_ms',
      status: 'status_code'
    };
    const sortField = allowedSorts[sort] || 'start_time';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) FROM request_summary ${whereClause}`;
    const dataQuery = `
      SELECT trace_id, method, path, status_code, status, duration_ms, 
             root_service, services, start_time, created_at, span_count, log_count, error_count
      FROM request_summary
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    const countValues = values.slice();
    values.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(countQuery, countValues),
      pool.query(dataQuery, values)
    ]);

    const total = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const data = dataRes.rows.map(row => {
      let ts = row.start_time;
      if (typeof ts === 'string' && /^\\d+$/.test(ts)) {
         ts = new Date(parseInt(ts, 10)).toISOString();
      } else if (ts instanceof Date) {
         ts = ts.toISOString();
      } else {
         try {
           ts = new Date(ts).toISOString();
         } catch(e) {
           ts = new Date().toISOString();
         }
      }

      return {
        traceId: row.trace_id,
        method: row.method,
        path: row.path,
        statusCode: row.status_code,
        durationMs: row.duration_ms,
        timestamp: ts,
        services: row.services || [],
        rootService: row.root_service,
        hasError: row.status_code >= 400 || row.error_count > 0
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
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
