// Carrega a tela na importação do arquivo: o primeiro teste não paga a transformação dela.
import '@/features/reports/reports-layout';
import '@/features/reports/net-worth/net-worth-report-page';

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { netWorthBody } from '../../../../test/helpers/net-worth';
import { renderApp } from '../../../../test/helpers/render-app';
import { errorResponse, requestedUrls, stubRoutes } from '../../../../test/helpers/stub-routes';

const REPORT_PATH = '/relatorios/patrimonio';
const NET_WORTH_ROUTE = 'GET /api/v1/net-worth';
const FIGURE_TITLES = ['Patrimônio hoje', 'Variação no período', 'Em investimentos'];

function pointOf(
  month: string,
  date: string,
  parts: { accountsCents: number; investmentsCents: number; openBillsCents: number },
) {
  return {
    month,
    date,
    ...parts,
    netWorthCents: parts.accountsCents + parts.investmentsCents - parts.openBillsCents,
  };
}

// Setembro: R$ 10.000,00. Outubro: R$ 11.000,00. Novembro (em andamento): R$ 15.500,00.
const SEPTEMBER = pointOf('2026-09', '2026-09-04', {
  accountsCents: 400000,
  investmentsCents: 600000,
  openBillsCents: 0,
});
const OCTOBER = pointOf('2026-10', '2026-10-31', {
  accountsCents: 450000,
  investmentsCents: 700000,
  openBillsCents: 50000,
});
const NOVEMBER = pointOf('2026-11', '2026-11-15', {
  accountsCents: 500000,
  investmentsCents: 1200000,
  openBillsCents: 150000,
});

function reportBody(overrides: Record<string, unknown> = {}) {
  return netWorthBody({
    current: NOVEMBER,
    points: [SEPTEMBER, OCTOBER, NOVEMBER],
    firstSnapshotDate: '2026-09-04',
    ...overrides,
  });
}

function stubReport(body: unknown = reportBody()) {
  return stubRoutes({ [NET_WORTH_ROUTE]: () => Response.json(body) });
}

async function findFigure(name: string) {
  return screen.findByRole('region', { name });
}

async function findTable() {
  return screen.findByRole('table', { name: 'Patrimônio de set. 2026 a nov. 2026' });
}

beforeEach(() => {
  // 10h em São Paulo, 15 de novembro de 2026: novembro é o mês em andamento.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-15T13:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('Relatório de patrimônio — período', () => {
  it('should_request_the_twelve_months_ending_at_the_current_month_by_default', async () => {
    // Arrange
    const fetchMock = stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Patrimônio hoje');
    // Assert
    expect(requestedUrls(fetchMock, '/api/v1/net-worth')).toEqual([
      '/api/v1/net-worth?from=2025-12&to=2026-11',
    ]);
  });

  it('should_request_twenty_four_months_when_the_user_picks_that_period', async () => {
    // Arrange
    const fetchMock = stubReport();
    renderApp(`${REPORT_PATH}?periodo=24m`);
    // Act
    await findFigure('Patrimônio hoje');
    // Assert
    expect(requestedUrls(fetchMock, '/api/v1/net-worth')).toEqual([
      '/api/v1/net-worth?from=2024-12&to=2026-11',
    ]);
  });
});

describe('Relatório de patrimônio — números do topo', () => {
  it('should_show_the_net_worth_of_today', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Patrimônio hoje');
    // Assert
    expect(figure).toHaveTextContent('R$ 15.500,00');
  });

  it('should_show_the_change_in_reais_and_percent_with_the_date_of_the_first_point', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Variação no período');
    // Assert
    expect(figure).toHaveTextContent('+ R$ 5.500,00 (+55%)desde 04/09');
  });

  it('should_show_a_dash_in_the_change_when_there_is_only_one_point', async () => {
    // Arrange
    stubReport(reportBody({ points: [NOVEMBER], firstSnapshotDate: '2026-11-04' }));
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Variação no período');
    // Assert
    expect(figure).toHaveTextContent('Variação no período—');
  });

  it('should_show_the_share_of_investments_and_their_value', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Em investimentos');
    // Assert
    expect(figure).toHaveTextContent('Em investimentos70,6%R$ 12.000,00');
  });

  it('should_show_a_dash_in_the_share_when_accounts_and_investments_are_zero', async () => {
    // Arrange
    const empty = { accountsCents: 0, investmentsCents: 0, openBillsCents: 0 };
    stubReport(
      reportBody({
        current: pointOf('2026-11', '2026-11-15', empty),
      }),
    );
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Em investimentos');
    // Assert
    expect(figure).toHaveTextContent('Em investimentos—');
  });

  it('should_show_the_net_worth_in_red_only_when_it_is_negative', async () => {
    // Arrange
    const negative = { accountsCents: 100000, investmentsCents: 0, openBillsCents: 300000 };
    stubReport(
      reportBody({
        current: pointOf('2026-11', '2026-11-15', negative),
      }),
    );
    // Act
    renderApp(REPORT_PATH);
    const figure = await findFigure('Patrimônio hoje');
    // Assert
    expect(within(figure).getByText('−R$ 2.000,00').parentElement).toHaveClass('text-destructive');
  });

  it('should_not_use_red_when_the_net_worth_is_positive', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    // Act
    const figure = await findFigure('Patrimônio hoje');
    // Assert
    expect(within(figure).getByText('R$ 15.500,00').parentElement).not.toHaveClass(
      'text-destructive',
    );
  });
});

describe('Relatório de patrimônio — gráficos', () => {
  it('should_show_the_area_and_the_composition_charts_when_there_are_two_or_more_points', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Patrimônio hoje');
    // Assert
    const names = ['Patrimônio ao longo do tempo', 'Composição do patrimônio'];
    expect(
      names.map(
        (name) =>
          screen.getByRole('region', { name }).querySelectorAll('[data-slot="chart"]').length,
      ),
    ).toEqual([1, 1]);
  });

  it('should_list_accounts_investments_and_open_bills_in_the_composition_legend', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    // Act
    const card = await screen.findByRole('region', { name: 'Composição do patrimônio' });
    // Assert
    expect(within(card).getByRole('list')).toHaveTextContent(
      'ContasInvestimentosFaturas em aberto',
    );
  });

  it('should_paint_the_legend_marks_with_the_palette_slots_in_order', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    const card = await screen.findByRole('region', { name: 'Composição do patrimônio' });
    // Act
    const marks = [
      ...within(card).getByRole('list').querySelectorAll<HTMLElement>('li > span:first-child'),
    ];
    // Assert
    expect(marks.map((mark) => mark.style.backgroundColor)).toEqual([
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-3)',
    ]);
  });

  it('should_describe_the_open_bills_with_a_minus_sign_in_the_text_summary_of_the_composition', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    // Act
    const card = await screen.findByRole('region', { name: 'Composição do patrimônio' });
    // Assert
    expect(card).toHaveTextContent('faturas em aberto − R$ 1.500,00 e patrimônio R$ 15.500,00');
  });

  it('should_mark_the_current_month_as_in_progress_in_text_in_both_charts', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    await findFigure('Patrimônio hoje');
    // Act
    const names = ['Patrimônio ao longo do tempo', 'Composição do patrimônio'];
    const hasNote = names.map(
      (name) =>
        within(screen.getByRole('region', { name })).queryByText('nov. 2026 em andamento') !== null,
    );
    // Assert
    expect(hasNote).toEqual([true, true]);
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
      figures: FIGURE_TITLES.map((title) => screen.queryByRole('region', { name: title }) !== null),
    }).toEqual({ charts: 0, figures: [true, true, true] });
  });
});

describe('Relatório de patrimônio — histórico curto', () => {
  it('should_show_no_charts_and_say_since_when_the_history_exists_when_there_is_one_point', async () => {
    // Arrange
    stubReport(reportBody({ points: [NOVEMBER], firstSnapshotDate: '2026-11-04' }));
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Patrimônio hoje');
    // Assert
    expect({
      charts: document.querySelectorAll('[data-slot="chart"]').length,
      text: screen.getAllByText(/O histórico começa em 04\/11\. Os gráficos aparecem/).length,
    }).toEqual({ charts: 0, text: 1 });
  });

  it('should_show_the_single_point_in_the_table', async () => {
    // Arrange
    stubReport(reportBody({ points: [NOVEMBER], firstSnapshotDate: '2026-11-04' }));
    renderApp(REPORT_PATH);
    // Act
    const table = await screen.findByRole('table', { name: 'Patrimônio de nov. 2026 a nov. 2026' });
    // Assert
    expect(within(table).getByRole('row', { name: /nov\. 2026/ })).toHaveTextContent(
      'R$ 15.500,00',
    );
  });
});

describe('Relatório de patrimônio — tabela', () => {
  it('should_show_the_columns_and_one_row_per_month_without_a_total_row', async () => {
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
      hasTotal: within(table).queryByText('Total do período') !== null,
    }).toEqual({
      headers: ['Mês', 'Contas', 'Investimentos', 'Faturas em aberto', 'Patrimônio'],
      rows: 4,
      hasTotal: false,
    });
  });

  it('should_show_the_open_bills_with_a_minus_sign', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await findTable();
    // Act
    const row = within(table).getByRole('row', { name: /out\. 2026/ });
    // Assert
    expect(row).toHaveTextContent('− R$ 500,00');
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

  it('should_show_in_the_current_month_the_same_net_worth_as_the_investments_card', async () => {
    // Arrange: o cartão de Investimentos mostra `current.netWorthCents` do mesmo `/net-worth`.
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const table = await findTable();
    // Act
    const row = within(table).getByRole('row', { name: /nov\. 2026/ });
    // Assert
    expect(row).toHaveTextContent('R$ 15.500,00');
  });
});

describe('Relatório de patrimônio — nota e estados', () => {
  it('should_show_the_formula_the_archived_banks_rule_and_the_start_of_the_history', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Patrimônio hoje');
    // Assert
    expect(
      screen.getByText(/^Patrimônio = contas \+ investimentos − faturas em aberto/),
    ).toHaveTextContent(
      'Um banco removido do Valora sai do patrimônio a partir do dia em que foi arquivado. Gastos no cartão ainda fora de fatura fechada não entram. O histórico começa em 04/09.',
    );
  });

  it('should_mask_the_money_and_keep_the_share_visible_when_hide_values_is_on', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    await findTable();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(screen.getByRole('region', { name: 'Em investimentos' })).toHaveTextContent(
      'Em investimentos70,6%R$ ••••',
    );
  });

  it('should_mask_the_net_worth_of_today_when_hide_values_is_on', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    await findTable();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(screen.getByRole('region', { name: 'Patrimônio hoje' })).toHaveTextContent('R$ ••••');
  });

  it('should_show_the_empty_state_with_a_link_to_the_accounts_when_there_is_no_snapshot', async () => {
    // Arrange
    stubReport(reportBody({ points: [], firstSnapshotDate: null }));
    // Act
    renderApp(REPORT_PATH);
    // Assert
    expect(
      await screen.findByRole('heading', {
        name: 'O patrimônio aparece depois da primeira sincronização',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver contas' })).toHaveAttribute('href', '/contas');
  });

  it('should_show_a_friendly_error_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({ [NET_WORTH_ROUTE]: () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderApp(REPORT_PATH);
    // Assert
    expect(await screen.findByText('Não foi possível carregar o relatório.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('should_link_to_the_net_worth_report_from_the_navigation_between_reports', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findFigure('Patrimônio hoje');
    // Assert
    const navigation = screen.getByRole('navigation', { name: 'Relatórios' });
    expect(within(navigation).getByRole('link', { name: 'Patrimônio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
