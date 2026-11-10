import { useQuery } from '@tanstack/react-query';

import { getInvestments } from '@/lib/api/investments';

export const INVESTMENTS_QUERY_KEY = ['investments'] as const;

export function useInvestments() {
  return useQuery({ queryKey: INVESTMENTS_QUERY_KEY, queryFn: getInvestments });
}
