import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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
  listTransactions,
  resolveDuplicate,
  type Transaction,
  type TransactionInput,
  type TransactionPage,
  type TransactionQuery,
  updateTransaction,
} from '@/lib/api/transactions';

import { ACCOUNTS_QUERY_KEY } from '../accounts/accounts-queries';
import { BUDGETS_QUERY_KEY } from '../budgets/budgets-queries';
import { DASHBOARD_QUERY_KEY } from '../dashboard/dashboard-query-key';

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const;
// Fora de `TRANSACTIONS_QUERY_KEY` de propósito: as atualizações otimistas da lista trocam os dados
// de toda consulta que começa por essa chave, e estas duas não têm o formato da lista paginada.
const TRANSACTION_DETAIL_KEY = ['transaction-detail'] as const;
const DUPLICATE_COUNT_KEY = ['possible-duplicate-count'] as const;
const CATEGORY_RULES_QUERY_KEY = ['category-rules'] as const;
const FIRST_PAGE = 1;

type TransactionPages = InfiniteData<TransactionPage, number>;

/** Lista paginada: cada página pedida à API vira mais um pedaço da mesma lista na tela. */
export function useTransactionList(query: TransactionQuery) {
  return useInfiniteQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, query],
    queryFn: ({ pageParam }) => listTransactions(query, pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: ({ pagination }) =>
      pagination.page * pagination.limit < pagination.total ? pagination.page + 1 : undefined,
  });
}

/** As mesmas contas da tela de Contas, só com o que o filtro e o formulário precisam. */
export function useAccountOptions() {
  return useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
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
  return useMutation({
    mutationFn: ({ transaction, category, applyAlways }: CategoryChangeRequest) =>
      changeTransactionCategory(transaction.id, { categoryId: category.id, applyAlways }),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      const previousLists = queryClient.getQueriesData<TransactionPages>({
        queryKey: TRANSACTIONS_QUERY_KEY,
      });
      queryClient.setQueriesData<TransactionPages>({ queryKey: TRANSACTIONS_QUERY_KEY }, (pages) =>
        pages ? withNewCategory(pages, request) : pages,
      );
      return { previousLists };
    },
    onError: (_error, _request, context) => {
      for (const [queryKey, pages] of context?.previousLists ?? []) {
        queryClient.setQueryData(queryKey, pages);
      }
    },
    onSuccess: (_saved, request) => {
      // Mudar a categoria move o gasto de um orçamento para outro, e o Início soma por categoria.
      void queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      if (!request.applyAlways) return;
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CATEGORY_RULES_QUERY_KEY });
    },
  });
}

/** Uma transação pelo id, por exemplo a manual que o banco pode ter repetido. */
export function useTransaction(transactionId: string | null) {
  return useQuery({
    queryKey: [...TRANSACTION_DETAIL_KEY, transactionId],
    queryFn: () => getTransaction(transactionId ?? ''),
    enabled: transactionId !== null,
  });
}

/** Quantas possíveis duplicatas esperam conferência, em qualquer período. */
export function useDuplicateCount(today: string) {
  return useQuery({
    queryKey: [...DUPLICATE_COUNT_KEY, today],
    queryFn: () => countPossibleDuplicates(today),
  });
}

// Lançar, editar, excluir e resolver duplicatas mudam a lista, os detalhes abertos, a contagem, o
// gasto dos orçamentos e os números do Início.
function useRefreshTransactions() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [
        TRANSACTIONS_QUERY_KEY,
        TRANSACTION_DETAIL_KEY,
        DUPLICATE_COUNT_KEY,
        BUDGETS_QUERY_KEY,
        DASHBOARD_QUERY_KEY,
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export interface TransactionSave {
  /** Nulo lança uma transação nova; com id, edita a manual. */
  readonly transactionId: string | null;
  readonly input: TransactionInput;
}

export function useSaveTransaction() {
  const refresh = useRefreshTransactions();
  return useMutation({
    mutationFn: ({ transactionId, input }: TransactionSave) =>
      transactionId === null ? createTransaction(input) : updateTransaction(transactionId, input),
    onSuccess: refresh,
  });
}

export function useDeleteTransaction() {
  const refresh = useRefreshTransactions();
  return useMutation({
    mutationFn: (transaction: Transaction) => deleteTransaction(transaction.id),
    onSuccess: refresh,
  });
}

export interface DuplicateResolutionRequest {
  readonly transaction: Transaction;
  readonly action: DuplicateResolution;
}

export function useResolveDuplicate() {
  const refresh = useRefreshTransactions();
  return useMutation({
    mutationFn: ({ transaction, action }: DuplicateResolutionRequest) =>
      resolveDuplicate(transaction.id, action),
    onSuccess: refresh,
  });
}
