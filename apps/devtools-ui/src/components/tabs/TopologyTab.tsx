import { useEffect, useRef } from 'react';
import { SVC } from '@/data/mock';

const NODES = [
  { id: 'api-gateway',     x: 290, y: 36,  label: 'API Gateway',     col: SVC['api-gateway'] || '#6366f1' },
  { id: 'auth-service',    x: 90,  y: 130, label: 'Auth Service',    col: SVC['auth-service'] || '#22c55e' },
  { id: 'order-service',   x: 290, y: 130, label: 'Order Service',   col: SVC['order-service'] || '#38bdf8' },
  { id: 'payment-service', x: 470, y: 130, label: 'Payment Service', col: SVC['payment-service'] || '#ec4899' },
  { id: 'postgres',        x: 170, y: 230, label: 'PostgreSQL',      col: SVC['postgres'] || '#a855f7' },
  { id: 'redis',           x: 310, y: 230, label: 'Redis',           col: SVC['redis'] || '#f97316' },
  { id: 'mock-payment-api',x: 470, y: 230, label: 'Mock Payment',    col: SVC['mock-payment-api'] || '#ef4444' },
];

const EDGES = [
  { a: 'api-gateway',     b: 'auth-service',    err: false },
  { a: 'api-gateway',     b: 'order-service',   err: false },
  { a: 'order-service',   b: 'payment-service', err: false },
  { a: 'order-service',   b: 'postgres',        err: false },
  { a: 'order-service',   b: 'redis',           err: false },
  { a: 'payment-service', b: 'mock-payment-api',err: true  },
  { a: 'payment-service', b: 'postgres',        err: false },
];

export function TopologyTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const draw = () => {
      const el = containerRef.current;
      const svg = svgRef.current;
      if (!el || !svg) return;
      const W = el.offsetWidth || 580;
      const H = el.offsetHeight || 300;
      const sx = W / 580;
      const sy = H / 300;

      const nm: Record<string, (typeof NODES)[0]> = {};
      NODES.forEach((n) => (nm[n.id] = n));

      // Clear SVG children
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // Defs for glowing effects
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', 'topo-glow');
      const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
      feDropShadow.setAttribute('dx', '0');
      feDropShadow.setAttribute('dy', '0');
      feDropShadow.setAttribute('stdDeviation', '4');
      feDropShadow.setAttribute('flood-color', '#ef4444');
      feDropShadow.setAttribute('flood-opacity', '0.7');
      filter.appendChild(feDropShadow);
      defs.appendChild(filter);
      svg.appendChild(defs);

      // Edges
      EDGES.forEach((e) => {
        const a = nm[e.a], b = nm[e.b];
        const x1 = a.x * sx, y1 = (a.y + 14) * sy, x2 = b.x * sx, y2 = b.y * sy;
        const my = (y1 + y2) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', e.err ? '#ef4444' : 'rgba(255, 255, 255, 0.1)');
        path.setAttribute('stroke-width', e.err ? '2' : '1.2');
        if (e.err) {
          path.setAttribute('stroke-dasharray', '5,3');
          path.setAttribute('filter', 'url(#topo-glow)');
        }
        svg.appendChild(path);
      });

      // Nodes
      NODES.forEach((n) => {
        const x = n.x * sx, y = n.y * sy;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x - 50));
        rect.setAttribute('y', String(y - 14));
        rect.setAttribute('width', '100');
        rect.setAttribute('height', '28');
        rect.setAttribute('rx', '6');
        rect.setAttribute('fill', n.id === 'mock-payment-api' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)');
        rect.setAttribute('stroke', n.id === 'mock-payment-api' ? '#ef4444' : n.col);
        rect.setAttribute('stroke-width', n.id === 'mock-payment-api' ? '2' : '1.2');
        if (n.id === 'mock-payment-api') {
          rect.setAttribute('filter', 'url(#topo-glow)');
        }

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(y + 4));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', n.id === 'mock-payment-api' ? '#f87171' : n.col);
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '600');
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.textContent = n.label + (n.id === 'mock-payment-api' ? ' ⚠️' : '');

        g.appendChild(rect);
        g.appendChild(text);
        svg.appendChild(g);
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg)' }}>
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  );
}
