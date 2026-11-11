import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getNetWorth } from '@/lib/api/net-worth';

import { NET_WORTH_QUERY_KEY } from './net-worth-query-key';
import { netWorthFrom, type NetWorthPeriod } from './net-worth-view';

/** Mantém o gráfico anterior na tela enquanto o novo período carrega, para o cartão não piscar. */
export function useNetWorth(period: NetWorthPeriod) {
  return useQuery({
    queryKey: [...NET_WORTH_QUERY_KEY, period],
    queryFn: () => getNetWorth(netWorthFrom(period)),
    placeholderData: keepPreviousData,
  });
}
