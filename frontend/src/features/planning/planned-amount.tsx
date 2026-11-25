import { cn } from 'cn';

import { TonedMoney } from '@/components/toned-money';

interface PlannedAmountProps {
  /** Com sinal: negativo = despesa. */
  cents: number;
  className?: string;
}

// Design System, "Valores financeiros": receita em `positive` com "+"; despesa na cor normal com "−".
export function PlannedAmount({ cents, className }: PlannedAmountProps) {
  return (
    <TonedMoney cents={cents} kind="flow" isSigned className={cn('tabular-nums', className)} />
  );
}
