import { useState, useMemo } from 'react';
import { RequestRow } from './RequestRow';
import { FilterPills, FilterState } from './FilterPills';
import { SVC } from '@/data/mock';
import type { Request } from '@/types';
import styles from './RequestList.module.css';

interface Props {
  requests: Request[];
  selectedId: string;
  newId: string | null;
  onSelect: (id: string) => void;
}

export function RequestList({ requests, selectedId, newId, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    errorsOnly: false,
    get: false,
    post: false,
    slow: false,
  });

  const errorCount = useMemo(() => {
    return requests.filter((r) => r.s >= 500).length;
  }, [requests]);

  const toggleFilter = (key: keyof FilterState) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  const resetFilters = () => {
    setFilters({ errorsOnly: false, get: false, post: false, slow: false });
    setSearch('');
  };

  const filtered = requests.filter((r) => {
    if (search && !r.p.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.errorsOnly && r.s < 500) return false;
    if (filters.get && r.m !== 'GET') return false;
    if (filters.post && r.m !== 'POST') return false;
    if (filters.slow && r.d <= 2000) return false;
    return true;
  });

  // Mini Traffic Sparkline bars (simulating recent traffic distribution)
  const heatmapBars = useMemo(() => {
    return requests.slice(0, 24).map((r) => {
      const isErr = r.s >= 500;
      const isSlow = r.d > 2000;
      const heightPct = Math.min(Math.max((r.d / 5012) * 100, 25), 100);
      const color = isErr ? '#ef4444' : isSlow ? '#f59e0b' : r.d < 200 ? '#22c55e' : '#38bdf8';
      return { id: r.id, color, heightPct, isErr, dur: r.d };
    });
  }, [requests]);

  return (
    <div className={styles.pane}>
      {/* ── Top Filter & Heatmap Strip ── */}
      <div className={styles.controlStrip}>
        <div className={styles.searchBox}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="5" />
            <path d="M12 12l3 3" strokeLinecap="round" />
          </svg>
          <input
            id="search-in"
            placeholder="Filter requests (press / to focus)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch('')}>×</button>
          )}
        </div>

        <FilterPills
          filters={filters}
          errorCount={errorCount}
          onToggle={toggleFilter}
          onReset={resetFilters}
        />

        {/* ── Mini Traffic & Error Sparkline Strip ── */}
        <div className={styles.heatmapWrapper}>
          <div className={styles.heatmapLabel}>ACTIVITY</div>
          <div className={styles.sparkline}>
            {heatmapBars.map((bar) => (
              <div
                key={bar.id}
                className={[styles.sparkBar, bar.id === selectedId ? styles.sparkBarSel : ''].join(' ')}
                style={{
                  height: `${bar.heightPct}%`,
                  backgroundColor: bar.color,
                }}
                onClick={() => onSelect(bar.id)}
                title={`${bar.dur}ms ${bar.isErr ? '(ERROR 5xx)' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} />
          <span>{filtered.length} reqs</span>
        </div>
      </div>

      {/* ── Full-Width Network Table Header ── */}
      <div className={styles.tableHeader}>
        <div className={styles.thMethod}>METHOD</div>
        <div className={styles.thStatus}>STATUS</div>
        <div className={styles.thPath}>PATH</div>
        <div className={styles.thDur}>DURATION</div>
        <div className={styles.thServices}>SERVICES</div>
        <div className={styles.thCulprit}>CULPRIT</div>
        <div className={styles.thTime}>TIME</div>
      </div>

      {/* ── Full-Width Table Rows ── */}
      <div className={styles.tableBody}>
        {filtered.length === 0 ? (
          <div className={styles.emptyResults}>
            <span>No requests match filter criteria</span>
            <button className={styles.resetBtn} onClick={resetFilters}>Reset</button>
          </div>
        ) : (
          filtered.map((req) => (
            <RequestRow
              key={req.id}
              req={req}
              selected={req.id === selectedId}
              isNew={req.id === newId}
              svcColors={SVC}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
