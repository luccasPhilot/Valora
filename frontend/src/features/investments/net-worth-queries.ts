import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getNetWorth } from '@/lib/api/net-worth';
import { queryKeys } from '@/lib/query-keys';

import { netWorthFrom, type NetWorthPeriod } from './net-worth-view';

/** Mantém o gráfico anterior na tela enquanto o novo período carrega, para o cartão não piscar. */
export function useNetWorth(period: NetWorthPeriod) {
  return useQuery({
    queryKey: [...queryKeys.netWorth, period],
    queryFn: () => getNetWorth(netWorthFrom(period)),
    placeholderData: keepPreviousData,
  });
}
