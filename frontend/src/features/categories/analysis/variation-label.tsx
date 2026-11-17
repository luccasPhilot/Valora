import { ArrowDown, ArrowUp, type LucideIcon, Minus, Sparkles } from 'lucide-react';

import { formatVariation, type VariationDirection, variationDirection } from './analysis-labels';

const DIRECTION_ICONS: Readonly<Record<VariationDirection, LucideIcon>> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
  none: Sparkles,
};

interface VariationLabelProps {
  /** Nulo quando a categoria não gastou nada no período de comparação: mostra "Novo". */
  percent: number | null;
}

/**
 * Variação contra o período de comparação em seta e texto. Gastar mais não é sempre ruim, então a
 * seta e o texto ficam na cor normal: o vermelho é só de estouro de orçamento.
 */
export function VariationLabel({ percent }: VariationLabelProps) {
  const Icon = DIRECTION_ICONS[variationDirection(percent)];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {formatVariation(percent)}
      <span className="sr-only"> em relação ao período de comparação</span>
    </span>
  );
}
