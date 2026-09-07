import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

// --- 1. Types & Interfaces ---

export interface ApiTelemetryEvent {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  statusCode: number;
  durationMs: number;
  sourceService?: string;
  targetService: string;
  timestamp: number;
  stackTrace?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'client' | 'gateway' | 'service' | 'cache' | 'database';
  layer: number;
  x: number;
  y: number;
  status: 'healthy' | 'error' | 'idle';
  lastLatencyMs?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  status: 'healthy' | 'error';
  isFlowing: boolean;
  latencyMs: number;
}

// --- 2. Custom Hook for Auto-Discovery & Layout ---

export function useDynamicTopology(containerWidth: number, containerHeight: number) {
  const [nodesMap, setNodesMap] = useState<Record<string, Omit<GraphNode, 'x' | 'y'>>>({});
  const [edgesMap, setEdgesMap] = useState<Record<string, GraphEdge>>({});
  
  const flowTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const getLayerForType = (type: string) => {
    switch (type) {
      case 'client': return 0;
      case 'gateway': return 1;
      case 'service': return 2;
      case 'database':
      case 'cache': return 3;
      default: return 2;
    }
  };

  const handleApiEvent = useCallback((event: ApiTelemetryEvent) => {
    setNodesMap(prev => {
      const next = { ...prev };

      // 1. Ensure Client Node
      if (!next['client']) {
        next['client'] = { id: 'client', label: 'Client', type: 'client', layer: 0, status: 'healthy' };
      }

      // 2. Ensure Source Node
      const srcId = event.sourceService || 'api-gateway';
      if (!next[srcId]) {
        next[srcId] = { 
          id: srcId, 
          label: srcId, 
          type: srcId.includes('gateway') ? 'gateway' : 'service', 
          layer: 1, 
          status: 'healthy' 
        };
      }

      // 3. Ensure Target Node
      const tgtId = event.targetService;
      if (!next[tgtId]) {
        let type: GraphNode['type'] = 'service';
        if (tgtId.includes('db') || tgtId.includes('postgres')) type = 'database';
        if (tgtId.includes('redis') || tgtId.includes('cache')) type = 'cache';
        
        next[tgtId] = { 
          id: tgtId, 
          label: tgtId, 
          type, 
          layer: getLayerForType(type), 
          status: event.statusCode >= 400 ? 'error' : 'healthy' 
        };
      } else {
        if (event.statusCode >= 400) {
          next[tgtId] = { ...next[tgtId], status: 'error' };
        }
      }

      return next;
    });

    setEdgesMap(prev => {
      const next = { ...prev };
      const srcId = event.sourceService || 'api-gateway';
      const tgtId = event.targetService;
      
      const edge1Id = `client->${srcId}`;
      const edge2Id = `${srcId}->${tgtId}`;
      
      const st = event.statusCode >= 400 ? 'error' : 'healthy';

      next[edge1Id] = {
        id: edge1Id, source: 'client', target: srcId,
        status: 'healthy', latencyMs: 10, isFlowing: true
      };

      next[edge2Id] = {
        id: edge2Id, source: srcId, target: tgtId,
        status: st, latencyMs: event.durationMs, isFlowing: true
      };

      [edge1Id, edge2Id].forEach(eId => {
        if (flowTimers.current[eId]) clearTimeout(flowTimers.current[eId]);
        flowTimers.current[eId] = setTimeout(() => {
          setEdgesMap(curr => {
            if (!curr[eId]) return curr;
            return { ...curr, [eId]: { ...curr[eId], isFlowing: false } };
          });
        }, 2000);
      });

      return next;
    });
  }, []);

  const resetTopology = useCallback(() => {
    setNodesMap({});
    setEdgesMap({});
    Object.values(flowTimers.current).forEach(clearTimeout);
    flowTimers.current = {};
  }, []);

  const laidOutNodes = useMemo(() => {
    const nodeArray = Object.values(nodesMap) as GraphNode[];
    if (containerWidth === 0 || containerHeight === 0) return nodeArray;

    const layerGroups: Record<number, GraphNode[]> = {};
    let maxLayer = 0;

    nodeArray.forEach(n => {
      if (!layerGroups[n.layer]) layerGroups[n.layer] = [];
      layerGroups[n.layer].push(n);
      if (n.layer > maxLayer) maxLayer = n.layer;
    });

    const colWidth = containerWidth / (maxLayer + 2);

    return nodeArray.map(n => {
      const group = layerGroups[n.layer];
      const idx = group.findIndex(gn => gn.id === n.id);
      const rowHeight = containerHeight / (group.length + 1);
      
      return {
        ...n,
        x: colWidth * (n.layer + 1),
        y: rowHeight * (idx + 1)
      };
    });
  }, [nodesMap, containerWidth, containerHeight]);

  const edgeArray = Object.values(edgesMap);

  return { nodes: laidOutNodes, edges: edgeArray, handleApiEvent, resetTopology };
}

// --- 3. React Component ---

export function TopologyTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, edges, handleApiEvent, resetTopology } = useDynamicTopology(dimensions.w, dimensions.h);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setDimensions({
        w: entries[0].contentRect.width,
        h: entries[0].contentRect.height
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const activeNodes = new Set<string>();
  if (hoveredNode) {
    activeNodes.add(hoveredNode);
    edges.forEach(e => {
      if (e.source === hoveredNode) activeNodes.add(e.target);
      if (e.target === hoveredNode) activeNodes.add(e.source);
    });
  }

  const getTopColor = (type: string) => {
    switch(type) {
      case 'client': return '#2563eb';
      case 'gateway': return '#9333ea';
      case 'service': return 'var(--color-earth-success, #47E03F)';
      case 'cache': 
      case 'database': return '#d97706';
      default: return 'var(--color-earth-border, #EFEBE4)';
    }
  };

  const simulateCheckout = () => {
    const now = Date.now();
    handleApiEvent({ id: `c1-${now}`, endpoint: '/api/checkout', method: 'POST', statusCode: 200, durationMs: 120, targetService: 'order-service', timestamp: now });
    setTimeout(() => handleApiEvent({ id: `c2-${now}`, endpoint: '/db/insert', method: 'POST', statusCode: 200, durationMs: 45, sourceService: 'order-service', targetService: 'postgres-db', timestamp: now+120 }), 300);
  };

  const simulatePaymentFailure = () => {
    const now = Date.now();
    handleApiEvent({ id: `p1-${now}`, endpoint: '/api/payment', method: 'POST', statusCode: 500, durationMs: 300, targetService: 'payment-service', timestamp: now });
    setTimeout(() => handleApiEvent({ id: `p2-${now}`, endpoint: '/mock/charge', method: 'POST', statusCode: 503, durationMs: 250, sourceService: 'payment-service', targetService: 'mock-payment-api', timestamp: now+300 }), 300);
  };

  const simulateProfile = () => {
    const now = Date.now();
    handleApiEvent({ id: `u1-${now}`, endpoint: '/api/profile', method: 'GET', statusCode: 200, durationMs: 50, targetService: 'user-service', timestamp: now });
    setTimeout(() => handleApiEvent({ id: `u2-${now}`, endpoint: '/cache/get', method: 'GET', statusCode: 200, durationMs: 5, sourceService: 'user-service', targetService: 'redis-cache', timestamp: now+50 }), 300);
  };

  return (
    <div 
      className="relative w-full h-full min-h-[400px] overflow-hidden bg-[var(--color-earth-base,#FDFBF7)] text-[var(--color-earth-text,#2D241B)] font-sans rounded-md"
      ref={containerRef}
    >
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-earth-muted,#8C8276)] z-0">
          <div className="text-4xl opacity-30 mb-2">🕸️</div>
          <span className="font-medium text-sm">Waiting for telemetry data...</span>
        </div>
      )}

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <style>
          {`
            @keyframes flow_2s_linear_infinite {
              from { stroke-dashoffset: 150; }
              to { stroke-dashoffset: 0; }
            }
          `}
        </style>
        {edges.map((edge) => {
          const src = nodes.find(n => n.id === edge.source);
          const tgt = nodes.find(n => n.id === edge.target);
          if (!src || !tgt || src.x === undefined || tgt.x === undefined) return null;

          const isDimmed = hoveredNode && edge.source !== hoveredNode && edge.target !== hoveredNode;
          const pathD = `M ${src.x},${src.y} C ${src.x + 80},${src.y} ${tgt.x - 80},${tgt.y} ${tgt.x},${tgt.y}`;

          const strokeColor = edge.status === 'error' 
            ? 'stroke-[var(--color-earth-error,#E01627)]' 
            : edge.isFlowing ? 'stroke-[var(--color-earth-success,#47E03F)]' : 'stroke-[var(--color-earth-border,#EFEBE4)]';

          return (
            <path
              key={edge.id}
              d={pathD}
              fill="none"
              strokeWidth="2.5"
              className={`transition-all duration-300 ease-in-out ${strokeColor} ${isDimmed ? 'opacity-15' : 'opacity-100'}`}
              style={{
                strokeDasharray: edge.isFlowing ? '50 100' : 'none',
                animation: edge.isFlowing ? 'flow_2s_linear_infinite 2s linear infinite' : 'none'
              }}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 z-20 pointer-events-none">
        {nodes.map(node => {
          if (node.x === undefined) return null;
          const isDimmed = hoveredNode && !activeNodes.has(node.id);

          return (
            <div
              key={node.id}
              className={`
                absolute transition-all duration-500 ease-in-out -translate-x-1/2 -translate-y-1/2
                bg-[var(--color-earth-base,#FDFBF7)] border rounded-lg p-3 min-w-[120px]
                flex flex-col items-center gap-1 cursor-pointer pointer-events-auto
                hover:-translate-y-[52%]
                ${isDimmed ? 'opacity-20' : 'opacity-100 shadow-sm hover:shadow-md'}
                ${node.status === 'error' 
                    ? 'border-[var(--color-earth-error,#E01627)] shadow-[0_0_12px_rgba(224,22,39,0.15)]' 
                    : 'border-[var(--color-earth-border,#EFEBE4)]'
                }
              `}
              style={{
                left: node.x,
                top: node.y,
                borderTopWidth: '4px',
                borderTopStyle: 'solid',
                borderTopColor: getTopColor(node.type)
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="font-semibold text-xs text-[var(--color-earth-text,#2D241B)]">
                {node.label}
              </div>
              <div className="text-[10px] text-[var(--color-earth-muted,#8C8276)] uppercase tracking-wider font-mono">
                {node.type}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-5 right-5 z-50 flex items-center gap-3 bg-[var(--color-earth-base,#FDFBF7)] p-3 border border-[var(--color-earth-border,#EFEBE4)] rounded-lg shadow-sm">
        <div className="text-[10px] font-semibold text-[var(--color-earth-muted,#8C8276)] uppercase pr-1">
          Simulate API
        </div>
        <button onClick={simulateCheckout} className="px-3 py-1.5 text-[11px] font-semibold border border-[var(--color-earth-border,#EFEBE4)] rounded-md hover:bg-[var(--color-earth-border,#EFEBE4)] transition-colors">
          Checkout (200)
        </button>
        <button onClick={simulatePaymentFailure} className="px-3 py-1.5 text-[11px] font-semibold text-[var(--color-earth-error,#E01627)] border border-[var(--color-earth-error,#E01627)] bg-[rgba(224,22,39,0.05)] rounded-md hover:bg-[rgba(224,22,39,0.1)] transition-colors">
          Payment (503)
        </button>
        <button onClick={simulateProfile} className="px-3 py-1.5 text-[11px] font-semibold border border-[var(--color-earth-border,#EFEBE4)] rounded-md hover:bg-[var(--color-earth-border,#EFEBE4)] transition-colors">
          Profile (200)
        </button>
        <div className="w-[1px] h-5 bg-[var(--color-earth-border,#EFEBE4)] mx-1"></div>
        <button onClick={resetTopology} className="px-3 py-1.5 text-[11px] font-semibold text-[var(--color-earth-muted,#8C8276)] border border-[var(--color-earth-border,#EFEBE4)] rounded-md hover:text-[var(--color-earth-text,#2D241B)] transition-colors">
          Clear
        </button>
      </div>
    </div>
  );
}
