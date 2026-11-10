import { RefreshCw } from 'lucide-react';

import { NoticeRegion } from '@/components/notice-region';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotice } from '@/hooks/use-notice';
import { useSync } from '@/hooks/use-sync';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';
import { describeSyncStatus, SYNC_UNKNOWN_TEXT } from '@/lib/sync-labels';

/** Quando foi a última sincronização. Tocar nele sincroniza agora e acompanha o andamento. */
export function SyncStatus() {
  const { notice, showNotice } = useNotice();
  const { latestRun, isLoading, isError, isSyncing, startSync } = useSync(showNotice);
  const isOffline = useIsOffline();

  if (isLoading) return <Skeleton className="h-4 w-28 sm:w-36" aria-hidden="true" />;

  const text = isError ? SYNC_UNKNOWN_TEXT : describeSyncStatus(latestRun, isSyncing);
  return (
    <>
      <button
        type="button"
        onClick={startSync}
        disabled={isSyncing || isOffline}
        title={isOffline ? OFFLINE_ACTION_HINT : undefined}
        aria-busy={isSyncing}
        className="relative flex max-w-full min-w-0 items-center gap-1.5 rounded-full text-xs leading-4 font-medium text-muted-foreground transition-colors outline-none after:absolute after:inset-x-0 after:-inset-y-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none sm:min-h-11 sm:px-3 sm:text-sm sm:leading-5 sm:after:hidden sm:hover:bg-accent"
      >
        <RefreshCw
          className={`size-3.5 shrink-0 sm:size-4 ${isSyncing ? 'motion-safe:animate-spin' : 'max-sm:hidden'}`}
          aria-hidden="true"
        />
        <span className="truncate">{text}</span>
      </button>
      <NoticeRegion notice={notice} />
    </>
  );
}
