import { cn } from 'cn';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { Money } from '@/components/money';
import { useAmountTone } from '@/components/use-amount-tone';
import { formatPercent } from '@/lib/format';

const PERCENT_TO_RATIO = 100;

export interface ValueChangeData {
  readonly cents: number;
  /** Nulo quando o valor inicial é zero e não há base para a porcentagem. */
  readonly percent: number | null;
}

function signedPercent(percent: number): string {
  const text = formatPercent(percent / PERCENT_TO_RATIO);
  return percent > 0 ? `+${text}` : text;
}

interface ValueChangeProps {
  change: ValueChangeData;
  /** Período da variação; por padrão "no mês". */
  label?: string;
}

/** Variação de um valor: ícone e texto (nunca só a cor), verde só quando subiu. */
export function ValueChange({ change, label = 'no mês' }: ValueChangeProps) {
  const Icon = change.cents < 0 ? TrendingDown : TrendingUp;
  const tone = useAmountTone(change.cents, 'flow');
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
      <Icon className={cn('size-4', tone || 'text-muted-foreground')} aria-hidden="true" />
      <span className={cn('tabular-nums', tone)}>
        <Money cents={change.cents} isSigned />
        {change.percent === null ? null : ` (${signedPercent(change.percent)})`}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </p>
  );
}
