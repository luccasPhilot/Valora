import { cn } from 'cn';
import type { ReactNode } from 'react';

type MetricSize = 'display' | 'lg';

interface MetricProps {
  /** O número-chave, normalmente `<Money />`. */
  value: ReactNode;
  /** Uma linha de contexto, pequena e apagada ("63,3% do total"). */
  caption?: ReactNode;
  /** `display` só no cartão de nível 1; `lg` nos demais. */
  size?: MetricSize;
  /** Vermelho só para saldo negativo, nunca para despesa. */
  isNegative?: boolean;
}

/** O número que o cartão existe para mostrar: o maior texto do cartão, com uma linha de contexto. */
export function Metric({ value, caption, size = 'lg', isNegative = false }: MetricProps) {
  return (
    <div className="space-y-1">
      <p
        className={cn(
          size === 'display' ? 'type-display' : 'type-value-lg',
          'tabular-nums',
          isNegative && 'text-destructive',
        )}
      >
        {value}
      </p>
      {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
