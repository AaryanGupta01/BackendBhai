# Backend DevTools — Versioning Policy

> **Owner:** Workstream 5 (Integration)
> **Applies to:** All shared contracts

---

## Contract Version

All contracts in `contracts/` are versioned together as a single contract set.

**Current version:** `v1`

Version is tracked in each contract file header:
```markdown
> **Version:** v1
```

---

## Backward Compatibility

Changes to contracts are categorized as:

### Non-Breaking (Minor)

These changes do NOT require coordination between workstreams:

- Adding a new optional field to a response
- Adding a new API endpoint
- Adding a new WebSocket event type
- Adding a new query parameter (with default)
- Adding a new span attribute
- Adding a new log attribute
- Adding a new database column (nullable or with default)

### Breaking (Major)

These changes REQUIRE coordination between workstreams:

- Removing or renaming a field
- Changing a field type
- Making an optional field required
- Changing an API endpoint URL
- Changing a WebSocket event payload shape
- Changing the trace/span/log model
- Changing the database schema (non-additive)
- Changing error response format

---

## Breaking Change Process

When a breaking change is needed:

1. **Document** the change in `.ai/DECISIONS.md` with rationale
2. **Communicate** to all affected workstreams via `.ai/HANDOFF.md`
3. **Update** the contract in `contracts/`
4. **Update** the version (e.g., `v1` → `v2`)
5. **Update** shared types in `packages/shared-types/`
6. **Coordinate** implementation across affected workstreams
7. **Verify** all integrations still work

---

## Implementation Version

Each application tracks its own version:

| Application | Version Location | Current Version |
|-------------|-----------------|-----------------|
| DevTools Core | `apps/devtools-core/package.json` | `0.1.0` |
| DevTools UI | `apps/devtools-ui/package.json` | `0.1.0` |
| Simulated Backend | `apps/demo-store/*/package.json` | `0.1.0` |
| Telemetry | `packages/instrumentation/package.json` | `0.1.0` |

Application versions follow [Semantic Versioning](https://semver.org/):
- **MAJOR:** Breaking changes to user-facing behavior
- **MINOR:** New features, backward-compatible
- **PATCH:** Bug fixes, backward-compatible

---

## Shared Types Version

The shared types package (`packages/shared-types/`) must be updated whenever contracts change. This package is the **single source of truth** for TypeScript interfaces used across workstreams.

**Rule:** If it's in `contracts/`, it must have a corresponding type in `packages/shared-types/`.

---

## For This Hackathon

During the hackathon, versioning is lightweight:

- Contracts may be updated frequently as implementation progresses
- Breaking changes should be documented but don't require formal version bumps
- The priority is **working integration**, not formal versioning
- After the hackathon, if the project continues, formalize the versioning process

---

## Documentation Requirements

Every contract change must be documented:

1. **In the contract file** — update the "Last Updated" date
2. **In `.ai/DECISIONS.md`** — explain what changed and why
3. **In shared types** — update TypeScript interfaces
4. **In `.ai/HANDOFF.md`** — notify other workstreams
