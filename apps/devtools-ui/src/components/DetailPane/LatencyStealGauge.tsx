import { SVC } from '@/data/mock';
import type { Request } from '@/types';
import styles from './LatencyStealGauge.module.css';

interface Props {
  request: Request;
}

interface ServiceBreakdown {
  svc: string;
  duration: number;
  percentage: number;
  color: string;
  isCulprit: boolean;
}

export function LatencyStealGauge({ request }: Props) {
  const totalDuration = request.d || 5012;

  // Compute realistic service breakdown based on request
  const breakdown: ServiceBreakdown[] = (() => {
    if (request.s >= 500 && request.errorCulprit === 'mock-payment-api') {
      return [
        { svc: 'mock-payment-api', duration: 4700, percentage: 93.8, color: SVC['mock-payment-api'], isCulprit: true },
        { svc: 'order-service',    duration: 200,  percentage: 4.0,  color: SVC['order-service'],    isCulprit: false },
        { svc: 'auth-service',     duration: 112,  percentage: 2.2,  color: SVC['auth-service'],     isCulprit: false },
      ];
    }
    if (request.s >= 500 && request.errorCulprit === 'postgres') {
      return [
        { svc: 'postgres',      duration: 3000, percentage: 93.4, color: SVC['postgres'],      isCulprit: true },
        { svc: 'order-service', duration: 150,  percentage: 4.7,  color: SVC['order-service'], isCulprit: false },
        { svc: 'auth-service',  duration: 61,   percentage: 1.9,  color: SVC['auth-service'],  isCulprit: false },
      ];
    }
    // Normal healthy distribution
    return [
      { svc: 'payment-service', duration: Math.round(totalDuration * 0.65), percentage: 65, color: SVC['payment-service'], isCulprit: false },
      { svc: 'order-service',   duration: Math.round(totalDuration * 0.25), percentage: 25, color: SVC['order-service'],   isCulprit: false },
      { svc: 'auth-service',    duration: Math.round(totalDuration * 0.10), percentage: 10, color: SVC['auth-service'],    isCulprit: false },
    ];
  })();

  const culpritItem = breakdown.find((b) => b.isCulprit);

  return (
    <div className={styles.gaugeContainer}>
      <div className={styles.gaugeHeader}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>LATENCY DISTRIBUTION</span>
          <span className={styles.dotSep}>•</span>
          <span className={styles.totalDur}>{totalDuration}ms total</span>
        </div>

        {culpritItem && (
          <div className={styles.culpritCallout}>
            <span className={styles.flameIcon}>⚠️</span>
            <strong style={{ color: culpritItem.color }}>{culpritItem.percentage}% ({culpritItem.duration}ms)</strong>
            <span>stolen by</span>
            <strong className={styles.culpritName}>{culpritItem.svc}</strong>
          </div>
        )}
      </div>

      {/* ── Segmented Micro-Bar ── */}
      <div className={styles.barTrack}>
        {breakdown.map((item) => (
          <div
            key={item.svc}
            className={[styles.segment, item.isCulprit ? styles.culpritSegment : ''].join(' ')}
            style={{
              width: `${item.percentage}%`,
              backgroundColor: item.color,
            }}
            title={`${item.svc}: ${item.duration}ms (${item.percentage}%)`}
          />
        ))}
      </div>

      {/* ── Legend Chips ── */}
      <div className={styles.legendRow}>
        {breakdown.map((item) => (
          <div key={item.svc} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: item.color }} />
            <span className={styles.legendName}>{item.svc}</span>
            <span className={styles.legendPct}>{item.percentage}%</span>
            <span className={styles.legendDur}>({item.duration}ms)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
