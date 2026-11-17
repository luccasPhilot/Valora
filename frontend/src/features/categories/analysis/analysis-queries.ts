import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getCategoryInsights } from '@/lib/api/category-insights';

import { REPORTS_QUERY_KEY } from '../../reports/reports-query-key';

/**
 * A chave começa por `REPORTS_QUERY_KEY`: lançar, editar, excluir ou recategorizar uma transação já
 * invalida os relatórios, e a análise muda junto. Mantém o mês anterior na tela enquanto o novo carrega.
 */
export function useCategoryInsights(month: string) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'category-insights', month],
    queryFn: () => getCategoryInsights(month),
    placeholderData: keepPreviousData,
  });
}
