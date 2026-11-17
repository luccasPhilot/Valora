import { useEffect, useState } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router';

import { SegmentedControl } from '@/components/segmented-control';
import { useDocumentTitle } from '@/hooks/use-document-title';

import { REPORT_DEFINITIONS } from './report-definitions';
import { REPORT_PERIOD_OPTIONS } from './report-period';
import { ReportsNav } from './reports-nav';
import { useReportFilters } from './use-report-filters';

export const REPORT_FILTERS_ID = 'report-filters';

const REPORTS_TITLE = 'Relatórios';
const UNUSED_PERIOD_NOTE = 'O período passa a valer quando o histórico tiver dois meses.';

/** Leva o foco ao filtro de período, que fica acima do relatório. */
export function focusPeriodFilter(): void {
  document.getElementById(REPORT_FILTERS_ID)?.querySelector<HTMLElement>('[role="radio"]')?.focus();
}

interface ReportsOutletContext {
  readonly setIsPeriodUnused: (isUnused: boolean) => void;
}

/**
 * Um relatório avisa o layout quando o período não muda nada no que ele mostra (o patrimônio com um
 * mês de histórico): o filtro dá lugar a uma nota com o motivo.
 */
export function useReportPeriodUnused(isUnused: boolean): void {
  const context = useOutletContext<ReportsOutletContext | undefined>();
  const setIsPeriodUnused = context?.setIsPeriodUnused;
  useEffect(() => {
    setIsPeriodUnused?.(isUnused);
    return () => setIsPeriodUnused?.(false);
  }, [isUnused, setIsPeriodUnused]);
}

function useReportTitle(): string {
  const { pathname } = useLocation();
  const openReport = REPORT_DEFINITIONS.find((report) => pathname.endsWith(`/${report.path}`));
  return openReport ? `${openReport.label} | ${REPORTS_TITLE}` : REPORTS_TITLE;
}

/**
 * Estrutura dos relatórios: abas entre eles, o período e o relatório aberto. "Gráfico ou tabela"
 * fica no cartão que ele troca, não aqui.
 */
export function Component() {
  const { period, filtersSearch, setPeriod } = useReportFilters();
  const [isPeriodUnused, setIsPeriodUnused] = useState(false);
  useDocumentTitle(useReportTitle());
  return (
    <div className="space-y-4">
      <ReportsNav reports={REPORT_DEFINITIONS} filtersSearch={filtersSearch} />
      <div id={REPORT_FILTERS_ID}>
        {isPeriodUnused ? (
          <p className="text-sm text-muted-foreground">{UNUSED_PERIOD_NOTE}</p>
        ) : (
          <SegmentedControl
            label="Período"
            isLabelVisible={false}
            options={REPORT_PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            className="w-full sm:w-fit"
          />
        )}
      </div>
      <Outlet context={{ setIsPeriodUnused } satisfies ReportsOutletContext} />
    </div>
  );
}
