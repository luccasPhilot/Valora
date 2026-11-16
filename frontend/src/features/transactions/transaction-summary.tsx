import type { UseQueryResult } from '@tanstack/react-query';

import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionSummary } from '@/lib/api/transactions';

interface TransactionSummaryLineProps {
  summary: UseQueryResult<TransactionSummary>;
  /** Com o filtro "Transferências", receita e despesa valem zero: só a contagem faz sentido. */
  isTransferFilter: boolean;
}

function countLabel(count: number): string {
  return count === 1 ? '1 transação' : `${count} transações`;
}

/** Quanto entrou e saiu no filtro atual, sem transferências internas. */
export function TransactionSummaryLine({ summary, isTransferFilter }: TransactionSummaryLineProps) {
  if (summary.isPending) return <Skeleton className="h-5 w-64 max-w-full" aria-hidden="true" />;
  if (summary.isError) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        Não foi possível calcular o resumo.
        <Button variant="ghost" onClick={() => void summary.refetch()}>
          Tentar de novo
        </Button>
      </p>
    );
  }

  const { incomeCents, expenseCents, count } = summary.data;
  if (count === 0) return null;
  if (isTransferFilter) {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{countLabel(count)}</span>. Transferências não
        entram nos totais de receita e despesa.
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm tabular-nums">
      <span className="font-medium text-foreground">{countLabel(count)}</span>
      {incomeCents > 0 ? (
        <span className="font-medium whitespace-nowrap text-positive">
          <span className="sr-only">Receitas: </span>
          <Money cents={incomeCents} isSigned />
        </span>
      ) : null}
      {expenseCents > 0 ? (
        <span className="font-medium whitespace-nowrap text-foreground">
          <span className="sr-only">Despesas: </span>
          <Money cents={-expenseCents} isSigned />
        </span>
      ) : null}
    </p>
  );
}
