import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { appRoutes } from '@/app/router';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { NewTransactionProvider } from './new-transaction/new-transaction-provider';
import { Component as TransactionsPage } from './transactions-page';

// Dados e servidor de mentira compartilhados pelos testes da tela de Transações.

export const GROCERIES = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mercado',
  kind: 'expense',
  icon: 'shopping-cart',
  isArchived: false,
};
export const TRANSPORT = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Transporte',
  kind: 'expense',
  icon: 'car',
  isArchived: false,
};
export const SALARY = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Salário',
  kind: 'income',
  icon: 'wallet',
  isArchived: false,
};
export const CARD_PAYMENT = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Pagamento de fatura',
  kind: 'transfer',
  icon: 'credit-card',
  isArchived: false,
};
export const CATEGORIES = [GROCERIES, TRANSPORT, SALARY, CARD_PAYMENT];

export const ACCOUNT = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Conta corrente',
  type: 'checking',
  institutionName: 'Nubank',
};
export const CASH_ACCOUNT = {
  id: '66666666-6666-4666-8666-666666666666',
  name: 'Dinheiro',
  type: 'cash',
  institutionName: null,
};

const PAGE_LIMIT = 50;

export function fixture(id: number, overrides: Record<string, unknown>) {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    date: '2026-11-04',
    description: `Transação ${id}`,
    amountCents: -1000,
    status: 'posted',
    source: 'open_finance',
    category: null,
    categorySource: 'none',
    account: { id: ACCOUNT.id, name: ACCOUNT.name, type: ACCOUNT.type },
    installmentNumber: null,
    installmentTotal: null,
    possibleDuplicateOfId: null,
    ...overrides,
  };
}

export const PHARMACY = fixture(1, {
  description: 'FARMÁCIA SÃO JOÃO',
  amountCents: -8990,
  category: { id: GROCERIES.id, name: 'Mercado', icon: 'shopping-cart', kind: 'expense' },
  categorySource: 'rule',
});
export const SALARY_ENTRY = fixture(2, {
  description: 'SALÁRIO ACME',
  amountCents: 500000,
  category: { id: SALARY.id, name: 'Salário', icon: 'wallet', kind: 'income' },
  categorySource: 'pluggy',
});
export const CARD_BILL = fixture(3, {
  description: 'PAGAMENTO FATURA',
  amountCents: -150000,
  category: {
    id: CARD_PAYMENT.id,
    name: 'Pagamento de fatura',
    icon: 'credit-card',
    kind: 'transfer',
  },
  categorySource: 'pluggy',
});
export const YESTERDAY_PURCHASE = fixture(4, {
  date: '2026-11-03',
  description: 'TV 3/10',
  amountCents: -35000,
  installmentNumber: 3,
  installmentTotal: 10,
});
export const DEFAULT_PAGE = [PHARMACY, SALARY_ENTRY, CARD_BILL, YESTERDAY_PURCHASE];

export type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

export function pageResponse(items: unknown[], page = 1, total = items.length): Response {
  return Response.json({ items, pagination: { page, limit: PAGE_LIMIT, total } });
}

/** Chave para sobrescrever a contagem de duplicatas (a lista com `possibleDuplicate=true&limit=1`). */
export const DUPLICATE_COUNT_ROUTE = 'COUNT /api/v1/transactions';

function isDuplicateCount(url: URL): boolean {
  return (
    url.pathname === '/api/v1/transactions' &&
    url.searchParams.get('possibleDuplicate') === 'true' &&
    url.searchParams.get('limit') === '1'
  );
}

/** Responde pelo método e caminho (sem query); a query é lida pelo próprio handler. */
export function stubApi(overrides: Record<string, Handler> = {}) {
  const routes: Record<string, Handler> = {
    'GET /api/v1/categories': () => Response.json({ items: CATEGORIES }),
    'GET /api/v1/accounts': () => Response.json({ items: [CASH_ACCOUNT, ACCOUNT] }),
    'GET /api/v1/transactions': () => pageResponse(DEFAULT_PAGE),
    [DUPLICATE_COUNT_ROUTE]: () => pageResponse([], 1, 0),
    ...overrides,
  };
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = init.method ?? 'GET';
    const routeKey = method === 'GET' && isDuplicateCount(url) ? DUPLICATE_COUNT_ROUTE : undefined;
    const handler = routes[routeKey ?? `${method} ${url.pathname}`];
    if (!handler) return Promise.reject(new Error(`Teste: rota sem resposta ${url.pathname}`));
    return Promise.resolve(handler(url, init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Os pedidos da lista de transações, sem a consulta que só conta as duplicatas. */
export function listQueries(fetchMock: ReturnType<typeof stubApi>): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([input, init]) => ({ url: new URL(String(input), 'http://localhost'), init }))
    .filter(({ url, init }) => url.pathname === '/api/v1/transactions' && init?.method === 'GET')
    .filter(({ url }) => !isDuplicateCount(url))
    .map(({ url }) => url.searchParams);
}

export function renderPage(path = '/transacoes') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={[path]}>
          <NewTransactionProvider>
            <TransactionsPage />
          </NewTransactionProvider>
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

/** O app inteiro (menu, topo, painéis), para testar o que depende do botão "Nova transação" do topo. */
export function renderApp(path = '/transacoes') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
