import { ChevronRight } from 'lucide-react';

import { Metric } from '@/components/cards/metric';
import { ValueChange } from '@/components/cards/value-change';
import { Money } from '@/components/money';
import type { DashboardNetWorth } from '@/lib/api/dashboard';

import { SectionLink } from './dashboard-section';

const NET_WORTH_PATH = '/investimentos';

/** Sem investimento nem fatura o patrimônio é igual ao saldo, e repetir o número só atrapalha. */
export function hasNetWorthToShow(
  netWorth: DashboardNetWorth | null,
): netWorth is DashboardNetWorth {
  return netWorth !== null && (netWorth.investmentsCents !== 0 || netWorth.openBillsCents !== 0);
}

/** Linha do card de saldo: patrimônio (contas + investimentos − faturas), variação no mês e o link da curva. */
export function NetWorthLine({ netWorth }: { netWorth: DashboardNetWorth }) {
  return (
    <div className="min-w-0 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <p className="type-label">Patrimônio</p>
        <SectionLink to={NET_WORTH_PATH}>
          Ver patrimônio
          <ChevronRight className="size-4" aria-hidden="true" />
        </SectionLink>
      </div>
      <Metric
        size="md"
        value={<Money cents={netWorth.totalCents} />}
        isNegative={netWorth.totalCents < 0}
      />
      {netWorth.change ? <ValueChange change={netWorth.change} /> : null}
    </div>
  );
}
