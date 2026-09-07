import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Search, AlertCircle, CheckCircle2, Activity, RefreshCw, X, TerminalSquare,
  Play, PanelBottomClose, PanelBottomOpen, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import { useDynamicTopology } from './hooks/useDynamicTopology';
import { websocketUrl } from './config';
import { fetchRequests, replayTrace, RequestSummary, ApiError } from './api/client';

/** Formats a duration that may legitimately be unknown. Never invents a number. */
function ms(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}ms`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Node card is w-48 (192px); the height varies a little with content.
const NODE_W = 192;
const NODE_H = 132;
const CANVAS_PAD = 80;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

// A hop that succeeded but took at least this long is called out as slow. Matches the
// "Slower than 1s" option in the sidebar filter, so the graph and the list agree on
// what slow means.
const SLOW_HOP_MS = 1000;

// Colours come from the theme rather than literals so the graph cannot drift from
// the rest of the UI.
const FLOW_STROKE: Record<'error' | 'slow' | 'ok', string> = {
  error: 'var(--color-earth-error)',
  slow: 'var(--color-earth-warning)',
  ok: 'var(--color-earth-success)'
};

type StatusFilter = 'all' | 'error' | 'success';

// Offered thresholds for "slow". Chosen as round numbers rather than derived, since
// what counts as slow is a judgement the operator makes, not something telemetry says.
const SLOW_THRESHOLDS = [
  { label: 'Any speed', value: 0 },
  { label: '> 100ms', value: 100 },
  { label: '> 500ms', value: 500 },
  { label: '> 1s', value: 1000 },
  { label: '> 3s', value: 3000 }
];

export default function App() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [replayLog, setReplayLog] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // The console is a tool you reach for, not the default view of the app.
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(288);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters combine with AND, so any mix of them is valid.
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [slowerThanMs, setSlowerThanMs] = useState(0);
  const [methodFilter, setMethodFilter] = useState<Set<string>>(new Set());

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const { nodes: graphNodes, edges: graphEdges, refresh, selectTrace, loading, error } =
    useDynamicTopology();

  // ---------------------------------------------------------------- pan & zoom
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  // The canvas is sized to the laid-out graph so the edge SVG has real dimensions.
  const canvas = useMemo(() => {
    if (graphNodes.length === 0) return { width: 1000, height: 600, minX: 0, minY: 0 };
    const xs = graphNodes.map((n) => n.x);
    const ys = graphNodes.map((n) => n.y);
    return {
      minX: Math.min(...xs) - NODE_W / 2 - CANVAS_PAD,
      minY: Math.min(...ys) - NODE_H / 2 - CANVAS_PAD,
      width: Math.max(...xs) - Math.min(...xs) + NODE_W + CANVAS_PAD * 2,
      height: Math.max(...ys) - Math.min(...ys) + NODE_H + CANVAS_PAD * 2
    };
  }, [graphNodes]);

  const fitToView = useCallback(() => {
    const el = viewportRef.current;
    if (!el || graphNodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = clamp(
      Math.min(rect.width / canvas.width, rect.height / canvas.height),
      MIN_ZOOM,
      1.1
    );
    setView({
      scale,
      x: (rect.width - canvas.width * scale) / 2,
      y: (rect.height - canvas.height * scale) / 2
    });
  }, [canvas, graphNodes.length]);

  // Re-centre when the shape of the graph changes, not when latencies tick over.
  const shapeKey = useMemo(
    () => graphNodes.map((n) => n.id).sort().join('|') + '::' + graphEdges.length,
    [graphNodes, graphEdges.length]
  );
  const lastShape = useRef('');
  useEffect(() => {
    if (shapeKey === lastShape.current || graphNodes.length === 0) return;
    lastShape.current = shapeKey;
    fitToView();
  }, [shapeKey, fitToView, graphNodes.length]);

  // Keep the graph centred when the window (or the console) changes the viewport.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitToView());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToView]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = px ?? rect.width / 2;
    const cy = py ?? rect.height / 2;
    setView((v) => {
      const next = clamp(v.scale * factor, MIN_ZOOM, MAX_ZOOM);
      const k = next / v.scale;
      return { scale: next, x: cx - k * (cx - v.x), y: cy - k * (cy - v.y) };
    });
  }, []);

  // Wheel must be a non-passive listener, otherwise the browser scrolls the page
  // instead of letting us zoom.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const startPan = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    setIsPanning(true);

    const onMove = (ev: MouseEvent) => {
      const p = panRef.current;
      if (!p) return;
      setView((v) => ({ ...v, x: p.ox + (ev.clientX - p.sx), y: p.oy + (ev.clientY - p.sy) }));
    };
    const onUp = () => {
      panRef.current = null;
      setIsPanning(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [view.x, view.y]);

  // ---------------------------------------------------------- console resizing
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = terminalHeight;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - ev.clientY;
      setTerminalHeight(Math.min(600, Math.max(120, dragStartHeight.current + delta)));
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [terminalHeight]);

  // ------------------------------------------------------------------ data in
  useEffect(() => {
    fetchRequests(50)
      .then(setRequests)
      .catch((err: ApiError) =>
        setLoadError(err.detail || err.message || 'Could not reach the platform API')
      );
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let mounted = true;

    const connect = () => {
      ws = new WebSocket(websocketUrl('/ws'));
      ws.onopen = () => mounted && setConnected(true);

      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload.type !== 'new_request') return;
          const incoming = payload.data as RequestSummary;
          setRequests((prev) =>
            prev.some((r) => r.traceId === incoming.traceId)
              ? prev
              : [incoming, ...prev].slice(0, 100)
          );
          refresh();
        } catch (err) {
          console.error('Malformed WebSocket payload', err);
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      mounted = false;
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [refresh]);

  // ------------------------------------------------------------------ filters
  // Methods come from what has actually been observed, not a fixed list.
  const observedMethods = useMemo(
    () => Array.from(new Set(requests.map((r) => r.method).filter(Boolean))).sort(),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      if (q) {
        const haystack = `${r.path || ''} ${r.method || ''} ${r.rootService || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter === 'error' && !r.hasError) return false;
      if (statusFilter === 'success' && r.hasError) return false;
      if (slowerThanMs > 0 && (r.durationMs ?? 0) < slowerThanMs) return false;
      if (methodFilter.size > 0 && !methodFilter.has(r.method)) return false;
      return true;
    });
  }, [requests, searchQuery, statusFilter, slowerThanMs, methodFilter]);

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) + (slowerThanMs > 0 ? 1 : 0) + (methodFilter.size > 0 ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('all');
    setSlowerThanMs(0);
    setMethodFilter(new Set());
    setSearchQuery('');
  };

  const toggleMethod = (method: string) =>
    setMethodFilter((prev) => {
      const next = new Set(prev);
      next.has(method) ? next.delete(method) : next.add(method);
      return next;
    });

  // ------------------------------------------------------------------ actions
  const selectedRequest = requests.find((r) => r.traceId === selectedTraceId) || null;

  const handleSelectRequest = (traceId: string) => {
    const next = traceId === selectedTraceId ? null : traceId;
    setSelectedTraceId(next);
    setSelectedNodeId(null);
    selectTrace(next);
  };

  const handleReplay = async () => {
    if (!selectedRequest) return;
    setTerminalOpen(true);
    setIsReplaying(true);
    setReplayLog(null);
    try {
      const result = await replayTrace(selectedRequest.traceId);
      const delta =
        result.original.durationMs === null ? null : result.durationMs - result.original.durationMs;
      setReplayLog(
        [
          `[${new Date().toLocaleTimeString()}] REPLAY ${result.method} ${result.url}`,
          '',
          '── ORIGINAL ─────────────────────────────',
          `  Status:  ${result.original.statusCode ?? '—'}`,
          `  Latency: ${ms(result.original.durationMs)}`,
          '',
          '── REPLAY ───────────────────────────────',
          `  Status:  ${result.statusCode ?? '—'}`,
          `  Latency: ${ms(result.durationMs)}`,
          delta === null ? null : `  Delta:   ${delta >= 0 ? '+' : ''}${delta}ms`,
          result.error ? `  Error:   ${result.error}` : null,
          '',
          '── RESPONSE BODY ────────────────────────',
          result.responseBody ?? '(empty)'
        ]
          .filter((line) => line !== null)
          .join('\n')
      );
    } catch (err: any) {
      setReplayLog(
        `[${new Date().toLocaleTimeString()}] REPLAY FAILED\n  ${err.message}` +
          (err.detail ? `\n  ${err.detail}` : '')
      );
    } finally {
      setIsReplaying(false);
    }
  };

  const connectedNodes = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const reachable = new Set<string>([hoveredNodeId]);
    const queue = [hoveredNodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      graphEdges.forEach((edge) => {
        if (edge.source === current && !reachable.has(edge.target)) {
          reachable.add(edge.target);
          queue.push(edge.target);
        }
      });
    }
    return reachable;
  }, [hoveredNodeId, graphEdges]);

  // Geometry and per-edge state, computed once and shared by the two SVG layers:
  // lines are drawn beneath the node cards, labels above them, so a label is never
  // hidden behind a card when an edge is short.
  const renderableEdges = useMemo(() => {
    return graphEdges.flatMap((edge) => {
      const s = graphNodes.find((n) => n.id === edge.source);
      const t = graphNodes.find((n) => n.id === edge.target);
      if (!s || !t) return [];

      const sx = s.x - canvas.minX;
      const sy = s.y - canvas.minY;
      const tx = t.x - canvas.minX;
      const ty = t.y - canvas.minY;
      const dx = Math.abs(tx - sx);

      const isHighlighted = selectedTraceId
        ? edge.inSelectedTrace
        : !!hoveredNodeId && connectedNodes.has(edge.source) && connectedNodes.has(edge.target);
      const isDimmed =
        (selectedTraceId && !edge.inSelectedTrace) ||
        (!selectedTraceId && !!hoveredNodeId && !isHighlighted);

      // What happened at the far end of this call decides the colour of the flow:
      // it failed, it was slow, or it was fine.
      const hopMs = t.traceTotalMs;
      const flowState: 'error' | 'slow' | 'ok' =
        t.traceStatus === 'error'
          ? 'error'
          : hopMs !== undefined && hopMs >= SLOW_HOP_MS
          ? 'slow'
          : 'ok';

      return [{
        edge,
        // A cubic bezier with these control points has its midpoint at the plain
        // midpoint of the endpoints, so a label placed there sits on the curve.
        d: `M ${sx} ${sy} C ${sx + dx / 2} ${sy} ${tx - dx / 2} ${ty} ${tx} ${ty}`,
        mx: (sx + tx) / 2,
        my: (sy + ty) / 2,
        isDimmed,
        flowState,
        hopMs,
        showsHop: edge.inSelectedTrace && hopMs !== undefined
      }];
    });
  }, [graphEdges, graphNodes, canvas, selectedTraceId, hoveredNodeId, connectedNodes]);


  const selectedNode = graphNodes.find((n) => n.id === selectedNodeId) || null;

  const chip = (active: boolean) =>
    `px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
      active
        ? 'bg-earth-accent! text-white border-earth-accent!'
        : 'bg-white text-earth-muted border-earth-border hover:border-earth-accent/50'
    }`;

  return (
    <div className="flex h-screen w-screen bg-earth-base text-earth-text font-sans antialiased overflow-hidden selection:bg-earth-border">
      {/* ================= 1. SIDEPANE ================= */}
      <aside className="w-[300px] bg-white border-r border-earth-border flex flex-col shrink-0 z-20">
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-earth-accent rounded-full flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-earth-text tracking-tight">BackendBhai</span>
          <span
            title={connected ? 'Live' : 'Reconnecting'}
            className={`ml-auto w-2 h-2 rounded-full ${connected ? 'bg-earth-success' : 'bg-earth-muted'}`}
          />
        </div>

        <div className="px-5 mb-3">
          <div className="relative flex items-center w-full h-10 rounded-lg border border-earth-border bg-white overflow-hidden focus-within:border-earth-accent focus-within:ring-1 focus-within:ring-earth-accent transition-all">
            <Search className="w-4 h-4 text-earth-muted ml-3" />
            <input
              type="text"
              placeholder="Search traces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full px-3 text-sm text-earth-text placeholder:text-earth-muted bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Filters — every combination is valid, they simply AND together. */}
        <div className="px-5 pb-3 space-y-2">
          <div className="flex items-center gap-1">
            {(['all', 'error', 'success'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 ${chip(statusFilter === s)}`}
              >
                {s === 'all' ? 'All' : s === 'error' ? 'Failed' : 'OK'}
              </button>
            ))}
          </div>

          <select
            value={slowerThanMs}
            onChange={(e) => setSlowerThanMs(Number(e.target.value))}
            className={`w-full ${chip(slowerThanMs > 0)} cursor-pointer outline-none`}
          >
            {SLOW_THRESHOLDS.map((t) => (
              <option key={t.value} value={t.value} className="text-earth-text bg-white">
                {t.value === 0 ? t.label : `Slower than ${t.label.replace('> ', '')}`}
              </option>
            ))}
          </select>

          {observedMethods.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {observedMethods.map((m) => (
                <button key={m} onClick={() => toggleMethod(m)} className={chip(methodFilter.has(m))}>
                  {m}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-earth-muted pt-0.5">
            <span>
              {filteredRequests.length} of {requests.length}
            </span>
            {(activeFilterCount > 0 || searchQuery) && (
              <button onClick={clearFilters} className="font-semibold hover:text-earth-accent underline">
                Clear filters
              </button>
            )}
          </div>
        </div>

        <hr className="border-earth-border mx-5 mb-2" />

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {filteredRequests.length === 0 && (
            <div className="px-3 py-6 text-xs text-earth-muted leading-relaxed">
              {loadError ? (
                <>
                  <div className="font-semibold text-earth-error mb-1">Platform unreachable</div>
                  {loadError}
                </>
              ) : requests.length === 0 ? (
                <>
                  <div className="font-semibold text-earth-text mb-1">Waiting for telemetry</div>
                  Connect a product and send it traffic. Nothing is shown until real requests
                  arrive.
                </>
              ) : (
                <>
                  <div className="font-semibold text-earth-text mb-1">No matching requests</div>
                  {requests.length} captured, none match the current filters.
                </>
              )}
            </div>
          )}

          {filteredRequests.map((req) => {
            const isSelected = selectedTraceId === req.traceId;
            const isError = req.hasError;
            return (
              <div
                key={req.traceId}
                onClick={() => handleSelectRequest(req.traceId)}
                className={`flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  isSelected ? 'bg-earth-accent text-white shadow-md' : 'text-earth-text hover:bg-earth-base'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : isError
                        ? 'bg-earth-error/10 text-earth-error'
                        : 'bg-earth-success/10 text-earth-success'
                    }`}
                  >
                    {req.method}
                  </div>
                  <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-earth-text'}`}>
                    {req.path}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`font-mono text-[10px] ${isSelected ? 'text-white/70' : 'text-earth-muted'}`}>
                    {ms(req.durationMs)}
                  </span>
                  {isError && !isSelected && <AlertCircle className="w-3.5 h-3.5 text-earth-error" />}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ================= 2. MAIN SECTION ================= */}
      <main className="flex-1 flex flex-col min-w-0 bg-earth-base">
        <div className="px-8 pt-7 pb-4 text-center shrink-0">
          <h2 className="text-2xl font-bold text-earth-text tracking-tight">System Topology Graph</h2>
          <p className="text-earth-muted text-sm mt-1">
            {selectedRequest
              ? 'Highlighted services took part in the selected trace. Latency is per hop.'
              : 'Discovered from telemetry. Drag to pan, scroll to zoom, hover a node to trace pathways.'}
          </p>
          {loading && (
            <p className="flex items-center justify-center gap-2 text-earth-muted text-xs mt-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading topology…
            </p>
          )}
          {error && (
            <p className="text-earth-error text-xs mt-2 flex items-center justify-center gap-2">
              {error}
              <button onClick={refresh} className="underline hover:no-underline font-semibold">
                Try again
              </button>
            </p>
          )}
        </div>

        {/* Pan/zoom viewport */}
        <div
          ref={viewportRef}
          onMouseDown={startPan}
          className={`flex-1 relative overflow-hidden min-h-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {graphNodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-md px-6">
                <div className="text-earth-text font-semibold mb-2">No services discovered yet</div>
                <p className="text-earth-muted text-sm">
                  The graph is built from real telemetry. Point a product at this platform's OTLP
                  endpoint and send it traffic, or run endpoint discovery to explore its API
                  surface.
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: '0 0',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {renderableEdges.map(({ edge, d, isDimmed, flowState }) => (
                <g key={edge.id}>
                  <path
                    d={d}
                    fill="none"
                    // Neutral at rest. A dependency that has recorded errors is not a
                    // highlighted path, so its error count lives in the label instead of
                    // colouring the line, which otherwise reads as an active trace.
                    className={`transition-all duration-500 ${
                      isDimmed ? 'opacity-15 stroke-earth-muted' : 'stroke-earth-muted/45 stroke-[1.5px]'
                    }`}
                  />
                  {edge.inSelectedTrace && (
                    <path
                      d={d}
                      fill="none"
                      stroke={FLOW_STROKE[flowState]}
                      strokeWidth={flowState === 'ok' ? 3 : 4}
                      strokeLinecap="round"
                      strokeDasharray="50 100"
                      style={{ animation: 'flow 2s linear infinite' }}
                    />
                  )}
                </g>
              ))}
            </svg>

            {graphNodes.map((node) => {
              const inTrace = node.traceStatus !== undefined;
              const isHighlighted = selectedTraceId
                ? inTrace
                : !hoveredNodeId || connectedNodes.has(node.id);
              const isError = selectedTraceId ? node.traceStatus === 'error' : node.errorCount > 0;
              const Icon = node.icon;
              const isClickable = !selectedTraceId || inTrace;

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    if (!isClickable) return;
                    e.stopPropagation();
                    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                  }}
                  onMouseEnter={() => !selectedTraceId && setHoveredNodeId(node.id)}
                  onMouseLeave={() => !selectedTraceId && setHoveredNodeId(null)}
                  className={`absolute w-48 p-4 rounded-2xl transition-all duration-500 ease-in-out z-10 ${
                    isClickable ? 'cursor-pointer' : 'cursor-default'
                  } ${!isHighlighted ? 'opacity-40 scale-95' : 'opacity-100 scale-100 hover:-translate-y-1.5'} ${
                    isError ? 'bg-white shadow-xl ring-1 ring-earth-error/30' : 'bg-white shadow-lg ring-1 ring-earth-border'
                  }`}
                  style={{
                    left: node.x - canvas.minX,
                    top: node.y - canvas.minY,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {isError && <div className="absolute -inset-1 bg-earth-error/5 rounded-3xl blur-md -z-10 animate-pulse" />}
                  <div className="text-[9px] font-bold text-earth-muted uppercase tracking-widest mb-1.5">
                    {node.kind || 'unclassified'}
                  </div>
                  <div className="font-semibold flex items-center gap-2 text-sm text-earth-text">
                    <Icon className={`w-4 h-4 ${isError ? 'text-earth-error' : 'text-earth-accent'}`} />
                    <span className="truncate">{node.label}</span>
                  </div>

                  {inTrace ? (
                    <div className="mt-2.5 space-y-0.5">
                      <div className={`text-xs font-mono font-bold ${isError ? 'text-earth-error' : 'text-earth-success'}`}>
                        {ms(node.traceSelfMs)} self
                      </div>
                      <div className="text-[10px] font-mono text-earth-muted">
                        {ms(node.traceTotalMs)} total
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 space-y-0.5">
                      <div className={`text-xs font-mono font-bold ${isError ? 'text-earth-error' : 'text-earth-success'}`}>
                        {node.spanCount > 0 ? `${node.avgDurationMs}ms avg` : 'no requests'}
                      </div>
                      {node.spanCount > 0 && (
                        <div className="text-[10px] font-mono text-earth-muted">
                          p95 {node.p95DurationMs}ms · {node.spanCount} reqs
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Labels ride above the node cards on their own layer, with a halo in the
                page colour, so they stay readable wherever an edge runs under a card
                or two edges cross. */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 20 }}
            >
              {renderableEdges.map(({ edge, mx, my, isDimmed, showsHop, hopMs, flowState }) => (
                <text
                  key={edge.id}
                  x={mx}
                  y={my - 9}
                  textAnchor="middle"
                  stroke="var(--color-earth-base)"
                  strokeWidth="4"
                  paintOrder="stroke"
                  className={`text-[11px] font-mono font-semibold transition-opacity duration-300 ${
                    isDimmed ? 'opacity-25' : 'opacity-100'
                  }`}
                >
                  {showsHop ? (
                    // Inspecting one request: report that request's own hop time,
                    // coloured the same way the flow along the edge is.
                    <tspan
                      className={
                        flowState === 'error'
                          ? 'fill-earth-error'
                          : flowState === 'slow'
                          ? 'fill-earth-warning'
                          : 'fill-earth-success'
                      }
                    >
                      {hopMs}ms
                    </tspan>
                  ) : (
                    <>
                      <tspan className="fill-earth-text">{edge.avgDurationMs}ms avg</tspan>
                      {edge.errorCount > 0 && (
                        <tspan className="fill-earth-error"> · {edge.errorCount} err</tspan>
                      )}
                    </>
                  )}
                </text>
              ))}
            </svg>


            {selectedNode && (
              <div
                className="absolute w-72 bg-white rounded-xl shadow-2xl ring-1 ring-earth-border overflow-hidden cursor-default z-50"
                style={{
                  left: selectedNode.x - canvas.minX + 120,
                  top: selectedNode.y - canvas.minY,
                  transform: 'translateY(-50%)'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {(selectedTraceId ? selectedNode.traceStatus === 'error' : selectedNode.errorCount > 0) ? (
                  <>
                    <div className="p-3 border-b bg-earth-error/10 border-earth-error/20 flex justify-between items-start">
                      <h3 className="font-bold text-earth-error flex items-center gap-1.5 text-sm">
                        <AlertCircle className="w-4 h-4" /> Errors recorded
                      </h3>
                      <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-earth-error/10 rounded">
                        <X className="w-3.5 h-3.5 text-earth-error" />
                      </button>
                    </div>
                    <div className="p-3 bg-earth-base text-xs font-mono text-earth-text space-y-1">
                      <div>service: {selectedNode.label}</div>
                      <div>kind: {selectedNode.kind || 'unclassified'}</div>
                      <div>errors: {selectedNode.errorCount}</div>
                      <div>self: {ms(selectedNode.traceSelfMs ?? null)}</div>
                      <div>total: {ms(selectedNode.traceTotalMs ?? null)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 border-b bg-earth-success/10 border-earth-success/20 flex justify-between items-start">
                      <h3 className="font-bold text-earth-success flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Clean execution
                      </h3>
                      <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-earth-success/10 rounded">
                        <X className="w-3.5 h-3.5 text-earth-success" />
                      </button>
                    </div>
                    <div className="p-3 bg-earth-base text-xs font-mono text-earth-text space-y-1">
                      <div>service: {selectedNode.label}</div>
                      <div>kind: {selectedNode.kind || 'unclassified'}</div>
                      <div>requests: {selectedNode.spanCount}</div>
                      <div>avg: {ms(selectedNode.avgDurationMs)} · p95: {ms(selectedNode.p95DurationMs)}</div>
                      {selectedNode.traceSelfMs !== undefined && (
                        <div>this trace: {ms(selectedNode.traceSelfMs)} self / {ms(selectedNode.traceTotalMs)} total</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-20">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => zoomAt(1.2)}
              title="Zoom in"
              className="w-8 h-8 rounded-lg bg-white ring-1 ring-earth-border shadow flex items-center justify-center hover:bg-earth-base transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-earth-text" />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => zoomAt(1 / 1.2)}
              title="Zoom out"
              className="w-8 h-8 rounded-lg bg-white ring-1 ring-earth-border shadow flex items-center justify-center hover:bg-earth-base transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-earth-text" />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={fitToView}
              title="Fit to view"
              className="w-8 h-8 rounded-lg bg-white ring-1 ring-earth-border shadow flex items-center justify-center hover:bg-earth-base transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-earth-text" />
            </button>
            <div className="mt-1 text-[10px] font-mono text-earth-muted text-center select-none">
              {Math.round(view.scale * 100)}%
            </div>
          </div>
        </div>

        {/* ================= 3. REPLAY CONSOLE ================= */}
        <div
          className="bg-white border-t border-earth-border shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(92,64,51,0.03)] z-30"
          style={{ height: terminalOpen ? terminalHeight : 44 }}
        >
          {terminalOpen && (
            <div
              onMouseDown={handleDragStart}
              className="h-2 cursor-ns-resize flex items-center justify-center hover:bg-earth-accent/10 transition-colors shrink-0 group"
            >
              <div className="w-10 h-1 rounded-full bg-earth-border group-hover:bg-earth-accent transition-colors" />
            </div>
          )}

          <button
            onClick={() => setTerminalOpen((o) => !o)}
            className="px-6 py-2.5 border-b border-earth-border flex items-center justify-between shrink-0 bg-earth-base hover:bg-earth-border/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 font-bold text-earth-accent text-sm">
              <TerminalSquare className="w-4 h-4" />
              <span>Replay Console</span>
              {!terminalOpen && selectedRequest && (
                <span className="font-mono text-[11px] font-normal text-earth-muted">
                  {selectedRequest.method} {selectedRequest.path}
                </span>
              )}
            </div>
            {terminalOpen ? (
              <PanelBottomClose className="w-4 h-4 text-earth-muted" />
            ) : (
              <PanelBottomOpen className="w-4 h-4 text-earth-muted" />
            )}
          </button>

          {terminalOpen && (
            <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[10px] font-bold text-earth-muted uppercase tracking-widest mb-1.5">
                    Target Endpoint
                  </div>
                  <div className="font-mono text-sm px-3 py-2 rounded-lg border border-earth-border bg-earth-base text-earth-text">
                    {selectedRequest ? (
                      <>
                        <span className="font-bold text-earth-accent">{selectedRequest.method}</span>{' '}
                        <span>{selectedRequest.path}</span>
                      </>
                    ) : (
                      'No Target Selected'
                    )}
                  </div>
                </div>
                <button
                  onClick={handleReplay}
                  disabled={!selectedRequest || isReplaying}
                  className="flex items-center gap-2 text-sm font-semibold text-earth-text hover:text-earth-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {isReplaying ? 'Executing…' : 'Run Diagnostics'}
                </button>
              </div>

              <div className="flex-1 min-h-0 rounded-lg bg-earth-terminal text-white/90 p-4 font-mono text-xs overflow-auto whitespace-pre-wrap">
                {replayLog || <span className="text-earth-muted italic">Waiting for execution command...</span>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
