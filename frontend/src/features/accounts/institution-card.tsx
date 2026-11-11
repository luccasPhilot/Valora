import { Landmark } from 'lucide-react';

import type { Account } from '@/lib/api/accounts';
import { orphanCauseOf } from '@/lib/connection-status';
import { formatMoment } from '@/lib/format';

import type { InstitutionGroup } from './account-groups';
import { AccountRow } from './account-row';
import { ArchiveBankButton } from './archive-bank-button';
import { ConnectionStatusBadge } from './connection-status-badge';
import { OrphanHelp } from './orphan-help';
import { ReconnectHelp } from './reconnect-help';

interface InstitutionCardProps {
  group: InstitutionGroup;
  /** O id do banco está no `PLUGGY_ITEM_IDS`. Vem da lista de conexões; na dúvida, vale como configurado. */
  isConfigured?: boolean;
  onSelectAccount: (account: Account) => void;
}

function describeLastSync(lastSyncedAt: string | null): string {
  return lastSyncedAt
    ? `Sincronizado ${formatMoment(new Date(lastSyncedAt))}`
    : 'Ainda não sincronizou';
}

/** Um card por conexão: banco, status e última sincronização no cabeçalho; as contas como linhas. */
export function InstitutionCard({
  group,
  isConfigured = true,
  onSelectAccount,
}: InstitutionCardProps) {
  const { connection, accounts } = group;
  const orphanCause = orphanCauseOf({ status: connection.status, isConfigured });
  const headingId = `institution-${group.connectionId}`;
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-lg border bg-card shadow-card"
    >
      <header className="space-y-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <Landmark className="size-5" aria-hidden="true" />
          </span>
          <h2
            id={headingId}
            className="min-w-32 flex-1 font-display text-xl font-semibold break-words"
          >
            {connection.institutionName}
          </h2>
          <ConnectionStatusBadge status={connection.status} />
        </div>
        <p className="text-xs text-muted-foreground">{describeLastSync(connection.lastSyncedAt)}</p>
        {orphanCause ? <OrphanHelp cause={orphanCause} /> : null}
        {group.hasProblem && !orphanCause ? <ReconnectHelp /> : null}
      </header>
      <ul className="divide-y divide-border border-t">
        {accounts.map((account) => (
          <AccountRow key={account.id} account={account} onSelect={onSelectAccount} />
        ))}
      </ul>
      <footer className="border-t p-4 sm:px-5">
        <ArchiveBankButton
          connectionId={group.connectionId}
          institutionName={connection.institutionName}
        />
      </footer>
    </section>
  );
}
