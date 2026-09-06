# Role 04 — Demo Environment / Failure Simulation

> **Workstream:** 4
> **Alias:** DEV-4 (Demo)
> **Primary Areas:** `apps/demo-store/`, `infrastructure/`

---

## Mission

Build the simulated e-commerce backend with four instrumented microservices, PostgreSQL, Redis, mock external API, and deterministic failure scenarios — providing the telemetry data that powers the entire DevTools product.

---

## Scope

### In Scope

- **API Gateway** (:3000) — Express server, request routing, traceparent propagation
- **Auth Service** (:3001) — Express server, JWT verification (simplified), latency simulation
- **Order Service** (:3002) — Express server, PostgreSQL queries, Redis cache, failure injection
- **Payment Service** (:3003) — Express server, external API calls to Mock Payment API
- **Mock Payment API** (:4000) — WireMock or Express server with probabilistic responses
- **PostgreSQL** — ecommerce database schema (users, products, orders)
- **Redis** — session/cart cache
- **Seed data** — 50+ diverse requests covering all scenarios
- **Failure scenarios:**
  - Slow payment (30% of payment requests → 5s delay)
  - Payment 503 (every 20th request → 503 error)
  - Auth timeout (invalid tokens → 5s timeout)
  - Redis failure (every 30th request → cache miss fallback)
  - Slow DB (orders with >10 items → 3s delay via `pg_sleep`)
- **Docker Compose** — full stack orchestration
- **Database init scripts** — schema creation and seed data
- **Dev scripts** — `make up`, `make down`, `make seed`, `make reset-db`, `make demo`
- **Simulated e-commerce frontend** (:4002) — minimal UI for generating traffic

### Out of Scope

- OpenTelemetry instrumentation (Workstream 1 provides shared module)
- DevTools server (Workstream 2)
- DevTools UI (Workstream 3)
- Integration testing (Workstream 5)

---

## Responsibilities

1. Create Docker Compose with all services
2. Create PostgreSQL init scripts (ecommerce schema + seed data)
3. Create Redis configuration
4. Implement all four demo services
5. Integrate shared OTel instrumentation from Workstream 1
6. Implement deterministic failure scenarios
7. Create WireMock stubs for Mock Payment API
8. Create seed data generation script
9. Create dev scripts (Makefile or equivalent)
10. Create minimal e-commerce frontend for traffic generation
11. Ensure all services are independently startable
12. Ensure `docker compose up` starts the complete stack

---

## Allowed Directories

- `apps/demo-store/` (primary — all demo services)
- `infrastructure/` (Docker Compose, database init scripts, Redis config)
- `scripts/` (seed data, reset, demo scripts)

---

## Important Dependencies

| Dependency | Nature | Workstream |
|------------|--------|------------|
| Shared OTel instrumentation | Must be imported by all services | Workstream 1 |
| PostgreSQL schema | Must exist before services start | Self (init scripts) |
| Docker network | Services must communicate | Self (Docker Compose) |
| OTel Collector | Telemetry destination | Workstream 1 / Self (Docker Compose) |

---

## Inputs

- Planning documents (especially `02-implementation-blueprint.md` Sections 3-4, `03-development-backlog.md` Epics E1, E9)
- `contracts/TELEMETRY.md` — telemetry attributes to emit
- `contracts/DATA_MODEL.md` — ecommerce database schema

---

## Outputs

- `apps/demo-store/` — all demo services (API Gateway, Auth, Order, Payment, Mock Payment)
- `infrastructure/docker-compose.yml` — complete Docker Compose configuration
- `infrastructure/db/ecommerce/` — schema and seed SQL
- `scripts/` — seed data, reset, demo scripts
- Working `docker compose up` that starts all services
- 50+ seeded diverse requests

---

## Contracts They Own

- `infrastructure/docker-compose.yml` — service definitions, networks, volumes
- `infrastructure/db/ecommerce/` — ecommerce database schema

---

## Contracts They Consume

- `contracts/TELEMETRY.md` — telemetry attributes to emit via OTel
- `contracts/DATA_MODEL.md` — database schema requirements

---

## Tasks / Phases

### Phase 0 — Bootstrap
- **I-02:** Docker Compose base (PostgreSQL, Redis, OTel Collector, service placeholders)
- **I-03:** PostgreSQL init scripts (devtools schema if needed, ecommerce schema + seed)
- **I-06:** Dev server scripts (Makefile: up, down, seed, reset-db, logs, demo)

### Phase 1 — Services
- **S-02:** API Gateway (:3000) — Express, routing, traceparent propagation
- **S-03:** Auth Service (:3001) — Express, JWT verify, latency simulation
- **S-04:** Order Service (:3002) — Express, PostgreSQL queries, Redis cache
- **S-05:** Payment Service (:3003) — Express, external HTTP calls
- **S-06:** Mock Payment API (:4000) — WireMock stubs or Express with probabilistic responses

### Phase 2 — Failures
- **S-07:** Failure injection — Order Service (slow DB, Redis failure)
- **S-08:** Failure injection — Auth Service (timeout simulation)

### Phase 3 — Demo Data
- **I-07:** Seed data script (50+ diverse requests)
- **S-09:** Simulated e-commerce frontend (:4002)

---

## Service Architecture

```
API Gateway (:3000)
    ├── POST /api/orders → Auth Service → Order Service → Payment Service → Mock Payment API
    ├── GET /api/orders/:id → Order Service
    └── GET /api/orders → Order Service

Auth Service (:3001)
    └── POST /auth/verify → (simplified JWT check)

Order Service (:3002)
    ├── POST /orders → PostgreSQL (INSERT) + Redis (GET cart)
    └── GET /orders/:id → PostgreSQL (SELECT)

Payment Service (:3003)
    └── POST /payments → Mock Payment API (POST /charges)

Mock Payment API (:4000)
    └── POST /charges → 200 success (normal), 5s delay (30%), 503 (every 20th)
```

---

## Things Explicitly Out of Scope

- OpenTelemetry SDK setup (Workstream 1 provides shared module)
- DevTools server (Workstream 2)
- React frontend UI (Workstream 3)
- Integration test framework (Workstream 5)
- Production-ready security (local-only, fake credentials)

---

## Testing Expectations

- `docker compose up` starts all services without errors
- All services respond to health checks
- Order flow: POST /api/orders returns 201 with trace in Collector
- Failure scenarios trigger correctly (slow payment, 503, timeout, Redis failure, slow DB)
- Seed data script generates 50+ diverse requests
- Services are independently startable (for isolated testing)
- Database schema is correctly created and seeded

---

## Handoff Requirements

Before ending work, update `.ai/HANDOFF.md` with:
- Docker Compose status (which services are working)
- Each demo service status (implemented, tested, instrumented)
- Failure scenario status (which scenarios work)
- Seed data status
- Any Docker networking issues
- Outstanding issues or blockers

---

## Failure-Isolation Requirements

- Each demo service must be independently startable
- One service failure must not crash other services
- PostgreSQL failure must not crash services (return 503 gracefully)
- Redis failure must not crash Order Service (fallback to DB)
- OTel instrumentation failure must not break service logic (fail-open)
- Docker Compose must handle partial startup (some services up, some down)
