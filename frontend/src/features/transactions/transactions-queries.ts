import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import { getAccountsOverview } from '@/lib/api/accounts';
import type { Category } from '@/lib/api/categories';
import {
  type AccountOption,
  changeTransactionCategory,
  countPossibleDuplicates,
  createTransaction,
  deleteTransaction,
  type DuplicateResolution,
  getTransaction,
  getTransactionSummary,
  listTransactions,
  resolveDuplicate,
  type Transaction,
  type TransactionInput,
  type TransactionPage,
  type TransactionQuery,
  updateTransaction,
} from '@/lib/api/transactions';
import { queryKeys } from '@/lib/query-keys';

const FIRST_PAGE = 1;

type TransactionPages = InfiniteData<TransactionPage, number>;

/** Lista paginada: cada página pedida à API vira mais um pedaço da mesma lista na tela. */
export function useTransactionList(query: TransactionQuery) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.transactions, query],
    queryFn: ({ pageParam }) => listTransactions(query, pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: ({ pagination }) =>
      pagination.page * pagination.limit < pagination.total ? pagination.page + 1 : undefined,
  });
}

/** Resumo do filtro inteiro (não só das páginas carregadas); usa os mesmos parâmetros da lista. */
export function useTransactionSummary(query: TransactionQuery) {
  return useQuery({
    queryKey: [...queryKeys.transactionSummary, query],
    queryFn: () => getTransactionSummary(query),
  });
}

/** As mesmas contas da tela de Contas, só com o que o filtro e o formulário precisam. */
export function useAccountOptions() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccountsOverview,
    select: ({ items }): AccountOption[] =>
      items.map(({ id, name, type, connection }) => ({
        id,
        name,
        type,
        institutionName: connection?.institutionName ?? null,
      })),
  });
}

export interface CategoryChangeRequest {
  readonly transaction: Transaction;
  readonly category: Category;
  readonly applyAlways: boolean;
}

function withNewCategory(
  pages: TransactionPages,
  request: CategoryChangeRequest,
): TransactionPages {
  const { transaction, category } = request;
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === transaction.id
          ? {
              ...item,
              category: {
                id: category.id,
                name: category.name,
                icon: category.icon,
                kind: category.kind,
              },
              categorySource: 'user' as const,
            }
          : item,
      ),
    })),
  };
}

/**
 * Troca a categoria com atualização otimista: a lista mostra a nova categoria na hora e volta à
 * anterior se a API falhar. Com "Aplicar sempre", outras transações podem ter mudado: recarrega.
 */
export function useChangeCategory() {
  const queryClient = useQueryClient();
  const invalidateAfterCategory = useInvalidateAfter('transaction-category');
  // "Aplicar sempre" cria uma regra, e o servidor recategoriza as outras transações com ela.
  const invalidateAfterCategorization = useInvalidateAfter('categorization');
  return useMutation({
    mutationFn: ({ transaction, category, applyAlways }: CategoryChangeRequest) =>
      changeTransactionCategory(transaction.id, { categoryId: category.id, applyAlways }),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });
      const previousLists = queryClient.getQueriesData<TransactionPages>({
        queryKey: queryKeys.transactions,
      });
      queryClient.setQueriesData<TransactionPages>({ queryKey: queryKeys.transactions }, (pages) =>
        pages ? withNewCategory(pages, request) : pages,
      );
      return { previousLists };
    },
    onError: (_error, _request, context) => {
      for (const [queryKey, pages] of context?.previousLists ?? []) {
        queryClient.setQueryData(queryKey, pages);
      }
    },
    // Pelo mapa (`useInvalidateAfter`, acima), sem esperar as telas: a lista já mostra a categoria nova.
    onSuccess: (_saved, request) => {
      void (request.applyAlways ? invalidateAfterCategorization() : invalidateAfterCategory());
    },
  });
}

/** Uma transação pelo id, por exemplo a manual que o banco pode ter repetido. */
export function useTransaction(transactionId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.transactionDetail, transactionId],
    queryFn: () => getTransaction(transactionId ?? ''),
    enabled: transactionId !== null,
  });
}

/** Quantas possíveis duplicatas esperam conferência, em qualquer período. */
export function useDuplicateCount(today: string) {
  return useQuery({
    queryKey: [...queryKeys.duplicateCount, today],
    queryFn: () => countPossibleDuplicates(today),
  });
}

export interface TransactionSave {
  /** Nulo lança uma transação nova; com id, edita a manual. */
  readonly transactionId: string | null;
  readonly input: TransactionInput;
}

export function useSaveTransaction() {
  return useMutation({
    mutationFn: ({ transactionId, input }: TransactionSave) =>
      transactionId === null ? createTransaction(input) : updateTransaction(transactionId, input),
    onSuccess: useInvalidateAfter('transactions'),
  });
}

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: (transaction: Transaction) => deleteTransaction(transaction.id),
    onSuccess: useInvalidateAfter('transactions'),
  });
}

export interface DuplicateResolutionRequest {
  readonly transaction: Transaction;
  readonly action: DuplicateResolution;
}

export function useResolveDuplicate() {
  return useMutation({
    mutationFn: ({ transaction, action }: DuplicateResolutionRequest) =>
      resolveDuplicate(transaction.id, action),
    onSuccess: useInvalidateAfter('transactions'),
  });
}
