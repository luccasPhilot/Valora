import { useQuery } from '@tanstack/react-query';

import { getProjection } from '@/lib/api/projection';

/** Prefixo da consulta da projeção: decidir uma previsão muda o resultado, então ela é recarregada junto. */
export const PROJECTION_QUERY_KEY = ['projection'] as const;

export function useProjection() {
  return useQuery({ queryKey: PROJECTION_QUERY_KEY, queryFn: getProjection });
}
