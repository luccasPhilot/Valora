import { cn } from 'cn';

import { Money } from '@/components/money';

interface PlannedAmountProps {
  /** Com sinal: negativo = despesa. */
  cents: number;
  className?: string;
}

// Design System, "Valores financeiros": receita em `positive` com "+"; despesa na cor normal com "−".
export function PlannedAmount({ cents, className }: PlannedAmountProps) {
  return (
    <span className={cn('tabular-nums', cents > 0 && 'text-positive', className)}>
      <Money cents={cents} isSigned />
    </span>
  );
}
