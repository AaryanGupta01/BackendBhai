# Architecture Decisions

> **Maintained by:** Integration Engineer (Workstream 5)
> **Purpose:** Document all significant architecture decisions and their rationale

---

## Decision Log

### D-001: Repository Structure — Five Workstreams

- **Date:** September 6, 2026
- **Decision:** Split the repository into five independently developable workstreams
- **Rationale:** Parallel development with clear boundaries; contract-first integration
- **Impact:** All developers; `.agents/`, `contracts/`, `.ai/` directories created
- **Status:** Implemented

### D-002: OTel Collector as Separate Container

- **Date:** September 6, 2026
- **Source:** `planning/05-pre-development-audit.md` (Architecture Issue #2)
- **Decision:** OTel Collector runs as a separate Docker container, not embedded in DevTools server
- **Rationale:** Simpler to debug, aligns with backlog tasks, standard deployment pattern
- **Impact:** Workstream 1 (Collector config), Workstream 4 (Docker Compose)
- **Status:** Implemented in contracts

### D-003: OTLP HTTP Export (Not gRPC)

- **Date:** September 6, 2026
- **Source:** `planning/05-pre-development-audit.md` (Architecture Issue #1)
- **Decision:** Collector exports via OTLP HTTP (`otlphttp` exporter) to DevTools server, not gRPC
- **Rationale:** Simpler to implement; DevTools server receives plain JSON, not protobuf
- **Impact:** Workstream 1 (Collector config), Workstream 2 (HTTP receiver instead of gRPC)
- **Status:** Implemented in contracts

### D-004: Request Body Capture via Shared Middleware

- **Date:** September 6, 2026
- **Source:** `planning/05-pre-development-audit.md` (Architecture Issue #3)
- **Decision:** Request/response bodies captured via shared Express middleware in `packages/instrumentation/`
- **Rationale:** Auto-instrumentation doesn't capture bodies; shared middleware ensures consistency
- **Impact:** Workstream 1 (middleware implementation), Workstream 4 (demo services use middleware)
- **Status:** Implemented in contracts

### D-005: Console.log Monkey-Patch for Log Correlation

- **Date:** September 6, 2026
- **Source:** `planning/05-pre-development-audit.md` (Architecture Issue #4)
- **Decision:** Patch `console.log`/`console.error` to auto-inject `trace_id` and `span_id`
- **Rationale:** OTel auto-instrumentation doesn't attach trace context to console output; monkey-patch ensures zero-change log correlation
- **Impact:** Workstream 1 (patch implementation), Workstream 2 (log storage)
- **Status:** Implemented in contracts

### D-006: WebSocket Payload Shape = REST Response Shape

- **Date:** September 6, 2026
- **Source:** `planning/05-pre-development-audit.md` (MUST FIX #5)
- **Decision:** `new_request` WebSocket event payload MUST match `GET /api/v1/requests` response item shape exactly
- **Rationale:** Frontend inserts WebSocket events into React Query cache directly; shape mismatch breaks UI
- **Impact:** Workstream 2 (WebSocket handler), Workstream 3 (API client)
- **Status:** Implemented in contracts (shared `RequestSummary` type)

### D-007: MVP Feature Priority

- **Date:** September 6, 2026
- **Source:** `planning/05-pre-development-audit.md` (MVP Freeze)
- **Decision:** Tier 1 (must have): Request Explorer, Waterfall, Overview, telemetry ingestion, seed data. Tier 2: WebSocket updates, Logs, DB Queries, External APIs, Command Palette. Tier 3 (optional): Topology, Replay, Compare.
- **Rationale:** Core value is Request Explorer → Waterfall → Context Panel. Everything else is additive.
- **Impact:** All workstreams — focus on core before Tier 3 features
- **Status:** Documented

### D-008: Dark-Only Design

- **Date:** September 6, 2026
- **Source:** `planning/05-pre-development-audit.md` (UI Freeze)
- **Decision:** Dark theme only. No light mode. No dark mode toggle.
- **Rationale:** Simplifies UI implementation; matches developer tool aesthetic
- **Impact:** Workstream 3 (frontend styling)
- **Status:** Documented

---

## Notable Exclusions

The following were explicitly removed by the pre-development audit:

- Incident Timeline
- Dark mode toggle
- Latency budget breakdown
- Export/share trace
- Service health overview
- Production architecture views
