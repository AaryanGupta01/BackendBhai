import { useState, useId } from 'react';
import { SVC } from '@/data/mock';
import { durColor } from '@/utils/colors';
import type { Span } from '@/types';
import styles from './WaterfallTab.module.css';

const TICKS = ['0ms', '1,000ms', '2,000ms', '3,000ms', '4,000ms', '5,012ms'];
const ROW_HEIGHT = 36; // px per row for exact SVG connection math

interface Props {
  spans: Span[];
  totalDuration: number;
}

export function WaterfallTab({ spans, totalDuration }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(7); // Default open to culprit mock-payment-api
  const filterId = useId();

  const toggle = (i: number) => setOpenIdx((prev) => (prev === i ? null : i));

  // Map each span ID to its row index
  const spanIndexMap: Record<string, number> = {};
  spans.forEach((s, idx) => {
    if (s.id) spanIndexMap[s.id] = idx;
  });

  return (
    <div className={styles.wrap}>
      {/* ── Time Ruler ── */}
      <div className={styles.ruler}>
        {TICKS.map((t) => (
          <span key={t} className={styles.tick}>{t}</span>
        ))}
      </div>
      <div className={styles.line} />

      {/* ── Waterfall Canvas with SVG Dependency Curves Overlay ── */}
      <div className={styles.waterfallContainer}>
        {/* SVG Layer for Glowing Bézier Dependency Lines */}
        <svg className={styles.svgOverlay} width="100%" height={spans.length * ROW_HEIGHT}>
          <defs>
            <filter id={`red-glow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.8" />
            </filter>
            <linearGradient id={`grad-error-${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
          </defs>

          {spans.map((child, childIdx) => {
            if (!child.parentId || spanIndexMap[child.parentId] === undefined) return null;
            const parentIdx = spanIndexMap[child.parentId];
            const parent = spans[parentIdx];

            // Calculate start coordinates for parent and child bars
            // Horizontal coordinates in percentage mapped into chart area
            const parentX = (parent.st / totalDuration) * 100;
            const childX = (child.st / totalDuration) * 100;

            const y1 = parentIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const y2 = childIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

            const isErrorConnector = child.err;

            // Render bezier curve inside the chart coordinate space
            return (
              <g key={`dep-${child.id || childIdx}`}>
                {/* Connector Path: Starts at parent bar left, curves to child bar left */}
                <path
                  d={`M ${parentX}% ${y1} C ${parentX}% ${(y1 + y2) / 2}, ${childX}% ${(y1 + y2) / 2}, ${childX}% ${y2}`}
                  fill="none"
                  stroke={isErrorConnector ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}
                  strokeWidth={isErrorConnector ? 2 : 1.2}
                  strokeDasharray={isErrorConnector ? 'none' : '3,3'}
                  filter={isErrorConnector ? `url(#red-glow-${filterId})` : undefined}
                  className={isErrorConnector ? styles.errorPathPulse : ''}
                />
                {/* Glowing junction dot at child */}
                <circle
                  cx={`${childX}%`}
                  cy={y2}
                  r={isErrorConnector ? 3.5 : 2}
                  fill={isErrorConnector ? '#ef4444' : 'rgba(255, 255, 255, 0.4)'}
                  filter={isErrorConnector ? `url(#red-glow-${filterId})` : undefined}
                />
              </g>
            );
          })}
        </svg>

        {/* ── Span Rows ── */}
        <div className={styles.rowsList}>
          {spans.map((span, i) => {
            const lp = (span.st / totalDuration) * 100;
            const wp = Math.max((span.d / totalDuration) * 100, 0.35);
            const col = SVC[span.svc] ?? '#71717a';
            const isOpen = openIdx === i;

            return (
              <div key={span.id || i}>
                <div
                  className={[
                    styles.row,
                    isOpen ? styles.open : '',
                    span.err ? styles.rowErr : '',
                  ].join(' ')}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => toggle(i)}
                >
                  {/* Left Label */}
                  <div className={styles.label}>
                    <div style={{ width: span.depth * 14, flexShrink: 0 }} />
                    <div className={styles.dot} style={{ background: col }} />
                    <div className={styles.nameGroup}>
                      <div className={styles.opNameRow}>
                        <span className={styles.opName}>{span.op}</span>
                        {span.err && <span className={styles.errTag}>503 TIMEOUT</span>}
                      </div>
                      <span className={styles.svcName} style={{ color: col }}>{span.svc}</span>
                    </div>
                  </div>

                  {/* Right Chart Area */}
                  <div className={styles.chart}>
                    <div
                      className={[styles.bar, span.err ? styles.barErr : ''].join(' ')}
                      style={{
                        left: `${lp}%`,
                        width: `${wp}%`,
                        backgroundColor: span.err ? '#ef4444' : col,
                        boxShadow: span.err ? '0 0 12px rgba(239, 68, 68, 0.5)' : undefined,
                      }}
                    >
                      {span.d > 250 && (
                        <span className={styles.barText}>{span.d}ms</span>
                      )}
                    </div>

                    {/* Floating Pinned Error Callout on timeline */}
                    {span.err && (
                      <div className={styles.errorPinCallout} style={{ left: `calc(${lp + wp}% + 6px)` }}>
                        <span className={styles.pinIcon}>💥</span>
                        <span className={styles.pinText}>503 Gateway Timeout (4.7s)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div className={`${styles.detail} ${span.err ? styles.detailErr : ''}`}>
                    <div className="kv">
                      <div className="kk">service</div>
                      <div className="kv-val" style={{ color: col, fontWeight: 600 }}>{span.svc}</div>
                      <div className="kk">operation</div>
                      <div className="kv-val">{span.op}</div>
                      <div className="kk">duration</div>
                      <div className="kv-val" style={{ color: durColor(span.d), fontWeight: 600 }}>
                        {span.d}ms — {((span.d / totalDuration) * 100).toFixed(1)}% of trace
                      </div>
                      <div className="kk">status</div>
                      <div className={`kv-val ${span.err ? 'red' : 'grn'}`}>
                        {span.err ? '⚠️ HTTP 503 (Upstream Gateway Timeout)' : '✓ OK (200)'}
                      </div>
                      <div className="kk">start_offset</div>
                      <div className="kv-val">+{span.st}ms</div>
                      {span.svc === 'mock-payment-api' && (
                        <>
                          <div className="kk">http.url</div>
                          <div className="kv-val blu">http://mock-payment-api:4000/charges</div>
                          <div className="kk">error.type</div>
                          <div className="kv-val red">UpstreamTimeoutException (Gateway timeout after 4,700ms)</div>
                          <div className="kk">cascade.action</div>
                          <div className="kv-val" style={{ color: '#fbbf24' }}>Triggered rollback in order-service</div>
                        </>
                      )}
                      {span.svc === 'postgres' && (
                        <>
                          <div className="kk">db.system</div>
                          <div className="kv-val">postgresql</div>
                          <div className="kk">db.name</div>
                          <div className="kv-val">ecommerce</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
