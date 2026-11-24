import { Money } from '@/components/money';
import { TonedMoney } from '@/components/toned-money';
import type { NetWorthPoint } from '@/lib/api/net-worth';
import { formatMonthYear } from '@/lib/format';

import { ReportTable, type ReportTableRow } from '../report-table';

const COLUMNS = ['Contas', 'Investimentos', 'Faturas em aberto', 'Patrimônio'] as const;
const PARTIAL_MONTH_LABEL = 'em andamento';

interface NetWorthTableProps {
  points: readonly NetWorthPoint[];
  caption: string;
  /** Mês (`AAAA-MM`) ainda em andamento, marcado com texto. */
  partialMonth: string;
}

function toCells(point: NetWorthPoint): ReportTableRow['cells'] {
  return [
    <Money key="accounts" cents={point.accountsCents} />,
    <Money key="investments" cents={point.investmentsCents} />,
    <Money key="bills" cents={-point.openBillsCents} isSigned />,
    <TonedMoney
      key="net-worth"
      cents={point.netWorthCents}
      kind="balance"
      className="font-semibold"
    />,
  ];
}

/**
 * Os mesmos meses e valores dos gráficos, em tabela. Sem linha de total: o patrimônio não se soma
 * entre meses; a última linha é o mês atual.
 */
export function NetWorthTable({ points, caption, partialMonth }: NetWorthTableProps) {
  const rows: ReportTableRow[] = points.map((point) => ({
    key: point.month,
    header: (
      <>
        {formatMonthYear(point.month)}
        {point.month === partialMonth ? (
          <span className="block text-xs font-normal text-muted-foreground">
            {PARTIAL_MONTH_LABEL}
          </span>
        ) : null}
      </>
    ),
    cells: toCells(point),
  }));
  return <ReportTable caption={caption} rowHeaderLabel="Mês" columns={COLUMNS} rows={rows} />;
}
