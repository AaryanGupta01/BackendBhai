# BackendBhai — WebSocket Event Contract

> **Owner:** Workstream 2 (Core Platform) · Workstream 5 (Integration)
> **WebSocket URL:** `ws://localhost:4001/ws`
> **Version:** v1

---

## Table of Contents

1. [Connection](#1-connection)
2. [Event Format](#2-event-format)
3. [Server → Client Events](#3-server--client-events)
4. [Client → Server Events](#4-client--server-events)
5. [REST / WebSocket Shape Compatibility](#5-rest--websocket-shape-compatibility)
6. [Error Handling](#6-error-handling)
7. [Reconnection](#7-reconnection)

---

## 1. Connection

```
WebSocket URL: ws://localhost:4001/ws
Protocol: ws (no authentication required)
```

**On Connection:**
- Server sends a `connected` event with server metadata
- Client may subscribe to trace updates

**Connection Lifecycle:**
1. Client connects to `ws://localhost:4001/ws`
2. Server sends `connected` event
3. Client receives events passively (new requests)
4. Client may send `subscribe_trace` to receive trace updates
5. Client may send `unsubscribe_trace` to stop receiving trace updates
6. On disconnect, client should attempt reconnection with exponential backoff

---

## 2. Event Format

All events follow a consistent JSON format:

```json
{
  "type": "event_name",
  "data": { ... },
  "timestamp": "2026-09-06T12:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Event type name (see below) |
| `data` | object | Event payload |
| `timestamp` | string | ISO 8601 timestamp of event creation |

---

## 3. Server → Client Events

### `connected`

Sent when the WebSocket connection is established.

```json
{
  "type": "connected",
  "data": {
    "serverVersion": "1.0.0",
    "activeConnections": 1
  },
  "timestamp": "2026-09-06T12:00:00.000Z"
}
```

---

### `new_request`

Broadcast when a new trace is stored in the DevTools server. This event is sent to ALL connected clients.

**Payload shape MUST match the request list item shape from `GET /api/v1/requests`** (see `contracts/API.md`).

```json
{
  "type": "new_request",
  "data": {
    "traceId": "5b8efff798038103d269b633813fc60c",
    "method": "POST",
    "path": "/api/orders",
    "statusCode": 201,
    "durationMs": 847,
    "timestamp": "2026-09-06T12:00:00.000Z",
    "services": ["api-gateway", "auth-service", "order-service", "payment-service"],
    "rootService": "api-gateway",
    "hasError": false
  },
  "timestamp": "2026-09-06T12:00:00.000Z"
}
```

**Critical:** The `data` object MUST have the exact same shape as a single item in the `GET /api/v1/requests` response `data` array. This ensures the frontend can insert it directly into the request list without transformation.

---

### `trace_update`

Sent to clients who have subscribed to a specific trace. Provides real-time span updates as they arrive.

```json
{
  "type": "trace_update",
  "data": {
    "traceId": "5b8efff798038103d269b633813fc60c",
    "spans": [
      {
        "spanId": "new-span-123",
        "parentSpanId": "parent-span-456",
        "service": "order-service",
        "operation": "INSERT INTO orders",
        "durationMs": 12,
        "status": "OK"
      }
    ]
  },
  "timestamp": "2026-09-06T12:00:00.100Z"
}
```

---

### `replay_progress` (Tier 3)

Sent during replay execution to show step-by-step progress.

```json
{
  "type": "replay_progress",
  "data": {
    "replayId": "replay-xyz789",
    "step": "calling_order_service",
    "status": "in_progress",
    "progress": 0.4
  },
  "timestamp": "2026-09-06T12:05:00.100Z"
}
```

| Step | Description |
|------|-------------|
| `extracting_snapshot` | Extracting request data from original trace |
| `calling_api_gateway` | Sending replay request to API Gateway |
| `calling_auth_service` | Auth service processing |
| `calling_order_service` | Order service processing |
| `calling_payment_service` | Payment service processing |
| `waiting_for_telemetry` | Waiting for OTel to export new trace |
| `completed` | Replay finished |

---

### `replay_complete` (Tier 3)

Sent when a replay finishes.

```json
{
  "type": "replay_complete",
  "data": {
    "replayId": "replay-xyz789",
    "originalTraceId": "5b8efff798038103d269b633813fc60c",
    "replayTraceId": "new-trace-abc123",
    "status": "completed",
    "durationMs": 923
  },
  "timestamp": "2026-09-06T12:05:01.000Z"
}
```

---

## 4. Client → Server Events

### `subscribe_trace`

Subscribe to real-time updates for a specific trace.

```json
{
  "type": "subscribe_trace",
  "data": {
    "traceId": "5b8efff798038103d269b633813fc60c"
  }
}
```

**Server Response:** Acknowledgment event or `trace_update` events.

---

### `unsubscribe_trace`

Unsubscribe from trace updates.

```json
{
  "type": "unsubscribe_trace",
  "data": {
    "traceId": "5b8efff798038103d269b633813fc60c"
  }
}
```

---

## 5. REST / WebSocket Shape Compatibility

**This is a mandatory architectural constraint.**

The `new_request` WebSocket event payload MUST have the exact same shape as a single item in the `GET /api/v1/requests` response `data` array.

**Why:** The frontend inserts WebSocket events directly into the React Query cache. If the shapes differ, the UI will break.

**Shared type definition (TypeScript):**
```typescript
interface RequestSummary {
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string; // ISO 8601
  services: string[];
  rootService: string;
  hasError: boolean;
}
```

Both the REST API and WebSocket `new_request` event MUST return objects conforming to this interface.

---

## 6. Error Handling

### WebSocket Errors

If the server encounters an error while processing a client event, it sends an error event:

```json
{
  "type": "error",
  "data": {
    "code": "INVALID_EVENT",
    "message": "Unknown event type: unknown_event"
  },
  "timestamp": "2026-09-06T12:00:00.000Z"
}
```

**Error Codes:**

| Code | Description |
|------|-------------|
| `INVALID_EVENT` | Unknown or malformed event type |
| `INVALID_PAYLOAD` | Event data does not match expected schema |
| `TRACE_NOT_FOUND` | Subscribed trace ID does not exist |

### Connection Errors

- If the server is unavailable, the client should show a "Disconnected" indicator
- The client should NOT crash or become unusable on WebSocket disconnection
- The client should fall back to REST API polling if WebSocket is unavailable

---

## 7. Reconnection

The client should implement exponential backoff reconnection:

1. On disconnect, wait 1 second
2. Attempt reconnection
3. If failed, wait 2 seconds
4. If failed, wait 4 seconds
5. Maximum wait: 30 seconds
6. On successful reconnection, re-subscribe to any active trace subscriptions

**Maximum reconnection attempts:** Unlimited (keep trying)

**Status indicator:**
- Green dot = Connected
- Red dot = Disconnected (retrying)
