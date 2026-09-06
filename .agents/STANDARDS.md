# BackendBhai — Project Standards

> **Last Updated:** September 6, 2026
> **Applies to:** All five workstreams

---

## Architecture Standards

- **Contract-first development** — Design interfaces before implementation
- **Modular design** — Each component has a single responsibility
- **Clear boundaries** — Workstreams communicate through contracts, not implementation
- **Dependency inversion** — Depend on abstractions where useful
- **No unnecessary coupling** — Services should be independently testable and deployable
- **Failure isolation** — Failure in one component must not cascade to unrelated components

---

## Backend Standards

- **Language:** TypeScript
- **Runtime:** Node.js
- **HTTP Framework:** Fastify (DevTools core server)
- **HTTP Framework (Demo Services):** Express.js (simulated backend)
- **Database:** PostgreSQL (both devtools and ecommerce databases)
- **Cache:** Redis (simulated backend session/cart cache)
- **API Style:** REST APIs (JSON request/response)
- **WebSocket:** Only where explicitly specified (live updates: `new_request`, `replay_complete`)
- **Error Handling:** Structured error responses with consistent format (see `contracts/API.md`)
- **Configuration:** Environment variables for connection strings, ports, feature flags
- **Logging:** Structured JSON logging with trace context injection

---

## Frontend Standards

- **Framework:** React 18+
- **Language:** TypeScript
- **Build Tool:** Vite
- **State Management (Client):** Zustand
- **State Management (Server):** React Query (TanStack Query)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (component library)
- **Waterfall Visualization:** Custom SVG (no D3 dependency)
- **Service Topology:** React Flow (if implemented — Tier 3)
- **Desktop-first:** No responsive mobile layout
- **Virtual Scrolling:** `@tanstack/react-virtual` for request list
- **Routing:** React Router
- **API Client:** Typed fetch functions with React Query hooks

---

## Telemetry Standards

- **Framework:** OpenTelemetry (Node.js SDK)
- **Trace Context:** W3C Trace Context (`traceparent` header)
- **Export Protocol:** OTLP HTTP (Collector to DevTools server)
- **Collector:** Separate Docker container (`otel/opentelemetry-collector-contrib`)
- **Auto-Instrumentation:** Express HTTP, pg (PostgreSQL), Redis
- **Request Body Capture:** Shared Express middleware (adds `req.body` as span attribute)
- **Response Body Capture:** Shared Express middleware (adds response body as span attribute)
- **Log Correlation:** Console.log monkey-patch injects `trace_id` and `span_id`
- **Semantic Conventions:** Follow OTel semantic conventions for HTTP, database, and external call attributes

---

## Testing Standards

- **Unit Tests:** Where appropriate (services, utilities, data transformations)
- **API Tests:** All REST endpoints tested with real database (Vitest + supertest)
- **Integration Tests:** Cross-component tests (telemetry → core → frontend)
- **End-to-End Tests:** Full vertical slice validation
- **Test Framework:** Vitest
- **Demo Scenarios:** Deterministic, seeded, reproducible
- **Mock Usage:** All workstreams must be testable with mock/fixture data
- **Coverage Target:** >80% on core business logic (services, transformations)

---

## Security Standards

- **Local-first:** All services run on localhost
- **Fake credentials only:** Demo database uses fake users, fake payments, fake orders
- **Telemetry redaction:** Two-layer approach:
  1. OTel Collector: redact `authorization`, `cookie`, `x-api-key` headers
  2. DevTools server: redact `password`, `token`, `secret`, `credit_card`, `ssn` in body fields
- **No real secrets:** No production API keys, no real credentials
- **Replay safety:** Replay only executes against simulated backend (localhost:3000)
- **Access control:** None required for hackathon (local-only deployment)

---

## Git Standards

- **Small, focused commits:** One logical change per commit
- **Descriptive commit messages:** Explain what changed and why
- **No generated junk:** Do not commit `node_modules/`, build output, IDE files
- **No secrets:** Do not commit API keys, passwords, or credentials
- **No unrelated changes:** Keep commits scoped to a single workstream when possible
- **Branch naming:** `feat/workstream-name/short-description` or `fix/workstream-name/short-description`
- **Contract changes:** Always update `contracts/` and document in `.ai/DECISIONS.md`

---

## Code Quality Standards

- **TypeScript strict mode** where possible
- **No `any` types** in new code (use proper types or `unknown`)
- **Consistent error handling:** All async operations wrapped in try/catch
- **No console.log in production code** (use structured logger)
- **Shared types:** All cross-workstream types live in `packages/shared-types/`
- **No hardcoded values:** Use environment variables for configuration
- **Fail gracefully:** Components must handle missing data, network errors, and partial failures
