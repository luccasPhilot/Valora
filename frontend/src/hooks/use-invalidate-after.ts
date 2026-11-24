import { useQueryClient } from '@tanstack/react-query';

import { type DataChange, invalidationsAfter } from '@/lib/query-keys';

/**
 * A função que marca como desatualizado tudo o que a mudança afeta, em paralelo. Os números são
 * calculados no servidor: as telas buscam de novo em vez de recalcular no front.
 */
export function useInvalidateAfter(change: DataChange): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      invalidationsAfter(change).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  };
}
