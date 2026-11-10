import { Landmark } from 'lucide-react';
import { useState } from 'react';

import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { CardSkeleton } from '@/components/states/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotice } from '@/hooks/use-notice';
import { useConnections } from '@/hooks/use-sync';
import type { Account } from '@/lib/api/accounts';

import { groupByInstitution } from './account-groups';
import { AccountPanel } from './account-panel';
import { useAccountsOverview, useSetAccountHidden } from './accounts-queries';
import { AccountsSummary } from './accounts-summary';
import { ArchivedBanks } from './archived-banks';
import { InstitutionCard } from './institution-card';
import { MeuPluggySteps } from './meu-pluggy-steps';

function AccountsSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

function NoBanksState() {
  return (
    <div className="space-y-4">
      <EmptyState
        icon={Landmark}
        title="Nenhum banco conectado"
        description="Conecte seus bancos no Meu Pluggy para ver saldos, faturas e limites aqui."
        action={<MeuPluggySteps />}
      />
      <ArchivedBanks />
    </div>
  );
}

function hiddenChangeMessage(account: Account): string {
  return account.isHidden
    ? `${account.name} saiu dos totais`
    : `${account.name} voltou para os totais`;
}

export function Component() {
  const overviewQuery = useAccountsOverview();
  const connectionsQuery = useConnections();
  const setHidden = useSetAccountHidden();
  const { notice, showNotice } = useNotice();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  if (overviewQuery.isPending) return <AccountsSkeleton />;
  if (overviewQuery.isError) return <ErrorState onRetry={() => void overviewQuery.refetch()} />;

  const { items, totals } = overviewQuery.data;
  const groups = groupByInstitution(items);
  if (groups.length === 0) return <NoBanksState />;

  const selectedAccount = items.find((account) => account.id === selectedAccountId) ?? null;
  const configuredById = new Map(
    (connectionsQuery.data ?? []).map((connection) => [connection.id, connection.isConfigured]),
  );

  // Trocar ou fechar o painel descarta o erro do último salvamento.
  function selectAccount(accountId: string | null) {
    setHidden.reset();
    setSelectedAccountId(accountId);
  }

  function toggleHidden(account: Account) {
    setHidden.mutate(
      { accountId: account.id, isHidden: !account.isHidden },
      {
        onSuccess: (updated) => {
          setSelectedAccountId(null);
          showNotice({ tone: 'success', message: hiddenChangeMessage(updated) });
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <AccountsSummary totals={totals} />
      {groups.map((group) => (
        <InstitutionCard
          key={group.connectionId}
          group={group}
          isConfigured={configuredById.get(group.connectionId) ?? true}
          onSelectAccount={(account) => selectAccount(account.id)}
        />
      ))}
      <ArchivedBanks />
      <AccountPanel
        account={selectedAccount}
        isSaving={setHidden.isPending}
        hasSaveError={setHidden.isError}
        onToggleHidden={toggleHidden}
        onClose={() => selectAccount(null)}
      />
      <NoticeRegion notice={notice} />
    </div>
  );
}
