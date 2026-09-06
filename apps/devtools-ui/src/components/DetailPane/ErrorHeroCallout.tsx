import { SVC } from '@/data/mock';
import type { Request } from '@/types';
import styles from './ErrorHeroCallout.module.css';

interface Props {
  request: Request;
  onCopyId: () => void;
  onViewLogs?: () => void;
}

export function ErrorHeroCallout({ request, onCopyId, onViewLogs }: Props) {
  if (request.s < 500) return null;

  const culprit = request.errorCulprit || 'mock-payment-api';
  const culpritColor = SVC[culprit] || '#dc2626';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.badge}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 1.5l6.5 12h-13L8 1.5z" strokeLinejoin="round" />
            <path d="M8 6v3.5M8 12v.5" strokeLinecap="round" />
          </svg>
          ROOT CAUSE DETECTED
        </div>
        <span className={styles.errorTitle}>
          {request.s === 503 ? '503 Service Unavailable' : '500 Upstream Internal Failure'}
        </span>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={onCopyId} title="Copy Trace ID">
            Copy Trace ID
          </button>
          {onViewLogs && (
            <button className={styles.actionBtnPrimary} onClick={onViewLogs}>
              View Failing Logs
            </button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.culpritRow}>
          <span className={styles.culpritLabel}>Failing Component:</span>
          <span className={styles.culpritChip} style={{ borderColor: `${culpritColor}40`, color: culpritColor }}>
            <span className={styles.culpritDot} style={{ background: culpritColor }} />
            {culprit}
          </span>
          <span className={styles.culpritPath}>
            {culprit === 'mock-payment-api' ? 'POST http://mock-payment-api:4000/charges' : 'postgresql://ecommerce (connection timed out)'}
          </span>
        </div>

        <div className={styles.description}>
          {request.errorMessage || (
            culprit === 'mock-payment-api'
              ? 'Upstream payment gateway timed out after 4,700ms (took 94% of entire request). Triggered 500 cascade to order-service and executed DB rollback.'
              : 'Service failed while communicating with downstream dependency.'
          )}
        </div>

        <div className={styles.cascadeFlow}>
          <div className={styles.flowStep}>
            <span className={styles.flowNumber}>1</span>
            <span>API Gateway routed to Order Service</span>
          </div>
          <span className={styles.flowArrow}>→</span>
          <div className={styles.flowStep}>
            <span className={styles.flowNumber}>2</span>
            <span>Order Service called Payment Service</span>
          </div>
          <span className={styles.flowArrow}>→</span>
          <div className={`${styles.flowStep} ${styles.flowFailed}`}>
            <span className={styles.flowNumberFailed}>3</span>
            <span><strong>{culprit}</strong> returned {request.s === 503 ? '503' : '500'}</span>
          </div>
          <span className={styles.flowArrow}>→</span>
          <div className={`${styles.flowStep} ${styles.flowRollback}`}>
            <span className={styles.flowNumber}>4</span>
            <span>Order Rolled Back</span>
          </div>
        </div>
      </div>
    </div>
  );
}
