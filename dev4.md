# Developer 4 — Demo Environment & Failure Simulation

> Project: **Backend DevTools** (Hackathon — DevTools & Infra track)
> Team: 5 developers. You are **Dev 4**. Dev 5 (Abhinav) owns integration/architecture/QA and is your escalation point for any contract disagreement.
> Read this whole file before writing code. It is built entirely from the team's 5 planning docs — nothing here is invented scope.

---

## 1. Your mission, in one sentence

You build the **environment everyone else runs in** (monorepo scaffold, Docker Compose, database init/seed, Makefile) and the **realistic chaos that makes the demo compelling** (deliberate slow/failing requests, the mocked payment API, and the tiny e-commerce UI that generates demo traffic). Two of your tasks — `I-01` monorepo scaffold and `I-02` Docker Compose — block everyone else on the team, so they come first, today, before anything else.

## 2. Source documents (read in this order)

1. **`03-development-backlog.md`** — your task list: **Epic E9 — Infrastructure** (`I-01`, `I-02`, `I-03`, `I-06`, `I-07`) and most of **Epic E1 — Simulated Backend** (`S-06`, `S-07`, `S-08`, `S-09`). Definition-of-done criteria below are copied directly from here.
2. **`02-implementation-blueprint.md`** — read **§15 Hackathon Architecture** (the Docker Compose file is your starting point) and **§17 Repository Structure** in full.
3. **`05-pre-development-audit.md`** — read **§8 Demo Audit** and **"MUST FIX BEFORE DEMO"** in full. This section is largely about you: seeding, deterministic mocks, Docker reliability, and the backup plan.
4. **`01-product-research-validation.md`** — read the **"Deliberate Failures"** and **"Simulated Backend Services"** tables; they define exactly which failures to build and why.
5. **`04-ui-ux-implementation-spec.md`** — you don't need this for your own UI (the demo e-commerce frontend is intentionally minimal), but skim it so you understand what Dev 3's tool will show when your failures fire.

## 3. Working philosophy — read this before you start

The team's approach is **contract-first, mock-first, failure-isolated, workstream-ownership**. Concretely for you:
- **You are the critical-path starter.** `I-01` (monorepo scaffold) blocks literally every other developer. Do it first, announce the moment it's pushed, and don't add scope to it — an empty workspace that builds cleanly is the entire deliverable.
- **"Failure-isolated" is specifically about your work.** Every deliberate failure you build (slow queries, 503s, timeouts) must be toggleable/contained in its own module so it never contaminates Dev 1's "happy path" service code or blocks other devs from testing normal behavior. See §6.4 for the exact seam.
- You don't need Dev 1's real service handlers finished to start `I-01`–`I-03`, `I-06` — those are pure infrastructure. You do need to coordinate the *interface* of your failure modules with Dev 1 before either of you writes the integration code.

## 4. Scope

### In scope for you
- Monorepo scaffold (`I-01`)
- Docker Compose base + full orchestration (`I-02`)
- PostgreSQL init scripts for **both** databases (`I-03`)
- Dev server scripts / Makefile (`I-06`)
- Seed data script (`I-07`)
- Mock Payment API / WireMock stubs (`S-06`)
- Failure injection modules for Order Service and Auth Service (`S-07`, `S-08`)
- Simulated e-commerce frontend for generating demo traffic (`S-09`)
- Pre-demo reliability work: repeated Docker Compose testing, `make demo` script, backup plan

### Explicitly NOT yours
- The actual API Gateway/Auth/Order/Payment service handlers and OTel instrumentation → **Dev 1** (you write the failure *modules*; they call into them from their handlers)
- Anything inside `packages/devtools-server` → **Dev 2**
- Anything inside `packages/frontend` (the real DevTools UI) → **Dev 3**. Your e-commerce frontend (`S-09`) is a completely separate, much simpler app.
- `packages/shared` type authorship → **Dev 5**

## 5. Your task list (with Definition of Done, from the backlog)

| ID | Task | Depends on | Complexity | Definition of Done |
|----|------|-----------|------------|---------------------|
| I-01 | Monorepo scaffold | none | S | `pnpm install` succeeds; `pnpm -r build` succeeds; all package dirs exist |
| I-02 | Docker Compose base | I-01 | M | `docker compose up postgres redis otel-collector` starts all three, health checks pass |
| I-03 | PostgreSQL init scripts (both DBs) | I-02 | M | Both SQL files execute without errors; `devtools` and `ecommerce` DBs have all tables; seed data queryable |
| I-06 | Dev server scripts (Makefile) | I-02 | S | `make up` starts full stack; `make seed` populates demo data; `make reset-db` drops/recreates DBs |
| I-07 | Seed data script | S-07, S-08 (yours), D-03 (Dev 2) | M | `make seed` produces 50+ requests with varied characteristics, visible in the UI |
| S-06 | Mock Payment API (WireMock) | I-02 | S | `POST localhost:4000/charges` returns success normally; ~30% have a 5s delay; ~5% return 503 |
| S-07 | Failure injection: Order Service | S-04 (Dev 1) | S | Order with >10 items shows a 3s DB span; every 30th request shows a Redis error span |
| S-08 | Failure injection: Auth Service | S-03 (Dev 1) | XS | Request with `Authorization: Bearer invalid` shows a 5s auth span with a timeout error |
| S-09 | Simulated e-commerce frontend | S-02 (Dev 1) | M | Opening `localhost:4002` and clicking "Place Order" triggers the full request flow |

## 6. Exact technical specification

### 6.1 Monorepo scaffold (`I-01`) — do this first, today

Create a pnpm workspace:
```
backend-devtools/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .gitignore
├── packages/
│   ├── frontend/         (Dev 3 will fill this in)
│   ├── devtools-server/  (Dev 2 will fill this in)
│   └── shared/           (Dev 5 will fill this in)
├── services/
│   ├── shared/           (Dev 1 will fill this in)
│   ├── api-gateway/
│   ├── auth-service/
│   ├── order-service/
│   ├── payment-service/
│   └── frontend/         (this is YOUR e-commerce demo app, S-09)
├── mocks/
│   └── payment-api/      (yours, S-06)
└── db/
    ├── devtools/         (Dev 2 authors the SQL, you wire it in)
    └── ecommerce/        (yours)
```
`pnpm install` must succeed and `pnpm -r build` must succeed with **empty placeholder packages** — don't wait for real content in each folder, just valid `package.json`/`tsconfig.json` stubs so the workspace is buildable from hour one. Push this and tell the team immediately; everyone else is blocked until this exists.

### 6.2 Docker Compose (`I-02`, then extended throughout the project)

Start with just the shared infrastructure, then add each service block as its owner (you, for demo services; Dev 1, for the simulated backend services; Dev 2, for devtools-server) hands it to you:

```yaml
# docker-compose.yml (or docker-compose.hackathon.yml)
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: ecommerce
    volumes:
      - ./db/seed.sql:/docker-entrypoint-initdb.d/seed.sql

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports: ["4317:4317"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
```
This first pass must pass health checks for all three before you move on. **Add Dev 1's four service blocks and Dev 2's `devtools-server` block once they hand them to you** (their files contain the exact env vars/ports — Dev 1's file has the four simulated-backend blocks in its §6.8, Dev 2's has the devtools-server block referencing `SIMULATED_BACKEND_URL: http://api-gateway:3000`).

**Important — resolve this before you finalize the compose file:** the blueprint's example Docker Compose (§15.4) includes a separate `frontend` container on port `4002:80` serving Dev 3's built React app via nginx. But the same document's own "Simplifications" section (§15.3) and Dev 2's task `D-13` both say the opposite: **the DevTools React frontend is served as static files by the DevTools server itself on port 4001, single port, no CORS.** This is a real inconsistency in the source docs. **Follow the single-port approach (D-13)** — do not stand up a separate container for Dev 3's frontend. Reserve port `4002` instead for **your own** e-commerce demo frontend (`S-09`), which is a genuinely separate, much simpler app and needs its own port anyway. Confirm this reading with Dev 2 and Dev 5 before finalizing.

### 6.3 PostgreSQL init scripts (`I-03`)

Two databases on the same Postgres instance:
- **`devtools`** — schema authored by Dev 2 (traces, spans, span_events, log_events, services, service_dependencies, replay_sessions — see Dev 2's file for the full SQL). Your job is to wire their SQL file into `db/devtools/001_initial.sql` and make sure it runs on container init.
- **`ecommerce`** — this one is yours to design: `users`, `products`, `orders` tables (and whatever Order Service, per Dev 1, needs — check their exact `INSERT INTO orders (user_id, items, status) VALUES (...)` shape and match your schema to it). Put seed rows here too (a handful of demo users/products) as the baseline the seed script (`I-07`) builds on top of.

Wire both into `docker-entrypoint-initdb.d/` (or an init shell script `db/init.sh`) so `docker compose up postgres` creates both databases and all tables automatically, with no manual step.

### 6.4 Failure injection — the exact seam with Dev 1 (`S-07`, `S-08`)

**Design principle: your chaos code never lives inside Dev 1's happy-path handlers.** You own a `failures.ts` module per service; Dev 1's handler imports and calls into it at an agreed point. Agree these signatures with Dev 1 before either of you builds:

```typescript
// services/order-service/src/failures.ts — YOURS
export async function maybeInjectOrderDelay(items: OrderItem[]): Promise<void> {
  if (items.length > 10) {
    await db.query('SELECT pg_sleep(3)'); // 3s delay, visible as a slow DB span
  }
}

export async function maybeInjectCacheMiss<T>(
  sessionId: string,
  fetchFromCache: () => Promise<T | null>
): Promise<T | null> {
  requestCounter++;
  if (requestCounter % 30 === 0) {
    return null; // forces fallback to DB, visible as a Redis error/miss span
  }
  return fetchFromCache();
}
```
```typescript
// services/auth-service/src/failures.ts — YOURS
export async function maybeInjectAuthTimeout(token: string): Promise<void> {
  if (token === 'invalid' || !isWellFormed(token)) {
    await sleep(5000); // 5s timeout before rejection
    throw new Error('Auth service timeout');
  }
}
```
Dev 1 calls these from inside their handlers at the right point (e.g., right after validating item count, right after extracting the token). **You should not need to touch `server.ts`/`handlers.ts` in Dev 1's services at all** — only your own `failures.ts` files. If the call sites don't exist yet when you're ready to build, coordinate directly with Dev 1 rather than guessing where they'll go.

### 6.5 Mock Payment API / WireMock (`S-06`)

```
mocks/payment-api/
├── __files/
│   ├── charge-success.json
│   ├── charge-declined.json
│   └── charge-timeout.json
└── mappings/
    ├── charge-success.json    # POST /charges → 200, majority of requests
    ├── charge-slow.json       # POST /charges → 200, 5s fixedDelay, ~30% of requests
    └── charge-failure.json    # POST /charges → 503, ~5% of requests (backlog says "every 20th")
```
Use WireMock's weighted/priority stub matching (or its scenario/fault-injection features) to get roughly a 30% slow rate and a 5% (every-20th) failure rate, matching both the product research's "Deliberate Failures" table and the backlog's `S-06` DoD exactly. Mount this directory into the `mock-payment-api` container via the volume shown in §6.2's parent compose file (`./mocks/payment-api:/home/wiremock`).

**Audit-flagged risk you should address if time allows:** because this behavior is probabilistic, a **replayed** request (Dev 2's Replay feature) can legitimately land on a different outcome than the original request. The audit recommends adding a **deterministic "replay mode" flag** to your WireMock stubs (e.g., a header the DevTools server can set on replay requests that forces the `charge-success` stub every time) so replay comparisons look sensible in the demo rather than randomly diffing. This is optional/time-permitting, but flag it to Dev 5 either way so the demo script can account for whichever choice is made.

### 6.6 Simulated e-commerce frontend (`S-09`)

A minimal Next.js or plain HTML/JS page at `localhost:4002` that calls the API Gateway (`localhost:3000`) to place orders and view them. This exists purely to generate realistic demo traffic — it is **not** the DevTools product itself and needs none of Dev 3's design system. Keep it simple: a product list, an "Add to cart"/"Place Order" button, and an order confirmation. This is what a presenter clicks during the live demo to show a request being captured in real time.

### 6.7 Seed data script (`I-07`)

Generate 50+ diverse requests covering every scenario the demo script needs: successful orders (varying item counts), slow payments (hits your 30% WireMock delay), failed payments (hits your 503 stub), auth timeouts (invalid token), cache misses (every-30th), and multi-item orders (>10 items, triggers the 3s DB delay). This can be a script that fires real HTTP requests at the running stack (simplest — reuses the real pipeline end-to-end) or a script that inserts synthetic rows directly into the `devtools` database (faster, but risks drifting from the real schema — prefer the real-HTTP-requests approach for authenticity, and confirm with Dev 2 the ingestion pipeline is fast enough to keep up before committing to it).

### 6.8 Makefile (`I-06`)

```makefile
up:          ## Start the full stack
	docker compose up --build

down:        ## Stop everything
	docker compose down

seed:        ## Populate demo data
	node scripts/seed.js

reset-db:    ## Drop and recreate both databases
	docker compose down -v && docker compose up -d postgres && sleep 3 && node scripts/init-db.js

logs:        ## Tail all service logs
	docker compose logs -f

demo:        ## One command: fresh stack + seeded data, ready to present
	docker compose up -d --build && sleep 5 && make seed
```
The `demo` target is explicitly called for by the audit's "MUST FIX BEFORE DEMO" list — **one command to start everything, seed data, and be ready to present.**

## 7. Contracts — what you produce, what you consume

**You produce:**
- The buildable monorepo skeleton (everyone's day-1 dependency).
- `docker-compose.yml` with health-checked `postgres`, `redis`, `otel-collector`, plus slots ready for the other four devs' service blocks.
- Both database schemas wired into init scripts.
- `failures.ts` modules with the function signatures in §6.4 — **agree these with Dev 1 before building**.
- The Mock Payment API's exact behavior contract (success/slow/fail rates) — tell Dev 5 so the demo script can be written around real, known behavior.
- `Makefile` targets `up`, `down`, `seed`, `reset-db`, `logs`, `demo`.

**You consume:**
- Dev 1's simulated-backend Docker Compose service blocks (ports, env vars) — drop them into your compose file as-is.
- Dev 2's `devtools-server` Docker Compose block.
- Dev 2's `devtools` DB schema SQL (you wire it in; you don't author it).
- Dev 1's Order/Auth service handler call sites for your failure modules (§6.4) — coordinate signatures before building.

## 8. Suggested build order

1. `I-01` monorepo scaffold — **today, first thing.** Announce the moment it's pushed.
2. `I-02` Docker Compose base (postgres, redis, otel-collector only) — needed by everyone within hours of `I-01`.
3. `I-03` DB init scripts — start with your own `ecommerce` schema; merge in Dev 2's `devtools` schema as soon as they hand it over.
4. `I-06` Makefile — quick, unblocks daily workflow for the whole team.
5. `S-06` Mock Payment API stubs — Dev 1's Payment Service needs this to test against.
6. `S-07`/`S-08` failure modules — as soon as you've agreed signatures with Dev 1, and as soon as their base handlers exist to call into them.
7. `S-09` e-commerce demo frontend — needs Dev 1's API Gateway running.
8. `I-07` seed data — do this **after** `S-07`/`S-08` and after Dev 2's ingestion pipeline (`D-03`) is confirmed working; seeding is explicitly listed as depending on both.
9. Ongoing from here to the deadline: repeatedly test `docker compose up` (the audit says **10+ times** before presenting), tighten `make demo`, and prepare backup screenshots/video in case Docker fails live.

## 9. Known pitfalls specific to you (from the audit)

- **The OTel Collector is called out as "the single most dangerous dependency" in the whole demo** — if it fails, no data flows and the entire demo is dead, regardless of how good everyone else's work is. Mitigate by pre-seeding the database (`I-07`) so the UI has something to show even if live capture briefly hiccups during the presentation.
- 8+ processes have to come up cleanly for a demo to work (4 simulated services, Postgres, Redis, WireMock, OTel Collector, DevTools server, frontend). Any single failure breaks the demo — this is why repeated `docker compose up` testing matters more than almost anything else you do.
- Don't rely on generating traffic manually during the presentation — pre-seed everything.
- The demo must be resettable in ~10 seconds (`make reset-db && make seed`) so it can be rehearsed repeatedly without accumulating stale/confusing state.
- WireMock's probabilistic behavior means replay/comparison results are non-deterministic by default — decide with Dev 2/Dev 5 whether that's acceptable or whether you add the deterministic replay-mode flag (§6.5).

## 10. Definition of Done for your whole workstream

- [ ] `pnpm install && pnpm -r build` succeeds from a clean clone
- [ ] `docker compose up --build` starts all services healthy, repeatedly (tested 10+ times)
- [ ] Both databases exist with correct schemas and are queryable immediately after startup
- [ ] `make seed` produces 50+ requests covering every failure scenario in the product research's "Deliberate Failures" table
- [ ] Mock Payment API produces the correct success/slow/failure distribution
- [ ] Failure injection modules are fully isolated from Dev 1's happy-path code (no chaos logic inside their handler files)
- [ ] The e-commerce demo frontend can place an order end-to-end and that order is visible in the DevTools UI within seconds
- [ ] `make demo` reliably brings up a fully seeded, presentable stack in one command
- [ ] A backup plan (screenshots or recorded video) exists in case live Docker fails during the actual presentation

## 11. Sync points

- **Immediately after `I-01`:** notify the whole team — everyone else is blocked until this exists.
- **Before writing `failures.ts`:** agree exact function signatures and call sites with Dev 1.
- **Before finalizing the Docker Compose port layout:** confirm the single-port frontend-serving decision (§6.2) with Dev 2 and Dev 5.
- **Before `I-07` seeding:** confirm with Dev 2 that the ingestion pipeline (`D-03`) is stable enough to seed through real HTTP traffic rather than direct DB inserts.
- **In the final hours:** work directly with Dev 5 on the demo script and readiness checklist — your infrastructure reliability is the single biggest risk to the live demo succeeding.
