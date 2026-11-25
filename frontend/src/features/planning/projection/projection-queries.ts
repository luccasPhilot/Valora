import { useQuery } from '@tanstack/react-query';

import { getProjection } from '@/lib/api/projection';
import { queryKeys } from '@/lib/query-keys';

export function useProjection() {
  return useQuery({ queryKey: queryKeys.projection, queryFn: getProjection });
}
