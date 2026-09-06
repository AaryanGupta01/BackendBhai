# Role 02 — DevTools Core Platform

> **Workstream:** 2
> **Alias:** DEV-2 (Core)
> **Primary Areas:** `apps/devtools-core/`

---

## Mission

Build the DevTools server — a Fastify-based Node.js application that ingests OTLP telemetry via HTTP, stores traces/spans/logs in PostgreSQL, and serves them through REST APIs and WebSocket to the frontend.

---

## Scope

### In Scope

- Fastify server scaffold with TypeScript
- PostgreSQL connection and migrations
- OTLP HTTP trace receiver (receives parsed JSON from OTel Collector)
- Trace/span/log storage in PostgreSQL
- REST API endpoints:
  - `GET /api/v1/requests` — paginated request list with filtering
  - `GET /api/v1/requests/:traceId` — full trace detail
  - `GET /api/v1/traces/:traceId/waterfall` — waterfall data transformation
  - `GET /api/v1/traces/:traceId/logs` — trace-scoped logs
  - `GET /api/v1/topology` — service topology (global and per-request)
  - `POST /api/v1/replay` — request replay (Tier 3)
  - `GET /api/v1/replay/:replayId` — replay status (Tier 3)
  - `POST /api/v1/compare` — trace comparison (Tier 3)
  - `GET /health` — health check
- WebSocket handler for live updates (`new_request`, `replay_complete`)
- Secret redaction (server-side for body fields)
- Frontend static file serving (built React app)

### Out of Scope

- OTel instrumentation (Workstream 1)
- Frontend UI (Workstream 3)
- Demo service business logic (Workstream 4)
- Repository architecture (Workstream 5)

---

## Responsibilities

1. Create the Fastify server with proper project structure
2. Implement PostgreSQL schema and migrations
3. Implement OTLP HTTP trace receiver (accepts JSON, transforms, stores)
4. Implement all REST API endpoints
5. Implement WebSocket handler for live updates
6. Implement waterfall data transformation (compute offsets, depths, ordering)
7. Implement request/response body storage and retrieval
8. Implement log storage and retrieval
9. Implement secret redaction for stored bodies
10. Serve built React frontend as static files
11. Define API contracts in `contracts/API.md` and `contracts/EVENTS.md`

---

## Allowed Directories

- `apps/devtools-core/` (primary)
- `contracts/API.md` (co-ownership with Workstream 5)
- `contracts/EVENTS.md` (co-ownership with Workstream 5)
- `contracts/DATA_MODEL.md` (co-ownership with Workstream 5)

---

## Important Dependencies

| Dependency | Nature | Workstream |
|------------|--------|------------|
| PostgreSQL schema | Must exist before storage code | Workstream 5 (contracts) |
| OTel Collector OTLP HTTP export | Telemetry source | Workstream 1 |
| Shared types package | TypeScript interfaces | Workstream 5 |
| Built React frontend | Static files to serve | Workstream 3 |

---

## Inputs

- Planning documents (especially `02-implementation-blueprint.md` Sections 5-8, `03-development-backlog.md` Epic E2)
- `contracts/TELEMETRY.md` — trace and span model
- `contracts/DATA_MODEL.md` — database schema
- `contracts/API.md` — API endpoint definitions
- `contracts/EVENTS.md` — WebSocket event definitions

---

## Outputs

- `apps/devtools-core/` — complete Fastify server application
- `contracts/API.md` — finalized API contract
- `contracts/EVENTS.md` — finalized WebSocket event contract
- Working server on port 4001
- All REST endpoints returning correct data
- WebSocket pushing `new_request` events

---

## Contracts They Own

- `contracts/API.md` — REST API endpoint definitions, request/response shapes, error format
- `contracts/EVENTS.md` — WebSocket event types, payloads, connection lifecycle

---

## Contracts They Consume

- `contracts/TELEMETRY.md` — trace/span/log model from OTel
- `contracts/DATA_MODEL.md` — PostgreSQL schema
- `contracts/VERSIONING.md` — versioning policy

---

## Tasks / Phases

### Phase 0 — Bootstrap
- **D-01:** Fastify server scaffold with health endpoint
- **D-02:** Database connection pool + migration runner + `001_initial.sql` execution

### Phase 1 — Core APIs
- **D-03:** OTLP HTTP trace receiver (accept JSON, transform, store in PostgreSQL)
- **D-04:** Request list API with pagination, filtering, sorting, search
- **D-05:** Request detail API (full trace + spans + logs + categorized operations)
- **D-06:** Waterfall API (compute `start_offset_ms`, `percentage_of_total`, `depth`, `order`)
- **D-07:** Logs API with level and service filtering

### Phase 2 — Live Updates
- **D-09:** WebSocket handler with `new_request` and `trace_update` events

### Phase 3 — Advanced Features (Tier 3)
- **D-08:** Topology API (global and per-request)
- **D-10:** Replay service + API
- **D-11:** Compare service + API
- **D-12:** Secret redactor

### Phase 4 — Integration
- **D-13:** Frontend static file serving

---

## Things Explicitly Out of Scope

- OpenTelemetry instrumentation (Workstream 1)
- React frontend UI (Workstream 3)
- Demo service implementation (Workstream 4)
- Docker Compose configuration (Workstream 4)
- Seed data generation (Workstream 4)

---

## Testing Expectations

- Unit tests for CompareService (span matching, duration diff)
- Unit tests for TraceService (waterfall computation)
- Unit tests for ReplayService (snapshot extraction)
- API tests for all REST endpoints (Vitest + supertest)
- Integration test: OTLP HTTP request → trace stored in PostgreSQL
- Integration test: WebSocket `new_request` event fires on new trace
- Test with empty database (graceful handling)
- Test with malformed OTLP data (error handling)
- Test filtering and pagination correctness

---

## Handoff Requirements

Before ending work, update `.ai/HANDOFF.md` with:
- Which API endpoints are implemented and tested
- Database schema status
- OTLP receiver status
- WebSocket implementation status
- Any API contract changes
- Outstanding issues or blockers

---

## Failure-Isolation Requirements

- Server must handle PostgreSQL connection failures gracefully (return 503, don't crash)
- OTLP receiver must handle malformed telemetry data (reject, don't crash)
- WebSocket disconnection must not affect REST API
- Missing data must return appropriate errors (404, empty arrays), not crashes
- Rate limiting or backpressure on OTLP ingestion if DB is overwhelmed
