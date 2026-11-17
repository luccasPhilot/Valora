import { cn } from 'cn';
import type { ReactNode } from 'react';

import { formatMonthYear } from '@/lib/format';

import { isHistoryShorterThanPeriod, type ReportPeriod } from './report-period';

interface RefreshingReportProps {
  /** Verdadeiro enquanto o relatório do novo período carrega e os dados antigos seguem na tela. */
  isRefreshing: boolean;
  children: ReactNode;
}

/** Dados antigos ficam à vista, mas esmaecidos e avisados como "atualizando" até o novo período chegar. */
export function RefreshingReport({ isRefreshing, children }: RefreshingReportProps) {
  return (
    <div
      aria-busy={isRefreshing}
      className={cn('motion-safe:transition-opacity', isRefreshing && 'opacity-60')}
    >
      <p role="status" className="sr-only">
        {isRefreshing ? 'Atualizando o relatório' : ''}
      </p>
      {children}
    </div>
  );
}

interface HistoryStartNoteProps {
  /** Primeiro mês com dados, `AAAA-MM`. */
  firstMonth: string;
  monthsCount: number;
  period: ReportPeriod;
}

/** Avisa que o período pedido é maior que o histórico: sem isso, "24 meses" mostra 8 sem explicar. */
export function HistoryStartNote({ firstMonth, monthsCount, period }: HistoryStartNoteProps) {
  if (!isHistoryShorterThanPeriod(firstMonth, period)) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Há dados desde {formatMonthYear(firstMonth)}, por isso o período mostra {monthsCount}{' '}
      {monthsCount === 1 ? 'mês' : 'meses'}.
    </p>
  );
}
