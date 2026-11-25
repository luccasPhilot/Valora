import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getCategoryInsights } from '@/lib/api/category-insights';
import { queryKeys } from '@/lib/query-keys';

/** Mantém o mês anterior na tela enquanto o novo carrega. */
export function useCategoryInsights(month: string) {
  return useQuery({
    queryKey: [...queryKeys.categoryInsights, month],
    queryFn: () => getCategoryInsights(month),
    placeholderData: keepPreviousData,
  });
}
