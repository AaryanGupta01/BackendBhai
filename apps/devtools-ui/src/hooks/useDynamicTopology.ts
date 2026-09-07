import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Server, Shield, Box, Database, CreditCard, Layers } from 'lucide-react';
import {
  fetchTopology,
  fetchTracePath,
  TopologyEdge,
  TopologyNode,
  TracePathStep
} from '../api/client';

// Presentation only: which glyph represents each telemetry-derived kind. The kind
// itself comes from span attributes at ingest, so no service name is interpreted here.
const KIND_ICONS: Record<string, any> = {
  gateway: Server,
  service: Box,
  database: Database,
  cache: Layers,
  queue: Layers,
  external: CreditCard,
  client: Globe
};

const FALLBACK_ICON = Shield;

// Layout constants. These are presentation, not data.
// Wide enough that an edge label fits in the gap between two node cards (192px wide).
const X_SPACING = 340;
// Node cards are ~132px tall; this leaves room for an edge label to pass between
// two nodes in the same layer without landing on either card.
const Y_SPACING = 205;
const BASE_X = 150;
const CENTER_Y = 330;

export interface GraphNode extends TopologyNode {
  x: number;
  y: number;
  layer: number;
  icon: any;
  /**
   * Traffic measured from the caller's side. Infrastructure a product depends on but
   * does not instrument — a database, a cache, a third-party API — emits no server
   * spans of its own, so its own span count is zero even under heavy load. The
   * callers' client spans are the only record that exists of how busy it is.
   */
  inboundCalls: number;
  inboundAvgMs: number;
  inboundErrors: number;
  /** Populated only while a trace is selected. */
  traceTotalMs?: number;
  traceSelfMs?: number;
  traceStatus?: 'ok' | 'error';
}

export interface GraphEdge extends TopologyEdge {
  id: string;
  /** True when this edge took part in the currently selected trace. */
  inSelectedTrace: boolean;
  status: 'healthy' | 'error';
}

/**
 * Assigns a depth to every node from the shape of the graph: nodes nothing calls sit
 * at layer 0, and each edge pushes its target one layer right. Cycles are tolerated by
 * refusing to revisit a node, so a call loop cannot spin forever.
 */
function computeLayers(nodes: TopologyNode[], edges: TopologyEdge[]): Record<string, number> {
  const ids = new Set(nodes.map((n) => n.id));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  ids.forEach((id) => {
    incoming.set(id, 0);
    outgoing.set(id, []);
  });
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
    outgoing.get(e.source)!.push(e.target);
  }

  const layer: Record<string, number> = {};
  const roots = Array.from(ids).filter((id) => (incoming.get(id) || 0) === 0);
  // A fully cyclic graph has no root; fall back to the first node so nothing is dropped.
  const queue = roots.length > 0 ? roots : Array.from(ids).slice(0, 1);
  queue.forEach((id) => (layer[id] = 0));

  const visited = new Set(queue);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of outgoing.get(current) || []) {
      const candidate = (layer[current] ?? 0) + 1;
      if (layer[next] === undefined || candidate > layer[next]) layer[next] = candidate;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  // Anything unreachable (observed only as an isolated node) still needs a position.
  ids.forEach((id) => {
    if (layer[id] === undefined) layer[id] = 0;
  });
  return layer;
}

export function useDynamicTopology() {
  const [snapshot, setSnapshot] = useState<{ nodes: TopologyNode[]; edges: TopologyEdge[] }>({
    nodes: [],
    edges: []
  });
  const [tracePath, setTracePath] = useState<TracePathStep[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await fetchTopology());
    } catch (err: any) {
      setError(err?.message || 'Could not load topology');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectTrace = useCallback(async (traceId: string | null) => {
    if (!traceId) {
      setTracePath(null);
      return;
    }
    try {
      const result = await fetchTracePath(traceId);
      setTracePath(result.path);
    } catch {
      // A trace whose spans have not landed yet simply has no overlay.
      setTracePath(null);
    }
  }, []);

  const { nodes, edges } = useMemo(() => {
    const layers = computeLayers(snapshot.nodes, snapshot.edges);
    const byLayer: Record<number, string[]> = {};
    snapshot.nodes.forEach((n) => {
      const l = layers[n.id] ?? 0;
      (byLayer[l] = byLayer[l] || []).push(n.id);
    });

    const stepByService = new Map<string, TracePathStep>();
    (tracePath || []).forEach((s) => stepByService.set(s.serviceName, s));

    const laidOut: GraphNode[] = snapshot.nodes.map((n) => {
      const layer = layers[n.id] ?? 0;
      const peers = byLayer[layer];
      const index = peers.indexOf(n.id);
      const startY = CENTER_Y - ((peers.length - 1) * Y_SPACING) / 2;
      const step = stepByService.get(n.id);

      // Roll up what the callers recorded, so uninstrumented dependencies still
      // report the load they are actually under.
      const inbound = snapshot.edges.filter((e) => e.target === n.id);
      const inboundCalls = inbound.reduce((sum, e) => sum + e.requestCount, 0);
      const inboundErrors = inbound.reduce((sum, e) => sum + e.errorCount, 0);
      const inboundAvgMs = inboundCalls
        ? Math.round(inbound.reduce((sum, e) => sum + e.avgDurationMs * e.requestCount, 0) / inboundCalls)
        : 0;

      return {
        ...n,
        inboundCalls,
        inboundErrors,
        inboundAvgMs,
        layer,
        x: BASE_X + layer * X_SPACING,
        y: startY + index * Y_SPACING,
        icon: KIND_ICONS[n.kind || ''] || FALLBACK_ICON,
        traceTotalMs: step?.totalDurationMs,
        traceSelfMs: step?.selfTimeMs,
        traceStatus: step?.status
      };
    });

    // An edge belongs to the selected trace when both of its endpoints appear in that
    // trace. Derived from recorded participants rather than guessed from the URL.
    const traceServices = new Set(stepByService.keys());
    const laidOutEdges: GraphEdge[] = snapshot.edges.map((e) => ({
      ...e,
      id: `${e.source}->${e.target}`,
      inSelectedTrace: traceServices.has(e.source) && traceServices.has(e.target),
      status: e.errorCount > 0 ? 'error' : 'healthy'
    }));

    return { nodes: laidOut, edges: laidOutEdges };
  }, [snapshot, tracePath]);

  return { nodes, edges, refresh, selectTrace, loading, error, hasTracePath: tracePath !== null };
}
