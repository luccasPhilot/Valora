import { cn } from 'cn';
import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Money } from '@/components/money';
import type { Projection } from '@/lib/api/projection';
import { formatIsoDayMonth } from '@/lib/format';

import { describeNegativeBalance, projectionEndDate } from './projection-labels';

interface CompositionRowProps {
  label: string;
  children: ReactNode;
}

function CompositionRow({ label, children }: CompositionRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

/** O saldo projetado em destaque, o aviso de saldo negativo e as parcelas da conta. */
export function ProjectionSummary({ projection }: { projection: Projection }) {
  const negativeWarning = describeNegativeBalance(projection);
  const isLowestNegative = projection.lowestBalanceCents < 0;
  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-1">
        <p
          className={cn(
            'type-display break-words tabular-nums',
            projection.projectedBalanceCents < 0 && 'text-destructive',
          )}
        >
          <Money cents={projection.projectedBalanceCents} />
        </p>
        <p className="text-sm text-muted-foreground">
          Saldo projetado em {formatIsoDayMonth(projectionEndDate(projection))}
        </p>
      </div>
      {negativeWarning ? (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {negativeWarning}
        </p>
      ) : null}
      <dl className="divide-y">
        <CompositionRow label="Saldo de hoje">
          <Money cents={projection.startBalanceCents} />
        </CompositionRow>
        <CompositionRow label="Receitas previstas">
          <span className={cn(projection.plannedIncomeCents > 0 && 'text-positive')}>
            <Money cents={projection.plannedIncomeCents} isSigned />
          </span>
        </CompositionRow>
        <CompositionRow label="Despesas previstas">
          <Money cents={-projection.plannedExpenseCents} isSigned />
        </CompositionRow>
        <CompositionRow label="Faturas que vencem">
          <Money cents={-projection.billsDueCents} isSigned />
        </CompositionRow>
        <CompositionRow
          label={`Menor saldo, em ${formatIsoDayMonth(projection.lowestBalanceDate)}`}
        >
          <span className={cn(isLowestNegative && 'text-destructive')}>
            <Money cents={projection.lowestBalanceCents} />
          </span>
        </CompositionRow>
      </dl>
    </div>
  );
}
