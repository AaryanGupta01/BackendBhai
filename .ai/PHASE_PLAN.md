# Phase Plan — Dev 5 (Abhinav) — Integration, Architecture & QA

> **Developer:** Dev 5 (Abhinav)
> **Role:** Integration / Architecture / QA
> **Status:** PLANNING — NOT STARTED

---

## Cross-Workstream Dependency Map

Before any phases begin, here is the exact dependency graph across all five devs:

```
Dev 4: I-01 (Monorepo) ──┬──→ Dev 1: S-01 (Shared tracing init)
                          ├──→ Dev 2: D-01 (Fastify scaffold)
                          ├──→ Dev 3: F-01 (React scaffold)
                          └──→ Dev 5: packages/shared types

Dev 4: I-02 (Docker Compose) ──→ Dev 1: I-04 (OTel Collector config)
                                ──→ Dev 2: D-02 (DB connection)
                                ──→ Dev 3: (testing)

Dev 4: I-03 (DB schemas) ──→ Dev 1: S-04 (Order Service needs DB)
                           ──→ Dev 2: D-02 (runs migrations)

Dev 5: packages/shared ──→ Dev 1: (imports types)
                         ──→ Dev 2: (imports types)
                         ──→ Dev 3: (imports types)

Dev 1: S-04 (Order Service) ──→ Dev 1 ↔ Dev 2 pairing (OTLP pipeline)

Dev 2: D-04 (Request List API) ──→ Dev 3: F-03 (Request Explorer)
Dev 2: D-05 (Request Detail API) ──→ Dev 3: W-01 (Detail shell)
Dev 2: D-06 (Waterfall API) ──→ Dev 3: W-02 (Waterfall chart)
Dev 2: D-07 (Logs API) ──→ Dev 3: C-01 (Logs tab)
Dev 2: D-09 (WebSocket) ──→ Dev 3: F-06 (Live updates)
Dev 2: D-13 (Static serving) ──→ Dev 3: (production build)

Dev 1: S-04 + Dev 4: S-07/S-08 ──→ Dev 5: P-05 (E2E test)
Dev 2: D-06, D-10, D-11 ──→ Dev 5: P-03 (Unit tests)
Dev 2: D-04–D-07 ──→ Dev 5: P-04 (Integration tests)
```

---

## Phase 0 — Unblocking Tasks (Day 1, Hours 1-3)

**Goal:** Remove all blockers so Dev 1, Dev 2, and Dev 3 can start immediately.

| # | Task | My Action | Blocks | Hours |
|---|------|-----------|--------|-------|
| 0.1 | Publish `packages/shared` types (dev5 §5) | Create `packages/shared/` with `src/types.ts` containing ALL interfaces from dev5 §5. Publish as npm package or workspace reference. **Even a first draft is better than nothing — iterate later.** | Dev 1, Dev 2, Dev 3 (all import from here) | 2 |
| 0.2 | Resolve & broadcast 6 architecture decisions (dev5 §6) | Document resolutions in `.ai/DECISIONS.md` and notify Dev 1, Dev 2, Dev 4 via `.ai/HANDOFF.md` | Dev 1 (OTLP path), Dev 2 (HTTP receiver), Dev 4 (port layout) | 1 |
| 0.3 | Confirm OTLP receiving path with Dev 2 | Get the exact endpoint path Dev 2 will expose (e.g., `/v1/traces`). Tell Dev 1 so their Collector config points there. | Dev 1's I-04, Dev 2's D-03 | 0.5 |
| 0.4 | Confirm body-capture attribute names with Dev 1 + Dev 2 | Verify `custom.http.request.body` / `custom.http.response.body` are agreed between Dev 1 (sets them) and Dev 2 (reads them) | Dev 1's S-01, Dev 2's D-03 | 0.5 |

**Exit Criteria:** `packages/shared` builds; all 5 devs have confirmed types; architecture decisions are documented and broadcast; OTLP path is agreed.

---

## Phase 1 — Architecture Validation (Day 1-2)

**Goal:** Validate the highest-risk technical unknowns before the team goes deep.

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 1.1 | Monitor Dev 4's monorepo scaffold (I-01) | Verify `pnpm install && pnpm -r build` succeeds. This is the team's Day 1 dependency. | Dev 4: I-01 | 0.5 |
| 1.2 | Monitor Dev 4's Docker Compose (I-02) | Verify postgres, redis, otel-collector start with health checks. Confirm single-port approach (port 4001 for DevTools, port 4002 for e-commerce frontend). | Dev 4: I-02 | 0.5 |
| 1.3 | Validate Dev 1's Day-1 unknown check (db.statement) | Ask Dev 1 to report: does `@opentelemetry/instrumentation-pg` capture `db.statement`? What attribute shape does Redis use? Report findings to Dev 2 and Dev 3. | Dev 1: §8 | 0.5 |
| 1.4 | Confirm failure module signatures with Dev 1 + Dev 4 | Verify `failures.ts` function signatures are agreed: `maybeInjectOrderDelay`, `maybeInjectCacheMiss`, `maybeInjectAuthTimeout`. Check they're exported correctly. | Dev 1: §7, Dev 4: §6.4 | 0.5 |

**Exit Criteria:** Monorepo builds; Docker Compose starts infra; db.statement capture confirmed; failure signatures agreed.

---

## Phase 2 — First OTLP Pipeline Validation (Day 2-3)

**Goal:** The project's single most critical integration point — broker this personally.

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 2.1 | Get Dev 1's Order Service (S-04) emitting real spans | Confirm Dev 1 has a working Order Service with DB + Redis spans | Dev 1: S-04 | — |
| 2.2 | Get Dev 2's OTLP receiver (D-03) accepting traces | Confirm Dev 2 can receive and store a synthetic trace | Dev 2: D-03 | — |
| 2.3 | **Broker Dev 1 ↔ Dev 2 pairing session** | Get both in the same room/call. Send a real order through the pipeline. Verify: trace appears in PostgreSQL, spans have correct parent-child, db.statement is populated, request/response bodies are stored, logs correlate by trace_id. | Dev 1: S-04 + Dev 2: D-03 | 3 |
| 2.4 | Validate redaction end-to-end | Send a request with fake `Authorization` header. Verify Collector redacts it (Layer 1) AND server redacts it (Layer 2). Check stored rows. | Dev 1 + Dev 2 | 1 |
| 2.5 | Update `packages/shared` if shapes drifted | After real data flows, check if any types need updating. Notify all consuming devs immediately. | After 2.3 | 1 |

**Exit Criteria:** Real trace from Dev 1's services → Dev 2's PostgreSQL with correct spans, logs, bodies, and redaction. Both devs confirm the data shapes match.

---

## Phase 3 — API Contract Validation (Day 3-4)

**Goal:** Verify Dev 2's APIs match the contracts exactly, before Dev 3 builds UI against them.

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 3.1 | Test `GET /api/v1/requests` against real data | Verify response shape matches `RequestSummary` from `packages/shared`. Check pagination, filtering, sorting. | Dev 2: D-04 + Phase 2 | 1 |
| 3.2 | Test `GET /api/v1/requests/:traceId` | Verify trace + spans + logs + db_queries + external_calls shape. Check db_queries extraction logic. | Dev 2: D-05 | 1 |
| 3.3 | Test `GET /api/v1/traces/:traceId/waterfall` | Verify start_offset_ms + duration_ms never exceeds total_duration_ms. Check depth/order computation. | Dev 2: D-06 | 0.5 |
| 3.4 | Test `GET /api/v1/traces/:traceId/logs` | Verify level/service filtering. Check log-trace correlation. | Dev 2: D-07 | 0.5 |
| 3.5 | Test WebSocket `new_request` payload | Connect via wscat. Send a test trace. Verify `new_request` event fires within 1s. **Verify payload is byte-for-byte identical to a `requests[]` item.** This is explicitly flagged as a risk. | Dev 2: D-09 | 1 |
| 3.6 | Test `GET /api/v1/topology` (if implemented) | Verify nodes (unique services) and edges (cross-service parent-child). | Dev 2: D-08 | 0.5 |
| 3.7 | File contract violations with Dev 2 | If any response shape doesn't match the contract, file it as a bug. No quiet workarounds. | After 3.1-3.6 | 0.5 |

**Exit Criteria:** All REST endpoints return shapes matching `packages/shared` types. WebSocket payload matches REST. Any violations filed and fixed.

---

## Phase 4 — Testing (Day 3-5, overlapping with Phase 3)

**Goal:** Build and run tests as endpoints stabilize, not after everything is "finished."

### 4A. Unit Tests (P-03, with Dev 2)

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 4A.1 | CompareService unit tests | Test span matching by `service_name + operation_name`, duration diff, status match. | Dev 2: D-11 | 2 |
| 4A.2 | TraceService unit tests | Test waterfall computation (offsets, depths, ordering, invariant check). | Dev 2: D-06 | 1 |
| 4A.3 | ReplayService unit tests | Test snapshot extraction, request construction. | Dev 2: D-10 | 1 |

### 4B. Integration Tests (P-04, with Dev 2)

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 4B.1 | Request list API tests | Paginate, filter, sort, error responses. Against real DB. | Dev 2: D-04 | 2 |
| 4B.2 | Request detail API tests | Full trace + categorized spans. | Dev 2: D-05 | 1 |
| 4B.3 | Waterfall API tests | Invariant: offset + duration ≤ total. | Dev 2: D-06 | 1 |
| 4B.4 | Logs API tests | Level/service filtering. | Dev 2: D-07 | 0.5 |
| 4B.5 | WebSocket integration test | Connect, receive `new_request`, verify shape. | Dev 2: D-09 | 1 |

### 4C. Failure Scenario Tests (my unique cross-workstream test)

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 4C.1 | Slow payment test | Trigger payment → verify payment span > 3000ms in waterfall. | Dev 1 + Dev 4 | 1 |
| 4C.2 | Payment 503 test | Trigger 20th request → verify 503 error span + error log. | Dev 1 + Dev 4 | 1 |
| 4C.3 | Auth timeout test | Send invalid token → verify 5s auth span + timeout error. | Dev 1 + Dev 4 | 0.5 |
| 4C.4 | Redis failure test | Trigger every-30th request → verify Redis error span + DB fallback. | Dev 1 + Dev 4 | 0.5 |
| 4C.5 | Slow DB test | Send order with >10 items → verify 3s DB span. | Dev 1 + Dev 4 | 0.5 |

**Exit Criteria:** All unit tests pass (>80% coverage on services). All integration tests pass. All 5 failure scenarios verified.

---

## Phase 5 — E2E Smoke Test (P-05, Day 4-5)

**Goal:** Full vertical slice: start stack → place order → see in Request Explorer → view waterfall → replay → compare.

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 5.1 | Write E2E smoke test script | Script: docker compose up → wait → seed → make order → verify in Request Explorer → click → verify waterfall → verify logs → verify DB queries → replay → compare. | Phases 2-4 | 3 |
| 5.2 | Run E2E test against live stack | Execute the script. Debug any failures. | 5.1 | 1 |
| 5.3 | Fix any integration failures found | File bugs with relevant dev, verify fixes. | 5.2 | 2 |

**Exit Criteria:** E2E script completes without errors. Full vertical slice works.

---

## Phase 6 — UI Polish Pass (P-06, with Dev 3, Day 4-5)

**Goal:** Verify Dev 3's UI matches the spec and works with real data.

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 6.1 | Verify Request Explorer | Virtual scroll handles 100+ requests. Filters compose correctly. Color coding matches §6 of dev3. | Dev 3: F-03–F-06 | 1 |
| 6.2 | Verify Waterfall | Proportional bars, depth indentation, service colors, hover tooltips, click-to-expand. | Dev 3: W-02 | 1 |
| 6.3 | Verify Context Panel tabs | Overview, Logs, DB Queries, External Calls all render correctly with real data. | Dev 3: C-01–C-03 | 1 |
| 6.4 | Verify error/empty/loading states | Every data-fetching component has loading skeleton, empty state, error state with retry. No blank screens. | Dev 3: P-02 | 1 |
| 6.5 | Verify Frontend static serving (D-13) | `curl localhost:4001/` returns HTML. React app loads from Dev 2's server. | Dev 2: D-13 | 0.5 |

**Exit Criteria:** UI matches spec; all screens render with real data; no console errors; no blank screens.

---

## Phase 7 — Demo Script & Readiness (Day 5, Final)

**Goal:** Write, rehearse, and validate the demo.

| # | Task | My Action | Depends On | Hours |
|---|------|-----------|------------|-------|
| 7.1 | Write demo script (P-07) | 5-minute script per dev5 §11. Include timing, talking points, demo flow. | Phases 5-6 | 2 |
| 7.2 | Write demo readiness checklist | Run through dev5 §12 checklist item by item. | 7.1 | 1 |
| 7.3 | Pre-seed database | Run `make seed` to populate 50+ diverse requests. Verify they appear in UI. | Dev 4: I-07 + Dev 2: D-03 | 1 |
| 7.4 | Rehearse demo at least 2 times | Run the full demo script. Identify timing issues, failures, awkward transitions. | 7.1 + 7.3 | 2 |
| 7.5 | Prepare backup plan | Screenshots/video of key demo moments in case Docker fails live. | 7.4 | 1 |
| 7.6 | Docker Compose reliability test | Start the stack 10+ times. Verify it comes up clean every time. | Dev 4 | 1 |

**Exit Criteria:** Demo script written. Checklist fully green. Rehearsed 2+ times. Backup ready.

---

## Phase 8 — Freeze Enforcement (Final Hours)

| Time | Action | My Responsibility |
|------|--------|-------------------|
| T-4h | **Feature freeze** | Announce to team. No new features. Bug fixes, CSS tweaks, tests only. |
| T-2h | **Code freeze** | Announce to team. `git commit --amend` for critical bugs only. |
| T-1h | **Final** | Demo rehearsal only. No changes. |
| T-0 | **Demo** | Execute the script. |

---

## Emergency Cut Decisions (if behind schedule)

Execute in this exact order — never skip ahead:

| Priority | Feature | Saves | Decision Maker |
|----------|---------|-------|----------------|
| 1 (cut first) | Request Comparison | 6-8h | Me (Dev 5) |
| 2 | Request Replay | 10-12h | Me |
| 3 | Service Topology | 5-7h | Me |
| 4 | Command Palette | 2-3h | Me |
| 5 | WebSocket live updates | 4-5h | Me (revert to polling) |
| 6 | E-commerce demo frontend | 3-4h | Me (use curl instead) |
| 7 | External Calls tab | 2-3h | Me |
| 8 | DB Queries tab | 2-3h | Me |
| 9 | Seed data script | 2-3h | Me (generate manually) |
| 10 (cut last) | Failure injection | 2-3h | Me |

**Non-negotiable minimum:** Docker Compose starts → order captures trace → trace visible in Explorer → waterfall with timing → Overview shows request/response.

---

## Summary Timeline

| Day | Phase | Key Deliverable |
|-----|-------|-----------------|
| **Day 1** | Phase 0 | `packages/shared` published; architecture decisions broadcast; OTLP path agreed |
| **Day 1-2** | Phase 1 | Monorepo builds; Docker Compose starts; db.statement confirmed |
| **Day 2-3** | Phase 2 | **First real trace flows end-to-end** (Dev 1 → Dev 2 → PostgreSQL) |
| **Day 3-4** | Phase 3 | All API contracts validated; WebSocket shape confirmed |
| **Day 3-5** | Phase 4 | Unit + integration + failure scenario tests pass |
| **Day 4-5** | Phase 5 | E2E smoke test passes |
| **Day 4-5** | Phase 6 | UI polish pass complete; static serving works |
| **Day 5** | Phase 7 | Demo script written, rehearsed, backup ready |
| **Final** | Phase 8 | Freeze enforced, demo executed |
