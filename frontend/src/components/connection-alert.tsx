import { ChevronRight, Unplug } from 'lucide-react';
import { Link } from 'react-router';

import { findBrokenConnections, useConnections } from '@/hooks/use-sync';
import type { Connection } from '@/lib/api/sync';
import { formatDayMonth } from '@/lib/format';

const ACCOUNTS_PATH = '/contas';

function describeProblem(connection: Connection): string {
  if (!connection.lastSyncedAt) return `${connection.institutionName} ainda não sincronizou`;
  const since = formatDayMonth(new Date(connection.lastSyncedAt));
  return `${connection.institutionName} não sincroniza desde ${since}`;
}

/** Faixa no topo de todas as telas enquanto algum banco não sincroniza; leva a Contas. */
export function ConnectionAlert() {
  const connectionsQuery = useConnections();
  const brokenConnections = findBrokenConnections(connectionsQuery.data ?? []);
  if (brokenConnections.length === 0) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 pt-4 sm:px-6 lg:px-8">
      {brokenConnections.map((connection) => (
        <Link
          key={connection.id}
          to={ACCOUNTS_PATH}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg bg-warning-surface px-4 py-3 text-left text-sm font-medium text-warning outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Unplug className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{describeProblem(connection)}</span>
          <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
