import { useSearchParams } from 'react-router';

import { parseReportPeriod, type ReportPeriod } from './report-period';

export type ReportView = 'grafico' | 'tabela';

const PERIOD_PARAM = 'periodo';
const VIEW_PARAM = 'visao';
const TABLE_VIEW_VALUE: ReportView = 'tabela';

export interface ReportFilters {
  readonly period: ReportPeriod;
  readonly view: ReportView;
  /** Período e visão, para os links entre relatórios: "?periodo=24m&visao=tabela", ou vazio quando a URL não tem. */
  readonly filtersSearch: string;
  readonly setPeriod: (period: ReportPeriod) => void;
  readonly setView: (view: ReportView) => void;
}

function buildFiltersSearch(period: ReportPeriod | null, view: ReportView): string {
  const params = new URLSearchParams();
  if (period !== null) params.set(PERIOD_PARAM, period);
  if (view === TABLE_VIEW_VALUE) params.set(VIEW_PARAM, view);
  const search = params.toString();
  return search === '' ? '' : `?${search}`;
}

/** Período e visão (gráfico ou tabela) dos relatórios, guardados na URL para valer em qualquer relatório. */
export function useReportFilters(): ReportFilters {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPeriod = searchParams.get(PERIOD_PARAM);
  const period = parseReportPeriod(rawPeriod);
  const view: ReportView = searchParams.get(VIEW_PARAM) === TABLE_VIEW_VALUE ? 'tabela' : 'grafico';
  return {
    period,
    view,
    filtersSearch: buildFiltersSearch(rawPeriod === null ? null : period, view),
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
