import type { Request, Span, LogEntry, DbQuery, ExtCall } from '@/types';

export const SVC: Record<string, string> = {
  'api-gateway': '#6366f1',      // Indigo
  'auth-service': '#22c55e',     // Emerald
  'order-service': '#38bdf8',    // Sky
  'payment-service': '#ec4899',  // Pink
  postgres: '#a855f7',           // Purple
  redis: '#f97316',              // Orange
  'mock-payment-api': '#ef4444', // Crimson Red
};

export const REQS: Request[] = [
  {
    id: 'r01',
    m: 'POST',
    p: '/api/orders',
    s: 500,
    d: 5012,
    svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service', 'mock-payment-api'],
    t: 'now',
    errorCulprit: 'mock-payment-api',
    errorMessage: 'Payment gateway 503 upstream timeout: /charges failed after 4,700ms',
  },
  { id: 'r02', m: 'POST', p: '/api/orders', s: 201, d: 1234, svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service'], t: '2s' },
  { id: 'r03', m: 'GET',  p: '/api/orders/7a3f', s: 200, d: 45, svcs: ['api-gateway', 'order-service', 'postgres'], t: '5s' },
  { id: 'r04', m: 'POST', p: '/api/orders', s: 201, d: 892, svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service'], t: '8s' },
  { id: 'r05', m: 'GET',  p: '/api/orders', s: 200, d: 120, svcs: ['api-gateway', 'order-service'], t: '12s' },
  { id: 'r06', m: 'POST', p: '/api/orders', s: 201, d: 1567, svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service'], t: '15s' },
  { id: 'r07', m: 'GET',  p: '/api/orders/abc1', s: 404, d: 23, svcs: ['api-gateway', 'order-service'], t: '18s' },
  {
    id: 'r08',
    m: 'POST',
    p: '/api/orders',
    s: 500,
    d: 3211,
    svcs: ['api-gateway', 'auth-service', 'order-service', 'postgres'],
    t: '22s',
    errorCulprit: 'postgres',
    errorMessage: 'Database connection pool exhausted: query timeout in transaction',
  },
  { id: 'r09', m: 'GET',  p: '/api/orders', s: 200, d: 89, svcs: ['api-gateway', 'order-service', 'redis'], t: '28s' },
  { id: 'r10', m: 'PUT',  p: '/api/orders/4f2c', s: 200, d: 312, svcs: ['api-gateway', 'order-service', 'postgres'], t: '35s' },
  { id: 'r11', m: 'DELETE', p: '/api/orders/9b', s: 204, d: 156, svcs: ['api-gateway', 'order-service', 'postgres'], t: '40s' },
  { id: 'r12', m: 'POST', p: '/api/orders', s: 201, d: 2301, svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service', 'mock-payment-api'], t: '45s' },
  { id: 'r13', m: 'GET',  p: '/api/orders', s: 200, d: 67, svcs: ['api-gateway', 'order-service'], t: '50s' },
  { id: 'r14', m: 'POST', p: '/api/orders', s: 201, d: 988, svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service'], t: '1m' },
  {
    id: 'r15',
    m: 'POST',
    p: '/api/orders',
    s: 503,
    d: 4501,
    svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service', 'mock-payment-api'],
    t: '1m 5s',
    errorCulprit: 'mock-payment-api',
    errorMessage: 'Upstream gateway failure: mock-payment-api returned 503 Service Unavailable',
  },
];

export const WF: Span[] = [
  { id: 'sp-1',                svc: 'api-gateway',     op: 'POST /api/orders',         st: 0,    d: 5012, depth: 0, err: true },
  { id: 'sp-2', parentId: 'sp-1', svc: 'auth-service',    op: 'POST /auth/verify',        st: 12,   d: 112,  depth: 1, err: false },
  { id: 'sp-3', parentId: 'sp-1', svc: 'order-service',   op: 'POST /orders',             st: 130,  d: 4870, depth: 1, err: true },
  { id: 'sp-4', parentId: 'sp-3', svc: 'redis',           op: 'GET cart:session-42',      st: 135,  d: 2,    depth: 2, err: false },
  { id: 'sp-5', parentId: 'sp-3', svc: 'postgres',        op: 'INSERT orders',            st: 138,  d: 45,   depth: 2, err: false },
  { id: 'sp-6', parentId: 'sp-3', svc: 'payment-service', op: 'POST /payments',           st: 190,  d: 4800, depth: 2, err: true },
  { id: 'sp-7', parentId: 'sp-6', svc: 'postgres',        op: 'INSERT payments',          st: 195,  d: 10,   depth: 3, err: false },
  { id: 'sp-8', parentId: 'sp-6', svc: 'mock-payment-api',op: 'POST /charges',            st: 210,  d: 4700, depth: 3, err: true },
  { id: 'sp-9', parentId: 'sp-3', svc: 'order-service',   op: 'UPDATE orders (rollback)', st: 4912, d: 95,   depth: 2, err: false },
];

export const LOGS: LogEntry[] = [
  { lv: 'info',  svc: 'api-gateway',     msg: 'Incoming request POST /api/orders',        ts: '01.002' },
  { lv: 'info',  svc: 'auth-service',    msg: 'Token validated for user-42',               ts: '01.014' },
  { lv: 'info',  svc: 'order-service',   msg: 'Processing order for user-42 (3 items)',   ts: '01.132' },
  { lv: 'info',  svc: 'redis',           msg: 'Cache miss for cart:session-42',            ts: '01.135' },
  { lv: 'info',  svc: 'postgres',        msg: 'Order inserted with id=ord-8f3a2b',         ts: '01.183' },
  { lv: 'info',  svc: 'payment-service', msg: 'Initiating payment charge $142.50',         ts: '01.192' },
  { lv: 'warn',  svc: 'mock-payment-api',msg: 'Payment gateway responding slowly (>2s)',  ts: '03.511' },
  { lv: 'error', svc: 'mock-payment-api',msg: '503 Service Unavailable from /charges',    ts: '05.912' },
  { lv: 'error', svc: 'payment-service', msg: 'Payment failed: upstream 503',             ts: '05.913' },
  { lv: 'warn',  svc: 'order-service',   msg: 'Rolling back order ord-8f3a2b',             ts: '05.914' },
  { lv: 'info',  svc: 'postgres',        msg: 'Order status set to FAILED',                ts: '05.990' },
  { lv: 'error', svc: 'api-gateway',     msg: 'Request failed: 500 Internal Server Error', ts: '05.995' },
];

export const DB: DbQuery[] = [
  { op: 'INSERT', tbl: 'orders',   d: 45, sql: "INSERT INTO orders (user_id, items, status)\nVALUES ($1, $2, 'pending') RETURNING *" },
  { op: 'INSERT', tbl: 'payments', d: 10, sql: "INSERT INTO payments (order_id, amount, status)\nVALUES ($1, $2, 'pending') RETURNING *" },
  { op: 'UPDATE', tbl: 'orders',   d: 32, sql: "UPDATE orders\nSET status = 'failed', updated_at = NOW()\nWHERE id = $1" },
  { op: 'GET',    tbl: 'redis',    d: 2,  sql: 'GET cart:session-42' },
];

export const EXT: ExtCall[] = [
  { m: 'POST', url: 'http://mock-payment-api:4000/charges',  s: 503, d: 4700 },
  { m: 'POST', url: 'http://auth-service:3001/auth/verify', s: 200, d: 112 },
];
