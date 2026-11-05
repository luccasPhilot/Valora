import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HideValuesProvider } from '@/components/hide-values-provider';

import { stubViewport } from '../../../test/helpers/match-media';
import { Component as TransactionsPage } from './transactions-page';

const GROCERIES = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mercado',
  kind: 'expense',
  icon: 'shopping-cart',
  isArchived: false,
};
const TRANSPORT = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Transporte',
  kind: 'expense',
  icon: 'car',
  isArchived: false,
};
const SALARY = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Salário',
  kind: 'income',
  icon: 'wallet',
  isArchived: false,
};
const CARD_PAYMENT = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Pagamento de fatura',
  kind: 'transfer',
  icon: 'credit-card',
  isArchived: false,
};
const CATEGORIES = [GROCERIES, TRANSPORT, SALARY, CARD_PAYMENT];

const ACCOUNT = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Conta corrente',
  type: 'checking',
  institutionName: 'Nubank',
};

const PAGE_LIMIT = 50;

function fixture(id: number, overrides: Record<string, unknown>) {
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
    ...overrides,
  };
}

const PHARMACY = fixture(1, {
  description: 'FARMÁCIA SÃO JOÃO',
  amountCents: -8990,
  category: { id: GROCERIES.id, name: 'Mercado', icon: 'shopping-cart', kind: 'expense' },
  categorySource: 'rule',
});
const SALARY_ENTRY = fixture(2, {
  description: 'SALÁRIO ACME',
  amountCents: 500000,
  category: { id: SALARY.id, name: 'Salário', icon: 'wallet', kind: 'income' },
  categorySource: 'pluggy',
});
const CARD_BILL = fixture(3, {
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
const YESTERDAY_PURCHASE = fixture(4, {
  date: '2026-11-03',
  description: 'TV 3/10',
  amountCents: -35000,
  installmentNumber: 3,
  installmentTotal: 10,
});
const DEFAULT_PAGE = [PHARMACY, SALARY_ENTRY, CARD_BILL, YESTERDAY_PURCHASE];

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

function pageResponse(items: unknown[], page = 1, total = items.length): Response {
  return Response.json({ items, pagination: { page, limit: PAGE_LIMIT, total } });
}

/** Responde pelo método e caminho (sem query); a query é lida pelo próprio handler. */
function stubApi(overrides: Record<string, Handler> = {}) {
  const routes: Record<string, Handler> = {
    'GET /api/v1/categories': () => Response.json({ items: CATEGORIES }),
    'GET /api/v1/accounts': () => Response.json({ items: [ACCOUNT] }),
    'GET /api/v1/transactions': () => pageResponse(DEFAULT_PAGE),
    ...overrides,
  };
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const handler = routes[`${init.method ?? 'GET'} ${url.pathname}`];
    if (!handler) return Promise.reject(new Error(`Teste: rota sem resposta ${url.pathname}`));
    return Promise.resolve(handler(url, init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function listQueries(fetchMock: ReturnType<typeof stubApi>): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([input, init]) => ({ url: new URL(String(input), 'http://localhost'), init }))
    .filter(({ url, init }) => url.pathname === '/api/v1/transactions' && init?.method === 'GET')
    .map(({ url }) => url.searchParams);
}

function renderPage(path = '/transacoes') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={[path]}>
          <TransactionsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

function rowOf(description: string): HTMLElement {
  const row = screen.getByText(description).closest('button');
  if (!row) throw new Error(`Teste: ${description} não está dentro de um botão`);
  return row;
}

function daySection(headingName: string): HTMLElement {
  const section = screen.getByRole('heading', { name: headingName }).closest('section');
  if (!section) throw new Error('Teste: o cabeçalho do dia não está dentro de uma section');
  return section;
}

beforeEach(() => {
  // Só a data é falsa: os timers reais seguem rodando para o React Query e a espera da busca.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('lista de transações', () => {
  it('should_group_by_day_with_today_and_yesterday_headers_when_the_list_loads', async () => {
    // Arrange
    stubApi();
    // Act
    renderPage();
    // Assert
    expect(await screen.findAllByRole('heading', { level: 2, name: /Hoje|Ontem/ })).toHaveLength(2);
  });

  it('should_show_the_day_total_without_transfers_when_the_day_has_a_card_payment', async () => {
    // Arrange
    stubApi();
    // Act
    renderPage();
    // Assert: 5.000,00 de salário − 89,90 da farmácia; os R$ 1.500,00 da fatura ficam de fora.
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    expect(within(daySection('Hoje')).getByText(/Total do dia/).parentElement).toHaveTextContent(
      '+ R$ 4.910,10',
    );
  });

  it('should_show_income_in_positive_expense_in_normal_text_and_transfer_muted_when_listing', async () => {
    // Arrange
    stubApi();
    // Act
    renderPage();
    // Assert
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    const classOf = (description: string, amount: string) =>
      within(rowOf(description)).getByText(amount).parentElement?.className ?? '';
    expect({
      income: classOf('SALÁRIO ACME', '+ R$ 5.000,00'),
      expense: classOf('FARMÁCIA SÃO JOÃO', '− R$ 89,90'),
      transfer: classOf('PAGAMENTO FATURA', '− R$ 1.500,00'),
    }).toEqual({
      income: expect.stringContaining('text-positive'),
      expense: expect.stringContaining('text-foreground'),
      transfer: expect.stringContaining('text-muted-foreground'),
    });
  });

  it('should_show_the_installment_badge_and_uncategorized_label_when_the_transaction_has_them', async () => {
    // Arrange
    stubApi();
    // Act
    renderPage();
    // Assert
    await screen.findByText('TV 3/10');
    const row = rowOf('TV 3/10');
    expect({
      installment: within(row).getByText('3/10').textContent,
      category: within(row).getByText('Sem categoria').textContent,
    }).toEqual({ installment: 'Parcela 3/10', category: 'Sem categoria' });
  });

  it('should_replace_every_amount_with_hidden_text_when_values_are_hidden', async () => {
    // Arrange
    window.localStorage.setItem('valora.hide-values', 'true');
    stubApi();
    // Act
    renderPage();
    // Assert
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    expect(screen.queryByText(/\d,\d\d/)).not.toBeInTheDocument();
  });

  it('should_ask_for_the_current_month_when_no_filter_is_in_the_url', async () => {
    // Arrange
    const fetchMock = stubApi();
    // Act
    renderPage();
    // Assert
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    expect(listQueries(fetchMock)[0]?.toString()).toBe(
      'page=1&limit=50&from=2026-11-01&to=2026-11-30',
    );
  });

  it('should_show_the_end_of_period_line_when_all_transactions_are_loaded', async () => {
    // Arrange
    stubApi();
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Não há mais transações neste período.')).toBeInTheDocument();
  });

  it('should_load_the_next_page_when_load_more_is_clicked', async () => {
    // Arrange
    const secondPageItem = fixture(9, { description: 'COMPRA DA SEGUNDA PÁGINA' });
    const fetchMock = stubApi({
      'GET /api/v1/transactions': (url) =>
        url.searchParams.get('page') === '2'
          ? pageResponse([secondPageItem], 2, 51)
          : pageResponse(DEFAULT_PAGE, 1, 51),
    });
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }));
    // Assert
    expect({
      isShown: await screen.findByText('COMPRA DA SEGUNDA PÁGINA'),
      pages: listQueries(fetchMock).map((query) => query.get('page')),
    }).toEqual({ isShown: expect.anything(), pages: ['1', '2'] });
  });
});

describe('estados', () => {
  it('should_show_the_skeleton_while_the_list_is_loading', () => {
    // Arrange
    stubApi({ 'GET /api/v1/transactions': () => new Promise<Response>(() => undefined) });
    // Act
    renderPage();
    // Assert
    expect(document.querySelector('[aria-hidden="true"] [data-slot="skeleton"]')).not.toBeNull();
  });

  it('should_show_the_period_empty_state_with_change_period_action_when_the_month_has_no_transactions', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/transactions': () => pageResponse([]) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Nenhuma transação neste período')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mudar período' })).toBeInTheDocument();
  });

  it('should_show_the_search_empty_state_and_clear_filters_when_nothing_matches', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/transactions': (url) =>
        url.searchParams.get('search') ? pageResponse([]) : pageResponse(DEFAULT_PAGE),
    });
    renderPage('/transacoes?search=zzz');
    await screen.findByText('Nenhuma transação encontrada');
    // Act
    const [clearButton] = screen.getAllByRole('button', { name: 'Limpar filtros' });
    if (!clearButton) throw new Error('Teste: botão Limpar filtros não apareceu');
    await userEvent.click(clearButton);
    // Assert
    expect(await screen.findByText('FARMÁCIA SÃO JOÃO')).toBeInTheDocument();
  });

  it('should_show_the_error_state_and_retry_when_the_api_fails', async () => {
    // Arrange
    let shouldFail = true;
    stubApi({
      'GET /api/v1/transactions': () =>
        shouldFail
          ? Response.json(
              { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
              { status: 500 },
            )
          : pageResponse(DEFAULT_PAGE),
    });
    renderPage();
    await screen.findByRole('alert');
    shouldFail = false;
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    // Assert
    expect(await screen.findByText('FARMÁCIA SÃO JOÃO')).toBeInTheDocument();
  });
});

describe('filtros', () => {
  it('should_show_removable_chips_for_the_active_filters_in_the_url', async () => {
    // Arrange
    stubApi();
    // Act
    renderPage(`/transacoes?category=${TRANSPORT.id}&type=expense`);
    // Assert
    await screen.findByRole('button', { name: 'Remover filtro Transporte' });
    const chips = screen.getByRole('list', { name: 'Filtros ativos' });
    expect(
      within(chips)
        .getAllByRole('button', { name: /Remover filtro/ })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Remover filtro Transporte', 'Remover filtro Despesas']);
  });

  it('should_remove_the_category_filter_and_reload_when_its_chip_is_removed', async () => {
    // Arrange
    const fetchMock = stubApi();
    renderPage(`/transacoes?category=${TRANSPORT.id}`);
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Remover filtro Transporte' }));
    // Assert
    await waitFor(() => {
      expect(listQueries(fetchMock).map((query) => query.get('categoryId'))).toEqual([
        TRANSPORT.id,
        null,
      ]);
    });
  });

  it('should_search_only_after_300ms_without_typing_when_the_user_types', async () => {
    // Arrange
    const fetchMock = stubApi();
    renderPage();
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    // Act
    await userEvent.type(screen.getByLabelText('Buscar'), 'farmacia');
    // Assert
    await waitFor(() => {
      expect(
        listQueries(fetchMock)
          .map((query) => query.get('search'))
          .filter((search) => search !== null),
      ).toEqual(['farmacia']);
    });
  });

  it('should_open_the_filters_panel_with_the_fields_when_on_a_phone', async () => {
    // Arrange
    stubViewport({ viewportWidth: 390 });
    stubApi();
    renderPage();
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    // Act
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    // Assert
    const panel = await screen.findByRole('dialog', { name: 'Filtros' });
    expect(within(panel).getByLabelText('Período')).toBeInTheDocument();
  });
});

describe('detalhe e troca de categoria', () => {
  async function openPharmacyDetail() {
    await userEvent.click(await screen.findByText('FARMÁCIA SÃO JOÃO'));
    return screen.findByRole('dialog', { name: 'Detalhes da transação' });
  }

  it('should_send_the_new_category_with_apply_always_and_close_the_detail_when_confirmed', async () => {
    // Arrange
    const patched: unknown[] = [];
    // O servidor de mentira lembra da troca, como o de verdade: o recarregamento a devolve.
    let pharmacy: Record<string, unknown> = PHARMACY;
    stubApi({
      'GET /api/v1/transactions': () =>
        pageResponse([pharmacy, SALARY_ENTRY, CARD_BILL, YESTERDAY_PURCHASE]),
      'PATCH /api/v1/transactions/00000000-0000-4000-8000-000000000001': (_url, init) => {
        patched.push(JSON.parse(String(init.body)));
        pharmacy = {
          ...PHARMACY,
          category: { id: TRANSPORT.id, name: 'Transporte', icon: 'car', kind: 'expense' },
          categorySource: 'user',
        };
        return Response.json(pharmacy);
      },
    });
    renderPage();
    const detail = await openPharmacyDetail();
    // Act
    await userEvent.click(
      within(detail).getByRole('checkbox', { name: /Aplicar sempre para “FARMÁCIA SÃO JOÃO”/ }),
    );
    await userEvent.click(within(detail).getByRole('button', { name: /Transporte/ }));
    // Assert
    expect(await screen.findByText(/Categoria trocada para Transporte/)).toBeInTheDocument();
    expect({
      body: patched,
      isDetailOpen: screen.queryByRole('dialog') !== null,
      listCategory: within(rowOf('FARMÁCIA SÃO JOÃO')).queryByText('Transporte') !== null,
    }).toEqual({
      body: [{ categoryId: TRANSPORT.id, applyAlways: true }],
      isDetailOpen: false,
      listCategory: true,
    });
  });

  it('should_keep_the_previous_category_and_warn_when_the_api_fails', async () => {
    // Arrange
    stubApi({
      'PATCH /api/v1/transactions/00000000-0000-4000-8000-000000000001': () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
          { status: 500 },
        ),
    });
    renderPage();
    const detail = await openPharmacyDetail();
    // Act
    await userEvent.click(within(detail).getByRole('button', { name: /Transporte/ }));
    // Assert
    expect(await screen.findByText(/A anterior foi mantida/)).toBeInTheDocument();
    expect(within(rowOf('FARMÁCIA SÃO JOÃO')).getByText('Mercado')).toBeInTheDocument();
  });

  it('should_offer_only_active_categories_matching_the_search_when_picking', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/categories': () =>
        Response.json({
          items: [
            ...CATEGORIES,
            { ...TRANSPORT, id: crypto.randomUUID(), name: 'Táxi antigo', isArchived: true },
          ],
        }),
    });
    renderPage();
    const detail = await openPharmacyDetail();
    // Act
    await userEvent.type(within(detail).getByLabelText('Buscar categoria'), 'tra');
    // Assert
    expect(
      within(detail)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toContain('Transporte');
    expect(within(detail).queryByText('Táxi antigo')).not.toBeInTheDocument();
  });
});
