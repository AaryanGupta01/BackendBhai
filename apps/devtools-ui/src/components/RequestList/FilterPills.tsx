import styles from './FilterPills.module.css';

export interface FilterState {
  errorsOnly: boolean;
  get: boolean;
  post: boolean;
  slow: boolean;
}

interface Props {
  filters: FilterState;
  errorCount: number;
  onToggle: (key: keyof FilterState) => void;
  onReset: () => void;
}

export function FilterPills({ filters, errorCount, onToggle, onReset }: Props) {
  const anyActive = filters.errorsOnly || filters.get || filters.post || filters.slow;

  return (
    <div className={styles.pills}>
      <button
        className={[styles.pill, !anyActive ? styles.activeDefault : ''].join(' ')}
        onClick={onReset}
      >
        All
      </button>

      <button
        className={[styles.pill, styles.errorPill, filters.errorsOnly ? styles.errorActive : ''].join(' ')}
        onClick={() => onToggle('errorsOnly')}
      >
        <span className={styles.errDot} />
        Errors Only
        <span className={styles.errorCountBadge}>{errorCount}</span>
      </button>

      <button
        className={[styles.pill, filters.slow ? styles.slowOn : ''].join(' ')}
        onClick={() => onToggle('slow')}
      >
        Slow (&gt;2s)
      </button>

      <button
        className={[styles.pill, filters.post ? styles.on : ''].join(' ')}
        onClick={() => onToggle('post')}
      >
        POST
      </button>

      <button
        className={[styles.pill, filters.get ? styles.on : ''].join(' ')}
        onClick={() => onToggle('get')}
      >
        GET
      </button>
    </div>
  );
}
