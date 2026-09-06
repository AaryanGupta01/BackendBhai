import { useEffect, useRef } from 'react';
import type { TabId } from '@/types';
import styles from './CommandPalette.module.css';

const NAV_ITEMS: Array<{ label: string; icon: string; tab: TabId; kb: string }> = [
  { label: 'Go to Waterfall', icon: '⚡', tab: 'wf',      kb: '1' },
  { label: 'Go to Overview',  icon: '📄', tab: 'ov',      kb: '2' },
  { label: 'Go to Logs',      icon: '📋', tab: 'logs',    kb: '3' },
  { label: 'Go to DB Queries',icon: '🗄️', tab: 'db',      kb: '4' },
  { label: 'Go to External',  icon: '🌐', tab: 'ext',     kb: '5' },
  { label: 'Go to Topology',  icon: '🕸️', tab: 'topo',   kb: '6' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
  onCopyId: () => void;
}

export function CommandPalette({ open, onClose, onNavigate, onCopyId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={[styles.overlay, open ? styles.on : ''].join(' ')}
      onClick={handleOverlayClick}
    >
      <div className={styles.palette}>
        <div className={styles.searchRow}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#52525b" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5" />
            <path d="M12 12l3 3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            placeholder="Search requests, navigate, run actions…"
            autoComplete="off"
            className={styles.input}
          />
          <span className={styles.kb}>esc</span>
        </div>

        <div className={styles.list}>
          <div className={styles.section}>Navigation</div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.tab}
              className={styles.item}
              onClick={() => onNavigate(item.tab)}
            >
              <div className={styles.icon}>{item.icon}</div>
              {item.label}
              <span className={styles.kb}>{item.kb}</span>
            </div>
          ))}

          <div className={styles.section}>Actions</div>
          <div className={styles.item} onClick={() => { onCopyId(); onClose(); }}>
            <div className={styles.icon}>📋</div>
            Copy Trace ID
            <span className={styles.kb}>⌘C</span>
          </div>
          <div className={styles.item} onClick={onClose}>
            <div className={styles.icon}>▶</div>
            Replay Request
            <span className={styles.kb}>r</span>
          </div>
          <div className={styles.item} onClick={() => { onNavigate('compare'); onClose(); }}>
            <div className={styles.icon}>⇔</div>
            Compare Traces
            <span className={styles.kb}>c</span>
          </div>
        </div>
      </div>
    </div>
  );
}
