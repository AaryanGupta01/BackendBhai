import { API_BASE, PlatformConfig } from '../config';

export interface RequestSummary {
  traceId: string;
  method: string;
  path: string;
  statusCode: number | null;
  durationMs: number | null;
  timestamp: string;
  services: string[];
  rootService: string;
  hasError: boolean;
}

export interface TopologyNode {
  id: string;
  label: string;
  /** Derived at ingest from span attributes, never from the service name. */
  kind: 'gateway' | 'service' | 'database' | 'cache' | 'queue' | 'external' | null;
  spanCount: number;
  errorCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
}

export interface TopologyEdge {
  source: string;
  target: string;
  requestCount: number;
  errorCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
}

export interface TopologySnapshot {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TracePathStep {
  serviceName: string;
  representativeOperation: string;
  spanCount: number;
  errorCount: number;
  /** Wall-clock window for this service, including time awaiting downstream calls. */
  totalDurationMs: number;
  /** Time actually spent in this service, excluding downstream work. */
  selfTimeMs: number;
  status: 'ok' | 'error';
  order: number;
}

export interface TracePath {
  traceId: string;
  path: TracePathStep[];
}

export interface ReplayResult {
  replayId: string;
  originalTraceId: string;
  url: string;
  method: string;
  status: 'completed' | 'failed';
  statusCode: number | null;
  durationMs: number;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  error?: string;
  original: { statusCode: number | null; durationMs: number | null; body: string | null };
  timestamp: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: string) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let detail: string | undefined;
    let message = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      message = body.error || message;
      detail = body.detail;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, detail);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let detail: string | undefined;
    let message = `Request failed with ${res.status}`;
    try {
      const parsed = await res.json();
      message = parsed.error || message;
      detail = parsed.detail;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, detail);
  }
  return res.json() as Promise<T>;
}

export const fetchConfig = () => get<PlatformConfig>('/api/v1/config');

export const fetchTopology = () =>
  get<{ data: TopologySnapshot }>('/api/v1/topology').then((r) => r.data);

export const fetchRequests = (limit = 50) =>
  get<{ data: RequestSummary[] }>(`/api/v1/requests?limit=${limit}`).then((r) => r.data);

export const fetchTracePath = (traceId: string) =>
  get<TracePath>(`/api/v1/traces/${encodeURIComponent(traceId)}/path`);

export const replayTrace = (traceId: string) => post<ReplayResult>('/api/v1/replay', { traceId });

export interface DiscoveredEndpoint {
  serviceName: string;
  method: string;
  path: string;
  source: 'observed' | 'spec' | 'probe';
  observationCount: number;
  lastStatusCode: number | null;
  lastDurationMs: number | null;
}

export const fetchEndpoints = () =>
  get<{ data: DiscoveredEndpoint[]; meta: { total: number; bySource: Record<string, number> } }>(
    '/api/v1/discovery/endpoints'
  );

export interface ProbeResult {
  dryRun: boolean;
  target: string;
  plannedCount: number;
  executedCount?: number;
  planned?: Array<{ method: string; path: string; url: string }>;
  results: Array<{
    method: string;
    path: string;
    url: string;
    statusCode?: number;
    durationMs?: number;
    error?: string;
  }>;
}

export const probeEndpoints = (baseUrl: string, options: { dryRun?: boolean } = {}) =>
  post<ProbeResult>('/api/v1/discovery/probe', { baseUrl, dryRun: options.dryRun === true });
