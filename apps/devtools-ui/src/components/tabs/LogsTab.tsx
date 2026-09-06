import { useState } from 'react';
import { SVC } from '@/data/mock';
import type { LogEntry, LogLevel } from '@/types';
import styles from './LogsTab.module.css';

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: styles.lvlInfo,
  warn: styles.lvlWarn,
  error: styles.lvlError,
};

interface Props {
  logs: LogEntry[];
}

export function LogsTab({ logs }: Props) {
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');

  const visible = filter === 'all' ? logs : logs.filter((l) => l.lv === filter);

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        {(['all', 'info', 'warn', 'error'] as const).map((f) => (
          <button
            key={f}
            className={[styles.pill, filter === f ? styles.on : ''].join(' ')}
            style={f !== 'all' && filter !== f ? { color: f === 'info' ? '#60a5fa' : f === 'warn' ? '#fbbf24' : '#f87171' } : undefined}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {visible.map((log, i) => (
          <div key={i} className={styles.row}>
            <span className={[styles.lvl, LEVEL_CLASS[log.lv]].join(' ')}>{log.lv}</span>
            <span className={styles.ts}>{log.ts}</span>
            <span className={styles.svc} style={{ color: SVC[log.svc] ?? '#888' }}>{log.svc}</span>
            <span className={styles.msg}>{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
