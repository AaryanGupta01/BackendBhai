import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  Server, Search, AlertCircle, CheckCircle2, 
  Activity, RefreshCw, X, TerminalSquare, 
  Database, Shield, CreditCard, Box, Globe, Play,
  ChevronDown, ChevronUp, Settings, Zap, PanelBottomClose, PanelBottomOpen, GripHorizontal
} from 'lucide-react';
import { useDynamicTopology, ApiTelemetryEvent } from './hooks/useDynamicTopology';

export default function App() {
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replayLog, setReplayLog] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(288); // default h-72 = 288px
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = terminalHeight;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - ev.clientY;
      const newHeight = Math.min(600, Math.max(120, dragStartHeight.current + delta));
      setTerminalHeight(newHeight);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [terminalHeight]);

  const { nodes: graphNodes, edges: graphEdges, processEvent } = useDynamicTopology();
  const [apis, setApis] = useState<(ApiTelemetryEvent & { pathway?: Array<{ source: string, target: string, status: string }> })[]>([]);

  // Static Graph Discovery (No packets flowing, just mapping the layout)
  const dispatchTestEvent = () => {
    const staticEdges = [
      { source: 'client', target: 'api-gateway' },
      { source: 'api-gateway', target: 'auth-service' },
      { source: 'api-gateway', target: 'order-service' },
      { source: 'order-service', target: 'postgres-db' },
      { source: 'order-service', target: 'redis-cache' },
      { source: 'order-service', target: 'payment-service' },
      { source: 'api-gateway', target: 'user-service' },
    ];
    staticEdges.forEach((edge, i) => {
       setTimeout(() => {
         processEvent({
            id: `init-${i}`,
            endpoint: '/init',
            method: 'GET',
            statusCode: 200,
            durationMs: 0,
            sourceService: edge.source,
            targetService: edge.target,
            timestamp: Date.now()
         });
       }, i * 150);
    });
  };

  React.useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const connect = () => {
      ws = new WebSocket('ws://localhost:4001/ws');
      
      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload.type === 'new_request') {
            const req = payload.data;
            
            const baseEvent: ApiTelemetryEvent & { pathway: Array<{ source: string, target: string, status: string }> } = {
              id: req.traceId,
              endpoint: req.path,
              method: req.method,
              statusCode: req.statusCode || 200,
              durationMs: req.durationMs || 10,
              sourceService: 'api-gateway',
              targetService: 'unknown',
              timestamp: new Date(req.timestamp).getTime(),
              pathway: []
            };

            const isOverallError = baseEvent.statusCode >= 400;
            baseEvent.pathway.push({ source: 'client', target: 'api-gateway', status: 'healthy' }); // Client to Gateway is generally healthy as long as it connected

            if (req.path.includes('/api/products') || (req.path.includes('/api/orders') && req.method === 'GET')) {
              baseEvent.targetService = 'order-service';
              baseEvent.pathway.push({ source: 'api-gateway', target: 'order-service', status: isOverallError ? 'error' : 'healthy' });
            } else if (req.path.includes('/api/orders') && req.method === 'POST') {
              baseEvent.targetService = 'payment-service';
              if (baseEvent.statusCode === 401) {
                baseEvent.pathway.push({ source: 'api-gateway', target: 'auth-service', status: 'error' });
              } else {
                baseEvent.pathway.push({ source: 'api-gateway', target: 'auth-service', status: 'healthy' });
                baseEvent.pathway.push({ source: 'api-gateway', target: 'order-service', status: 'healthy' });
                baseEvent.pathway.push({ source: 'order-service', target: 'payment-service', status: isOverallError ? 'error' : 'healthy' });
              }
            } else {
              baseEvent.targetService = 'auth-service';
              baseEvent.pathway.push({ source: 'api-gateway', target: 'auth-service', status: isOverallError ? 'error' : 'healthy' });
            }

            // Silently process the events so the nodes appear in the graph
            baseEvent.pathway.forEach(edge => {
               processEvent({ 
                 ...baseEvent, 
                 sourceService: edge.source, 
                 targetService: edge.target, 
                 statusCode: edge.status === 'error' ? 500 : 200 
               });
            });

            // Deduplicate if traceId already exists
            setApis(prev => {
              if (prev.some(api => api.id === req.traceId)) return prev;
              return [baseEvent, ...prev].slice(0, 50);
            });
          }
        } catch (err) {
          console.error("WS MESSAGE PARSE/PROCESS ERROR:", err);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // Prevent onclose from firing during unmount
        ws.close();
      }
    };
  }, [processEvent]);

  const selectedApi = apis.find(api => api.id === selectedApiId);

  const filteredApis = useMemo(() => {
    return apis.filter(api => 
      api.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) || 
      api.method.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, apis]);

  const handleReplay = async () => {
    if (!selectedApi) return;
    setIsReplaying(true);
    setReplayLog(null);

    const url = `http://localhost:3000${selectedApi.endpoint}`;
    const method = selectedApi.method;
    const requestBody = method === 'POST' || method === 'PUT' 
      ? JSON.stringify({ items: [{ id: 'replay-item', name: 'Replay Test', price: 99.99 }] })
      : undefined;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Replay-Mode': 'true',
    };

    const startTime = performance.now();

    try {
      const res = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
      });

      const elapsed = Math.round(performance.now() - startTime);
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => { responseHeaders[key] = value; });

      let responseBody: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseBody = await res.json();
      } else {
        responseBody = await res.text();
      }

      const lines = [
        `[${new Date().toLocaleTimeString()}] REPLAY: ${method} ${url}`,
        ``,
        `── REQUEST ──────────────────────────────`,
        `  Method:  ${method}`,
        ...Object.entries(requestHeaders).map(([k, v]) => `  ${k}: ${v}`),
        requestBody ? `  Body:    ${requestBody}` : null,
        ``,
        `── RESPONSE ─────────────────────────────`,
        `  Status:  ${res.status} ${res.statusText}`,
        `  Latency: ${elapsed}ms`,
        ...Object.entries(responseHeaders).map(([k, v]) => `  ${k}: ${v}`),
        ``,
        `── RESPONSE BODY ────────────────────────`,
        typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : responseBody,
      ].filter(Boolean).join('\n');

      setReplayLog(lines);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setReplayLog(
        `[${new Date().toLocaleTimeString()}] REPLAY FAILED: ${method} ${url}\n` +
        `  Latency: ${elapsed}ms\n` +
        `  Error:   ${err.message}`
      );
    } finally {
      setIsReplaying(false);
    }
  };

  const connectedNodes = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const connected = new Set<string>([hoveredNodeId]);
    const queue = [hoveredNodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      graphEdges.forEach(edge => {
        if (edge.source === current && !connected.has(edge.target)) {
          connected.add(edge.target);
          queue.push(edge.target);
        }
      });
    }
    return connected;
  }, [hoveredNodeId, graphEdges]);

  return (
    <div className="flex h-screen w-screen bg-earth-base text-earth-text font-sans antialiased overflow-hidden selection:bg-earth-border">
      
      {/* ================= 1. SIDEPANE ================= */}
      <aside className="w-[280px] bg-white border-r border-earth-border flex flex-col shrink-0 z-20">
        
        {/* Branding */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-earth-accent rounded-full flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-earth-text tracking-tight">BackendBhai</span>
        </div>

        {/* Search Bar */}
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

        {/* API List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          {filteredApis.map(api => {
            const isSelected = selectedApiId === api.id;
            const isError = api.statusCode >= 400;
            return (
              <div 
                key={api.id}
                onClick={() => {
                  setSelectedApiId(api.id);
                  setSelectedNodeId(null);
                }}
                className={`flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-earth-accent text-white shadow-md' 
                    : 'text-earth-text hover:bg-earth-base'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 
                    isError ? 'bg-earth-error/10 text-earth-error' : 'bg-earth-success/10 text-earth-success'
                  }`}>
                    {api.method}
                  </div>
                  <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-earth-text'}`}>
                    {api.endpoint}
                  </span>
                </div>
                {isError && !isSelected && <AlertCircle className="w-3.5 h-3.5 text-earth-error shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>

        {/* Bottom Profile Section */}
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
          
          {/* --- SYSTEM GRAPH --- */}
          <div className="min-h-full flex flex-col items-center py-4 animate-in fade-in duration-500">
            <div className="text-center mb-6 shrink-0 relative w-full flex justify-center items-center flex-col">
              <h2 className="text-2xl font-bold text-earth-text tracking-tight">System Topology Graph</h2>
              <p className="text-earth-muted text-sm mt-1 mb-4">Hover over a node to trace pathways. Select an API to diagnose.</p>
                <button 
                  onClick={dispatchTestEvent}
                  style={{ backgroundColor: '#5C4033', color: 'white' }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg text-sm font-bold cursor-pointer"
                >
                  <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  CLICK HERE: Initialize Topology
                </button>
              </div>

              <div 
                className="relative w-[1100px] h-[700px] shrink-0 mx-auto"
                onClick={() => setSelectedNodeId(null)}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <defs>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="currentColor" className="text-earth-accent opacity-0" />
                      <stop offset="50%" stopColor="currentColor" className="text-earth-accent opacity-100" />
                      <stop offset="100%" stopColor="currentColor" className="text-earth-accent opacity-0" />
                    </linearGradient>
                  </defs>

                  {graphEdges.map(edge => {
                    const sourceNode = graphNodes.find(n => n.id === edge.source);
                    const targetNode = graphNodes.find(n => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;
                    const dx = Math.abs(targetNode.x - sourceNode.x);
                    const pathData = `M ${sourceNode.x} ${sourceNode.y} C ${sourceNode.x + dx / 2} ${sourceNode.y} ${targetNode.x - dx / 2} ${targetNode.y} ${targetNode.x} ${targetNode.y}`;
                    
                    const activePathwayEdge = selectedApiId 
                      ? selectedApi?.pathway?.find(p => p.source === edge.source && p.target === edge.target)
                      : undefined;

                    // If an API is selected, ONLY its active pathway is highlighted.
                    // If no API is selected, we highlight based on hover.
                    const isHighlighted = selectedApiId 
                      ? !!activePathwayEdge 
                      : (hoveredNodeId && connectedNodes.has(edge.source) && connectedNodes.has(edge.target));
                      
                    const isDimmed = (selectedApiId && !activePathwayEdge) || (!selectedApiId && hoveredNodeId && !isHighlighted);
                    
                    const isFlowing = !!activePathwayEdge;
                    const isError = activePathwayEdge ? activePathwayEdge.status === 'error' : edge.status === 'error';

                    return (
                      <g key={edge.id}>
                        <path
                          d={pathData}
                          fill="none"
                          className={`transition-all duration-500 ${isDimmed ? 'opacity-20 stroke-earth-border' : isError ? 'stroke-earth-error/30 stroke-[3px] stroke-dasharray-[6,6]' : 'stroke-earth-border stroke-[2px]'}`}
                        />
                        {isFlowing && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke={isError ? "#E01627" : "#47E03F"}
                            strokeWidth={isError ? 4 : 3}
                            strokeDasharray="50 100"
                            style={{ animation: 'flow 2s linear infinite' }}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {graphNodes.map(node => {
                  const isActiveInPathway = selectedApiId 
                      ? selectedApi?.pathway?.some(p => p.source === node.id || p.target === node.id)
                      : false;

                  const isHighlighted = selectedApiId
                      ? isActiveInPathway
                      : (!hoveredNodeId || connectedNodes.has(node.id));

                  // When an API is selected, derive error state from its pathway, not global node status
                  const isError = selectedApiId
                    ? !!selectedApi?.pathway?.some(p => p.target === node.id && p.status === 'error')
                    : node.status === 'error';
                  const Icon = node.icon;

                  const isClickable = selectedApiId && isActiveInPathway;

                  return (
                    <div
                      key={node.id}
                      onClick={(e) => { if (!isClickable) return; e.stopPropagation(); setSelectedNodeId(node.id === selectedNodeId ? null : node.id); }}
                      onMouseEnter={() => !selectedApiId && setHoveredNodeId(node.id)}
                      onMouseLeave={() => !selectedApiId && setHoveredNodeId(null)}
                      className={`absolute w-48 p-4 rounded-2xl transition-all duration-500 ease-in-out z-10 ${
                        isClickable ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        !isHighlighted ? 'opacity-40 scale-95' : 'opacity-100 scale-100 hover:-translate-y-1.5'
                      } ${
                        isError ? 'bg-white shadow-xl ring-1 ring-earth-error/30' : 'bg-white shadow-lg ring-1 ring-earth-border'
                      }`}
                      style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                    >
                      {isError && <div className="absolute -inset-1 bg-earth-error/5 rounded-3xl blur-md -z-10 animate-pulse" />}
                      <div className="text-[9px] font-bold text-earth-muted uppercase tracking-widest mb-1.5">{node.type}</div>
                      <div className={`font-semibold flex items-center gap-2 text-sm text-earth-text`}>
                        <Icon className={`w-4 h-4 ${isError ? 'text-earth-error' : 'text-earth-accent'}`} />
                        <span className="truncate">{node.label}</span>
                      </div>
                      <div className={`text-xs font-mono mt-2.5 font-bold ${isError ? 'text-earth-error bg-earth-error/10 inline-block px-1.5 py-0.5 rounded' : 'text-earth-success'}`}>
                        {node.lastLatencyMs ? `${node.lastLatencyMs}ms` : (isError ? 'Error' : 'Healthy')}
                      </div>
                    </div>
                  );
                })}

                {/* Standalone Node Popup - rendered outside node cards */}
                {(() => {
                  const popupNode = graphNodes.find(n => n.id === selectedNodeId);
                  if (!popupNode) return null;
                  
                  const isNodeError = selectedApiId 
                    ? selectedApi?.pathway?.some(p => (p.source === popupNode.id || p.target === popupNode.id) && p.status === 'error')
                    : popupNode.status === 'error';

                  // Position popup to the right of the node, offset so it doesn't overlap
                  const popupLeft = popupNode.x + 120; // half of w-48 (96px) + gap
                  const popupTop = popupNode.y;

                  return (
                    <div 
                      className="absolute w-72 bg-white rounded-xl shadow-2xl ring-1 ring-earth-border overflow-hidden cursor-default z-50"
                      style={{ left: popupLeft, top: popupTop, transform: 'translateY(-50%)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isNodeError ? (
                        <>
                          <div className="p-3 border-b bg-earth-error/10 border-earth-error/20 flex justify-between items-start">
                            <h3 className="font-bold text-earth-error flex items-center gap-1.5 text-sm">
                              <AlertCircle className="w-4 h-4" /> Node Failed
                            </h3>
                            <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-earth-error/10 rounded">
                              <X className="w-3.5 h-3.5 text-earth-error" />
                            </button>
                          </div>
                          <div className="p-3 bg-earth-base">
                            <div className="text-[10px] font-bold text-earth-muted uppercase mb-1.5">Error Detail</div>
                            <div className="text-xs font-mono bg-white p-2 rounded border border-earth-border text-earth-error break-words whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {selectedApi?.stackTrace || `Failed with status code ${selectedApi?.statusCode || 500}`}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 border-b bg-earth-success/10 border-earth-success/20 flex justify-between items-start">
                            <h3 className="font-bold text-earth-success flex items-center gap-1.5 text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Clean Execution
                            </h3>
                            <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-earth-success/10 rounded">
                              <X className="w-3.5 h-3.5 text-earth-success" />
                            </button>
                          </div>
                          <div className="p-3 bg-earth-base text-center py-4">
                            <p className="text-xs text-earth-muted">No anomalies detected for this node in the current trace.</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
        </div>

        {/* ================= 3. TERMINAL ================= */}
        <div className="bg-white border-t border-earth-border shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(92,64,51,0.03)] z-30 transition-all duration-300" style={{ height: terminalOpen ? terminalHeight : 44 }}>
          {/* Drag Handle */}
          {terminalOpen && (
            <div
              onMouseDown={handleDragStart}
              className="h-2 cursor-ns-resize flex items-center justify-center hover:bg-earth-accent/10 transition-colors shrink-0 group"
            >
              <div className="w-10 h-1 rounded-full bg-earth-border group-hover:bg-earth-accent transition-colors" />
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-2.5 border-b border-earth-border flex items-center justify-between shrink-0 bg-earth-base">
            <div className="flex items-center gap-2.5 font-bold text-earth-accent text-sm">
              <TerminalSquare className="w-4 h-4" /> 
              <span>Replay Console</span>
            </div>
            <button 
              onClick={() => setTerminalOpen(!terminalOpen)}
              className="p-1.5 rounded-lg hover:bg-earth-border/50 text-earth-muted hover:text-earth-accent transition-all"
              title={terminalOpen ? 'Hide Console' : 'Show Console'}
            >
              {terminalOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Body */}
          {terminalOpen && (
            <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
              <div className="flex items-end justify-between shrink-0">
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-earth-muted uppercase tracking-widest mb-1.5">Target Endpoint</div>
                  <div className="font-mono text-sm text-earth-text bg-earth-base px-3 py-2 rounded-lg border border-earth-border inline-flex items-center gap-2">
                    {selectedApi ? <><span className="font-bold text-earth-accent">{selectedApi.method}</span> <span>http://localhost:3000{selectedApi.endpoint}</span></> : 'No Target Selected'}
                  </div>
                </div>
                <button 
                  onClick={handleReplay} 
                  disabled={!selectedApi || isReplaying} 
                  className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${!selectedApi ? 'bg-earth-terminal text-earth-muted cursor-not-allowed' : 'bg-earth-accent hover:bg-earth-text bg-earth-terminal shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}
                >
                  {isReplaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isReplaying ? 'Executing...' : 'Run Diagnostics'}
                </button>
              </div>

              <div className="flex-1 mt-2 p-4 bg-earth-text rounded-xl font-mono text-[13px] text-earth-border whitespace-pre-wrap shadow-inner overflow-y-auto border border-black/20 min-h-0">
                {replayLog ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-earth-muted">~/backend-devtools</span>$ replay-trace --target {selectedApi?.endpoint}<br/>
                    <div className="mt-2">
                      {replayLog.split('\n').map((line, i) => {
                        let color = 'text-gray-300';
                        if (line.startsWith('──')) color = 'text-cyan-400 font-bold';
                        else if (line.includes('REPLAY FAILED') || line.includes('Error:')) color = 'text-red-400';
                        else if (line.includes('Status:') && line.match(/[45]\d\d/)) color = 'text-red-400';
                        else if (line.includes('Status:') && line.match(/[23]\d\d/)) color = 'text-green-400';
                        else if (line.includes('REPLAY:')) color = 'text-yellow-300';
                        else if (line.includes('Latency:')) color = 'text-blue-300';
                        else if (line.startsWith('  {') || line.startsWith('  "') || line.startsWith('}')) color = 'text-gray-400';
                        return <div key={i} className={color}>{line}</div>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-earth-muted italic">Waiting for execution command...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flow {
          to { stroke-dashoffset: -150; }
        }
      `}} />
    </div>
  );
}