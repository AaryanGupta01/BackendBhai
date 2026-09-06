# BackendBhai

> **Chrome DevTools for backend systems.**

BackendBhai is a browser-based developer tool that captures every backend request and presents it as a complete interactive execution story — every service hop, database query, external API call, and log entry for a single request, all in one view.

---

## What Problem Does This Solve?

When a backend bug happens, developers currently switch between **6+ disconnected tools** — logs, database consoles, API clients, tracing UIs — to understand what one request did. BackendBhai puts all of that in **one browser tab**.

**The analogy:** Chrome DevTools is to browser development as BackendBhai is to backend development.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (localhost:4001)                      │
│                    BackendBhai DevTools UI (React)                   │
│         Request Explorer · Waterfall · Logs · DB Queries · Topology  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼──────────────────────────────────────┐
│                   DevTools Core Server (Fastify)                     │
│              OTLP Receiver · Trace Storage · API Layer               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                       PostgreSQL (port 5432)                         │
│                 traces · spans · logs · services                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    OTel Collector (Docker container)                 │
│                 Receives telemetry via OTLP HTTP                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ OTLP HTTP
┌──────────────────────────────▼──────────────────────────────────────┐
│              Simulated E-Commerce Backend (Microservices)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   API    │→ │   Auth   │→ │  Order   │→ │ Payment  │           │
│  │ Gateway  │  │ Service  │  │ Service  │  │ Service  │           │
│  │ :3000    │  │ :3001    │  │ :3002    │  │ :3003    │           │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘           │
│                                                  │                  │
│                                           ┌──────▼──────┐          │
│                                           │ Mock Payment │          │
│                                           │    :4000     │          │
│                                           └─────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Demo Walkthrough (For Panel Presentation)

### Step 1: Start Everything

```bash
docker compose up -d --build
```

Wait ~30 seconds for all containers to start. Verify with:

```bash
docker compose ps
```

You should see all 10 containers running (postgres, redis, otel-collector, api-gateway, auth-service, order-service, payment-service, mock-payment-api, demo-frontend, amazon-store).

### Step 2: Show the "Product" — Amazon-Inspired Storefront

**Open:** `http://localhost:4003`

This is the **simulated e-commerce website** that users interact with. It looks like a real online store with products, a shopping cart, and a checkout flow.

**What to say:** *"This is a simulated e-commerce backend — the kind of application our tool is designed to monitor. It has multiple microservices: API gateway, authentication, order processing, and payment."*

Place an order by clicking through the checkout flow. This generates real telemetry data that flows through the entire pipeline.

### Step 3: Show the Error Injector Dashboard

**Open:** `http://localhost:4002`

This is the **failure simulation control panel**. It lets you toggle between different failure modes in real-time:

| Mode | What Happens | What You'll See in BackendBhai |
|------|-------------|-------------------------------|
| **Normal** | Happy path, ~200ms checkout | Green waterfall, fast spans |
| **Heavy Order** | >10 items → 3s DB delay | Long yellow DB span in waterfall |
| **Auth Timeout** | Invalid token → 5s timeout | Red error span on auth-service |
| **Slow Payment** | 5s external gateway delay | Long orange external API span |
| **Payment 503** | Gateway temporarily unavailable | Red error span on payment-service |
| **Random** | Mix of all above | Real-world chaos |

**What to say:** *"We can inject real failures into the system to show how BackendBhai catches debugging scenarios."*

### Step 4: Open BackendBhai — The Main Product

**Open:** `http://localhost:4001`

This is **BackendBhai** — the Chrome DevTools for backend systems. You'll see:

1. **Request Explorer** (left sidebar) — a filterable list of every captured request, like Chrome DevTools Network Tab
2. **Waterfall** (main panel) — a visual timeline showing every service, DB query, and external API call for the selected request, with real timing
3. **Context Panel** (right/bottom) — logs correlated to that specific request, the actual SQL queries, external API calls and their responses
4. **Overview** — full request/response headers and bodies

### Step 5: Live Demo — Place an Order and Watch It Appear

1. Go to `http://localhost:4003` (the store)
2. Add a product to cart and click checkout
3. Switch to `http://localhost:4001` (BackendBhai)
4. **The request appears in real-time** in the Request Explorer
5. Click on it to see the **complete execution story**:
   - API Gateway received the request
   - Auth Service verified the token
   - Order Service created the order
   - Payment Service processed the payment
   - Mock Payment API charged the card
6. Each span shows **exact timing** — you can see where time was spent
7. Click on any span to see the **actual SQL queries**, **request/response bodies**, and **correlated logs**

### Step 6: Inject a Failure and Debug It

1. Go to `http://localhost:4002` (Error Injector)
2. Select **"Payment 503"** mode
3. Go to `http://localhost:4003` and place another order
4. Switch to `http://localhost:4001` (BackendBhai)
5. You'll see the **failed request** with a red error indicator
6. Click on it — the waterfall shows:
   - ✅ API Gateway: OK
   - ✅ Auth Service: OK
   - ✅ Order Service: OK
   - ❌ **Payment Service: 503 Error**
7. The **error message** and **stack trace** are right there
8. The **correlated logs** show exactly what happened at each step

**What to say:** *"Without BackendBhai, a developer would need to check API gateway logs, then auth logs, then order logs, then payment logs, then the payment provider's status page. With BackendBhai, you see the entire story in one click."*

### Step 7: Show the Different Views

**Waterfall View:**
- Visual timeline of all service hops
- Color-coded by service (green = OK, red = error, yellow = slow)
- Exact duration of each span
- Click any span for details

**Logs View:**
- All log entries correlated to the selected request
- Filtered by trace_id — you only see logs from this specific request
- No more searching through millions of log lines

**DB Queries View:**
- Actual SQL queries executed during the request
- Query duration and results
- See exactly which query was slow

**External APIs View:**
- External HTTP calls (e.g., to payment provider)
- Request/response bodies
- Status codes and timing

**Topology View:**
- Service dependency graph
- Visual map of which services communicate
- Error rates per service

---

## Quick Reference — All Ports

| Port | Service | URL |
|------|---------|-----|
| 4001 | **BackendBhai DevTools UI** | `http://localhost:4001` |
| 4002 | Error Injector Dashboard | `http://localhost:4002` |
| 4003 | Amazon Storefront (demo) | `http://localhost:4003` |
| 3000 | API Gateway | `http://localhost:3000` |
| 3001 | Auth Service | `http://localhost:3001` |
| 3002 | Order Service | `http://localhost:3002` |
| 3003 | Payment Service | `http://localhost:3003` |
| 4000 | Mock Payment API | `http://localhost:4000` |
| 5432 | PostgreSQL | `localhost:5432` |
| 6379 | Redis | `localhost:6379` |
| 4317/4318 | OTel Collector | `localhost:4317` (gRPC) / `localhost:4318` (HTTP) |

---

## Key Demo Talking Points

1. **"One request, one view"** — Unlike Datadog/New Relic which show aggregated metrics, BackendBhai shows the complete story of a single request.

2. **"Local-first"** — Everything runs on your machine. No cloud, no SaaS, no external dependencies. That's a differentiator vs. expensive cloud platforms.

3. **"Real failures, real debugging"** — The failure injection isn't simulated in the UI — it's real failures in real microservices. The tool catches actual 503s, actual timeouts, actual slow queries.

4. **"Chrome DevTools for backend"** — The mental model is simple. Everyone knows Chrome DevTools Network Tab. BackendBhai is that, but for your backend.

5. **"From 6 tools to 1"** — Instead of switching between logs, DB console, API client, and tracing UI, everything is in one browser tab.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Zustand, React Query |
| Backend | Node.js, Fastify, TypeScript, PostgreSQL |
| Telemetry | OpenTelemetry, OTLP HTTP, W3C Trace Context |
| Infrastructure | Docker Compose |
| Testing | Vitest, Playwright |

---

## Five Workstreams

| # | Workstream | Area | Status |
|---|-----------|------|--------|
| 1 | Telemetry | `apps/telemetry-collector/`, `packages/instrumentation/` | ✅ Core complete |
| 2 | Core Platform | `apps/devtools-core/` | ✅ Server + APIs |
| 3 | Frontend | `apps/devtools-ui/` | ✅ React UI |
| 4 | Demo Environment | `apps/demo-store/`, `infrastructure/` | ✅ Microservices |
| 5 | Integration | `contracts/`, `tests/`, `docs/` | ✅ Contracts + QA |

---

## Getting Started (Development)

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- pnpm

### Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Start all services
docker compose up -d --build

# Open in browser
open http://localhost:4001
```

### Stop

```bash
docker compose down
```

### Reset

```bash
docker compose down -v
docker compose up -d --build
```

---

## Project Structure

```
backendbhai/
├── apps/
│   ├── devtools-core/        # Fastify server, OTLP receiver, APIs
│   ├── devtools-ui/          # React frontend (Vite)
│   ├── telemetry-collector/  # OTel instrumentation library
│   └── demo-store/           # Simulated e-commerce microservices
│       ├── api-gateway/      # Entry point (port 3000)
│       ├── auth-service/     # Authentication (port 3001)
│       ├── order-service/    # Order processing (port 3002)
│       ├── payment-service/  # Payment processing (port 3003)
│       ├── mock-payment-api/ # WireMock payment stubs (port 4000)
│       ├── frontend/         # Error injector dashboard (port 4002)
│       └── amazon-store/     # Storefront UI (port 4003)
├── packages/
│   └── shared/               # Shared TypeScript types
├── contracts/                # API, events, telemetry contracts
├── infrastructure/           # Docker Compose, OTel config, DB init
├── tests/                    # Contract tests, fixtures
├── planning/                 # Product research, architecture docs
└── docker-compose.yml        # All 10 services orchestrated
```

---

## License

Hackathon project — not licensed for production use.
