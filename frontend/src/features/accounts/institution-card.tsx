import { Landmark } from 'lucide-react';

import type { Account } from '@/lib/api/accounts';
import { formatMoment } from '@/lib/format';

import type { InstitutionGroup } from './account-groups';
import { AccountRow } from './account-row';
import { ConnectionStatusBadge } from './connection-status-badge';
import { ReconnectHelp } from './reconnect-help';

interface InstitutionCardProps {
  group: InstitutionGroup;
  onSelectAccount: (account: Account) => void;
}

function describeLastSync(lastSyncedAt: string | null): string {
  return lastSyncedAt
    ? `Sincronizado ${formatMoment(new Date(lastSyncedAt))}`
    : 'Ainda não sincronizou';
}

/** Um card por conexão: banco, status e última sincronização no cabeçalho; as contas como linhas. */
export function InstitutionCard({ group, onSelectAccount }: InstitutionCardProps) {
  const { connection, accounts } = group;
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
            className="min-w-32 flex-1 font-display text-base font-semibold break-words"
          >
            {connection.institutionName}
          </h2>
          <ConnectionStatusBadge status={connection.status} />
        </div>
        <p className="text-xs text-muted-foreground">{describeLastSync(connection.lastSyncedAt)}</p>
        {group.hasProblem ? <ReconnectHelp /> : null}
      </header>
      <ul className="divide-y divide-border border-t">
        {accounts.map((account) => (
          <AccountRow key={account.id} account={account} onSelect={onSelectAccount} />
        ))}
      </ul>
    </section>
  );
}
