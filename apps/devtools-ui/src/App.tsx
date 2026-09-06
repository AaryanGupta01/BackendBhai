import React, { useState, useMemo } from 'react';
import {
  Server, Search, Filter, AlertCircle, CheckCircle2,
  Activity, RefreshCw, X, TerminalSquare,
  Database, Shield, CreditCard, Box, Globe
} from 'lucide-react';

import { useRequests, type LiveRequest } from '@/hooks/useRequests';
import { useTraceDetail, type TraceDetail } from '@/hooks/useTraceDetail';
import { SVC } from '@/data/mock';

function getServiceColor(svc: string | undefined | null): string {
  if (!svc) return '#6b7280';
  return SVC[svc] || '#6b7280';
}

function getStatusColor(s: number | null | undefined): string {
  const code = s || 0;
  if (code >= 500) return 'text-red-600';
  if (code >= 400) return 'text-orange-500';
  if (code >= 200 && code < 300) return 'text-emerald-600';
  return 'text-slate-500';
}

function getMethodColor(m: string | undefined | null): string {
  switch (m) {
    case 'POST': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'PUT': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function safeJson(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export default function App() {
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ error: false, get: false, post: false });
  const [activeTab, setActiveTab] = useState<'waterfall' | 'logs' | 'db' | 'ext'>('waterfall');

  const { requests, count, loading, error: apiError } = useRequests(5000);
  const { detail, loading: detailLoading } = useTraceDetail(selectedApiId);

  const filteredApis = useMemo(() => {
    return requests.filter(r => {
      if (filters.error && !r.errorCulprit) return false;
      if (filters.get && r.m !== 'GET') return false;
      if (filters.post && r.m !== 'POST') return false;
      return true;
    });
  }, [requests, filters]);

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedApi = requests.find(r => r.id === selectedApiId);

  // Safe detail properties with fallbacks
  const detailMethod = detail?.method || selectedApi?.m || 'GET';
  const detailPath = detail?.path || selectedApi?.p || '/';
  const detailStatus = detail?.statusCode || selectedApi?.s || 200;
  const detailDuration = detail?.durationMs || selectedApi?.d || 0;
  const detailServices = detail?.services || selectedApi?.svcs || [];
  const detailSpans = detail?.spans || [];
  const detailLogs = detail?.logs || [];
  const detailDbQueries = detail?.dbQueries || [];
  const detailExternalCalls = detail?.externalCalls || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">

      {/* NAVBAR */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">BackendBhai</span>
          <span className="text-xs text-slate-400 font-mono ml-2">Chrome DevTools for Backend</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{count} traces</span>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* SIDEPANE — API List & Filters */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wider">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleFilter('error')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${filters.error ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                Errors Only
              </button>
              <button onClick={() => toggleFilter('get')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${filters.get ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                GET
              </button>
              <button onClick={() => toggleFilter('post')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${filters.post ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                POST
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-sm text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading traces...
              </div>
            )}
            {apiError && (
              <div className="p-6 text-center text-sm text-red-400">
                <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                {apiError}
              </div>
            )}
            {!loading && filteredApis.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400">
                No traces yet. Place an order on the demo store to see data.
              </div>
            )}
            {filteredApis.map(api => {
              const isSelected = selectedApiId === api.id;
              const isError = !!api.errorCulprit;
              return (
                <div key={api.id}
                  onClick={() => setSelectedApiId(api.id)}
                  className={`cursor-pointer px-4 py-3 border-b border-slate-100 transition-all ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white border-l-4 border-l-transparent hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodColor(api.m)}`}>
                      {api.m}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{api.t}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 truncate mt-1">{api.p}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      {isError ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      <span className={`text-[10px] font-mono font-bold ${getStatusColor(api.s)}`}>{api.s}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{api.d}ms</span>
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(api.svcs || []).map(svc => (
                      <span key={svc} className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getServiceColor(svc) }} />
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedApi ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Server className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-slate-500">Select a request</h2>
                <p className="text-sm text-slate-400 mt-1">Click on any trace in the sidebar to view details</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : detail ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Request Header */}
              <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded text-xs font-bold border ${getMethodColor(detailMethod)}`}>
                    {detailMethod}
                  </span>
                  <span className="text-lg font-mono font-semibold text-slate-800">{detailPath}</span>
                  <span className={`text-sm font-bold ${getStatusColor(detailStatus)}`}>
                    {detailStatus}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto font-mono">{detailDuration}ms</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {(Array.isArray(detailServices) ? detailServices : []).map((svc, i) => (
                    <span key={`${svc}-${i}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getServiceColor(svc) }} />
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-white shrink-0 px-6">
                {(['waterfall', 'logs', 'db', 'ext'] as const).map(tab => (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {tab === 'waterfall' && <TerminalSquare className="w-3.5 h-3.5 inline mr-1.5" />}
                    {tab === 'logs' && <Database className="w-3.5 h-3.5 inline mr-1.5" />}
                    {tab === 'db' && <Database className="w-3.5 h-3.5 inline mr-1.5" />}
                    {tab === 'ext' && <Globe className="w-3.5 h-3.5 inline mr-1.5" />}
                    {tab === 'waterfall' ? 'Waterfall' : tab === 'logs' ? 'Logs' : tab === 'db' ? 'DB Queries' : 'External APIs'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'waterfall' && (
                  <div className="space-y-1">
                    {detailSpans.length > 0 ? (
                      detailSpans.map((span: any, i: number) => (
                        <div key={span.spanId || i}
                          className="flex items-center gap-3 py-2 px-3 rounded hover:bg-slate-50 group"
                          style={{ paddingLeft: `${((span.depth || 0) * 24) + 12}px` }}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getServiceColor(span.service) }} />
                          <span className="text-xs font-mono text-slate-500 w-12 shrink-0">{span.kind || 'span'}</span>
                          <span className="text-sm font-medium text-slate-700 flex-1 truncate">{span.operation || 'unknown'}</span>
                          <span className="text-xs text-slate-400 font-mono shrink-0">{span.service || 'unknown'}</span>
                          <span className="text-xs text-slate-500 font-mono w-16 text-right shrink-0">{span.durationMs || 0}ms</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.max(span.percentageOfTotal || 0, 2)}%`,
                              backgroundColor: getServiceColor(span.service)
                            }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-sm text-slate-400 py-8">No spans in this trace</div>
                    )}
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="space-y-2">
                    {detailLogs.length > 0 ? (
                      detailLogs.map((log: any, i: number) => (
                        <div key={i} className="font-mono text-xs bg-slate-900 text-green-400 p-3 rounded overflow-x-auto">
                          <span className="text-slate-500">[{log.level || 'info'}]</span> {log.message || JSON.stringify(log)}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-sm text-slate-400 py-8">No correlated logs for this trace</div>
                    )}
                  </div>
                )}

                {activeTab === 'db' && (
                  <div className="space-y-2">
                    {detailDbQueries.length > 0 ? (
                      detailDbQueries.map((q: any, i: number) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="text-xs font-mono text-slate-500 mb-2">{q.service || 'postgres'}</div>
                          <div className="text-sm font-mono bg-slate-50 p-2 rounded text-slate-700">{q.query || q.statement || 'N/A'}</div>
                          <div className="text-xs text-slate-400 mt-2">{q.durationMs || 0}ms</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-sm text-slate-400 py-8">No DB queries captured</div>
                    )}
                  </div>
                )}

                {activeTab === 'ext' && (
                  <div className="space-y-2">
                    {detailExternalCalls.length > 0 ? (
                      detailExternalCalls.map((call: any, i: number) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">{call.method || 'GET'} {call.url || call.target || 'unknown'}</span>
                          </div>
                          <div className="text-xs text-slate-400">{call.durationMs || 0}ms — {call.statusCode || call.status || 'N/A'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-sm text-slate-400 py-8">No external API calls captured</div>
                    )}
                  </div>
                )}
              </div>

              {/* Request/Response Bodies */}
              {(detail.requestBody || detail.responseBody) && (
                <div className="border-t border-slate-200 bg-white shrink-0 max-h-48 overflow-y-auto">
                  <div className="px-6 py-3">
                    {detail.requestBody && (
                      <div className="mb-3">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Request Body</div>
                        <pre className="text-xs font-mono bg-slate-50 p-2 rounded text-slate-700 overflow-x-auto whitespace-pre-wrap">{safeJson(detail.requestBody)}</pre>
                      </div>
                    )}
                    {detail.responseBody && (
                      <div>
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Response Body</div>
                        <pre className="text-xs font-mono bg-slate-50 p-2 rounded text-slate-700 overflow-x-auto whitespace-pre-wrap">{safeJson(detail.responseBody)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              No detail data available
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
