import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { appRoutes } from '@/app/router';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';

const REPORT_PATH = '/relatorios/receitas-e-despesas';
const REPORT_ROUTE = 'GET /api/v1/reports/income-expense';

const OCTOBER = {
  month: '2026-10',
  incomeCents: 500000,
  expenseCents: 320000,
  resultCents: 180000,
};
const NOVEMBER = {
  month: '2026-11',
  incomeCents: 100000,
  expenseCents: 250000,
  resultCents: -150000,
};

function reportBody(overrides: Record<string, unknown> = {}) {
  return {
    from: '2025-12',
    to: '2026-11',
    months: [OCTOBER, NOVEMBER],
    totals: { incomeCents: 600000, expenseCents: 570000, resultCents: 30000 },
    ...overrides,
  };
}

function emptyReportBody() {
  return reportBody({
    months: [],
    totals: { incomeCents: 0, expenseCents: 0, resultCents: 0 },
  });
}

function stubReport(body: unknown = reportBody()) {
  return stubRoutes({ [REPORT_ROUTE]: () => Response.json(body) });
}

function renderApp(initialPath: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

function requestedRanges(fetchMock: ReturnType<typeof stubRoutes>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.includes('/reports/'));
}

async function findReport() {
  return screen.findByRole('region', { name: 'Receitas x despesas' });
}

beforeEach(() => {
  // 10h em São Paulo, 10 de novembro de 2026: novembro é o mês em andamento.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T13:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Relatórios — período', () => {
  it('should_use_twelve_months_when_the_url_has_no_period', async () => {
    // Arrange
    const fetchMock = stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    expect(requestedRanges(fetchMock)).toEqual([
      '/api/v1/reports/income-expense?from=2025-12&to=2026-11',
    ]);
  });

  it('should_use_the_period_of_the_url_when_it_is_a_valid_preset', async () => {
    // Arrange
    const fetchMock = stubReport();
    // Act
    renderApp(`${REPORT_PATH}?periodo=6m`);
    await findReport();
    // Assert
    expect(requestedRanges(fetchMock)).toEqual([
      '/api/v1/reports/income-expense?from=2026-06&to=2026-11',
    ]);
  });

  it('should_fall_back_to_twelve_months_when_the_period_of_the_url_is_invalid', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(`${REPORT_PATH}?periodo=abc`);
    await findReport();
    // Assert
    expect(screen.getByRole('radio', { name: '12 meses' })).toBeChecked();
  });

  it('should_write_the_period_in_the_url_when_the_user_picks_six_months', async () => {
    // Arrange
    stubReport();
    const router = renderApp(REPORT_PATH);
    await findReport();
    // Act
    await userEvent.click(screen.getByRole('radio', { name: '6 meses' }));
    // Assert
    await waitFor(() => expect(router.state.location.search).toBe('?periodo=6m'));
  });

  it('should_go_from_january_to_the_current_month_when_the_user_picks_this_year', async () => {
    // Arrange
    const fetchMock = stubReport();
    renderApp(`${REPORT_PATH}?periodo=ano`);
    // Act
    await findReport();
    // Assert
    expect(requestedRanges(fetchMock)).toEqual([
      '/api/v1/reports/income-expense?from=2026-01&to=2026-11',
    ]);
  });
});

describe('Relatórios — estrutura', () => {
  it('should_open_the_income_expense_report_when_the_user_opens_the_reports_area', async () => {
    // Arrange
    stubReport();
    // Act
    const router = renderApp('/relatorios?periodo=24m');
    await findReport();
    // Assert
    expect(router.state.location.pathname + router.state.location.search).toBe(
      `${REPORT_PATH}?periodo=24m`,
    );
  });

  it('should_show_the_navigation_between_reports_with_the_open_one_marked', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    const navigation = screen.getByRole('navigation', { name: 'Relatórios' });
    expect(within(navigation).getByRole('link', { name: 'Receitas e despesas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('should_show_the_reports_item_after_investments_in_the_menu_and_mark_it_active', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    const labels = screen
      .getAllByRole('link')
      .map((link) => link.textContent)
      .filter((text) => text === 'Investimentos' || text === 'Relatórios');
    expect(labels).toEqual(['Investimentos', 'Relatórios']);
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('data-active', 'true');
  });

  it('should_show_the_not_found_page_without_the_menu_when_the_report_does_not_exist', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp('/relatorios/inexistente');
    await screen.findByRole('heading', { name: '404 Página não encontrada' });
    // Assert
    expect(screen.queryByRole('link', { name: 'Relatórios' })).not.toBeInTheDocument();
  });
});

describe('Relatório de receitas e despesas', () => {
  it('should_show_the_three_numbers_of_the_period', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    expect({
      income: screen.getByRole('region', { name: 'Receitas' }).textContent,
      expense: screen.getByRole('region', { name: 'Despesas' }).textContent,
      result: screen
        .getByRole('region', { name: 'Resultado' })
        .textContent?.startsWith('Resultado+ R$ 300,00'),
    }).toEqual({
      income: 'Receitas+ R$ 6.000,00',
      expense: 'Despesas− R$ 5.700,00',
      result: true,
    });
  });

  it('should_show_the_chart_and_hide_the_table_when_the_view_is_the_default', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    const card = await findReport();
    // Assert
    expect(card.querySelector('[data-slot="chart"]')).toBeInTheDocument();
    expect(within(card).getByRole('list')).toHaveTextContent('ReceitasDespesasMês em andamento');
  });

  it('should_show_the_table_with_the_same_months_and_hide_the_chart_when_the_user_picks_table', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    const card = await findReport();
    // Act
    await userEvent.click(screen.getByRole('radio', { name: 'Tabela' }));
    // Assert
    const table = await within(card).findByRole('table', {
      name: 'Receitas e despesas de out. 2026 a nov. 2026',
    });
    expect(within(table).getAllByRole('row').length).toBe(4);
    expect(card.querySelector('[data-slot="chart"]')).not.toBeInTheDocument();
  });

  it('should_mark_the_current_month_as_in_progress_in_text_in_the_table', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const card = await findReport();
    // Act
    const row = within(card).getByRole('row', { name: /nov\. 2026/ });
    // Assert
    expect(row).toHaveTextContent('em andamento');
  });

  it('should_not_mark_a_past_month_as_in_progress', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const card = await findReport();
    // Act
    const row = within(card).getByRole('row', { name: /out\. 2026/ });
    // Assert
    expect(row).not.toHaveTextContent('em andamento');
  });

  it('should_show_a_minus_sign_on_expenses_and_a_total_row_in_the_table', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const card = await findReport();
    // Act
    const totalRow = within(card).getByRole('row', { name: /Total do período/ });
    // Assert
    expect(totalRow).toHaveTextContent('− R$ 5.700,00');
  });

  it('should_mask_the_values_when_hide_values_is_on', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    await findReport();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(screen.getByRole('region', { name: 'Receitas' })).toHaveTextContent('R$ ••••');
    expect(screen.queryByText(/R\$ 6\.000,00/)).not.toBeInTheDocument();
  });

  it('should_show_the_empty_state_with_change_period_when_there_are_no_transactions', async () => {
    // Arrange
    stubReport(emptyReportBody());
    // Act
    renderApp(REPORT_PATH);
    // Assert
    expect(
      await screen.findByRole('heading', { name: 'Ainda não há transações neste período' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mudar período' })).toBeInTheDocument();
  });

  it('should_move_the_focus_to_the_period_filter_when_the_user_asks_to_change_the_period', async () => {
    // Arrange
    stubReport(emptyReportBody());
    renderApp(REPORT_PATH);
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Mudar período' }));
    // Assert
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: '6 meses' }));
  });

  it('should_show_a_friendly_error_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({ [REPORT_ROUTE]: () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderApp(REPORT_PATH);
    // Assert
    expect(await screen.findByText('Não foi possível carregar o relatório.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});

describe('Relatório de receitas e despesas — resposta e contexto', () => {
  it('should_answer_with_the_monthly_average_of_closed_months_when_there_is_one', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    expect(screen.getByText(/entram em média/).textContent).toBe(
      'No único mês fechado, entram em média R$ 5.000,00 e saem R$ 3.200,00 por mês.',
    );
  });

  it('should_count_the_closed_months_when_there_are_several', async () => {
    // Arrange
    const september = { ...OCTOBER, month: '2026-09' };
    stubReport(reportBody({ months: [september, OCTOBER, NOVEMBER] }));
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    expect(screen.getByText(/entram em média/)).toHaveTextContent('Nos 2 meses fechados');
  });

  it('should_show_the_view_toggle_in_the_chart_card_and_not_in_the_filters', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    // Act
    const chartCard = await findReport();
    // Assert
    expect(within(chartCard).getByRole('radiogroup', { name: 'Visualização' })).toBeVisible();
    expect(screen.getAllByRole('radiogroup', { name: 'Visualização' })).toHaveLength(1);
  });

  it('should_keep_the_table_view_when_the_user_opens_another_report', async () => {
    // Arrange
    stubReport();
    const router = renderApp(`${REPORT_PATH}?visao=tabela`);
    await findReport();
    // Act
    await userEvent.click(screen.getByRole('link', { name: 'Por categoria' }));
    // Assert
    await waitFor(() => expect(router.state.location.search).toBe('?visao=tabela'));
  });

  it('should_say_when_the_data_starts_after_the_first_month_of_the_period', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    expect(
      screen.getByText('Há dados desde out. 2026, por isso o período mostra 2 meses.'),
    ).toBeInTheDocument();
  });

  it('should_not_mention_the_history_when_the_data_covers_the_whole_period', async () => {
    // Arrange
    stubReport(reportBody({ months: [{ ...OCTOBER, month: '2025-12' }, NOVEMBER] }));
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    expect(screen.queryByText(/Há dados desde/)).not.toBeInTheDocument();
  });

  it('should_title_the_tab_with_the_open_report', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findReport();
    // Assert
    expect(document.title).toBe('Receitas e despesas | Relatórios | Valora');
  });

  it('should_suggest_a_longer_period_when_the_short_period_has_no_data', async () => {
    // Arrange
    stubReport(emptyReportBody());
    // Act
    renderApp(`${REPORT_PATH}?periodo=6m`);
    await screen.findByText('Ainda não há transações neste período');
    // Assert
    expect(screen.getByRole('button', { name: 'Mudar período' })).toBeInTheDocument();
  });

  it('should_point_to_the_accounts_when_even_the_longest_period_has_no_data', async () => {
    // Arrange
    stubReport(emptyReportBody());
    // Act
    renderApp(`${REPORT_PATH}?periodo=24m`);
    await screen.findByText('Ainda não há transações neste período');
    // Assert
    expect(screen.getByRole('link', { name: 'Ver contas' })).toBeInTheDocument();
  });
});
