import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

import { PAGE_TAB_CLASSES } from '@/components/page-tab-classes';

import { useReviewCount } from './review-queries';

export const TRANSACTIONS_PATH = '/transacoes';
export const REVIEW_INBOX_PATH = '/transacoes/revisar';

interface TransactionsViewsNavProps {
  /** Ações à direita das abas, como "Selecionar". */
  actions?: ReactNode;
}

/** As duas visões de Transações: a lista com filtros e a caixa "Para revisar", com o contador. */
export function TransactionsViewsNav({ actions }: TransactionsViewsNavProps) {
  const reviewCount = useReviewCount().data ?? 0;
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b">
      <nav aria-label="Visões de Transações">
        <ul className="flex gap-1">
          <li className="-mb-px">
            <NavLink to={TRANSACTIONS_PATH} end className={PAGE_TAB_CLASSES}>
              Todas
            </NavLink>
          </li>
          <li className="-mb-px">
            <NavLink to={REVIEW_INBOX_PATH} className={PAGE_TAB_CLASSES}>
              Para revisar
              {reviewCount > 0 ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground tabular-nums">
                  <span className="sr-only">: </span>
                  {reviewCount}
                </span>
              ) : null}
            </NavLink>
          </li>
        </ul>
      </nav>
      {actions ? <div className="flex flex-wrap gap-2 pb-1">{actions}</div> : null}
    </div>
  );
}
