import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { appRoutes } from '@/app/router';

import { errorResponse, stubRoutes } from '../../../../test/helpers/stub-routes';

const REPORT_PATH = '/relatorios/evolucao-financeira';
const REPORT_ROUTE = 'GET /api/v1/reports/savings-evolution';

const SEPTEMBER = {
  month: '2026-09',
  incomeCents: 500000,
  expenseCents: 300000,
  resultCents: 200000,
  savingsRatePercent: 40,
  cumulativeResultCents: 200000,
};
// Sem receita: a taxa é nula.
const OCTOBER = {
  month: '2026-10',
  incomeCents: 0,
  expenseCents: 20000,
  resultCents: -20000,
  savingsRatePercent: null,
  cumulativeResultCents: 180000,
};
// O mês em andamento, com resultado negativo.
const NOVEMBER = {
  month: '2026-11',
  incomeCents: 100000,
  expenseCents: 150000,
  resultCents: -50000,
  savingsRatePercent: -50,
  cumulativeResultCents: 130000,
};

function reportBody(overrides: Record<string, unknown> = {}) {
  return {
    from: '2025-12',
    to: '2026-11',
    months: [SEPTEMBER, OCTOBER, NOVEMBER],
    totals: {
      incomeCents: 600000,
      expenseCents: 470000,
      resultCents: 130000,
      savingsRatePercent: 21.7,
      surplusMonths: 1,
      closedMonths: 2,
    },
    ...overrides,
  };
}

function negativeReportBody() {
  return reportBody({
    months: [
      {
        month: '2026-10',
        incomeCents: 100000,
        expenseCents: 300000,
        resultCents: -200000,
        savingsRatePercent: -200,
        cumulativeResultCents: -200000,
      },
    ],
    totals: {
      incomeCents: 100000,
      expenseCents: 300000,
      resultCents: -200000,
      savingsRatePercent: -200,
      surplusMonths: 0,
      closedMonths: 1,
    },
  });
}

function emptyReportBody() {
  return reportBody({
    months: [],
    totals: {
      incomeCents: 0,
      expenseCents: 0,
      resultCents: 0,
      savingsRatePercent: null,
      surplusMonths: 0,
      closedMonths: 0,
    },
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

async function findFigure(name: string) {
  return screen.findByRole('region', { name });
}

async function findTable() {
  return screen.findByRole('table', { name: 'Evolução financeira de set. 2026 a nov. 2026' });
}

beforeEach(() => {
  // 10h em São Paulo, 10 de novembro de 2026: novembro é o mês em andamento.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T13:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Relatório de evolução financeira — números do período', () => {
  it('should_request_the_twelve_months_ending_at_the_current_month_by_default', async () => {
    // Arrange
    const fetchMock = stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Resultado do período');
    // Assert
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(
      '/api/v1/reports/savings-evolution?from=2025-12&to=2026-11',
    );
  });

  it('should_show_result_rate_and_surplus_months_of_the_period', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Resultado do período');
    // Assert
    expect({
      result: screen
        .getByRole('region', { name: 'Resultado do período' })
        .textContent?.startsWith('Resultado do período+ R$ 1.300,00'),
      rate: screen.getByRole('region', { name: 'Taxa de poupança' }).textContent,
      surplus: screen.getByRole('region', { name: 'Meses com sobra' }).textContent,
    }).toEqual({
      result: true,
      rate: 'Taxa de poupança+ 21,7%Resultado ÷ receitas do período',
      surplus: 'Meses com sobra1 de 2 meses fechadosSó meses já fechados',
    });
  });

  it('should_show_the_period_result_in_red_with_a_minus_sign_when_it_is_negative', async () => {
    // Arrange
    stubReport(negativeReportBody());
    renderApp(REPORT_PATH);
    // Act
    const figure = await findFigure('Resultado do período');
    // Assert
    const value = within(figure).getByText('− R$ 2.000,00');
    expect(value.parentElement).toHaveClass('text-destructive');
  });

  it('should_not_use_red_when_the_period_result_is_positive', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    // Act
    const figure = await findFigure('Resultado do período');
    // Assert
    expect(within(figure).getByText('+ R$ 1.300,00').parentElement).not.toHaveClass(
      'text-destructive',
    );
  });

  it('should_show_a_dash_in_the_rate_when_the_period_has_no_income', async () => {
    // Arrange
    stubReport(
      reportBody({
        totals: {
          incomeCents: 0,
          expenseCents: 20000,
          resultCents: -20000,
          savingsRatePercent: null,
          surplusMonths: 0,
          closedMonths: 1,
        },
      }),
    );
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Taxa de poupança');
    // Assert
    expect(figure).toHaveTextContent('Taxa de poupança—');
  });

  it('should_use_the_singular_when_there_is_one_closed_month', async () => {
    // Arrange
    stubReport(negativeReportBody());
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Meses com sobra');
    // Assert
    expect(figure).toHaveTextContent('0 de 1 mês fechado');
  });
});

describe('Relatório de evolução financeira — gráficos', () => {
  it('should_show_the_three_charts_each_with_its_own_card_when_the_view_is_the_default', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Resultado do período');
    // Assert
    const cards = ['Resultado do mês', 'Taxa de poupança por mês', 'Sobra acumulada'].map((name) =>
      screen.getByRole('region', { name }),
    );
    expect(cards.map((card) => card.querySelectorAll('[data-slot="chart"]').length)).toEqual([
      1, 1, 1,
    ]);
  });

  it('should_explain_that_the_accumulated_surplus_is_not_a_balance', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    const card = await screen.findByRole('region', { name: 'Sobra acumulada' });
    // Assert
    expect(card).toHaveTextContent('Não é saldo nem patrimônio.');
  });

  it('should_mark_the_current_month_as_in_progress_in_text_in_each_chart', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Resultado do período');
    // Assert
    const names = ['Resultado do mês', 'Taxa de poupança por mês', 'Sobra acumulada'];
    const hasNote = names.map(
      (name) =>
        within(screen.getByRole('region', { name })).queryByText('nov. 2026 em andamento') !== null,
    );
    expect(hasNote).toEqual([true, true, true]);
  });

  it('should_hide_the_charts_and_keep_the_figures_when_the_user_picks_the_table', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    // Act
    await findTable();
    // Assert
    expect({
      charts: document.querySelectorAll('[data-slot="chart"]').length,
      figure: screen.queryByRole('region', { name: 'Resultado do período' }) !== null,
    }).toEqual({ charts: 0, figure: true });
  });
});

describe('Relatório de evolução financeira — tabela', () => {
  it('should_show_the_columns_and_one_row_per_month_with_the_total_row', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    // Act
    const table = await findTable();
    // Assert
    expect({
      headers: within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
      rows: within(table).getAllByRole('row').length,
    }).toEqual({
      headers: ['Mês', 'Receitas', 'Despesas', 'Resultado', 'Taxa de poupança', 'Sobra acumulada'],
      rows: 5,
    });
  });

  it('should_show_a_negative_month_with_the_minus_sign_in_the_table', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await findTable();
    // Act
    const row = within(table).getByRole('row', { name: /nov\. 2026/ });
    // Assert
    expect(row).toHaveTextContent('− R$ 500,00');
  });

  it('should_show_a_dash_in_the_rate_of_a_month_without_income', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await findTable();
    // Act
    const row = within(table).getByRole('row', { name: /out\. 2026/ });
    // Assert
    expect(row).toHaveTextContent('—');
  });

  it('should_show_a_negative_accumulated_surplus_with_the_minus_sign', async () => {
    // Arrange
    stubReport(negativeReportBody());
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await screen.findByRole('table');
    // Act
    const row = within(table).getByRole('row', { name: /out\. 2026/ });
    // Assert
    expect(row).toHaveTextContent('− R$ 2.000,00');
  });

  it('should_mark_only_the_current_month_as_in_progress', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await findTable();
    // Act
    const marked = within(table)
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('em andamento'));
    // Assert
    expect(marked.map((row) => row.textContent?.slice(0, 9))).toEqual(['nov. 2026']);
  });

  it('should_show_the_period_rate_in_the_total_row', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await findTable();
    // Act
    const totalRow = within(table).getByRole('row', { name: /Total do período/ });
    // Assert
    expect(totalRow).toHaveTextContent('21,7%');
  });
});

describe('Relatório de evolução financeira — estados', () => {
  it('should_mask_the_money_of_the_figures_when_hide_values_is_on', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    await findTable();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(screen.getByRole('region', { name: 'Resultado do período' })).toHaveTextContent(
      'R$ ••••',
    );
  });

  it('should_keep_the_period_rate_visible_when_hide_values_is_on', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    await findTable();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(screen.getByRole('region', { name: 'Taxa de poupança' })).toHaveTextContent('+ 21,7%');
  });

  it('should_keep_the_rates_visible_in_the_table_when_hide_values_is_on', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await findTable();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(within(table).getByRole('row', { name: /set\. 2026/ })).toHaveTextContent('40%');
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

  it('should_show_a_friendly_error_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({ [REPORT_ROUTE]: () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderApp(REPORT_PATH);
    // Assert
    expect(await screen.findByText('Não foi possível carregar o relatório.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('should_link_to_the_savings_report_from_the_navigation_between_reports', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Resultado do período');
    // Assert
    const navigation = screen.getByRole('navigation', { name: 'Relatórios' });
    expect(within(navigation).getByRole('link', { name: 'Evolução financeira' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
