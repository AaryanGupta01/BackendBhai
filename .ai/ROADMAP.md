# Roadmap — Dev 5 (Abhinav)

> **Project:** BackendBhai

---

## Milestones

| Milestone | Target | What's Working | My Verification |
|-----------|--------|----------------|-----------------|
| **M0: Unblock** | Day 1, Hour 3 | `packages/shared` exists; all devs can import types | Verify build succeeds |
| **M1: First Trace** | Day 2-3 | HTTP request → trace in PostgreSQL → visible via API | Broker the pairing session personally |
| **M2: Request Explorer** | Day 3 | Click through requests in UI, live updates via WebSocket | Validate API shapes + WS payload |
| **M3: Execution Story** | Day 4 | Waterfall with timing + Logs + DB Queries tabs | Run integration tests |
| **M4: Full Context** | Day 4 | All context tabs working, all failure scenarios visible | Run failure scenario tests |
| **M5: E2E Working** | Day 5 | Full vertical slice: start → order → Explorer → Waterfall → Logs | E2E smoke test passes |
| **M6: Demo Ready** | Day 5 | Polished UI, demo script, seed data, rehearsed 2x | Demo readiness checklist green |

---

## Daily Sync Points

| Day | Morning Check | Midday | Evening |
|-----|---------------|--------|---------|
| **Day 1** | Publish `packages/shared`. Resolve §6 decisions. | Verify monorepo + Docker Compose. Confirm OTLP path. | Collect Dev 1's db.statement findings. |
| **Day 2** | Verify Dev 1's services + Dev 2's receiver exist. | **Broker Dev 1 ↔ Dev 2 pairing.** | Validate first real trace end-to-end. |
| **Day 3** | Validate all REST API shapes. Confirm WS payload. | Start unit + integration tests. | File contract violations. |
| **Day 4** | Continue tests. Start E2E script. | Verify failure scenarios. | UI polish pass with Dev 3. |
| **Day 5** | Run E2E. Seed database. | Write demo script. Rehearse 1st time. | Rehearse 2nd time. Prepare backup. |
| **Final** | Feature freeze (T-4h). | Code freeze (T-2h). | Demo (T-0). |

---

## Key Sync Points with Other Devs

| When | With Whom | Topic |
|------|-----------|-------|
| Day 1, Hour 1 | Dev 2 | Confirm OTLP endpoint path |
| Day 1, Hour 2 | Dev 1 + Dev 2 | Confirm body-capture attribute names |
| Day 1 | Dev 4 | Verify monorepo + Docker Compose |
| Day 2 | Dev 1 + Dev 2 | **OTLP pipeline pairing session** |
| Day 3 | Dev 3 | Confirm build output directory |
| Day 3 | Dev 2 | Validate all API shapes |
| Day 4 | Dev 3 | UI polish pass |
| Day 5 | Dev 4 | Demo readiness, seed data, Docker reliability |
| Final | All | Freeze checkpoints |
