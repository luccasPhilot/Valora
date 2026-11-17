import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';

import { type ReportDefinition, REPORTS_BASE_PATH } from './report-definitions';

const MIN_REPORTS_FOR_NAV = 2;

interface ReportsNavProps {
  reports: readonly ReportDefinition[];
  /** O `?periodo=` e o `?visao=` atuais (ou vazio): vão junto no link, para valerem em qualquer relatório. */
  filtersSearch: string;
}

// No celular as abas não cabem numa linha: a linha rola, sem barra, e as bordas esmaecem para
// mostrar que há mais. A margem à direita deixa a última aba sair de baixo do esmaecido.
const SCROLL_CLASSES = [
  '-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  'max-sm:pr-12 max-sm:[mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-2rem),transparent)]',
  'sm:mx-0 sm:px-0',
].join(' ');

const TAB_CLASSES = [
  'inline-flex h-11 items-center border-b-2 border-transparent px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground outline-none',
  'hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
  'aria-[current=page]:border-primary aria-[current=page]:text-foreground',
].join(' ');

/**
 * Abas entre os relatórios; com um relatório só, não há para onde ir e a navegação some. A aba
 * aberta sempre fica à vista, mesmo com a linha rolando.
 */
export function ReportsNav({ reports, filtersSearch }: ReportsNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const nav = navRef.current;
    const openTab = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !openTab) return;
    nav.scrollLeft = openTab.offsetLeft - (nav.clientWidth - openTab.offsetWidth) / 2;
  }, [pathname]);
  if (reports.length < MIN_REPORTS_FOR_NAV) return null;
  return (
    <nav ref={navRef} aria-label="Relatórios" className={`relative ${SCROLL_CLASSES}`}>
      <ul className="flex w-max min-w-full gap-1 border-b">
        {reports.map((report) => (
          <li key={report.key} className="-mb-px">
            <NavLink
              to={{ pathname: `${REPORTS_BASE_PATH}/${report.path}`, search: filtersSearch }}
              className={TAB_CLASSES}
            >
              {report.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
