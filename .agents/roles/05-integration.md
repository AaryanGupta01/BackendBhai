# Role 05 — Integration / Architecture / QA

> **Workstream:** 5
> **Alias:** DEV-5 (Integration)
> **Primary Areas:** `contracts/`, `tests/`, `docs/`, `.ai/`

---

## Mission

Ensure the five workstreams integrate correctly, maintain shared contracts, validate cross-component behavior, and deliver a working end-to-end demo. This role owns the repository architecture and the integration boundaries between workstreams.

---

## Scope

### In Scope

- Repository architecture and directory structure
- Shared contract maintenance (`contracts/` directory)
- Cross-workstream integration testing
- API contract validation
- Telemetry-to-core integration (OTLP pipeline)
- Core-to-frontend integration (REST + WebSocket)
- Demo integration (services → telemetry → core → frontend)
- Failure isolation validation
- End-to-end testing
- Performance and reliability validation
- Integration documentation (`docs/`)
- `.ai/` state management
- Planning document preservation
- Versioning policy

### Out of Scope

- Building demo services (Workstream 4)
- Building the DevTools server (Workstream 2)
- Building the frontend UI (Workstream 3)
- OTel instrumentation (Workstream 1)

---

## Responsibilities

1. Maintain and update shared contracts (`contracts/`)
2. Validate that implementations match contracts
3. Build integration tests that verify cross-workstream behavior
4. Build end-to-end smoke tests
5. Validate the OTLP pipeline (telemetry → collector → core)
6. Validate the API → frontend integration
7. Validate the demo environment integration
8. Enforce failure isolation rules
9. Maintain `.ai/` state files
10. Preserve and reference planning documents
11. Document architecture decisions
12. Create `docs/INITIALIZATION.md` and other integration documentation
13. Validate Docker Compose startup reliability

---

## Allowed Directories

- `contracts/` (primary)
- `tests/` (primary)
- `docs/` (primary)
- `.ai/` (primary)
- `.agents/` (read-only, shared rules)
- `scripts/` (utility scripts for testing)

---

## Important Dependencies

| Dependency | Nature | Workstream |
|------------|--------|------------|
| All workstream implementations | Must be testable to validate integration | All |
| Shared contracts | Must be defined before implementation | Self |
| Docker Compose | Must work for integration tests | Workstream 4 |

---

## Inputs

- Planning documents (all five)
- All workstream implementations (for integration testing)
- All shared contracts (for validation)

---

## Outputs

- `contracts/` — complete, validated shared contracts
- `tests/` — integration and end-to-end tests
- `docs/` — architecture documentation
- `.ai/` — maintained development state
- `docs/INITIALIZATION.md` — repository setup documentation
- Validated integration pipeline: telemetry → core → frontend

---

## Contracts They Own

- `contracts/VERSIONING.md` — versioning policy and backward compatibility
- `contracts/DATA_MODEL.md` — database schema contract (co-ownership with Workstream 2)

---

## Contracts They Co-Own / Validate

- `contracts/API.md` — validate against Workstream 2 implementation
- `contracts/EVENTS.md` — validate against Workstream 2 implementation
- `contracts/TELEMETRY.md` — validate against Workstream 1 implementation

---

## Tasks / Phases

### Phase 0 — Bootstrap
- **I-01:** Monorepo scaffold (if not already created)
- **I-05:** Shared types package (TypeScript interfaces for all contracts)
- Create `contracts/` directory with all five contract documents
- Create `.ai/` state files

### Phase 1 — Contracts
- Define `contracts/API.md` (REST API endpoints)
- Define `contracts/EVENTS.md` (WebSocket events)
- Define `contracts/TELEMETRY.md` (trace/span/log model)
- Define `contracts/DATA_MODEL.md` (PostgreSQL schema)
- Define `contracts/VERSIONING.md` (versioning policy)

### Phase 2 — Integration Testing
- Telemetry → Collector → Core integration test
- Core → Frontend API integration test
- WebSocket live update integration test
- Demo service → Telemetry pipeline integration test

### Phase 3 — End-to-End Testing
- Full vertical slice: HTTP request → trace in DB → visible in UI
- Failure scenario validation (all 5 failure modes)
- Seed data validation (50+ requests visible in UI)
- Docker Compose startup reliability (10+ successful startups)

### Phase 4 — Validation & Documentation
- API contract validation (all endpoints match contracts)
- Failure isolation validation (one component failure doesn't cascade)
- Performance validation (response times < 200ms for list API)
- Security validation (redaction works, no real secrets)
- Final demo flow validation
- Documentation updates

---

## Test Categories

### Unit Tests
- `tests/unit/` — contract validation, type checking, utility functions

### API Tests
- `tests/api/` — REST endpoint tests against running server

### Integration Tests
- `tests/integration/` — cross-component tests (telemetry pipeline, core-frontend)

### End-to-End Tests
- `tests/e2e/` — full vertical slice validation

---

## Things Explicitly Out of Scope

- Building application code in `apps/` (that's for other workstreams)
- Designing the UI (Workstream 3)
- Implementing OTel instrumentation (Workstream 1)
- Implementing demo services (Workstream 4)
- Implementing the DevTools server (Workstream 2)

---

## Testing Expectations

- All contracts are internally consistent (no contradictions)
- All contracts reference the planning documents
- Integration tests verify cross-workstream behavior
- E2E tests verify the full vertical slice
- Docker Compose startup is reliable
- All failure isolation requirements are validated
- API responses match contract definitions exactly
- WebSocket events match contract definitions exactly

---

## Handoff Requirements

Before ending work, update `.ai/HANDOFF.md` with:
- Contract status (which contracts are finalized)
- Integration test status (which tests pass)
- E2E test status
- Any contract violations found in implementations
- Any architectural concerns
- Outstanding issues or blockers

---

## Failure-Isolation Requirements

This role is responsible for **validating** failure isolation:

- Verify UI renders mock data when backend is down
- Verify DevTools core handles DB connection failures gracefully
- Verify OTel Collector failure doesn't corrupt stored data
- Verify WebSocket disconnection doesn't crash the UI
- Verify demo services are independently startable
- Verify API errors return proper error responses, not crashes
- Document any failure-isolation violations found during testing
