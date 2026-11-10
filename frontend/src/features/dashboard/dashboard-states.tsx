import { Landmark, RefreshCw } from 'lucide-react';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStartSync } from '@/hooks/use-sync';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

import { MeuPluggySteps } from '../accounts/meu-pluggy-steps';
import { DASHBOARD_GRID_CLASSES, DashboardCell } from './dashboard-grid';

/** Primeiro uso: ainda não houve nenhuma sincronização, então não há número nenhum para mostrar. */
export function FirstUseState() {
  const startSync = useStartSync();
  const isOffline = useIsOffline();
  return (
    <EmptyState
      icon={Landmark}
      title="Conecte seus bancos para começar"
      description="O Valora ainda não trouxe nenhum dado. Conecte seus bancos no Meu Pluggy e depois sincronize."
      action={
        <div className="flex flex-col items-center gap-4">
          <MeuPluggySteps />
          <Button
            type="button"
            disabled={startSync.isPending || isOffline}
            title={isOffline ? OFFLINE_ACTION_HINT : undefined}
            onClick={() => startSync.mutate()}
          >
            <RefreshCw aria-hidden="true" />
            {startSync.isPending ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
          {startSync.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível sincronizar agora. Tente de novo.
            </p>
          ) : null}
        </div>
      }
    />
  );
}

/** Um skeleton por bloco, na mesma grade da tela pronta, para nada pular quando os dados chegam. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className={DASHBOARD_GRID_CLASSES}>
      <DashboardCell area="balance">
        <Skeleton className="h-56 w-full rounded-xl" />
      </DashboardCell>
      <DashboardCell area="shortcuts">
        <Skeleton className="h-24 w-full rounded-xl" />
      </DashboardCell>
      <DashboardCell area="month">
        <Skeleton className="h-32 w-full rounded-xl lg:h-full" />
      </DashboardCell>
      <DashboardCell area="projection">
        <Skeleton className="h-40 w-full rounded-xl lg:h-full" />
      </DashboardCell>
      <DashboardCell area="goals">
        <Skeleton className="h-64 w-full rounded-xl" />
      </DashboardCell>
      <DashboardCell area="chart">
        <Skeleton className="h-80 w-full rounded-xl" />
      </DashboardCell>
      <DashboardCell area="categories">
        <Skeleton className="h-80 w-full rounded-xl" />
      </DashboardCell>
      <DashboardCell area="budgets">
        <Skeleton className="h-64 w-full rounded-xl" />
      </DashboardCell>
      <DashboardCell area="transactions">
        <Skeleton className="h-64 w-full rounded-xl" />
      </DashboardCell>
    </div>
  );
}
