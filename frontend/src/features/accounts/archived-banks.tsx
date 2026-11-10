import { ChevronDown, Landmark } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Connection } from '@/lib/api/sync';
import { formatMoment } from '@/lib/format';

import { ACCOUNT_TYPE_LABELS } from './account-groups';
import { useArchivedConnections, useSetConnectionArchived } from './accounts-queries';

const REACTIVATE_ERROR_MESSAGE = 'Não foi possível reativar o banco. Tente de novo.';

function describeLastSync(lastSyncedAt: string | null): string {
  return lastSyncedAt
    ? `Última sincronização ${formatMoment(new Date(lastSyncedAt))}`
    : 'Nunca sincronizou';
}

function ArchivedBankRow({ connection }: { connection: Connection }) {
  const reactivate = useSetConnectionArchived();
  return (
    <li className="space-y-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <Landmark className="size-5" aria-hidden="true" />
        </span>
        <p className="min-w-32 flex-1 font-display text-base font-semibold break-words">
          {connection.institutionName}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={reactivate.isPending}
          onClick={() => reactivate.mutate({ connectionId: connection.id, isArchived: false })}
        >
          Reativar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {connection.accounts.length > 0
          ? connection.accounts
              .map((account) => `${account.name} (${ACCOUNT_TYPE_LABELS[account.type]})`)
              .join(', ')
          : 'Sem contas guardadas'}
      </p>
      <p className="text-xs text-muted-foreground">{describeLastSync(connection.lastSyncedAt)}</p>
      {reactivate.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {REACTIVATE_ERROR_MESSAGE}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Os bancos arquivados, numa seção recolhida no fim da tela Contas, cada um com "Reativar".
 * Sem nenhum arquivado, a seção não aparece.
 */
export function ArchivedBanks() {
  const archivedQuery = useArchivedConnections();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (archivedQuery.isPending) {
    return <Skeleton role="status" aria-label="Carregando arquivados" className="h-12 w-full" />;
  }
  if (archivedQuery.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <p className="min-w-0 flex-1">Não foi possível carregar os bancos arquivados.</p>
        <Button type="button" variant="outline" onClick={() => void archivedQuery.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  const archived = archivedQuery.data;
  if (archived.length === 0) return null;

  return (
    <section aria-label="Arquivados" className="rounded-lg border bg-card shadow-card">
      <h2 className="font-display text-base font-semibold">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={listId}
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
        >
          <span>Arquivados ({archived.length})</span>
          <ChevronDown
            className={`size-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h2>
      {isOpen ? (
        <ul id={listId} className="divide-y divide-border border-t">
          {archived.map((connection) => (
            <ArchivedBankRow key={connection.id} connection={connection} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
