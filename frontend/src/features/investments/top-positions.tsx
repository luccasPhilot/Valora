import { ChartBarBig } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import type { InvestmentGroup } from '@/lib/api/investments';
import { formatPercent } from '@/lib/format';

import { investmentSubtypeLabel } from './investment-labels';
import { topPositions } from './investment-view';

const TOP_COUNT = 5;
const FULL_PERCENT = 100;

interface TopPositionsProps {
  groups: readonly InvestmentGroup[];
}

/** Nível 2: o ranking das maiores posições, em barras finas de uma cor só (parte de um total). */
export function TopPositions({ groups }: TopPositionsProps) {
  const positions = topPositions(groups, TOP_COUNT);
  const largestCents = Math.max(...positions.map(({ balanceCents }) => balanceCents), 1);
  return (
    <DataCard title="Maiores posições" icon={ChartBarBig}>
      <ol className="space-y-4">
        {positions.map((position, index) => (
          <li key={position.id} className="flex gap-3">
            <span
              className="w-4 shrink-0 pt-px text-center text-xs font-semibold text-muted-foreground tabular-nums"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="flex flex-col gap-0.5 min-[400px]:flex-row min-[400px]:items-baseline min-[400px]:justify-between min-[400px]:gap-3">
                <span className="min-w-0 text-sm font-medium min-[400px]:truncate">
                  {position.name}
                </span>
                <span className="shrink-0 whitespace-nowrap tabular-nums">
                  <span className="text-sm font-semibold">
                    <Money cents={position.balanceCents} />
                  </span>{' '}
                  <span className="text-xs text-muted-foreground">
                    {formatPercent(position.percent / FULL_PERCENT)}
                  </span>
                </span>
              </span>
              <span
                className="block h-1.5 overflow-hidden rounded-full bg-track"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max(0, (position.balanceCents / largestCents) * FULL_PERCENT)}%`,
                  }}
                />
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {position.subtype === null
                  ? position.institutionName
                  : `${investmentSubtypeLabel(position.subtype)} · ${position.institutionName}`}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </DataCard>
  );
}
