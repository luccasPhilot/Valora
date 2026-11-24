import { Money } from '@/components/money';
import { TonedMoney } from '@/components/toned-money';
import type { SavingsEvolutionReport } from '@/lib/api/reports';
import { formatMonthYear, formatPercent } from '@/lib/format';

import { ReportTable, type ReportTableRow } from '../report-table';
import { ResultMoney } from '../result-money';

const COLUMNS = [
  'Receitas',
  'Despesas',
  'Resultado',
  'Taxa de poupança',
  'Sobra acumulada',
] as const;
const PARTIAL_MONTH_LABEL = 'em andamento';
const NO_RATE_TEXT = '—';
const PERCENT_SCALE = 100;

interface SavingsEvolutionTableProps {
  report: SavingsEvolutionReport;
  caption: string;
  /** Mês (`AAAA-MM`) ainda em andamento, marcado com texto. */
  partialMonth: string;
}

interface RowFigures {
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly resultCents: number;
  readonly savingsRatePercent: number | null;
  readonly cumulativeResultCents: number;
}

function toCells(figures: RowFigures): ReportTableRow['cells'] {
  const rate = figures.savingsRatePercent;
  return [
    <TonedMoney key="income" cents={figures.incomeCents} kind="flow" isSigned />,
    <Money key="expense" cents={-figures.expenseCents} isSigned />,
    <ResultMoney key="result" cents={figures.resultCents} />,
    // O percentual não é valor em reais: continua visível com "Ocultar valores".
    <span key="rate">{rate === null ? NO_RATE_TEXT : formatPercent(rate / PERCENT_SCALE)}</span>,
    <ResultMoney key="cumulative" cents={figures.cumulativeResultCents} />,
  ];
}

/** Os mesmos meses e valores dos gráficos, em tabela, com a linha de total do período. */
export function SavingsEvolutionTable({
  report,
  caption,
  partialMonth,
}: SavingsEvolutionTableProps) {
  const rows: ReportTableRow[] = report.months.map((month) => ({
    key: month.month,
    header: (
      <>
        {formatMonthYear(month.month)}
        {month.month === partialMonth ? (
          <span className="block text-xs font-normal text-muted-foreground">
            {PARTIAL_MONTH_LABEL}
          </span>
        ) : null}
      </>
    ),
    cells: toCells(month),
  }));
  const lastMonth = report.months.at(-1);
  return (
    <ReportTable
      caption={caption}
      rowHeaderLabel="Mês"
      columns={COLUMNS}
      rows={rows}
      total={{
        header: 'Total do período',
        cells: toCells({
          ...report.totals,
          // A sobra acumulada do último mês é a soma de todos os resultados do período.
          cumulativeResultCents: lastMonth?.cumulativeResultCents ?? 0,
        }),
      }}
    />
  );
}
