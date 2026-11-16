import { Money } from '@/components/money';
import type { CategorySpendingReport } from '@/lib/api/reports';
import { formatMonthYear } from '@/lib/format';

import { ReportTable, type ReportTableRow } from '../report-table';

const TOTAL_COLUMN = 'Total';
const PARTIAL_MONTH_LABEL = 'em andamento';

interface CategorySpendingTableProps {
  report: CategorySpendingReport;
  caption: string;
  /** Mês (`AAAA-MM`) ainda em andamento, marcado com texto. */
  partialMonth: string;
}

/** Um valor por série e, no fim, o total da linha. */
function toCells(valuesCents: readonly number[], totalCents: number): ReportTableRow['cells'] {
  return [...valuesCents, totalCents].map((cents, position) => (
    // A posição é a identidade: as colunas não mudam de ordem dentro de uma tabela.
    <Money key={position} cents={cents} />
  ));
}

/** Os mesmos meses e valores do gráfico: um mês por linha, uma coluna por série e o total. */
export function CategorySpendingTable({
  report,
  caption,
  partialMonth,
}: CategorySpendingTableProps) {
  const rows: ReportTableRow[] = report.months.map((month, monthIndex) => ({
    key: month,
    header: (
      <>
        {formatMonthYear(month)}
        {month === partialMonth ? (
          <span className="block text-xs font-normal text-muted-foreground">
            {PARTIAL_MONTH_LABEL}
          </span>
        ) : null}
      </>
    ),
    cells: toCells(
      report.series.map((series) => series.monthlyCents[monthIndex] ?? 0),
      report.totals.monthlyCents[monthIndex] ?? 0,
    ),
  }));
  return (
    <ReportTable
      caption={caption}
      rowHeaderLabel="Mês"
      columns={[...report.series.map((series) => series.name), TOTAL_COLUMN]}
      rows={rows}
      total={{
        header: 'Total do período',
        cells: toCells(
          report.series.map((series) => series.totalCents),
          report.totals.totalCents,
        ),
      }}
    />
  );
}
