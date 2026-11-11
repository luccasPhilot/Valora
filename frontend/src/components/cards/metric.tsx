import { cn } from 'cn';
import type { ReactNode } from 'react';

type MetricSize = 'display' | 'lg' | 'md';

const SIZE_CLASSES: Readonly<Record<MetricSize, string>> = {
  display: 'type-display',
  lg: 'type-value-lg',
  // Para cartões lado a lado em telas estreitas, onde `lg` não cabe (ex.: "+ R$ 12.345,67" em meia coluna).
  md: 'font-display text-2xl font-bold',
};

interface MetricProps {
  /** O número-chave, normalmente `<Money />`. */
  value: ReactNode;
  /** Uma linha de contexto, pequena e apagada ("63,3% do total"). */
  caption?: ReactNode;
  /** `display` só no cartão de nível 1; `lg` nos demais; `md` quando o valor precisa caber em meia coluna. */
  size?: MetricSize;
  /** Vermelho só para saldo negativo, nunca para despesa. */
  isNegative?: boolean;
  /** Cor ou ajuste do valor (ex.: `text-positive` para receita). O padrão é a cor do texto. */
  valueClassName?: string;
}

/** O número que o cartão existe para mostrar: o maior texto do cartão, com uma linha de contexto. */
export function Metric({
  value,
  caption,
  size = 'lg',
  isNegative = false,
  valueClassName,
}: MetricProps) {
  return (
    <div className="min-w-0 space-y-1">
      <p
        className={cn(
          SIZE_CLASSES[size],
          'break-words tabular-nums',
          isNegative && 'text-destructive',
          valueClassName,
        )}
      >
        {value}
      </p>
      {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
