import { useQuery } from '@tanstack/react-query';

import { getDashboard } from '@/lib/api/dashboard';

import { DASHBOARD_QUERY_KEY } from './dashboard-query-key';

export function useDashboard() {
  return useQuery({ queryKey: DASHBOARD_QUERY_KEY, queryFn: getDashboard });
}
