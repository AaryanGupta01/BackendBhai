# Role 01 — Telemetry / Instrumentation / Collector

> **Workstream:** 1
> **Alias:** DEV-1 (Telemetry)
> **Primary Areas:** `apps/telemetry-collector/`, `packages/instrumentation/`

---

## Mission

Build the OpenTelemetry instrumentation layer that captures traces, spans, logs, and request/response bodies from the simulated backend services, and configure the OTel Collector to export this telemetry to the DevTools server via OTLP HTTP.

---

## Scope

### In Scope

- OpenTelemetry Node.js SDK setup for all simulated backend services
- Auto-instrumentation for Express HTTP, pg (PostgreSQL), Redis
- Manual span creation for business logic operations
- W3C trace context propagation (`traceparent` header)
- Request body capture via shared Express middleware
- Response body capture via shared Express middleware
- Console.log monkey-patch for trace-context-aware logging
- OTel Collector configuration (separate Docker container)
- OTLP HTTP export from Collector to DevTools server
- Attribute redaction for sensitive headers at Collector level
- Shared tracing initialization module

### Out of Scope

- DevTools server implementation (Workstream 2)
- Frontend UI (Workstream 3)
- Demo service business logic (Workstream 4 — they consume your instrumentation)
- Integration testing (Workstream 5)

---

## Responsibilities

1. Create `packages/instrumentation/` with shared OTel tracing initialization
2. Implement request/response body capture middleware
3. Implement console.log monkey-patch for log-trace correlation
4. Configure OTel Collector (`infrastructure/otel-collector-config.yaml`)
5. Ensure all demo services use the shared instrumentation
6. Verify trace data reaches the DevTools server correctly
7. Define and document telemetry contracts in `contracts/TELEMETRY.md`
8. Handle attribute redaction for sensitive headers

---

## Allowed Directories

- `packages/instrumentation/` (primary)
- `apps/telemetry-collector/` (Collector configuration)
- `infrastructure/otel-collector-config.yaml`
- `contracts/TELEMETRY.md` (co-ownership with Workstream 5)

---

## Important Dependencies

| Dependency | Nature | Workstream |
|------------|--------|------------|
| Docker Compose with OTel Collector | OTel Collector must be running | Workstream 4 |
| PostgreSQL + Redis | Services need databases for instrumentation to capture queries | Workstream 4 |
| DevTools server OTLP HTTP receiver | Telemetry destination endpoint | Workstream 2 |
| Shared types package | Type definitions for telemetry data | Workstream 5 |

---

## Inputs

- Planning documents (especially `02-implementation-blueprint.md` Section 4, `05-pre-development-audit.md` Section 3)
- OpenTelemetry semantic conventions
- OTel Collector documentation

---

## Outputs

- `packages/instrumentation/` — shared tracing init, body capture middleware, log monkey-patch
- `apps/telemetry-collector/` — Collector Dockerfile or config reference
- `infrastructure/otel-collector-config.yaml` — Collector pipeline config
- Updated `contracts/TELEMETRY.md` — telemetry contract documentation
- Working OTel pipeline: service → Collector → DevTools server

---

## Contracts They Own

- `contracts/TELEMETRY.md` — trace model, span model, attribute conventions, redaction rules

---

## Contracts They Consume

- `contracts/DATA_MODEL.md` — storage schema (to ensure telemetry maps correctly)
- `contracts/API.md` — telemetry ingestion endpoint (to know where to export)

---

## Tasks / Phases

### Phase 0 — Bootstrap
- **S-01:** Create shared OTel tracing init module (`packages/instrumentation/src/tracing.ts`)
  - Accepts `SERVICE_NAME` env var
  - Configures auto-instrumentation for Express, HTTP, pg, Redis
  - Exports to OTel Collector via OTLP gRPC (`http://otel-collector:4317`)
- **I-04:** OTel Collector configuration (`infrastructure/otel-collector-config.yaml`)
  - OTLP gRPC receiver on :4317
  - Batch processor
  - Attribute redactor for sensitive headers
  - OTLP HTTP exporter to DevTools server

### Phase 1 — Instrumentation
- **Body capture middleware:** Express middleware that captures `req.body` and `res.json` output, adds as span attributes
- **Log monkey-patch:** Patches `console.log`/`console.error` to inject `trace_id` and `span_id`
- **Verify:** All demo services produce traces with correct structure

### Phase 2 — Validation
- Verify traces appear in DevTools server via OTLP HTTP
- Verify body capture works for all service endpoints
- Verify log correlation works
- Verify redaction works at Collector level

---

## Things Explicitly Out of Scope

- Building the DevTools server or any API endpoints
- Building the frontend UI
- Implementing demo service business logic
- Database schema creation (Workstream 4)
- Seed data generation (Workstream 4)
- Integration testing (Workstream 5)

---

## Testing Expectations

- Unit tests for body capture middleware
- Unit tests for log monkey-patch
- Integration test: send HTTP request to instrumented service → trace appears in Collector
- Integration test: trace contains correct span attributes (HTTP, DB, Redis)
- Integration test: request/response bodies captured as span attributes
- Integration test: console.log output includes trace context
- Integration test: sensitive headers are redacted by Collector

---

## Handoff Requirements

Before ending work, update `.ai/HANDOFF.md` with:
- Which services are instrumented and verified
- Any services that have instrumentation issues
- OTel Collector configuration status
- Any changes made to shared contracts
- Outstanding issues or blockers

---

## Failure-Isolation Requirements

- Instrumentation failures must not crash the simulated backend services (fail-open)
- OTel SDK startup failure must not prevent service from starting
- OTel Collector failure must not corrupt stored data in DevTools server
- Body capture middleware must not affect request/response handling
- Log monkey-patch must not break existing console output
