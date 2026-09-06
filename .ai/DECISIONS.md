# Architecture Decisions — Dev 5 (Abhinav)

> **Status:** RESOLVED — ready to broadcast to team
> **Source:** dev5 §6, planning/05-pre-development-audit.md

---

## Resolved Decisions (Must Broadcast Before Coding)

### D-001: OTLP HTTP, Not gRPC

- **Issue:** Blueprint originally proposed gRPC receiver inside DevTools server. Audit rejected as too complex.
- **Resolution:** Use OTLP HTTP. Dev 2 exposes a plain HTTP endpoint. Dev 1's Collector exports via `otlphttp`.
- **Affects:** Dev 1 (Collector config), Dev 2 (HTTP receiver)
- **Action:** Confirm exact endpoint path with Dev 2 before broadcasting.
- **Status:** ⬜ Awaiting Dev 2's confirmation of path

### D-002: Separate Collector Container

- **Issue:** Blueprint §15.3 says Collector runs embedded; Docker Compose and backlog assume separate container.
- **Resolution:** Separate container. Matches what Dev 1 and Dev 4 are building.
- **Affects:** Dev 1, Dev 4
- **Status:** ✅ Resolved — separate container

### D-003: Body Capture via Shared Middleware

- **Issue:** OTel auto-instrumentation does NOT capture request/response bodies. Overview tab would be empty.
- **Resolution:** Dev 1 builds shared Express middleware setting `custom.http.request.body` / `custom.http.response.body` span attributes. Dev 2 reads these exact attribute names in OTLP receiver transform.
- **Affects:** Dev 1 (sets attributes), Dev 2 (reads attributes)
- **Status:** ⬜ Awaiting confirmation of exact attribute names between Dev 1 and Dev 2

### D-004: Console.log Monkey-Patch for Log Correlation

- **Issue:** Raw `console.log` has no trace context. Logs tab would be empty.
- **Resolution:** Dev 1's `createLogger` (or monkey-patch) injects `trace_id`/`span_id` into every log line. All services must use it.
- **Affects:** Dev 1 (implements), Dev 2 (ingests logs), Dev 3 (renders Logs tab)
- **Status:** ✅ Resolved — Dev 1 implements, all services consume

### D-005: WebSocket Payload = REST Response Shape

- **Issue:** If `new_request` WS event differs from `GET /api/v1/requests` item shape, frontend breaks.
- **Resolution:** Both must be identical. Codified as `RequestSummary` type in `packages/shared`. Everyone imports from there.
- **Affects:** Dev 2 (emits both), Dev 3 (consumes both)
- **Status:** ✅ Resolved — single type in `packages/shared`

### D-006: Single-Port Frontend Serving

- **Issue:** Blueprint's Docker Compose has separate frontend container on port 4002. But D-13 says Dev 2 serves static files on port 4001.
- **Resolution:** Dev 2 serves built React app at `/` on port 4001 (single port, no CORS). Port 4002 is reserved for Dev 4's e-commerce demo frontend (`S-09`).
- **Affects:** Dev 2 (serves), Dev 3 (builds), Dev 4 (port 4002 is theirs)
- **Status:** ✅ Resolved — confirm with Dev 2 and Dev 4

---

## Decisions Already Made by Audit (No Action Needed)

These are frozen by `planning/05-pre-development-audit.md` and all devs must follow them:

1. **MVP Tier 1:** Request Explorer + Waterfall + Overview + telemetry ingestion
2. **MVP Tier 2:** WebSocket updates, Logs, DB Queries, External APIs, Command Palette
3. **MVP Tier 3 (optional):** Topology, Replay, Compare
4. **Not built:** Incident Timeline, dark mode toggle, latency budget, export/share, service health overview, production architecture
5. **Dark-only design:** No light mode toggle
6. **Replay is "re-send the same HTTP request"** — not deterministic reproduction
7. **Topology is post-hoc derived** from stored spans, not live
8. **Feature freeze at T-4h, code freeze at T-2h**

---

## Pending Decisions (Awaiting Team Input)

| # | Decision | Waiting On | Deadline |
|---|----------|------------|----------|
| P-1 | OTLP endpoint exact path (`/v1/traces` or `/otlp/v1/traces`?) | Dev 2 | Day 1 |
| P-2 | Body capture attribute exact names | Dev 1 + Dev 2 | Day 1 |
| P-3 | Redis span attribute shape (what does `@opentelemetry/instrumentation-redis` actually emit?) | Dev 1 (Day 1 test) | Day 1 |
| P-4 | Deterministic replay-mode flag for WireMock? (audit recommends, optional) | Dev 4 + Dev 2 | Day 2 |
| P-5 | Dev 3's build output directory for static serving | Dev 3 → Dev 2 | Day 3 |
