import styles from './EmptyTabs.module.css';

export function ReplayTab() {
  return (
    <div className={styles.empty}>
      <div className={styles.icon}>▶</div>
      <span>Click <strong>Replay</strong> to re-execute this request</span>
    </div>
  );
}

export function CompareTab() {
  return (
    <div className={styles.empty}>
      <div className={styles.icon}>⇔</div>
      <span>Select two traces to compare</span>
    </div>
  );
}
