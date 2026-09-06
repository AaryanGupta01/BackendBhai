import React, { useState, useMemo } from 'react';
import {
  Server, Search, Filter, AlertCircle, CheckCircle2,
  Activity, RefreshCw, X, TerminalSquare,
  Database, Shield, CreditCard, Box, Globe, Loader2
} from 'lucide-react';

import { useRequests } from '@/hooks/useRequests';
import { useTraceDetail } from '@/hooks/useTraceDetail';
import { SVC } from '@/data/mock';

const SERVICE_COLORS: Record<string, string> = SVC;
function getServiceColor(svc: string): string { return SERVICE_COLORS[svc] || '#6b7280'; }

// --- MOCK API DATA ---
// Mock data removed - using real API

// --- GRAPH DATA ---
// Graph data removed

// Graph edges removed

export default function App() {
  // State Management
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ error: false, get: false, post: false });
  const [replayLog, setReplayLog] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { requests, count, loading, error: apiError } = useRequests(5000);
  const { detail, loading: detailLoading, error: detailError } = useTraceDetail(selectedApiId);
  const selectedApi = requests.find(r => r.id === selectedApiId);

  // Filter Logic
  const filteredApis = useMemo(() => {
    return requests.filter(r => {
      if (filters.error && !r.errorCulprit) return false;
      if (filters.get && r.m !== 'GET') return false;
      if (filters.post && r.m !== 'POST') return false;
      return true;
    });
  }, [filters]);

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReplay = () => {
    if (!selectedApi) return;
    setIsReplaying(true);
    setReplayLog(null);
    setTimeout(() => {
      setIsReplaying(false);
      setReplayLog(`[${new Date().toLocaleTimeString()}] REPLAY EXECUTED: ${selectedApi.method} ${selectedApi.path}\nStatus: 200 OK (Simulated Fix Applied)\nLatency: 142ms`);
    }, 1200);
  };

  // BFS to find all downstream connected nodes for the hover effect
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
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      
      {/* ================= 1. NAVBAR ================= */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">BackendBhai</span>
        </div>
      </header>

      {/* BODY CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= 2. SIDEPANE (API List & Filters) ================= */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wider">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => toggleFilter('error')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${filters.error ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Errors Only
              </button>
              <button 
                onClick={() => toggleFilter('get')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${filters.get ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                GET
              </button>
              <button 
                onClick={() => toggleFilter('post')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${filters.post ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                POST
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredApis.map(api => {
              const isSelected = selectedApiId === api.id;
              const isError = api.type === 'error';
              return (
                <div 
                  key={api.id}
                  onClick={() => setSelectedApiId(api.id)}
                  className={`cursor-pointer px-4 py-3 border-b border-slate-100 transition-all ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white border-l-4 border-l-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className={`font-bold text-xs ${isError ? 'text-red-600' : 'text-emerald-600'}`}>
                      {api.method}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{api.duration}</div>
                  </div>
                  <div className="text-sm font-medium text-slate-800 truncate">{api.path}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    {isError ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    <span className={`text-[10px] font-mono ${isError ? 'text-red-500' : 'text-emerald-500'}`}>
                      {api.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredApis.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400">No APIs match the current filters.</div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT COLUMN */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          {/* ================= 3. MID SECTION (Graph vs Details) ================= */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            
            {!selectedApi ? (
              // --- STATE A: INTERACTIVE TOPOLOGY GRAPH ---
              // Fixed clipping: Changed to min-h-full and added generous padding
              <div className="min-h-full flex flex-col items-center py-8 animate-in fade-in duration-300">
                <div className="text-center mb-12 shrink-0">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Topology Graph</h2>
                  <p className="text-slate-500 text-sm mt-2">Hover over a node to highlight downstream pathways. Click an API on the left to inspect errors.</p>
                </div>

                {/* Graph Canvas */}
                <div className="relative w-[1000px] h-[750px] shrink-0 mx-auto">
                  
                  {/* SVG Layer for Connecting Edges */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    {GRAPH_EDGES.map(edge => {
                      const sourceNode = GRAPH_NODES.find(n => n.id === edge.source)!;
                      const targetNode = GRAPH_NODES.find(n => n.id === edge.target)!;
                      
                      // Calculate Bezier Curve
                      const dx = Math.abs(targetNode.x - sourceNode.x);
                      const pathData = `M ${sourceNode.x} ${sourceNode.y} C ${sourceNode.x + dx / 2} ${sourceNode.y} ${targetNode.x - dx / 2} ${targetNode.y} ${targetNode.x} ${targetNode.y}`;
                      
                      const isHighlighted = hoveredNodeId && connectedNodes.has(edge.source) && connectedNodes.has(edge.target);
                      const isDimmed = hoveredNodeId && !isHighlighted;
                      const isError = edge.status === 'error';

                      return (
                        <path
                          key={edge.id}
                          d={pathData}
                          fill="none"
                          className={`transition-all duration-300 ${
                            isDimmed ? 'opacity-15 stroke-slate-300' :
                            isError ? 'stroke-red-400 stroke-[3px] stroke-dasharray-[8,8] animate-[dash_2s_linear_infinite]' :
                            isHighlighted ? 'stroke-blue-500 stroke-[3px]' : 'stroke-slate-300 stroke-[2px]'
                          }`}
                        />
                      );
                    })}
                  </svg>

                  {/* HTML Layer for Nodes */}
                  {GRAPH_NODES.map(node => {
                    const isHighlighted = !hoveredNodeId || connectedNodes.has(node.id);
                    const isError = node.status === 'error';
                    const Icon = node.icon;

                    return (
                      <div
                        key={node.id}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={`absolute w-44 bg-white p-3 rounded-xl shadow-md border cursor-default transition-all duration-300 z-10 ${
                          !isHighlighted ? 'opacity-30 scale-95' : 'opacity-100 scale-100 hover:-translate-y-1 hover:shadow-lg'
                        } ${
                          isError ? 'border-red-300 border-l-4 border-l-red-500' : 'border-slate-200 border-l-4 border-l-blue-500'
                        }`}
                        // Center the node perfectly on its x,y coordinates
                        style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                      >
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{node.type}</div>
                        <div className={`font-semibold flex items-center gap-2 text-sm ${isError ? 'text-red-900' : 'text-slate-800'}`}>
                          <Icon className={`w-4 h-4 ${isError ? 'text-red-500' : 'text-blue-500'}`} />
                          <span className="truncate">{node.label}</span>
                        </div>
                        <div className={`text-xs font-mono mt-2 font-bold ${isError ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`}>
                          {node.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            ) : (

              // --- STATE B: SELECTED API ERROR DETAILS ---
              <div className="min-h-full flex flex-col animate-in slide-in-from-right-8 duration-300">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 shrink-0">
                  
                  <div className={`px-6 py-4 border-b flex items-start justify-between shrink-0 ${selectedApi.type === 'error' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedApi.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-emerald-200 text-emerald-800'}`}>
                          {selectedApi.method}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 font-mono">{selectedApi.path}</h2>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-mono mt-3">
                        <span className={`flex items-center gap-1.5 ${selectedApi.type === 'error' ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>
                          {selectedApi.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                          {selectedApi.status}
                        </span>
                        <span className="text-slate-500">Duration: {selectedApi.duration}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedApiId(null)}
                      className="p-2 hover:bg-white/50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                      title="Close & Return to Graph"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
                    {selectedApi.type === 'error' ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Error Message</h3>
                          <div className="p-4 bg-red-100/50 border border-red-200 rounded-lg text-red-800 font-mono text-sm">
                            {selectedApi.errorMsg}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Exception Stack Trace</h3>
                          <pre className="p-4 bg-slate-900 text-slate-300 rounded-lg font-mono text-xs overflow-x-auto shadow-inner leading-relaxed">
                            {selectedApi.stack}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
                        <p className="text-lg font-medium text-slate-600">This API executed successfully.</p>
                        <p className="text-sm">No errors to display. Select a red API from the sidebar to inspect failures.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= 4. TERMINAL / REPLAY ENGINE ================= */}
          <div className="h-72 bg-white border-t border-slate-200 shrink-0 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                <TerminalSquare className="w-4 h-4 text-blue-600" /> Request Replay Engine
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
              <p className="text-sm text-slate-500 shrink-0">
                Re-executes the exact captured payload against the local API gateway to test remediation.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Endpoint</div>
                <div className="font-mono text-sm font-semibold text-slate-800">
                  {selectedApi ? `${selectedApi.method} http://localhost:3000${selectedApi.path}` : 'No API selected from sidepane.'}
                </div>
              </div>

              <div className="flex gap-4 shrink-0">
                <button 
                  onClick={handleReplay}
                  disabled={!selectedApi || isReplaying}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${
                    !selectedApi 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isReplaying ? 'animate-spin' : ''}`} />
                  {isReplaying ? 'Executing Replay...' : 'Trigger Live Replay Trace'}
                </button>
              </div>

              {/* Terminal Output Simulation */}
              {replayLog && (
                <div className="mt-2 p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs whitespace-pre-wrap shadow-inner animate-in fade-in slide-in-from-top-2 shrink-0">
                  {replayLog}
                </div>
              )}
            </div>
          </div>

        </main>
      </div>

      {/* SVG Animation Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to { stroke-dashoffset: -16; }
        }
      `}} />
    </div>
  );
}