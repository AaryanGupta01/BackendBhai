export const baseTime = Date.now() - 300000;

export const SEED_SERVICES = [
  { name: 'client', type: 'Gateway', status: 'ok' },
  { name: 'api-gateway', type: 'Service', status: 'ok' },
  { name: 'auth-service', type: 'Service', status: 'ok' },
  { name: 'order-service', type: 'Service', status: 'error' },
  { name: 'redis-cache', type: 'Cache', status: 'ok' },
  { name: 'postgresql', type: 'Database', status: 'ok' },
  { name: 'mock-payment', type: 'External', status: 'error' }
];

export const SEED_SERVICE_DEPS = [
  { source: 'client', target: 'api-gateway', type: 'http' },
  { source: 'api-gateway', target: 'auth-service', type: 'http' },
  { source: 'api-gateway', target: 'order-service', type: 'http' },
  { source: 'order-service', target: 'redis-cache', type: 'redis' },
  { source: 'order-service', target: 'postgresql', type: 'postgres' },
  { source: 'order-service', target: 'mock-payment', type: 'http' }
];

export const SEED_TOPOLOGY = {
  data: {
    nodes: [
      { id: 'client', label: 'client', request_count: 100, error_count: 0, avg_duration_ms: 50 },
      { id: 'api-gateway', label: 'gateway', request_count: 100, error_count: 2, avg_duration_ms: 1000 },
      { id: 'auth-service', label: 'auth', request_count: 80, error_count: 0, avg_duration_ms: 200 },
      { id: 'order-service', label: 'order', request_count: 20, error_count: 2, avg_duration_ms: 2000 },
      { id: 'redis-cache', label: 'redis', request_count: 50, error_count: 0, avg_duration_ms: 5 },
      { id: 'postgresql', label: 'postgres', request_count: 50, error_count: 1, avg_duration_ms: 50 },
      { id: 'mock-payment', label: 'payment', request_count: 10, error_count: 1, avg_duration_ms: 4000 }
    ],
    edges: [
      { source: 'client', target: 'api-gateway', request_count: 100, error_count: 2, avg_duration_ms: 1000 },
      { source: 'api-gateway', target: 'auth-service', request_count: 80, error_count: 0, avg_duration_ms: 200 },
      { source: 'api-gateway', target: 'order-service', request_count: 20, error_count: 2, avg_duration_ms: 2000 },
      { source: 'order-service', target: 'redis-cache', request_count: 20, error_count: 0, avg_duration_ms: 5 },
      { source: 'order-service', target: 'postgresql', request_count: 20, error_count: 1, avg_duration_ms: 50 },
      { source: 'order-service', target: 'mock-payment', request_count: 10, error_count: 1, avg_duration_ms: 4000 }
    ]
  }
};

export const SEED_TRACES = [
  {
    traceId: 'trace-checkout-503',
    method: 'POST',
    path: '/api/checkout',
    statusCode: 503,
    durationMs: 4760,
    timestamp: new Date(baseTime).toISOString(),
    services: ['api-gateway', 'auth-service', 'order-service', 'redis-cache', 'postgresql', 'mock-payment'],
    rootService: 'api-gateway',
    hasError: true
  },
  {
    traceId: 'trace-users-profile-200',
    method: 'GET',
    path: '/api/users/profile',
    statusCode: 200,
    durationMs: 112,
    timestamp: new Date(baseTime + 10000).toISOString(),
    services: ['api-gateway', 'auth-service'],
    rootService: 'api-gateway',
    hasError: false
  },
  {
    traceId: 'trace-auth-login-200',
    method: 'POST',
    path: '/api/auth/login',
    statusCode: 200,
    durationMs: 240,
    timestamp: new Date(baseTime + 20000).toISOString(),
    services: ['api-gateway', 'auth-service', 'postgresql'],
    rootService: 'api-gateway',
    hasError: false
  },
  {
    traceId: 'trace-cart-items-200',
    method: 'GET',
    path: '/api/cart/items',
    statusCode: 200,
    durationMs: 45,
    timestamp: new Date(baseTime + 30000).toISOString(),
    services: ['api-gateway', 'order-service', 'redis-cache'],
    rootService: 'api-gateway',
    hasError: false
  },
  {
    traceId: 'trace-orders-update-500',
    method: 'PUT',
    path: '/api/orders/update',
    statusCode: 500,
    durationMs: 1205,
    timestamp: new Date(baseTime + 40000).toISOString(),
    services: ['api-gateway', 'order-service', 'postgresql'],
    rootService: 'api-gateway',
    hasError: true
  },
  {
    traceId: 'trace-products-200',
    method: 'GET',
    path: '/api/products',
    statusCode: 200,
    durationMs: 88,
    timestamp: new Date(baseTime + 50000).toISOString(),
    services: ['api-gateway', 'postgresql'],
    rootService: 'api-gateway',
    hasError: false
  }
];

export const SEED_TRACE_DETAILS = new Map([
  [
    'trace-checkout-503',
    {
      traceId: 'trace-checkout-503',
      name: 'POST /api/checkout',
      method: 'POST',
      path: '/api/checkout',
      statusCode: 503,
      durationMs: 4760,
      timestamp: new Date(baseTime).toISOString(),
      startTime: baseTime,
      endTime: baseTime + 4760,
      rootService: 'api-gateway',
      requestBody: { cartId: 'session-42', amount: 1500, currency: 'USD' },
      responseBody: { error: 'Upstream connection timeout: mock-payment-api failed to respond.' },
      requestHeaders: { 'user-agent': 'Mozilla/5.0', 'content-type': 'application/json' },
      responseHeaders: { 'content-type': 'application/json' },
      spans: [
        { spanId: 'span-co-1', parentSpanId: null, service: 'api-gateway', operation: 'POST /api/checkout', kind: 'server', startTimestamp: new Date(baseTime).toISOString(), startTime: baseTime, endTime: baseTime + 4760, durationMs: 4760, status: 'ERROR', statusCode: 503, attributes: {}, depth: 0, order: 0 },
        { spanId: 'span-co-2', parentSpanId: 'span-co-1', service: 'auth-service', operation: 'POST /auth/verify', kind: 'internal', startTimestamp: new Date(baseTime + 10).toISOString(), startTime: baseTime + 10, endTime: baseTime + 122, durationMs: 112, status: 'OK', attributes: {}, depth: 1, order: 1 },
        { spanId: 'span-co-3', parentSpanId: 'span-co-1', service: 'order-service', operation: 'POST /orders', kind: 'internal', startTimestamp: new Date(baseTime + 130).toISOString(), startTime: baseTime + 130, endTime: baseTime + 4730, durationMs: 4600, status: 'ERROR', attributes: {}, depth: 1, order: 2 },
        { spanId: 'span-co-4', parentSpanId: 'span-co-3', service: 'redis-cache', operation: 'GET cart:session-42', kind: 'client', startTimestamp: new Date(baseTime + 140).toISOString(), startTime: baseTime + 140, endTime: baseTime + 142, durationMs: 2, status: 'OK', attributes: {}, depth: 2, order: 3 },
        { spanId: 'span-co-5', parentSpanId: 'span-co-3', service: 'postgresql', operation: 'INSERT orders', kind: 'client', startTimestamp: new Date(baseTime + 150).toISOString(), startTime: baseTime + 150, endTime: baseTime + 195, durationMs: 45, status: 'OK', attributes: {}, depth: 2, order: 4 },
        { spanId: 'span-co-6', parentSpanId: 'span-co-3', service: 'mock-payment', operation: 'POST /payments', kind: 'client', startTimestamp: new Date(baseTime + 200).toISOString(), startTime: baseTime + 200, endTime: baseTime + 4700, durationMs: 4500, status: 'ERROR', attributes: {}, depth: 2, order: 5 },
        { spanId: 'span-co-7', parentSpanId: 'span-co-3', service: 'order-service', operation: 'UPDATE orders rollback', kind: 'internal', startTimestamp: new Date(baseTime + 4710).toISOString(), startTime: baseTime + 4710, endTime: baseTime + 4805, durationMs: 95, status: 'OK', attributes: {}, depth: 2, order: 6 }
      ],
      logs: [
        { timestamp: new Date(baseTime + 200).toISOString(), time: baseTime + 200, level: 'INFO', service: 'mock-payment', message: 'Initiating payment charge', traceId: 'trace-checkout-503', spanId: 'span-co-6', attributes: {} },
        { timestamp: new Date(baseTime + 4690).toISOString(), time: baseTime + 4690, level: 'ERROR', service: 'mock-payment', message: 'Timeout calling mock-payment-api', traceId: 'trace-checkout-503', spanId: 'span-co-6', attributes: { stack: 'Error: 503 Gateway Timeout\\n    at PaymentService.charge (/src/payment/service.ts:42:11)\\n    at OrderController.create (/src/orders/controller.ts:18:23)' } }
      ],
      dbQueries: [
        { spanId: 'span-co-5', service: 'postgresql', operation: 'INSERT', table: 'orders', statement: 'INSERT INTO orders (id, amount) VALUES ($1, $2)', durationMs: 45, status: 'OK' }
      ],
      externalCalls: [
        { spanId: 'span-co-6', service: 'mock-payment', method: 'POST', url: '/payments', statusCode: 503, durationMs: 4500, status: 'ERROR' }
      ]
    }
  ],
  [
    'trace-users-profile-200',
    {
      traceId: 'trace-users-profile-200',
      name: 'GET /api/users/profile',
      method: 'GET',
      path: '/api/users/profile',
      statusCode: 200,
      durationMs: 112,
      timestamp: new Date(baseTime + 10000).toISOString(),
      startTime: baseTime + 10000,
      endTime: baseTime + 10112,
      rootService: 'api-gateway',
      requestBody: null,
      responseBody: { id: 1, name: 'John Doe' },
      requestHeaders: {},
      responseHeaders: {},
      spans: [
        { spanId: 'span-up-1', parentSpanId: null, service: 'api-gateway', operation: 'GET /api/users/profile', kind: 'server', startTimestamp: new Date(baseTime + 10000).toISOString(), startTime: baseTime + 10000, endTime: baseTime + 10112, durationMs: 112, status: 'OK', statusCode: 200, attributes: {}, depth: 0, order: 0 },
        { spanId: 'span-up-2', parentSpanId: 'span-up-1', service: 'auth-service', operation: 'GET /users/1', kind: 'internal', startTimestamp: new Date(baseTime + 10010).toISOString(), startTime: baseTime + 10010, endTime: baseTime + 10100, durationMs: 90, status: 'OK', attributes: {}, depth: 1, order: 1 }
      ],
      logs: [],
      dbQueries: [],
      externalCalls: []
    }
  ],
  [
    'trace-orders-update-500',
    {
      traceId: 'trace-orders-update-500',
      name: 'PUT /api/orders/update',
      method: 'PUT',
      path: '/api/orders/update',
      statusCode: 500,
      durationMs: 1205,
      timestamp: new Date(baseTime + 40000).toISOString(),
      startTime: baseTime + 40000,
      endTime: baseTime + 41205,
      rootService: 'api-gateway',
      requestBody: { status: 'shipped' },
      responseBody: { error: 'Transaction deadlock detected.' },
      requestHeaders: {},
      responseHeaders: {},
      spans: [
        { spanId: 'span-ou-1', parentSpanId: null, service: 'api-gateway', operation: 'PUT /api/orders/update', kind: 'server', startTimestamp: new Date(baseTime + 40000).toISOString(), startTime: baseTime + 40000, endTime: baseTime + 41205, durationMs: 1205, status: 'ERROR', statusCode: 500, attributes: {}, depth: 0, order: 0 },
        { spanId: 'span-ou-2', parentSpanId: 'span-ou-1', service: 'order-service', operation: 'PUT /orders/:id', kind: 'internal', startTimestamp: new Date(baseTime + 40020).toISOString(), startTime: baseTime + 40020, endTime: baseTime + 41170, durationMs: 1150, status: 'ERROR', attributes: {}, depth: 1, order: 1 },
        { spanId: 'span-ou-3', parentSpanId: 'span-ou-2', service: 'postgresql', operation: 'UPDATE orders', kind: 'client', startTimestamp: new Date(baseTime + 40050).toISOString(), startTime: baseTime + 40050, endTime: baseTime + 41150, durationMs: 1100, status: 'ERROR', attributes: {}, depth: 2, order: 2 }
      ],
      logs: [
        { timestamp: new Date(baseTime + 41140).toISOString(), time: baseTime + 41140, level: 'ERROR', service: 'postgresql', message: 'Transaction deadlock detected.', traceId: 'trace-orders-update-500', spanId: 'span-ou-3', attributes: { stack: 'Error: Deadlock found when trying to get lock\\n    at Postgres.query (/src/db/pg.ts:99:5)' } }
      ],
      dbQueries: [
        { spanId: 'span-ou-3', service: 'postgresql', operation: 'UPDATE', table: 'orders', statement: 'UPDATE orders SET status=$1 WHERE id=$2', durationMs: 1100, status: 'ERROR' }
      ],
      externalCalls: []
    }
  ]
]);

export function getRequestsSummary(params: any) {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  return {
    data: SEED_TRACES.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: SEED_TRACES.length,
      totalPages: Math.ceil(SEED_TRACES.length / limit)
    }
  };
}

export function getTraceById(id: string) {
  return SEED_TRACE_DETAILS.get(id) || null;
}

export function getTraceWaterfall(id: string) {
  const detail = SEED_TRACE_DETAILS.get(id);
  if (!detail) return null;
  return {
    traceId: detail.traceId,
    totalDurationMs: detail.durationMs,
    startTimestamp: detail.timestamp,
    spans: detail.spans.map(s => {
      const startTime = new Date(s.startTimestamp).getTime();
      const baseTimeMs = new Date(detail.timestamp).getTime();
      return {
        spanId: s.spanId,
        parentSpanId: s.parentSpanId,
        service: s.service,
        operation: s.operation,
        kind: s.kind,
        startOffsetMs: startTime - baseTimeMs,
        durationMs: s.durationMs,
        percentageOfTotal: (s.durationMs / detail.durationMs) * 100,
        depth: s.depth,
        order: s.order,
        status: s.status,
        statusCode: s.statusCode,
        attributes: s.attributes
      };
    })
  };
}

export function getLogsByTraceId(id: string) {
  const detail = SEED_TRACE_DETAILS.get(id);
  if (!detail) return null;
  return {
    traceId: detail.traceId,
    logs: detail.logs || []
  };
}

export function getTopology() {
  return SEED_TOPOLOGY;
}
