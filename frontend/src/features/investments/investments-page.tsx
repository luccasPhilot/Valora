import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { InvestmentGroupCard } from './investment-group-card';
import { describeClosedPositions } from './investment-labels';
import { colorOfType, colorsByType } from './investment-view';
import { InvestmentsHero } from './investments-hero';
import { useInvestments } from './investments-queries';
import { TopPositions } from './top-positions';

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

function NoInvestmentsState({ closedCount }: { closedCount: number }) {
  return (
    <div className="space-y-3">
      <EmptyState
        icon={TrendingUp}
        title="Nenhum investimento encontrado"
        description="Os investimentos dos seus bancos e corretoras chegam pela sincronização diária. Confira se a conexão está funcionando."
        action={
          <Button asChild variant="outline">
            <Link to="/contas">Ver contas</Link>
          </Button>
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

export function Component() {
  const investmentsQuery = useInvestments();
  if (investmentsQuery.isPending) return <InvestmentsSkeleton />;
  if (investmentsQuery.isError) {
    return <ErrorState onRetry={() => void investmentsQuery.refetch()} />;
  }

  const investments = investmentsQuery.data;
  if (investments.groups.length === 0) {
    return <NoInvestmentsState closedCount={investments.totals.closedCount} />;
  }
  const colors = colorsByType(investments.groups);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
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
