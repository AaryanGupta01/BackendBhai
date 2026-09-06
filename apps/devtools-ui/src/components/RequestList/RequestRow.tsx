import { durColor, statusClass, methodClass } from '@/utils/colors';
import type { Request } from '@/types';
import styles from './RequestRow.module.css';

interface Props {
  req: Request;
  selected: boolean;
  isNew: boolean;
  svcColors: Record<string, string>;
  onSelect: (id: string) => void;
}

export function RequestRow({ req, selected, isNew, svcColors, onSelect }: Props) {
  const isError = req.s >= 500;

  return (
    <div
      className={[
        styles.row,
        selected ? styles.sel : '',
        isNew ? styles.new : '',
        isError ? styles.errorRow : '',
      ].join(' ')}
      onClick={() => onSelect(req.id)}
      data-id={req.id}
    >
      {/* Column 1: Method */}
      <div className={styles.colMethod}>
        <span className={`mbadge m${methodClass(req.m)}`}>{req.m}</span>
      </div>

      {/* Column 2: Status */}
      <div className={styles.colStatus}>
        <span className={`${styles.statusText} ${statusClass(req.s)}`}>{req.s}</span>
      </div>

      {/* Column 3: Path */}
      <div className={styles.colPath}>
        <span className={styles.pathText}>{req.p}</span>
      </div>

      {/* Column 4: Duration */}
      <div className={styles.colDur} style={{ color: durColor(req.d) }}>
        {req.d}ms
      </div>

      {/* Column 5: Services Trail */}
      <div className={styles.colServices} title={req.svcs.join(' → ')}>
        <div className={styles.dotsGroup}>
          {req.svcs.map((sv) => (
            <div
              key={sv}
              className={[styles.dot, sv === req.errorCulprit ? styles.dotError : ''].join(' ')}
              style={{ background: sv === req.errorCulprit ? '#ef4444' : (svcColors[sv] ?? '#71717a') }}
              title={sv === req.errorCulprit ? `${sv} (FAILED)` : sv}
            />
          ))}
        </div>
        <span className={styles.serviceCount}>{req.svcs.length} svcs</span>
      </div>

      {/* Column 6: Culprit */}
      <div className={styles.colCulprit}>
        {isError && req.errorCulprit ? (
          <span className={styles.culpritBadge}>
            ⚠️ {req.errorCulprit}
          </span>
        ) : (
          <span className={styles.culpritDash}>—</span>
        )}
      </div>

      {/* Column 7: Timestamp */}
      <div className={styles.colTime}>{req.t}</div>
    </div>
  );
}
