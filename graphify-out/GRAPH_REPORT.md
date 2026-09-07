# Graph Report - BackendBhai  (2026-09-07)

## Corpus Check
- 147 files · ~87,436 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1336 nodes · 1527 edges · 151 communities (120 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1466bba1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DetailPane.tsx
- devtools-core/src/index.ts
- devtools-ui/package.json
- BackendBhai — Telemetry Contract
- scripts
- BackendBhai — REST API Contract
- 1. DevTools Database Schema
- compilerOptions
- telemetry-collector/package.json
- shared/src/index.ts
- compilerOptions
- BackendBhai — WebSocket Event Contract
- otlp-receiver.ts
- compilerOptions
- contract/package.json
- Backend DevTools — Pre-Development Audit
- BackendBhai
- dependencies
- dependencies
- logger.ts
- BackendBhai — Repository Initialization
- shared/package.json
- Backend DevTools — Implementation Blueprint
- Backend DevTools — Development Backlog
- Backend DevTools — UI/UX Implementation Specification
- compilerOptions
- Backend DevTools — Product Research & Validation
- 8. Development Phases
- 3. Screen Specifications
- order-service/src/index.ts
- Product Definition
- Feature-by-Feature Analysis
- Try to Kill the Idea
- 4. Instrumentation
- Legend
- BackendBhai — Versioning Policy
- 5. Design System
- init-db.js
- amazon-store/package.json
- api-gateway/package.json
- auth-service/package.json
- frontend/package.json
- mock-payment-api/package.json
- order-service/package.json
- payment-service/package.json
- 1. Product Audit
- compilerOptions
- 7.1 REST API
- 8. WebSocket Specification
- Per-Feature Done Criteria
- 8. Demo Audit
- devDependencies
- 9. Replay Architecture
- 3. Instrumentation Audit
- 5. Security Audit
- 7. Frontend Audit
- seed.js
- amazon-store/tsconfig.json
- api-gateway/tsconfig.json
- auth-service/tsconfig.json
- frontend/tsconfig.json
- mock-payment-api/tsconfig.json
- order-service/tsconfig.json
- payment-service/tsconfig.json
- 13. Performance
- 12. Demo Readiness Checklist
- 14. PARALLEL WORKSTREAMS
- 2. Architecture Audit
- 4. Replay Audit
- 6. Performance Audit
- 9. Scope Audit
- OTLP Mock Fixtures
- api-gateway/src/index.ts
- auth-service/src/failures.ts
- Technical Feasibility
- Competitive Landscape
- Differentiation Analysis
- 12. Security
- 14.2 Key Test Scenarios
- 16. Frontend Architecture
- 18. Responsive Behavior
- 20. Implementation Priorities
- test-e2e-demo.js
- validate-pipeline.sh
- scripts
- Feature Classification
- OpenTelemetry Ecosystem Analysis
- 15. Hackathon Architecture
- 3. Data Flow
- 10. Scope-Cut Strategy
- 2. Feature Breakdown
- 19. Accessibility
- 7. Animation System
- start-local.js
- devDependencies
- Telemetry Collector Service (`apps/telemetry-collector`)
- 16. Production Architecture
- 18. Final Architecture Recommendations
- 5. Team Assignment
- 7. First Vertical Slice
- 12. Logs UI
- 1. Information Architecture
- THREE MOST IMPORTANT INTERACTIONS
- THREE MOST IMPORTANT SCREENS
- 2. Navigation
- 6. Interaction System
- verify-failures.js
- payment-service/src/index.ts
- StatusBar.tsx
- Toast.tsx
- TopBar.tsx
- vite-env.d.ts
- White-Space Analysis
- 17. Technical Risks
- 2. Component Diagram
- 5. Trace Model
- 6. Database Schema
- FIRST END-TO-END VERTICAL SLICE
- 4. Dependencies
- 9. Feature Freeze
- 11. External API UI
- 13. Replay UI
- 14. Compare UI
- 4. Component Architecture
- 8. Trace UI
- 9. Service Topology UI
- Architecture Freeze
- MVP Freeze
- amazon-store/src/index.ts
- frontend/src/index.ts
- mock-payment-api/src/index.ts
- init.sh
- demo.js
- reset-db.js

## God Nodes (most connected - your core abstractions)
1. `Backend DevTools — UI/UX Implementation Specification` - 26 edges
2. `Backend DevTools — Implementation Blueprint` - 25 edges
3. `compilerOptions` - 23 edges
4. `Backend DevTools — Product Research & Validation` - 21 edges
5. `Backend DevTools — Development Backlog` - 20 edges
6. `compilerOptions` - 19 edges
7. `Backend DevTools — Pre-Development Audit` - 18 edges
8. `Request` - 15 edges
9. `buildServer()` - 14 edges
10. `compilerOptions` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Props` --references--> `TabId`  [EXTRACTED]
  apps/devtools-ui/src/components/CommandPalette/CommandPalette.tsx → apps/devtools-ui/src/types/index.ts
- `Props` --references--> `Request`  [EXTRACTED]
  apps/devtools-ui/src/components/DetailPane/ErrorHeroCallout.tsx → apps/devtools-ui/src/types/index.ts
- `Props` --references--> `Request`  [EXTRACTED]
  apps/devtools-ui/src/components/DetailPane/LatencyStealGauge.tsx → apps/devtools-ui/src/types/index.ts
- `Props` --references--> `TabId`  [EXTRACTED]
  apps/devtools-ui/src/components/DetailPane/TabBar.tsx → apps/devtools-ui/src/types/index.ts
- `Props` --references--> `Request`  [EXTRACTED]
  apps/devtools-ui/src/components/DetailPane/TraceHero.tsx → apps/devtools-ui/src/types/index.ts

## Import Cycles
- None detected.

## Communities (151 total, 14 thin omitted)

### Community 0 - "DetailPane.tsx"
Cohesion: 0.05
Nodes (58): App(), GRAPH_EDGES, GRAPH_NODES, MOCK_APIS, NAV_ITEMS, Props, Props, Props (+50 more)

### Community 1 - "devtools-core/src/index.ts"
Cohesion: 0.05
Nodes (41): pg, @types/node, @types/pg, typescript, vitest, name, type, version (+33 more)

### Community 2 - "devtools-ui/package.json"
Cohesion: 0.05
Nodes (36): dependencies, lucide-react, react, react-dom, devDependencies, autoprefixer, postcss, tailwindcss (+28 more)

### Community 3 - "BackendBhai — Telemetry Contract"
Cohesion: 0.06
Nodes (34): 10. OTel Collector Pipeline, 1. Trace Model, 2. Span Model, 3. Log Model, 4. HTTP Attributes, 5. Database Attributes, 6. External API Attributes, 7. Request/Response Bodies (+26 more)

### Community 4 - "scripts"
Cohesion: 0.06
Nodes (30): devDependencies, express, pg, @types/express, @types/node, @types/pg, typescript, engines (+22 more)

### Community 5 - "BackendBhai — REST API Contract"
Cohesion: 0.08
Nodes (24): 10. Telemetry Ingestion, 11. Error Format, 12. Pagination, 1. Base URL and Versioning, 2. Health Endpoint, 3. Request Explorer API, 4. Request Detail API, 5. Waterfall API (+16 more)

### Community 6 - "1. DevTools Database Schema"
Cohesion: 0.08
Nodes (24): 1. DevTools Database Schema, 2. Ecommerce Database Schema, 3. Relationships, 4. Indexes, 5. Identifiers, BackendBhai — Data Model Contract, Ecommerce Entity IDs, `log_events` table (+16 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, inlineSources, lib (+16 more)

### Community 8 - "telemetry-collector/package.json"
Cohesion: 0.10
Nodes (22): description, express, @types/express, @types/node, typescript, main, name, private (+14 more)

### Community 9 - "shared/src/index.ts"
Cohesion: 0.17
Nodes (22): ApiError, CompareRequest, ComparisonResult, LogEvent, LogsResponse, PaginatedResponse, ReplayResponse, ReplaySession (+14 more)

### Community 10 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, ignoreDeprecations, isolatedModules, jsx, lib, module (+13 more)

### Community 11 - "BackendBhai — WebSocket Event Contract"
Cohesion: 0.11
Nodes (18): 1. Connection, 2. Event Format, 3. Server → Client Events, 4. Client → Server Events, 5. REST / WebSocket Shape Compatibility, 6. Error Handling, 7. Reconnection, BackendBhai — WebSocket Event Contract (+10 more)

### Community 12 - "otlp-receiver.ts"
Cohesion: 0.21
Nodes (9): TraceRepository, OtlpReceiver, repo, redactBody(), redactHeaders(), redactRecursive(), redactSpanAttributes(), SENSITIVE_BODY_FIELDS (+1 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir (+8 more)

### Community 14 - "contract/package.json"
Cohesion: 0.12
Nodes (15): supertest, @types/supertest, devDependencies, supertest, @types/supertest, typescript, vitest, typescript (+7 more)

### Community 15 - "Backend DevTools — Pre-Development Audit"
Cohesion: 0.13
Nodes (14): Backend DevTools — Pre-Development Audit, Demo Freeze, Exact demonstration scenario:, Exact UI scope:, Final Verdict, Largest unresolved product issue:, Largest unresolved technical issue:, Product Risk (+6 more)

### Community 16 - "BackendBhai"
Cohesion: 0.13
Nodes (14): BackendBhai, Contracts, Current Development Status, Development Rules, Five Workstreams, Getting Started, High-Level Architecture, License (+6 more)

### Community 17 - "dependencies"
Cohesion: 0.13
Nodes (14): dependencies, dotenv, fastify, @fastify/cors, @fastify/static, @fastify/websocket, pg, scripts (+6 more)

### Community 18 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, express, @opentelemetry/api, @opentelemetry/auto-instrumentations-node, @opentelemetry/exporter-trace-otlp-grpc, @opentelemetry/exporter-trace-otlp-http, @opentelemetry/instrumentation-express, @opentelemetry/instrumentation-http (+6 more)

### Community 19 - "logger.ts"
Cohesion: 0.22
Nodes (11): createLogger(), LogEntry, LogLevel, originalConsoleDebug, originalConsoleError, originalConsoleLog, originalConsoleWarn, patchConsoleLogs() (+3 more)

### Community 20 - "BackendBhai — Repository Initialization"
Cohesion: 0.14
Nodes (13): Architecture Decisions from Pre-Development Audit, BackendBhai — Repository Initialization, Contract-First Architecture, Failure Isolation, How .ai/ Is Maintained, How Handoffs Work, How Planning Documents Are Used, Mock-First Development (+5 more)

### Community 21 - "shared/package.json"
Cohesion: 0.14
Nodes (13): devDependencies, typescript, exports, typescript, main, name, private, scripts (+5 more)

### Community 22 - "Backend DevTools — Implementation Blueprint"
Cohesion: 0.14
Nodes (14): 10.1 Comparison Logic, 10. Comparison Architecture, 11.1 How Topology Is Derived from Traces, 11.2 Per-Request Topology, 11. Service Topology, 1.1 High-Level Architecture, 1.2 Architecture Principles, 1. Architecture (+6 more)

### Community 23 - "Backend DevTools — Development Backlog"
Cohesion: 0.14
Nodes (14): 13. FIRST 10 THINGS TO BUILD, 15. MOST CRITICAL DEPENDENCY, 16. MOST DANGEROUS SCOPE ITEM, 17. EMERGENCY CUT LIST, 1. Epics, 3. Engineering Tasks, 6. Critical Path, APPENDIX: Task Count Summary (+6 more)

### Community 24 - "Backend DevTools — UI/UX Implementation Specification"
Cohesion: 0.14
Nodes (14): 10.1 SQL Syntax Highlighting, 10.2 Query Card States, 10. Database Inspector UI, 15.1 Palette Design, 15.2 Command Categories, 15. Command Palette, 17.1 Seed Data Scenarios, 17.2 Service Color Assignments (+6 more)

### Community 25 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, rootDir (+4 more)

### Community 26 - "Backend DevTools — Product Research & Validation"
Cohesion: 0.15
Nodes (13): Backend DevTools — Product Research & Validation, BIGGEST COMPETITIVE THREAT, BIGGEST PRODUCT RISK, BIGGEST TECHNICAL RISK, **BUILD** — with scope narrowing, Executive Summary, Final Decision, FINAL PRODUCT IN 30 SECONDS (+5 more)

### Community 27 - "8. Development Phases"
Cohesion: 0.15
Nodes (13): 8. Development Phases, PHASE 0 — PROJECT BOOTSTRAP (3–5 hours), PHASE 10 — TESTING (4–5 hours), PHASE 11 — DEMO HARDENING (2–3 hours), PHASE 1 — FIRST VERTICAL SLICE (6–8 hours), PHASE 2 — REQUEST EXPLORER (3–4 hours), PHASE 3 — TRACE / WATERFALL (2–3 hours), PHASE 4 — DATABASE + EXTERNAL API INSPECTION (3–4 hours) (+5 more)

### Community 28 - "3. Screen Specifications"
Cohesion: 0.15
Nodes (13): 3.10 Compare, 3.11 Incident Timeline, 3.12 Command Palette, 3.1 Connection / Onboarding, 3.2 Request Explorer, 3.3 Trace Detail, 3.4 Request Waterfall, 3.5 System Topology (+5 more)

### Community 29 - "order-service/src/index.ts"
Cohesion: 0.23
Nodes (8): maybeInjectCacheMiss(), maybeInjectOrderDelay(), OrderItem, Queryable, app, db, inMemoryOrders, inMemoryProducts

### Community 30 - "Product Definition"
Cohesion: 0.17
Nodes (12): Current Tools, Current Workflow, Exact User Problem, Jobs-to-Be-Done, Positioning, Primary Persona, Primary Use Case, Product Definition (+4 more)

### Community 31 - "Feature-by-Feature Analysis"
Cohesion: 0.17
Nodes (12): Feature: Backend Breakpoints / Request Pause, Feature-by-Feature Analysis, Feature: Contextual Logs, Feature: Database Inspector, Feature: External API Inspector, Feature: Incident Replay, Feature: Request Comparison, Feature: Request Explorer (+4 more)

### Community 32 - "Try to Kill the Idea"
Cohesion: 0.17
Nodes (12): Q: Does the proposed product justify installation?, Q: Is our differentiation superficial?, Q: Is Replay feasible for a hackathon?, Q: Is Replay genuinely useful?, Q: Is the problem painful enough?, Q: Is the product too broad?, Q: Is the target user clear?, Q: Is this already a product? (+4 more)

### Community 33 - "4. Instrumentation"
Cohesion: 0.17
Nodes (12): 4.10 How Latency Is Captured, 4.11 How Secrets Are Redacted, 4.1 How Requests Are Captured, 4.2 How Trace IDs Are Generated, 4.3 How Spans Are Created, 4.4 How Spans Propagate Across Services, 4.5 How Logs Are Correlated, 4.6 How Services Are Identified (+4 more)

### Community 34 - "Legend"
Cohesion: 0.17
Nodes (12): EPIC E10 — Testing & Polish, EPIC E1 — Simulated Backend, EPIC E2 — DevTools Server, EPIC E3 — Request Explorer (Frontend), EPIC E4 — Trace Waterfall (Frontend), EPIC E5 — Context Panel (Frontend), EPIC E6 — Request Replay (Frontend + Server), EPIC E7 — Request Comparison (Frontend + Server) (+4 more)

### Community 35 - "BackendBhai — Versioning Policy"
Cohesion: 0.18
Nodes (10): BackendBhai — Versioning Policy, Backward Compatibility, Breaking Change Process, Breaking (Major), Contract Version, Documentation Requirements, For This Hackathon, Implementation Version (+2 more)

### Community 36 - "5. Design System"
Cohesion: 0.18
Nodes (11): 5.10 Animation Principles, 5.1 Theme, 5.2 Typography, 5.3 Spacing Scale, 5.4 Border Radius, 5.5 Borders, 5.6 Shadows, 5.7 Icons (+3 more)

### Community 37 - "init-db.js"
Cohesion: 0.18
Nodes (7): devtoolsSql, devtoolsSqlPath, ecommerceSql, ecommerceSqlPath, { execSync }, fs, path

### Community 38 - "amazon-store/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, test, types (+1 more)

### Community 39 - "api-gateway/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, test, types (+1 more)

### Community 40 - "auth-service/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, test, types (+1 more)

### Community 41 - "frontend/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, test, types (+1 more)

### Community 42 - "mock-payment-api/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, test, types (+1 more)

### Community 43 - "order-service/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, test, types (+1 more)

### Community 44 - "payment-service/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, test, types (+1 more)

### Community 45 - "1. Product Audit"
Cohesion: 0.20
Nodes (10): 1. Product Audit, Is it actually different from Datadog?, Is it actually different from Grafana?, Is it actually different from Jaeger?, Is it actually different from Postman?, Is it actually different from Sentry?, Is Replay genuinely useful?, Is the problem meaningful? (+2 more)

### Community 46 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 47 - "7.1 REST API"
Cohesion: 0.22
Nodes (9): 7.1 REST API, 7.2 Error Response Format, 7.3 Authentication, 7. API Specification, Comparison, Replay, Requests, Topology (+1 more)

### Community 48 - "8. WebSocket Specification"
Cohesion: 0.22
Nodes (9): 8.1 Connection, 8.2 Events, 8.3 Reconnect Behavior, 8.4 Ordering, 8.5 Duplicate Handling, 8.6 Error Handling, 8. WebSocket Specification, Client → Server (+1 more)

### Community 49 - "Per-Feature Done Criteria"
Cohesion: 0.22
Nodes (9): 11. Definition of Done, Context Panel, Per-Feature Done Criteria, Per-Task Done Criteria, Request Comparison, Request Explorer, Request Replay, Service Topology (+1 more)

### Community 50 - "8. Demo Audit"
Cohesion: 0.22
Nodes (9): 8. Demo Audit, Can it be run repeatedly?, Can the demo be reset?, Demo Audit Verdict, What can be deterministic?, What can fail?, What requires real infrastructure?, What should be mocked? (+1 more)

### Community 51 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, copyfiles, cross-env, tsx, @types/node, @types/pg, typescript, vitest

### Community 52 - "9. Replay Architecture"
Cohesion: 0.25
Nodes (8): 9.1 What Is Captured, 9.2 What Is Stored, 9.3 What Can Be Reproduced, 9.4 What Cannot Be Reproduced, 9.5 Safe Replay Environment, 9.6 Replay Implementation, 9.7 Database Cleanup, 9. Replay Architecture

### Community 53 - "3. Instrumentation Audit"
Cohesion: 0.25
Nodes (8): 3. Instrumentation Audit, Database Correlation, Error Capture, External Request Correlation, Log Correlation, Secret Handling, Span Correlation, Trace Propagation

### Community 54 - "5. Security Audit"
Cohesion: 0.25
Nodes (8): 5. Security Audit, Access Control, API Keys and Passwords, Database Credentials, Replay Safety, Security Audit Verdict, Sensitive Request Bodies, Telemetry Protection

### Community 55 - "7. Frontend Audit"
Cohesion: 0.25
Nodes (8): 7. Frontend Audit, Error Handling, Frontend Audit Verdict, Graph Complexity, State Management, Trace Rendering, UI Consistency, WebSocket Updates

### Community 56 - "seed.js"
Cohesion: 0.29
Nodes (5): fs, http, path, postOrder(), seedViaHttp()

### Community 57 - "amazon-store/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../../tsconfig.base.json

### Community 58 - "api-gateway/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../../tsconfig.base.json

### Community 59 - "auth-service/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../../tsconfig.base.json

### Community 60 - "frontend/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../../tsconfig.base.json

### Community 61 - "mock-payment-api/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../../tsconfig.base.json

### Community 62 - "order-service/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../../tsconfig.base.json

### Community 63 - "payment-service/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../../tsconfig.base.json

### Community 64 - "13. Performance"
Cohesion: 0.29
Nodes (7): 13.1 Hackathon Performance Limits, 13.2 Instrumentation Overhead, 13.3 Telemetry Volume, 13.4 WebSocket Traffic, 13.5 UI Rendering, 13.6 Sampling, 13. Performance

### Community 65 - "12. Demo Readiness Checklist"
Cohesion: 0.29
Nodes (7): 12. Demo Readiness Checklist, Data Pipeline, Demo Script, DevTools Server, Infrastructure, Quality, React UI

### Community 66 - "14. PARALLEL WORKSTREAMS"
Cohesion: 0.29
Nodes (7): 14. PARALLEL WORKSTREAMS, Stream A: Simulated Backend (DEV-2), Stream B: DevTools Server (DEV-3), Stream C: Frontend Core (DEV-4), Stream D: Frontend Detail + Context (DEV-5), Stream E: Replay & Compare (DEV-3 + DEV-5), Stream F: Testing & Polish (DEV-6 + all)

### Community 67 - "2. Architecture Audit"
Cohesion: 0.29
Nodes (7): 2. Architecture Audit, Architecture Issue #3: Missing Request Body Capture, Architecture Issue #4: Log Correlation Gap, Architecture Issue #5: Topology Is Post-Hoc Derived, Architecture Issue #6: Replay Trace Discovery Race Condition, Critical Architecture Issue #1: OTLP Receiver Complexity, Critical Architecture Issue #2: Collector vs. Same-Process Contradiction

### Community 68 - "4. Replay Audit"
Cohesion: 0.29
Nodes (7): 4. Replay Audit, Are side effects controlled?, Can replay actually work?, Is the replay environment realistic?, Replay Audit Verdict, What cannot be reproduced?, What state is required?

### Community 69 - "6. Performance Audit"
Cohesion: 0.29
Nodes (7): 6. Performance Audit, Database Growth, Frontend Rendering, Instrumentation Overhead, Performance Audit Verdict, Telemetry Volume, WebSocket Traffic

### Community 70 - "9. Scope Audit"
Cohesion: 0.29
Nodes (7): 9. Scope Audit, CAN IGNORE, Feature Classification, MUST FIX BEFORE CODING, MUST FIX BEFORE DEMO, ONLY IF TIME REMAINS, REMOVE IMMEDIATELY

### Community 71 - "OTLP Mock Fixtures"
Cohesion: 0.29
Nodes (6): Against Dev 2's OTLP endpoint:, Against the Collector (if running):, Fixture Coverage, How to Use, Key Attributes to Verify, OTLP Mock Fixtures

### Community 72 - "api-gateway/src/index.ts"
Cohesion: 0.33
Nodes (3): activeChaosState, app, ChaosState

### Community 73 - "auth-service/src/failures.ts"
Cohesion: 0.53
Nodes (4): isWellFormed(), maybeInjectAuthTimeout(), sleep(), app

### Community 74 - "Technical Feasibility"
Cohesion: 0.33
Nodes (6): Architecture, Build Timeline (Hackathon), Deliberate Failures, Simulated Backend Services, Technical Feasibility, Technology Stack (Recommended)

### Community 75 - "Competitive Landscape"
Cohesion: 0.33
Nodes (6): Competitive Landscape, Tier 1: Full Observability Platforms (APM), Tier 2: Distributed Tracing Tools, Tier 3: Error Tracking & Debugging, Tier 4: API Client & HTTP Tooling, Tier 5: Specialized Tools

### Community 76 - "Differentiation Analysis"
Cohesion: 0.33
Nodes (6): Differentiation Analysis, Is Our Request-Centric Workflow Actually Differentiated?, Is Replay a Meaningful Differentiator?, Is This Already a Product?, Is This Simply APM with a Different UI?, What Is the Smallest Defensible Product?

### Community 77 - "12. Security"
Cohesion: 0.33
Nodes (6): 12.1 Secret Redaction, 12.2 Request Body Handling, 12.3 Replay Safety, 12.4 Local/Private Deployment, 12.5 Telemetry Protection, 12. Security

### Community 78 - "14.2 Key Test Scenarios"
Cohesion: 0.33
Nodes (6): 14.1 Testing Strategy, 14.2 Key Test Scenarios, 14. Testing, Failure Scenario Tests, Integration Tests, Unit Tests

### Community 79 - "16. Frontend Architecture"
Cohesion: 0.33
Nodes (6): 16.1 Tech Stack, 16.2 State Management, 16.3 WebSocket Hook, 16.4 Virtual Scrolling, 16.5 Error Handling, 16. Frontend Architecture

### Community 80 - "18. Responsive Behavior"
Cohesion: 0.33
Nodes (6): 18.1 Breakpoints, 18.2 Desktop Layout (≥1440px), 18.3 Laptop Layout (1024px–1443px), 18.4 Narrow Layout (<1024px), 18.5 Desktop-First Priorities, 18. Responsive Behavior

### Community 81 - "20. Implementation Priorities"
Cohesion: 0.33
Nodes (6): 20. Implementation Priorities, Phase 1: Foundation (Week 1), Phase 2: Core Visualizations (Week 1-2), Phase 3: Context Panels (Week 2), Phase 4: Advanced Features (Week 2-3), Phase 5: Polish (Week 3)

### Community 83 - "validate-pipeline.sh"
Cohesion: 0.60
Nodes (5): fail(), info(), pass(), validate-pipeline.sh script, warn()

### Community 84 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, clean, start, test

### Community 85 - "Feature Classification"
Cohesion: 0.40
Nodes (5): DO NOT BUILD (Explicitly Excluded), Feature Classification, MUST HAVE (Build for Hackathon), NICE TO HAVE (Stretch Goals), SHOULD HAVE (Build if Time Permits)

### Community 86 - "OpenTelemetry Ecosystem Analysis"
Cohesion: 0.40
Nodes (5): Key Limitations of OpenTelemetry, OpenTelemetry as Our Foundation, OpenTelemetry Ecosystem Analysis, Supported Languages (Stable), What OpenTelemetry Provides

### Community 87 - "15. Hackathon Architecture"
Cohesion: 0.40
Nodes (5): 15.1 What We Build, 15.2 What We Don't Build, 15.3 Simplifications, 15.4 Docker Compose (Simplified), 15. Hackathon Architecture

### Community 88 - "3. Data Flow"
Cohesion: 0.40
Nodes (5): 3.1 Request Capture Flow, 3.2 Trace Storage Flow, 3.3 Replay Flow, 3.4 Realtime Flow, 3. Data Flow

### Community 89 - "10. Scope-Cut Strategy"
Cohesion: 0.40
Nodes (5): 10. Scope-Cut Strategy, FULL MVP (Target), IF WE ARE 25% BEHIND, IF WE ARE 50% BEHIND, IF WE HAVE EXTRA TIME

### Community 90 - "2. Feature Breakdown"
Cohesion: 0.40
Nodes (5): 2.1 MUST HAVE (MVP — required for a working demo), 2.2 SHOULD HAVE (add if MVP is stable), 2.3 NICE TO HAVE (stretch goals), 2.4 DO NOT BUILD, 2. Feature Breakdown

### Community 91 - "19. Accessibility"
Cohesion: 0.40
Nodes (5): 19.1 Keyboard Navigation, 19.2 Screen Reader Support, 19.3 Color Independence, 19.4 Reduced Motion, 19. Accessibility

### Community 92 - "7. Animation System"
Cohesion: 0.40
Nodes (5): 7.1 Animation Catalog, 7.2 New Request Animation, 7.3 Waterfall Bar Draw, 7.4 Slow/Error Span Highlight, 7. Animation System

### Community 94 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, @types/express, @types/node, typescript

### Community 95 - "Telemetry Collector Service (`apps/telemetry-collector`)"
Cohesion: 0.50
Nodes (3): Configuration File, Features, Telemetry Collector Service (`apps/telemetry-collector`)

### Community 97 - "16. Production Architecture"
Cohesion: 0.50
Nodes (4): 16.1 What Changes, 16.2 Production Components, 16.3 Production Replay, 16. Production Architecture

### Community 98 - "18. Final Architecture Recommendations"
Cohesion: 0.50
Nodes (4): 18.1 Decisions to Freeze, 18.2 Architecture Anti-Patterns to Avoid, 18.3 Architecture Strengths, 18. Final Architecture Recommendations

### Community 99 - "5. Team Assignment"
Cohesion: 0.50
Nodes (4): 5.1 Team Split (6 developers), 5.2 Task Ownership Matrix, 5.3 Daily Sync Points, 5. Team Assignment

### Community 100 - "7. First Vertical Slice"
Cohesion: 0.50
Nodes (4): 7. First Vertical Slice, Implementation Order, Path, Verification Criteria

### Community 101 - "12. Logs UI"
Cohesion: 0.50
Nodes (4): 12.1 Log Level Styling, 12.2 Log Timestamp Display, 12.3 Log Expansion, 12. Logs UI

### Community 102 - "1. Information Architecture"
Cohesion: 0.50
Nodes (4): 1.1 Application Map, 1.2 Information Hierarchy, 1.3 Data-to-Screen Mapping, 1. Information Architecture

### Community 103 - "THREE MOST IMPORTANT INTERACTIONS"
Cohesion: 0.50
Nodes (4): 1. Live Request Entry, 2. Waterfall Bar Draw, 3. Replay → Compare Flow, THREE MOST IMPORTANT INTERACTIONS

### Community 104 - "THREE MOST IMPORTANT SCREENS"
Cohesion: 0.50
Nodes (4): 1. Request Explorer (with live updates), 2. Trace Waterfall, 3. Command Palette, THREE MOST IMPORTANT SCREENS

### Community 105 - "2. Navigation"
Cohesion: 0.50
Nodes (4): 2.1 Primary Navigation Pattern, 2.2 Navigation Flows, 2.3 Keyboard Navigation Map, 2. Navigation

### Community 106 - "6. Interaction System"
Cohesion: 0.50
Nodes (4): 6.1 Core Interaction Patterns, 6.2 Tooltip System, 6.3 Toast System, 6. Interaction System

### Community 113 - "White-Space Analysis"
Cohesion: 0.67
Nodes (3): Current Market Map, White-Space Analysis, White-Space Opportunities

### Community 114 - "17. Technical Risks"
Cohesion: 0.67
Nodes (3): 17.1 Risk Matrix, 17.2 Mitigation Details, 17. Technical Risks

### Community 115 - "2. Component Diagram"
Cohesion: 0.67
Nodes (3): 2.1 Frontend Components, 2.2 Backend Components, 2. Component Diagram

### Community 116 - "5. Trace Model"
Cohesion: 0.67
Nodes (3): 5.1 Entity Relationship Diagram, 5.2 Example Records, 5. Trace Model

### Community 117 - "6. Database Schema"
Cohesion: 0.67
Nodes (3): 6.1 PostgreSQL Schema, 6.2 Retention Considerations, 6. Database Schema

### Community 118 - "FIRST END-TO-END VERTICAL SLICE"
Cohesion: 0.67
Nodes (3): FIRST END-TO-END VERTICAL SLICE, Step-by-Step, Success Criteria

### Community 119 - "4. Dependencies"
Cohesion: 0.67
Nodes (3): 4.1 Dependency Graph, 4.2 Hard Blockers, 4. Dependencies

### Community 120 - "9. Feature Freeze"
Cohesion: 0.67
Nodes (3): 9. Feature Freeze, Freeze Timeline, What's Frozen at Each Gate

### Community 121 - "11. External API UI"
Cohesion: 0.67
Nodes (3): 11.1 Request/Response Display, 11.2 Response Display, 11. External API UI

### Community 122 - "13. Replay UI"
Cohesion: 0.67
Nodes (3): 13.1 Replay Workflow States, 13.2 Override Form, 13. Replay UI

### Community 123 - "14. Compare UI"
Cohesion: 0.67
Nodes (3): 14.1 Trace Selection, 14.2 Diff Visualization, 14. Compare UI

### Community 124 - "4. Component Architecture"
Cohesion: 0.67
Nodes (3): 4.1 Page Hierarchy, 4.2 Shared/Reusable Components, 4. Component Architecture

### Community 125 - "8. Trace UI"
Cohesion: 0.67
Nodes (3): 8.1 Waterfall Chart Rendering, 8.2 Span Information Display, 8. Trace UI

### Community 126 - "9. Service Topology UI"
Cohesion: 0.67
Nodes (3): 9.1 Implementation, 9.2 Node Popover, 9. Service Topology UI

### Community 127 - "Architecture Freeze"
Cohesion: 0.67
Nodes (3): Architecture Freeze, Exact architecture to build:, Key architecture decisions:

### Community 128 - "MVP Freeze"
Cohesion: 0.67
Nodes (3): Exact features to build:, MVP Freeze, Total task count for MVP: ~30 tasks (down from 55 in the backlog)

## Knowledge Gaps
- **865 isolated node(s):** `name`, `version`, `private`, `main`, `types` (+860 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 936 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Backend DevTools — UI/UX Implementation Specification` connect `Backend DevTools — UI/UX Implementation Specification` to `3. Screen Specifications`, `5. Design System`, `16. Frontend Architecture`, `18. Responsive Behavior`, `20. Implementation Priorities`, `19. Accessibility`, `7. Animation System`, `01-product-research-validation.md`, `12. Logs UI`, `1. Information Architecture`, `THREE MOST IMPORTANT INTERACTIONS`, `THREE MOST IMPORTANT SCREENS`, `2. Navigation`, `6. Interaction System`, `11. External API UI`, `13. Replay UI`, `14. Compare UI`, `4. Component Architecture`, `8. Trace UI`, `9. Service Topology UI`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Backend DevTools — Implementation Blueprint` connect `Backend DevTools — Implementation Blueprint` to `01-product-research-validation.md`, `13. Performance`, `16. Production Architecture`, `18. Final Architecture Recommendations`, `4. Instrumentation`, `12. Security`, `14.2 Key Test Scenarios`, `7.1 REST API`, `8. WebSocket Specification`, `17. Technical Risks`, `2. Component Diagram`, `5. Trace Model`, `6. Database Schema`, `9. Replay Architecture`, `15. Hackathon Architecture`, `3. Data Flow`, `FIRST END-TO-END VERTICAL SLICE`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Backend DevTools — Product Research & Validation` connect `Backend DevTools — Product Research & Validation` to `01-product-research-validation.md`, `Try to Kill the Idea`, `Technical Feasibility`, `Competitive Landscape`, `Differentiation Analysis`, `White-Space Analysis`, `Feature Classification`, `OpenTelemetry Ecosystem Analysis`, `Product Definition`, `Feature-by-Feature Analysis`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _865 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DetailPane.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0522466039707419 - nodes in this community are weakly interconnected._
- **Should `devtools-core/src/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `devtools-ui/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._