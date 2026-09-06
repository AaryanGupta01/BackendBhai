import { SVC } from '@/data/mock';
import { durColor, statusClass, methodClass } from '@/utils/colors';
import { LatencyStealGauge } from './LatencyStealGauge';
import type { Request } from '@/types';
import styles from './TraceHero.module.css';

const TRACE_ID = '5b8efff798038103d269b633813fc60c';
const TRACE_ID_SHORT = '5b8efff7…c60c';

interface Props {
  request: Request;
  onCopyId: () => void;
  onViewLogs?: () => void;
}

export function TraceHero({ request, onCopyId }: Props) {
  const spans = 9;
  const isError = request.s >= 500;

  return (
    <div className={styles.hero}>
      {/* ── Top Primary Bar ── */}
      <div className={styles.top}>
        <span className={`mbadge m${methodClass(request.m)}`}>{request.m}</span>
        <span className={styles.path}>{request.p}</span>
        <span
          className={`${statusClass(request.s)}`}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}
        >
          {request.s} {isError ? 'Internal Error' : 'OK'}
        </span>

        <div className={styles.actions}>
          <div className={styles.traceIdPill} onClick={onCopyId} title={`Click to copy: ${TRACE_ID}`}>
            <span className={styles.traceLabel}>TRACE</span>
            <span className={styles.traceVal}>{TRACE_ID_SHORT}</span>
          </div>
          <button className={styles.actBtn} onClick={onCopyId}>Copy ID</button>
          <button className={styles.actBtnPrimary}>↺ Replay Request</button>
        </div>
      </div>

      {/* ── Sticky Latency Steal Gauge ── */}
      <LatencyStealGauge request={request} />

      {/* ── Sub-bar: Compact Trail Chips ── */}
      <div className={styles.metaRow}>
        <div className={styles.statChip}>
          <span className={styles.chipKey}>DURATION:</span>
          <span className={styles.chipVal} style={{ color: durColor(request.d) }}>{request.d}ms</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.chipKey}>TOTAL SPANS:</span>
          <span className={styles.chipVal}>{spans}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.chipKey}>SERVICES INVOLVED:</span>
          <span className={styles.chipVal}>{request.svcs.length}</span>
        </div>

        <div className={styles.serviceTrail}>
          {request.svcs.map((svc, i) => (
            <span key={svc} className={styles.svcTrailItem}>
              <span className={styles.svcDot} style={{ background: SVC[svc] ?? '#71717a' }} />
              <span style={{ color: svc === request.errorCulprit ? '#ef4444' : 'inherit', fontWeight: svc === request.errorCulprit ? 600 : 400 }}>
                {svc}
              </span>
              {i < request.svcs.length - 1 && <span className={styles.trailArrow}>→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
