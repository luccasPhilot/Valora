import { useSearchParams } from 'react-router';

import { parseReportPeriod, type ReportPeriod } from './report-period';

export type ReportView = 'grafico' | 'tabela';

const PERIOD_PARAM = 'periodo';
const VIEW_PARAM = 'visao';
const TABLE_VIEW_VALUE: ReportView = 'tabela';

export interface ReportFilters {
  readonly period: ReportPeriod;
  readonly view: ReportView;
  /** Só o período, para os links entre relatórios: "?periodo=24m", ou vazio quando a URL não tem. */
  readonly periodSearch: string;
  readonly setPeriod: (period: ReportPeriod) => void;
  readonly setView: (view: ReportView) => void;
}

/** Período e visão (gráfico ou tabela) dos relatórios, guardados na URL para valer em qualquer relatório. */
export function useReportFilters(): ReportFilters {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPeriod = searchParams.get(PERIOD_PARAM);
  const period = parseReportPeriod(rawPeriod);
  return {
    period,
    view: searchParams.get(VIEW_PARAM) === TABLE_VIEW_VALUE ? 'tabela' : 'grafico',
    periodSearch: rawPeriod === null ? '' : `?${PERIOD_PARAM}=${period}`,
    setPeriod: (period) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set(PERIOD_PARAM, period);
          return next;
        },
        { replace: true },
      ),
    setView: (view) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (view === 'tabela') next.set(VIEW_PARAM, TABLE_VIEW_VALUE);
          else next.delete(VIEW_PARAM);
          return next;
        },
        { replace: true },
      ),
  };
}
