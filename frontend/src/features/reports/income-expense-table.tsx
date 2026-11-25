import { Money } from '@/components/money';
import { TonedMoney } from '@/components/toned-money';
import type { IncomeExpenseReport } from '@/lib/api/reports';
import { formatMonthYear } from '@/lib/format';

import { ReportTable, type ReportTableRow } from './report-table';
import { ResultMoney } from './result-money';

const COLUMNS = ['Receitas', 'Despesas', 'Resultado'] as const;
const PARTIAL_MONTH_LABEL = 'em andamento';

interface IncomeExpenseTableProps {
  report: IncomeExpenseReport;
  caption: string;
  /** Mês (`AAAA-MM`) ainda em andamento, marcado com texto. */
  partialMonth: string;
}

function toCells(totals: {
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
}): ReportTableRow['cells'] {
  return [
    <TonedMoney key="income" cents={totals.incomeCents} kind="flow" isSigned />,
    <Money key="expense" cents={-totals.expenseCents} isSigned />,
    <ResultMoney key="result" cents={totals.resultCents} />,
  ];
}

/** Os mesmos meses e valores do gráfico, em tabela, com a linha de total do período. */
export function IncomeExpenseTable({ report, caption, partialMonth }: IncomeExpenseTableProps) {
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
  return (
    <ReportTable
      caption={caption}
      rowHeaderLabel="Mês"
      columns={COLUMNS}
      rows={rows}
      total={{ header: 'Total do período', cells: toCells(report.totals) }}
    />
  );
}
