import React, { useState, useMemo } from 'react';
import { 
  Server, Search, AlertCircle, CheckCircle2, 
  Activity, RefreshCw, X, TerminalSquare, 
  Database, Shield, CreditCard, Box, Globe, Play,
  ChevronDown, Settings
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
  const [searchQuery, setSearchQuery] = useState('');
  const [replayLog, setReplayLog] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const selectedApi = MOCK_APIS.find(api => api.id === selectedApiId);

  const filteredApis = useMemo(() => {
    return MOCK_APIS.filter(api => 
      api.path.toLowerCase().includes(searchQuery.toLowerCase()) || 
      api.method.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

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
            const isError = api.type === 'error';
            return (
              <div 
                key={api.id}
                onClick={() => setSelectedApiId(api.id)}
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
                    {api.path}
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
          
          {!selectedApi ? (
            // --- SYSTEM GRAPH ---
            <div className="min-h-full flex flex-col items-center py-4 animate-in fade-in duration-500">
              <div className="text-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-earth-text tracking-tight">System Topology Graph</h2>
                <p className="text-earth-muted text-sm mt-1">Hover over a node to trace pathways. Select an API to diagnose.</p>
              </div>

              <div className="relative w-[1100px] h-[700px] shrink-0 mx-auto">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <defs>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="currentColor" className="text-earth-accent opacity-0" />
                      <stop offset="50%" stopColor="currentColor" className="text-earth-accent opacity-100" />
                      <stop offset="100%" stopColor="currentColor" className="text-earth-accent opacity-0" />
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
                          className={`transition-all duration-500 ${isDimmed ? 'opacity-20 stroke-earth-border' : isError ? 'stroke-earth-error/30 stroke-[3px] stroke-dasharray-[6,6]' : 'stroke-earth-border stroke-[2px]'}`}
                        />
                        {!isDimmed && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke={isError ? "#C05640" : "#097302"}
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
              <div className="bg-white rounded-2xl shadow-xl ring-1 ring-earth-border overflow-hidden flex flex-col h-full">
                <div className={`px-8 py-6 border-b flex items-start justify-between ${selectedApi.type === 'error' ? 'bg-earth-error/10 border-earth-error/20' : 'bg-earth-base border-earth-border'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider text-white ${selectedApi.type === 'error' ? 'bg-earth-error' : 'bg-earth-success'}`}>
                        {selectedApi.method}
                      </span>
                      <h2 className="text-2xl font-bold text-earth-text font-mono tracking-tight">{selectedApi.path}</h2>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-mono mt-4">
                      <span className={`flex items-center gap-1.5 font-bold bg-white px-2 py-0.5 rounded shadow-sm ${selectedApi.type === 'error' ? 'text-earth-error' : 'text-earth-success'}`}>
                        {selectedApi.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                        {selectedApi.status}
                      </span>
                      <span className="text-earth-muted flex items-center gap-1.5">
                        <Activity className="w-4 h-4"/> Duration: {selectedApi.duration}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedApiId(null)} className="p-2.5 bg-white shadow-sm border border-earth-border hover:border-earth-accent hover:text-earth-accent rounded-xl text-earth-muted transition-all hover:scale-105">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-8 flex-1 overflow-y-auto bg-transparent">
                  {selectedApi.type === 'error' ? (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-[11px] font-bold text-earth-muted mb-2.5 uppercase tracking-widest">Error Message</h3>
                        <div className="p-4 bg-earth-error/10 border border-earth-error/20 rounded-xl text-earth-error font-mono text-sm shadow-inner">
                          {selectedApi.errorMsg}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[11px] font-bold text-earth-muted mb-2.5 uppercase tracking-widest">Exception Stack Trace</h3>
                        <pre className="p-5 bg-earth-text text-earth-border rounded-xl font-mono text-[13px] overflow-x-auto shadow-xl leading-relaxed border border-earth-text">
                          <code dangerouslySetInnerHTML={{__html: (selectedApi.stack || '').replace(/Error:/g, '<span class="text-earth-error font-bold">Error:</span>').replace(/at /g, '<span class="text-earth-border opacity-70">at </span>')}} />
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-earth-muted">
                      <div className="w-20 h-20 bg-earth-success/10 border border-earth-success/20 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <CheckCircle2 className="w-10 h-10 text-earth-success" />
                      </div>
                      <p className="text-xl font-semibold text-earth-text">Clean Execution</p>
                      <p className="text-sm mt-2 max-w-sm text-center leading-relaxed">No anomalies detected. Select a degraded API from the sidepane to inspect trace details.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= 3. TERMINAL ================= */}
        <div className="h-72 bg-white border-t border-earth-border shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(92,64,51,0.03)] z-30">
          <div className="px-6 py-3 border-b border-earth-border flex items-center justify-between shrink-0 bg-earth-base">
            <div className="flex items-center gap-2.5 font-bold text-earth-accent text-sm">
              <TerminalSquare className="w-4 h-4" /> 
              <span>Replay Console</span>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-end justify-between shrink-0">
              <div className="flex-1">
                <div className="text-[10px] font-bold text-earth-muted uppercase tracking-widest mb-1.5">Target Endpoint</div>
                <div className="font-mono text-sm text-earth-text bg-earth-base px-3 py-2 rounded-lg border border-earth-border inline-flex items-center gap-2">
                  {selectedApi ? <><span className="font-bold text-earth-accent">{selectedApi.method}</span> <span>http://localhost:3000{selectedApi.path}</span></> : 'No Target Selected'}
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

            <div className="flex-1 mt-2 p-4 bg-earth-text rounded-xl font-mono text-[13px] text-earth-border whitespace-pre-wrap shadow-inner overflow-y-auto border border-black/20">
              {replayLog ? (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <span className="text-earth-muted">~/backend-devtools</span>$ replay-trace --target {selectedApi?.id}<br/>
                  <span className="text-earth-success mt-2 block">{replayLog}</span>
                </div>
              ) : (
                <div className="text-earth-muted italic">Waiting for execution command...</div>
              )}
            </div>
          </div>
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