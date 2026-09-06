# Backend DevTools — Repository Initialization

> **Date:** September 6, 2026
> **Purpose:** Document the repository structure, workstream organization, and initialization decisions

---

## Why Five Workstreams?

Backend DevTools is a hackathon project that requires parallel development across multiple technology domains:

1. **Telemetry/Instrumentation** — OpenTelemetry, OTel Collector, trace propagation
2. **Core Platform** — Fastify server, PostgreSQL, REST APIs, WebSocket
3. **Frontend/UI** — React, Vite, custom SVG waterfall, dark-only design
4. **Demo Environment** — Microservices, Docker Compose, failure scenarios
5. **Integration/QA** — Contracts, testing, validation, documentation

Each workstream can proceed independently because:

- **Contract-first development** defines clear interfaces between workstreams
- **Mock-first development** allows each workstream to test without waiting for others
- **Failure isolation** ensures one workstream's problems don't cascade

---

## Responsibility of Each Developer

| Workstream | Role | Primary Areas | Key Deliverables |
|------------|------|---------------|-----------------|
| 1 | Telemetry Specialist | `packages/instrumentation/`, `apps/telemetry-collector/` | OTel instrumentation, Collector config, body capture, log correlation |
| 2 | Core Platform Engineer | `apps/devtools-core/` | DevTools server, APIs, WebSocket, storage |
| 3 | Frontend Engineer | `apps/devtools-ui/` | React UI, Request Explorer, Waterfall, Context Panel |
| 4 | Demo Environment Engineer | `apps/demo-store/`, `infrastructure/` | Simulated backend, failure scenarios, Docker Compose |
| 5 | Integration Engineer | `contracts/`, `tests/`, `docs/`, `.ai/` | Contracts, testing, validation, documentation |

---

## Shared vs Private Directories

### Shared (All Workstreams)

| Directory | Purpose | Access |
|-----------|---------|--------|
| `planning/` | Source-of-truth planning documents | Read-only (DO NOT MODIFY) |
| `contracts/` | Shared integration contracts | Co-owned, changes require coordination |
| `.agents/` | Development rules and standards | Read-only (maintained by Workstream 5) |
| `packages/shared-types/` | TypeScript interfaces | Co-owned, changes require coordination |

### Private (Per Workstream)

| Directory | Workstream |
|-----------|------------|
| `apps/telemetry-collector/` | 1 — Telemetry |
| `packages/instrumentation/` | 1 — Telemetry |
| `apps/devtools-core/` | 2 — Core Platform |
| `apps/devtools-ui/` | 3 — Frontend |
| `apps/demo-store/` | 4 — Demo Environment |
| `infrastructure/` | 4 — Demo Environment |
| `.ai/` | 5 — Integration (per-developer state) |
| `tests/` | 5 — Integration |
| `docs/` | 5 — Integration |
| `scripts/` | 4 — Demo / 5 — Integration |

---

## Contract-First Architecture

All inter-workstream communication happens through contracts in `contracts/`:

- **API.md** — REST API endpoints (Core → Frontend)
- **EVENTS.md** — WebSocket events (Core → Frontend)
- **TELEMETRY.md** — Trace/span/log model (Telemetry → Core)
- **DATA_MODEL.md** — Database schema (Core + Telemetry)
- **VERSIONING.md** — Versioning policy (All)

**Rule:** Before implementing a new feature, read the relevant contract. If the contract doesn't exist, create it first.

---

## Mock-First Development

Each workstream must be testable with mock data:

- **Frontend:** Can render with seeded/mock data if backend is unavailable
- **Core:** Can be tested with fixture telemetry (no live Collector needed)
- **Telemetry:** Can be verified with a single test service
- **Demo:** Can be started independently for traffic generation
- **Integration:** Tests can use mocks for all components

**Rule:** No workstream should be blocked waiting for another workstream's implementation.

---

## Failure Isolation

This is a mandatory architectural rule:

- **UI renders mock data** if live telemetry is unavailable
- **DevTools core handles DB failures** gracefully (503, not crash)
- **OTel Collector failure** doesn't corrupt stored data
- **Demo services are independently startable**
- **Frontend has loading/error/empty states** for all async data
- **APIs return proper error responses** (consistent error format)
- **WebSocket disconnection** doesn't crash the UI
- **Integration tests use mocks** when components are unavailable

---

## How Handoffs Work

Before ending a work session, each developer updates `.ai/HANDOFF.md` with:

1. What was completed
2. What is in progress
3. What is blocked
4. What the next developer should do
5. Gotchas and important context

This ensures a developer can **close their coding agent and resume later** by reading the `.ai/` files.

---

## How .ai/ Is Maintained

The `.ai/` directory is **per-developer working memory**:

| File | Purpose | Updated When |
|------|---------|-------------|
| `ACTIVE_TASK.md` | Current task description | Start of each task |
| `CONTEXT.md` | Developer context and knowledge | Start of session |
| `DECISIONS.md` | Architecture decision log | When decisions are made |
| `FLOW.md` | Development flow progress | End of each session |
| `PHASE_PLAN.md` | Phase-by-phase task plan | Start of each phase |
| `PROJECT_STATE.json` | Structured project state | End of each session |
| `ROADMAP.md` | Development roadmap | As needed |
| `SESSION.md` | Session log | End of each session |
| `TASKS.md` | Task tracking | When tasks change |
| `HANDOFF.md` | Handoff notes | End of each session |

---

## How Planning Documents Are Used

The five planning documents in `planning/` are the **source of truth**:

1. `01-product-research-validation.md` — What we're building and why
2. `02-implementation-blueprint.md` — How we're building it (architecture)
3. `03-development-backlog.md` — What tasks need to be done
4. `04-ui-ux-implementation-spec.md` — What the UI should look like
5. `05-pre-development-audit.md` — What the auditors found (highest authority)

**Precedence:** When documents conflict, use this order: 05 > 02 > 03 > 04 > 01

**Rule:** These documents are read-only during development. Do not modify them.

---

## Architecture Decisions from Pre-Development Audit

The pre-development audit (`planning/05-pre-development-audit.md`) made these mandatory decisions:

1. **OTel Collector is a separate Docker container** — not embedded in DevTools server
2. **OTLP HTTP export** — Collector uses `otlphttp` exporter (not gRPC)
3. **Request body capture via shared middleware** — Express middleware captures bodies
4. **Console.log monkey-patch** — auto-injects trace context into all console output
5. **WebSocket payloads match REST shapes** — `new_request` event = REST list item shape
6. **MVP priorities:** Request Explorer + Waterfall + Overview + telemetry ingestion
7. **Tier 3 (optional):** Replay, Compare, Topology
8. **Not built:** Incident Timeline, dark mode toggle, latency budget, export/share, service health, production architecture

These decisions are documented in detail in `.ai/DECISIONS.md`.
