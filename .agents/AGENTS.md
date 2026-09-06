# BackendBhai — Agent Development Rules

> **Last Updated:** September 6, 2026
> **Project:** BackendBhai — "Chrome DevTools for backend systems"
> **Source of Truth:** `planning/` directory

---

## Overview

This is a five-workstream hackathon project. Five independently developable workstreams share a single repository through **contract-first development** and **mock-first integration**.

- `.agents/` — Shared development rules, standards, workflows, and role definitions
- `planning/` — Source-of-truth product and architecture documents (DO NOT MODIFY)
- `contracts/` — Shared integration contracts (API, events, telemetry, data model, versioning)
- `.ai/` — Local/private development state (per-developer working memory)
- `graphify-out/` — Generated repository structure and dependency information
- `apps/` — Application code for each major service
- `packages/` — Shared libraries and types
- `infrastructure/` — Docker Compose, OTel config, database init scripts
- `tests/` — Cross-workstream integration and end-to-end tests
- `scripts/` — Utility scripts (seed data, reset, demo)
- `docs/` — Documentation

---

## The Five Workstreams

### Workstream 1 — Telemetry / Instrumentation / Collector

**Developer:** Telemetry Specialist
**Primary Areas:** `apps/telemetry-collector/`, `packages/instrumentation/`
**Responsibilities:**
- OpenTelemetry instrumentation for all simulated backend services
- Trace, span, and log generation
- W3C trace context propagation
- HTTP, PostgreSQL, and Redis instrumentation
- Request/response body capture via shared middleware
- Trace-context-aware logging (console.log monkey-patch)
- OTLP pipeline configuration
- OTel Collector configuration (separate Docker container)
- OTLP HTTP export to DevTools server
- Telemetry contracts

### Workstream 2 — DevTools Core Platform

**Developer:** Core Platform Engineer
**Primary Areas:** `apps/devtools-core/`
**Responsibilities:**
- DevTools server (Fastify, Node.js, TypeScript)
- Telemetry ingestion API (OTLP HTTP receiver)
- PostgreSQL trace storage and schema
- Request Explorer APIs
- Trace detail APIs
- Filtering and pagination
- Waterfall data transformation
- Logs API
- DB query API
- External API API
- WebSocket API (live updates)
- Replay infrastructure (Tier 3)
- Comparison infrastructure (Tier 3)
- Secret redaction (two-layer)

### Workstream 3 — Frontend / UI

**Developer:** Frontend Engineer
**Primary Areas:** `apps/devtools-ui/`
**Responsibilities:**
- React + Vite + TypeScript application
- App shell (TopBar, Sidebar, StatusBar)
- Request Explorer (virtual-scrolled list, filters, search)
- Trace Waterfall (custom SVG, service-colored bars)
- Request Detail panel with tabs
- Overview tab (request/response headers and body)
- Logs tab (trace-scoped, filterable)
- DB Queries tab (SQL syntax highlighting)
- External APIs tab
- Command Palette (Cmd+K)
- Loading states, empty states, error states
- Animations and visual polish
- Desktop-first, dark-only design

### Workstream 4 — Demo Environment / Failure Simulation

**Developer:** Demo Environment Engineer
**Primary Areas:** `apps/demo-store/`, `infrastructure/`
**Responsibilities:**
- API Gateway service (:3000)
- Auth Service (:3001)
- Order Service (:3002)
- Payment Service (:3003)
- Mock Payment API (:4000)
- PostgreSQL ecommerce database
- Redis cache
- Deterministic failure scenarios
- Slow payment, payment 503, timeout, Redis failure, slow DB
- Seed data generation
- Demo reset and startup scripts

### Workstream 5 — Integration / Architecture / QA

**Developer:** Integration Engineer
**Primary Areas:** `contracts/`, `tests/`, `docs/`, `.ai/`
**Responsibilities:**
- Repository architecture and structure
- Shared contract maintenance
- Cross-workstream integration
- End-to-end testing
- API contract validation
- Telemetry-to-core integration
- Core-to-frontend integration
- Demo integration and validation
- Failure isolation enforcement
- Performance and reliability validation
- Integration documentation

---

## Communication Rules

### Independence

- Developers should work **independently wherever possible**
- Developers must **not directly depend on another workstream's internal implementation**
- Communication between workstreams happens **through contracts** (`contracts/` directory)

### Contract-First Development

- Before implementing a new feature, **read the relevant contracts**
- A workstream may implement an interface, but should **not silently redefine it**
- Changes to shared contracts must be **discussed and documented** in `.ai/DECISIONS.md`

### Mock-First Development

- **Use mocks when another component is not yet implemented**
- Each workstream must be testable with mock data
- The Request Explorer must work with seeded/mock data even if live telemetry is unavailable
- The DevTools core must be testable with fixture telemetry
- Integration tests must be able to use mocks

### Failure Isolation

- Failure of one workstream or service must **not unnecessarily destroy unrelated functionality**
- UI must be able to render seeded/mock data if live telemetry is unavailable
- DevTools core must be testable using fixture telemetry
- Telemetry collector failure must not corrupt stored data
- Demo services must be independently startable
- Frontend must have explicit loading/error/empty states
- APIs must fail gracefully
- WebSocket failure must not make the entire UI unusable

### No Silent Changes

- **No developer should silently change shared contracts**
- Architecture decisions must be **documented** in `.ai/DECISIONS.md`
- Contract changes must be **reviewed** before implementation begins

---

## Architecture Decisions (from Pre-Development Audit)

The following decisions are **mandatory** and override any contradictions in earlier planning documents:

1. **OTel Collector is a separate Docker container** — not embedded in the DevTools server process
2. **OTLP HTTP export** — Collector exports via `otlphttp` to DevTools server HTTP endpoint (not gRPC)
3. **Request body capture via shared middleware** — Express middleware captures `req.body` and response body, adds as span attributes
4. **Trace-context-aware logging via console.log monkey-patch** — auto-injects `trace_id` and `span_id` into all console output
5. **WebSocket payloads must match REST API response shapes exactly** — defined in shared types
6. **MVP priorities:** Request Explorer + Trace Waterfall + Overview + telemetry ingestion
7. **Tier 3 / optional:** Replay, Compare, Topology
8. **Not built:** Incident Timeline, dark-mode toggle, latency budget, export/share, service-health overview, production architecture

---

## Document Hierarchy

When documents conflict, use this precedence:

1. `planning/05-pre-development-audit.md` (highest authority)
2. `planning/02-implementation-blueprint.md`
3. `planning/03-development-backlog.md`
4. `planning/04-ui-ux-implementation-spec.md`
5. `planning/01-product-research-validation.md`
