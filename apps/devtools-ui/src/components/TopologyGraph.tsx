import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface TopoNode {
  id: string;
  label: string;
  request_count: string | number;
  error_count: string | number;
  avg_duration_ms: string | number;
}

interface TopoEdge {
  source: string;
  target: string;
  request_count: string | number;
  error_count: string | number;
  avg_duration_ms: string | number;
  edge_type?: string;
}

interface TopoData {
  nodes: TopoNode[];
  edges: TopoEdge[];
}

// Service colors
const SVC_COLORS: Record<string, string> = {
  'api-gateway': '#3b82f6',
  'auth-service': '#8b5cf6',
  'order-service': '#f59e0b',
  'payment-service': '#ef4444',
  'postgres': '#10b981',
  'redis': '#f97316',
  'mock-payment-api': '#a855f7',
};

function getNodeColor(id: string): string {
  return SVC_COLORS[id] || '#6b7280';
}

function getNodeShape(id: string): 'rect' | 'cylinder' | 'diamond' | 'hexagon' {
  if (id === 'postgres') return 'cylinder';
  if (id === 'redis') return 'diamond';
  if (id.includes('mock') || id.includes('external')) return 'hexagon';
  return 'rect';
}

function getEdgeColor(edge: TopoEdge): string {
  if (edge.edge_type === 'database') return '#34d399';
  if (edge.edge_type === 'http') return '#a78bfa';
  return '#60a5fa';
}

// Layout positions (pre-computed for our known services)
function computeLayout(nodes: TopoNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const W = 600, H = 350;
  
  // Known layout for our services
  const knownLayout: Record<string, { x: number; y: number }> = {
    'api-gateway': { x: W / 2, y: 50 },
    'auth-service': { x: W / 4, y: 150 },
    'order-service': { x: W / 2, y: 150 },
    'payment-service': { x: (3 * W) / 4, y: 150 },
    'postgres': { x: W / 3, y: 270 },
    'redis': { x: W / 2, y: 270 },
    'mock-payment-api': { x: (3 * W) / 4, y: 270 },
  };

  nodes.forEach((n, i) => {
    if (knownLayout[n.id]) {
      positions.set(n.id, knownLayout[n.id]);
    } else {
      // Auto-layout for unknown services
      const angle = (2 * Math.PI * i) / nodes.length;
      positions.set(n.id, {
        x: W / 2 + 180 * Math.cos(angle),
        y: H / 2 + 120 * Math.sin(angle),
      });
    }
  });

  return positions;
}

function drawNodeShape(
  svg: SVGSVGElement,
  x: number, y: number,
  color: string,
  shape: string,
  nodeId: string,
  label: string,
  reqCount: number,
  avgDur: number,
  errorCount: number
) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'topo-node');
  g.style.cursor = 'pointer';

  const hasErrors = errorCount > 0;

  if (shape === 'cylinder') {
    // Database cylinder
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x - 45));
    rect.setAttribute('y', String(y - 20));
    rect.setAttribute('width', '90');
    rect.setAttribute('height', '40');
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', `${color}15`);
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', '1.5');
    g.appendChild(rect);
    
    // Cylinder top ellipse
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.setAttribute('cx', String(x));
    ellipse.setAttribute('cy', String(y - 20));
    ellipse.setAttribute('rx', '45');
    ellipse.setAttribute('ry', '8');
    ellipse.setAttribute('fill', 'none');
    ellipse.setAttribute('stroke', color);
    ellipse.setAttribute('stroke-width', '1.5');
    g.appendChild(ellipse);
  } else if (shape === 'diamond') {
    // Cache diamond
    const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    diamond.setAttribute('points', `${x},${y - 22} ${x + 40},${y} ${x},${y + 22} ${x - 40},${y}`);
    diamond.setAttribute('fill', `${color}15`);
    diamond.setAttribute('stroke', color);
    diamond.setAttribute('stroke-width', '1.5');
    g.appendChild(diamond);
  } else if (shape === 'hexagon') {
    // External hexagon
    const hex = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const r = 25;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`;
    }).join(' ');
    hex.setAttribute('points', pts);
    hex.setAttribute('fill', `${color}15`);
    hex.setAttribute('stroke', hasErrors ? '#ef4444' : color);
    hex.setAttribute('stroke-width', hasErrors ? '2' : '1.5');
    if (hasErrors) hex.setAttribute('filter', 'url(#error-glow)');
    g.appendChild(hex);
  } else {
    // Service rounded rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x - 50));
    rect.setAttribute('y', String(y - 18));
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '36');
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', `${color}15`);
    rect.setAttribute('stroke', hasErrors ? '#ef4444' : color);
    rect.setAttribute('stroke-width', hasErrors ? '2' : '1.5');
    if (hasErrors) rect.setAttribute('filter', 'url(#error-glow)');
    g.appendChild(rect);
  }

  // Service name
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', String(x));
  text.setAttribute('y', String(y + 4));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('fill', color);
  text.setAttribute('font-size', '11');
  text.setAttribute('font-weight', '600');
  text.setAttribute('font-family', 'Inter, sans-serif');
  text.textContent = label;
  g.appendChild(text);

  // Stats below node
  const stats = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  stats.setAttribute('x', String(x));
  stats.setAttribute('y', String(y + 34));
  stats.setAttribute('text-anchor', 'middle');
  stats.setAttribute('fill', '#71717a');
  stats.setAttribute('font-size', '9');
  stats.setAttribute('font-family', 'Inter, sans-serif');
  stats.textContent = `${reqCount} reqs · ${avgDur}ms avg`;
  g.appendChild(stats);

  svg.appendChild(g);
}

function drawEdge(
  svg: SVGSVGElement,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  edgeType: string,
  reqCount: number,
  avgDur: number
) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // Bezier curve
  const my = (y1 + y2) / 2;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-opacity', '0.7');
  if (edgeType === 'database') path.setAttribute('stroke-dasharray', '4,3');
  g.appendChild(path);

  // Arrowhead
  const arrowSize = 6;
  const angle = Math.atan2(y2 - my, x2 - x2); // vertical
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const ax = x2, ay = y2 - 2;
  arrow.setAttribute('points', `${ax},${ay - arrowSize} ${ax - arrowSize / 2},${ay} ${ax + arrowSize / 2},${ay}`);
  arrow.setAttribute('fill', color);
  arrow.setAttribute('fill-opacity', '0.7');
  g.appendChild(arrow);

  // Edge label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 8;
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', String(midX));
  label.setAttribute('y', String(midY));
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('fill', '#71717a');
  label.setAttribute('font-size', '8');
  label.setAttribute('font-family', 'JetBrains Mono, monospace');
  label.textContent = `${reqCount} · ${Math.round(avgDur)}ms`;
  g.appendChild(label);

  svg.appendChild(g);
}

export function TopologyGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<TopoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/topology');
      const json = await res.json();
      setData(json.data?.data || json.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    const el = containerRef.current;
    const W = el.offsetWidth || 600;
    const H = el.offsetHeight || 350;

    // Scale to fit container
    const sx = W / 600;
    const sy = H / 350;

    // Clear SVG
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Defs for error glow
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'error-glow');
    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '0');
    feDropShadow.setAttribute('dy', '0');
    feDropShadow.setAttribute('stdDeviation', '4');
    feDropShadow.setAttribute('flood-color', '#ef4444');
    feDropShadow.setAttribute('flood-opacity', '0.7');
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Main group with scale
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.setAttribute('transform', `scale(${sx},${sy})`);

    const positions = computeLayout(data.nodes);
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));

    // Draw edges first (behind nodes)
    data.edges.forEach(edge => {
      const from = positions.get(edge.source);
      const to = positions.get(edge.target);
      if (!from || !to) return;

      const color = getEdgeColor(edge);
      drawEdge(
        mainGroup, from.x, from.y, to.x, to.y,
        color, edge.edge_type || 'service',
        Number(edge.request_count) || 0,
        Number(edge.avg_duration_ms) || 0
      );
    });

    // Draw nodes
    data.nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const color = getNodeColor(node.id);
      const shape = getNodeShape(node.id);

      drawNodeShape(
        mainGroup, pos.x, pos.y, color, shape,
        node.id, node.label,
        Number(node.request_count) || 0,
        Math.round(Number(node.avg_duration_ms) || 0),
        Number(node.error_count) || 0
      );
    });

    svg.appendChild(mainGroup);
  }, [data, selectedNode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Failed to load topology: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="12" r="3" /><circle cx="19" cy="6" r="3" /><circle cx="19" cy="18" r="3" />
            <line x1="8" y1="12" x2="16" y2="6" /><line x1="8" y1="12" x2="16" y2="18" />
          </svg>
          Service Topology
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{data?.nodes?.length || 0} services</span>
          <span>{data?.edges?.length || 0} edges</span>
          <button onClick={fetchData} className="p-1 hover:bg-slate-200 rounded transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative bg-white">
        <svg ref={svgRef} width="100%" height="100%" />
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-blue-400 inline-block" /> HTTP
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-emerald-400 inline-block" style={{ borderTop: '1px dashed #34d399' }} /> SQL
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue-500/15 border border-blue-500 inline-block" /> Service
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-emerald-500/15 border border-emerald-500 inline-block" /> Database
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rotate-45 bg-amber-500/15 border border-amber-500 inline-block" /> Cache
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500/15 border border-red-500 inline-block" /> External
        </span>
      </div>
    </div>
  );
}
