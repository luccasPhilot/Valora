// Carrega a tela na importação do arquivo: o primeiro teste não paga a transformação dela.
import '@/features/reports/reports-layout';
import '@/features/reports/category-spending/category-spending-page';

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategorySeries } from '@/lib/api/reports';

import { renderApp } from '../../../../test/helpers/render-app';
import { errorResponse, requestedUrls, stubRoutes } from '../../../../test/helpers/stub-routes';
import { seriesColor } from './series-color';

const REPORT_PATH = '/relatorios/categorias';
const REPORT_ROUTE = 'GET /api/v1/reports/category-spending';

function series(overrides: Partial<CategorySeries> & Pick<CategorySeries, 'name'>): CategorySeries {
  return {
    kind: 'category',
    categoryId: `id-${overrides.name}`,
    icon: 'shopping-cart',
    totalCents: 0,
    percent: 0,
    monthlyCents: [0, 0],
    ...overrides,
  };
}

const MARKET = series({
  name: 'Mercado',
  totalCents: 150000,
  percent: 50,
  monthlyCents: [100000, 50000],
});
const LEISURE = series({
  name: 'Lazer',
  totalCents: 90000,
  percent: 30,
  monthlyCents: [30000, 60000],
});
const OTHERS = series({
  name: 'Outros',
  kind: 'other',
  categoryId: null,
  icon: null,
  totalCents: 60000,
  percent: 20,
  monthlyCents: [20000, 40000],
});

function reportBody(overrides: Record<string, unknown> = {}) {
  return {
    from: '2026-10',
    to: '2026-11',
    months: ['2026-10', '2026-11'],
    series: [MARKET, LEISURE, OTHERS],
    totals: { totalCents: 300000, monthlyCents: [150000, 150000] },
    ...overrides,
  };
}

function emptyReportBody() {
  return reportBody({ months: [], series: [], totals: { totalCents: 0, monthlyCents: [] } });
}

function stubReport(body: unknown = reportBody()) {
  return stubRoutes({ [REPORT_ROUTE]: () => Response.json(body) });
}

async function findChartCard() {
  return screen.findByRole('region', { name: 'Gasto por categoria e mês' });
}

function rankingCard() {
  return screen.getByRole('region', { name: 'Ranking do período' });
}

beforeEach(() => {
  // 10h em São Paulo, 10 de novembro de 2026: novembro é o mês em andamento.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T13:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('seriesColor', () => {
  it('should_use_the_palette_slots_in_order_without_skipping', () => {
    // Arrange
    const ranked = [MARKET, LEISURE, series({ name: 'Saúde' })];
    // Act
    const colors = ranked.map((item, position) => seriesColor(item, position));
    // Assert
    expect(colors).toEqual([
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-3)',
    ]);
  });

  it('should_use_the_gray_of_the_palette_for_others_wherever_it_is_listed', () => {
    // Arrange
    // Act
    const color = seriesColor(OTHERS, 5);
    // Assert
    expect(color).toBe('var(--color-chart-other)');
  });
});

describe('Relatório por categoria', () => {
  it('should_request_the_twelve_months_ending_at_the_current_month_by_default', async () => {
    // Arrange
    const fetchMock = stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findChartCard();
    // Assert
    expect(requestedUrls(fetchMock, '/api/v1/reports/category-spending')).toEqual([
      '/api/v1/reports/category-spending?from=2025-12&to=2026-11',
    ]);
  });

  it('should_list_the_series_names_in_the_legend_in_ranking_order_with_others_last', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    // Act
    const card = await findChartCard();
    // Assert
    expect(within(card).getByRole('list')).toHaveTextContent('MercadoLazerOutros');
  });

  it('should_paint_each_legend_mark_with_the_slot_of_its_position', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    const card = await findChartCard();
    // Act
    const marks = [
      ...within(card).getByRole('list').querySelectorAll<HTMLElement>('li > span:first-child'),
    ];
    // Assert
    expect(marks.map((mark) => mark.style.backgroundColor)).toEqual([
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-other)',
    ]);
  });

  it('should_mark_the_current_month_as_in_progress_in_text_below_the_legend', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    // Act
    const card = await findChartCard();
    // Assert
    expect(within(card).getByText('nov. 2026 em andamento')).toBeInTheDocument();
  });

  it('should_show_the_ranking_with_icon_name_total_and_percent_from_largest_to_smallest', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    await findChartCard();
    // Act
    const items = within(rankingCard()).getAllByRole('listitem');
    // Assert
    expect(items.map((item) => item.textContent)).toEqual([
      'MercadoR$ 1.500,00 50%',
      'LazerR$ 900,00 30%',
      'OutrosR$ 600,00 20%',
    ]);
  });

  it('should_show_the_total_of_the_period_in_the_hero_card', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    await findChartCard();
    // Act
    const hero = screen.getByRole('region', { name: 'Total gasto' });
    // Assert
    expect(within(hero).getByText('− R$ 3.000,00')).toBeInTheDocument();
  });

  it('should_show_the_table_with_one_month_per_row_one_column_per_series_and_totals', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    const card = await findChartCard();
    // Act
    const table = await within(card).findByRole('table', {
      name: 'Gasto por categoria de out. 2026 a nov. 2026',
    });
    // Assert
    expect({
      headers: within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
      rows: within(table).getAllByRole('row').length,
      totalRow: within(table).getByRole('row', { name: /Total do período/ }).textContent,
    }).toEqual({
      headers: ['Mês', 'Mercado', 'Lazer', 'Outros', 'Total'],
      rows: 4,
      totalRow: 'Total do períodoR$ 1.500,00R$ 900,00R$ 600,00R$ 3.000,00',
    });
  });

  it('should_hide_the_chart_when_the_table_is_chosen', async () => {
    // Arrange
    stubReport();
    renderApp(`${REPORT_PATH}?visao=tabela`);
    // Act
    const card = await findChartCard();
    // Assert
    expect(card.querySelector('[data-slot="chart"]')).not.toBeInTheDocument();
  });

  it('should_mask_the_values_and_keep_the_percentages_when_hide_values_is_on', async () => {
    // Arrange
    stubReport();
    renderApp(REPORT_PATH);
    await findChartCard();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    const items = within(rankingCard()).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'MercadoR$ •••• 50%',
      'LazerR$ •••• 30%',
      'OutrosR$ •••• 20%',
    ]);
  });

  it('should_show_the_empty_state_with_change_period_when_there_is_no_spending', async () => {
    // Arrange
    stubReport(emptyReportBody());
    // Act
    renderApp(REPORT_PATH);
    // Assert
    expect(
      await screen.findByRole('heading', { name: 'Nenhum gasto neste período' }),
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

  it('should_link_to_the_category_report_from_the_navigation_between_reports', async () => {
    // Arrange
    stubReport();
    // Act
    renderApp(REPORT_PATH);
    await findChartCard();
    // Assert
    const navigation = screen.getByRole('navigation', { name: 'Relatórios' });
    expect(within(navigation).getByRole('link', { name: 'Por categoria' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
