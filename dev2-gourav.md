# Developer 2 — DevTools Core Platform

> Project: **Backend DevTools** (Hackathon — DevTools & Infra track)
> Team: 5 developers. You are **Dev 2**. Dev 5 (Abhinav) owns integration/architecture/QA and is your escalation point for any contract disagreement.
> Read this whole file before writing code. It is built entirely from the team's 5 planning docs — nothing here is invented scope.

---

## 1. Your mission, in one sentence

You build the **DevTools Server**: the Fastify application that receives telemetry from the OTel Collector, stores it in PostgreSQL, and serves it to the frontend via REST and WebSocket. You are the bridge between Dev 1's simulated backend and Dev 3's UI — literally every screen Dev 3 builds is a rendering of data your APIs return.

## 2. Source documents (read in this order)

1. **`02-implementation-blueprint.md`** — your primary spec, almost in full: **§6 Database Schema**, **§7 API Specification**, **§8 WebSocket Specification**, **§9 Replay Architecture**, **§10 Comparison Architecture**, **§11 Service Topology**, **§12 Security**. All reproduced/expanded below, but this is the source of truth for anything not covered here.
2. **`03-development-backlog.md`** — your task list is **Epic E2 — DevTools Server** (`D-01`–`D-13`), plus you co-own `P-03`/`P-04` (server tests) with Dev 5.
3. **`05-pre-development-audit.md`** — **mandatory reading, not optional**: **§2 Architecture Audit** (all 6 issues concern you directly), **"MUST FIX BEFORE CODING"** (all 5 items), and **§4 Replay Audit**. These sections correct mistakes in the blueprint. Build to the audit's corrected version, not the blueprint's original version, wherever they disagree.
4. **`01-product-research-validation.md`** — skim only, for framing.
5. **`04-ui-ux-implementation-spec.md`** — you don't need this in depth, but skim **§16.2 State Management / React Query hooks** so you know exactly what shape Dev 3 expects from each endpoint.

## 3. Working philosophy — read this before you start

The team's approach is **contract-first, mock-first, failure-isolated, workstream-ownership**. Concretely for you:
- You do not need Dev 1's real services running to start. Hand-construct a synthetic OTLP JSON payload matching the trace/span example records in blueprint §5.2 (reproduced in §6.2 below) and post it straight to your own receiver endpoint to build and test `D-03`–`D-08` before real telemetry exists.
- You do not need Dev 3's frontend to exist to test your APIs — use `curl`/`supertest` against the exact JSON shapes in §6 below.
- The moment Dev 1's Order Service is emitting real traces, **pair with Dev 1** to validate your OTLP receiver against real data — this is called out in the backlog as the single most critical dependency in the entire project (§8 below explains why).

## 4. Scope

### In scope for you
- Fastify server scaffold + health check (`D-01`)
- Database connection + migration runner for the `devtools` database (`D-02`)
- OTLP trace/log receiver (`D-03`)
- Request list API (`D-04`)
- Request detail API (`D-05`)
- Waterfall API (`D-06`)
- Logs API (`D-07`)
- Topology API (`D-08`)
- WebSocket handler (`D-09`)
- Replay service + API (`D-10`)
- Compare service + API (`D-11`)
- Secret redactor, server-side layer (`D-12`)
- Frontend static serving (`D-13`)

### Explicitly NOT yours
- Instrumenting the simulated backend services or the Collector config → **Dev 1** (you only consume what the Collector sends you)
- Any React/UI code → **Dev 3**
- Monorepo/Docker/DB schema files themselves (you write migration *logic* against a schema Dev 4 owns) → **Dev 4**
- `packages/shared` type authorship → **Dev 5** (you consume these)

## 5. Your task list (with Definition of Done, from the backlog)

| ID | Task | Depends on | Complexity | Definition of Done |
|----|------|-----------|------------|---------------------|
| D-01 | Fastify server scaffold | `I-01` (Dev 4), `I-05` (Dev 5) | S | `pnpm --filter devtools-server dev` starts; `curl localhost:4001/health` returns 200 |
| D-02 | DB connection + migration runner | D-01, `I-03` (Dev 4) | M | Server connects to PostgreSQL, creates tables, pool handles concurrent queries |
| D-03 | OTLP trace/log receiver | D-01, D-02, `I-04` (Dev 1) | L | Send a test trace via OTLP → trace + spans + logs appear correctly in PostgreSQL |
| D-04 | Request list API | D-02 | M | `curl /api/v1/requests?page=1&limit=10` returns correct JSON; filters work; < 200ms |
| D-05 | Request detail API | D-02 | M | Full trace + spans + logs + DB queries + external calls, correctly categorized |
| D-06 | Waterfall API | D-02 | S | Offsets/depths/order correct; `start_offset_ms + duration_ms` never exceeds `total_duration_ms` |
| D-07 | Logs API | D-02 | S | `?level=error` returns only error logs for that trace |
| D-08 | Topology API | D-02 | M | Correct nodes (unique services) and edges (cross-service parent-child) |
| D-09 | WebSocket handler | D-03 | M | Client connects; receives `new_request` within 1s of a new trace arriving |
| D-10 | Replay service + API | D-05, S-02 (Dev 1) | L | Valid `trace_id` → new `trace_id` within 5s with correct spans |
| D-11 | Compare service + API | D-05 | M | Two valid trace IDs → correct duration/service/span diffs |
| D-12 | Secret redactor (server-side) | D-03 | S | DB rows show `**REDACTED**`/`***` for sensitive headers/body fields |
| D-13 | Frontend static serving | D-01, F-01 (Dev 3) | S | `curl localhost:4001/` returns HTML; React app loads at the root |

## 6. Exact technical specification

### 6.1 Architecture decision you must implement (frozen by the audit — do not build the original blueprint's version)

The blueprint originally proposed the DevTools server implement a full **OTLP gRPC receiver**. The audit flags this as unnecessarily complex (protobuf deserialization, batch handling, concurrent multi-table writes) and **recommends instead**: the OTel Collector exports via its `otlphttp` exporter to a **plain HTTP endpoint you expose**, receiving already-serialized JSON. Build the simple HTTP version. Agree the exact path (e.g. `/v1/traces`, `/v1/logs`) with Dev 1 on day 1 so their Collector config points at the right place.

Also frozen: the Collector runs as its **own Docker container** (not embedded in your process) — this matches the backlog and Docker Compose, not the blueprint's contradictory "embedded" note.

### 6.2 What a trace/span/log payload looks like (your contract with Dev 1, and your mock-first fixture)

Use these exact shapes to build and test `D-03` before real data exists:

**Trace:**
```json
{
  "id": "5b8efff798038103d269b633813fc60c",
  "name": "POST /api/orders",
  "root_service": "api-gateway",
  "start_time": 1725345600000,
  "end_time": 1725345601234,
  "duration_ms": 1234,
  "status": "ok",
  "method": "POST",
  "path": "/api/orders",
  "status_code": 201,
  "request_headers": { "content-type": "application/json", "authorization": "**REDACTED**" },
  "request_body": "{\"userId\": \"user-42\", \"items\": [{\"id\": \"item-1\", \"qty\": 2}]}",
  "response_headers": { "content-type": "application/json" },
  "response_body": "{\"id\": \"order-789\", \"status\": \"pending\"}",
  "response_size": 256,
  "services": ["api-gateway", "auth-service", "order-service", "payment-service"],
  "metadata": {}
}
```
`request_body`/`response_body` come from the `custom.http.request.body` / `custom.http.response.body` span attributes Dev 1 sets — confirm the exact attribute names with them.

**Span:**
```json
{
  "id": "eee19b7ec3c1b174",
  "trace_id": "5b8efff798038103d269b633813fc60c",
  "parent_span_id": "abc123def456",
  "service_name": "payment-service",
  "operation_name": "POST /charges",
  "span_type": "server",
  "start_time": 1725345600800,
  "end_time": 1725345601050,
  "duration_ms": 250,
  "status": "ok",
  "status_message": null,
  "attributes": { "http.method": "POST", "http.url": "http://mock-payment-api:4000/charges", "http.status_code": 200 },
  "depth": 3,
  "order": 4
}
```

**Log event:**
```json
{
  "trace_id": "5b8efff798038103d269b633813fc60c",
  "service_name": "order-service",
  "level": "info",
  "message": "Order created successfully",
  "attributes": { "order_id": "order-789", "user_id": "user-42" },
  "timestamp": 1725345600950
}
```

### 6.3 Database schema (`db/devtools/001_initial.sql`) — build the migration runner in `D-02` against exactly this

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE traces (
    id              VARCHAR(64) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    root_service    VARCHAR(128) NOT NULL,
    start_time      BIGINT NOT NULL,
    end_time        BIGINT NOT NULL,
    duration_ms     INTEGER GENERATED ALWAYS AS (end_time - start_time) STORED,
    status          VARCHAR(16) NOT NULL DEFAULT 'ok',
    method          VARCHAR(16),
    path            VARCHAR(1024),
    status_code     INTEGER,
    request_headers JSONB DEFAULT '{}',
    request_body    TEXT,
    response_headers JSONB DEFAULT '{}',
    response_body   TEXT,
    response_size   INTEGER,
    services        JSONB DEFAULT '[]',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_traces_root_service ON traces(root_service);
CREATE INDEX idx_traces_status ON traces(status);
CREATE INDEX idx_traces_method ON traces(method);
CREATE INDEX idx_traces_start_time ON traces(start_time DESC);
CREATE INDEX idx_traces_created_at ON traces(created_at DESC);
CREATE INDEX idx_traces_status_code ON traces(status_code);
CREATE INDEX idx_traces_services ON traces USING GIN(services);
CREATE INDEX idx_traces_path ON traces(path);
CREATE INDEX idx_traces_search ON traces
    USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(path, '')));

CREATE TABLE spans (
    id              VARCHAR(64) PRIMARY KEY,
    trace_id        VARCHAR(64) NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    parent_span_id  VARCHAR(64),
    service_name    VARCHAR(128) NOT NULL,
    operation_name  VARCHAR(512) NOT NULL,
    span_type       VARCHAR(32) NOT NULL,
    start_time      BIGINT NOT NULL,
    end_time        BIGINT NOT NULL,
    duration_ms     INTEGER GENERATED ALWAYS AS (end_time - start_time) STORED,
    status          VARCHAR(16) NOT NULL DEFAULT 'ok',
    status_message  TEXT,
    attributes      JSONB DEFAULT '{}',
    depth           INTEGER DEFAULT 0,
    "order"         INTEGER DEFAULT 0
);
CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_parent_span_id ON spans(parent_span_id);
CREATE INDEX idx_spans_service_name ON spans(service_name);
CREATE INDEX idx_spans_status ON spans(status);
CREATE INDEX idx_spans_span_type ON spans(span_type);
CREATE INDEX idx_spans_trace_service ON spans(trace_id, service_name);
CREATE INDEX idx_spans_start_time ON spans(start_time);
CREATE INDEX idx_spans_attributes ON spans USING GIN(attributes);

CREATE TABLE span_events (
    id SERIAL PRIMARY KEY,
    span_id VARCHAR(64) NOT NULL REFERENCES spans(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    attributes JSONB DEFAULT '{}'
);
CREATE INDEX idx_span_events_span_id ON span_events(span_id);

CREATE TABLE log_events (
    id SERIAL PRIMARY KEY,
    trace_id VARCHAR(64) REFERENCES traces(id) ON DELETE SET NULL,
    service_name VARCHAR(128) NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    attributes JSONB DEFAULT '{}',
    "timestamp" BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_log_events_trace_id ON log_events(trace_id);
CREATE INDEX idx_log_events_service_name ON log_events(service_name);
CREATE INDEX idx_log_events_level ON log_events(level);
CREATE INDEX idx_log_events_timestamp ON log_events("timestamp" DESC);
CREATE INDEX idx_log_events_trace_service ON log_events(trace_id, service_name);
CREATE INDEX idx_log_events_message ON log_events USING GIN(to_tsvector('english', message));

CREATE TABLE services (
    name VARCHAR(128) PRIMARY KEY,
    version VARCHAR(64) DEFAULT '1.0.0',
    environment VARCHAR(64) DEFAULT 'hackathon-demo',
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms NUMERIC(10,2) DEFAULT 0,
    last_seen TIMESTAMPTZ,
    first_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_dependencies (
    id SERIAL PRIMARY KEY,
    source_service VARCHAR(128) NOT NULL REFERENCES services(name),
    target_service VARCHAR(128) NOT NULL REFERENCES services(name),
    dependency_type VARCHAR(32) NOT NULL,
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms NUMERIC(10,2) DEFAULT 0,
    protocol VARCHAR(32),
    UNIQUE(source_service, target_service, dependency_type)
);
CREATE INDEX idx_service_deps_source ON service_dependencies(source_service);
CREATE INDEX idx_service_deps_target ON service_dependencies(target_service);

CREATE TABLE replay_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_trace_id VARCHAR(64) NOT NULL REFERENCES traces(id),
    replay_trace_id VARCHAR(64) REFERENCES traces(id),
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    request_snapshot JSONB NOT NULL,
    overrides JSONB DEFAULT '{}',
    original_duration_ms INTEGER,
    replay_duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_replay_sessions_original ON replay_sessions(original_trace_id);
CREATE INDEX idx_replay_sessions_status ON replay_sessions(status);
CREATE INDEX idx_replay_sessions_created ON replay_sessions(created_at DESC);

-- Powers the Request Explorer (D-04)
CREATE VIEW request_summary AS
SELECT
    t.id AS trace_id, t.method, t.path, t.status_code, t.status, t.duration_ms,
    t.root_service, t.services, t.start_time, t.created_at,
    (SELECT COUNT(*) FROM spans s WHERE s.trace_id = t.id) AS span_count,
    (SELECT COUNT(*) FROM log_events l WHERE l.trace_id = t.id) AS log_count,
    (SELECT COUNT(*) FROM log_events l WHERE l.trace_id = t.id AND l."level" = 'error') AS error_count
FROM traces t
ORDER BY t.start_time DESC;
```
**Note:** this file (`db/devtools/001_initial.sql`) is technically part of Dev 4's `I-03` task. You author the SQL (it's your schema, you know what your APIs need), but Dev 4 owns wiring it into the DB init scripts and Docker Compose. Hand it to them directly — don't duplicate effort building your own separate init path.

### 6.4 REST API — build exactly these endpoints, exactly these shapes

All prefixed `/api/v1`. Errors use RFC 7807 shape:
```json
{ "error": { "type": "https://api.devtools.local/errors/not-found", "title": "Trace Not Found", "status": 404, "detail": "No trace found with ID: abc123" } }
```
No authentication for the hackathon — all endpoints open, server binds to localhost.

**`GET /api/v1/requests`** — query params: `page` (default 1), `limit` (default 25, max 100), `method`, `status`, `status_code`, `service`, `path`, `search`, `from`, `to`, `min_duration`, `max_duration`, `sort` (default `start_time`), `order` (default `desc`).
```json
{
  "requests": [{
    "trace_id": "5b8efff798038103d269b633813fc60c", "method": "POST", "path": "/api/orders",
    "status_code": 201, "status": "ok", "duration_ms": 1234, "root_service": "api-gateway",
    "services": ["api-gateway", "auth-service", "order-service", "payment-service"],
    "span_count": 8, "log_count": 3, "error_count": 0,
    "start_time": 1725345600000, "created_at": "2026-09-03T12:00:01.234Z"
  }],
  "pagination": { "page": 1, "limit": 25, "total": 150, "pages": 6 }
}
```
Query the `request_summary` view. Keep response time under 200ms.

**`GET /api/v1/requests/:traceId`** — returns `{ trace, spans, logs, db_queries, external_calls }`. `db_queries` = spans whose attributes contain `db.statement` (shape: `span_id, operation, table, statement, duration_ms, status, service_name`). `external_calls` = client-type HTTP spans whose `server.address` is **not** one of the known internal service names (shape: `span_id, method, url, status_code, duration_ms, status, service_name`).

**`GET /api/v1/traces/:traceId/waterfall`** — returns `{ trace_id, total_duration_ms, spans: [...] }` where each span additionally carries computed `start_offset_ms` (ms from trace start) and `percentage_of_total`. **Invariant Dev 3 depends on:** `start_offset_ms + duration_ms` must never exceed `total_duration_ms` — verify this in your DoD test.

**`GET /api/v1/traces/:traceId/logs`** — query: `level`, `service`, `search`. Returns `{ trace_id, logs: [...], total }`.

**`POST /api/v1/replay`** — body: `{ original_trace_id, overrides?: { path?, headers?, body? } }`. Returns `{ replay_session: { id, original_trace_id, replay_trace_id: null, status: "pending", created_at } }`.

**`GET /api/v1/replay/:replayId`** — returns `{ replay_session: { id, original_trace_id, replay_trace_id, status, original_duration_ms, replay_duration_ms, created_at, completed_at } }`.

**`POST /api/v1/compare`** — body: `{ trace_id_a, trace_id_b }`. Returns duration diff, status match, service diff (`added`/`removed`/`unchanged`), and span diff (matched by `service_name + operation_name`, with `duration_a_ms`, `duration_b_ms`, `diff_ms`, status match per matched pair). Full shape is in blueprint §7.1 — copy it exactly, Dev 3's Compare tab is built against it field-for-field.

**`GET /api/v1/topology`** and **`GET /api/v1/topology?traceId=:id`** — returns `{ nodes: [...], edges: [...] }`. See §6.6 below for the derivation logic.

### 6.5 WebSocket (`ws://localhost:4001/ws`, no auth)

Server → Client events:
| Event | Payload |
|-------|---------|
| `new_request` | `{ trace_id, method, path, status_code, status, duration_ms, root_service, services, start_time }` |
| `trace_update` | `{ trace_id, spans: [...], logs: [...] }` |
| `replay_progress` | `{ replay_id, step, status }` |
| `replay_complete` | `{ replay_id, original_trace_id, replay_trace_id, status, duration_ms }` |
| `service_update` | `{ service_name, request_count, error_count, avg_duration_ms }` |
| `error` | `{ message, code }` |

**Critical contract with Dev 3, called out explicitly by the audit:** the `new_request` payload shape must be **byte-for-byte identical** to one item in `GET /api/v1/requests`'s `requests[]` array. If they diverge, Dev 3's UI breaks when it tries to prepend a WebSocket event into a React Query cache built from the REST shape. Do not let this drift.

Events are not ordered and may duplicate — Dev 3 handles this client-side by keying on `trace_id`, but design your broadcast logic to avoid obviously duplicating unnecessarily.

Close codes: `1000` normal, `1001` shutting down, `1008` policy violation, `1011` internal error.

### 6.6 Topology derivation logic (`D-08`)

Nodes = unique `service_name` values across spans; edges = parent-child span pairs across **different** services.

```typescript
export class TopologyService {
  async getTopology(options?: { trace_id?: string; from?: number; to?: number }) {
    const spans = options?.trace_id
      ? await this.traceRepo.getSpansByTrace(options.trace_id)
      : await this.traceRepo.getAllSpans(options?.from, options?.to);

    const serviceMap = new Map();
    for (const span of spans) {
      if (!serviceMap.has(span.service_name)) {
        serviceMap.set(span.service_name, {
          id: span.service_name,
          label: span.service_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: this.getServiceType(span), // 'database' | 'cache' | 'external' | 'service'
          request_count: 0, error_count: 0, avg_duration_ms: 0, total_duration_ms: 0,
        });
      }
      const node = serviceMap.get(span.service_name);
      node.request_count++;
      node.total_duration_ms += span.duration_ms;
      if (span.status === 'error') node.error_count++;
    }
    for (const node of serviceMap.values()) {
      node.avg_duration_ms = Math.round(node.total_duration_ms / node.request_count);
      delete node.total_duration_ms;
    }

    const edgeMap = new Map();
    for (const span of spans) {
      if (!span.parent_span_id) continue;
      const parentSpan = spans.find(s => s.id === span.parent_span_id);
      if (!parentSpan || parentSpan.service_name === span.service_name) continue;
      const key = `${parentSpan.service_name}->${span.service_name}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, {
          source: parentSpan.service_name, target: span.service_name,
          type: this.getDependencyType(span), request_count: 0, error_count: 0,
          avg_duration_ms: 0, total_duration_ms: 0, protocol: this.getProtocol(span),
        });
      }
      const edge = edgeMap.get(key);
      edge.request_count++;
      edge.total_duration_ms += span.duration_ms;
      if (span.status === 'error') edge.error_count++;
    }
    for (const edge of edgeMap.values()) {
      edge.avg_duration_ms = Math.round(edge.total_duration_ms / edge.request_count);
      delete edge.total_duration_ms;
    }
    return { nodes: [...serviceMap.values()], edges: [...edgeMap.values()] };
  }

  private getServiceType(span) {
    if (span.attributes?.['db.system']) return 'database';
    if (span.attributes?.['net.peer.name']?.includes('redis')) return 'cache';
    if (span.span_type === 'client' && span.attributes?.['http.url']?.includes('external')) return 'external';
    return 'service';
  }
  private getDependencyType(span) {
    if (span.attributes?.['db.system']) return 'database';
    if (span.attributes?.['net.peer.name']?.includes('redis')) return 'cache';
    if (span.span_type === 'client') return 'external';
    return 'http';
  }
  private getProtocol(span) {
    if (span.attributes?.['db.system']) return 'sql';
    if (span.attributes?.['net.peer.name']?.includes('redis')) return 'redis';
    return 'http';
  }
}
```
Be aware (per the audit): topology is **derived post-hoc from stored spans**, not a live dependency map. With pre-seeded demo data this is fine and will look correct — just don't oversell it in the demo script as "live topology discovery."

### 6.7 Replay implementation (`D-10`) — build the audit's corrected version, not the blueprint's original

The blueprint's original approach finds the new trace by searching for traces matching method/path within a time window after the replay HTTP call completes. **The audit identifies a real race condition here**: the 500ms wait for OTel export is arbitrary, and a concurrent unrelated request matching the same method/path could be mismatched.

**Audit's recommendation, which you should implement:** capture the `traceparent` header returned by your own HTTP call to the API Gateway (if the response exposes it) and use the trace ID directly instead of searching. If the simulated backend doesn't surface it easily, keep the time-window search as a fallback but tighten the window and prefer exact match over "closest by time."

```typescript
export class ReplayService {
  async replay(request: { original_trace_id: string; overrides?: { path?: string; headers?: Record<string,string>; body?: string } }) {
    const replayId = randomUUID();
    const originalTrace = await this.traceRepo.getTrace(request.original_trace_id);
    if (!originalTrace) throw new NotFoundError(`Trace ${request.original_trace_id} not found`);

    const snapshot = this.extractRequestSnapshot(originalTrace);
    const replayRequest = {
      ...snapshot,
      ...(request.overrides?.path && { path: request.overrides.path }),
      ...(request.overrides?.headers && { headers: { ...snapshot.headers, ...request.overrides.headers } }),
      ...(request.overrides?.body && { body: request.overrides.body }),
    };

    await this.replayRepo.create({
      id: replayId, original_trace_id: request.original_trace_id, status: 'running',
      request_snapshot: replayRequest, overrides: request.overrides || {},
      original_duration_ms: originalTrace.duration_ms,
    });
    this.wsBroadcast.send({ type: 'replay_progress', data: { replay_id: replayId, step: 'executing', status: 'running' } });

    try {
      const startTime = Date.now();
      const response = await this.httpClient.request({
        method: replayRequest.method,
        url: `http://localhost:3000${replayRequest.path}`, // simulated backend, per Dev 1
        headers: replayRequest.headers, body: replayRequest.body,
      });
      const duration_ms = Date.now() - startTime;

      await this.sleep(500); // fallback wait if you keep the search-based approach
      const replayTraceId = await this.findReplayTrace(replayRequest, startTime);

      await this.replayRepo.update(replayId, {
        status: 'completed', replay_trace_id: replayTraceId,
        replay_duration_ms: duration_ms, completed_at: new Date(),
      });
      this.wsBroadcast.send({
        type: 'replay_complete',
        data: { replay_id: replayId, original_trace_id: request.original_trace_id, replay_trace_id: replayTraceId, status: 'completed', duration_ms },
      });
      return { replay_id: replayId, original_trace_id: request.original_trace_id, replay_trace_id: replayTraceId,
        status: 'completed', original_duration_ms: originalTrace.duration_ms, replay_duration_ms: duration_ms, error_message: null };
    } catch (error) {
      await this.replayRepo.update(replayId, { status: 'failed', error_message: error.message, completed_at: new Date() });
      return { replay_id: replayId, original_trace_id: request.original_trace_id, replay_trace_id: null,
        status: 'failed', original_duration_ms: originalTrace.duration_ms, replay_duration_ms: null, error_message: error.message };
    }
  }

  private extractRequestSnapshot(trace) {
    return { method: trace.method, path: trace.path, query: {}, headers: trace.request_headers,
      body: trace.request_body, trace_id: trace.id, service: trace.root_service,
      timestamp: trace.start_time, duration_ms: trace.duration_ms, status_code: trace.status_code };
  }
  private async findReplayTrace(request, startTime) {
    const traces = await this.traceRepo.findTraces({ method: request.method, path: request.path, from: startTime - 1000, to: startTime + 5000 });
    return traces[0]?.id || null;
  }
  private sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
```

**Understand what you're actually building** (per the audit's Replay Verdict): this is "re-send the same HTTP request and show the new trace," not "reproduce the exact original execution." Database state, timing, and randomness will differ between original and replay. Don't let the demo script overclaim this — that's a Dev 5/demo-script concern, but you should know it so you don't over-engineer replay trying to achieve perfect reproduction it was never scoped to have.

Because the Mock Payment API (Dev 4's) has probabilistic failure behavior (30% slow, 5% 503), a replay can legitimately hit a different code path than the original — this is expected, not a bug in your service.

### 6.8 Secret redactor — your layer (server-side, second of two)

```typescript
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
const SENSITIVE_BODY_FIELDS = ['password', 'token', 'secret', 'credit_card', 'ssn'];

export function redactSpanAttributes(attributes: Record<string, any>): Record<string, any> {
  const redacted = { ...attributes };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_HEADERS.some(h => key.toLowerCase().includes(h))) {
      redacted[key] = '**REDACTED**';
    }
    if (key.includes('body') && typeof redacted[key] === 'string') {
      try {
        const body = JSON.parse(redacted[key]);
        for (const field of SENSITIVE_BODY_FIELDS) if (body[field]) body[field] = '***';
        redacted[key] = JSON.stringify(body);
      } catch { /* not JSON, leave as-is */ }
    }
  }
  return redacted;
}
```
Run this on every span before writing to Postgres in `D-03`, in addition to whatever Dev 1's Collector-level redaction already did (defense in depth — yours is the safety net if theirs misses something).

## 7. Contracts — what you produce, what you consume

**You produce (Dev 3 builds against these exactly):**
- All REST endpoints in §6.4, with the exact response shapes shown.
- All WebSocket events in §6.5 — **`new_request` must match a `requests[]` item exactly**.
- Static file serving of the built frontend at `/` on port `4001` (`D-13`) — single port, no CORS needed.

**You consume:**
- OTLP HTTP POSTs from Dev 1's Collector — agree the exact receiving path with them before either side finalizes config.
- `packages/shared` types from Dev 5 — until available, use the JSON shapes in this file as your working contract, then swap to the shared types once they land so frontend/backend can't drift.
- The `devtools` schema — you author the SQL (§6.3), Dev 4 wires it into the Docker init flow.
- Dev 4's `SIMULATED_BACKEND_URL` env var for where to send replay requests (`http://api-gateway:3000` in the hackathon compose).

## 8. Why your first task matters more than any other single task on the project

The backlog explicitly calls `D-03` (the OTLP receiver) **the single most critical dependency in the whole project**:
1. Everything downstream depends on it — no data in Postgres means every API returns empty and every UI screen is blank.
2. It's where Dev 1's world (telemetry producer) and your world (consumer) meet, and neither of you can fully verify your own side alone.
3. OTel data completeness is genuinely unknown until tested (see Dev 1's file, §8 there).

**Do this, in order:** build a minimal receiver that accepts anything and stores it raw first, get it running against Dev 1's synthetic payload (§6.2), then iterate on correct transformation/redaction. Do not try to build the "perfect" transform layer before you have anything flowing end to end.

## 9. Suggested build order

1. `D-01` Fastify scaffold + health check.
2. `D-02` DB connection, run the schema in §6.3 against a local Postgres.
3. `D-03` OTLP receiver — start against your own hand-built synthetic payload (§6.2), then integrate with Dev 1 as soon as their first service is emitting.
4. `D-04`, `D-05`, `D-06`, `D-07` — these can be built in parallel once `D-03` is writing real rows; test each with `curl` against seeded/synthetic rows before Dev 3 needs them.
5. `D-09` WebSocket handler — needed early by Dev 3 for live updates (`F-06`).
6. `D-12` redactor — wire into `D-03`'s write path.
7. `D-08` Topology — lower priority per the MVP tiering (Tier 3, only if time remains).
8. `D-10`, `D-11` Replay/Compare — build these **after** the core read path is solid; they are explicitly the most dangerous scope items on the whole project (see Dev 5's file — cut these first under time pressure).
9. `D-13` — once Dev 3 has a production build to serve.

## 10. Known pitfalls specific to you (from the audit)

- Don't build a gRPC receiver — HTTP only, per §6.1.
- The `new_request` WS payload and `GET /api/v1/requests` item shape **must** match exactly — this is explicitly flagged as a risk.
- The replay trace-discovery race condition is real — mitigate per §6.7, don't ship the naive time-window search as your only mechanism if you have time to do better.
- Topology is post-hoc derived, not live — communicate this limitation to whoever writes the demo script (Dev 5).
- Redis spans may not use `db.statement`-style attributes the same way Postgres spans do — coordinate with Dev 1 on how to distinguish/label them in the DB Queries extraction for `D-05`.

## 11. Definition of Done for your whole workstream

- [ ] `docker compose up postgres redis otel-collector` + your server starts cleanly, health check passes
- [ ] A trace sent through the real pipeline (Dev 1's services → Collector → you) appears correctly in all read APIs within a couple seconds
- [ ] All REST endpoints match the shapes in §6.4 exactly, verified with `supertest`
- [ ] WebSocket delivers `new_request` within 1s of ingestion, matching the REST shape
- [ ] Replay executes end-to-end at least 5 times successfully in local testing (per the backlog's explicit requirement for this feature)
- [ ] Compare produces correct diffs for two traces of the same endpoint
- [ ] All sensitive headers/body fields are redacted in stored rows
- [ ] Frontend static assets served correctly from `/` on port 4001

## 12. Sync points

- **Day 1:** agree OTLP receiving path with Dev 1 before they finalize their Collector config.
- **As soon as Dev 1 has one real service running:** pair on validating the ingestion pipeline with real data.
- **Before building `F-06`/WebSocket UI (Dev 3):** confirm the WS payload shape matches REST exactly.
- **Before finalizing `D-10`/`D-11`:** check in with Dev 5 on whether replay/compare are still in scope given time remaining — they're the first two items on the emergency cut list.
- **`D-13`:** coordinate with Dev 3 on the build output path so static serving works on the first try.
