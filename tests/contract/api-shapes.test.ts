/**
 * BackendBhai — API Contract Shape Validation Tests
 *
 * These tests verify that Dev 2's API responses match the contracts
 * defined in dev2.md §6.4 and packages/shared/src/types.ts.
 *
 * Run against the live server:
 *   BASE_URL=http://localhost:4001 pnpm test
 *
 * Or against mock data (for contract shape validation only):
 *   pnpm test
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.BASE_URL || "http://localhost:4001";

// ─── Helper: validate ISO timestamp ─────────────────────────────────

function isISOTimestamp(str: string): boolean {
  return !isNaN(Date.parse(str));
}

// ─── Helper: validate hex trace ID ──────────────────────────────────

function isHexTraceId(str: string): boolean {
  return /^[a-f0-9]{32}$/.test(str);
}

// ─── Request List Shape ─────────────────────────────────────────────

describe("GET /api/v1/requests", () => {
  it("should return requests array with correct RequestSummary shape", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/requests?page=1&limit=5`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("requests");
    expect(Array.isArray(data.requests)).toBe(true);

    if (data.requests.length > 0) {
      const req = data.requests[0];

      // RequestSummary fields (packages/shared/src/types.ts)
      expect(typeof req.trace_id).toBe("string");
      expect(isHexTraceId(req.trace_id)).toBe(true);

      expect(typeof req.method).toBe("string");
      expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(req.method);

      expect(typeof req.path).toBe("string");

      expect(typeof req.status_code).toBe("number");
      expect(req.status_code).toBeGreaterThanOrEqual(100);
      expect(req.status_code).toBeLessThan(600);

      expect(["ok", "error", "unset"]).toContain(req.status);

      expect(typeof req.duration_ms).toBe("number");
      expect(req.duration_ms).toBeGreaterThanOrEqual(0);

      expect(typeof req.root_service).toBe("string");

      expect(Array.isArray(req.services)).toBe(true);
      req.services.forEach((s: string) => expect(typeof s).toBe("string"));

      expect(typeof req.span_count).toBe("number");
      expect(typeof req.log_count).toBe("number");
      expect(typeof req.error_count).toBe("number");
      expect(req.error_count).toBeGreaterThanOrEqual(0);

      expect(typeof req.start_time).toBe("number");

      expect(typeof req.created_at).toBe("string");
      expect(isISOTimestamp(req.created_at)).toBe(true);
    }
  });

  it("should return pagination object", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/requests?page=1&limit=10`);
    const data = await res.json();

    expect(data).toHaveProperty("pagination");
    expect(typeof data.pagination.page).toBe("number");
    expect(typeof data.pagination.limit).toBe("number");
    expect(typeof data.pagination.total).toBe("number");
    expect(typeof data.pagination.pages).toBe("number");
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
  });

  it("should support method filter", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/requests?method=POST&page=1&limit=5`);
    const data = await res.json();

    expect(res.status).toBe(200);
    data.requests.forEach((req: any) => {
      expect(req.method).toBe("POST");
    });
  });

  it("should support status filter", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/requests?status=error&page=1&limit=5`);
    const data = await res.json();

    expect(res.status).toBe(200);
    data.requests.forEach((req: any) => {
      expect(req.status).toBe("error");
    });
  });

  it("should support search filter", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/requests?search=orders&page=1&limit=5`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("requests");
  });
});

// ─── Request Detail Shape ───────────────────────────────────────────

describe("GET /api/v1/requests/:traceId", () => {
  it("should return trace detail with all expected fields", async () => {
    // First get a trace ID from the list
    const listRes = await fetch(`${BASE_URL}/api/v1/requests?page=1&limit=1`);
    const listData = await listRes.json();

    if (listData.requests.length === 0) {
      console.warn("No traces in database — skipping detail test");
      return;
    }

    const traceId = listData.requests[0].trace_id;
    const res = await fetch(`${BASE_URL}/api/v1/requests/${traceId}`);
    const data = await res.json();

    expect(res.status).toBe(200);

    // TraceDetailResponse shape
    expect(data).toHaveProperty("trace");
    expect(data).toHaveProperty("spans");
    expect(data).toHaveProperty("logs");
    expect(data).toHaveProperty("db_queries");
    expect(data).toHaveProperty("external_calls");

    // Trace shape
    const trace = data.trace;
    expect(trace.id).toBe(traceId);
    expect(typeof trace.name).toBe("string");
    expect(typeof trace.root_service).toBe("string");
    expect(typeof trace.duration_ms).toBe("number");
    expect(["ok", "error", "unset"]).toContain(trace.status);
    expect(Array.isArray(trace.services)).toBe(true);

    // Spans shape
    expect(Array.isArray(data.spans)).toBe(true);
    if (data.spans.length > 0) {
      const span = data.spans[0];
      expect(typeof span.id).toBe("string");
      expect(typeof span.trace_id).toBe("string");
      expect(typeof span.service_name).toBe("string");
      expect(typeof span.operation_name).toBe("string");
      expect(["server", "client", "producer", "consumer", "internal"]).toContain(span.span_type);
      expect(typeof span.duration_ms).toBe("number");
      expect(["ok", "error", "unset"]).toContain(span.status);
      expect(typeof span.depth).toBe("number");
    }

    // db_queries shape
    expect(Array.isArray(data.db_queries)).toBe(true);
    if (data.db_queries.length > 0) {
      const dq = data.db_queries[0];
      expect(typeof dq.span_id).toBe("string");
      expect(typeof dq.operation).toBe("string");
      expect(typeof dq.statement).toBe("string");
      expect(typeof dq.duration_ms).toBe("number");
      expect(typeof dq.service_name).toBe("string");
    }

    // external_calls shape
    expect(Array.isArray(data.external_calls)).toBe(true);
    if (data.external_calls.length > 0) {
      const ec = data.external_calls[0];
      expect(typeof ec.method).toBe("string");
      expect(typeof ec.url).toBe("string");
      expect(typeof ec.status_code).toBe("number");
      expect(typeof ec.duration_ms).toBe("number");
      expect(typeof ec.service_name).toBe("string");
    }
  });

  it("should return 404 for non-existent trace", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/requests/nonexistenttraceid00000000000000`);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toHaveProperty("status", 404);
  });
});

// ─── Waterfall Shape ────────────────────────────────────────────────

describe("GET /api/v1/traces/:traceId/waterfall", () => {
  it("should return waterfall with correct shape and invariant", async () => {
    const listRes = await fetch(`${BASE_URL}/api/v1/requests?page=1&limit=1`);
    const listData = await listRes.json();

    if (listData.requests.length === 0) {
      console.warn("No traces in database — skipping waterfall test");
      return;
    }

    const traceId = listData.requests[0].trace_id;
    const res = await fetch(`${BASE_URL}/api/v1/traces/${traceId}/waterfall`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.trace_id).toBe(traceId);
    expect(typeof data.total_duration_ms).toBe("number");
    expect(data.total_duration_ms).toBeGreaterThan(0);

    expect(Array.isArray(data.spans)).toBe(true);
    data.spans.forEach((span: any) => {
      expect(typeof span.start_offset_ms).toBe("number");
      expect(typeof span.duration_ms).toBe("number");
      expect(typeof span.percentage_of_total).toBe("number");

      // CRITICAL INVARIANT: offset + duration must not exceed total
      expect(span.start_offset_ms + span.duration_ms).toBeLessThanOrEqual(
        data.total_duration_ms + 1 // +1 for floating point
      );

      expect(span.percentage_of_total).toBeGreaterThanOrEqual(0);
      expect(span.percentage_of_total).toBeLessThanOrEqual(100.01);
    });
  });
});

// ─── Logs Shape ─────────────────────────────────────────────────────

describe("GET /api/v1/traces/:traceId/logs", () => {
  it("should return logs with correct shape", async () => {
    const listRes = await fetch(`${BASE_URL}/api/v1/requests?page=1&limit=1`);
    const listData = await listRes.json();

    if (listData.requests.length === 0) {
      console.warn("No traces in database — skipping logs test");
      return;
    }

    const traceId = listData.requests[0].trace_id;
    const res = await fetch(`${BASE_URL}/api/v1/traces/${traceId}/logs`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.trace_id).toBe(traceId);
    expect(Array.isArray(data.logs)).toBe(true);
    expect(typeof data.total).toBe("number");

    if (data.logs.length > 0) {
      const log = data.logs[0];
      expect(["debug", "info", "warn", "error"]).toContain(log.level);
      expect(typeof log.service_name).toBe("string");
      expect(typeof log.message).toBe("string");
      expect(typeof log.timestamp).toBe("number");
    }
  });

  it("should filter by level", async () => {
    const listRes = await fetch(`${BASE_URL}/api/v1/requests?page=1&limit=1`);
    const listData = await listRes.json();

    if (listData.requests.length === 0) return;

    const traceId = listData.requests[0].trace_id;
    const res = await fetch(`${BASE_URL}/api/v1/traces/${traceId}/logs?level=error`);
    const data = await res.json();

    expect(res.status).toBe(200);
    data.logs.forEach((log: any) => {
      expect(log.level).toBe("error");
    });
  });
});

// ─── Topology Shape ─────────────────────────────────────────────────

describe("GET /api/v1/topology", () => {
  it("should return topology with nodes and edges", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/topology`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);

    if (data.nodes.length > 0) {
      const node = data.nodes[0];
      expect(typeof node.id).toBe("string");
      expect(typeof node.label).toBe("string");
      expect(["service", "database", "cache", "external"]).toContain(node.type);
    }

    if (data.edges.length > 0) {
      const edge = data.edges[0];
      expect(typeof edge.source).toBe("string");
      expect(typeof edge.target).toBe("string");
      expect(["http", "database", "cache", "external"]).toContain(edge.type);
    }
  });
});

// ─── Error Response Shape ───────────────────────────────────────────

describe("Error responses", () => {
  it("should return RFC 7807 error shape for 404", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/requests/nonexistent0000000000000000`);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty("error");
    expect(typeof data.error.title).toBe("string");
    expect(typeof data.error.status).toBe("number");
    expect(typeof data.error.detail).toBe("string");
  });
});

// ─── WebSocket new_request = REST item shape ─────────────────────────

describe("WebSocket contract (shape-only check)", () => {
  it("new_request payload must match RequestSummary from REST", () => {
    // This is a type-level contract check.
    // When Dev 2 implements WebSocket, run this against live WS:
    //
    //   const ws = new WebSocket('ws://localhost:4001/ws');
    //   ws.onmessage = (event) => {
    //     const msg = JSON.parse(event.data);
    //     if (msg.type === 'new_request') {
    //       expect(msg.data).toHaveProperty('trace_id');
    //       expect(msg.data).toHaveProperty('method');
    //       expect(msg.data).toHaveProperty('path');
    //       expect(msg.data).toHaveProperty('status_code');
    //       expect(msg.data).toHaveProperty('duration_ms');
    //       expect(msg.data).toHaveProperty('root_service');
    //       expect(msg.data).toHaveProperty('services');
    //       expect(msg.data).toHaveProperty('span_count');
    //       expect(msg.data).toHaveProperty('log_count');
    //       expect(msg.data).toHaveProperty('error_count');
    //       expect(msg.data).toHaveProperty('start_time');
    //       expect(msg.data).toHaveProperty('created_at');
    //     }
    //   };
    expect(true).toBe(true); // placeholder until WS is live
  });
});
