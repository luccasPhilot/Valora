import { ChevronRight, Unplug } from 'lucide-react';
import { Link } from 'react-router';

import { ArchiveBankButton } from '@/features/accounts/archive-bank-button';
import { findBrokenConnections, useConnections } from '@/hooks/use-sync';
import type { Connection } from '@/lib/api/sync';
import { type OrphanCause, orphanCauseOf } from '@/lib/connection-status';
import { formatDayMonth } from '@/lib/format';

const ACCOUNTS_PATH = '/contas';

const ORPHAN_CAUSE_TEXTS: Readonly<Record<OrphanCause, string>> = {
  removed_from_pluggy: 'foi removido do Meu Pluggy',
  not_in_sync_list: 'saiu da lista de sincronização',
};

const BANNER_CLASSES =
  'flex min-h-11 w-full items-center gap-3 rounded-lg bg-warning-surface px-4 py-3 text-left text-sm font-medium text-warning';

function describeSyncSince(connection: Connection): string {
  if (!connection.lastSyncedAt) return 'ainda não sincronizou';
  return `não sincroniza desde ${formatDayMonth(new Date(connection.lastSyncedAt))}`;
}

function describeProblem(connection: Connection): string {
  return `${connection.institutionName} ${describeSyncSince(connection)}`;
}

function describeOrphan(connection: Connection, cause: OrphanCause): string {
  const syncPart = describeSyncSince(connection);
  return `${connection.institutionName} ${ORPHAN_CAUSE_TEXTS[cause]}. ${syncPart.charAt(0).toUpperCase()}${syncPart.slice(1)}.`;
}

/** Banco órfão: a causa em texto e o botão para tirá-lo do Valora (o botão fica fora de qualquer link). */
function OrphanBanner({ connection, cause }: { connection: Connection; cause: OrphanCause }) {
  return (
    <div role="status" className={`${BANNER_CLASSES} flex-wrap`}>
      <Unplug className="size-5 shrink-0" aria-hidden="true" />
      {/* A largura mínima faz o botão descer para a linha de baixo em vez de espremer o texto. */}
      <span className="min-w-40 flex-1">{describeOrphan(connection, cause)}</span>
      <ArchiveBankButton
        connectionId={connection.id}
        institutionName={connection.institutionName}
        className="shrink-0 max-[420px]:w-full"
      />
    </div>
  );
}

/** Faixa no topo de todas as telas enquanto algum banco não sincroniza; leva a Contas ou oferece remover o banco. */
export function ConnectionAlert() {
  const connectionsQuery = useConnections();
  const brokenConnections = findBrokenConnections(connectionsQuery.data ?? []);
  if (brokenConnections.length === 0) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 pt-4 sm:px-6 lg:px-8">
      {brokenConnections.map((connection) => {
        const orphanCause = orphanCauseOf(connection);
        if (orphanCause) {
          return <OrphanBanner key={connection.id} connection={connection} cause={orphanCause} />;
        }
        return (
          <Link
            key={connection.id}
            to={ACCOUNTS_PATH}
            className={`${BANNER_CLASSES} outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            <Unplug className="size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{describeProblem(connection)}</span>
            <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
