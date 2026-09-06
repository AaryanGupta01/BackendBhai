# Developer 3 — Frontend / UI

> Project: **Backend DevTools** (Hackathon — DevTools & Infra track)
> Team: 5 developers. You are **Dev 3**. Dev 5 (Abhinav) owns integration/architecture/QA and is your escalation point for any contract disagreement.
> Read this whole file before writing code. It is built entirely from the team's 5 planning docs — nothing here is invented scope.

---

## 1. Your mission, in one sentence

You build the entire **React frontend** — Request Explorer, Trace Waterfall, Context Panel tabs, Topology, Replay/Compare UI, Command Palette — the whole visible product. Judges will remember what they see, and what they see is entirely your work sitting on top of Dev 2's APIs.

## 2. Source documents (read in this order)

1. **`04-ui-ux-implementation-spec.md`** — this is your bible. Read it in full, not just the excerpts below. Pay special attention to **§5 Design System** (colors, type, spacing — implement this as a Tailwind config **before** building any component, per the audit's explicit recommendation), **§3 Screen Specifications**, **§4 Component Architecture**, and **§16 Frontend Architecture**.
2. **`02-implementation-blueprint.md`** — you need **§7 API Specification** and **§8 WebSocket Specification** to know exactly what shape data arrives in. Reproduced below, but treat the blueprint as the source of truth for anything ambiguous.
3. **`03-development-backlog.md`** — your tasks span **Epic E3** (`F-01`–`F-06`), **Epic E4** (`W-01`–`W-04`), **Epic E5** (`C-01`–`C-03`), **Epic E8** (`T-01`), part of **Epic E6/E7** (`R-01`, `R-02`, `CP-01`), and part of **Epic E10** (`P-01`, `P-02`).
4. **`05-pre-development-audit.md`** — read **§7 Frontend Audit** and **the UI Freeze section**. The audit's #1 recommendation for you specifically: build the Tailwind design-token config first, because "the main risk is implementation drift... under time pressure," not architectural flaws.
5. **`01-product-research-validation.md`** — skim only, for framing ("Chrome DevTools for the backend").

## 3. Working philosophy — read this before you start

The team's approach is **contract-first, mock-first, failure-isolated, workstream-ownership**. Concretely for you:
- You do not need Dev 2's real server running to start most components. Build against the exact JSON shapes in §5 below using MSW (Mock Service Worker) or simple hardcoded fixtures, then swap to the real API client once Dev 2's endpoints exist. This lets you start `F-03`, `W-02` (the waterfall — your longest task), etc. on day 1.
- Establish the Tailwind design tokens (§6 below) and the shared components (`MethodBadge`, `StatusCode`, `DurationBadge`, `ServiceDot`, etc.) **before** building screens — every screen reuses them, and building them screen-by-screen instead of once causes the "implementation drift" the audit warns about.
- Every task you build should degrade gracefully if the WebSocket is down or an API call fails — Dev 5 will be checking your loading/empty/error states against §16.5 as part of QA.

## 4. Scope

### In scope for you
- React app scaffold (Vite + TS + Tailwind + shadcn/ui + Router + React Query + Zustand) (`F-01`)
- API client + typed hooks (`F-02`)
- Request Explorer: list (`F-03`), filters (`F-04`), layout (`F-05`), WebSocket live updates (`F-06`)
- Request Detail shell / tabs (`W-01`)
- Waterfall chart (`W-02`) and row component (`W-03`)
- Overview tab (`W-04`)
- Logs tab (`C-01`), DB Queries tab (`C-02`), External Calls tab (`C-03`)
- Topology tab (`T-01`)
- Replay tab UI (`R-01`), Replay WebSocket progress (`R-02`)
- Compare tab UI (`CP-01`)
- Command Palette (`P-01`)
- Error boundaries + loading states (`P-02`)

### Explicitly NOT yours
- Anything server-side (`packages/devtools-server`) → **Dev 2** — you consume their APIs, never assume behavior they haven't documented
- The simulated e-commerce demo frontend that generates traffic (`S-09`, a separate tiny app) → **Dev 4**
- `packages/shared` type authorship → **Dev 5** (you consume these; import them, don't redefine your own copies)
- Final UI polish pass sign-off and demo readiness → shared with **Dev 5**, but you do the implementation

## 5. Exact data contracts you build against

### 5.1 `GET /api/v1/requests` (powers Request Explorer)
```json
{
  "requests": [{
    "trace_id": "5b8efff798038103d269b633813fc60c", "method": "POST", "path": "/api/orders",
    "status_code": 201, "status": "ok", "duration_ms": 1234, "root_service": "api-gateway",
    "services": ["api-gateway", "auth-service", "order-service", "payment-service"],
    "span_count": 8, "log_count": 3, "error_count": 0,
    "start_time": 1725345600000, "created_at": "2026-09-03T12:00:01.234Z"
  }],
  "pagination": { "page": 1, "limit": 25, "total": 150, "pages": 6 }
}
```
Query params you can send: `page`, `limit`, `method`, `status`, `status_code`, `service`, `path`, `search`, `from`, `to`, `min_duration`, `max_duration`, `sort`, `order`.

### 5.2 `GET /api/v1/requests/:traceId` (powers Overview / Logs / DB Queries / External Calls tabs)
Returns `{ trace, spans, logs, db_queries, external_calls }` — see blueprint §7.1 for the full example; each `db_queries` item has `span_id, operation, table, statement, duration_ms, status, service_name`; each `external_calls` item has `span_id, method, url, status_code, duration_ms, status, service_name`.

### 5.3 `GET /api/v1/traces/:traceId/waterfall` (powers the Waterfall chart)
```json
{
  "trace_id": "5b8efff798038103d269b633813fc60c",
  "total_duration_ms": 1234,
  "spans": [{
    "id": "root-span-001", "parent_span_id": null, "service_name": "api-gateway",
    "operation_name": "POST /api/orders", "span_type": "server",
    "start_time": 1725345600000, "end_time": 1725345601234, "duration_ms": 1234,
    "status": "ok", "depth": 0, "order": 0, "start_offset_ms": 0, "percentage_of_total": 100
  }]
}
```
Bar positioning math (from the audit — this is the correct approach, use it):
```
barX = leftPadding + (start_offset_ms / totalDuration) × chartWidth
barWidth = max((duration_ms / totalDuration) × chartWidth, 2px)   // 2px floor so 0ms spans stay visible
```

### 5.4 `GET /api/v1/traces/:traceId/logs?level=&service=&search=` → `{ trace_id, logs: [...], total }`

### 5.5 `POST /api/v1/replay` → `{ replay_session: { id, original_trace_id, replay_trace_id, status, created_at } }`, then poll `GET /api/v1/replay/:replayId`.

### 5.6 `POST /api/v1/compare` with `{ trace_id_a, trace_id_b }` → duration diff, status match, service diff (`added`/`removed`/`unchanged`), and per-span diff table — see blueprint §7.1 for the exact field names (`duration_diff_ms`, `duration_diff_percentage`, `span_diff.details[].diff_ms`, etc.). Build the Compare UI against these field names precisely.

### 5.7 `GET /api/v1/topology` / `GET /api/v1/topology?traceId=:id` → `{ nodes: [...], edges: [...] }`, node `type` is one of `service | database | cache | external`.

### 5.8 WebSocket (`ws://localhost:4001/ws`)

| Event | Payload |
|-------|---------|
| `new_request` | identical shape to one item in §5.1's `requests[]` array |
| `trace_update` | `{ trace_id, spans, logs }` |
| `replay_progress` | `{ replay_id, step, status }` |
| `replay_complete` | `{ replay_id, original_trace_id, replay_trace_id, status, duration_ms }` |
| `service_update` | `{ service_name, request_count, error_count, avg_duration_ms }` |
| `error` | `{ message, code }` |

Events aren't ordered and can duplicate — key on `trace_id`, last-write-wins.

## 6. Design system — implement this first, as a Tailwind config, before any screen

**Theme:** dark-only. No toggle — the spec is explicit that dark is "the only theme for the hackathon."

| Token | Value |
|-------|-------|
| Background base | `bg-zinc-950` (#09090b) |
| Background raised | `bg-zinc-900` (#18181b) |
| Background surface | `bg-zinc-800` (#27272a) |
| Background hover | `bg-zinc-800/50` |
| Background selected | `bg-zinc-800` + `ring-1 ring-zinc-700` |
| Border subtle/default/strong | `border-zinc-800` / `border-zinc-700` / `border-zinc-600` |
| Text primary/secondary/muted/disabled | `text-zinc-100` / `text-zinc-400` / `text-zinc-500` / `text-zinc-600` |

**Typography:** Inter for UI text, JetBrains Mono for code/durations. App title 14px/600, section heading 13px/600, body 13px/400, labels 11px/500 uppercase +0.02em, code 12px/400, badges 10px/600 uppercase.

**Spacing:** 4px grid — `space-1`(4px) tight gaps, `space-2`(8px) default gap, `space-4`(16px) card padding, `space-6`(24px) section spacing, `space-8`(32px) page padding.

**Radius:** cards/buttons/inputs `rounded-md` (6px), badges/tooltips `rounded` (4px), command palette/modals `rounded-xl` (12px).

**Shadows:** minimal — cards use borders, not shadows. Command palette `shadow-2xl shadow-black/50`, tooltips `shadow-lg shadow-black/30`.

**Icons:** Lucide React. `Server` (service node), `Database`, `Zap` (cache), `Globe` (external), `Play` (replay), `GitCompare` (compare), `Search`, `Filter`, `X`, `ChevronDown`/`ChevronUp`, `XCircle` (error), `CheckCircle` (success), `AlertTriangle` (warning), `Loader2` (loading, animated), `Network` (topology).

**Service color palette** — persistent across waterfall bars, service dots, topology nodes, and log indicators:

| Service | Color | Tailwind |
|---------|-------|----------|
| api-gateway | `#3b82f6` | `blue-500` |
| auth-service | `#8b5cf6` | `violet-500` |
| order-service | `#f59e0b` | `amber-500` |
| payment-service | `#ef4444` | `red-500` |
| postgresql | `#10b981` | `emerald-500` |
| redis | `#f97316` | `orange-500` |
| mock-payment-api | `#a855f7` | `purple-500` |

For unknown services, rotate through a 12-color palette rather than reusing a taken color.

**Method badge colors:** GET `blue`, POST `emerald`, PUT `amber`, DELETE `red`, PATCH `purple` (all `bg-{color}-500/15 text-{color}-400`).
**Status code colors:** 2xx `emerald-400`, 3xx `blue-400`, 4xx `amber-400`, 5xx `red-400`.
**Duration colors:** <100ms `emerald-400`, 100–500ms `yellow-400`, 500ms–2s `amber-400`, >2s `red-400`.

**Animation:** 150ms `ease-out` default, subtle opacity/transform only, never flashy. Respect `prefers-reduced-motion`.

## 7. Tech stack and state management (implement exactly this — it's frozen)

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Server state | React Query (TanStack Query) |
| Client state | Zustand |
| Routing | React Router v6 |
| Graph | React Flow (`@xyflow/react`) |
| Virtual scroll | `@tanstack/react-virtual` |
| WebSocket | native `WebSocket` + custom hook |

**Zustand store (`appStore.ts`):**
```typescript
interface AppState {
  selectedTraceId: string | null;
  setSelectedTraceId: (id: string | null) => void;
  activeTab: 'waterfall' | 'overview' | 'logs' | 'db' | 'external' | 'topology' | 'replay' | 'compare';
  setActiveTab: (tab: AppState['activeTab']) => void;
  expandedSpanId: string | null;
  setExpandedSpanId: (id: string | null) => void;
  filters: { methods: string[]; status: string | null; services: string[]; search: string; minDuration: number | null; maxDuration: number | null };
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
}
```

**React Query hooks:**
| Hook | Query key | Endpoint | Refetch |
|------|-----------|----------|---------|
| `useRequests(filters)` | `['requests', filters]` | `GET /api/v1/requests` | on WS `new_request` |
| `useTrace(traceId)` | `['trace', traceId]` | `GET /api/v1/requests/:traceId` | on demand |
| `useWaterfall(traceId)` | `['waterfall', traceId]` | `GET /api/v1/traces/:traceId/waterfall` | on demand |
| `useLogs(traceId, filters)` | `['logs', traceId, filters]` | `GET /api/v1/traces/:traceId/logs` | on demand |
| `useTopology(traceId?)` | `['topology', traceId]` | `GET /api/v1/topology` | on demand |
| `useReplayStatus(replayId)` | `['replay', replayId]` | `GET /api/v1/replay/:replayId` | poll every 1s |

**WebSocket hook** — auto-reconnect with exponential backoff (1s, 2s, 4s, 8s... max 10 attempts):
```typescript
function useWebSocket() {
  const { setWsConnected, addRequest } = useAppStore();
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4001/ws');
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => { setWsConnected(false); /* reconnect with backoff */ };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'new_request': addRequest(data.data); break;
        case 'replay_progress': /* handled by replay component */ break;
        case 'replay_complete': /* handled by replay component */ break;
      }
    };
    return () => ws.close();
  }, []);
}
```

**Virtual scrolling:** `@tanstack/react-virtual` for the Request List — 40px row height, overscan 5, scroll-to-top on filter change.

**Error handling layers:** component-level React Error Boundary with fallback UI; React Query error states with retry; WebSocket auto-reconnect as above; a top-level ErrorBoundary showing "Something went wrong" with a reload button.

## 8. Component architecture (build shared components once, reuse everywhere)

```
App
├── AppShell
│   ├── TopBar (Logo, CommandPaletteTrigger [Cmd+K], ConnectionIndicator)
│   ├── RequestExplorer
│   │   ├── FilterBar (MethodFilter, StatusFilter, ServiceFilter, DurationFilter, SearchInput)
│   │   └── RequestList (virtual scroll) → RequestRow × N (MethodBadge, PathDisplay, StatusCode, DurationDisplay, ServiceDots, RelativeTime)
│   ├── RequestDetail (shown when a trace is selected)
│   │   ├── TraceHeader (Back, MethodBadge, PathDisplay, StatusCode, DurationBadge, ServiceDots, CopyTraceIdButton)
│   │   ├── TabBar (Waterfall / Overview / Logs / DB / External / Topology / Replay / Compare, with count badges)
│   │   └── TabContent → one component per tab (see §9 below)
│   └── StatusBar (ConnectionDot, RequestCount, ActiveFilterCount, ServerHealth)
├── CommandPalette (overlay: SearchInput + grouped ResultList)
└── ErrorBoundary (wraps the whole app)
```

**Shared components to build once, first:** `MethodBadge`, `StatusCode`, `DurationBadge`, `ServiceDot` / `ServiceDots`, `CodeBlock` (syntax-highlighted JSON/SQL), `KeyValueTable`, `LevelBadge`, `OperationBadge`, `SkeletonRow`, `EmptyState`, `ErrorState`, `Toast`.

## 9. Screen-by-screen build notes

### Request Explorer (`F-03`, `F-04`, `F-05`)
Columns: Method (72px), Path (flex, truncated), Status (56px, right-aligned), Duration (80px, right-aligned), Services (120px, colored dots), Time (80px, relative — "now"/"2s"/"5m"). Status bar shows `● Connected | N requests | N active filters`. Interactions: click row → open detail; double-click → open detail on the Waterfall tab directly; right-click → context menu (Copy Trace ID, Copy cURL, Replay, Compare); hover → `bg-white/5`. Keyboard: ↑/↓ select, Enter opens, `/` focuses search. Loading = 10 skeleton rows; empty = "No requests captured yet. Make a request to the simulated backend."; disconnected = dimmed rows + banner.

### Trace Waterfall (`W-01`, `W-02`, `W-03`)
Two-column row layout: left info panel (280px fixed — service name indented by `depth × 16px`, operation name, duration label), right chart panel (flex — colored bar at `start_offset_ms`, width from `duration_ms`, per §5.3 math). Bar states: normal = service color @70% opacity; error = red with diagonal stripe; slow (>2000ms) = amber pulsing border; selected = white border @100% opacity; hovered = lighter shade + tooltip. Click a span → expand a detail panel below it with a full attribute key-value table (persists until another span is clicked). Time ruler across the top. This is your longest single task (`XL` complexity) — start it early.

### Overview tab (`W-04`)
Request section (headers as KeyValueTable with redacted values shown literally as `**REDACTED**`, body as syntax-highlighted `CodeBlock`) and response section, same structure.

### Logs tab (`C-01`)
Filterable table: level badge (color-coded: info=default, warn=yellow, error=red), service dot + name, message, timestamp, expandable attributes. Filter bar for level + service.

### DB Queries tab (`C-02`)
One `QueryCard` per DB span: header (service, operation, table, duration, status) + SQL block, syntax-highlighted. Note from Dev 1/Dev 2: Redis spans may need visually distinct treatment from Postgres spans — confirm with them how Redis commands are being labeled before assuming every "DB" row is SQL.

### External Calls tab (`C-03`)
One `CallCard` per external HTTP span: header (service, method, URL, status, duration) + request block (headers+body) + response block (status+headers+body).

### System Topology (`T-01`)
React Flow graph. Node shapes/colors: Service = rounded rect, `bg-blue-600`, `Server` icon; Database = cylinder, `bg-emerald-600`, `Database` icon; Cache = diamond, `bg-amber-600`, `Zap` icon; External = hexagon, `bg-purple-600`, `Globe` icon. Edge labels = protocol + avg duration ("HTTP 112ms", "SQL 45ms"). Edge colors: HTTP `#60a5fa`, SQL `#34d399`, Redis `#fbbf24`, External `#a78bfa`. Click node → popover with request count, error count, avg duration, operations list. Filter dropdown: "All Requests" vs. current-trace-only. Only 7 nodes / 7 edges expected — no auto-layout algorithm needed, manual positioning is fine per the audit.

### Replay tab (`R-01`, `R-02`)
Read-only snapshot of the original request, optional override fields (path/headers/body), Replay button, progress indicator wired to `replay_progress`/`replay_complete` WS events, result panel linking to the new trace. Keep this simple — one button, one progress indicator, one result link, per the backlog's explicit mitigation for this being a fragile, high-visibility feature.

### Compare tab (`CP-01`)
Two trace selectors (dropdowns scoped to traces sharing the same path), summary diff (duration/status/services), span-by-span diff table with `diff_ms` shown in green (faster) / red (slower) / grey (same).

### Command Palette (`P-01`)
Cmd+K modal, fuzzy search across requests/services/navigation actions, Enter selects, Esc closes.

## 10. Contracts — what you produce, what you consume

**You produce:** the built static assets Dev 2 serves from `/` on port 4001 (`D-13`) — confirm the exact build output directory with Dev 2 before they wire up static serving.

**You consume:**
- All REST/WebSocket shapes in §5 from Dev 2 — do not invent fields that aren't documented there; if you need something not in the spec, ask Dev 2/Dev 5 before building around an assumption.
- `packages/shared` types from Dev 5 — import these for your API client rather than hand-writing parallel interfaces, so a schema change only needs updating in one place.
- Design tokens from this file / doc 04 — these are frozen, don't improvise new colors or spacing values mid-build.

## 11. Suggested build order

1. `F-01` scaffold with Tailwind config encoding **every** token in §6 — do this before any component, per the audit's explicit recommendation.
2. Shared components (`MethodBadge`, `StatusCode`, `DurationBadge`, `ServiceDot`, `CodeBlock`, `KeyValueTable`, `EmptyState`, `ErrorState`).
3. `F-02` API client + hooks, built against the mock JSON in §5 (mock-first — don't wait on Dev 2).
4. `F-03`/`F-04`/`F-05` Request Explorer — this is Milestone 1, the first visible thing the team can demo.
5. `W-01` Request Detail shell + `W-04` Overview tab (simpler, unblocks demoing "click a row, see something").
6. `W-02`/`W-03` Waterfall — start this early given its size (`XL`), even before all Context Panel tabs exist.
7. `C-01`/`C-02`/`C-03` Context Panel tabs, in parallel once `W-01` exists.
8. `F-06` WebSocket live updates — confirm the payload shape matches REST with Dev 2 first.
9. Lower-tier items in MVP-priority order: `T-01` Topology, then `R-01`/`R-02` Replay, then `CP-01` Compare, then `P-01` Command Palette. (Per the Scope Audit, these are exactly the items cut first if the team runs behind — build in this order so a time-crunch naturally leaves the most-built features intact.)
10. `P-02` error boundaries/loading states — weave in throughout, don't leave to the end.

## 12. Definition of Done for your whole workstream

- [ ] Request Explorer lists 100+ requests without jank (virtual scroll verified)
- [ ] Filters compose with AND logic; color coding matches §6 exactly
- [ ] New requests appear via WebSocket within 1s, with a visible live-update cue
- [ ] Waterfall renders all spans with correct proportional timing, correct depth indentation, consistent service colors, working hover tooltips and click-to-expand
- [ ] Overview/Logs/DB/External tabs all render correctly for a real captured trace
- [ ] No console errors, no blank screens, no broken layouts under normal use
- [ ] Every data-fetching component has a loading skeleton, an empty state, and an error state with retry
- [ ] UI matches the dark theme and typography spec consistently across every screen (no ad-hoc colors)

## 13. Sync points

- **Before `F-02`:** confirm with Dev 2 whether their endpoints are ready or you should build fully mock-first for now.
- **Before `F-06`:** confirm the WebSocket `new_request` payload matches the REST shape exactly with Dev 2.
- **Before `D-13` (Dev 2's task):** tell Dev 2 your build output directory.
- **Ongoing:** if any screen needs data not present in Dev 2's documented API shapes, raise it with Dev 2/Dev 5 rather than inventing a workaround — the contract exists so nobody has to guess.
- **Before feature freeze:** sync with Dev 5 on the UI polish pass (`P-06`, jointly owned) and on which Tier-3 features (Topology/Replay/Compare) are realistically finishable.
