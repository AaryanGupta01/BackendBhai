import { useState, useCallback, useMemo } from 'react';
import { Globe, Server, Shield, Box, Database, CreditCard } from 'lucide-react';

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
  type: 'client' | 'gateway' | 'service' | 'cache' | 'database' | 'external';
  layer: number;
  x: number;
  y: number;
  status: 'healthy' | 'error' | 'idle';
  lastLatencyMs?: number;
  icon: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  status: 'healthy' | 'error';
  isFlowing: boolean;
  latencyMs: number;
}

const getServiceMeta = (name: string) => {
  const n = name.toLowerCase();
  if (n === 'client') return { type: 'client' as const, layer: 0, icon: Globe };
  if (n.includes('gateway')) return { type: 'gateway' as const, layer: 1, icon: Server };
  if (n.includes('redis') || n.includes('cache')) return { type: 'cache' as const, layer: 3, icon: Database };
  if (n.includes('postgres') || n.includes('db')) return { type: 'database' as const, layer: 3, icon: Database };
  if (n.includes('payment') && n.includes('mock')) return { type: 'external' as const, layer: 3, icon: CreditCard };
  if (n.includes('auth')) return { type: 'service' as const, layer: 2, icon: Shield };
  if (n.includes('order')) return { type: 'service' as const, layer: 2, icon: Box };
  return { type: 'service' as const, layer: 2, icon: Server };
};

export function useDynamicTopology() {
  const [nodesMap, setNodesMap] = useState<Record<string, GraphNode>>({});
  const [edgesMap, setEdgesMap] = useState<Record<string, GraphEdge>>({});

  const processEvent = useCallback((event: ApiTelemetryEvent) => {
    const source = event.sourceService || 'client';
    const target = event.targetService;
    const isError = event.statusCode >= 400;

    setNodesMap(prev => {
      const next = { ...prev };
      
      if (!next[source]) {
        const meta = getServiceMeta(source);
        next[source] = {
          id: source, label: source, type: meta.type, layer: meta.layer, icon: meta.icon,
          x: 0, y: 0, status: 'healthy'
        };
      }
      
      if (!next[target]) {
        const meta = getServiceMeta(target);
        next[target] = {
          id: target, label: target, type: meta.type, layer: meta.layer, icon: meta.icon,
          x: 0, y: 0, status: isError ? 'error' : 'healthy', lastLatencyMs: event.durationMs
        };
      } else if (event.durationMs > 0) { // Only update if it's a real event, not static init
        next[target] = {
          ...next[target],
          lastLatencyMs: event.durationMs
        };
      }
      return next;
    });

    setEdgesMap(prev => {
      const edgeId = `${source}->${target}`;
      const existing = prev[edgeId];
      return {
        ...prev,
        [edgeId]: {
          id: edgeId,
          source,
          target,
          status: existing ? existing.status : (isError ? 'error' : 'healthy'),
          isFlowing: false,
          latencyMs: event.durationMs
        }
      };
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nodesList = Object.values(nodesMap);
    const edgesList = Object.values(edgesMap);

    const layers: Record<number, GraphNode[]> = {};
    nodesList.forEach(n => {
      if (!layers[n.layer]) layers[n.layer] = [];
      layers[n.layer].push(n);
    });

    const X_SPACING = 250;
    const Y_SPACING = 150;
    const BASE_X = 150;
    const CENTER_Y = 350;

    const layoutedNodes = nodesList.map(node => {
      const layerNodes = layers[node.layer];
      const index = layerNodes.findIndex(n => n.id === node.id);
      const totalInLayer = layerNodes.length;
      
      const x = BASE_X + (node.layer * X_SPACING);
      const startY = CENTER_Y - ((totalInLayer - 1) * Y_SPACING) / 2;
      const y = startY + (index * Y_SPACING);

      return { ...node, x, y };
    });

    return { nodes: layoutedNodes, edges: edgesList };
  }, [nodesMap, edgesMap]);

  const resetTopology = useCallback(() => {
    setNodesMap({});
    setEdgesMap({});
  }, []);

  return { nodes, edges, processEvent, resetTopology };
}
