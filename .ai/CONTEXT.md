# Developer Context — Dev 5 (Abhinav)

> **Role:** Integration / Architecture / QA
> **Escalation Point:** I am the escalation point for ALL four other devs on contract disagreements.

---

## What Every Dev Depends On Me For

| Dev | What They Need From Me | When |
|-----|----------------------|------|
| Dev 1 (Telemetry) | `packages/shared` types to import | Day 1, Hour 1 |
| Dev 2 (Core) | `packages/shared` types to import | Day 1, Hour 1 |
| Dev 3 (Frontend) | `packages/shared` types to import | Day 1, Hour 1 |
| Dev 4 (Demo) | Architecture decisions resolved | Day 1, Hour 1-3 |
| Dev 1 + Dev 2 | OTLP pipeline pairing brokered | Day 2-3 |
| Dev 3 | API contract validation before UI build | Day 3-4 |
| Everyone | Feature freeze / code freeze enforcement | Final hours |
| Everyone | Demo script and readiness checklist | Day 5 |

## What I Need From Each Dev

| Dev | What I Need | When |
|-----|-------------|------|
| Dev 1 | Report db.statement / Redis attribute findings | Day 1 |
| Dev 1 | Real Order Service emitting spans | Day 2 |
| Dev 1 | Failure hook call sites ready | Day 2 |
| Dev 2 | OTLP endpoint path confirmed | Day 1 |
| Dev 2 | All REST endpoints built and tested | Day 3 |
| Dev 2 | WebSocket handler working | Day 3 |
| Dev 2 | Build output directory for static serving | Day 3 |
| Dev 3 | Build output directory communicated to Dev 2 | Day 3 |
| Dev 3 | UI components built against `packages/shared` types | Day 4 |
| Dev 4 | Monorepo scaffold (`pnpm install` works) | Day 1 |
| Dev 4 | Docker Compose with infra services | Day 1 |
| Dev 4 | Both DB schemas in init scripts | Day 2 |
| Dev 4 | Mock Payment API running | Day 2 |
| Dev 4 | Failure modules with agreed signatures | Day 2 |
| Dev 4 | Seed data script | Day 4 |
| Dev 4 | Docker Compose tested 10+ times | Day 5 |

## Key Risks I'm Watching

1. **OTLP pipeline (highest risk):** Dev 1 ↔ Dev 2 integration point. If this fails, everything downstream is empty. I broker this pairing personally.
2. **db.statement capture:** Genuinely unknown until tested. If pg instrumentation doesn't capture SQL, DB Queries tab is empty.
3. **Redis span shape:** May differ from Postgres spans. Could break DB Queries tab categorization.
4. **WebSocket payload drift:** If Dev 2's `new_request` event differs from REST shape, Dev 3's UI breaks.
5. **Scope creep:** The project's biggest product risk. I enforce the emergency cut list.
6. **Docker Compose reliability:** 8+ processes must start clean. Tested 10+ times before demo.

## Key Files to Reference

| File | Purpose |
|------|---------|
| `dev5-abhinav.md` | My complete role definition (source of truth for my work) |
| `dev1.md` | Dev 1's tasks, specs, contracts — I need to know their work to validate it |
| `dev2.md` | Dev 2's tasks, specs, API shapes — I validate against these |
| `dev3.md` | Dev 3's tasks, UI specs — I verify UI matches spec |
| `dev4.md` | Dev 4's tasks, infra specs — I verify infrastructure works |
| `planning/05-pre-development-audit.md` | Highest-authority planning doc — overrides everything |
| `planning/03-development-backlog.md` | Full task list, dependency graph, critical path |
| `planning/02-implementation-blueprint.md` | Architecture, API spec, schema |
