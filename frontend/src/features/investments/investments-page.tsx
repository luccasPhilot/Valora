import { Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { InvestmentGroupCard } from './investment-group-card';
import { describeClosedPositions } from './investment-labels';
import { colorOfType, colorsByType, type RankedPosition } from './investment-view';
import { InvestmentsHero } from './investments-hero';
import { useInvestments } from './investments-queries';
import { ManualInvestmentPanel } from './manual-investment-panel';
import { NetWorthCard } from './net-worth-card';
import { TopPositions } from './top-positions';
import { toEditable, useManualInvestmentActions } from './use-manual-investment-actions';

function InvestmentsSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-4 lg:grid-cols-12">
      <Skeleton className="h-64 rounded-xl lg:col-span-7" />
      <Skeleton className="h-64 rounded-xl lg:col-span-5" />
      <Skeleton className="h-48 rounded-xl lg:col-span-6" />
      <Skeleton className="h-48 rounded-xl lg:col-span-6" />
    </div>
  );
}

function AddInvestmentButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" onClick={onClick}>
      <Plus aria-hidden="true" />
      Adicionar investimento
    </Button>
  );
}

interface NoInvestmentsStateProps {
  closedCount: number;
  onAdd: () => void;
}

function NoInvestmentsState({ closedCount, onAdd }: NoInvestmentsStateProps) {
  return (
    <div className="space-y-3">
      <EmptyState
        icon={TrendingUp}
        title="Nenhum investimento encontrado"
        description="Os investimentos dos seus bancos e corretoras chegam pela sincronização diária. O que não chega pelo Open Finance, como a INCO ou a Binance, você adiciona aqui."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <AddInvestmentButton onClick={onAdd} />
            <Button asChild variant="outline">
              <Link to="/contas">Ver contas</Link>
            </Button>
          </div>
        }
      />
      {closedCount > 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {describeClosedPositions(closedCount)}
        </p>
      ) : null}
    </div>
  );
}

interface InvestmentsContentProps {
  today: string;
  onAdd: () => void;
  onSelectManual: (position: RankedPosition) => void;
}

function InvestmentsContent({ today, onAdd, onSelectManual }: InvestmentsContentProps) {
  const investmentsQuery = useInvestments();
  if (investmentsQuery.isPending) return <InvestmentsSkeleton />;
  if (investmentsQuery.isError) {
    return <ErrorState onRetry={() => void investmentsQuery.refetch()} />;
  }

  const investments = investmentsQuery.data;
  if (investments.groups.length === 0) {
    return <NoInvestmentsState closedCount={investments.totals.closedCount} onAdd={onAdd} />;
  }
  const colors = colorsByType(investments.groups);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="flex justify-end lg:col-span-12">
        <AddInvestmentButton onClick={onAdd} />
      </div>
      <div className="min-w-0 lg:col-span-7">
        <InvestmentsHero investments={investments} />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <TopPositions groups={investments.groups} />
      </div>
      <section aria-labelledby="positions-by-type" className="min-w-0 space-y-3 lg:col-span-12">
        <h2 id="positions-by-type" className="type-label px-1">
          Posições por tipo
        </h2>
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {investments.groups.map((group) => (
            <InvestmentGroupCard
              key={group.type}
              group={group}
              today={today}
              onSelectManual={onSelectManual}
              color={colorOfType(colors, group.type)}
            />
          ))}
        </div>
      </section>
      {investments.totals.closedCount > 0 ? (
        <p className="text-center text-sm text-muted-foreground lg:col-span-12">
          {describeClosedPositions(investments.totals.closedCount)}
        </p>
      ) : null}
    </div>
  );
}

// O patrimônio vem de outra consulta e fica no topo em qualquer estado da lista de investimentos.
export function Component() {
  const actions = useManualInvestmentActions();
  return (
    <div className="space-y-4">
      <NetWorthCard />
      <InvestmentsContent
        today={actions.today}
        onAdd={actions.openCreate}
        onSelectManual={(position) => actions.openEdit(toEditable(position, actions.today))}
      />
      <ManualInvestmentPanel
        target={actions.panelTarget}
        isSaving={actions.isSaving}
        saveErrorMessage={actions.saveErrorMessage}
        onCreate={actions.create}
        onUpdate={actions.update}
        onClose={actions.askClose}
        onRemove={actions.askRemove}
        onDismiss={actions.dismissPanel}
      />
      <ConfirmDialog
        open={actions.closeTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) actions.cancelClose();
        }}
        title={`Encerrar ${actions.closeTarget?.name ?? 'posição'}?`}
        description="O valor vai a zero e a posição sai da lista. O histórico continua na evolução do patrimônio."
        confirmLabel="Encerrar posição"
        confirmVariant="default"
        isPending={actions.isSaving}
        errorMessage={actions.closeErrorMessage}
        onConfirm={actions.confirmClose}
      />
      <ConfirmDialog
        open={actions.removeTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) actions.cancelRemove();
        }}
        title={`Excluir ${actions.removeTarget?.name ?? 'investimento'}?`}
        description="O histórico desta posição também sai da evolução do patrimônio, e ela deixa de contar nas metas vinculadas. Para guardar o histórico, use Encerrar posição."
        confirmLabel="Excluir"
        isPending={actions.isRemoving}
        errorMessage={actions.removeErrorMessage}
        onConfirm={actions.confirmRemove}
      />
      <NoticeRegion notice={actions.notice} />
    </div>
  );
}
