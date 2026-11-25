import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { Money } from '@/components/money';
import { TonedMoney } from '@/components/toned-money';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionSummary } from '@/lib/api/transactions';

interface TransactionSummaryLineProps {
  summary: UseQueryResult<TransactionSummary>;
  /** O período do filtro em texto ("novembro de 2026"); a primeira letra sobe na tela. */
  periodLabel: string;
  /** Com o filtro "Transferências", receita e despesa valem zero: só a contagem faz sentido. */
  isTransferFilter: boolean;
}

function countLabel(count: number): string {
  return count === 1 ? '1 transação' : `${count} transações`;
}

function LabeledValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-muted-foreground">{label} </span>
      {children}
    </span>
  );
}

function SummaryContent({ summary, periodLabel, isTransferFilter }: TransactionSummaryLineProps) {
  if (summary.isPending) return <Skeleton className="h-6 w-72 max-w-full" aria-hidden="true" />;
  if (summary.isError) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 text-muted-foreground">
        Não foi possível calcular o resumo.
        <Button variant="ghost" onClick={() => void summary.refetch()}>
          Tentar de novo
        </Button>
      </p>
    );
  }

  const { incomeCents, expenseCents, count } = summary.data;
  if (count === 0) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
      {/* Os espaços entre os itens não aparecem (flex), mas separam as palavras no anúncio. */}
      <span className="font-semibold first-letter:uppercase">{periodLabel}</span>{' '}
      <span className="text-muted-foreground">{countLabel(count)}</span>{' '}
      {isTransferFilter ? (
        <span className="text-muted-foreground">
          Transferências não entram nos totais de receita e despesa.
        </span>
      ) : null}
      {!isTransferFilter && incomeCents > 0 ? (
        <LabeledValue label="Receitas">
          <TonedMoney cents={incomeCents} kind="flow" isSigned className="font-semibold" />
        </LabeledValue>
      ) : null}{' '}
      {!isTransferFilter && expenseCents > 0 ? (
        <LabeledValue label="Despesas">
          <span className="font-semibold text-foreground">
            <Money cents={-expenseCents} isSigned />
          </span>
        </LabeledValue>
      ) : null}
    </p>
  );
}

/**
 * Quanto entrou e saiu no filtro atual, sem transferências internas. O resumo só muda quando o
 * filtro muda (carregar mais páginas não o refaz), então o leitor de tela o anuncia uma vez por filtro.
 */
export function TransactionSummaryLine(props: TransactionSummaryLineProps) {
  return (
    <section aria-label="Resumo do filtro" aria-live="polite" aria-atomic="true">
      <SummaryContent {...props} />
    </section>
  );
}
