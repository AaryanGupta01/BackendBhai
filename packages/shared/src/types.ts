/**
 * BackendBhai — Shared TypeScript Types
 *
 * This is the single source of truth for all cross-workstream data shapes.
 * Dev 1, Dev 2, and Dev 3 MUST import from here — never hand-roll parallel interfaces.
 *
 * Source: dev5-abhinav.md §5
 * Last updated: 2026-09-06
 */

// ─── Core Trace Types ───────────────────────────────────────────────

export interface Trace {
  id: string; // trace_id from OTel, hex string
  name: string; // root operation name
  root_service: string;
  start_time: number; // unix ms
  end_time: number;
  duration_ms: number;
  status: "ok" | "error" | "unset";
  method: string | null;
  path: string | null;
  status_code: number | null;
  request_headers: Record<string, string>;
  request_body: string | null;
  response_headers: Record<string, string>;
  response_body: string | null;
  response_size: number | null;
  services: string[];
  metadata: Record<string, unknown>;
  created_at: string; // ISO timestamp
}

// ─── Span Types ─────────────────────────────────────────────────────

export interface Span {
  id: string;
  trace_id: string;
  parent_span_id: string | null;
  service_name: string;
  operation_name: string;
  span_type: "server" | "client" | "producer" | "consumer" | "internal";
  start_time: number;
  end_time: number;
  duration_ms: number;
  status: "ok" | "error" | "unset";
  status_message: string | null;
  attributes: Record<string, unknown>;
  depth: number;
  order: number;
}

export interface WaterfallSpan extends Span {
  start_offset_ms: number;
  percentage_of_total: number;
}

export interface SpanEvent {
  id: number;
  span_id: string;
  event_name: string;
  timestamp: number;
  attributes: Record<string, unknown>;
}

// ─── Log Types ──────────────────────────────────────────────────────

export interface LogEvent {
  id: number;
  trace_id: string | null;
  service_name: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  attributes: Record<string, unknown>;
  timestamp: number;
}

// ─── Service Types ──────────────────────────────────────────────────

export interface Service {
  name: string;
  version: string;
  environment: string;
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
  last_seen: string | null;
  first_seen: string;
}

export interface ServiceDependency {
  source_service: string;
  target_service: string;
  dependency_type: "http" | "database" | "cache" | "external";
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
  protocol: "http" | "grpc" | "sql" | "redis" | null;
}

// ─── Request Types ──────────────────────────────────────────────────

/**
 * GET /api/v1/requests item shape — MUST match the WebSocket
 * `new_request` payload exactly. This is the contract that prevents
 * frontend/backend shape drift (dev5 §6.5, audit MUST FIX #5).
 */
export interface RequestSummary {
  trace_id: string;
  method: string;
  path: string;
  status_code: number;
  status: "ok" | "error" | "unset";
  duration_ms: number;
  root_service: string;
  services: string[];
  span_count: number;
  log_count: number;
  error_count: number;
  start_time: number;
  created_at: string;
}

export interface RequestSnapshot {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  trace_id: string;
  service: string;
  timestamp: number;
  duration_ms: number;
  status_code: number;
}

// ─── Replay Types ───────────────────────────────────────────────────

export interface ReplaySession {
  id: string; // uuid
  original_trace_id: string;
  replay_trace_id: string | null;
  status: "pending" | "running" | "completed" | "failed";
  request_snapshot: RequestSnapshot;
  overrides: Record<string, unknown>;
  original_duration_ms: number | null;
  replay_duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// ─── Comparison Types ───────────────────────────────────────────────

export interface ComparisonResult {
  trace_a: {
    trace_id: string;
    total_duration_ms: number;
    status: string;
    status_code: number;
    services: string[];
  };
  trace_b: {
    trace_id: string;
    total_duration_ms: number;
    status: string;
    status_code: number;
    services: string[];
  };
  duration_diff_ms: number;
  duration_diff_percentage: number;
  status_match: boolean;
  status_code_match: boolean;
  service_diff: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  span_diff: {
    total_spans_a: number;
    total_spans_b: number;
    matched: number;
    unmatched_a: number;
    unmatched_b: number;
    details: Array<{
      operation_name: string;
      service_name: string;
      duration_a_ms: number;
      duration_b_ms: number;
      diff_ms: number;
      status_a: string;
      status_b: string;
      status_match: boolean;
    }>;
  };
  db_query_diff: {
    queries_a: number;
    queries_b: number;
    matched: number;
    details: unknown[];
  };
}

// ─── Topology Types ─────────────────────────────────────────────────

export interface TopologyNode {
  id: string;
  label: string;
  type: "service" | "database" | "cache" | "external";
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
}

export interface TopologyEdge {
  source: string;
  target: string;
  type: "http" | "database" | "cache" | "external";
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
  protocol: "http" | "sql" | "redis" | null;
}

export interface TopologyResult {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// ─── API Response Types ─────────────────────────────────────────────

export interface PaginatedResponse<T> {
  requests: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TraceDetailResponse {
  trace: Trace;
  spans: Span[];
  logs: LogEvent[];
  db_queries: Array<{
    span_id: string;
    operation: string;
    table: string;
    statement: string;
    duration_ms: number;
    status: string;
    service_name: string;
  }>;
  external_calls: Array<{
    span_id: string;
    method: string;
    url: string;
    status_code: number;
    duration_ms: number;
    status: string;
    service_name: string;
  }>;
}

export interface WaterfallResponse {
  trace_id: string;
  total_duration_ms: number;
  spans: WaterfallSpan[];
}

export interface LogsResponse {
  trace_id: string;
  logs: LogEvent[];
  total: number;
}

export interface ReplayResponse {
  replay_session: {
    id: string;
    original_trace_id: string;
    replay_trace_id: string | null;
    status: ReplaySession["status"];
    created_at: string;
  };
}

export interface CompareRequest {
  trace_id_a: string;
  trace_id_b: string;
}

// ─── Error Types ────────────────────────────────────────────────────

export interface ApiError {
  error: {
    type: string;
    title: string;
    status: number;
    detail: string;
  };
}

// ─── WebSocket Event Types ──────────────────────────────────────────

/**
 * Server → client WebSocket events.
 * The `new_request` event payload is identical to RequestSummary —
 * this is enforced by using the same type (dev5 §6.5, audit MUST FIX #5).
 */
export type WSEvent =
  | { type: "new_request"; data: RequestSummary }
  | {
      type: "trace_update";
      data: { trace_id: string; spans: Span[]; logs: LogEvent[] };
    }
  | {
      type: "replay_progress";
      data: {
        replay_id: string;
        step: string;
        status: ReplaySession["status"];
      };
    }
  | {
      type: "replay_complete";
      data: {
        replay_id: string;
        original_trace_id: string;
        replay_trace_id: string | null;
        status: ReplaySession["status"];
        duration_ms: number;
      };
    }
  | {
      type: "service_update";
      data: {
        service_name: string;
        request_count: number;
        error_count: number;
        avg_duration_ms: number;
      };
    }
  | { type: "error"; data: { message: string; code: string } };
