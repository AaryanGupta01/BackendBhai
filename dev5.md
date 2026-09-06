# Developer 5 — Integration, Architecture & QA

> Project: **Backend DevTools** (Hackathon — DevTools & Infra track)
> Team: 5 developers. You are **Dev 5 (Abhinav)**. The other four devs' files each name you as their escalation point for contract disagreements — this file is where those contracts live and where the whole team's definition of "done" is enforced.
> Read this whole file, and skim the other four (`dev1.md`–`dev4.md`), before the project starts. You are the only person on the team whose job requires seeing across all four other workstreams.

---

## 1. Your mission, in one sentence

You own the **shared contracts** that let the other four devs work independently without blocking each other (contract-first, mock-first, workstream-ownership), you **resolve the architecture decisions that the planning docs left contradictory or unresolved**, you **drive testing and integration** across the three tracks (simulated backend, DevTools server, frontend), and you **own the demo script and readiness checklist** that determines whether the team's work actually lands in front of judges.

## 2. Source documents — you need all five, more thoroughly than anyone else

1. **`05-pre-development-audit.md`** — read this **in full, first**. It is the corrective layer on top of the other four documents, and as the architecture/QA owner, your job is largely to make sure the team builds to *this* document's corrected decisions, not the original (sometimes contradictory or oversold) versions in docs 01–04.
2. **`03-development-backlog.md`** — read in full. You are the one person who needs the whole dependency graph, critical path, phase plan, and emergency cut list in your head, not just your own tasks.
3. **`02-implementation-blueprint.md`** — you need the full picture (architecture, data flow, schema, API, WebSocket, replay, security) well enough to arbitrate disputes between Dev 1/2/3/4 about what a shape "should" be.
4. **`04-ui-ux-implementation-spec.md`** — skim for the same reason: you're not building UI, but you need to recognize when Dev 3's implementation has drifted from spec.
5. **`01-product-research-validation.md`** — read the framing sections (Final Product in One Sentence / 30 Seconds, Top 5 Features, Biggest Risks) — this is what you'll turn into the demo script.

## 3. Working philosophy — this is largely your philosophy to enforce

The team is using **contract-first, mock-first, failure-isolated, workstream-ownership**: everyone builds against agreed shapes and mocks, then integrates through you. Your job has four parts:

1. **Own the contracts** (`packages/shared`) so Dev 1, Dev 2, and Dev 3 are never guessing at each other's data shapes.
2. **Resolve the frozen architecture decisions** below and make sure everyone actually builds to them, not to the original (sometimes contradictory) blueprint text.
3. **Broker the highest-risk integration point** — pairing Dev 1 and Dev 2 on the first real end-to-end trace flow, per the backlog's explicit mitigation for the project's single most critical dependency.
4. **Run QA and own the demo** — testing, the readiness checklist, the freeze timeline, and the emergency cut list, so the team ships something that actually works in the room.

## 4. Scope

### In scope for you
- Shared TypeScript types package (`I-05`)
- Driving/owning the 5 "MUST FIX BEFORE CODING" architecture resolutions (§6 below)
- Unit tests: DevTools server (`P-03`, jointly with Dev 2)
- Integration tests: API (`P-04`, jointly with Dev 2)
- E2E smoke test (`P-05`)
- UI polish pass (`P-06`, jointly with Dev 3)
- Demo script + talking points (`P-07`)
- Frontend static serving verification (`D-13`, jointly with Dev 2 and Dev 3)
- Enforcing the feature freeze / code freeze timeline
- Owning emergency-cut decisions if the team runs behind

### Explicitly NOT yours to build alone
- You don't write Dev 1's OTel instrumentation, Dev 2's APIs, Dev 3's components, or Dev 4's infrastructure — you **specify the contracts** those are built against and **verify** the results meet them. Where a task is listed as "jointly," you are pairing/reviewing, not solo-building.

## 5. Your primary deliverable: `packages/shared` — the contract everyone else builds against

This package must exist (even as a rough draft) **before** Dev 1, Dev 2, and Dev 3 can build against consistent shapes instead of copy-pasted JSON examples from the docs. Ship a first version early, even if incomplete, and iterate — don't hold it until "finished."

```typescript
// packages/shared/src/types.ts

export interface Trace {
  id: string;                 // trace_id from OTel, hex string
  name: string;                // root operation name
  root_service: string;
  start_time: number;          // unix ms
  end_time: number;
  duration_ms: number;
  status: 'ok' | 'error' | 'unset';
  method: string | null;
  path: string | null;
  status_code: number | null;
  request_headers: Record<string, string>;
  request_body: string | null;
  response_headers: Record<string, string>;
  response_body: string | null;
  response_size: number | null;
  services: string[];
  metadata: Record<string, unknown>;
  created_at: string;          // ISO timestamp
}

export interface Span {
  id: string;
  trace_id: string;
  parent_span_id: string | null;
  service_name: string;
  operation_name: string;
  span_type: 'server' | 'client' | 'producer' | 'consumer' | 'internal';
  start_time: number;
  end_time: number;
  duration_ms: number;
  status: 'ok' | 'error' | 'unset';
  status_message: string | null;
  attributes: Record<string, unknown>;
  depth: number;
  order: number;
}

export interface WaterfallSpan extends Span {
  start_offset_ms: number;
  percentage_of_total: number;
}

export interface SpanEvent {
  id: number;
  span_id: string;
  event_name: string;
  timestamp: number;
  attributes: Record<string, unknown>;
}

export interface LogEvent {
  id: number;
  trace_id: string | null;
  service_name: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  attributes: Record<string, unknown>;
  timestamp: number;
}

export interface Service {
  name: string;
  version: string;
  environment: string;
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
  last_seen: string | null;
  first_seen: string;
}

export interface ServiceDependency {
  source_service: string;
  target_service: string;
  dependency_type: 'http' | 'database' | 'cache' | 'external';
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
  protocol: 'http' | 'grpc' | 'sql' | 'redis' | null;
}

export interface ReplaySession {
  id: string;                  // uuid
  original_trace_id: string;
  replay_trace_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  request_snapshot: RequestSnapshot;
  overrides: Record<string, unknown>;
  original_duration_ms: number | null;
  replay_duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RequestSnapshot {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  trace_id: string;
  service: string;
  timestamp: number;
  duration_ms: number;
  status_code: number;
}

// GET /api/v1/requests item shape — MUST match the WebSocket `new_request` payload exactly
export interface RequestSummary {
  trace_id: string;
  method: string;
  path: string;
  status_code: number;
  status: 'ok' | 'error' | 'unset';
  duration_ms: number;
  root_service: string;
  services: string[];
  span_count: number;
  log_count: number;
  error_count: number;
  start_time: number;
  created_at: string;
}

export interface ComparisonResult {
  trace_a: { trace_id: string; total_duration_ms: number; status: string; status_code: number; services: string[] };
  trace_b: { trace_id: string; total_duration_ms: number; status: string; status_code: number; services: string[] };
  duration_diff_ms: number;
  duration_diff_percentage: number;
  status_match: boolean;
  status_code_match: boolean;
  service_diff: { added: string[]; removed: string[]; unchanged: string[] };
  span_diff: {
    total_spans_a: number; total_spans_b: number; matched: number; unmatched_a: number; unmatched_b: number;
    details: Array<{ operation_name: string; service_name: string; duration_a_ms: number; duration_b_ms: number; diff_ms: number; status_a: string; status_b: string; status_match: boolean }>;
  };
  db_query_diff: { queries_a: number; queries_b: number; matched: number; details: unknown[] };
}

export interface TopologyNode {
  id: string; label: string; type: 'service' | 'database' | 'cache' | 'external';
  request_count: number; error_count: number; avg_duration_ms: number;
}
export interface TopologyEdge {
  source: string; target: string; type: 'http' | 'database' | 'cache' | 'external';
  request_count: number; error_count: number; avg_duration_ms: number; protocol: 'http' | 'sql' | 'redis' | null;
}
export interface TopologyResult { nodes: TopologyNode[]; edges: TopologyEdge[]; }

// WebSocket server -> client events
export type WSEvent =
  | { type: 'new_request'; data: RequestSummary }
  | { type: 'trace_update'; data: { trace_id: string; spans: Span[]; logs: LogEvent[] } }
  | { type: 'replay_progress'; data: { replay_id: string; step: string; status: ReplaySession['status'] } }
  | { type: 'replay_complete'; data: { replay_id: string; original_trace_id: string; replay_trace_id: string | null; status: ReplaySession['status']; duration_ms: number } }
  | { type: 'service_update'; data: { service_name: string; request_count: number; error_count: number; avg_duration_ms: number } }
  | { type: 'error'; data: { message: string; code: string } };
```

**Publish this to `packages/shared` day one, even incomplete.** Tell Dev 1, Dev 2, and Dev 3 the moment it's up so they import from it instead of hand-rolling parallel interfaces. When a field needs to change later, change it here first and notify all three — this file existing is precisely what prevents the frontend/backend "shape drift" the audit warns about repeatedly.

## 6. Architecture decisions you must resolve and broadcast — before coding starts

The audit found **five specific contradictions or gaps** between the blueprint and the backlog. Resolving these and telling Dev 1/Dev 2/Dev 4 the final answer is your first real task, before anyone writes service code:

| # | Issue | Resolution to broadcast |
|---|-------|--------------------------|
| 1 | Blueprint originally implied an OTLP **gRPC** receiver inside the DevTools server (complex: protobuf, batching, concurrent writes) | **Use OTLP HTTP.** The Collector exports via its `otlphttp` exporter to a plain HTTP endpoint Dev 2 exposes. Confirm the exact path (e.g. `/v1/traces`, `/v1/logs`) between Dev 1 and Dev 2 and make sure it's the same string on both sides. |
| 2 | Blueprint §15.3 says the Collector runs **embedded** in the DevTools server process; the Docker Compose and backlog (`I-04`) assume a **separate container** | **Separate container.** Simpler, more debuggable, matches what Dev 1 and Dev 4 are actually building. |
| 3 | OTel auto-instrumentation does **not** capture request/response bodies by default, but the schema stores `request_body`/`response_body` | Confirm Dev 1 has built the body-capture middleware (their file, §6.5) and that the custom attribute names it sets (`custom.http.request.body` / `custom.http.response.body`) are exactly what Dev 2's transform step reads. |
| 4 | Raw `console.log` does **not** carry trace context, so logs won't correlate to traces unless every service uses a trace-aware logger | Confirm Dev 1's shared `createLogger` (their file, §6.4) is actually used everywhere — spot-check that no service falls back to bare `console.log`. |
| 5 | WebSocket payloads must match REST response shapes exactly or the frontend breaks on live updates | Confirm Dev 2's `new_request` WS event is byte-for-byte the same shape as one `RequestSummary` from `GET /api/v1/requests` — this is now codified as one type in `packages/shared` (§5 above), so if everyone imports from there, this can't drift. |

There's also a **sixth, docs-inconsistency you should flag** (not in the audit's list, but visible in the source material): the blueprint's example Docker Compose includes a separate `frontend` container on port `4002:80`, while its own simplification notes and Dev 2's `D-13` task both say the DevTools frontend should be served as static files by the DevTools server on a single port (`4001`). **Resolve this as: single-port serving via `D-13`; port `4002` is reserved for Dev 4's separate e-commerce demo frontend instead.** Confirm this reading with Dev 2 and Dev 4.

## 7. The project's single most critical dependency — you broker this personally

Per the backlog, **`D-03` (Dev 2's OTLP receiver)** is the highest-risk item in the entire project: everything downstream depends on it, it's where Dev 1's and Dev 2's work must actually meet, and OTel data completeness (does `db.statement` actually get captured? do Redis spans behave as expected?) is genuinely unknown until tested.

**Your job:** the moment Dev 1's Order Service (`S-04`) is emitting real spans, get Dev 1 and Dev 2 in the same room/call to validate the ingestion pipeline against real traffic together, rather than each guessing at the other's side from documentation. Don't let this slip late in the schedule — it is explicitly called out as the task everything else is downstream of.

## 8. Testing you own or co-own

| Task | Depends on | Complexity | Definition of Done |
|------|-----------|------------|---------------------|
| P-03 | Unit tests: DevTools server (with Dev 2) | D-06, D-10, D-11 | `pnpm --filter devtools-server test` passes; >80% coverage on services |
| P-04 | Integration tests: API (with Dev 2) | D-04, D-05, D-06, D-07 | All endpoints tested against a real DB; pagination, filtering, error responses verified |
| P-05 | E2E smoke test | all tasks | Full script (start stack → place order → see in Request Explorer → view waterfall → replay → compare) completes without errors |

Example unit test shape to build from (CompareService span matching):
```typescript
describe('CompareService', () => {
  it('should match spans by operation name and service', () => {
    const spansA = [{ service_name: 'order-service', operation_name: 'POST /orders', duration_ms: 100, status: 'ok' }];
    const spansB = [{ service_name: 'order-service', operation_name: 'POST /orders', duration_ms: 120, status: 'ok' }];
    const result = service.matchSpans(spansA, spansB);
    expect(result.matched).toBe(1);
    expect(result.details[0].duration_diff_ms).toBe(20);
  });
});
```
Example integration test shape:
```typescript
describe('GET /api/v1/requests', () => {
  it('should return paginated requests', async () => {
    const response = await supertest(app).get('/api/v1/requests?page=1&limit=10').expect(200);
    expect(response.body.requests).toHaveLength(10);
    expect(response.body.pagination.total).toBeGreaterThan(0);
  });
});
```
Example failure-scenario test (verifies Dev 1 + Dev 4's work together):
```typescript
describe('Deliberate Failures', () => {
  it('should capture slow external API calls', async () => {
    const response = await supertest(app).post('/api/orders')
      .send({ userId: 'user-42', items: [{ id: 'item-1', qty: 1 }] }).expect(201);
    await sleep(1000);
    const trace = await supertest(app).get(`/api/v1/traces/${response.body.trace_id}`).expect(200);
    const paymentSpan = trace.body.spans.find((s: any) => s.service_name === 'payment-service');
    expect(paymentSpan.duration_ms).toBeGreaterThan(3000);
  });
});
```

## 9. Feature freeze timeline — you enforce this

| Time before demo | Freeze | Allowed | Not allowed |
|---|---|---|---|
| T-4 hours | Feature freeze | Bug fixes, CSS tweaks, test additions | New endpoints, new components, new features |
| T-2 hours | Code freeze | `git commit --amend` for critical bugs only | Any other code changes |
| T-1 hour | Final | Demo script execution/rehearsal only | Any changes |

You are the one who calls these checkpoints for the team — don't let "just one more feature" slip past T-4h, per the product research's explicit warning that scope creep is the biggest product risk on this project.

## 10. Emergency cut list — your call to make, in this exact order

If the team is behind, cut from the top only as needed (never skip ahead in the list):

| Priority | Feature | Saves | Impact |
|---|---|---|---|
| 1 (cut first) | Request Comparison | 6–8h | Loses "compare" demo; replay still works standalone |
| 2 | Request Replay | 10–12h | Loses "replay" demo; core exploration still works |
| 3 | Service Topology | 5–7h | Loses architecture graph; traces still tell the story |
| 4 | Command Palette | 2–3h | Loses Cmd+K UX; sidebar nav still works |
| 5 | WebSocket live updates | 4–5h | Revert to polling |
| 6 | E-commerce demo frontend | 3–4h | Use curl/Postman for demo traffic instead |
| 7 | External Calls tab | 2–3h | Info still visible in waterfall spans |
| 8 | DB Queries tab | 2–3h | Info still visible in waterfall spans |
| 9 | Seed data script | 2–3h | Generate data manually |
| 10 (cut last) | Failure injection | 2–3h | Demo less dramatic, all requests succeed |

**What must survive even the worst-case cut, non-negotiably:** Docker Compose starts everything → placing an order captures a trace → the trace is visible in Request Explorer → clicking it shows a waterfall with real timing → the Overview tab shows request/response detail. If these five things work, the core thesis ("Chrome DevTools for your backend") is demonstrated even with nothing else built.

## 11. Demo script (`P-07`) — yours to write, ~5 minutes

1. **(10s)** "This is Backend DevTools — Chrome DevTools for your backend." Show the Request Explorer with 50+ seeded requests; point out method badges, status codes, duration, service dots.
2. **(30s)** "Watch a new request come in live." Trigger a request (Dev 4's e-commerce frontend, or curl); show it appear at the top of the list via WebSocket.
3. **(2m)** "Click any request to see its complete execution story." Pick a slow-payment request; walk the Waterfall ("here's exactly where the 5 seconds went — the Mock Payment API"), the Overview tab (full request/response), the Logs tab, the DB Queries tab.
4. **(1m)** "Let's find a failing request." Pick a 503 payment failure; show the red error span and the correlated error log.
5. **(30s)** "Let's search for slow requests." Use the duration filter (>2s) to show how the waterfall immediately reveals the bottleneck.
6. **(30s)** Recap: "One request. One view. One tool."
7. **If Replay/Compare survive the cut list (bonus, +2m):** replay a failing request, show progress, then compare original vs. replay.

**What must never be demonstrated live:** Docker Compose startup, database seeding, or anything that could fail unpredictably — do all of that before the presenter walks up. Have backup screenshots/video ready in case live Docker fails.

**Honesty note for whoever fields judge questions (probably you or Dev 1/2):** per the audit, Replay is "re-send the same HTTP request and show the new trace," not a full reproduction of the original execution — database state, timing, and randomness will differ. If a judge asks "how is this different from Postman?", the honest answer is: "Postman shows you the response; Backend DevTools shows you the *story* — every service, query, and log involved, and lets you compare two executions side by side." Don't oversell replay as deterministic reproduction; it isn't, and the docs are explicit about this.

## 12. Demo readiness checklist — run this yourself before presenting

**Infrastructure:** `docker compose up` starts everything without errors; all health checks pass; Collector receives and forwards traces; both databases have correct schemas; 50+ seed requests loaded.

**Data pipeline:** placing an order generates a full cross-service trace; traces include HTTP + DB + Redis + external spans; parent-child relationships are correct; logs correlate by `trace_id`; sensitive data is redacted.

**DevTools Server:** every endpoint in Dev 2's file returns correct shapes; WebSocket pushes `new_request` in real time; replay/compare/topology work if implemented.

**React UI:** Explorer loads seeded requests; filters work; waterfall timing is correct; every context tab renders; no console errors; no blank screens.

**Demo script:** written, rehearsed at least twice, has a backup plan, has screenshots ready.

**Quality:** no crashes on any interaction; all APIs return valid JSON; waterfall renders for 1–20+ spans; API responses under 200ms, waterfall renders under 1s.

## 13. Contracts — what you produce, what you consume

**You produce:** `packages/shared/src/types.ts` (§5) — this is the artifact that makes every other dev's "contract-first" workflow possible. You also produce the resolved-decisions memo (§6) and the demo script (§11).

**You consume:** working software from all four other devs — your job is to verify it against the contracts and specs you and they agreed to, not to re-derive requirements yourself. If something Dev 1/2/3/4 built doesn't match this file's cross-references to their files, that's the bug to raise, not a reason to quietly patch around it.

## 14. Suggested build order

1. Day 1, hour 1: publish a first draft of `packages/shared` (§5) — even incomplete, so the other three devs aren't hand-rolling types in parallel.
2. Day 1: resolve and broadcast the five (really six) architecture decisions in §6 before Dev 1/Dev 2 write ingestion/instrumentation code.
3. As soon as Dev 1 has a real service emitting traces: broker the Dev 1 ↔ Dev 2 pairing session on the OTLP pipeline (§7).
4. Throughout: keep `packages/shared` in sync as real shapes stabilize; announce every change immediately.
5. Mid-project: start `P-03`/`P-04` alongside Dev 2 as their endpoints stabilize, rather than waiting until everything is "finished."
6. Late-project: `P-05` E2E smoke test, `P-06` UI polish pass (with Dev 3), demo readiness checklist (§12).
7. Final hours: enforce the freeze timeline (§9), make any necessary cuts in the exact order in §10, rehearse the demo script (§11) at least twice.

## 15. Definition of Done for your whole workstream

- [ ] `packages/shared` exists, is imported by all three consuming packages, and has zero shape drift between REST/WebSocket/frontend consumption
- [ ] All five (six) architecture decisions in §6 are resolved and every affected dev has confirmed they're building to the resolved version
- [ ] The Dev 1 ↔ Dev 2 OTLP pipeline has been validated together against real (not just synthetic) traffic
- [ ] Unit + integration + E2E tests pass
- [ ] The demo readiness checklist (§12) is fully green
- [ ] The demo script is written and rehearsed at least twice
- [ ] A backup plan exists if live infrastructure fails during presentation

## 16. Sync points

- **Day 1:** publish `packages/shared` draft; resolve and broadcast §6's decisions to Dev 1, Dev 2, and Dev 4.
- **As soon as real telemetry flows:** broker the Dev 1 ↔ Dev 2 pairing session.
- **Continuously:** be the first call for Dev 1/2/3/4 when their files disagree with each other or with what they're actually building — that's specifically why their files name you as the escalation point.
- **T-4h/T-2h/T-1h:** call the freeze checkpoints for the whole team.
- **If behind schedule at any point:** make the cut-list call per §10 rather than letting each dev individually decide what to drop.
