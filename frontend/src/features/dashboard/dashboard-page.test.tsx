import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse } from '../../../test/helpers/stub-routes';
import { NewTransactionProvider } from '../transactions/new-transaction/new-transaction-provider';
import {
  ACCOUNT,
  accountsResponse,
  CASH_ACCOUNT,
  CATEGORIES,
  fixture,
  GROCERIES,
  type Handler,
  pageResponse,
  PHARMACY,
  stubApi,
} from '../transactions/test-support';
import { Component as DashboardPage } from './dashboard-page';

const LEISURE_ID = '88888888-8888-4888-8888-888888888888';
const SYNC_RUN = {
  id: '99999999-9999-4999-8999-999999999999',
  trigger: 'schedule',
  status: 'success',
  startedAt: '2026-11-05T10:00:00.000Z',
  finishedAt: '2026-11-05T10:02:00.000Z',
  stats: { transactionsInserted: 3 },
};

const TRIP_GOAL = {
  id: '77777777-7777-4777-8777-777777777777',
  name: 'Viagem',
  icon: 'plane',
  targetCents: 1000000,
  savedCents: 400000,
  percent: 40,
  status: 'behind',
  estimatedDate: null,
  requiredMonthlyCents: 50000,
};

function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    month: '2026-11',
    totalBalanceCents: 485032,
    balanceEvolution: [
      { date: '2026-11-01', balanceCents: 400000 },
      { date: '2026-11-05', balanceCents: 485032 },
    ],
    balanceChange: { cents: 85032, percent: 21.26 },
    netWorth: {
      totalCents: 1550000,
      investmentsCents: 1200000,
      openBillsCents: 150000,
      change: { cents: 50000, percent: 3.33 },
    },
    monthIncomeCents: 500000,
    monthExpenseCents: 200000,
    incomeVsExpense: [
      { month: '2026-06', incomeCents: 0, expenseCents: 0 },
      { month: '2026-07', incomeCents: 0, expenseCents: 0 },
      { month: '2026-08', incomeCents: 0, expenseCents: 0 },
      { month: '2026-09', incomeCents: 0, expenseCents: 0 },
      { month: '2026-10', incomeCents: 350000, expenseCents: 280000 },
      { month: '2026-11', incomeCents: 500000, expenseCents: 200000 },
    ],
    spendingByCategory: [
      {
        kind: 'category',
        categoryId: GROCERIES.id,
        name: 'Mercado',
        icon: 'shopping-cart',
        amountCents: 120000,
        percent: 60,
      },
      { kind: 'other', name: 'Outros', amountCents: 80000, percent: 40 },
    ],
    budgetsNearLimit: [
      {
        categoryId: LEISURE_ID,
        categoryName: 'Lazer',
        categoryIcon: 'ticket',
        limitCents: 30000,
        spentCents: 42000,
        percent: 140,
        status: 'exceeded',
      },
    ],
    latestTransactions: [PHARMACY, fixture(7, { description: 'Padaria', amountCents: -1500 })],
    projection: {
      projectedBalanceCents: 480000,
      lowestBalanceCents: 120000,
      lowestBalanceDate: '2026-11-20',
      hasPlannedItems: true,
    },
    goals: { items: [TRIP_GOAL], activeCount: 1 },
    ...overrides,
  };
}

function stubDashboardApi(
  data: Record<string, unknown> = dashboard(),
  overrides: Record<string, Handler> = {},
) {
  return stubApi({
    'GET /api/v1/dashboard': () => Response.json(data),
    'GET /api/v1/sync-runs/latest': () => Response.json(SYNC_RUN),
    'GET /api/v1/categories': () => Response.json({ items: CATEGORIES }),
    'GET /api/v1/accounts': () => accountsResponse([CASH_ACCOUNT, ACCOUNT]),
    'GET /api/v1/transactions': () => pageResponse([PHARMACY]),
    ...overrides,
  });
}

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={['/']}>
          <HideValuesButton />
          <NewTransactionProvider>
            <DashboardPage />
          </NewTransactionProvider>
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Início', () => {
  it('should_show_the_blocks_in_the_phone_order_when_data_is_loaded', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    await screen.findByRole('heading', { name: 'Saldo total' });
    // Assert
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Saldo total',
      'Receitas do mês',
      'Despesas do mês',
      'Projeção do fim do mês',
      'Metas',
      'Receitas x despesas',
      'Gastos por categoria',
      'Orçamentos',
      'Últimas transações',
    ]);
  });

  it('should_not_greet_the_user_when_the_dashboard_opens', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    await screen.findByRole('heading', { name: 'Saldo total' });
    // Assert
    expect(screen.queryByText(/bom dia|boa tarde|boa noite|olá/i)).not.toBeInTheDocument();
  });

  it('should_show_the_total_balance_and_the_change_in_the_month', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const balanceCard = (await screen.findByRole('heading', { name: 'Saldo total' })).closest(
      'section',
    );
    // Assert
    expect(balanceCard).toHaveTextContent('R$ 4.850,32+ R$ 850,32 (+21,3%)no mês');
  });

  it('should_hide_the_change_when_there_is_no_snapshot_before_today', async () => {
    // Arrange
    stubDashboardApi(dashboard({ balanceChange: null, netWorth: null }));
    renderDashboard();
    // Act
    await screen.findByRole('heading', { name: 'Saldo total' });
    // Assert
    expect(screen.queryByText('no mês')).not.toBeInTheDocument();
  });

  it('should_show_income_in_plus_and_expense_in_minus_for_the_month', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const income = await screen.findByRole('heading', { name: 'Receitas do mês' });
    const expense = screen.getByRole('heading', { name: 'Despesas do mês' });
    // Assert
    expect([income.closest('section'), expense.closest('section')]).toEqual([
      expect.objectContaining({ textContent: 'Receitas do mês+ R$ 5.000,00' }),
      expect.objectContaining({ textContent: 'Despesas do mês− R$ 2.000,00' }),
    ]);
  });
});

describe('Início — atalhos', () => {
  it('should_open_the_form_with_expense_selected_when_register_expense_is_pressed', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar despesa' }));
    // Assert
    const form = await screen.findByRole('dialog', { name: 'Nova transação' });
    expect(await within(form).findByRole('radio', { name: 'Despesa' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('should_open_the_form_with_income_selected_when_add_income_is_pressed', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar receita' }));
    // Assert
    const form = await screen.findByRole('dialog', { name: 'Nova transação' });
    expect(await within(form).findByRole('radio', { name: 'Receita' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('should_link_to_transactions_and_budgets_when_the_navigation_shortcuts_are_shown', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const shortcuts = await screen.findByRole('list', { name: 'Atalhos' });
    // Assert
    expect(
      within(shortcuts)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/transacoes', '/orcamentos']);
  });

  it('should_reload_the_dashboard_when_a_transaction_is_saved_from_a_shortcut', async () => {
    // Arrange
    const fetchMock = stubDashboardApi(dashboard(), {
      'POST /api/v1/transactions': () => Response.json(fixture(99, {}), { status: 201 }),
    });
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar despesa' }));
    const form = await screen.findByRole('dialog', { name: 'Nova transação' });
    await userEvent.type(await within(form).findByLabelText('Valor'), '1250');
    await userEvent.type(within(form).getByLabelText('Descrição'), 'Pastel');
    await userEvent.click(within(form).getByRole('radio', { name: /Mercado/ }));
    const dashboardRequests = () =>
      fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/dashboard')).length;
    const requestsBefore = dashboardRequests();
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    await waitFor(() => expect(dashboardRequests()).toBeGreaterThan(requestsBefore));
  });
});

describe('Início — gastos por categoria', () => {
  it('should_list_others_after_the_categories_when_the_api_sends_it', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const section = (await screen.findByRole('heading', { name: 'Gastos por categoria' })).closest(
      'section',
    );
    // Assert
    expect(
      within(section as HTMLElement)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['MercadoR$ 1.200,00 60%', 'OutrosR$ 800,00 40%']);
  });

  it('should_open_transactions_filtered_by_the_category_and_month_when_a_category_is_pressed', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const link = await screen.findByRole('link', { name: /Mercado/ });
    // Assert
    expect(link).toHaveAttribute(
      'href',
      `/transacoes?period=custom&from=2026-11-01&to=2026-11-30&category=${GROCERIES.id}`,
    );
  });

  it('should_not_link_others_when_the_list_has_the_grouped_item', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    await screen.findByText('Outros');
    // Assert
    expect(screen.queryByRole('link', { name: /Outros/ })).not.toBeInTheDocument();
  });

  it('should_show_an_empty_message_when_the_month_has_no_spending', async () => {
    // Arrange
    stubDashboardApi(dashboard({ spendingByCategory: [] }));
    renderDashboard();
    // Act
    const message = await screen.findByText('Nenhum gasto neste mês');
    // Assert
    expect(message).toBeVisible();
  });
});

describe('Início — orçamentos e transações', () => {
  it('should_show_the_budget_status_with_icon_text_when_a_budget_is_near_the_limit', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const [text] = await screen.findAllByText(
      (_, element) =>
        element?.tagName === 'SPAN' && element.textContent === 'R$ 120 acima do limite',
    );
    // Assert
    expect(text).toBeVisible();
  });

  it('should_offer_to_create_a_budget_when_the_month_has_none', async () => {
    // Arrange
    stubDashboardApi(dashboard({ budgetsNearLimit: [] }));
    renderDashboard();
    // Act
    const link = await screen.findByRole('link', { name: 'Criar orçamento' });
    // Assert
    expect(link).toHaveAttribute('href', '/orcamentos');
  });

  it('should_link_to_all_transactions_when_the_latest_ones_are_shown', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const link = await screen.findByRole('link', { name: 'Ver todas' });
    // Assert
    expect(link).toHaveAttribute('href', '/transacoes');
  });
});

describe('Início — projeção do fim do mês', () => {
  async function findProjectionCard(): Promise<HTMLElement> {
    const heading = await screen.findByRole('heading', { name: 'Projeção do fim do mês' });
    return heading.closest('section') as HTMLElement;
  }

  it('should_show_the_projected_balance_and_link_to_the_planning_when_there_are_planned_items', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const card = await findProjectionCard();
    // Assert
    expect({
      text: card.textContent,
      href: within(card).getByRole('link', { name: 'Ver planejamento' }).getAttribute('href'),
    }).toEqual({
      text: 'Projeção do fim do mêsVer planejamentoR$ 4.800,00Saldo projetado no fim do mês',
      href: '/planejamento',
    });
  });

  it('should_warn_with_icon_and_text_when_the_lowest_balance_is_negative', async () => {
    // Arrange
    stubDashboardApi(
      dashboard({
        projection: {
          projectedBalanceCents: 20000,
          lowestBalanceCents: -50000,
          lowestBalanceDate: '2026-11-20',
          hasPlannedItems: true,
        },
      }),
    );
    renderDashboard();
    // Act
    const warning = within(await findProjectionCard()).getByRole('status');
    // Assert
    expect({ text: warning.textContent, hasIcon: warning.querySelector('svg') !== null }).toEqual({
      text: 'Saldo negativo em 20/11',
      hasIcon: true,
    });
  });

  it('should_not_use_red_when_every_balance_in_the_month_is_positive', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const card = await findProjectionCard();
    // Assert
    expect(card.querySelector('.text-destructive')).toBeNull();
  });

  it('should_use_red_on_the_projected_balance_when_it_ends_negative', async () => {
    // Arrange
    stubDashboardApi(
      dashboard({
        projection: {
          projectedBalanceCents: -30000,
          lowestBalanceCents: -30000,
          lowestBalanceDate: '2026-11-30',
          hasPlannedItems: true,
        },
      }),
    );
    renderDashboard();
    // Act
    const card = await findProjectionCard();
    // Assert
    expect(card.querySelector('p.text-destructive')).toHaveTextContent('−R$ 300,00');
  });

  it('should_offer_to_plan_the_month_when_nothing_is_planned', async () => {
    // Arrange
    stubDashboardApi(
      dashboard({
        projection: {
          projectedBalanceCents: 485032,
          lowestBalanceCents: 485032,
          lowestBalanceDate: '2026-11-05',
          hasPlannedItems: false,
        },
      }),
    );
    renderDashboard();
    // Act
    const link = within(await findProjectionCard()).getByRole('link', { name: 'Planeje o mês' });
    // Assert
    expect(link).toHaveAttribute('href', '/planejamento');
  });

  it('should_not_show_the_card_when_the_projection_is_null', async () => {
    // Arrange
    stubDashboardApi(dashboard({ projection: null }));
    renderDashboard();
    // Act
    await screen.findByRole('heading', { name: 'Metas' });
    // Assert
    expect(
      screen.queryByRole('heading', { name: 'Projeção do fim do mês' }),
    ).not.toBeInTheDocument();
  });
});

describe('Início — metas', () => {
  async function findGoalsCard(): Promise<HTMLElement> {
    const heading = await screen.findByRole('heading', { name: 'Metas' });
    return heading.closest('section') as HTMLElement;
  }

  it('should_show_the_status_with_icon_and_text_when_a_goal_is_behind', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const status = within(await findGoalsCard()).getByText(/Atrasada/);
    // Assert
    expect({
      text: status.parentElement?.textContent,
      hasIcon: status.parentElement?.querySelector('svg') !== null,
    }).toEqual({ text: 'Atrasada — precisa guardar R$ 500/mês', hasIcon: true });
  });

  it('should_show_the_progress_and_the_amounts_of_the_goal', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const card = await findGoalsCard();
    // Assert
    expect({
      bar: within(card).getByRole('progressbar', { name: 'Viagem: 40% do valor desejado' }),
      text: within(card).getByRole('listitem').textContent,
    }).toEqual({
      bar: expect.anything(),
      text: expect.stringContaining('R$ 4.000 de R$ 10.000'),
    });
  });

  it('should_link_to_the_goals_screen_when_there_are_goals', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const link = within(await findGoalsCard()).getByRole('link', { name: 'Ver metas' });
    // Assert
    expect(link).toHaveAttribute('href', '/metas');
  });

  it('should_show_at_most_the_goals_the_api_sends', async () => {
    // Arrange
    const goals = ['Um', 'Dois', 'Três'].map((name, index) => ({
      ...TRIP_GOAL,
      id: `77777777-7777-4777-8777-77777777777${index}`,
      name,
    }));
    stubDashboardApi(dashboard({ goals: { items: goals, activeCount: 5 } }));
    renderDashboard();
    // Act
    const card = await findGoalsCard();
    // Assert
    expect(within(card).getAllByRole('listitem')).toHaveLength(3);
  });

  it('should_offer_to_create_a_goal_when_there_are_none', async () => {
    // Arrange
    stubDashboardApi(dashboard({ goals: { items: [], activeCount: 0 } }));
    renderDashboard();
    // Act
    const link = within(await findGoalsCard()).getByRole('link', { name: 'Criar meta' });
    // Assert
    expect(link).toHaveAttribute('href', '/metas');
  });
});

describe('Início — patrimônio no card de saldo', () => {
  const NET_WORTH_WITHOUT_CHANGE = {
    totalCents: 1550000,
    investmentsCents: 1200000,
    openBillsCents: 0,
    change: null,
  };

  async function findBalanceCard(): Promise<HTMLElement> {
    const heading = await screen.findByRole('heading', { name: 'Saldo total' });
    return heading.closest('section') as HTMLElement;
  }

  it('should_show_the_net_worth_with_its_change_and_the_link_when_there_are_investments', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const card = await findBalanceCard();
    // Assert
    expect(card).toHaveTextContent('PatrimônioVer patrimônioR$ 15.500,00+ R$ 500,00 (+3,3%)no mês');
  });

  it('should_open_investments_when_see_net_worth_is_pressed', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const link = within(await findBalanceCard()).getByRole('link', { name: 'Ver patrimônio' });
    // Assert
    expect(link).toHaveAttribute('href', '/investimentos');
  });

  it('should_show_the_line_when_there_is_only_an_open_bill', async () => {
    // Arrange
    stubDashboardApi(
      dashboard({
        netWorth: { ...NET_WORTH_WITHOUT_CHANGE, investmentsCents: 0, openBillsCents: 150000 },
      }),
    );
    renderDashboard();
    // Act
    const card = await findBalanceCard();
    // Assert
    expect(card).toHaveTextContent('Patrimônio');
  });

  it('should_not_show_the_line_when_there_are_no_investments_nor_bills', async () => {
    // Arrange
    stubDashboardApi(
      dashboard({
        netWorth: {
          totalCents: 485032,
          investmentsCents: 0,
          openBillsCents: 0,
          change: null,
        },
      }),
    );
    renderDashboard();
    // Act
    const card = await findBalanceCard();
    // Assert
    expect(card).not.toHaveTextContent('Patrimônio');
  });

  it('should_not_show_the_line_when_the_net_worth_is_null', async () => {
    // Arrange
    stubDashboardApi(dashboard({ netWorth: null }));
    renderDashboard();
    // Act
    const card = await findBalanceCard();
    // Assert
    expect(card).not.toHaveTextContent('Patrimônio');
  });

  it('should_show_only_the_value_and_the_link_when_there_is_no_change', async () => {
    // Arrange
    stubDashboardApi(dashboard({ netWorth: NET_WORTH_WITHOUT_CHANGE, balanceChange: null }));
    renderDashboard();
    // Act
    const card = await findBalanceCard();
    // Assert
    expect(within(card).queryByText('no mês')).not.toBeInTheDocument();
  });

  it('should_use_red_on_the_net_worth_only_when_it_is_negative', async () => {
    // Arrange
    stubDashboardApi(dashboard({ netWorth: { ...NET_WORTH_WITHOUT_CHANGE, totalCents: -70000 } }));
    renderDashboard();
    // Act
    const card = await findBalanceCard();
    // Assert
    expect(card.querySelector('p.text-destructive')).toHaveTextContent('−R$ 700,00');
  });

  it('should_not_use_red_when_the_net_worth_is_positive', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    // Act
    const card = await findBalanceCard();
    // Assert
    expect(card.querySelector('.text-destructive')).toBeNull();
  });

  it('should_mask_the_net_worth_amounts_and_keep_the_percent_when_hide_values_is_on', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    const card = await findBalanceCard();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(card).toHaveTextContent('PatrimônioVer patrimônioR$ ••••R$ •••• (+3,3%)no mês');
  });
});

describe('Início — valores ocultos', () => {
  it('should_mask_every_amount_when_hide_values_is_on', async () => {
    // Arrange
    stubDashboardApi();
    renderDashboard();
    await screen.findByRole('heading', { name: 'Saldo total' });
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(document.body.textContent).not.toMatch(/R\$ \d/);
  });
});

describe('Início — estados', () => {
  it('should_show_the_first_use_state_when_there_was_never_a_sync', async () => {
    // Arrange
    stubDashboardApi(dashboard(), {
      'GET /api/v1/sync-runs/latest': () => errorResponse(404, 'NOT_FOUND'),
    });
    renderDashboard();
    // Act
    const title = await screen.findByText('Conecte seus bancos para começar');
    // Assert
    expect(title).toBeVisible();
  });

  it('should_not_invent_numbers_when_there_was_never_a_sync', async () => {
    // Arrange
    stubDashboardApi(dashboard(), {
      'GET /api/v1/sync-runs/latest': () => errorResponse(404, 'NOT_FOUND'),
    });
    renderDashboard();
    // Act
    await screen.findByText('Conecte seus bancos para começar');
    // Assert
    expect(screen.queryByRole('heading', { name: 'Saldo total' })).not.toBeInTheDocument();
  });

  it('should_offer_to_sync_now_when_there_was_never_a_sync', async () => {
    // Arrange
    const fetchMock = stubDashboardApi(dashboard(), {
      'GET /api/v1/sync-runs/latest': () => errorResponse(404, 'NOT_FOUND'),
      'POST /api/v1/sync-runs': () => Response.json({ ...SYNC_RUN, status: 'running' }),
    });
    renderDashboard();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));
    // Assert
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/sync-runs'))).toBe(
        true,
      ),
    );
  });

  it('should_show_a_loading_status_while_the_dashboard_is_loading', () => {
    // Arrange
    stubDashboardApi(dashboard(), {
      'GET /api/v1/dashboard': () => new Promise<Response>(() => {}),
    });
    renderDashboard();
    // Act
    const status = screen.getByRole('status', { name: 'Carregando' });
    // Assert
    expect(status).toBeInTheDocument();
  });

  it('should_show_the_error_state_with_retry_when_the_dashboard_fails', async () => {
    // Arrange
    stubDashboardApi(dashboard(), {
      'GET /api/v1/dashboard': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    renderDashboard();
    // Act
    const alert = await screen.findByRole('alert');
    // Assert
    expect(within(alert).getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });
});
