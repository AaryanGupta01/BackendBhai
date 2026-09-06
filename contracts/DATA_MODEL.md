# Backend DevTools — Data Model Contract

> **Owner:** Workstream 2 (Core Platform) · Workstream 5 (Integration)
> **Database:** PostgreSQL
> **Databases:** `devtools` (trace storage), `ecommerce` (simulated backend)

---

## Table of Contents

1. [DevTools Database Schema](#1-devtools-database-schema)
2. [Ecommerce Database Schema](#2-ecommerce-database-schema)
3. [Relationships](#3-relationships)
4. [Indexes](#4-indexes)
5. [Identifiers](#5-identifiers)

---

## 1. DevTools Database Schema

### `traces` table

Stores one row per trace (one row per end-to-end request).

```sql
CREATE TABLE traces (
    trace_id        VARCHAR(32) PRIMARY KEY,       -- 32-char hex trace ID
    root_service    VARCHAR(100) NOT NULL,          -- Service that received initial request
    method          VARCHAR(10) NOT NULL,           -- HTTP method (GET, POST, etc.)
    path            VARCHAR(2000) NOT NULL,         -- URL path
    status_code     INTEGER NOT NULL,               -- HTTP response status code
    duration_ms     INTEGER NOT NULL,               -- Total trace duration in milliseconds
    timestamp       TIMESTAMPTZ NOT NULL,           -- Trace start time
    has_error       BOOLEAN NOT NULL DEFAULT FALSE, -- Whether any span has error
    request_body    JSONB,                          -- Request body (root span)
    response_body   JSONB,                          -- Response body (root span)
    request_headers  JSONB,                         -- Request headers (redacted)
    response_headers JSONB,                         -- Response headers (redacted)
    services        TEXT[] NOT NULL DEFAULT '{}',    -- Array of unique service names
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `spans` table

Stores one row per span within a trace.

```sql
CREATE TABLE spans (
    span_id         VARCHAR(16) PRIMARY KEY,        -- 16-char hex span ID
    trace_id        VARCHAR(32) NOT NULL REFERENCES traces(trace_id),
    parent_span_id  VARCHAR(16) REFERENCES spans(span_id),  -- Self-referencing FK
    service         VARCHAR(100) NOT NULL,           -- Service name
    operation       VARCHAR(500) NOT NULL,           -- Span name/operation
    kind            VARCHAR(20) NOT NULL,            -- "server", "client", "internal"
    start_timestamp TIMESTAMPTZ NOT NULL,            -- Span start time
    duration_ms     INTEGER NOT NULL,                -- Span duration in milliseconds
    status          VARCHAR(10) NOT NULL DEFAULT 'OK',  -- "OK" or "ERROR"
    status_code     INTEGER,                         -- HTTP status code (for HTTP spans)
    attributes      JSONB DEFAULT '{}',              -- Span attributes (key-value pairs)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `span_events` table

Stores events within a span (e.g., exceptions).

```sql
CREATE TABLE span_events (
    id              SERIAL PRIMARY KEY,
    span_id         VARCHAR(16) NOT NULL REFERENCES spans(span_id),
    trace_id        VARCHAR(32) NOT NULL REFERENCES traces(trace_id),
    name            VARCHAR(200) NOT NULL,           -- Event name (e.g., "exception")
    timestamp       TIMESTAMPTZ NOT NULL,            -- Event timestamp
    attributes      JSONB DEFAULT '{}',              -- Event attributes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `log_events` table

Stores log events correlated to traces.

```sql
CREATE TABLE log_events (
    id              SERIAL PRIMARY KEY,
    trace_id        VARCHAR(32) NOT NULL REFERENCES traces(trace_id),
    span_id         VARCHAR(16),                     -- Optional span correlation
    service         VARCHAR(100) NOT NULL,           -- Service name
    level           VARCHAR(10) NOT NULL,            -- "debug", "info", "warn", "error"
    message         TEXT NOT NULL,                   -- Log message
    timestamp       TIMESTAMPTZ NOT NULL,            -- Log timestamp
    attributes      JSONB DEFAULT '{}',              -- Additional log attributes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `services` table

Stores unique services discovered from traces.

```sql
CREATE TABLE services (
    name            VARCHAR(100) PRIMARY KEY,        -- Service name
    first_seen      TIMESTAMPTZ NOT NULL,            -- First trace timestamp
    last_seen       TIMESTAMPTZ NOT NULL,            -- Most recent trace timestamp
    trace_count     INTEGER NOT NULL DEFAULT 0,      -- Number of traces involving this service
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `service_dependencies` table

Stores discovered service-to-service dependencies.

```sql
CREATE TABLE service_dependencies (
    id              SERIAL PRIMARY KEY,
    source_service  VARCHAR(100) NOT NULL,           -- Calling service
    target_service  VARCHAR(100) NOT NULL,           -- Called service
    protocol        VARCHAR(20) NOT NULL,            -- "HTTP", "pg", "redis"
    avg_latency_ms  REAL,                            -- Average latency
    call_count      INTEGER NOT NULL DEFAULT 0,      -- Number of observed calls
    UNIQUE(source_service, target_service, protocol)
);
```

### `replay_sessions` table (Tier 3)

Stores replay session data.

```sql
CREATE TABLE replay_sessions (
    replay_id           VARCHAR(100) PRIMARY KEY,    -- Unique replay ID
    original_trace_id   VARCHAR(32) NOT NULL REFERENCES traces(trace_id),
    replay_trace_id     VARCHAR(32) REFERENCES traces(trace_id),  -- May be NULL initially
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',   -- "pending", "in_progress", "completed", "failed"
    overrides           JSONB,                       -- Request overrides
    duration_ms         INTEGER,                     -- Replay duration
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);
```

---

## 2. Ecommerce Database Schema

### `users` table

```sql
CREATE TABLE users (
    id              VARCHAR(50) PRIMARY KEY,
    email           VARCHAR(200) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `products` table

```sql
CREATE TABLE products (
    id              VARCHAR(50) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    price           DECIMAL(10, 2) NOT NULL,
    stock           INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `orders` table

```sql
CREATE TABLE orders (
    id              VARCHAR(50) PRIMARY KEY,
    user_id         VARCHAR(50) NOT NULL REFERENCES users(id),
    items           JSONB NOT NULL,                  -- Array of {id, name, qty, price}
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- "pending", "paid", "failed", "cancelled"
    total           DECIMAL(10, 2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `payments` table

```sql
CREATE TABLE payments (
    id              VARCHAR(50) PRIMARY KEY,
    order_id        VARCHAR(50) NOT NULL REFERENCES orders(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- "pending", "completed", "failed"
    amount          DECIMAL(10, 2) NOT NULL,
    provider        VARCHAR(50) NOT NULL DEFAULT 'mock-payment',
    external_id     VARCHAR(100),                    -- External payment provider ID
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Relationships

```
traces.trace_id ←── spans.trace_id
traces.trace_id ←── span_events.trace_id
traces.trace_id ←── log_events.trace_id
traces.trace_id ←── replay_sessions.original_trace_id
traces.trace_id ←── replay_sessions.replay_trace_id

spans.span_id ←── span_events.span_id
spans.span_id ←── spans.parent_span_id (self-referencing)

ecommerce:
users.id ←── orders.user_id
orders.id ←── payments.order_id
```

---

## 4. Indexes

### Performance Indexes

```sql
-- Traces
CREATE INDEX idx_traces_timestamp ON traces(timestamp DESC);
CREATE INDEX idx_traces_method ON traces(method);
CREATE INDEX idx_traces_status_code ON traces(status_code);
CREATE INDEX idx_traces_root_service ON traces(root_service);
CREATE INDEX idx_traces_duration ON traces(duration_ms);
CREATE INDEX idx_traces_has_error ON traces(has_error);
CREATE INDEX idx_traces_services ON traces USING GIN(services);

-- Spans
CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_parent_span_id ON spans(parent_span_id);
CREATE INDEX idx_spans_service ON spans(service);
CREATE INDEX idx_spans_kind ON spans(kind);
CREATE INDEX idx_spans_status ON spans(status);
CREATE INDEX idx_spans_trace_service ON spans(trace_id, service);

-- Span Events
CREATE INDEX idx_span_events_trace_id ON span_events(trace_id);
CREATE INDEX idx_span_events_span_id ON span_events(span_id);

-- Log Events
CREATE INDEX idx_log_events_trace_id ON log_events(trace_id);
CREATE INDEX idx_log_events_service ON log_events(service);
CREATE INDEX idx_log_events_level ON log_events(level);
CREATE INDEX idx_log_events_trace_level ON log_events(trace_id, level);

-- Service Dependencies
CREATE INDEX idx_service_deps_source ON service_dependencies(source_service);
CREATE INDEX idx_service_deps_target ON service_dependencies(target_service);
```

---

## 5. Identifiers

### Trace ID

- **Format:** 32-character hexadecimal string (128 bits)
- **Generated by:** OpenTelemetry SDK
- **Example:** `5b8efff798038103d269b633813fc60c`
- **Storage:** `VARCHAR(32)` in PostgreSQL

### Span ID

- **Format:** 16-character hexadecimal string (64 bits)
- **Generated by:** OpenTelemetry SDK
- **Example:** `eee19b7ec3c1b174`
- **Storage:** `VARCHAR(16)` in PostgreSQL

### Service Name

- **Format:** Lowercase, hyphen-separated string
- **Examples:** `api-gateway`, `auth-service`, `order-service`, `payment-service`
- **Storage:** `VARCHAR(100)` in PostgreSQL
- **Must match** the `service.name` OTel Resource attribute

### Replay ID

- **Format:** `replay-` prefix + random alphanumeric string
- **Example:** `replay-xyz789`
- **Storage:** `VARCHAR(100)` in PostgreSQL

### Ecommerce Entity IDs

- **Format:** Descriptive prefix + short string
- **Examples:** `user-42`, `item-1`, `ord-abc123`, `pay-xyz789`
- **Storage:** `VARCHAR(50)` in PostgreSQL
