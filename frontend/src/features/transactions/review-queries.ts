import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import {
  changeCategoryOfMany,
  getReviewCount,
  listReviewInbox,
  reviewAllTransactions,
  reviewTransactions,
} from '@/lib/api/transactions';
import { queryKeys } from '@/lib/query-keys';

const FIRST_PAGE = 1;

/** A caixa "Para revisar", paginada como a lista de transações. */
export function useReviewInbox() {
  return useInfiniteQuery({
    queryKey: queryKeys.reviewInbox,
    queryFn: ({ pageParam }) => listReviewInbox(pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: ({ pagination }) =>
      pagination.page * pagination.limit < pagination.total ? pagination.page + 1 : undefined,
  });
}

export function useReviewCount() {
  return useQuery({ queryKey: queryKeys.reviewCount, queryFn: getReviewCount });
}

/** "Ok" numa transação e "Marcar como revisadas" na seleção. */
export function useReviewTransactions() {
  return useMutation({
    mutationFn: (transactionIds: readonly string[]) => reviewTransactions(transactionIds),
    onSuccess: useInvalidateAfter('transaction-review'),
  });
}

/** "Marcar tudo como revisado": `until` é o `loadedAt` da primeira página da caixa. */
export function useReviewAll() {
  return useMutation({
    mutationFn: (until: string) => reviewAllTransactions(until),
    onSuccess: useInvalidateAfter('transaction-review'),
  });
}

export interface BulkCategoryChangeRequest {
  readonly transactionIds: readonly string[];
  readonly categoryId: string;
}

export function useChangeCategoryOfMany() {
  return useMutation({
    mutationFn: ({ transactionIds, categoryId }: BulkCategoryChangeRequest) =>
      changeCategoryOfMany(transactionIds, categoryId),
    onSuccess: useInvalidateAfter('transaction-categories'),
  });
}
