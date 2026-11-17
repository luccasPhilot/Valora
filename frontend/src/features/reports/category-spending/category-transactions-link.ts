import type { CategorySeries } from '@/lib/api/reports';
import { UNCATEGORIZED_FILTER } from '@/lib/api/transactions';
import { lastDayOfMonth } from '@/lib/dates';

import { NO_FILTERS, serializeFilters } from '../../transactions/transaction-filters';

const TRANSACTIONS_PATH = '/transacoes';

/**
 * Link para as transações que formam o gasto de uma categoria no período do relatório. "Outros"
 * junta várias categorias, então não tem uma lista só: nulo. `from` e `to` são meses `AAAA-MM`.
 */
export function categoryTransactionsPath(
  series: CategorySeries,
  from: string,
  to: string,
): string | null {
  if (series.kind === 'other') return null;
  const categoryId = series.kind === 'uncategorized' ? UNCATEGORIZED_FILTER : series.categoryId;
  if (categoryId === null) return null;
  const params = serializeFilters({
    ...NO_FILTERS,
    period: 'custom',
    from: `${from}-01`,
    to: lastDayOfMonth(`${to}-01`),
    categoryId,
  });
  return `${TRANSACTIONS_PATH}?${params.toString()}`;
}
