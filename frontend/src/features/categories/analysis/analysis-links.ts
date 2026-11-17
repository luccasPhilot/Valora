import { UNCATEGORIZED_FILTER } from '@/lib/api/transactions';

import { monthRange } from '../../budgets/budget-months';
import { NO_FILTERS, serializeFilters } from '../../transactions/transaction-filters';

const TRANSACTIONS_PATH = '/transacoes';

interface LinkableCategory {
  readonly kind: 'category' | 'uncategorized';
  readonly categoryId: string | null;
}

/**
 * Link para as transações que formam o gasto de uma categoria (ou de "Sem categoria") no mês
 * analisado. `month` é `AAAA-MM`; nulo quando a categoria não tem id para filtrar.
 */
export function insightTransactionsPath(category: LinkableCategory, month: string): string | null {
  const categoryId = category.kind === 'uncategorized' ? UNCATEGORIZED_FILTER : category.categoryId;
  if (categoryId === null) return null;
  const { from, to } = monthRange(month);
  const params = serializeFilters({ ...NO_FILTERS, period: 'custom', from, to, categoryId });
  return `${TRANSACTIONS_PATH}?${params.toString()}`;
}
