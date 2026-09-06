import type { TabId } from '@/types';
import styles from './TabBar.module.css';

const TABS: Array<{ id: TabId; label: string; badge?: number }> = [
  { id: 'wf',      label: 'Waterfall' },
  { id: 'ov',      label: 'Overview' },
  { id: 'logs',    label: 'Logs',       badge: 12 },
  { id: 'db',      label: 'DB Queries', badge: 4 },
  { id: 'ext',     label: 'External',   badge: 2 },
  { id: 'topo',    label: 'Topology' },
  { id: 'replay',  label: 'Replay' },
  { id: 'compare', label: 'Compare' },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className={styles.tabs}>
      {TABS.map((t) => (
        <button
          key={t.id}
          className={[styles.tab, activeTab === t.id ? styles.on : ''].join(' ')}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
          {t.badge !== undefined && (
            <span className={styles.badge}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
