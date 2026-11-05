import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as BudgetsPage } from './budgets-page';

const GROCERIES_ID = '11111111-1111-4111-8111-111111111111';
const LEISURE_ID = '22222222-2222-4222-8222-222222222222';
const TRANSPORT_ID = '33333333-3333-4333-8333-333333333333';
const SALARY_ID = '44444444-4444-4444-8444-444444444444';

function budget(overrides: Record<string, unknown>) {
  return {
    categoryId: GROCERIES_ID,
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    limitCents: 100000,
    spentCents: 41000,
    percent: 41,
    status: 'ok',
    ...overrides,
  };
}

const GROCERIES_OK = budget({});
const GROCERIES_WARNING = budget({ spentCents: 82000, percent: 82, status: 'warning' });
const LEISURE_EXCEEDED = budget({
  categoryId: LEISURE_ID,
  categoryName: 'Lazer',
  categoryIcon: 'ticket',
  limitCents: 30000,
  spentCents: 42000,
  percent: 140,
  status: 'exceeded',
});

const CATEGORIES = [
  { id: GROCERIES_ID, name: 'Mercado', kind: 'expense', icon: 'shopping-cart', isArchived: false },
  { id: LEISURE_ID, name: 'Lazer', kind: 'expense', icon: 'ticket', isArchived: false },
  { id: TRANSPORT_ID, name: 'Transporte', kind: 'expense', icon: 'car', isArchived: false },
  { id: SALARY_ID, name: 'Salário', kind: 'income', icon: 'wallet', isArchived: false },
];

function overview(items: ReturnType<typeof budget>[], month = '2026-11') {
  return () =>
    Response.json({
      month,
      items,
      totals: {
        limitCents: items.reduce((sum, item) => sum + item.limitCents, 0),
        spentCents: items.reduce((sum, item) => sum + item.spentCents, 0),
      },
    });
}

function baseRoutes(items: ReturnType<typeof budget>[]) {
  return {
    'GET /api/v1/budgets': overview(items),
    'GET /api/v1/categories': () => Response.json({ items: CATEGORIES }),
  };
}

function renderPage(path = '/orcamentos?month=2026-11') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={[path]}>
          <HideValuesButton />
          <BudgetsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

async function findRow(name: string): Promise<HTMLElement> {
  const button = await screen.findByRole('button', { name: new RegExp(name) });
  return button;
}

afterEach(() => {
  window.localStorage.clear();
});

describe('BudgetsPage status', () => {
  it('should_show_the_spent_of_the_limit_with_a_check_icon_when_the_budget_is_ok', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_OK]));
    // Act
    renderPage();
    // Assert
    const row = await findRow('Mercado');
    expect(row).toHaveTextContent('R$ 410 de R$ 1.000');
    expect(row.querySelector('.lucide-circle-check')).not.toBeNull();
  });

  it('should_show_the_percent_with_a_warning_icon_when_the_budget_is_near_the_limit', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_WARNING]));
    // Act
    renderPage();
    // Assert
    const row = await findRow('Mercado');
    expect(within(row).getByText('82% do limite')).toBeVisible();
    expect(row.querySelector('.lucide-triangle-alert')).not.toBeNull();
  });

  it('should_show_the_excess_with_an_alert_icon_and_a_full_critical_bar_when_exceeded', async () => {
    // Arrange
    stubRoutes(baseRoutes([LEISURE_EXCEEDED]));
    // Act
    renderPage();
    // Assert
    const row = await findRow('Lazer');
    expect(row).toHaveTextContent('R$ 120 acima do limite');
    expect(row.querySelector('.lucide-circle-alert')).not.toBeNull();
    const fill = row.querySelector('[data-slot="progress-indicator"]');
    expect(fill).toHaveClass('bg-status-critical');
    expect(fill).toHaveStyle({ transform: 'translateX(-0%)' });
  });

  it('should_show_the_status_text_and_not_only_the_color_when_the_budget_is_near_the_limit', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_WARNING]));
    // Act
    renderPage();
    // Assert
    const row = await findRow('Mercado');
    expect(within(row).getByRole('progressbar')).toHaveAccessibleName('Mercado: 82% do limite');
  });
});

describe('BudgetsPage summary and order', () => {
  it('should_show_the_month_total_as_spent_of_limit_when_there_are_budgets', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_OK, LEISURE_EXCEEDED]));
    // Act
    renderPage();
    // Assert
    const summary = await screen.findByRole('region', { name: 'Gasto nos orçamentos' });
    expect(summary).toHaveTextContent('R$ 830 de R$ 1.300');
  });

  it('should_list_budgets_in_the_order_sent_by_the_api_when_rendering', async () => {
    // Arrange
    stubRoutes(baseRoutes([LEISURE_EXCEEDED, GROCERIES_OK]));
    // Act
    renderPage();
    // Assert
    await findRow('Lazer');
    const names = screen
      .getAllByRole('button', { name: /Lazer|Mercado/ })
      .map((row) => row.textContent);
    expect(names[0]).toContain('Lazer');
  });

  it('should_hide_the_amounts_when_hide_values_is_on', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_OK]));
    renderPage();
    await findRow('Mercado');
    // Act
    await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }));
    // Assert
    expect(screen.queryByText(/R\$ 410/)).toBeNull();
  });
});

describe('BudgetsPage states', () => {
  it('should_show_the_empty_state_with_both_actions_when_the_month_has_no_budgets', async () => {
    // Arrange
    stubRoutes(baseRoutes([]));
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Nenhum orçamento neste mês')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copiar do mês anterior' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Criar orçamento' })).toBeVisible();
  });

  it('should_show_the_error_state_when_the_request_fails', async () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([]),
      'GET /api/v1/budgets': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });

  it('should_show_a_loading_status_when_the_request_is_pending', () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([]),
      'GET /api/v1/budgets': () => new Promise<Response>(() => {}) as never,
    });
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeVisible();
  });

  it('should_show_the_chosen_month_name_when_the_url_has_a_month', async () => {
    // Arrange
    stubRoutes(baseRoutes([]));
    // Act
    renderPage('/orcamentos?month=2026-03');
    // Assert
    expect(await screen.findByText('março de 2026')).toBeVisible();
  });

  it('should_ask_for_the_next_month_when_the_next_button_is_pressed', async () => {
    // Arrange
    const fetchMock = stubRoutes(baseRoutes([]));
    renderPage();
    await screen.findByText('Nenhum orçamento neste mês');
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    // Assert
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('month=2026-12'))).toBe(
        true,
      ),
    );
  });
});

describe('BudgetsPage panel', () => {
  it('should_link_to_the_category_transactions_of_the_month_when_opening_the_panel', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_OK]));
    renderPage();
    // Act
    await userEvent.click(await findRow('Mercado'));
    // Assert
    const link = await screen.findByRole('link', { name: 'Ver transações' });
    expect(link).toHaveAttribute(
      'href',
      `/transacoes?period=custom&from=2026-11-01&to=2026-11-30&category=${GROCERIES_ID}`,
    );
  });

  it('should_send_the_new_limit_when_saving_an_existing_budget', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([GROCERIES_OK]),
      'PUT /api/v1/budgets/11111111-1111-4111-8111-111111111111': () =>
        Response.json({ ...GROCERIES_OK, limitCents: 120000 }),
    });
    renderPage();
    await userEvent.click(await findRow('Mercado'));
    const field = await screen.findByLabelText('Limite do mês');
    // Act
    await userEvent.clear(field);
    await userEvent.type(field, '120000');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar limite' }));
    // Assert
    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
      expect(putCall?.[1]?.body).toBe(JSON.stringify({ limitCents: 120000 }));
    });
  });

  it('should_remove_the_limit_when_pressing_remove', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([GROCERIES_OK]),
      'DELETE /api/v1/budgets/11111111-1111-4111-8111-111111111111': () =>
        new Response(null, { status: 204 }),
    });
    renderPage();
    await userEvent.click(await findRow('Mercado'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Remover limite' }));
    // Assert
    expect(await screen.findByText('Limite de Mercado removido')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
  });

  it('should_offer_only_expense_categories_without_a_limit_when_creating', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_OK]));
    renderPage();
    await findRow('Mercado');
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Criar orçamento' }));
    // Assert
    const select = await screen.findByLabelText('Categoria');
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['Escolha uma categoria', 'Lazer', 'Transporte']);
  });

  it('should_ask_for_category_and_limit_when_creating_with_empty_fields', async () => {
    // Arrange
    stubRoutes(baseRoutes([GROCERIES_OK]));
    renderPage();
    await findRow('Mercado');
    await userEvent.click(screen.getByRole('button', { name: 'Criar orçamento' }));
    // Act
    await userEvent.click(
      await screen.findByRole('button', { name: 'Criar orçamento', hidden: false }),
    );
    // Assert
    expect(await screen.findByText('Escolha uma categoria', { selector: 'p' })).toBeVisible();
    expect(screen.getByText('Informe um limite maior que zero')).toBeVisible();
  });

  it('should_report_how_many_limits_were_copied_when_copying_from_the_previous_month', async () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([]),
      'POST /api/v1/budgets/copy-previous': () => Response.json({ copied: 5 }),
    });
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar do mês anterior' }));
    // Assert
    expect(await screen.findByText('5 limites copiados')).toBeVisible();
  });
});
