import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getNetWorth } from '@/lib/api/net-worth';
import {
  getCategorySpendingReport,
  getIncomeExpenseReport,
  getSavingsEvolutionReport,
} from '@/lib/api/reports';

import { NET_WORTH_QUERY_KEY } from '../investments/net-worth-query-key';
import { type ReportPeriod, reportRange } from './report-period';
import { REPORTS_QUERY_KEY } from './reports-query-key';

/** Mantém o relatório anterior na tela enquanto o novo período carrega, para a tela não piscar. */
export function useIncomeExpenseReport(period: ReportPeriod) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'income-expense', from, to],
    queryFn: () => getIncomeExpenseReport(from, to),
    placeholderData: keepPreviousData,
  });
}

export function useCategorySpendingReport(period: ReportPeriod) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'category-spending', from, to],
    queryFn: () => getCategorySpendingReport(from, to),
    placeholderData: keepPreviousData,
  });
}

export function useSavingsEvolutionReport(period: ReportPeriod) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'savings-evolution', from, to],
    queryFn: () => getSavingsEvolutionReport(from, to),
    placeholderData: keepPreviousData,
  });
}

/**
 * O patrimônio do período. A chave começa por `NET_WORTH_QUERY_KEY`: ocultar ou reexibir uma conta
 * invalida o relatório junto com o cartão de Investimentos.
 */
export function useNetWorthReport(period: ReportPeriod) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...NET_WORTH_QUERY_KEY, 'report', from, to],
    queryFn: () => getNetWorth(from, to),
    placeholderData: keepPreviousData,
  });
}
