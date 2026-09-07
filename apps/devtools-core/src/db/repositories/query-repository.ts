import { pool, isDbAvailable } from '../connection.js';
import * as inMemoryStore from '../../fixtures/in-memory-store.js';export class QueryRepository {
  async getRequestsSummary(params: any = {}) {
    if (!isDbAvailable()) {
      return inMemoryStore.getRequestsSummary(params);
    }
    try {
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
      if (typeof ts === 'string' && /^\d+$/.test(ts)) {
         ts = new Date(parseInt(ts, 10)).toISOString();
      } else if (typeof ts === 'number') {
         ts = new Date(ts).toISOString();
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
    } catch (err) {
      console.error(err);
      return inMemoryStore.getRequestsSummary(params);
    }
  }

  private parseJson(val: any) {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }

  private toIsoString(val: any) {
    if (typeof val === 'string' && /^\d+$/.test(val)) return new Date(parseInt(val, 10)).toISOString();
    if (typeof val === 'number') return new Date(val).toISOString();
    if (val instanceof Date) return val.toISOString();
    return new Date(val).toISOString();
  }

  async getTraceById(traceId: string) {
    if (!isDbAvailable()) {
      return inMemoryStore.getTraceById(traceId);
    }
    try {
      const traceQuery = `SELECT * FROM traces WHERE id = $1`;
    const { rows: traceRows } = await pool.query(traceQuery, [traceId]);
    if (traceRows.length === 0) return null;
    const trace = traceRows[0];

    const spanQuery = `SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_time ASC`;
    const { rows: spanRows } = await pool.query(spanQuery, [traceId]);

    const logsQuery = `SELECT * FROM log_events WHERE trace_id = $1 ORDER BY timestamp ASC`;
    const { rows: logRows } = await pool.query(logsQuery, [traceId]);

    const mappedSpans = spanRows.map(span => {
      const attrs = this.parseJson(span.attributes) || {};
      return {
        spanId: span.id,
        parentSpanId: span.parent_span_id,
        service: span.service_name,
        operation: span.operation_name,
        kind: span.span_type,
        startTimestamp: this.toIsoString(span.start_time),
        durationMs: parseInt(span.duration_ms || '0', 10),
        status: span.status === 'error' ? 'ERROR' : 'OK',
        statusCode: attrs['http.response.status_code'] ? parseInt(attrs['http.response.status_code'], 10) : undefined,
        attributes: attrs
      };
    });

    const dbQueries = mappedSpans
      .filter(s => s.attributes['db.system'])
      .map(s => ({
        spanId: s.spanId,
        service: s.service,
        operation: s.attributes['db.operation.name'] || 'DB',
        table: s.attributes['db.sql.table'] || '',
        statement: s.attributes['db.statement'] || '',
        durationMs: s.durationMs,
        status: s.status
      }));

    const externalCalls = mappedSpans
      .filter(s => s.kind === 'client' && s.attributes['http.request.method'])
      .map(s => ({
        spanId: s.spanId,
        service: s.service,
        method: s.attributes['http.request.method'],
        url: s.attributes['url.full'] || '',
        statusCode: s.statusCode,
        durationMs: s.durationMs,
        status: s.status
      }));

    const mappedLogs = logRows.map(l => ({
      timestamp: this.toIsoString(l.timestamp),
      level: l.level,
      service: l.service_name,
      message: l.message,
      traceId: l.trace_id,
      spanId: l.span_id || undefined,
      attributes: this.parseJson(l.attributes) || {}
    }));

      return {
        traceId: trace.id,
        method: trace.method,
        path: trace.path,
        statusCode: trace.status_code,
        durationMs: parseInt(trace.duration_ms || '0', 10),
        timestamp: this.toIsoString(trace.start_time),
        rootService: trace.root_service,
        requestBody: this.parseJson(trace.request_body),
        responseBody: this.parseJson(trace.response_body),
        requestHeaders: this.parseJson(trace.request_headers),
        responseHeaders: this.parseJson(trace.response_headers),
        spans: mappedSpans,
        logs: mappedLogs,
        dbQueries,
        externalCalls
      };
    } catch (err) {
      console.error(err);
      return inMemoryStore.getTraceById(traceId);
    }
  }

  async getTraceWaterfall(traceId: string) {
    if (!isDbAvailable()) {
      return inMemoryStore.getTraceWaterfall(traceId);
    }
    try {
      const traceQuery = `SELECT start_time, duration_ms FROM traces WHERE id = $1`;
    const { rows: traceRows } = await pool.query(traceQuery, [traceId]);
    if (traceRows.length === 0) return null;

    const trace = traceRows[0];
    const traceStart = parseInt(trace.start_time, 10);
    const traceDuration = parseInt(trace.duration_ms || '0', 10);

    const spanQuery = `SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_time ASC`;
    const { rows: spanRows } = await pool.query(spanQuery, [traceId]);

    const idToNode = new Map<string, any>();
    spanRows.forEach(s => {
      idToNode.set(s.id, { ...s, children: [] });
    });

    const rootNodes: any[] = [];
    spanRows.forEach(s => {
      if (s.parent_span_id && idToNode.has(s.parent_span_id)) {
        idToNode.get(s.parent_span_id).children.push(idToNode.get(s.id));
      } else {
        rootNodes.push(idToNode.get(s.id));
      }
    });

    const orderedSpans: any[] = [];
    let currentOrder = 0;

    function traverse(node: any, depth: number) {
      node.computedDepth = depth;
      node.computedOrder = currentOrder++;
      orderedSpans.push(node);
      node.children.forEach((c: any) => traverse(c, depth + 1));
    }

    rootNodes.forEach(r => traverse(r, 0));

    const waterfallSpans = orderedSpans.map(s => {
      const startOffsetMs = parseInt(s.start_time, 10) - traceStart;
      const dur = parseInt(s.duration_ms || '0', 10);
      const attrs = this.parseJson(s.attributes) || {};
      
      return {
        spanId: s.id,
        parentSpanId: s.parent_span_id,
        service: s.service_name,
        operation: s.operation_name,
        kind: s.span_type,
        startOffsetMs: Math.max(0, startOffsetMs),
        durationMs: dur,
        percentageOfTotal: traceDuration > 0 ? Number(((dur / traceDuration) * 100).toFixed(2)) : 0,
        depth: s.computedDepth,
        order: s.computedOrder,
        status: s.status === 'error' ? 'ERROR' : 'OK',
        statusCode: attrs['http.response.status_code'] ? parseInt(attrs['http.response.status_code'], 10) : undefined,
        attributes: attrs
      };
    });

      return {
        traceId,
        totalDurationMs: traceDuration,
        startTimestamp: this.toIsoString(traceStart),
        spans: waterfallSpans
      };
    } catch (err) {
      console.error(err);
      return inMemoryStore.getTraceWaterfall(traceId);
    }
  }

  async getLogsByTraceId(traceId: string) {
    if (!isDbAvailable()) {
      return inMemoryStore.getLogsByTraceId(traceId);
    }
    try {
      const query = `
      SELECT * FROM log_events 
      WHERE trace_id = $1 
      ORDER BY timestamp ASC
    `;
    const { rows } = await pool.query(query, [traceId]);
      return {
        traceId,
        logs: rows.map(l => ({
          timestamp: this.toIsoString(l.timestamp),
          level: l.level,
          service: l.service_name,
          message: l.message,
          traceId: l.trace_id,
          spanId: l.span_id || undefined,
          attributes: this.parseJson(l.attributes) || {}
        }))
      };
    } catch (err) {
      console.error(err);
      return inMemoryStore.getLogsByTraceId(traceId);
    }
  }

  async getTopology() {
    if (!isDbAvailable()) {
      return inMemoryStore.getTopology();
    }
    try {
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
    } catch (err) {
      console.error(err);
      return inMemoryStore.getTopology();
    }
  }
}
