import { durColor } from '@/utils/colors';
import type { DbQuery } from '@/types';
import styles from './DBQueriesTab.module.css';

interface Props {
  queries: DbQuery[];
}

export function DBQueriesTab({ queries }: Props) {
  return (
    <div className={styles.wrap}>
      {queries.map((q, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.top}>
            <span className={styles.op}>{q.op}</span>
            <span className={styles.tbl}>{q.tbl}</span>
            <span className={styles.dur} style={{ color: durColor(q.d) }}>{q.d}ms</span>
          </div>
          <pre className={styles.sql}>{q.sql}</pre>
        </div>
      ))}
    </div>
  );
}
