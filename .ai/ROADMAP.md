# Roadmap

> **Developer:** Integration Engineer (Workstream 5)
> **Project:** Backend DevTools

---

## Hackathon Timeline

### Phase 0 — Bootstrap (Current)
- Repository structure and contracts
- Development coordination system
- Documentation

### Phase 1 — First Vertical Slice
- **Goal:** HTTP request → trace in DB → visible in UI
- **Integration work:**
  - Validate OTLP pipeline (Telemetry → Collector → Core)
  - Validate API → Frontend data flow
  - First end-to-end test

### Phase 2 — Core Features
- **Goal:** Request Explorer, Waterfall, Context Panel all working
- **Integration work:**
  - Validate all REST API contracts
  - Validate WebSocket events
  - Integration test suite

### Phase 3 — Polish & Demo
- **Goal:** Demo-ready application
- **Integration work:**
  - End-to-end smoke test
  - Failure scenario validation
  - Docker Compose reliability
  - Performance validation
  - Security validation

---

## Key Milestones

| Milestone | Target | What's Working |
|-----------|--------|----------------|
| M1: Contracts Defined | Now | All five contracts in `contracts/` |
| M2: First Trace | Phase 1 | HTTP request → trace in DB → visible via API |
| M3: Request Explorer | Phase 1 | Click through requests in UI, live updates |
| M4: Execution Story | Phase 2 | Waterfall with timing, logs, DB queries |
| M5: Full Context | Phase 2 | All context tabs working |
| M6: Demo Ready | Phase 3 | Polished, tested, demo script complete |
