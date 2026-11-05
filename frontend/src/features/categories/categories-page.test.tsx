import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { stubViewport } from '../../../test/helpers/match-media';
import { Component as CategoriesPage } from './categories-page';

const GROCERIES_ID = '11111111-1111-4111-8111-111111111111';
const FOOD_ID = '22222222-2222-4222-8222-222222222222';
const SALARY_ID = '33333333-3333-4333-8333-333333333333';
const CARD_PAYMENT_ID = '44444444-4444-4444-8444-444444444444';
const RULE_ID = '55555555-5555-4555-8555-555555555555';

const CATEGORIES = [
  { id: GROCERIES_ID, name: 'Mercado', kind: 'expense', icon: 'shopping-cart', isArchived: false },
  { id: FOOD_ID, name: 'Alimentação', kind: 'expense', icon: 'utensils', isArchived: false },
  { id: SALARY_ID, name: 'Salário', kind: 'income', icon: 'wallet', isArchived: false },
  {
    id: CARD_PAYMENT_ID,
    name: 'Pagamento de fatura',
    kind: 'transfer',
    icon: 'credit-card',
    isArchived: false,
  },
];

const RULE = {
  id: RULE_ID,
  pattern: 'IFOOD',
  matchType: 'contains',
  categoryId: FOOD_ID,
  priority: 2,
  learnedFromTransactionId: null,
  createdAt: '2026-11-04T12:00:00.000Z',
};

type Handler = (init: RequestInit) => Response;

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function errorResponse(code: string, status: number): Response {
  return jsonResponse({ error: { code, message: 'mensagem da api', details: [] } }, status);
}

/** Responde pelo método e caminho; qualquer chamada sem rota falha o teste. */
function stubApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${String(input)}`;
    const handler = routes[key];
    if (!handler) return Promise.reject(new Error(`Teste: rota sem resposta ${key}`));
    return Promise.resolve(handler(init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentBodies(fetchMock: ReturnType<typeof stubApi>, key: string): unknown[] {
  return fetchMock.mock.calls
    .filter(([input, init]) => `${init?.method ?? 'GET'} ${String(input)}` === key)
    .map(([, init]) => JSON.parse(String(init?.body)));
}

const DEFAULT_ROUTES: Record<string, Handler> = {
  'GET /api/v1/categories?includeArchived=true': () => jsonResponse({ items: CATEGORIES }),
  'GET /api/v1/category-rules': () => jsonResponse({ items: [RULE] }),
  'GET /api/v1/pluggy-category-mappings': () =>
    jsonResponse({
      items: [
        { pluggyCategory: 'Groceries', categoryId: GROCERIES_ID },
        { pluggyCategory: 'Transfer - PIX', categoryId: null },
      ],
    }),
};

function sectionOf(heading: HTMLElement): HTMLElement {
  const section = heading.closest('section');
  if (!section) throw new Error('Teste: o título não está dentro de uma section');
  return section;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CategoriesPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('aba Categorias', () => {
  it('should_group_categories_by_kind_with_their_names', async () => {
    // Arrange
    stubApi(DEFAULT_ROUTES);
    // Act
    renderPage();
    // Assert
    const heading = await screen.findByRole('heading', { name: 'Despesas' });
    expect(within(sectionOf(heading)).getByText('Mercado')).toBeVisible();
  });

  it('should_show_the_note_about_withdrawals_and_transfers', async () => {
    // Arrange
    stubApi(DEFAULT_ROUTES);
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText(/Um saque chega do banco como despesa/)).toBeVisible();
  });

  it('should_show_skeleton_while_loading', () => {
    // Arrange
    stubApi({
      ...DEFAULT_ROUTES,
      'GET /api/v1/categories?includeArchived=true': () => jsonResponse({ items: CATEGORIES }),
    });
    // Act
    renderPage();
    // Assert
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it('should_show_error_state_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubApi({
      ...DEFAULT_ROUTES,
      'GET /api/v1/categories?includeArchived=true': () => errorResponse('INTERNAL_ERROR', 500),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_send_the_new_category_and_close_the_panel_when_saving', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...DEFAULT_ROUTES,
      'POST /api/v1/categories': () =>
        jsonResponse({ ...CATEGORIES[0], id: crypto.randomUUID(), name: 'Pets' }, 201),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    // Act
    await userEvent.type(await screen.findByLabelText('Nome'), 'Pets');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(sentBodies(fetchMock, 'POST /api/v1/categories')).toEqual([
      { name: 'Pets', kind: 'expense', icon: 'tag' },
    ]);
  });

  it('should_show_a_plain_message_when_the_category_name_is_taken', async () => {
    // Arrange
    stubApi({
      ...DEFAULT_ROUTES,
      'POST /api/v1/categories': () => errorResponse('CATEGORY_NAME_TAKEN', 409),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    await userEvent.type(await screen.findByLabelText('Nome'), 'Mercado');
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma categoria com este nome.',
    );
  });

  it('should_not_allow_saving_a_category_without_a_name', async () => {
    // Arrange
    stubApi(DEFAULT_ROUTES);
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    // Assert
    expect(await screen.findByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('should_archive_the_category_after_confirming', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...DEFAULT_ROUTES,
      [`POST /api/v1/categories/${GROCERIES_ID}/archive`]: () =>
        jsonResponse({ ...CATEGORIES[0], isArchived: true }),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Arquivar Mercado' }));
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Arquivar' }));
    // Assert
    expect(
      fetchMock.mock.calls.some(
        ([input]) => String(input) === `/api/v1/categories/${GROCERIES_ID}/archive`,
      ),
    ).toBe(true);
  });
});

describe('aba Regras', () => {
  async function openRulesTab() {
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: 'Regras' }));
  }

  it('should_list_the_rule_with_comparison_pattern_category_and_priority', async () => {
    // Arrange
    stubApi(DEFAULT_ROUTES);
    // Act
    await openRulesTab();
    // Assert
    expect(await screen.findByText(/Alimentação · prioridade 2/)).toBeVisible();
  });

  it('should_show_the_empty_state_when_there_are_no_rules', async () => {
    // Arrange
    stubApi({ ...DEFAULT_ROUTES, 'GET /api/v1/category-rules': () => jsonResponse({ items: [] }) });
    // Act
    await openRulesTab();
    // Assert
    expect(await screen.findByText('Nenhuma regra ainda')).toBeVisible();
  });

  it('should_send_the_rule_when_the_form_is_filled_and_saved', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...DEFAULT_ROUTES,
      'POST /api/v1/category-rules': () => jsonResponse(RULE, 201),
    });
    await openRulesTab();
    await userEvent.click(await screen.findByRole('button', { name: 'Nova regra' }));
    // Act
    await userEvent.type(await screen.findByLabelText('Texto da descrição'), 'NETFLIX');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), GROCERIES_ID);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(sentBodies(fetchMock, 'POST /api/v1/category-rules')).toEqual([
      { pattern: 'NETFLIX', matchType: 'contains', categoryId: GROCERIES_ID, priority: 0 },
    ]);
  });

  it('should_delete_the_rule_after_confirming', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...DEFAULT_ROUTES,
      [`DELETE /api/v1/category-rules/${RULE_ID}`]: () => new Response(null, { status: 204 }),
    });
    await openRulesTab();
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir regra IFOOD' }));
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    // Assert
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input) === `/api/v1/category-rules/${RULE_ID}` && init?.method === 'DELETE',
      ),
    ).toBe(true);
  });
});

describe('aba Pluggy', () => {
  async function openPluggyTab() {
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: 'Pluggy' }));
  }

  it('should_show_each_pluggy_category_with_the_chosen_valora_category', async () => {
    // Arrange
    stubApi(DEFAULT_ROUTES);
    // Act
    await openPluggyTab();
    // Assert
    expect(await screen.findByLabelText('Categoria do Valora para Groceries')).toHaveValue(
      GROCERIES_ID,
    );
  });

  it('should_filter_the_list_by_the_search_text', async () => {
    // Arrange
    stubApi(DEFAULT_ROUTES);
    await openPluggyTab();
    // Act
    await userEvent.type(await screen.findByLabelText('Buscar categoria do Pluggy'), 'pix');
    // Assert
    expect(screen.queryByText('Groceries')).toBeNull();
  });

  it('should_send_the_new_mapping_when_a_category_is_chosen', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...DEFAULT_ROUTES,
      'PUT /api/v1/pluggy-category-mappings/Transfer%20-%20PIX': () =>
        jsonResponse({ pluggyCategory: 'Transfer - PIX', categoryId: FOOD_ID }),
    });
    await openPluggyTab();
    // Act
    await userEvent.selectOptions(
      await screen.findByLabelText('Categoria do Valora para Transfer - PIX'),
      FOOD_ID,
    );
    // Assert
    expect(
      sentBodies(fetchMock, 'PUT /api/v1/pluggy-category-mappings/Transfer%20-%20PIX'),
    ).toEqual([{ categoryId: FOOD_ID }]);
  });

  it('should_clear_the_mapping_when_no_category_is_chosen', async () => {
    // Arrange
    const fetchMock = stubApi({
      ...DEFAULT_ROUTES,
      'PUT /api/v1/pluggy-category-mappings/Groceries': () =>
        jsonResponse({ pluggyCategory: 'Groceries', categoryId: null }),
    });
    await openPluggyTab();
    // Act
    await userEvent.selectOptions(
      await screen.findByLabelText('Categoria do Valora para Groceries'),
      'Sem categoria',
    );
    // Assert
    expect(sentBodies(fetchMock, 'PUT /api/v1/pluggy-category-mappings/Groceries')).toEqual([
      { categoryId: null },
    ]);
  });
});

describe('painel de formulário', () => {
  it('should_open_the_form_in_a_bottom_sheet_on_a_phone', async () => {
    // Arrange
    stubViewport({ viewportWidth: 320 });
    stubApi(DEFAULT_ROUTES);
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    // Assert
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-slot', 'sheet-content');
  });

  it('should_open_the_form_in_a_dialog_on_a_desktop', async () => {
    // Arrange
    stubViewport({ viewportWidth: 1440 });
    stubApi(DEFAULT_ROUTES);
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    // Assert
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-slot', 'dialog-content');
  });
});
