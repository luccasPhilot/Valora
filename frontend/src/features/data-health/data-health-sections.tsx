import { Clock, History, Hourglass, Scale, ShieldCheck } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import type { BalanceDivergence, ConsentStatus, StaleAccount } from '@/lib/api/data-health';
import type { SyncRunHistoryItem } from '@/lib/api/sync';

import {
  describeConsent,
  describeDivergence,
  describeLastTransaction,
  describeStaleAccount,
  describeSyncMoment,
  describeSyncRun,
  divergenceTransactionsPath,
  isConsentExpiringSoon,
  syncResultOf,
} from './data-health-presentation';
import { useSyncRunHistory } from './data-health-queries';
import { AllGood, CollapsibleRows, HealthRow } from './health-rows';

const NOTE_CLASSES = 'text-xs text-muted-foreground';

function RenewBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2.5 py-0.5 text-xs font-medium text-warning">
      <Clock className="size-3.5" aria-hidden="true" />
      Renovar
    </span>
  );
}

interface ConsentsSectionProps {
  consents: readonly ConsentStatus[];
}

export function ConsentsSection({ consents }: ConsentsSectionProps) {
  const hasExpiring = consents.some(isConsentExpiringSoon);
  return (
    <DataCard title="Consentimentos" icon={ShieldCheck}>
      {hasExpiring ? null : (
        <AllGood description="Nenhum consentimento vence nos próximos 30 dias." />
      )}
      <ul className="divide-y border-t">
        {consents.map((consent) => (
          <HealthRow
            key={consent.connectionId}
            title={consent.institutionName}
            description={describeConsent(consent)}
            trailing={isConsentExpiringSoon(consent) ? <RenewBadge /> : undefined}
          />
        ))}
      </ul>
      {hasExpiring ? (
        <p className={NOTE_CLASSES}>Renove a conexão no Meu Pluggy antes do vencimento.</p>
      ) : null}
    </DataCard>
  );
}

interface DivergencesSectionProps {
  divergences: readonly BalanceDivergence[];
}

export function DivergencesSection({ divergences }: DivergencesSectionProps) {
  return (
    <DataCard title="Conciliação" icon={Scale}>
      {divergences.length === 0 ? (
        <AllGood description="O saldo das contas correntes e poupanças fecha com as transações dos últimos 60 dias." />
      ) : (
        <CollapsibleRows
          items={divergences}
          getKey={(divergence) => `${divergence.accountId}:${divergence.from}`}
          renderRow={(divergence) => (
            <HealthRow
              title={divergence.accountName}
              description={describeDivergence(divergence)}
              trailing={<Money cents={divergence.differenceCents} isSigned />}
              to={divergenceTransactionsPath(divergence)}
            />
          )}
        />
      )}
      <p className={NOTE_CLASSES}>
        Compara a variação do saldo entre um dia e outro com as transações do Open Finance. Os
        últimos 3 dias ficam de fora até tudo chegar. Nada é corrigido sozinho.
      </p>
    </DataCard>
  );
}

interface StaleAccountsSectionProps {
  staleAccounts: readonly StaleAccount[];
}

export function StaleAccountsSection({ staleAccounts }: StaleAccountsSectionProps) {
  return (
    <DataCard title="Contas paradas" icon={Hourglass}>
      {staleAccounts.length === 0 ? (
        <AllGood description="Contas correntes e cartões receberam transações nos últimos 10 dias." />
      ) : (
        <>
          <ul className="divide-y border-t">
            {staleAccounts.map((account) => (
              <HealthRow
                key={account.accountId}
                title={account.accountName}
                description={describeStaleAccount(account)}
                detail={describeLastTransaction(account)}
              />
            ))}
          </ul>
          <p className={NOTE_CLASSES}>
            Cartão trocado ou banco que parou de mandar dados? Confira no app do banco.
          </p>
        </>
      )}
    </DataCard>
  );
}

interface SyncResultProps {
  status: SyncRunHistoryItem['status'];
}

function SyncResult({ status }: SyncResultProps) {
  const { icon: Icon, label, iconClass } = syncResultOf(status);
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <Icon className={`size-4 ${iconClass}`} aria-hidden="true" />
      {label}
    </span>
  );
}

interface SyncRunRowsProps {
  runs: readonly SyncRunHistoryItem[];
}

function SyncRunRows({ runs }: SyncRunRowsProps) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma sincronização ainda.</p>;
  }
  return (
    <CollapsibleRows
      items={runs}
      getKey={(run) => run.id}
      renderRow={(run) => (
        <HealthRow
          title={describeSyncMoment(run.startedAt)}
          description={describeSyncRun(run)}
          detail={run.errorMessage ?? undefined}
          trailing={<SyncResult status={run.status} />}
        />
      )}
    />
  );
}

/** Carrega à parte: um erro aqui não derruba as outras seções. */
export function SyncHistorySection() {
  const historyQuery = useSyncRunHistory();
  return (
    <DataCard title="Sincronizações" icon={History}>
      {historyQuery.isPending ? <RowsSkeleton rowCount={3} /> : null}
      {historyQuery.isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o histórico.</p>
          <Button variant="outline" onClick={() => void historyQuery.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {historyQuery.data ? <SyncRunRows runs={historyQuery.data} /> : null}
    </DataCard>
  );
}
