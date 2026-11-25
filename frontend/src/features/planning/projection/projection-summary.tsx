import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Money } from '@/components/money';
import { TonedMoney } from '@/components/toned-money';
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
  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-1">
        <p className="type-display break-words tabular-nums">
          <TonedMoney cents={projection.projectedBalanceCents} kind="balance" />
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
          <TonedMoney cents={projection.plannedIncomeCents} kind="flow" isSigned />
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
          <TonedMoney cents={projection.lowestBalanceCents} kind="balance" />
        </CompositionRow>
      </dl>
    </div>
  );
}
