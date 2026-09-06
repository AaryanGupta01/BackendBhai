import React, { useState } from 'react';
import { 
  Folder, Clock, Settings, Play, ChevronRight, 
  Copy, Search, CheckCircle2, AlertCircle, FileJson
} from 'lucide-react';

// --- MOCK DATA ---
const CAPTURED_REQUESTS = [
  { id: '1', method: 'GET', name: 'Get All Users', path: '/api/users', status: 200, duration: '45ms' },
  { id: '2', method: 'GET', name: 'Get User By Id', path: '/api/users/3', status: 200, duration: '12ms' },
  { id: '3', method: 'POST', name: 'Add User', path: '/api/users', status: 201, duration: '145ms' },
  { id: '4', method: 'POST', name: 'Process Checkout', path: '/api/checkout', status: 500, duration: '4.7s' },
];

const SPANS = [
  { id: 's1', method: 'GET', name: 'Get All Users', url: 'http://localhost:3000/users', status: '200 OK' },
  { id: 's2', method: 'POST', name: 'Add User', url: 'http://localhost:3000/users', status: '201 Created' },
  { id: 's3', method: 'GET', name: 'Get User By Id', url: 'http://localhost:3000/users/3', status: '200 OK' },
];

const MethodText = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: 'text-blue-600',
    POST: 'text-emerald-600',
    PUT: 'text-amber-600',
    DELETE: 'text-red-600'
  };
  return <span className={`font-bold text-[11px] w-10 ${colors[method] || 'text-slate-600'}`}>{method}</span>;
};

export default function PostmanInspiredDevTools() {
  const [activeReq, setActiveReq] = useState('3');
  const [inspectorTab, setInspectorTab] = useState<'response' | 'headers' | 'request'>('response');

  return (
    <div className="flex h-screen w-screen bg-white text-slate-800 font-sans antialiased overflow-hidden">
      
      {/* 1. ULTRA-THIN LEFT RAIL (Navigation) */}
      <div className="w-14 flex flex-col items-center py-4 bg-slate-50 border-r border-slate-200 shrink-0 gap-6">
        <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Folder className="w-5 h-5" /></button>
        <button className="p-2 text-slate-900 bg-slate-200/50 rounded-lg"><Clock className="w-5 h-5" /></button>
        <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors mt-auto"><Settings className="w-5 h-5" /></button>
      </div>

      {/* 2. SIDEBAR (History / Collections) */}
      <div className="w-64 bg-slate-50/50 border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-900">History</h2>
          <Search className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {CAPTURED_REQUESTS.map((req) => (
            <div 
              key={req.id}
              onClick={() => setActiveReq(req.id)}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs cursor-pointer transition-colors ${
                activeReq === req.id ? 'bg-slate-200/60 font-medium' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <MethodText method={req.method} />
              <span className="truncate">{req.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Top Header & Run Summary */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-slate-900">Trace Results - 5b8efff7</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hover:underline cursor-pointer">View Summary</span>
              <button className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF6C37] hover:bg-[#E55B2B] text-white text-xs font-semibold rounded transition-colors shadow-sm">
                <Play className="w-3.5 h-3.5 fill-current" /> Replay Trace
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 text-xs">
            <div>
              <div className="text-slate-500 mb-1">Source</div>
              <div className="font-medium text-slate-900">Local Capture</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Environment</div>
              <div className="font-medium text-slate-900">Development</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Total Duration</div>
              <div className="font-medium text-slate-900">230ms</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Errors</div>
              <div className="font-medium text-slate-900">0</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Avg. Resp. Time</div>
              <div className="font-medium text-slate-900">7 ms</div>
            </div>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-6 px-6 border-b border-slate-200 text-xs font-medium text-slate-500 pt-2">
          <button className="pb-2 border-b-2 border-slate-900 text-slate-900">All Spans</button>
          <button className="pb-2 hover:text-slate-800 transition-colors">Passed (3)</button>
          <button className="pb-2 hover:text-slate-800 transition-colors">Failed (0)</button>
        </div>

        {/* Split View: Span List vs Inspector */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Execution List (like Postman iterations) */}
          <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-4 space-y-6">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Iteration 1</div>
            
            {SPANS.map((span) => (
              <div key={span.id} className="group cursor-pointer">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MethodText method={span.method} />
                    <span className="font-medium text-slate-900">{span.name}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-600">{span.status}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 ml-12 mb-2">{span.url}</div>
                <div className="ml-12 pl-3 border-l-2 border-slate-200 text-xs text-slate-400 py-1 group-hover:border-slate-400 transition-colors">
                  View trace details...
                </div>
              </div>
            ))}
          </div>

          {/* Right: Floating Inspector Panel */}
          <div className="w-1/2 bg-slate-50/50 p-6 flex flex-col overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
              
              {/* Inspector Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <MethodText method="GET" />
                  <span className="text-slate-400 text-xs">Users /</span>
                  <span className="font-semibold text-slate-900">Get User By Id</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
                  <span className="text-emerald-600 font-bold">200 OK</span>
                  <span>12 ms</span>
                  <span>260 B</span>
                </div>
              </div>

              {/* Inspector Tabs */}
              <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1 text-xs">
                {['response', 'headers', 'request'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setInspectorTab(tab as any)}
                    className={`px-3 py-1.5 rounded-md capitalize font-medium transition-colors ${
                      inspectorTab === tab 
                        ? 'bg-slate-100 text-slate-900' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Inspector Body (JSON) */}
              <div className="flex-1 p-4 overflow-y-auto bg-[#FAFAFA] font-mono text-xs leading-relaxed">
                <div className="flex items-center justify-between mb-4">
                  <button className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 shadow-xs hover:bg-slate-50">
                    <span>Pretty</span>
                    <ChevronRight className="w-3 h-3 rotate-90" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-slate-700"><Copy className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-700"><Search className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Simulated Syntax Highlighting */}
                <div className="flex">
                  <div className="w-8 text-slate-300 text-right pr-3 select-none flex flex-col">
                    <span>1</span><span>2</span><span>3</span><span>4</span>
                  </div>
                  <div className="text-slate-800">
                    <div>{`{`}</div>
                    <div className="pl-4">
                      <span className="text-blue-700">"id"</span>: <span className="text-amber-600">3</span>,
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-700">"name"</span>: <span className="text-emerald-700">"Charlie"</span>
                    </div>
                    <div>{`}`}</div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}