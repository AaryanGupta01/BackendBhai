import styles from './TopBar.module.css';

interface Props {
  onOpenPalette: () => void;
  errorCount?: number;
  totalCount?: number;
}

export function TopBar({ onOpenPalette, errorCount = 3, totalCount = 15 }: Props) {
  const errorRate = Math.round((errorCount / totalCount) * 100);

  return (
    <header className={styles.top}>
      <div className={styles.logo}>
        <div className={styles.logoMark}>
          <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.6" width="13" height="13">
            <path d="M2.5 4h11M2.5 8h7M2.5 12h5" strokeLinecap="round" />
            <circle cx="12" cy="10" r="2.5" strokeWidth="1.5" />
            <path d="M14 12l1.5 1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className={styles.brandGroup}>
          <span className={styles.logoName}>
            Backend<strong>Bhai</strong>
          </span>
          <span className={styles.logoBadge}>Network</span>
        </div>
      </div>

      <div className={styles.sep} />

      {/* ── Core Health Strip ── */}
      <div className={styles.healthStrip}>
        <div className={styles.healthChip}>
          <div className={styles.wsDot} />
          <span>OTLP HTTP :4318</span>
        </div>

        <div className={`${styles.healthChip} ${styles.errorChip}`}>
          <span className={styles.errorIcon}>🚨</span>
          <span><strong>{errorCount}</strong> Errors ({errorRate}%)</span>
        </div>

        <div className={`${styles.healthChip} ${styles.degradedChip}`}>
          <span className={styles.degradedDot} />
          <span>Degraded: <strong>mock-payment-api</strong></span>
        </div>
      </div>

      <div className={styles.right}>
        <button className={styles.searchTrigger} onClick={onOpenPalette}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="5" />
            <path d="M12 12l3 3" strokeLinecap="round" />
          </svg>
          Search
          <span className={styles.kbd}>⌘K</span>
        </button>
        <div className={styles.envChip}>DEVTOOLS</div>
      </div>
    </header>
  );
}
