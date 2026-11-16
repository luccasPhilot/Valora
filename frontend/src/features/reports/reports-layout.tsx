import { Outlet } from 'react-router';

import { SegmentedControl, type SegmentedOption } from '@/components/segmented-control';

import { REPORT_DEFINITIONS } from './report-definitions';
import { REPORT_PERIOD_OPTIONS } from './report-period';
import { ReportsNav } from './reports-nav';
import { type ReportView, useReportFilters } from './use-report-filters';

export const REPORT_FILTERS_ID = 'report-filters';

/** Leva o foco ao filtro de período, que fica acima do relatório. */
export function focusPeriodFilter(): void {
  document.getElementById(REPORT_FILTERS_ID)?.querySelector<HTMLElement>('[role="radio"]')?.focus();
}

const VIEW_OPTIONS: readonly SegmentedOption<ReportView>[] = [
  { value: 'grafico', label: 'Gráfico' },
  { value: 'tabela', label: 'Tabela' },
];

/** Estrutura dos relatórios: navegação entre eles, período e "Ver em tabela", e o relatório aberto. */
export function Component() {
  const { period, view, periodSearch, setPeriod, setView } = useReportFilters();
  return (
    <div className="space-y-4">
      <ReportsNav reports={REPORT_DEFINITIONS} periodSearch={periodSearch} />
      <div id={REPORT_FILTERS_ID} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 sm:flex-1 lg:max-w-lg">
          <SegmentedControl
            label="Período"
            options={REPORT_PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <div className="min-w-0 sm:w-56">
          <SegmentedControl
            label="Visualização"
            options={VIEW_OPTIONS}
            value={view}
            onChange={setView}
          />
        </div>
      </div>
      <Outlet />
    </div>
  );
}
