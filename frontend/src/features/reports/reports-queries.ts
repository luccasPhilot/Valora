import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getNetWorth } from '@/lib/api/net-worth';
import {
  getCategorySpendingReport,
  getIncomeExpenseReport,
  getSavingsEvolutionReport,
} from '@/lib/api/reports';
import { queryKeys } from '@/lib/query-keys';

import { type ReportPeriod, reportRange } from './report-period';

/** Mantém o relatório anterior na tela enquanto o novo período carrega, para a tela não piscar. */
export function useIncomeExpenseReport(period: ReportPeriod, tagId: string | null = null) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...queryKeys.reports, 'income-expense', from, to, tagId],
    queryFn: () => getIncomeExpenseReport(from, to, tagId ?? undefined),
    placeholderData: keepPreviousData,
  });
}

export function useCategorySpendingReport(period: ReportPeriod, tagId: string | null = null) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...queryKeys.reports, 'category-spending', from, to, tagId],
    queryFn: () => getCategorySpendingReport(from, to, tagId ?? undefined),
    placeholderData: keepPreviousData,
  });
}

export function useSavingsEvolutionReport(period: ReportPeriod) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...queryKeys.reports, 'savings-evolution', from, to],
    queryFn: () => getSavingsEvolutionReport(from, to),
    placeholderData: keepPreviousData,
  });
}

/**
 * O patrimônio do período. A chave começa por `queryKeys.netWorth`: ocultar ou reexibir uma conta
 * invalida o relatório junto com o cartão de Investimentos.
 */
export function useNetWorthReport(period: ReportPeriod) {
  const { from, to } = reportRange(period);
  return useQuery({
    queryKey: [...queryKeys.netWorth, 'report', from, to],
    queryFn: () => getNetWorth(from, to),
    placeholderData: keepPreviousData,
  });
}
