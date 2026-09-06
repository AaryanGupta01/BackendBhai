// API client for DevTools Core backend
// Maps Dev 2's API response shapes to Dev 3's internal types

const BASE = ''; // Same origin in production (served by devtools-core)

export interface ApiRequestSummary {
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  services: string[];
  rootService: string;
  hasError: boolean;
}

export interface ApiTraceDetail {
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  rootService: string;
  requestBody: any;
  responseBody: any;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  spans: ApiSpan[];
  logs: ApiLog[];
  dbQueries: ApiDbQuery[];
  externalCalls: ApiExtCall[];
}

export interface ApiSpan {
  spanId: string;
  parentSpanId: string | null;
  service: string;
  operation: string;
  kind: string;
  startTimestamp: string;
  durationMs: number;
  status: string;
  statusCode?: number;
  attributes: Record<string, any>;
}

export interface ApiWaterfallSpan {
  spanId: string;
  parentSpanId: string | null;
  service: string;
  operation: string;
  kind: string;
  startOffsetMs: number;
  durationMs: number;
  percentageOfTotal: number;
  depth: number;
  order: number;
  status: string;
  statusCode?: number;
  attributes: Record<string, any>;
}

export interface ApiLog {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  traceId: string;
  spanId?: string;
  attributes: Record<string, any>;
}

export interface ApiDbQuery {
  spanId: string;
  service: string;
  operation: string;
  table: string;
  statement: string;
  durationMs: number;
  status: string;
}

export interface ApiExtCall {
  spanId: string;
  service: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  status: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Fetch request list
export async function fetchRequests(params?: {
  page?: number;
  limit?: number;
  method?: string;
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<ApiRequestSummary>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.method) query.set('method', params.method);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const url = `${BASE}/api/v1/requests${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch requests: ${res.status}`);
  return res.json();
}

// Fetch trace detail (includes spans, logs, dbQueries, externalCalls)
export async function fetchTraceDetail(traceId: string): Promise<ApiTraceDetail> {
  const res = await fetch(`${BASE}/api/v1/requests/${traceId}`);
  if (!res.ok) throw new Error(`Failed to fetch trace: ${res.status}`);
  return res.json();
}

// Fetch waterfall data
export async function fetchWaterfall(traceId: string): Promise<{
  traceId: string;
  totalDurationMs: number;
  startTimestamp: string;
  spans: ApiWaterfallSpan[];
}> {
  const res = await fetch(`${BASE}/api/v1/traces/${traceId}/waterfall`);
  if (!res.ok) throw new Error(`Failed to fetch waterfall: ${res.status}`);
  return res.json();
}

// Fetch logs for a trace
export async function fetchLogs(traceId: string): Promise<{
  traceId: string;
  logs: ApiLog[];
}> {
  const res = await fetch(`${BASE}/api/v1/traces/${traceId}/logs`);
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
  return res.json();
}

// Fetch topology
export async function fetchTopology(): Promise<{
  data: {
    nodes: Array<{ id: string; label: string; request_count: number; error_count: number; avg_duration_ms: number }>;
    edges: Array<{ source: string; target: string; request_count: number; error_count: number; avg_duration_ms: number }>;
  };
}> {
  const res = await fetch(`${BASE}/api/v1/topology`);
  if (!res.ok) throw new Error(`Failed to fetch topology: ${res.status}`);
  return res.json();
}

// WebSocket connection for live updates
export function connectWebSocket(onMessage: (data: any) => void): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {}
  };

  ws.onerror = () => {
    console.warn('[WebSocket] Connection error — will retry');
  };

  return ws;
}
