# OTLP Mock Fixtures

> **For:** Dev 2 (Core Platform) — OTLP receiver testing
> **Source:** dev2.md §6.2
> **Created by:** Dev 5 (Abhinav)

---

## How to Use

These are pre-built OTLP `ExportTraceServiceRequest` payloads. Dev 2 can test their OTLP HTTP receiver before real telemetry exists.

### Against Dev 2's OTLP endpoint:

```bash
# Successful order flow (4 services, DB spans, Redis span, external HTTP span)
curl -X POST http://localhost:4001/v1/traces \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/otlp-trace-successful-order.json

# Failed payment (503 error from Mock Payment API)
curl -X POST http://localhost:4001/v1/traces \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/otlp-trace-failed-payment.json

# Slow payment (5s delay from Mock Payment API)
curl -X POST http://localhost:4001/v1/traces \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/otlp-trace-slow-payment.json

# Slow DB (3s pg_sleep on large order)
curl -X POST http://localhost:4001/v1/traces \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/otlp-trace-slow-db.json
```

### Against the Collector (if running):

```bash
# Send via OTLP gRPC
grpcurl -import-path ./tests/fixtures -proto otlp-trace.proto \
  -d @tests/fixtures/otlp-trace-successful-order.json \
  localhost:4317 opentelemetry.proto.collector.trace.v1.TraceService/Export
```

---

## Fixture Coverage

| Fixture | Trace ID | Services | Failure Mode |
|---------|----------|----------|-------------|
| `successful-order.json` | `5b8eff...` | api-gateway, auth, order, payment | None (happy path) |
| `failed-payment.json` | `aabbcc...` | api-gateway, payment | Payment 503 |
| `slow-payment.json` | `deadbe...` | api-gateway, payment | 5s payment delay |
| `slow-db.json` | `cafeba...` | order | 3s DB insert |

## Key Attributes to Verify

After sending a fixture, Dev 2 should verify these appear correctly in PostgreSQL:

1. **Trace:** `traces.id` matches `traceId`, `traces.services` array is correct
2. **Spans:** `spans.trace_id` matches, `spans.parent_span_id` forms correct tree
3. **DB spans:** `spans.attributes->'db.statement'` contains the SQL
4. **Redis spans:** `spans.attributes->'db.system'` = `redis`
5. **External HTTP:** `spans.attributes->'server.address'` = `mock-payment-api`
6. **Bodies:** `traces.request_body` / `response_body` populated from `custom.http.*` attributes
7. **Redaction:** `authorization` header replaced with `**REDACTED**`
