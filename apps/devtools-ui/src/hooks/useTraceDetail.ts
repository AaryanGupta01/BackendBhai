import { useState, useEffect } from 'react';
import { fetchTraceDetail, fetchWaterfall, type ApiTraceDetail, type ApiWaterfallSpan } from '@/api/client';

export interface TraceDetail {
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  rootService: string;
  requestBody: any;
  responseBody: any;
  spans: Array<{
    spanId: string;
    parentSpanId: string | null;
    service: string;
    operation: string;
    kind: string;
    startOffsetMs: number;
    durationMs: number;
    depth: number;
    status: string;
    statusCode?: number;
    attributes: Record<string, any>;
  }>;
  logs: Array<{
    timestamp: string;
    level: string;
    service: string;
    message: string;
    traceId: string;
    spanId?: string;
  }>;
  dbQueries: Array<{
    spanId: string;
    service: string;
    operation: string;
    table: string;
    statement: string;
    durationMs: number;
    status: string;
  }>;
  externalCalls: Array<{
    spanId: string;
    service: string;
    method: string;
    url: string;
    statusCode: number;
    durationMs: number;
    status: string;
  }>;
}

export function useTraceDetail(traceId: string | null) {
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [traceData, waterfallData] = await Promise.all([
          fetchTraceDetail(traceId!),
          fetchWaterfall(traceId!),
        ]);

        if (cancelled) return;

        // Merge waterfall depth/order into trace spans
        const waterfallMap = new Map<string, ApiWaterfallSpan>();
        waterfallData.spans.forEach((ws) => waterfallMap.set(ws.spanId, ws));

        const mergedSpans = traceData.spans.map((span) => {
          const wf = waterfallMap.get(span.spanId);
          return {
            ...span,
            startOffsetMs: wf?.startOffsetMs ?? 0,
            depth: wf?.depth ?? 0,
            order: wf?.order ?? 0,
          };
        }).sort((a, b) => a.order - b.order);

        setDetail({
          traceId: traceData.traceId,
          method: traceData.method,
          path: traceData.path,
          statusCode: traceData.statusCode,
          durationMs: traceData.durationMs,
          rootService: traceData.rootService,
          requestBody: traceData.requestBody,
          responseBody: traceData.responseBody,
          spans: mergedSpans,
          logs: traceData.logs,
          dbQueries: traceData.dbQueries,
          externalCalls: traceData.externalCalls,
        });
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [traceId]);

  return { detail, loading, error };
}
