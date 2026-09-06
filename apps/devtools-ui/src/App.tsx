import React, { useState, useMemo, useEffect } from 'react';
import { 
  Server, Filter, AlertCircle, CheckCircle2, 
  Activity, RefreshCw, X, TerminalSquare, 
  Database, Shield, CreditCard, Box, Globe, Play, Search, Circle
} from 'lucide-react';

// --- MOCK API DATA ---
const MOCK_APIS = [
  { id: '1', method: 'POST', path: '/api/checkout', status: 503, duration: '4,760ms', type: 'error', errorMsg: 'Upstream connection timeout: mock-payment-api failed to respond.', stack: 'Error: 503 Gateway Timeout\n    at PaymentService.charge (/src/payment/service.ts:42:11)\n    at OrderController.create (/src/orders/controller.ts:18:23)' },
  { id: '2', method: 'GET', path: '/api/users/profile', status: 200, duration: '112ms', type: 'success' },
  { id: '3', method: 'POST', path: '/api/auth/login', status: 200, duration: '240ms', type: 'success' },
  { id: '4', method: 'GET', path: '/api/cart/items', status: 200, duration: '45ms', type: 'success' },
  { id: '5', method: 'PUT', path: '/api/orders/update', status: 500, duration: '1,205ms', type: 'error', errorMsg: 'Transaction deadlock detected.', stack: 'Error: Deadlock found when trying to get lock\n    at Postgres.query (/src/db/pg.ts:99:5)' },
  { id: '6', method: 'GET', path: '/api/products', status: 200, duration: '88ms', type: 'success' },
];

// --- GRAPH DATA ---
const GRAPH_NODES = [
  { id: 'client', label: 'Client', type: 'Gateway', x: 100, y: 250, icon: Globe, status: 'ok', detail: 'External' },
  { id: 'gateway', label: 'api-gateway', type: 'Service', x: 350, y: 250, icon: Server, status: 'ok', detail: '200 OK' },
  { id: 'auth', label: 'auth-service', type: 'Service', x: 650, y: 100, icon: Shield, status: 'ok', detail: '112ms' },
  { id: 'order', label: 'order-service', type: 'Service', x: 650, y: 400, icon: Box, status: 'error', detail: '4,850ms' },
  { id: 'redis', label: 'redis-cache', type: 'Cache', x: 950, y: 200, icon: Database, status: 'ok', detail: '2ms' },
  { id: 'postgres', label: 'postgresql', type: 'Database', x: 950, y: 400, icon: Database, status: 'ok', detail: '45ms' },
  { id: 'payment', label: 'mock-payment', type: 'External', x: 950, y: 600, icon: CreditCard, status: 'error', detail: '503 Timeout' },
];

const GRAPH_EDGES = [
  { id: 'e1', source: 'client', target: 'gateway', status: 'ok' },
  { id: 'e2', source: 'gateway', target: 'auth', status: 'ok' },
  { id: 'e3', source: 'gateway', target: 'order', status: 'ok' },
  { id: 'e4', source: 'order', target: 'redis', status: 'ok' },
  { id: 'e5', source: 'order', target: 'postgres', status: 'ok' },
  { id: 'e6', source: 'order', target: 'payment', status: 'error' },
];

export default function App() {
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ error: false, get: false, post: false });
  const [replayLog, setReplayLog] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const selectedApi = MOCK_APIS.find(api => api.id === selectedApiId);

  // Keyboard shortcut for Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredApis = useMemo(() => {
    return MOCK_APIS.filter(api => {
      if (filters.error && api.type !== 'error') return false;
      if (filters.get && api.method !== 'GET') return false;
      if (filters.post && api.method !== 'POST') return false;
      return true;
    });
  }, [filters]);

  const toggleFilter = (key: keyof typeof filters) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  const handleReplay = () => {
    if (!selectedApi) return;
    setIsReplaying(true);
    setReplayLog(null);
    setTimeout(() => {
      setIsReplaying(false);
      setReplayLog(`> [${new Date().toLocaleTimeString()}] REPLAY EXECUTED: ${selectedApi.method} ${selectedApi.path}\n> Status: 200 OK (Simulated Fix Applied)\n> Latency: 142ms\n> Trace ID: 8F31C9A`);
    }, 1500);
  };

  const connectedNodes = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const connected = new Set<string>([hoveredNodeId]);
    const queue = [hoveredNodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      GRAPH_EDGES.forEach(edge => {
        if (edge.source === current && !connected.has(edge.target)) {
          connected.add(edge.target);
          queue.push(edge.target);
        }
      });
    }
    return connected;
  }, [hoveredNodeId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-indigo-50/30 text-slate-800 font-sans antialiased overflow-hidden selection:bg-violet-200">
      
      {/* ================= 1. NAVBAR (The 3 Spec Components) ================= */}
      {/* ================= 1. NAVBAR (Ultra-Minimal) ================= */}
      <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-indigo-100/80 flex items-center justify-between px-6 shrink-0 z-30">
        
        {/* Left: Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-200 ring-1 ring-violet-900/5">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">BackendBhai</span>
        </div>

        {/* Right: Connection Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50/80 border border-emerald-200/50 text-emerald-700 rounded-full text-xs font-semibold shadow-sm">
            <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
            Connected
          </div>
        </div>
        
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= 2. SIDEPANE ================= */}
        <aside className="w-80 bg-white border-r border-indigo-100 flex flex-col shrink-0 z-20 shadow-[1px_0_15px_rgba(79,70,229,0.03)]">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-indigo-50/50 to-transparent">
            <div className="flex items-center gap-2 mb-3 text-[11px] font-bold text-violet-500 uppercase tracking-widest">
              <Filter className="w-3.5 h-3.5" /> Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleFilter('error')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${filters.error ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>Errors Only</button>
              <button onClick={() => toggleFilter('get')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${filters.get ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>GET</button>
              <button onClick={() => toggleFilter('post')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${filters.post ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>POST</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredApis.map(api => {
              const isSelected = selectedApiId === api.id;
              const isError = api.type === 'error';
              return (
                <div 
                  key={api.id}
                  onClick={() => setSelectedApiId(api.id)}
                  className={`cursor-pointer px-4 py-3 rounded-xl transition-all duration-200 border ${
                    isSelected ? 'bg-violet-50 border-violet-200 shadow-sm ring-1 ring-violet-600/10' : 'bg-transparent border-transparent hover:bg-indigo-50/30 hover:border-indigo-100'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${isError ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                      {api.method}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{api.duration}</span>
                  </div>
                  <div className={`text-[13px] font-semibold truncate ${isSelected ? 'text-violet-950' : 'text-slate-700'}`}>{api.path}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {isError ? <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    <span className={`text-[10px] font-mono font-medium ${isError ? 'text-rose-600' : 'text-emerald-600'}`}>{api.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ================= 3. MID SECTION ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent">
          <div className="flex-1 overflow-y-auto p-8 relative">
            
            {!selectedApi ? (
              // --- GRAPH VIEW ---
              <div className="min-h-full flex flex-col items-center py-4 animate-in fade-in duration-500">
                <div className="text-center mb-6 shrink-0">
                  <h2 className="text-2xl font-bold text-slate-100 tracking-tight">System Topology Graph</h2>
                  <p className="text-slate-400 text-sm mt-1">Hover over a node to trace pathways. Click an API to inspect errors.</p>
                </div>

                <div className="relative w-[1100px] h-[700px] shrink-0 mx-auto">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    <defs>
                      <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
                        <stop offset="50%" stopColor="#D946EF" stopOpacity="1" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {GRAPH_EDGES.map(edge => {
                      const sourceNode = GRAPH_NODES.find(n => n.id === edge.source)!;
                      const targetNode = GRAPH_NODES.find(n => n.id === edge.target)!;
                      const dx = Math.abs(targetNode.x - sourceNode.x);
                      const pathData = `M ${sourceNode.x} ${sourceNode.y} C ${sourceNode.x + dx / 2} ${sourceNode.y} ${targetNode.x - dx / 2} ${targetNode.y} ${targetNode.x} ${targetNode.y}`;
                      
                      const isHighlighted = hoveredNodeId && connectedNodes.has(edge.source) && connectedNodes.has(edge.target);
                      const isDimmed = hoveredNodeId && !isHighlighted;
                      const isError = edge.status === 'error';

                      return (
                        <g key={edge.id}>
                          <path
                            d={pathData}
                            fill="none"
                            className={`transition-all duration-500 ${isDimmed ? 'opacity-20 stroke-indigo-100' : isError ? 'stroke-rose-300 stroke-[3px] stroke-dasharray-[6,6]' : 'stroke-indigo-200 stroke-[2px]'}`}
                          />
                          {!isDimmed && (
                            <path
                              d={pathData}
                              fill="none"
                              stroke={isError ? "#F43F5E" : "url(#flowGradient)"}
                              strokeWidth={isError ? 4 : 3}
                              strokeDasharray="50 100"
                              className="animate-[flow_2s_linear_infinite]"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {GRAPH_NODES.map(node => {
                    const isHighlighted = !hoveredNodeId || connectedNodes.has(node.id);
                    const isError = node.status === 'error';
                    const Icon = node.icon;

                    return (
                      <div
                        key={node.id}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={`absolute w-48 p-4 rounded-2xl cursor-default transition-all duration-300 z-10 ${
                          !isHighlighted ? 'opacity-40 scale-95' : 'opacity-100 scale-100 hover:-translate-y-1.5'
                        } ${
                          isError ? 'bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(244,63,94,0.15)] ring-1 ring-rose-200' : 'bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(139,92,246,0.08)] ring-1 ring-violet-200/50'
                        }`}
                        style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                      >
                        {isError && <div className="absolute -inset-1 bg-rose-500/10 rounded-3xl blur-md -z-10 animate-pulse" />}
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{node.type}</div>
                        <div className={`font-semibold flex items-center gap-2 text-sm ${isError ? 'text-rose-950' : 'text-slate-800'}`}>
                          <Icon className={`w-4 h-4 ${isError ? 'text-rose-500' : 'text-violet-500'}`} />
                          <span className="truncate">{node.label}</span>
                        </div>
                        <div className={`text-xs font-mono mt-2.5 font-bold ${isError ? 'text-rose-600 bg-rose-50 inline-block px-1.5 py-0.5 rounded' : 'text-emerald-600'}`}>
                          {node.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // --- ERROR DETAILS VIEW ---
              <div className="max-w-4xl mx-auto h-full flex flex-col animate-in slide-in-from-right-8 duration-300">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-900/5 ring-1 ring-indigo-100 overflow-hidden flex flex-col h-full">
                  <div className={`px-8 py-6 border-b flex items-start justify-between ${selectedApi.type === 'error' ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider ${selectedApi.type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {selectedApi.method}
                        </span>
                        <h2 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{selectedApi.path}</h2>
                      </div>
                      <div className="flex items-center gap-6 text-sm font-mono mt-4">
                        <span className={`flex items-center gap-1.5 ${selectedApi.type === 'error' ? 'text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded' : 'text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded'}`}>
                          {selectedApi.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                          {selectedApi.status}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Activity className="w-4 h-4"/> Duration: {selectedApi.duration}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedApiId(null)} className="p-2.5 bg-white shadow-sm border border-slate-200 hover:border-violet-200 hover:text-violet-600 rounded-xl text-slate-400 transition-all hover:scale-105" title="Close & Return to Graph">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-8 flex-1 overflow-y-auto bg-transparent">
                    {selectedApi.type === 'error' ? (
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-[11px] font-bold text-slate-400 mb-2.5 uppercase tracking-widest">Error Message</h3>
                          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 font-mono text-sm shadow-inner">
                            {selectedApi.errorMsg}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-[11px] font-bold text-slate-400 mb-2.5 uppercase tracking-widest">Exception Stack Trace</h3>
                          <pre className="p-5 bg-slate-900 text-slate-300 rounded-xl font-mono text-[13px] overflow-x-auto shadow-xl leading-relaxed border border-slate-800">
                            <code
                              dangerouslySetInnerHTML={{
                                __html: (selectedApi.stack ?? '')
                                  .replace(/Error:/g, '<span class="text-red-400 font-bold">Error:</span>')
                                  .replace(/at /g, '<span class="text-indigo-400">at </span>')
                              }}
                            />
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <p className="text-xl font-semibold text-slate-700">Clean Execution</p>
                        <p className="text-sm mt-2 max-w-sm text-center leading-relaxed">No anomalies detected. Select a degraded API from the sidepane to inspect trace details.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= 4. TERMINAL REPLAY ENGINE ================= */}
          <div className="h-72 bg-white/90 backdrop-blur-xl border-t border-indigo-100 shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(79,70,229,0.05)] z-30">
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-transparent">
              <div className="flex items-center gap-2.5 font-bold text-slate-700 text-sm">
                <TerminalSquare className="w-4 h-4 text-violet-600" /> 
                <span>Replay Console</span>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-end justify-between shrink-0">
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Endpoint</div>
                  <div className="font-mono text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 inline-flex items-center gap-2">
                    {selectedApi ? <><span className="font-bold text-violet-600">{selectedApi.method}</span> <span>http://localhost:3000{selectedApi.path}</span></> : 'No Target Selected'}
                  </div>
                </div>
                <button onClick={handleReplay} disabled={!selectedApi || isReplaying} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${!selectedApi ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}>
                  {isReplaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isReplaying ? 'Executing...' : 'Run Diagnostics'}
                </button>
              </div>

              <div className="flex-1 mt-2 p-4 bg-slate-900 rounded-xl font-mono text-[13px] text-slate-300 whitespace-pre-wrap shadow-inner overflow-y-auto border border-slate-800">
                {replayLog ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-violet-400">~/backend-devtools</span>$ replay-trace --target {selectedApi?.id}<br/>
                    <span className="text-emerald-400">{replayLog}</span>
                  </div>
                ) : (
                  <div className="text-slate-500 italic">Waiting for execution command...</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Command Palette Modal */}
      {paletteOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-start justify-center pt-32 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden font-sans">
            <div className="flex items-center px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <Search className="w-5 h-5 text-violet-500 mr-3" />
              <input 
                autoFocus
                placeholder="Search traces or endpoints..." 
                className="w-full text-base bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <kbd className="px-2 py-1 bg-white text-slate-400 rounded-md text-[10px] font-bold font-mono border border-slate-200">ESC</kbd>
            </div>
            <div className="p-2 text-sm text-slate-500 text-center py-8">
              Start typing to search available traces...
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flow {
          to { stroke-dashoffset: -150; }
        }
      `}} />
    </div>
  );
}