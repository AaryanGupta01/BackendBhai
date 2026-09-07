import { pool, requireDb } from '../connection.js';

export class QueryRepository {
  async getRequestsSummary(params: any = {}) {
    requireDb();
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
      throw err;
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
    requireDb();
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
      throw err;
    }
  }

  async getTraceWaterfall(traceId: string) {
    requireDb();
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
      throw err;
    }
  }

  async getLogsByTraceId(traceId: string) {
    requireDb();
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
      throw err;
    }
  }

  // Topology is derived entirely from observed telemetry. Nodes come from the services
  // registry (which includes call targets that never emit spans of their own, e.g. a
  // database), and edges are aggregated from client spans, so latency is measured rather
  // than taken from counters that nothing maintains.
  async getTopology() {
    const nodesQuery = `
      SELECT sv.name AS id,
             sv.name AS label,
             sv.kind,
             COALESCE(agg.span_count, 0)::int      AS span_count,
             COALESCE(agg.error_count, 0)::int     AS error_count,
             COALESCE(agg.avg_duration_ms, 0)::int AS avg_duration_ms,
             COALESCE(agg.p95_duration_ms, 0)::int AS p95_duration_ms
      FROM services sv
      LEFT JOIN (
        SELECT service_name,
               COUNT(*) AS span_count,
               COUNT(*) FILTER (WHERE status = 'error') AS error_count,
               ROUND(AVG(duration_ms)) AS avg_duration_ms,
               ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)) AS p95_duration_ms
        FROM spans
        -- Server spans only. A service also emits hundreds of 0ms Express middleware
        -- spans and client spans that double-count downstream time; averaging those in
        -- produced figures like '192ms avg, p95 39ms', which are arithmetically correct
        -- and describe nothing anyone wants to know. A server span is one request this
        -- service handled, which is the number the graph is asking about.
        WHERE span_type = 'server'
        GROUP BY service_name
      ) agg ON agg.service_name = sv.name
      ORDER BY sv.name
    `;

    const edgesQuery = `
      SELECT s.service_name AS source,
             COALESCE(s.attributes->>'server.address', s.attributes->>'net.peer.name') AS target,
             COUNT(*)::int AS request_count,
             COUNT(*) FILTER (WHERE s.status = 'error')::int AS error_count,
             ROUND(AVG(s.duration_ms))::int AS avg_duration_ms,
             ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY s.duration_ms))::int AS p95_duration_ms
      FROM spans s
      WHERE s.span_type = 'client'
        AND COALESCE(s.attributes->>'server.address', s.attributes->>'net.peer.name') IS NOT NULL
      GROUP BY 1, 2
    `;

    const [nodesRes, edgesRes] = await Promise.all([
      pool.query(nodesQuery),
      pool.query(edgesQuery)
    ]);

    // A service that emits root spans looks like an entry point, but anything called
    // directly (a health probe on its own port, say) also produces root spans. The
    // real entry point is the one nothing else calls, so inbound edges decide it.
    const calledByOthers = new Set(edgesRes.rows.map((e: any) => e.target));

    return {
      nodes: nodesRes.rows.map((n: any) => ({
        id: n.id,
        label: n.label,
        kind:
          n.kind === 'gateway' || n.kind === 'service'
            ? calledByOthers.has(n.id)
              ? 'service'
              : 'gateway'
            : n.kind || null,
        spanCount: n.span_count,
        errorCount: n.error_count,
        avgDurationMs: n.avg_duration_ms,
        p95DurationMs: n.p95_duration_ms
      })),
      edges: edgesRes.rows.map((e: any) => ({
        source: e.source,
        target: e.target,
        requestCount: e.request_count,
        errorCount: e.error_count,
        avgDurationMs: e.avg_duration_ms,
        p95DurationMs: e.p95_duration_ms
      }))
    };
  }

  // Per-service walk of a trace, ordered by first span start. Phase 0 recovery of
  // work that survived only as compiled dist output.
  async getTracePath(traceId: string) {
    const spans = await pool.query(
      'SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_time ASC',
      [traceId]
    );
    if (spans.rows.length === 0) return null;

    // Exclusive (self) time: a span's own duration minus the time spent inside its
    // children. Without it a gateway looks slow when it is only awaiting a downstream
    // call, and every hop in the trace reports the same total.
    const childDurationByParent = new Map<string, number>();
    for (const s of spans.rows) {
      if (!s.parent_span_id) continue;
      const d = parseInt(s.duration_ms || '0', 10);
      childDurationByParent.set(s.parent_span_id, (childDurationByParent.get(s.parent_span_id) || 0) + d);
    }
    const selfTimeOf = (s: any) =>
      Math.max(0, parseInt(s.duration_ms || '0', 10) - (childDurationByParent.get(s.id) || 0));

    const orderedServices: string[] = [];
    const svcMap = new Map<string, { firstSpan: any; lastSpan: any; spanCount: number; errorCount: number }>();

    for (const s of spans.rows) {
      const isInternalNoise = s.span_type === 'internal' && String(s.operation_name).indexOf('/internal') === 0;
      if (isInternalNoise) continue;

      const existing = svcMap.get(s.service_name);
      if (!existing) {
        svcMap.set(s.service_name, {
          firstSpan: s,
          lastSpan: s,
          spanCount: 1,
          // counted here too, otherwise an error on a service's first span is lost
          errorCount: s.status === 'error' ? 1 : 0
        });
        orderedServices.push(s.service_name);
      } else {
        existing.spanCount += 1;
        if (s.status === 'error') existing.errorCount += 1;
        existing.lastSpan = s;
      }
    }

    const path = orderedServices.map((serviceName, idx) => {
      const entry = svcMap.get(serviceName)!;
      const { firstSpan, lastSpan } = entry;
      const serviceRows = spans.rows.filter((s: any) => s.service_name === serviceName);
      const ops = serviceRows.map((s: any) => ({
        id: s.operation_name,
        label: s.operation_name,
        kind: s.span_type,
        status: s.status,
        durationMs: parseInt(s.duration_ms || '0', 10),
        selfTimeMs: selfTimeOf(s)
      }));
      const representativeOp =
        ops.find((o: any) => o.kind === 'server') ?? ops.find((o: any) => o.kind === 'client') ?? ops[0];

      // Spans of one service frequently share a start_time to the millisecond, so the
      // last span in start order is not the one that finishes last (it's often a 0ms
      // tcp.connect). The service window must come from min(start) and max(end).
      const minStart = Math.min(...serviceRows.map((s: any) => Number(s.start_time)));
      const maxEnd = Math.max(...serviceRows.map((s: any) => Number(s.end_time)));

      return {
        id: serviceName,
        label: serviceName,
        serviceName,
        representativeOperation: representativeOp ? representativeOp.id : '',
        isBusinessOperation: !!representativeOp,
        spanCount: entry.spanCount,
        errorCount: entry.errorCount,
        firstSpanStart: this.toIsoString(minStart),
        lastSpanEnd: this.toIsoString(maxEnd),
        totalDurationMs: Math.max(0, maxEnd - minStart),
        selfTimeMs: serviceRows.reduce((sum: number, s: any) => sum + selfTimeOf(s), 0),
        status: entry.errorCount > 0 ? 'error' : 'ok',
        order: idx,
        depth: idx,
        representativeSpan: firstSpan
          ? {
              spanId: firstSpan.id,
              operationName: firstSpan.operation_name,
              spanType: firstSpan.span_type,
              status: firstSpan.status,
              startTime: firstSpan.start_time,
              endTime: maxEnd,
              durationMs: parseInt(firstSpan.duration_ms || '0', 10)
            }
          : null,
        operations: ops
      };
    });

    return { traceId, path };
  }

  async getTraceNodeDetail(traceId: string, nodeId: string, nodeType: string = 'service') {
    const spans = await pool.query(
      'SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_time ASC',
      [traceId]
    );
    const logs = await pool.query(
      'SELECT * FROM log_events WHERE trace_id = $1 ORDER BY timestamp ASC',
      [traceId]
    );

    const relevantSpans =
      nodeType === 'endpoint'
        ? spans.rows.filter((s: any) => s.service_name === nodeId && s.operation_name != null)
        : spans.rows.filter((s: any) => s.service_name === nodeId);
    if (relevantSpans.length === 0) return null;

    const firstSpan = relevantSpans[0];
    const lastSpan = relevantSpans[relevantSpans.length - 1];
    const totalDurationMs = Math.max(0, (lastSpan.end_time || firstSpan.end_time) - (firstSpan.start_time || 0));
    const errors = relevantSpans.filter((s: any) => s.status === 'error');

    return {
      nodeId: firstSpan.service_name,
      nodeType,
      serviceName: firstSpan.service_name,
      operationName: nodeType === 'endpoint' ? firstSpan.operation_name || undefined : undefined,
      spanCount: relevantSpans.length,
      firstSpanStart: this.toIsoString(firstSpan.start_time),
      lastSpanEnd: this.toIsoString(lastSpan.end_time),
      totalDurationMs,
      status: errors.length > 0 ? 'error' : 'ok',
      errorCount: errors.length,
      spans: relevantSpans.map((s: any) => ({
        spanId: s.id,
        operationName: s.operation_name,
        spanType: s.span_type,
        status: s.status,
        startTime: this.toIsoString(s.start_time),
        endTime: this.toIsoString(s.end_time),
        durationMs: parseInt(s.duration_ms || '0', 10),
        attributes: this.parseJson(s.attributes) || {}
      })),
      logs: logs.rows.map((l: any) => ({
        timestamp: this.toIsoString(l.timestamp),
        level: l.level,
        service: l.service_name,
        message: l.message,
        spanId: l.span_id || undefined,
        attributes: this.parseJson(l.attributes) || {}
      }))
    };
  }

  async getTraceSummary(traceId: string) {
    const trace = await pool.query(
      'SELECT id, root_service, method, path, status, status_code, duration_ms, start_time, end_time FROM traces WHERE id = $1',
      [traceId]
    );
    if (trace.rows.length === 0) return null;
    const t = trace.rows[0];

    const path = await this.getTracePath(traceId);
    const services = new Set<string>();
    const serviceDetails: Record<string, { durationMs: number; errorCount: number; spanCount: number }> = {};
    let errorCount = 0;

    if (path) {
      for (const step of path.path) {
        services.add(step.serviceName);
        const entry = serviceDetails[step.serviceName] ?? { durationMs: 0, errorCount: 0, spanCount: 0 };
        entry.durationMs = Math.max(entry.durationMs, step.totalDurationMs);
        entry.spanCount += 1;
        if (step.status === 'error') {
          entry.errorCount += 1;
          errorCount += 1;
        }
        serviceDetails[step.serviceName] = entry;
      }
    }

    return {
      traceId: t.id,
      rootService: t.root_service,
      method: t.method,
      path: t.path,
      status: t.status,
      statusCode: t.status_code,
      totalDurationMs: parseInt(t.duration_ms || '0', 10),
      timestamp: this.toIsoString(t.start_time),
      serviceCount: services.size,
      errorCount,
      services: Array.from(services),
      serviceDetails
    };
  }

  // Everything needed to re-issue a recorded request. The target origin comes from the
  // root server span, so replay follows whichever product emitted the telemetry rather
  // than a hard-coded demo URL.
  async getReplayRequest(traceId: string) {
    requireDb();
    const trace = await pool.query(
      'SELECT id, method, path, request_headers, request_body FROM traces WHERE id = $1',
      [traceId]
    );
    if (trace.rows.length === 0) return null;
    const t = trace.rows[0];

    const span = await pool.query(
      `SELECT attributes FROM spans
       WHERE trace_id = $1 AND span_type = 'server'
       ORDER BY start_time ASC LIMIT 1`,
      [traceId]
    );
    const attrs: any = span.rows[0] ? this.parseJson(span.rows[0].attributes) || {} : {};

    let origin: string | null = null;
    const fullUrl = attrs['http.url'] || attrs['url.full'];
    if (fullUrl) {
      try {
        origin = new URL(String(fullUrl)).origin;
      } catch {
        origin = null;
      }
    }
    if (!origin) {
      const scheme = attrs['url.scheme'] || attrs['http.scheme'] || 'http';
      const host = attrs['http.host'] || attrs['server.address'] || attrs['net.host.name'];
      const port = attrs['net.host.port'] || attrs['server.port'];
      if (host) {
        const hasPort = String(host).includes(':');
        origin = `${scheme}://${host}${!hasPort && port ? ':' + port : ''}`;
      }
    }

    return {
      traceId: t.id,
      method: t.method || 'GET',
      path: t.path || '/',
      origin,
      headers: this.parseJson(t.request_headers) || {},
      body: t.request_body ?? null
    };
  }
}

export function getRepository(): QueryRepository {
  return new QueryRepository();
}
