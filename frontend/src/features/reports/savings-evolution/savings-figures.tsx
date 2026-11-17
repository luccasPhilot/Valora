import { CalendarCheck, Percent, Scale } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import type { SavingsEvolutionReport } from '@/lib/api/reports';
import { formatSignedPercent } from '@/lib/format';

import { ReportHero } from '../report-hero';
import { ResultMoney } from '../result-money';

const PERCENT_SCALE = 100;
const NO_VALUE_TEXT = '—';

interface FigureProps {
  title: string;
  icon: typeof Scale;
  /** Uma linha de explicação do número, para ele não ser confundido com rendimento ou saldo. */
  hint: string;
  children: ReactNode;
}

function Figure({ title, icon, hint, children }: FigureProps) {
  return (
    <DataCard title={title} icon={icon} className="min-w-0 gap-2">
      {/* O valor nunca quebra nem é cortado: se faltar espaço, é o rótulo que encolhe. */}
      <p className="text-xl font-bold tracking-tight whitespace-nowrap tabular-nums">{children}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </DataCard>
  );
}

function SurplusMonths({ surplusMonths, closedMonths }: SavingsEvolutionReport['totals']) {
  if (closedMonths === 0) return NO_VALUE_TEXT;
  return (
    <>
      {surplusMonths} de {closedMonths}{' '}
      <span className="text-sm font-normal text-muted-foreground">
        {closedMonths === 1 ? 'mês fechado' : 'meses fechados'}
      </span>
    </>
  );
}

interface SavingsFiguresProps extends Pick<SavingsEvolutionReport, 'totals'> {
  /** A frase que explica o resultado, ou nulo quando faltam meses fechados para comparar. */
  context: ReactNode;
}

/** O resultado do período em destaque e, abaixo, a taxa de poupança e os meses com sobra. */
export function SavingsFigures({ totals, context }: SavingsFiguresProps) {
  const { savingsRatePercent } = totals;
  return (
    <div className="space-y-3">
      <ReportHero
        title="Resultado do período"
        icon={Scale}
        value={<ResultMoney cents={totals.resultCents} />}
        context={context}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Figure title="Taxa de poupança" icon={Percent} hint="Resultado ÷ receitas do período">
          {savingsRatePercent === null
            ? NO_VALUE_TEXT
            : formatSignedPercent(savingsRatePercent / PERCENT_SCALE)}
        </Figure>
        <Figure title="Meses com sobra" icon={CalendarCheck} hint="Só meses já fechados">
          <SurplusMonths {...totals} />
        </Figure>
      </div>
    </div>
  );
}
