import type { InvestmentGroup } from '@/lib/api/investments';
import { formatPercent } from '@/lib/format';

import { investmentTypeInfo } from './investment-labels';
import { groupsWithShare, seriesColor } from './investment-view';

const FULL_PERCENT = 100;

interface CompositionBarProps {
  groups: readonly InvestmentGroup[];
}

/** Resumo para leitor de tela: "Renda fixa 75%, Fundos 25%". */
function describeComposition(groups: readonly InvestmentGroup[]): string {
  return groups
    .map(
      ({ type, percent }) =>
        `${investmentTypeInfo(type).label} ${formatPercent(percent / FULL_PERCENT)}`,
    )
    .join(', ');
}

/**
 * Barra segmentada com a parte de cada tipo no total. Cada fatia usa um slot da paleta de gráficos, em
 * ordem; os segmentos vizinhos são os pares que a paleta garante distinguir. Só desta tela.
 */
export function CompositionBar({ groups }: CompositionBarProps) {
  const slices = groupsWithShare(groups);
  return (
    <div
      role="img"
      aria-label={`Composição por tipo: ${describeComposition(slices)}`}
      className="flex h-3 gap-0.5 overflow-hidden rounded-full"
    >
      {slices.map((group, index) => (
        <span
          key={group.type}
          title={`${investmentTypeInfo(group.type).label}: ${formatPercent(group.percent / FULL_PERCENT)}`}
          className="h-full min-w-1"
          style={{ flex: `${String(group.totalCents)} 1 0`, backgroundColor: seriesColor(index) }}
        />
      ))}
    </div>
  );
}
