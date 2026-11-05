import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { Category } from '@/lib/api/categories';
import {
  changeTransactionCategory,
  listAccounts,
  listTransactions,
  type Transaction,
  type TransactionPage,
  type TransactionQuery,
} from '@/lib/api/transactions';

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const;
const ACCOUNTS_QUERY_KEY = ['accounts'] as const;
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

export function useAccountOptions() {
  return useQuery({ queryKey: ACCOUNTS_QUERY_KEY, queryFn: listAccounts });
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
      if (!request.applyAlways) return;
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CATEGORY_RULES_QUERY_KEY });
    },
  });
}
