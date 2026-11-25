import { ArrowLeft, Landmark } from 'lucide-react';
import { Link } from 'react-router';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { CardSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataHealth } from '@/lib/api/data-health';

import { countAttentionPoints, describeAttention } from './data-health-presentation';
import { useDataHealth } from './data-health-queries';
import {
  ConsentsSection,
  DivergencesSection,
  StaleAccountsSection,
  SyncHistorySection,
} from './data-health-sections';

const SETTINGS_PATH = '/ajustes';
const ACCOUNTS_PATH = '/contas';

function BackToSettings() {
  return (
    <Link
      to={SETTINGS_PATH}
      className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Ajustes
    </Link>
  );
}

function DataHealthSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

function NoBanksState() {
  return (
    <EmptyState
      icon={Landmark}
      title="Nenhum banco conectado"
      description="A saúde dos dados confere o que chega dos bancos. Conecte um banco no Meu Pluggy para começar."
      action={
        <Button asChild variant="outline">
          <Link to={ACCOUNTS_PATH}>Ver contas</Link>
        </Button>
      }
    />
  );
}

interface SummaryProps {
  dataHealth: DataHealth;
}

/** A resposta da tela: os números batem com o banco? */
function Summary({ dataHealth }: SummaryProps) {
  return (
    <DataCard title="Resumo" tier="hero" className="h-auto">
      <Metric
        value={describeAttention(countAttentionPoints(dataHealth))}
        caption="Consentimentos, saldos e transações conferidos a cada sincronização."
      />
    </DataCard>
  );
}

interface DataHealthContentProps {
  dataHealth: DataHealth;
}

function DataHealthContent({ dataHealth }: DataHealthContentProps) {
  return (
    <>
      <Summary dataHealth={dataHealth} />
      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <ConsentsSection consents={dataHealth.consents} />
        <DivergencesSection divergences={dataHealth.divergences} />
        <StaleAccountsSection staleAccounts={dataHealth.staleAccounts} />
        <SyncHistorySection />
      </div>
    </>
  );
}

export function Component() {
  const dataHealthQuery = useDataHealth();

  function renderBody() {
    if (dataHealthQuery.isPending) return <DataHealthSkeleton />;
    if (dataHealthQuery.isError) {
      return <ErrorState onRetry={() => void dataHealthQuery.refetch()} />;
    }
    // Sem banco ativo não há o que conferir: os consentimentos listam todos os bancos ativos.
    if (dataHealthQuery.data.consents.length === 0) return <NoBanksState />;
    return <DataHealthContent dataHealth={dataHealthQuery.data} />;
  }

  return (
    <div className="space-y-4">
      <BackToSettings />
      {renderBody()}
    </div>
  );
}
