import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchRequests, connectWebSocket, type ApiRequestSummary } from '@/api/client';

// Map API response to Dev 3's Request type
export interface LiveRequest {
  id: string;
  m: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  p: string;
  s: number;
  d: number;
  svcs: string[];
  t: string;
  errorCulprit?: string;
  errorMessage?: string;
}

function mapApiToRequest(api: ApiRequestSummary): LiveRequest {
  const now = Date.now();
  const diff = now - new Date(api.timestamp).getTime();
  let t = 'now';
  if (diff > 60000) t = `${Math.floor(diff / 60000)}m`;
  else if (diff > 1000) t = `${Math.floor(diff / 1000)}s`;

  return {
    id: api.traceId,
    m: (api.method || 'GET') as any,
    p: api.path || '/',
    s: api.statusCode || 200,
    d: api.durationMs || 0,
    svcs: api.services || [],
    t,
    errorCulprit: api.hasError ? api.rootService : undefined,
  };
}

export function useRequests(pollIntervalMs = 5000) {
  const [requests, setRequests] = useState<LiveRequest[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial fetch
  const loadRequests = useCallback(async () => {
    try {
      const result = await fetchRequests({ limit: 50 });
      const mapped = result.data.map(mapApiToRequest);
      setRequests(mapped);
      setCount(result.pagination.total);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Poll for updates
  useEffect(() => {
    const timer = setInterval(loadRequests, pollIntervalMs);
    return () => clearInterval(timer);
  }, [loadRequests, pollIntervalMs]);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = connectWebSocket((msg) => {
      if (msg.type === 'new_request' && msg.data) {
        const mapped = mapApiToRequest(msg.data);
        setRequests((prev) => [mapped, ...prev].slice(0, 100));
        setCount((c) => c + 1);
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  return { requests, count, loading, error };
}
