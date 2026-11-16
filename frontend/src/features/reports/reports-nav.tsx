import { NavLink } from 'react-router';

import { type ReportDefinition, REPORTS_BASE_PATH } from './report-definitions';

const MIN_REPORTS_FOR_NAV = 2;

interface ReportsNavProps {
  reports: readonly ReportDefinition[];
  /** O `?periodo=` atual (ou vazio): vai junto no link, para o período valer em qualquer relatório. */
  periodSearch: string;
}

/** Links entre os relatórios; com um relatório só, não há para onde ir e a navegação some. */
export function ReportsNav({ reports, periodSearch }: ReportsNavProps) {
  if (reports.length < MIN_REPORTS_FOR_NAV) return null;
  return (
    <nav aria-label="Relatórios" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex w-max gap-1 rounded-3xl border bg-card p-1">
        {reports.map((report) => (
          <li key={report.key}>
            <NavLink
              to={{ pathname: `${REPORTS_BASE_PATH}/${report.path}`, search: periodSearch }}
              className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-secondary aria-[current=page]:text-secondary-foreground"
            >
              {report.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
