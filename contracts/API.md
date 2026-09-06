# BackendBhai — REST API Contract

> **Owner:** Workstream 2 (Core Platform) · Workstream 5 (Integration)
> **Base URL:** `http://localhost:4001`
> **Version:** v1
> **Content-Type:** `application/json`

---

## Table of Contents

1. [Base URL and Versioning](#1-base-url-and-versioning)
2. [Health Endpoint](#2-health-endpoint)
3. [Request Explorer API](#3-request-explorer-api)
4. [Request Detail API](#4-request-detail-api)
5. [Waterfall API](#5-waterfall-api)
6. [Logs API](#6-logs-api)
7. [Topology API](#7-topology-api)
8. [Replay API](#8-replay-api)
9. [Compare API](#9-compare-api)
10. [Telemetry Ingestion](#10-telemetry-ingestion)
11. [Error Format](#11-error-format)
12. [Pagination](#12-pagination)

---

## 1. Base URL and Versioning

All API endpoints are prefixed with `/api/v1/`.

```
Base URL: http://localhost:4001
API Prefix: /api/v1
```

---

## 2. Health Endpoint

### `GET /health`

Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-06T12:00:00.000Z",
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK` — Server is healthy
- `503 Service Unavailable` — Server is unhealthy (e.g., database connection lost)

---

## 3. Request Explorer API

### `GET /api/v1/requests`

Returns a paginated, filterable list of captured requests (traces).

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `50` | Items per page (max 100) |
| `method` | string | — | Filter by HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH` |
| `status` | string | — | Filter by status class: `2xx`, `3xx`, `4xx`, `5xx` |
| `service` | string | — | Filter by service name |
| `search` | string | — | Search by path (case-insensitive substring match) |
| `minDuration` | integer | — | Minimum duration in milliseconds |
| `maxDuration` | integer | — | Maximum duration in milliseconds |
| `sort` | string | `timestamp` | Sort field: `timestamp`, `duration`, `status` |
| `order` | string | `desc` | Sort order: `asc`, `desc` |

**Response:**
```json
{
  "data": [
    {
      "traceId": "5b8efff798038103d269b633813fc60c",
      "method": "POST",
      "path": "/api/orders",
      "statusCode": 201,
      "durationMs": 847,
      "timestamp": "2026-09-06T12:00:00.000Z",
      "services": ["api-gateway", "auth-service", "order-service", "payment-service"],
      "rootService": "api-gateway",
      "hasError": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Status Codes:**
- `200 OK` — Success
- `400 Bad Request` — Invalid query parameters
- `500 Internal Server Error` — Server error

---

## 4. Request Detail API

### `GET /api/v1/requests/:traceId`

Returns the full trace detail including all spans, logs, and categorized operations.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `traceId` | string | The trace ID (32-character hex string) |

**Response:**
```json
{
  "traceId": "5b8efff798038103d269b633813fc60c",
  "method": "POST",
  "path": "/api/orders",
  "statusCode": 201,
  "durationMs": 847,
  "timestamp": "2026-09-06T12:00:00.000Z",
  "rootService": "api-gateway",
  "requestBody": {
    "userId": "user-42",
    "items": [{ "id": "item-1", "qty": 1 }]
  },
  "responseBody": {
    "orderId": "ord-abc123",
    "status": "pending"
  },
  "requestHeaders": {
    "content-type": "application/json",
    "authorization": "**REDACTED**"
  },
  "responseHeaders": {
    "content-type": "application/json"
  },
  "spans": [
    {
      "spanId": "eee19b7ec3c1b174",
      "parentSpanId": null,
      "service": "api-gateway",
      "operation": "POST /api/orders",
      "kind": "server",
      "startTimestamp": "2026-09-06T12:00:00.000Z",
      "durationMs": 847,
      "status": "OK",
      "statusCode": 201,
      "attributes": {}
    }
  ],
  "logs": [
    {
      "timestamp": "2026-09-06T12:00:00.100Z",
      "level": "info",
      "service": "order-service",
      "message": "Order created for user-42",
      "traceId": "5b8efff798038103d269b633813fc60c",
      "spanId": "abc123",
      "attributes": { "orderId": "ord-abc123" }
    }
  ],
  "dbQueries": [
    {
      "spanId": "db1span",
      "service": "order-service",
      "operation": "INSERT",
      "table": "orders",
      "statement": "INSERT INTO orders (user_id, items, status) VALUES ($1, $2, $3) RETURNING *",
      "durationMs": 12,
      "status": "OK"
    }
  ],
  "externalCalls": [
    {
      "spanId": "ext1span",
      "service": "payment-service",
      "method": "POST",
      "url": "http://mock-payment-api:4000/charges",
      "statusCode": 200,
      "durationMs": 156,
      "status": "OK"
    }
  ]
}
```

**Status Codes:**
- `200 OK` — Success
- `404 Not Found` — Trace not found
- `500 Internal Server Error` — Server error

---

## 5. Waterfall API

### `GET /api/v1/traces/:traceId/waterfall`

Returns spans formatted for waterfall visualization with computed offsets and depths.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `traceId` | string | The trace ID |

**Response:**
```json
{
  "traceId": "5b8efff798038103d269b633813fc60c",
  "totalDurationMs": 847,
  "startTimestamp": "2026-09-06T12:00:00.000Z",
  "spans": [
    {
      "spanId": "eee19b7ec3c1b174",
      "parentSpanId": null,
      "service": "api-gateway",
      "operation": "POST /api/orders",
      "kind": "server",
      "startOffsetMs": 0,
      "durationMs": 847,
      "percentageOfTotal": 100.0,
      "depth": 0,
      "order": 0,
      "status": "OK",
      "statusCode": 201,
      "attributes": {}
    },
    {
      "spanId": "abc123def456",
      "parentSpanId": "eee19b7ec3c1b174",
      "service": "auth-service",
      "operation": "POST /auth/verify",
      "kind": "server",
      "startOffsetMs": 5,
      "durationMs": 102,
      "percentageOfTotal": 12.0,
      "depth": 1,
      "order": 1,
      "status": "OK",
      "statusCode": 200,
      "attributes": {}
    }
  ]
}
```

**Field Definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `startOffsetMs` | integer | Milliseconds from trace start |
| `durationMs` | integer | Span duration in milliseconds |
| `percentageOfTotal` | float | `durationMs / totalDurationMs * 100` |
| `depth` | integer | Nesting depth (0 = root span) |
| `order` | integer | Display order (top to bottom) |

**Status Codes:**
- `200 OK` — Success
- `404 Not Found` — Trace not found
- `500 Internal Server Error` — Server error

---

## 6. Logs API

### `GET /api/v1/traces/:traceId/logs`

Returns trace-scoped log events with optional filtering.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `traceId` | string | The trace ID |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | string | Filter by level: `debug`, `info`, `warn`, `error` |
| `service` | string | Filter by service name |

**Response:**
```json
{
  "traceId": "5b8efff798038103d269b633813fc60c",
  "logs": [
    {
      "timestamp": "2026-09-06T12:00:00.100Z",
      "level": "info",
      "service": "order-service",
      "message": "Order created for user-42",
      "spanId": "abc123",
      "attributes": { "orderId": "ord-abc123" }
    },
    {
      "timestamp": "2026-09-06T12:00:00.200Z",
      "level": "error",
      "service": "payment-service",
      "message": "Payment failed: 503 Service Unavailable",
      "spanId": "def456",
      "attributes": { "error": true, "http.status_code": 503 }
    }
  ]
}
```

**Status Codes:**
- `200 OK` — Success
- `404 Not Found` — Trace not found
- `500 Internal Server Error` — Server error

---

## 7. Topology API

### `GET /api/v1/topology`

Returns global service topology derived from stored traces.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `traceId` | string | Optional — filter to per-request topology |

**Response:**
```json
{
  "nodes": [
    {
      "id": "api-gateway",
      "label": "API Gateway",
      "type": "service"
    },
    {
      "id": "auth-service",
      "label": "Auth Service",
      "type": "service"
    },
    {
      "id": "postgresql",
      "label": "PostgreSQL",
      "type": "database"
    },
    {
      "id": "redis",
      "label": "Redis",
      "type": "cache"
    },
    {
      "id": "mock-payment-api",
      "label": "Mock Payment API",
      "type": "external"
    }
  ],
  "edges": [
    {
      "source": "api-gateway",
      "target": "auth-service",
      "protocol": "HTTP",
      "avgLatencyMs": 102
    },
    {
      "source": "order-service",
      "target": "postgresql",
      "protocol": "pg",
      "avgLatencyMs": 15
    }
  ]
}
```

**Status Codes:**
- `200 OK` — Success
- `500 Internal Server Error` — Server error

---

## 8. Replay API (Tier 3)

### `POST /api/v1/replay`

Replays a captured request against the simulated backend.

**Request Body:**
```json
{
  "traceId": "5b8efff798038103d269b633813fc60c",
  "overrides": {
    "path": "/api/orders",
    "headers": { "authorization": "Bearer token-user-42" },
    "body": { "userId": "user-42", "items": [{ "id": "item-1", "qty": 1 }] }
  }
}
```

**Response:**
```json
{
  "replayId": "replay-xyz789",
  "originalTraceId": "5b8efff798038103d269b633813fc60c",
  "status": "completed",
  "replayTraceId": "new-trace-abc123",
  "durationMs": 923
}
```

### `GET /api/v1/replay/:replayId`

Returns replay status.

**Response:**
```json
{
  "replayId": "replay-xyz789",
  "status": "completed",
  "originalTraceId": "5b8efff798038103d269b633813fc60c",
  "replayTraceId": "new-trace-abc123",
  "durationMs": 923,
  "createdAt": "2026-09-06T12:05:00.000Z"
}
```

**Status Codes:**
- `200 OK` — Success
- `202 Accepted` — Replay in progress
- `404 Not Found` — Original trace or replay not found
- `500 Internal Server Error` — Replay failed

---

## 9. Compare API (Tier 3)

### `POST /api/v1/compare`

Compares two traces side-by-side.

**Request Body:**
```json
{
  "traceIdA": "5b8efff798038103d269b633813fc60c",
  "traceIdB": "new-trace-abc123"
}
```

**Response:**
```json
{
  "traceIdA": "5b8efff798038103d269b633813fc60c",
  "traceIdB": "new-trace-abc123",
  "summary": {
    "durationA": 847,
    "durationB": 923,
    "durationDelta": 76,
    "statusA": 201,
    "statusB": 201,
    "statusMatch": true,
    "servicesA": ["api-gateway", "auth-service", "order-service", "payment-service"],
    "servicesB": ["api-gateway", "auth-service", "order-service", "payment-service"],
    "servicesMatch": true
  },
  "spanDiffs": [
    {
      "operation": "POST /auth/verify",
      "service": "auth-service",
      "durationA": 102,
      "durationB": 105,
      "durationDelta": 3,
      "statusA": "OK",
      "statusB": "OK",
      "statusMatch": true
    }
  ]
}
```

**Status Codes:**
- `200 OK` — Success
- `404 Not Found` — One or both traces not found
- `400 Bad Request` — Invalid trace IDs
- `500 Internal Server Error` — Server error

---

## 10. Telemetry Ingestion

### `POST /api/v1/telemetry/traces` (OTLP HTTP)

Receives OTLP trace data from the OTel Collector. This endpoint accepts the OTLP JSON format.

**Content-Type:** `application/json`

**Request Body:** OTLP `ExportTraceServiceRequest` JSON format

**Response:**
```json
{
  "partialSuccess": null
}
```

**Status Codes:**
- `200 OK` — Traces accepted
- `400 Bad Request` — Malformed OTLP data
- `500 Internal Server Error` — Storage failure

---

## 11. Error Format

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Trace with ID 5b8efff798038103d269b633813fc60c not found",
    "details": {}
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Downstream service unavailable (e.g., database) |

---

## 12. Pagination

All list endpoints use cursor-based or offset-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Default page size:** 50
**Maximum page size:** 100
