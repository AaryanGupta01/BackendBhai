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

// --- THEME COLORS ---
// Backgrounds: #FDFBF7 (Base), #FFFFFF (Panels)
// Brand/Active: #5C4033 (Dark Brown), #8B5E34 (Warm Brown)
// Text: #2D241B (Dark), #8C8276 (Muted)
// Borders: #EFEBE4
// Error: #C05640 (Terracotta) / Success: #5A7D59 (Sage)

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
    <div className="flex h-screen w-screen bg-[#FDFBF7] text-[#2D241B] font-sans antialiased overflow-hidden selection:bg-[#EFEBE4]">
      
      {/* ================= 1. SIDEPANE (Matches Reference Image) ================= */}
      <aside className="w-[280px] bg-white border-r border-[#EFEBE4] flex flex-col shrink-0 z-20">
        
        {/* Branding */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#5C4033] rounded-full flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-[#2D241B] tracking-tight">BackendBhai</span>
        </div>

        {/* Search Bar */}
        <div className="px-6 mb-4">
          <div className="relative flex items-center w-full h-10 rounded-lg border border-[#EFEBE4] bg-white overflow-hidden focus-within:border-[#8B5E34] focus-within:ring-1 focus-within:ring-[#8B5E34] transition-all">
            <Search className="w-4 h-4 text-[#8C8276] ml-3" />
            <input 
              type="text" 
              placeholder="Search traces..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full px-3 text-sm text-[#2D241B] placeholder:text-[#8C8276] bg-transparent outline-none"
            />
          </div>
        </div>

        <hr className="border-[#EFEBE4] mx-6 mb-4" />

        {/* API List / Navigation */}
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
                    ? 'bg-[#5C4033] text-white shadow-md' 
                    : 'text-[#2D241B] hover:bg-[#FDFBF7]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 
                    isError ? 'bg-[#FDF0ED] text-[#C05640]' : 'bg-[#F0F5F0] text-[#5A7D59]'
                  }`}>
                    {api.method}
                  </div>
                  <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-[#2D241B]'}`}>
                    {api.path}
                  </span>
                </div>
                {isError && !isSelected && <AlertCircle className="w-3.5 h-3.5 text-[#C05640] shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>

        {/* Bottom Profile Section */}
        <div className="p-4 mt-auto">
          <hr className="border-[#EFEBE4] mb-4" />
          <div className="flex items-center gap-3 px-2 py-2 hover:bg-[#FDFBF7] rounded-lg cursor-pointer transition-colors text-[#8C8276]">
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Settings</span>
          </div>
          <div className="flex items-center justify-between px-2 py-2 mt-2 hover:bg-[#FDFBF7] rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8B5E34] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                JD
              </div>
              <span className="text-sm font-medium text-[#2D241B]">Jane Doe</span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#8C8276]" />
          </div>
        </div>
      </aside>

      {/* ================= 2. MAIN SECTION (Graph vs Detail + Terminal) ================= */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FDFBF7]">
        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {!selectedApi ? (
            // --- SYSTEM GRAPH ---
            <div className="min-h-full flex flex-col items-center py-4 animate-in fade-in duration-500">
              <div className="text-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-[#2D241B] tracking-tight">System Topology Graph</h2>
                <p className="text-[#8C8276] text-sm mt-1">Hover over a node to trace pathways. Select an API to diagnose.</p>
              </div>

              <div className="relative w-[1100px] h-[700px] shrink-0 mx-auto">
                {/* SVG Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <defs>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5E34" stopOpacity="0" />
                      <stop offset="50%" stopColor="#8B5E34" stopOpacity="1" />
                      <stop offset="100%" stopColor="#8B5E34" stopOpacity="0" />
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
                          className={`transition-all duration-500 ${isDimmed ? 'opacity-20 stroke-[#EFEBE4]' : isError ? 'stroke-[#F0CBBF] stroke-[3px] stroke-dasharray-[6,6]' : 'stroke-[#D9D1C7] stroke-[2px]'}`}
                        />
                        {!isDimmed && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke={isError ? "#C05640" : "url(#flowGradient)"}
                            strokeWidth={isError ? 4 : 3}
                            strokeDasharray="50 100"
                            className="animate-[flow_2s_linear_infinite]"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* HTML Layer */}
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
                        isError ? 'bg-white shadow-[0_8px_30px_rgb(192,86,64,0.15)] ring-1 ring-[#C05640]/30' : 'bg-white shadow-[0_8px_30px_rgb(92,64,51,0.06)] ring-1 ring-[#EFEBE4]'
                      }`}
                      style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                    >
                      {isError && <div className="absolute -inset-1 bg-[#C05640]/5 rounded-3xl blur-md -z-10 animate-pulse" />}
                      <div className="text-[9px] font-bold text-[#8C8276] uppercase tracking-widest mb-1.5">{node.type}</div>
                      <div className={`font-semibold flex items-center gap-2 text-sm ${isError ? 'text-[#3E2723]' : 'text-[#2D241B]'}`}>
                        <Icon className={`w-4 h-4 ${isError ? 'text-[#C05640]' : 'text-[#8B5E34]'}`} />
                        <span className="truncate">{node.label}</span>
                      </div>
                      <div className={`text-xs font-mono mt-2.5 font-bold ${isError ? 'text-[#C05640] bg-[#FDF0ED] inline-block px-1.5 py-0.5 rounded' : 'text-[#5A7D59]'}`}>
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
              <div className="bg-white rounded-2xl shadow-xl shadow-[#5C4033]/5 ring-1 ring-[#EFEBE4] overflow-hidden flex flex-col h-full">
                <div className={`px-8 py-6 border-b flex items-start justify-between ${selectedApi.type === 'error' ? 'bg-[#FDF0ED] border-[#F0CBBF]' : 'bg-[#FDFBF7] border-[#EFEBE4]'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider ${selectedApi.type === 'error' ? 'bg-[#C05640] text-white' : 'bg-[#5A7D59] text-white'}`}>
                        {selectedApi.method}
                      </span>
                      <h2 className="text-2xl font-bold text-[#2D241B] font-mono tracking-tight">{selectedApi.path}</h2>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-mono mt-4">
                      <span className={`flex items-center gap-1.5 ${selectedApi.type === 'error' ? 'text-[#C05640] font-bold bg-white px-2 py-0.5 rounded shadow-sm' : 'text-[#5A7D59] font-bold bg-white px-2 py-0.5 rounded shadow-sm'}`}>
                        {selectedApi.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                        {selectedApi.status}
                      </span>
                      <span className="text-[#8C8276] flex items-center gap-1.5">
                        <Activity className="w-4 h-4"/> Duration: {selectedApi.duration}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedApiId(null)} className="p-2.5 bg-white shadow-sm border border-[#EFEBE4] hover:border-[#8B5E34] hover:text-[#8B5E34] rounded-xl text-[#8C8276] transition-all hover:scale-105">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-8 flex-1 overflow-y-auto bg-transparent">
                  {selectedApi.type === 'error' ? (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-[11px] font-bold text-[#8C8276] mb-2.5 uppercase tracking-widest">Error Message</h3>
                        <div className="p-4 bg-[#FDF0ED] border border-[#F0CBBF] rounded-xl text-[#C05640] font-mono text-sm shadow-inner">
                          {selectedApi.errorMsg}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[11px] font-bold text-[#8C8276] mb-2.5 uppercase tracking-widest">Exception Stack Trace</h3>
                        <pre className="p-5 bg-[#2D241B] text-[#EFEBE4] rounded-xl font-mono text-[13px] overflow-x-auto shadow-xl leading-relaxed border border-[#1A1510]">
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
                    <div className="h-full flex flex-col items-center justify-center text-[#8C8276]">
                      <div className="w-20 h-20 bg-[#F0F5F0] border border-[#D5E3D5] rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <CheckCircle2 className="w-10 h-10 text-[#5A7D59]" />
                      </div>
                      <p className="text-xl font-semibold text-[#2D241B]">Clean Execution</p>
                      <p className="text-sm mt-2 max-w-sm text-center leading-relaxed">No anomalies detected. Select a degraded API from the sidepane to inspect trace details.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= 3. TERMINAL (Dark Espresso Brown) ================= */}
        <div className="h-72 bg-white border-t border-[#EFEBE4] shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(92,64,51,0.03)] z-30">
          <div className="px-6 py-3 border-b border-[#EFEBE4] flex items-center justify-between shrink-0 bg-[#FDFBF7]">
            <div className="flex items-center gap-2.5 font-bold text-[#5C4033] text-sm">
              <TerminalSquare className="w-4 h-4" /> 
              <span>Replay Console</span>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-end justify-between shrink-0">
              <div className="flex-1">
                <div className="text-[10px] font-bold text-[#8C8276] uppercase tracking-widest mb-1.5">Target Endpoint</div>
                <div className="font-mono text-sm text-[#2D241B] bg-[#FDFBF7] px-3 py-2 rounded-lg border border-[#EFEBE4] inline-flex items-center gap-2">
                  {selectedApi ? <><span className="font-bold text-[#8B5E34]">{selectedApi.method}</span> <span>http://localhost:3000{selectedApi.path}</span></> : 'No Target Selected'}
                </div>
              </div>
              <button 
                onClick={handleReplay} 
                disabled={!selectedApi || isReplaying} 
                className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${!selectedApi ? 'bg-[#EFEBE4] text-[#8C8276] cursor-not-allowed' : 'bg-[#5C4033] hover:bg-[#3E2723] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                {isReplaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isReplaying ? 'Executing...' : 'Run Diagnostics'}
              </button>
            </div>

            {/* Espresso Dark Terminal Output */}
            <div className="flex-1 mt-2 p-4 bg-[#2D241B] rounded-xl font-mono text-[13px] text-[#EFEBE4] whitespace-pre-wrap shadow-inner overflow-y-auto border border-[#1A1510]">
              {replayLog ? (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <span className="text-[#A08C75]">~/backend-devtools</span>$ replay-trace --target {selectedApi?.id}<br/>
                  <span className="text-[#8CC28A] mt-2 block">{replayLog}</span>
                </div>
              ) : (
                <div className="text-[#8C8276] italic">Waiting for execution command...</div>
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