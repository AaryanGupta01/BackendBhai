import { Pool } from 'pg';

export class QueryRepository {
  private pool: Pool;
  private static instance: QueryRepository;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  static getInstance(pool?: Pool): QueryRepository {
    if (!QueryRepository.instance) {
      if (!pool) throw new Error('Pool required for first initialization');
      QueryRepository.instance = new QueryRepository(pool);
    }
    return QueryRepository.instance;
  }

  private parseJson(val: any): any {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return val; }
  }

  private toIsoString(val: any): string {
    if (!val) return new Date().toISOString();
    if (typeof val === 'string' && val.includes('T')) return val;
    // If it's nanoseconds (number string), convert to ms then ISO
    const n = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(n)) return new Date().toISOString();
    // If > 1e12, it's likely nanoseconds
    const ms = n > 1e12 ? Math.floor(n / 1e6) : n;
    return new Date(ms).toISOString();
  }

  async getRequestsSummary(params: any = {}) {
    const { page = 1, limit = 50, method, status, search } = params;
    const offset = (page - 1) * limit;
    
    let where = '1=1';
    const args: any[] = [];
    let idx = 1;

    if (method) { where += ` AND t.method = $${idx++}`; args.push(method); }
    if (status) { where += ` AND t.status_code = $${idx++}`; args.push(parseInt(status, 10)); }
    if (search) { where += ` AND (t.path ILIKE $${idx} OR t.root_service ILIKE $${idx})`; args.push(`%${search}%`); idx++; }

    const countQ = `SELECT COUNT(*) as total FROM traces t WHERE ${where}`;
    const { rows: countRows } = await this.pool.query(countQ, args);
    const total = parseInt(countRows[0].total, 10);

    const dataQ = `
      SELECT t.id as trace_id, t.method, t.path, t.status_code, t.duration_ms,
             t.start_time as timestamp, t.root_service,
             CASE WHEN t.status_code >= 400 THEN true ELSE false END as has_error,
             (SELECT array_agg(DISTINCT s.service_name) FROM spans s WHERE s.trace_id = t.id) as services
      FROM traces t
      WHERE ${where}
      ORDER BY t.start_time DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    args.push(limit, offset);
    const { rows } = await this.pool.query(dataQ, args);

    return {
      data: rows.map(r => ({
        traceId: r.trace_id,
        method: r.method,
        path: r.path,
        statusCode: r.status_code,
        durationMs: parseInt(r.duration_ms || '0', 10),
        timestamp: this.toIsoString(r.timestamp),
        services: r.services || [],
        rootService: r.root_service,
        hasError: r.has_error,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async getTraceById(traceId: string) {
    const traceQuery = `SELECT * FROM traces WHERE id = $1`;
    const { rows: traceRows } = await this.pool.query(traceQuery, [traceId]);
    if (traceRows.length === 0) return null;
    const trace = traceRows[0];

    const spanQuery = `SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_time ASC`;
    const { rows: spanRows } = await this.pool.query(spanQuery, [traceId]);

    const logsQuery = `SELECT * FROM log_events WHERE trace_id = $1 ORDER BY timestamp ASC`;
    const { rows: logRows } = await this.pool.query(logsQuery, [traceId]);

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

    // Extract unique services from spans
    const services = [...new Set(mappedSpans.map(s => s.service).filter(Boolean))];

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
      services,
      spans: mappedSpans,
      logs: mappedLogs,
      dbQueries,
      externalCalls
    };
  }

  async getTraceWaterfall(traceId: string) {
    const traceQuery = `SELECT start_time, duration_ms FROM traces WHERE id = $1`;
    const { rows: traceRows } = await this.pool.query(traceQuery, [traceId]);
    if (traceRows.length === 0) return null;

    const trace = traceRows[0];
    const traceStart = parseInt(trace.start_time, 10);
    const traceDuration = parseInt(trace.duration_ms || '0', 10);

    const spanQuery = `SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_time ASC`;
    const { rows: spanRows } = await this.pool.query(spanQuery, [traceId]);

    const idToNode = new Map<string, any>();
    spanRows.forEach(s => {
      idToNode.set(s.id, { ...s, children: [] });
    });

    const rootNodes: any[] = [];
    spanRows.forEach(s => {
      const node = idToNode.get(s.id);
      if (s.parent_span_id && idToNode.has(s.parent_span_id)) {
        idToNode.get(s.parent_span_id).children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Compute depth and build flat list
    const flatList: any[] = [];
    let order = 0;
    const self = this;
    function traverse(nodes: any[], depth: number) {
      nodes.forEach(n => {
        const attrs = idToNode.get(n.id) ? self.parseJson(n.attributes) || {} : {};
        flatList.push({
          spanId: n.id,
          parentSpanId: n.parent_span_id,
          service: n.service_name,
          operation: n.operation_name,
          kind: n.span_type,
          startOffsetMs: traceStart > 0 ? Math.max(0, Math.floor((parseInt(n.start_time, 10) - traceStart) / 1e6)) : 0,
          durationMs: parseInt(n.duration_ms || '0', 10),
          percentageOfTotal: traceDuration > 0 ? Math.min(100, Math.round((parseInt(n.duration_ms || '0', 10) / traceDuration) * 100)) : 0,
          depth,
          order: order++,
          status: n.status === 'error' ? 'ERROR' : 'OK',
          statusCode: attrs['http.response.status_code'] ? parseInt(attrs['http.response.status_code'], 10) : undefined,
          attributes: attrs
        });
        if (n.children?.length) traverse(n.children, depth + 1);
      });
    }
    traverse(rootNodes, 0);

    return {
      traceId,
      totalDurationMs: traceDuration,
      startTimestamp: this.toIsoString(trace.start_time),
      spans: flatList
    };
  }

  async getLogsByTraceId(traceId: string) {
    const query = `SELECT * FROM log_events WHERE trace_id = $1 ORDER BY timestamp ASC`;
    const { rows } = await this.pool.query(query, [traceId]);
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
  }

  async getTopology() {
    const nodesQuery = `
      SELECT root_service as id, root_service as label,
             COUNT(*) as request_count,
             SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
             AVG(duration_ms) as avg_duration_ms
      FROM traces GROUP BY root_service
    `;
    const { rows: nodes } = await this.pool.query(nodesQuery);

    const edgesQuery = `
      SELECT source_service as source, target_service as target,
             request_count, error_count, avg_duration_ms
      FROM service_dependencies
    `;
    const { rows: edges } = await this.pool.query(edgesQuery);

    return { data: { nodes, edges } };
  }
}

// Lazy init singleton
let pool: Pool | null = null;
let repo: QueryRepository | null = null;

export function initRepository(p: Pool) {
  pool = p;
  repo = QueryRepository.getInstance(p);
}

export function getRepository(): QueryRepository {
  if (!repo) throw new Error('Repository not initialized');
  return repo;
}
