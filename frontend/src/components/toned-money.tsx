import { cn } from 'cn';

import { Money } from './money';
import { type AmountToneKind, useAmountTone } from './use-amount-tone';

interface TonedMoneyProps {
  cents: number;
  kind: AmountToneKind;
  isSigned?: boolean;
  className?: string;
}

/** `Money` com a cor do valor decidida por `useAmountTone`. */
export function TonedMoney({ cents, kind, isSigned = false, className }: TonedMoneyProps) {
  const tone = useAmountTone(cents, kind);
  return (
    <span className={cn(tone, className)}>
      <Money cents={cents} isSigned={isSigned} />
    </span>
  );
}
