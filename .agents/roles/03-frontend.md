# Role 03 — Frontend / UI

> **Workstream:** 3
> **Alias:** DEV-3 (Frontend)
> **Primary Areas:** `apps/devtools-ui/`

---

## Mission

Build the React-based frontend UI that presents backend request data as a beautiful, interactive developer tool — following the Chrome DevTools Network Tab aesthetic with a dark-only, desktop-first design.

---

## Scope

### In Scope

- React + Vite + TypeScript application
- App shell (TopBar, main content area, StatusBar)
- Request Explorer:
  - Virtual-scrolled request list (method, path, status, duration, service dots, timestamp)
  - Filters (method, status, service, text search, duration)
  - WebSocket live updates (new requests prepend to list)
- Request Detail panel with tabbed layout:
  - **Waterfall tab:** Custom SVG waterfall with time ruler, service-colored bars, duration labels, hover tooltips, click-to-expand
  - **Overview tab:** Request/response headers and body with JSON syntax highlighting
  - **Logs tab:** Trace-scoped logs with level badges, filterable by level and service
  - **DB Queries tab:** Database spans with SQL syntax highlighting
  - **External APIs tab:** HTTP client spans with method, URL, status, duration
- Command Palette (Cmd+K) with fuzzy search
- Loading skeletons, empty states, error states with retry
- Consistent design system (MethodBadge, StatusCode, DurationBadge, ServiceDot, CodeBlock, KeyValueTable)

### Out of Scope (Tier 3 — only if time permits)

- Topology tab (React Flow graph)
- Replay tab
- Compare tab

### Explicitly Not Built

- Dark mode toggle (dark-only)
- Incident Timeline
- Latency budget breakdown
- Export/share trace
- Responsive mobile layout
- Production architecture views

---

## Responsibilities

1. Create React app scaffold with Vite, Tailwind, shadcn/ui, React Router, React Query, Zustand
2. Implement API client with typed fetch functions and React Query hooks
3. Implement WebSocket hook for live updates
4. Implement Request Explorer (list, filters, layout)
5. Implement Request Detail shell with tabs
6. Implement Waterfall chart (custom SVG)
7. Implement Overview tab
8. Implement Logs tab
9. Implement DB Queries tab
10. Implement External APIs tab
11. Implement Command Palette
12. Implement error boundaries, loading states, empty states
13. Follow the UI/UX spec in `planning/04-ui-ux-implementation-spec.md`
14. Ensure dark-only design with consistent visual polish

---

## Allowed Directories

- `apps/devtools-ui/` (primary)
- `contracts/API.md` (consumption — to build API client)
- `contracts/EVENTS.md` (consumption — to build WebSocket client)

---

## Important Dependencies

| Dependency | Nature | Workstream |
|------------|--------|------------|
| DevTools server REST APIs | API data source | Workstream 2 |
| DevTools server WebSocket | Live update source | Workstream 2 |
| Shared types package | TypeScript interfaces | Workstream 5 |
| UI/UX spec | Design reference | `planning/04-ui-ux-implementation-spec.md` |

---

## Inputs

- Planning documents (especially `04-ui-ux-implementation-spec.md`, `03-development-backlog.md` Epics E3-E5)
- `contracts/API.md` — API endpoint definitions
- `contracts/EVENTS.md` — WebSocket event definitions
- UI/UX design tokens (colors, typography, spacing)

---

## Outputs

- `apps/devtools-ui/` — complete React application
- Working dev server on port 5173 (or port 4001 when served by backend)
- All UI components rendering correctly
- WebSocket live updates working
- Command Palette functional

---

## Contracts They Own

- None (front-end consumes contracts, does not define them)

---

## Contracts They Consume

- `contracts/API.md` — all REST API endpoints and response shapes
- `contracts/EVENTS.md` — WebSocket event types and payloads
- `contracts/DATA_MODEL.md` — data structures for rendering

---

## Tasks / Phases

### Phase 0 — Bootstrap
- **F-01:** React app scaffold (Vite + React + TypeScript + Tailwind + shadcn/ui + React Router + React Query + Zustand)
- **F-02:** API client module with typed fetch functions + React Query hooks + WebSocket hook

### Phase 1 — Request Explorer
- **F-03:** Request Explorer list with virtual scrolling
- **F-04:** Request Explorer filters (method, status, service, search, duration)
- **F-05:** Request Explorer layout (Chrome DevTools aesthetic)
- **F-06:** WebSocket live updates

### Phase 2 — Trace Waterfall
- **W-01:** Request Detail shell with tabbed layout
- **W-02:** Waterfall chart (custom SVG, time ruler, service-colored bars)
- **W-03:** Waterfall row component (span rendering)
- **W-04:** Overview tab (request/response headers and body)

### Phase 3 — Context Panel
- **C-01:** Logs tab (trace-scoped, filterable, level badges)
- **C-02:** DB Queries tab (SQL syntax highlighting)
- **C-03:** External APIs tab (HTTP client spans)

### Phase 4 — Polish
- **P-01:** Command Palette (Cmd+K)
- **P-02:** Error boundaries + loading states + empty states
- **P-06:** UI polish pass (consistent spacing, typography, color scheme)

### Phase 5 — Tier 3 (if time permits)
- **T-01:** Topology tab (React Flow)
- **R-01:** Replay tab UI
- **CP-01:** Compare tab UI

---

## Design System Reference

### Colors (from UI/UX spec)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0a0a0f` | Main background |
| Surface | `#12121a` | Cards, panels |
| Surface hover | `#1a1a25` | Hover states |
| Border | `#2a2a35` | Dividers |
| Text primary | `#e8e8f0` | Headings, body |
| Text secondary | `#8888a0` | Labels, timestamps |
| Method GET | `#4ade80` | GET badge |
| Method POST | `#60a5fa` | POST badge |
| Method PUT | `#fbbf24` | PUT badge |
| Method DELETE | `#f87171` | DELETE badge |
| Status 2xx | `#4ade80` | Success |
| Status 3xx | `#fbbf24` | Redirect |
| Status 4xx | `#fb923c` | Client error |
| Status 5xx | `#f87171` | Server error |
| Service colors | Blue, Green, Orange, Red, Purple, Cyan, Yellow | Per-service bars in waterfall |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Body | Inter | 13px | 400 |
| Heading | Inter | 16px | 600 |
| Code | JetBrains Mono | 12px | 400 |
| Badge | Inter | 11px | 500 |

---

## Things Explicitly Out of Scope

- Backend server implementation (Workstream 2)
- OTel instrumentation (Workstream 1)
- Demo service implementation (Workstream 4)
- Database schema (Workstream 5)
- Integration testing (Workstream 5)
- Mobile responsive layout

---

## Testing Expectations

- Component tests for key UI components (request list, waterfall row, filters)
- Snapshot tests for visual consistency
- Integration test: render Request Explorer with mock data
- Integration test: render Waterfall with mock trace data
- Integration test: WebSocket hook receives and processes events
- Integration test: Command Palette search and navigation
- Manual testing: loading states, empty states, error states
- Accessibility: keyboard navigation, ARIA labels

---

## Handoff Requirements

Before ending work, update `.ai/HANDOFF.md` with:
- Which UI components are implemented and styled
- Any components that need design adjustments
- API client status (which endpoints are integrated)
- WebSocket integration status
- Any deviations from the UI/UX spec
- Outstanding issues or blockers

---

## Failure-Isolation Requirements

- UI must render with mock/seeded data if backend is unavailable
- API errors must show retry button, not blank screen
- WebSocket disconnection must show status indicator, not crash the app
- Empty states must be informative and helpful
- Loading states must be present for all async data
- Each tab must handle missing data gracefully (show "No data available")
