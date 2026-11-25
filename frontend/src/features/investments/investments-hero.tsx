import { TrendingUp } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { Money } from '@/components/money';
import { TonedMoney } from '@/components/toned-money';
import type { Investments } from '@/lib/api/investments';
import { formatPercent } from '@/lib/format';

import { CompositionBar } from './composition-bar';
import { describePositions, investmentTypeInfo } from './investment-labels';
import { groupsWithShare, seriesColor } from './investment-view';

const FULL_PERCENT = 100;

interface InvestmentsHeroProps {
  investments: Investments;
}

function countInstitutions(groups: Investments['groups']): number {
  const names = groups.flatMap(({ items }) => items.map(({ institutionName }) => institutionName));
  return new Set(names).size;
}

/** Nível 1 da tela: o total, a barra de composição e a legenda que liga cada cor ao seu tipo. */
export function InvestmentsHero({ investments }: InvestmentsHeroProps) {
  const { totals, groups } = investments;
  return (
    <DataCard title="Investimentos" tier="hero" icon={TrendingUp} className="gap-5">
      <Metric
        size="display"
        value={<TonedMoney cents={totals.totalCents} kind="balance" />}
        caption={describePositions(totals.positionsCount, countInstitutions(groups))}
      />
      <CompositionBar groups={groups} />
      <ul className="space-y-2">
        {groupsWithShare(groups).map((group, index) => (
          <li key={group.type} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: seriesColor(index) }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 pr-1">{investmentTypeInfo(group.type).label}</span>
            <span className="shrink-0 text-right whitespace-nowrap tabular-nums">
              <span className="font-medium">
                <Money cents={group.totalCents} />
              </span>{' '}
              <span className="text-xs text-muted-foreground">
                {formatPercent(group.percent / FULL_PERCENT)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </DataCard>
  );
}
