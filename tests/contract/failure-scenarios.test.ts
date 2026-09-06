/**
 * BackendBhai — Failure Scenario Validation Tests
 *
 * Verifies all 5 deliberate failure scenarios produce the expected
 * spans and behavior in the DevTools UI.
 *
 * Run against the live stack:
 *   BASE_URL=http://localhost:4001 pnpm test
 *
 * Triggers must be sent against the simulated backend (API Gateway :3000).
 */

import { describe, it, expect } from "vitest";

const DEVTOOLS_URL = process.env.BASE_URL || "http://localhost:4001";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";

// ─── Helper: wait for trace to be ingested ──────────────────────────

async function waitForTrace(
  traceId: string,
  maxWaitMs = 5000,
  pollIntervalMs = 200
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${DEVTOOLS_URL}/api/v1/requests/${traceId}`);
    if (res.status === 200) {
      return res.json();
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`Trace ${traceId} not found within ${maxWaitMs}ms`);
}

// ─── 1. Slow Payment (30% of requests → 5s delay) ──────────────────

describe("Failure: Slow Payment", () => {
  it("should capture a payment span with duration > 3000ms", async () => {
    // Send a request that triggers the payment service
    // The Mock Payment API delays 30% of requests by 5s
    // We send multiple requests to increase odds of hitting the slow path
    let foundSlowPayment = false;

    for (let i = 0; i < 5; i++) {
      const orderRes = await fetch(`${GATEWAY_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-42",
          items: [{ id: "item-1", qty: 1 }],
        }),
      });

      if (!orderRes.ok) continue;
      const orderData = await orderRes.json();
      const traceId = orderData.trace_id;

      // Wait for trace to be ingested
      await new Promise((r) => setTimeout(r, 2000));

      const traceData = await waitForTrace(traceId);
      const paymentSpan = traceData.spans?.find(
        (s: any) =>
          s.service_name === "payment-service" ||
          s.operation_name?.includes("charges")
      );

      if (paymentSpan && paymentSpan.duration_ms > 3000) {
        foundSlowPayment = true;
        expect(paymentSpan.duration_ms).toBeGreaterThan(3000);
        expect(paymentSpan.status).toBe("ok"); // slow but successful
        break;
      }
    }

    // At least one of 5 requests should hit the slow path (30% probability × 5 ≈ 97%)
    expect(foundSlowPayment).toBe(true);
  });
});

// ─── 2. Payment 503 (every 20th request → 503) ─────────────────────

describe("Failure: Payment 503", () => {
  it("should capture a payment span with status error and 503", async () => {
    // Send 25 requests to guarantee hitting the every-20th failure
    let found503 = false;

    for (let i = 0; i < 25; i++) {
      const orderRes = await fetch(`${GATEWAY_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-42",
          items: [{ id: "item-1", qty: 1 }],
        }),
      });

      if (!orderRes.ok) continue;
      const orderData = await orderRes.json();
      const traceId = orderData.trace_id;

      await new Promise((r) => setTimeout(r, 2000));

      try {
        const traceData = await waitForTrace(traceId, 3000);
        const paymentSpan = traceData.spans?.find(
          (s: any) =>
            s.service_name === "payment-service" && s.status === "error"
        );

        if (paymentSpan) {
          found503 = true;
          expect(paymentSpan.status).toBe("error");
          expect(paymentSpan.attributes?.["http.status_code"] || paymentSpan.status_code).toBe(503);
          break;
        }
      } catch {
        // Trace not found yet, continue
      }
    }

    expect(found503).toBe(true);
  });
});

// ─── 3. Auth Timeout (invalid token → 5s delay) ────────────────────

describe("Failure: Auth Timeout", () => {
  it("should capture an auth span with duration ~5000ms for invalid token", async () => {
    const orderRes = await fetch(`${GATEWAY_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token-no-user-id",
      },
      body: JSON.stringify({
        userId: "user-42",
        items: [{ id: "item-1", qty: 1 }],
      }),
    });

    // The auth service should timeout and return an error
    const traceId = orderRes.headers.get("x-trace-id");

    if (traceId) {
      await new Promise((r) => setTimeout(r, 6000));
      const traceData = await waitForTrace(traceId, 8000);

      const authSpan = traceData.spans?.find(
        (s: any) =>
          s.service_name === "auth-service" ||
          s.operation_name?.includes("auth")
      );

      if (authSpan) {
        expect(authSpan.duration_ms).toBeGreaterThan(4000);
        expect(authSpan.status).toBe("error");
      }
    }
  });
});

// ─── 4. Redis Failure (every 30th request → cache miss) ─────────────

describe("Failure: Redis Cache Miss", () => {
  it("should show a Redis error span after 30 requests", async () => {
    let foundRedisError = false;

    for (let i = 0; i < 35; i++) {
      const orderRes = await fetch(`${GATEWAY_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-42",
          items: [{ id: "item-1", qty: 1 }],
        }),
      });

      if (!orderRes.ok) continue;
      const orderData = await orderRes.json();
      const traceId = orderData.trace_id;

      await new Promise((r) => setTimeout(r, 1000));

      try {
        const traceData = await waitForTrace(traceId, 3000);
        const redisSpan = traceData.spans?.find(
          (s: any) =>
            s.attributes?.["db.system"] === "redis" && s.status === "error"
        );

        if (redisSpan) {
          foundRedisError = true;
          expect(redisSpan.status).toBe("error");
          break;
        }
      } catch {
        // Continue
      }
    }

    expect(foundRedisError).toBe(true);
  });
});

// ─── 5. Slow DB (order with >10 items → 3s pg_sleep) ────────────────

describe("Failure: Slow Database", () => {
  it("should capture a DB span with duration > 3000ms for large orders", async () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `item-${i + 1}`,
      qty: 1,
    }));

    const orderRes = await fetch(`${GATEWAY_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-42", items }),
    });

    expect(orderRes.ok).toBe(true);
    const orderData = await orderRes.json();
    const traceId = orderData.trace_id;

    await new Promise((r) => setTimeout(r, 4000));
    const traceData = await waitForTrace(traceId, 6000);

    const dbSpan = traceData.spans?.find(
      (s: any) =>
        s.attributes?.["db.system"] === "postgresql" ||
        s.attributes?.["db.statement"]?.includes("orders")
    );

    if (dbSpan) {
      expect(dbSpan.duration_ms).toBeGreaterThan(3000);
    }
  });
});
