# BackendBhai — Development Workflow

> **Last Updated:** September 6, 2026
> **Applies to:** All five workstreams

---

## Workflow Lifecycle

Every developer follows this lifecycle for each task:

```
READ
  ↓
UNDERSTAND
  ↓
PLAN
  ↓
DEFINE / VERIFY CONTRACT
  ↓
IMPLEMENT
  ↓
TEST
  ↓
VALIDATE
  ↓
DOCUMENT
  ↓
HANDOFF
```

---

## Step-by-Step Process

### 1. READ

Read the five planning documents in order:
1. `planning/05-pre-development-audit.md` (highest authority)
2. `planning/02-implementation-blueprint.md`
3. `planning/03-development-backlog.md`
4. `planning/04-ui-ux-implementation-spec.md`
5. `planning/01-product-research-validation.md`

Read the relevant contracts in `contracts/`.

### 2. UNDERSTAND

- Read your role file in `.agents/roles/`
- Understand your scope, dependencies, and interfaces
- Identify what other workstreams you depend on
- Identify what other workstreams depend on you

### 3. PLAN

- Break down the task into concrete implementation steps
- Identify risks and unknowns
- Estimate effort
- Update `.ai/ACTIVE_TASK.md` with your current task
- Update `.ai/PHASE_PLAN.md` with your implementation plan

### 4. DEFINE / VERIFY CONTRACT

- If your task involves a new API, event, or data structure, **define or verify the contract first**
- Check `contracts/API.md`, `contracts/EVENTS.md`, `contracts/TELEMETRY.md`, `contracts/DATA_MODEL.md`
- If the contract doesn't exist, **create it before implementing**
- If the contract exists, **verify your implementation matches it**
- Document any contract changes in `.ai/DECISIONS.md`

### 5. IMPLEMENT

- Write the code
- Follow the standards in `.agents/STANDARDS.md`
- Use mocks for dependencies that aren't implemented yet
- Implement failure isolation (don't let your errors crash other components)

### 6. TEST

- Write unit tests for business logic
- Test your API endpoints
- Test edge cases (empty data, network errors, malformed input)
- Verify your component works with mock data
- Verify your component works with real data (when available)

### 7. VALIDATE

- Run type checking (`tsc --noEmit` or equivalent)
- Run your test suite
- Verify no regressions in existing functionality
- Test integration points with other workstreams (using mocks if needed)

### 8. DOCUMENT

- Update `.ai/SESSION.md` with what you accomplished
- Update `.ai/PROJECT_STATE.json` with current status
- Update `.ai/TASKS.md` with task completion status
- Document important decisions in `.ai/DECISIONS.md`
- If you made architecture decisions, explain rationale

### 9. HANDOFF

- Update `.ai/HANDOFF.md` with:
  - What was completed
  - What is in progress
  - What is blocked
  - What the next developer should do
  - Any gotchas or important context

---

## Persistent Working Memory

The `.ai/` files are **persistent working memory** for each developer.

A developer must be able to **close their coding agent and resume work later** by reading `.ai/ACTIVE_TASK.md`, `.ai/CONTEXT.md`, and `.ai/SESSION.md`.

This means:
- Always update `.ai/` files before ending a work session
- Be specific about where you left off
- Note any decisions that were made but not yet documented
- Note any tests that are pending

---

## Daily Sync Points

| Time | Activity | Who |
|------|----------|-----|
| Start of day | Unblock check: what's blocked, what's ready | All |
| Mid-day | Vertical slice smoke test | Telemetry + Core + Frontend |
| End of day | Demo run-through + next-day plan | All |

---

## Integration Points

Integration between workstreams happens at defined boundaries:

| Integration Point | Producer | Consumer | Contract |
|-------------------|----------|----------|----------|
| OTLP traces | Telemetry | Core | `contracts/TELEMETRY.md` |
| REST APIs | Core | Frontend | `contracts/API.md` |
| WebSocket events | Core | Frontend | `contracts/EVENTS.md` |
| Data model | Core | All | `contracts/DATA_MODEL.md` |
| Demo services | Demo | Telemetry | Docker network + OTLP |
| Seed data | Demo | Core + Frontend | Database schema |

---

## Conflict Resolution

If two developers need to change the same file:

1. Check if the change is actually necessary
2. Communicate via `.ai/HANDOFF.md` or `.ai/DECISIONS.md`
3. If the change is to a contract, both developers must agree
4. If the change is to shared infrastructure, coordinate timing
5. If there's a disagreement, escalate to the integration developer (Workstream 5)

---

## Emergency Procedures

If something is broken:

1. Check `.ai/DECISIONS.md` for recent changes
2. Check git log for recent commits
3. Try to identify which workstream introduced the break
4. If it's your workstream, fix it immediately
5. If it's another workstream, communicate and coordinate
6. Document the fix in `.ai/DECISIONS.md`
