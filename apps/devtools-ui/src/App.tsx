import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Search, AlertCircle, CheckCircle2, Activity, RefreshCw, X, TerminalSquare,
  Settings, ChevronDown, Play, Zap, PanelBottomClose, PanelBottomOpen
} from 'lucide-react';
import { useDynamicTopology } from './hooks/useDynamicTopology';
import { websocketUrl } from './config';
import { fetchRequests, replayTrace, RequestSummary, ApiError } from './api/client';

/** Formats a duration that may legitimately be unknown. Never invents a number. */
function ms(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}ms`;
}

export default function App() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replayLog, setReplayLog] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(288);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const { nodes: graphNodes, edges: graphEdges, refresh, selectTrace, loading, error } =
    useDynamicTopology();

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

  // Seed the list from history so a reload does not start blank.
  useEffect(() => {
    fetchRequests(50)
      .then(setRequests)
      .catch((err: ApiError) =>
        setLoadError(err.detail || err.message || 'Could not reach the platform API')
      );
  }, []);

  // Live requests arrive over the WebSocket the platform serves on its own origin.
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
          // New traffic can introduce services or edges the snapshot has not seen.
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

  const selectedRequest = requests.find((r) => r.traceId === selectedTraceId) || null;

  const handleSelectRequest = (traceId: string) => {
    const next = traceId === selectedTraceId ? null : traceId;
    setSelectedTraceId(next);
    setSelectedNodeId(null);
    selectTrace(next);
  };

  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r) =>
        (r.path || '').toLowerCase().includes(q) ||
        (r.method || '').toLowerCase().includes(q) ||
        (r.rootService || '').toLowerCase().includes(q)
    );
  }, [searchQuery, requests]);

  // Replay runs on the server against the origin recorded in the trace, so the
  // browser never needs to know where the monitored product lives.
  const handleReplay = async () => {
    if (!selectedRequest) return;
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

  const selectedNode = graphNodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen bg-earth-base text-earth-text font-sans antialiased overflow-hidden selection:bg-earth-border">
      {/* ================= 1. SIDEPANE ================= */}
      <aside className="w-[280px] bg-white border-r border-earth-border flex flex-col shrink-0 z-20">
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

        <div className="px-6 mb-4">
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

        <hr className="border-earth-border mx-6 mb-4" />

        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          {filteredRequests.length === 0 && (
            <div className="px-3 py-6 text-xs text-earth-muted leading-relaxed">
              {loadError ? (
                <>
                  <div className="font-semibold text-earth-error mb-1">Platform unreachable</div>
                  {loadError}
                </>
              ) : (
                <>
                  <div className="font-semibold text-earth-text mb-1">Waiting for telemetry</div>
                  Connect a product and send it traffic. Nothing is shown until real
                  requests arrive.
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

        <div className="p-4 mt-auto">
          <hr className="border-earth-border mb-4" />
          <div className="flex items-center gap-3 px-2 py-2 hover:bg-earth-base rounded-lg cursor-pointer transition-colors text-earth-muted">
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Settings</span>
          </div>
          <div className="flex items-center justify-between px-2 py-2 mt-2 hover:bg-earth-base rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-earth-accent/80 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                JD
              </div>
              <span className="text-sm font-medium text-earth-text">Jane Doe</span>
            </div>
            <ChevronDown className="w-4 h-4 text-earth-muted" />
          </div>
        </div>
      </aside>

      {/* ================= 2. MAIN SECTION ================= */}
      <main className="flex-1 flex flex-col min-w-0 bg-earth-base">
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="min-h-full flex flex-col items-center py-4 animate-in fade-in duration-500">
            <div className="text-center mb-6 shrink-0 relative w-full flex justify-center items-center flex-col">
              <h2 className="text-2xl font-bold text-earth-text tracking-tight">System Topology Graph</h2>
              <p className="text-earth-muted text-sm mt-1 mb-4">
                {selectedRequest
                  ? 'Highlighted services took part in the selected trace. Latency is per hop.'
                  : 'Discovered from telemetry. Hover a node to trace pathways, select a request to diagnose.'}
              </p>
              <button
                onClick={refresh}
                disabled={loading}
                style={{ backgroundColor: '#5C4033', color: 'white' }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shadow-lg text-sm font-bold cursor-pointer"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
                {loading ? 'Refreshing…' : 'Refresh Topology'}
              </button>
              {error && <p className="text-earth-error text-xs mt-3">{error}</p>}
            </div>

            <div className="relative w-[1100px] h-[700px] shrink-0 mx-auto" onClick={() => setSelectedNodeId(null)}>
              {graphNodes.length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="text-earth-text font-semibold mb-2">No services discovered yet</div>
                    <p className="text-earth-muted text-sm">
                      The graph is built from real telemetry. Point a product at this
                      platform's OTLP endpoint and send it traffic, or run endpoint
                      discovery to explore its API surface.
                    </p>
                  </div>
                </div>
              )}

              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {graphEdges.map((edge) => {
                  const sourceNode = graphNodes.find((n) => n.id === edge.source);
                  const targetNode = graphNodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;
                  const dx = Math.abs(targetNode.x - sourceNode.x);
                  const pathData = `M ${sourceNode.x} ${sourceNode.y} C ${sourceNode.x + dx / 2} ${sourceNode.y} ${targetNode.x - dx / 2} ${targetNode.y} ${targetNode.x} ${targetNode.y}`;

                  const isHighlighted = selectedTraceId
                    ? edge.inSelectedTrace
                    : !!hoveredNodeId && connectedNodes.has(edge.source) && connectedNodes.has(edge.target);
                  const isDimmed =
                    (selectedTraceId && !edge.inSelectedTrace) ||
                    (!selectedTraceId && !!hoveredNodeId && !isHighlighted);
                  const isError = edge.status === 'error';

                  const midX = (sourceNode.x + targetNode.x) / 2;
                  const midY = (sourceNode.y + targetNode.y) / 2;

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathData}
                        fill="none"
                        className={`transition-all duration-500 ${
                          isDimmed
                            ? 'opacity-20 stroke-earth-border'
                            : isError
                            ? 'stroke-earth-error/40 stroke-[3px]'
                            : 'stroke-earth-border stroke-[2px]'
                        }`}
                      />
                      {edge.inSelectedTrace && (
                        <path
                          d={pathData}
                          fill="none"
                          stroke={isError ? '#E01627' : '#47E03F'}
                          strokeWidth={isError ? 4 : 3}
                          strokeDasharray="50 100"
                          style={{ animation: 'flow 2s linear infinite' }}
                        />
                      )}
                      {!isDimmed && (
                        <text
                          x={midX}
                          y={midY - 8}
                          textAnchor="middle"
                          className="fill-earth-muted text-[10px] font-mono"
                        >
                          {edge.avgDurationMs}ms avg
                        </text>
                      )}
                    </g>
                  );
                })}
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
                    style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
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
                          {node.spanCount > 0 ? `${node.avgDurationMs}ms avg` : 'no spans'}
                        </div>
                        {node.spanCount > 0 && (
                          <div className="text-[10px] font-mono text-earth-muted">
                            p95 {node.p95DurationMs}ms · {node.spanCount} spans
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {selectedNode && (
                <div
                  className="absolute w-72 bg-white rounded-xl shadow-2xl ring-1 ring-earth-border overflow-hidden cursor-default z-50"
                  style={{ left: selectedNode.x + 120, top: selectedNode.y, transform: 'translateY(-50%)' }}
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
                        <div>spans: {selectedNode.spanCount}</div>
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
          </div>
        </div>

        {/* ================= 3. TERMINAL ================= */}
        <div
          className="bg-white border-t border-earth-border shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(92,64,51,0.03)] z-30 transition-all duration-300"
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

          <div className="px-6 py-2.5 border-b border-earth-border flex items-center justify-between shrink-0 bg-earth-base">
            <div className="flex items-center gap-2.5 font-bold text-earth-accent text-sm">
              <TerminalSquare className="w-4 h-4" />
              <span>Replay Console</span>
            </div>
            <button
              onClick={() => setTerminalOpen((o) => !o)}
              className="p-1 hover:bg-earth-border/40 rounded transition-colors"
            >
              {terminalOpen ? (
                <PanelBottomClose className="w-4 h-4 text-earth-muted" />
              ) : (
                <PanelBottomOpen className="w-4 h-4 text-earth-muted" />
              )}
            </button>
          </div>

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
