import { TraceHero } from './TraceHero';
import { TabBar } from './TabBar';
import { WaterfallTab } from '@/components/tabs/WaterfallTab';
import { OverviewTab } from '@/components/tabs/OverviewTab';
import { LogsTab } from '@/components/tabs/LogsTab';
import { DBQueriesTab } from '@/components/tabs/DBQueriesTab';
import { ExternalTab } from '@/components/tabs/ExternalTab';
import { TopologyTab } from '@/components/tabs/TopologyTab';
import { ReplayTab } from '@/components/tabs/ReplayTab';
import { CompareTab } from '@/components/tabs/CompareTab';
import { WF, LOGS, DB, EXT } from '@/data/mock';
import type { Request, TabId } from '@/types';
import styles from './DetailPane.module.css';

interface Props {
  request: Request | undefined;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onCopyId: () => void;
}

export function DetailPane({ request, activeTab, onTabChange, onCopyId }: Props) {
  if (!request) {
    return (
      <div className={styles.pane}>
        <div className={styles.empty}>Select a request above to inspect distributed trace</div>
      </div>
    );
  }

  return (
    <div className={styles.pane}>
      <TraceHero
        request={request}
        onCopyId={onCopyId}
        onViewLogs={() => onTabChange('logs')}
      />
      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
      <div className={styles.panelWrap}>
        {activeTab === 'wf'      && <WaterfallTab spans={WF} totalDuration={5012} />}
        {activeTab === 'ov'      && <OverviewTab />}
        {activeTab === 'logs'    && <LogsTab logs={LOGS} />}
        {activeTab === 'db'      && <DBQueriesTab queries={DB} />}
        {activeTab === 'ext'     && <ExternalTab calls={EXT} />}
        {activeTab === 'topo'    && <TopologyTab />}
        {activeTab === 'replay'  && <ReplayTab />}
        {activeTab === 'compare' && <CompareTab />}
      </div>
    </div>
  );
}
