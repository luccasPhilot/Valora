import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import {
  createManualInvestment,
  deleteManualInvestment,
  getInvestments,
  type ManualInvestmentChanges,
  type ManualInvestmentInput,
  updateManualInvestment,
} from '@/lib/api/investments';
import { queryKeys } from '@/lib/query-keys';

export function useInvestments() {
  return useQuery({ queryKey: queryKeys.investments, queryFn: getInvestments });
}

export function useCreateInvestment() {
  return useMutation({
    mutationFn: (input: ManualInvestmentInput) => createManualInvestment(input),
    onSuccess: useInvalidateAfter('investments'),
  });
}

interface InvestmentUpdate {
  readonly id: string;
  readonly changes: ManualInvestmentChanges;
}

export function useUpdateInvestment() {
  return useMutation({
    mutationFn: ({ id, changes }: InvestmentUpdate) => updateManualInvestment(id, changes),
    onSuccess: useInvalidateAfter('investments'),
  });
}

export function useDeleteInvestment() {
  return useMutation({
    mutationFn: (id: string) => deleteManualInvestment(id),
    onSuccess: useInvalidateAfter('investments'),
  });
}
