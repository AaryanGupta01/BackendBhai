# BackendBhai

> **Chrome DevTools for backend systems.**

BackendBhai is a browser-based developer tool that presents one backend request as a complete interactive execution story — showing every service, database query, external API call, and log entry for a single request in a single view.

---

## Project Goal

Backend developers lack a browser-based, request-centric debugging tool. When a bug is reported, they switch between 6+ disconnected tools (logs, databases, API clients, tracing UIs) to understand what happened in one request. BackendBhai unifies this into a single, beautiful, Chrome DevTools-like experience.

---

## High-Level Architecture

```
React SPA (Vite)
    ↓ REST + WebSocket
DevTools Server (Fastify, Node.js)
    ↓
PostgreSQL (trace storage)

OTel Collector (Docker container)
    ↓ OTLP HTTP
DevTools Server

Simulated E-Commerce Backend
    ↓ OTLP
OTel Collector
```

---

## Five Workstreams

This project is divided into five independently developable workstreams:

| # | Workstream | Primary Areas |
|---|------------|---------------|
| 1 | **Telemetry / Instrumentation** | `packages/instrumentation/`, `apps/telemetry-collector/` |
| 2 | **DevTools Core Platform** | `apps/devtools-core/` |
| 3 | **Frontend / UI** | `apps/devtools-ui/` |
| 4 | **Demo Environment** | `apps/demo-store/`, `infrastructure/` |
| 5 | **Integration / QA** | `contracts/`, `tests/`, `docs/` |

Each workstream communicates through shared contracts in `contracts/`.

---

## Current Development Status

**STATUS: INITIALIZED — NOT STARTED**

- ✅ Repository structure created
- ✅ Shared contracts defined (`contracts/`)
- ✅ Development rules and standards (` `.agents/`)
- ✅ Architecture decisions documented (`.ai/DECISIONS.md`)
- ⬜ Telemetry instrumentation — not started
- ⬜ DevTools server — not started
- ⬜ Frontend UI — not started
- ⬜ Demo environment — not started
- ⬜ Integration testing — not started

---

## Planning Documents

All product and architecture decisions are documented in `planning/`:

| Document | Purpose |
|----------|---------|
| `01-product-research-validation.md` | Product research, competitive analysis, feature classification |
| `02-implementation-blueprint.md` | Architecture, data flow, trace model, API spec |
| `03-development-backlog.md` | Engineering tasks, dependencies, team assignment |
| `04-ui-ux-implementation-spec.md` | UI architecture, design system, components |
| `05-pre-development-audit.md` | Architecture audit, mandatory decisions, scope freeze |

---

## Contracts

Shared integration contracts are in `contracts/`:

| Contract | Purpose |
|----------|---------|
| `API.md` | REST API endpoint definitions |
| `EVENTS.md` | WebSocket event types and payloads |
| `TELEMETRY.md` | OpenTelemetry trace/span/log model |
| `DATA_MODEL.md` | PostgreSQL database schema |
| `VERSIONING.md` | Contract versioning policy |

---

## Development Rules

See `.agents/AGENTS.md` for full development rules. Key principles:

- **Contract-first development** — Design interfaces before implementation
- **Mock-first development** — Test with mocks when components aren't available
- **Failure isolation** — One component's failure must not cascade
- **No silent contract changes** — Document all changes
- **Persistent working memory** — Use `.ai/` files to track state

---

## Getting Started

> **⚠️ This project is not yet implemented. The commands below are placeholders.**

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- pnpm

### Start the Application

```bash
# Start all services
docker compose up --build

# Seed demo data
make seed

# Open in browser
open http://localhost:4001
```

### Run Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# End-to-end tests
pnpm test:e2e
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State Management | Zustand (client), React Query (server) |
| Backend | Node.js, Fastify, TypeScript |
| Database | PostgreSQL |
| Telemetry | OpenTelemetry, OTLP HTTP |
| Infrastructure | Docker Compose |
| Testing | Vitest, Playwright |

---

## License

Hackathon project — not licensed for production use.
