import styles from './StatusBar.module.css';

interface Props {
  count: number;
}

export function StatusBar({ count }: Props) {
  return (
    <footer className={styles.bar}>
      <div className={styles.item}>
        <div className={styles.dot} />
        <span>OTLP Receiver :4318</span>
      </div>
      <div className={styles.sep} />
      <div className={styles.item}>
        <strong>{count}</strong> requests captured
      </div>
      <div className={styles.sep} />
      <div className={styles.item}>
        api-gateway <span style={{ color: '#4ade80' }}>HEALTHY</span>
      </div>
      <div className={styles.sep} />
      <div className={styles.item}>
        p95 latency: <span style={{ color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>1,420ms</span>
      </div>
      <div className={styles.right}>OpenTelemetry W3C · PostgreSQL · Redis</div>
    </footer>
  );
}
