import { durColor, methodClass } from '@/utils/colors';
import type { ExtCall } from '@/types';
import styles from './ExternalTab.module.css';

interface Props {
  calls: ExtCall[];
}

export function ExternalTab({ calls }: Props) {
  return (
    <div className={styles.wrap}>
      {calls.map((e, i) => {
        const statusColor = e.s >= 500 ? '#f87171' : '#4ade80';
        return (
          <div key={i} className={styles.card}>
            <span className={`mbadge m${methodClass(e.m)}`}>{e.m}</span>
            <span className={styles.url}>{e.url}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: statusColor }}>{e.s}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: durColor(e.d) }}>{e.d}ms</span>
          </div>
        );
      })}
    </div>
  );
}
