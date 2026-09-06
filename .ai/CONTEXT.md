# Developer Context

> **Developer:** Integration Engineer (Workstream 5)
> **Role:** Integration / Architecture / QA
> **Primary Areas:** `contracts/`, `tests/`, `docs/`, `.ai/`

---

## What This Developer Needs to Know

### Project Overview

BackendBhai is "Chrome DevTools for backend systems" — a browser-based developer tool that presents one backend request as a complete interactive execution story.

### Architecture

```
React SPA → REST + WebSocket → DevTools Server (Fastify) → PostgreSQL
                                     ↑
OTel Collector → OTLP HTTP → DevTools Server
                                     ↑
Simulated Backend → OTLP → OTel Collector
```

### Five Workstreams

1. **Telemetry** — OTel instrumentation, Collector config, body capture, log correlation
2. **Core Platform** — DevTools server, APIs, WebSocket, storage
3. **Frontend** — React UI, Request Explorer, Waterfall, Context Panel
4. **Demo Environment** — Simulated e-commerce backend, failure scenarios, seed data
5. **Integration** (this developer) — Contracts, testing, validation, documentation

### Key Architecture Decisions

- OTel Collector is a **separate Docker container** (not embedded)
- OTLP **HTTP** export (not gRPC)
- Request body capture via **shared Express middleware**
- Trace-context-aware logging via **console.log monkey-patch**
- WebSocket payloads must **match REST API shapes exactly**
- MVP: Request Explorer + Waterfall + Overview + telemetry ingestion
- Tier 3: Replay, Compare, Topology

### Source of Truth

Planning documents in `planning/` (precedence: 05 > 02 > 03 > 04 > 01)

### Shared Contracts

- `contracts/API.md` — REST API endpoints
- `contracts/EVENTS.md` — WebSocket events
- `contracts/TELEMETRY.md` — trace/span/log model
- `contracts/DATA_MODEL.md` — database schema
- `contracts/VERSIONING.md` — versioning policy

---

## Current State

- Repository structure initialized
- All five contracts defined
- All five role files created
- Documentation created
- Waiting for workstream implementations to begin
