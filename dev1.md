# Developer 1 — Telemetry, Instrumentation & Collector

> Project: **Backend DevTools** (Hackathon — DevTools & Infra track)
> Team: 5 developers. You are **Dev 1**. Dev 5 (Abhinav) owns integration/architecture/QA and is your escalation point for any contract disagreement.
> Read this whole file before writing code. It is built entirely from the team's 5 planning docs — nothing here is invented scope.

---

## 1. Your mission, in one sentence

You build the **simulated microservices backend** (API Gateway, Auth, Order, Payment services) so that every request through it produces rich, correct, correlated OpenTelemetry telemetry — spans, logs, and DB/cache/external-call attributes — and you configure the **OTel Collector** that ships that telemetry onward. If your instrumentation is wrong or incomplete, nothing downstream (Dev 2's server, Dev 3's UI) has real data to show. You are the data source for the entire product.

## 2. Source documents (read in this order)

1. **`01-product-research-validation.md`** — skim only. Gives you the "why": the product is "Chrome DevTools for the backend," and your services exist to generate a believable e-commerce request flow for the demo.
2. **`02-implementation-blueprint.md`** — your primary spec. Read **§4 Instrumentation** (4.1–4.11) and **§15 Hackathon Architecture** in full. These sections are reproduced/expanded below, but go to the source for anything unclear.
3. **`03-development-backlog.md`** — your task list lives in **Epic E1 — Simulated Backend** (tasks `S-01`–`S-05`) and part of **Epic E9** (`I-04` OTel Collector config). Definition-of-done criteria below are copied from here.
4. **`05-pre-development-audit.md`** — read **§2 Architecture Audit (issues #1, #3, #4)**, **§3 Instrumentation Audit**, and **"MUST FIX BEFORE CODING" items 1, 3, 4**. These are corrections to the blueprint that you must build to, not the blueprint's original (slightly wrong) version.
5. **`04-ui-ux-implementation-spec.md`** — you don't need this. Dev 3 owns it.

## 3. Working philosophy — read this before you start

The team's approach is **contract-first, mock-first, failure-isolated, workstream-ownership**: every dev works independently against shared contracts (types, API shapes, span attribute names) and integrates once real pieces exist — you do not sit blocked waiting for someone else's service to be "done."

Concretely, for you:
- You do **not** need Dev 2's DevTools server running to test your instrumentation. Point your OTel exporter at the OTel Collector, and initially just have the Collector log spans to console (`logging` exporter) so you can inspect what OTel actually captures before Dev 2's HTTP receiver exists.
- You do **not** need Dev 4's Docker Compose file to be final to start. Scaffold `services/shared/tracing.ts` and each service the moment `packages/shared` (Dev 5) and the monorepo skeleton (Dev 4, task `I-01`) exist — you can run each Node service directly with `ts-node`/`tsx` against a local Postgres/Redis while Dev 4 finishes the compose file.
- Your failure-injection touchpoints (slow DB, Redis miss, auth timeout) are **owned by Dev 4**, not you — see §7 "Contracts" below for the exact seam. Keep your handlers clean of hacks; Dev 4 will call into your code from `failures.ts` files, or you'll call out to a `failures.ts` module Dev 4 supplies. Agree the exact function signature with Dev 4 before either of you build it.

## 4. Scope

### In scope for you
- `services/shared/tracing.ts` — the shared OTel SDK init used by every simulated service (`S-01`)
- `services/shared/logger.ts` — the trace-context-aware structured logger (part of `S-01`, and the fix for Audit Issue #4)
- API Gateway service, port `3000` (`S-02`)
- Auth Service, port `3001` (`S-03`)
- Order Service, port `3002` (`S-04`)
- Payment Service, port `3003` (`S-05`)
- `otel-collector-config.yaml` (`I-04`)
- Request/response body capture middleware (Audit "MUST FIX BEFORE CODING" #3)

### Explicitly NOT yours
- Mock Payment API / WireMock stubs and all deliberate-failure logic (`S-06`, `S-07`, `S-08`) → **Dev 4**
- Simulated e-commerce frontend that drives traffic (`S-09`) → **Dev 4**
- Monorepo scaffold, Docker Compose, DB schema/migrations, Makefile, seed data (`I-01`, `I-02`, `I-03`, `I-06`, `I-07`) → **Dev 4**
- Anything inside `packages/devtools-server` (OTLP receiver, REST/WS API) → **Dev 2**
- `packages/shared` type definitions → **Dev 5** (you consume these, don't author them)

## 5. Your task list (with Definition of Done, from the backlog)

Work top to bottom — each depends on the one above it.

| ID | Task | Depends on | Complexity | Definition of Done |
|----|------|-----------|------------|---------------------|
| S-01 | Shared OTel tracing + logger init | `I-01` (monorepo, Dev 4), `I-02` (Docker base, Dev 4) | M | Importable `initTracing(serviceName)` from all services; OTel SDK starts and exports to the collector without errors |
| S-02 | API Gateway service | S-01 | M | `curl localhost:3000/api/orders` returns a response; a trace appears in the OTel Collector output |
| S-03 | Auth Service | S-01 | S | `curl -X POST localhost:3001/auth/verify` returns 200 with user info |
| S-04 | Order Service | S-01, `I-03` (DB schema, Dev 4) | L | `POST /orders` inserts into PostgreSQL and returns 201; the trace includes a DB span with `db.statement` populated |
| S-05 | Payment Service | S-01 | M | `POST /payments` returns 200; the trace includes a client HTTP span to `mock-payment-api` |
| I-04 | OTel Collector config | `I-02` (Dev 4) | S | Collector starts with your config; spans received on `:4317` are exported onward correctly |

**Additional, non-optional (from the audit "MUST FIX BEFORE CODING"):**
- Request/response body capture middleware in `services/shared/` — without this the Overview tab (Dev 3) will always show empty bodies, which the audit calls out as "significantly weakening the complete execution story promise." Build it into `S-01`'s shared module, not per-service.
- `console.log`/`console.error` monkey-patch (or the `createLogger` approach below) so every log line carries `trace_id`/`span_id` automatically. Without this, Dev 3's Logs tab will be empty for any service that uses raw `console.log`.

## 6. Exact technical specification

### 6.1 Shared tracing init (`services/shared/tracing.ts`)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export function initTracing(serviceName: string) {
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: '1.0.0',
      'deployment.environment': 'hackathon-demo',
    }),
    traceExporter: new OTLPTraceExporter({
      url: 'http://otel-collector:4317', // service name inside Docker network
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-redis': { enabled: true },
      }),
    ],
  });
  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown());
}
```

Call `initTracing(process.env.SERVICE_NAME)` as the **very first line** of every service's entrypoint, before any other `import` that touches `express`, `pg`, `redis`, or `http` executes — OTel auto-instrumentation patches those modules on load, so timing matters.

### 6.2 Trace propagation (how requests connect across your 4 services)

You don't write propagation code — OTel's HTTP auto-instrumentation does it via the W3C Trace Context standard automatically:

```
traceparent: 00-<trace-id>-<span-id>-<trace-flags>
# e.g. traceparent: 00-5b8efff798038103d269b633813fc60c-eee19b7ec3c1b174-01
```

When API Gateway receives a browser request with no `traceparent`, OTel creates a new root span with a fresh trace ID and attaches an outgoing `traceparent` to every downstream call it makes (Auth, Order). Each downstream service extracts it and creates a child span. **You must not manually forward or strip this header** — auto-instrumentation handles it as long as you use the instrumented `http`/`express` clients for all inter-service calls (plain `fetch`/`axios` built on Node's `http` module is fine).

### 6.3 Manual spans for business logic

Auto-instrumentation covers HTTP server/client, `pg`, and `redis`. For anything else worth seeing in the waterfall, add a manual child span:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';
const tracer = trace.getTracer('order-service');

export async function createOrder(req: any, res: any) {
  return tracer.startActiveSpan('order.process', async (span) => {
    try {
      span.setAttribute('order.user_id', req.body.userId);
      span.setAttribute('order.item_count', req.body.items.length);

      const cart = await redis.get(`cart:${req.body.sessionId}`); // auto-instrumented
      const order = await db.query(
        'INSERT INTO orders (user_id, items, status) VALUES ($1, $2, $3) RETURNING *',
        [req.body.userId, JSON.stringify(req.body.items), 'pending']
      ); // auto-instrumented, produces db.statement

      span.setAttribute('order.id', order.rows[0].id);
      span.setStatus({ code: SpanStatusCode.OK });
      return res.status(201).json(order.rows[0]);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      span.end();
    }
  });
}
```

### 6.4 Logger with trace context (fixes Audit Issue #4)

Raw `console.log` produces log lines with **no** `trace_id`, so they will never show up correlated to a request in Dev 3's Logs tab. Every service must use this logger (or an equivalent monkey-patch on `console.log`/`console.error`) instead of calling `console.log` directly:

```typescript
// services/shared/logger.ts
import { trace } from '@opentelemetry/api';

export function createLogger(serviceName: string) {
  return {
    info(message: string, meta?: Record<string, any>) {
      const spanContext = trace.getActiveSpan()?.spanContext();
      console.log(JSON.stringify({
        level: 'info',
        message,
        service: serviceName,
        trace_id: spanContext?.traceId ?? null,
        span_id: spanContext?.spanId ?? null,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    },
    error(message: string, error?: Error, meta?: Record<string, any>) {
      const spanContext = trace.getActiveSpan()?.spanContext();
      console.error(JSON.stringify({
        level: 'error',
        message,
        service: serviceName,
        trace_id: spanContext?.traceId ?? null,
        span_id: spanContext?.spanId ?? null,
        timestamp: new Date().toISOString(),
        error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
        ...meta,
      }));
    },
  };
}
```
Use it in every handler: `logger.info('Order created successfully', { order_id: order.id })`. This is what makes Dev 2's Logs API and Dev 3's Logs tab possible at all.

### 6.5 Request/response body capture (fixes Audit Issue #3 — build this, it is not optional)

OTel's HTTP auto-instrumentation does **not** capture request/response bodies by default (`http.request.body` is not a standard OTel attribute). Without action, the Overview tab will always be empty. Add a small Express middleware in `services/shared/` used by every service:

```typescript
// services/shared/bodyCapture.ts
import { trace } from '@opentelemetry/api';

export function bodyCaptureMiddleware(req: any, res: any, next: any) {
  const span = trace.getActiveSpan();
  if (span && req.body) {
    span.setAttribute('custom.http.request.body', JSON.stringify(req.body).slice(0, 65536)); // 64KB cap
  }
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (span) span.setAttribute('custom.http.response.body', JSON.stringify(body).slice(0, 65536));
    return originalJson(body);
  };
  next();
}
```
**Coordinate the exact attribute names (`custom.http.request.body` / `custom.http.response.body`) with Dev 2** — the OTLP receiver's transform step needs to know exactly which attribute to pull into the `traces.request_body` / `response_body` columns.

### 6.6 What auto-instrumentation gives you for free (so you know what NOT to hand-roll)

| Data | Source | Key attributes |
|------|--------|-----------------|
| SQL queries | `@opentelemetry/instrumentation-pg` | `db.system`, `db.statement`, `db.operation`, `db.sql.table`, `db.name`, `net.peer.name` |
| Redis commands | `@opentelemetry/instrumentation-redis` | span named roughly `redis.command` — verify the exact attribute shape on day 1, see §8 |
| Outbound HTTP calls | `@opentelemetry/instrumentation-http` | `http.request.method`, `url.full`, `http.response.status_code`, `server.address`, `server.port` |
| Errors | manual `span.setStatus` + `span.recordException` | `status.code = ERROR`, exception event with `exception.type`/`exception.message` |
| Timing | OTel SDK automatically | span duration — this is what Dev 3's waterfall renders |

### 6.7 OTel Collector config (`otel-collector-config.yaml`, task I-04)

**Architecture decision you must follow (frozen by the audit, do not deviate):** the Collector receives spans from your services over OTLP **gRPC** on `:4317` (that part is unchanged), but re-exports to Dev 2's DevTools server over OTLP **HTTP**, not gRPC. The audit rejected a gRPC receiver inside the DevTools server as unnecessarily complex — Dev 2 exposes a plain HTTP endpoint instead. **Get the exact URL/path from Dev 2 before finalizing this file** (likely something like `http://devtools-server:4001/v1/traces` and `/v1/logs` — OTLP/HTTP's conventional paths — but confirm, don't assume).

Your redaction responsibility here is **layer 1 of 2** (Dev 2 does layer 2, server-side, on top of yours):

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch: {}
  attributes:
    actions:
      - key: http.request.header.authorization
        action: hash
      - key: http.request.header.cookie
        action: hash
      - key: http.request.header.x-api-key
        action: hash
      - key: http.request.header.x-auth-token   # audit flagged this as missing — include it
        action: hash
  transform:
    statements:
      - set(attributes["http.request.header.authorization"], "**REDACTED**")
        where attributes["http.request.header.authorization"] != nil
      - set(attributes["http.request.header.x-api-key"], "**REDACTED**")
        where attributes["http.request.header.x-api-key"] != nil

exporters:
  otlphttp:
    endpoint: http://devtools-server:4001   # CONFIRM exact path with Dev 2
  logging:
    verbosity: detailed   # keep this during development — see §8

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, transform, batch]
      exporters: [otlphttp, logging]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp, logging]
```

Known redaction gap (per the audit, acceptable for a hackathon with fake data, but be aware): SQL parameter values inside `db.statement` are not actually stripped by the `update` action shown in the original blueprint — it replaces the whole attribute, not just parameters. Custom attributes like `order.user_id` are stored as-is. This is fine because your demo data is fake, but don't claim in the demo that this redaction is production-grade.

### 6.8 Simplified Docker Compose entries for your services (from the frozen architecture)

```yaml
api-gateway:
  build: ./services/api-gateway
  ports: ["3000:3000"]
  environment:
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
    SERVICE_NAME: api-gateway
  depends_on: [auth-service, order-service]

auth-service:
  build: ./services/auth-service
  ports: ["3001:3001"]
  environment:
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
    SERVICE_NAME: auth-service

order-service:
  build: ./services/order-service
  ports: ["3002:3002"]
  environment:
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
    SERVICE_NAME: order-service
    DATABASE_URL: postgresql://app:secret@postgres:5432/ecommerce
    REDIS_URL: redis://redis:6379
  depends_on: [postgres, redis]

payment-service:
  build: ./services/payment-service
  ports: ["3003:3003"]
  environment:
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
    SERVICE_NAME: payment-service
    MOCK_PAYMENT_API_URL: http://mock-payment-api:4000
  depends_on: [mock-payment-api]
```
These blocks belong in the root `docker-compose.yml` that **Dev 4 owns and assembles** — hand them to Dev 4, don't create a competing compose file.

### 6.9 Endpoints you must implement

| Service | Endpoint | Behavior |
|---------|----------|----------|
| API Gateway (:3000) | `POST /api/orders` | Routes to auth-service then order-service; forwards `traceparent` |
| API Gateway (:3000) | `GET /api/orders/:id` | Routes to order-service |
| Auth Service (:3001) | `POST /auth/verify` | Validates JWT — simplified: **any token containing a `user_id` is accepted** (per spec, no real auth needed) |
| Order Service (:3002) | `POST /orders` | Creates order in PostgreSQL, checks Redis cart cache first |
| Order Service (:3002) | `GET /orders/:id` | Reads order |
| Payment Service (:3003) | `POST /payments` | Calls Mock Payment API (Dev 4's WireMock), records payment |

## 7. Contracts — what you produce, what you consume

**You produce:**
- Running services on ports `3000`–`3003` that emit correctly-shaped OTel spans to the Collector.
- Span attributes `custom.http.request.body` / `custom.http.response.body` (agree exact names with Dev 2).
- Log lines shaped like the `createLogger` output above (agree the JSON shape with Dev 2, who ingests it into `log_events`).
- The `otel-collector-config.yaml` file, handed to Dev 4 to wire into Docker Compose.

**You consume:**
- `packages/shared` TypeScript types from **Dev 5** — until they exist, build against the JSON examples in blueprint §5.2 (a full example Trace/Span/LogEvent record — reproduced in Dev 5's file too).
- `services/shared/failures.ts` hook points from **Dev 4** for slow-DB and Redis-miss injection inside Order Service, and timeout injection inside Auth Service. **Before either of you writes code, agree the function signature**, e.g.:
  ```typescript
  // Dev 4 owns the implementation; you own the call site.
  import { maybeInjectOrderDelay, maybeInjectCacheMiss } from './failures';
  // inside your Order Service handler, after validating item count:
  await maybeInjectOrderDelay(items);       // Dev 4: pg_sleep(3) if items.length > 10
  const cart = await maybeInjectCacheMiss(sessionId, () => redis.get(`cart:${sessionId}`));
  ```
  Do not hardcode any "every 20th request" / "30% of the time" logic yourself — that belongs entirely to Dev 4's module so it can be toggled off without touching your handlers.
- Docker Compose / env vars from **Dev 4** (you provide the service blocks in §6.8, Dev 4 assembles and runs them).
- Mock Payment API URL from **Dev 4** (`MOCK_PAYMENT_API_URL`) — you just call it; you don't build it.

## 8. Day-1 priority: test the biggest unknown immediately

Per the audit, the single highest-risk technical item on the whole project is: **will `@opentelemetry/instrumentation-pg` actually capture `db.statement` with the full SQL query, in your Postgres/pg version combination?**

Before building anything else:
1. Stand up a minimal Express + `pg` service with `initTracing()`.
2. Run one `INSERT` query.
3. Point the Collector at the `logging` exporter (verbosity: detailed) and confirm `db.statement` appears in the printed span, in a usable format.
4. Do the same check for Redis commands — confirm what attribute the span actually uses (the audit specifically flags that Redis spans may use `redis.command` as the span name rather than a clean attribute, and that they may need to be visually/logically separated from SQL spans in the DB Queries tab — tell Dev 2 and Dev 3 what you find).
5. If either capture is incomplete, add it as a manual span attribute rather than relying on auto-instrumentation, and tell Dev 2 immediately — their `db_queries` extraction logic depends on this.

## 9. Suggested build order

1. `packages/shared` types exist (Dev 5) or stub JSON contract agreed → start `services/shared/tracing.ts` + `logger.ts` + `bodyCapture.ts`.
2. Minimal Express + pg test service → run the Day-1 unknown check above (§8). Report findings to Dev 2 same day.
3. Auth Service (`S-03`) — smallest, verifies the shared init works end to end.
4. API Gateway (`S-02`) — verify it can call Auth Service and propagate `traceparent`.
5. Order Service (`S-04`) — the most complex; DB + Redis + manual spans. Pair briefly with Dev 2 once this is emitting real spans, so Dev 2 can validate the OTLP receiver against **real** data instead of synthetic payloads (this pairing is explicitly called out in the backlog as the mitigation for the single most critical dependency in the whole project).
6. Payment Service (`S-05`) — needs Dev 4's Mock Payment API running to fully verify, but you can build the handler and manual span against a stub URL first.
7. `otel-collector-config.yaml` (`I-04`) — finalize once Dev 2 confirms their receiving endpoint path.
8. Confirm redaction rules end-to-end with a request containing a fake `Authorization` header.

## 10. Definition of Done for your whole workstream

- [ ] `docker compose up` (once Dev 4's compose file includes your service blocks) starts all 4 services healthy
- [ ] Placing an order end-to-end (API Gateway → Auth → Order → Payment) produces one trace with correct parent/child span relationships across all 4 services
- [ ] That trace includes a DB span with a real `db.statement`, a Redis span, and an external HTTP span to the Mock Payment API
- [ ] Logs from every service carry `trace_id`/`span_id` and are visible correlated to the right trace
- [ ] Request and response bodies are present (redacted where sensitive) on the root span
- [ ] Sensitive headers (`authorization`, `cookie`, `x-api-key`, `x-auth-token`) never reach storage unredacted
- [ ] The Collector is exporting over OTLP/HTTP to the exact endpoint Dev 2 is listening on

## 11. Sync points

- **Day 1, early:** confirm Dev 2's OTLP-receiving endpoint path before finalizing the Collector config.
- **Day 1:** report the `db.statement` / Redis-attribute findings (§8) to Dev 2 and Dev 3.
- **As soon as Order Service emits real traces:** pair with Dev 2 to validate the ingestion pipeline against real data (this is the project's #1 critical dependency — don't let it slip to late in the schedule).
- **Before writing failure hooks:** agree function signatures with Dev 4 (§7).
- **Ongoing:** any change to span attribute names (especially the custom body-capture attributes) must be communicated to Dev 2 immediately — their extraction logic is hand-keyed to these names.
