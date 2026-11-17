import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HideValuesProvider } from '@/components/hide-values-provider';
import type { CategoryInsights } from '@/lib/api/category-insights';
import { todayInSaoPaulo } from '@/lib/dates';

import { stubViewport } from '../../../../test/helpers/match-media';
import { monthOf, shiftMonth } from '../../budgets/budget-months';
import { Component as AnalysisPage } from './analysis-page';

const CURRENT_MONTH = monthOf(todayInSaoPaulo());
const PREVIOUS_MONTH = shiftMonth(CURRENT_MONTH, -1);
const MARKET_ID = '11111111-1111-4111-8111-111111111111';
const LEISURE_ID = '22222222-2222-4222-8222-222222222222';
const MONTHS = [shiftMonth(CURRENT_MONTH, -2), PREVIOUS_MONTH, CURRENT_MONTH];

const BASE_CATEGORY = {
  previousSpentCents: 0,
  averageCents: 85000,
  peak: { month: PREVIOUS_MONTH, cents: 90000 },
  monthlyCents: [80000, 90000, 100000],
};

function buildInsights(overrides: Partial<CategoryInsights> = {}): CategoryInsights {
  return {
    month: CURRENT_MONTH,
    previousMonth: PREVIOUS_MONTH,
    isInProgress: true,
    totals: {
      spentCents: 135000,
      previousSpentCents: 112500,
      variationPercent: 20,
      comparedThroughDay: 17,
    },
    months: MONTHS,
    categories: [
      {
        ...BASE_CATEGORY,
        kind: 'category',
        categoryId: MARKET_ID,
        name: 'Mercado',
        icon: 'shopping-cart',
        spentCents: 100000,
        percent: 74.1,
        previousSpentCents: 100000,
        variationPercent: 0,
        budget: { limitCents: 80000, percent: 125, status: 'exceeded' },
      },
      {
        ...BASE_CATEGORY,
        kind: 'category',
        categoryId: LEISURE_ID,
        name: 'Lazer',
        icon: 'film',
        spentCents: 35000,
        percent: 25.9,
        previousSpentCents: 0,
        variationPercent: null,
        budget: null,
      },
    ],
    changes: {
      increases: [
        {
          kind: 'category',
          categoryId: LEISURE_ID,
          name: 'Lazer',
          icon: 'film',
          differenceCents: 35000,
        },
      ],
      decreases: [],
    },
    recurring: {
      items: [
        {
          description: 'Streaming Exemplo',
          amountCents: 3990,
          chargesCount: 3,
          lastChargeDate: `${PREVIOUS_MONTH}-05`,
        },
      ],
      monthlyTotalCents: 3990,
      yearlyTotalCents: 47880,
    },
    attention: [
      {
        type: 'budget_exceeded',
        categoryId: MARKET_ID,
        name: 'Mercado',
        limitCents: 80000,
        spentCents: 100000,
      },
    ],
    ...overrides,
  };
}

function stubInsights(body: CategoryInsights | 'error') {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    if (!String(input).startsWith('/api/v1/category-insights')) {
      return Promise.reject(new Error(`Teste: rota sem resposta ${String(input)}`));
    }
    if (body === 'error') {
      const error = { error: { code: 'INTERNAL_ERROR', message: 'falha', details: [] } };
      return Promise.resolve(Response.json(error, { status: 500 }));
    }
    return Promise.resolve(Response.json(body));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry = '/categorias') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <HideValuesProvider>
          <AnalysisPage />
          <LocationProbe />
        </HideValuesProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  stubViewport({ viewportWidth: 1440 });
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tela Categorias (análise)', () => {
  it('should_show_the_sections_in_order_hero_attention_spending_changes_recurring', async () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    const titles = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-labelledby'))
      .map((id) => (id ? document.getElementById(id)?.textContent : null));
    expect(titles).toEqual([
      'Gasto no mês',
      'Pede atenção',
      'Para onde foi o dinheiro',
      'O que mudou',
      'Cobranças recorrentes',
    ]);
  });

  it('should_list_every_category_without_an_others_group', async () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    const list = await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    expect({
      mercado: within(list).getByText('Mercado'),
      lazer: within(list).getByText('Lazer'),
      others: within(list).queryByText('Outros'),
    }).toMatchObject({ others: null });
  });

  it('should_show_new_when_the_category_had_no_spending_before', async () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    const list = await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    expect(within(list).getByText('Novo')).toBeVisible();
  });

  it('should_describe_the_variation_in_the_hero_with_the_compared_stretch', async () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    const hero = await screen.findByRole('region', { name: 'Gasto no mês' });
    expect(hero).toHaveTextContent(/20% a mais, até o dia 17, contra o mesmo trecho de/);
  });

  it('should_say_there_is_nothing_to_compare_when_the_previous_period_had_no_spending', async () => {
    // Arrange
    const insights = buildInsights();
    stubInsights({
      ...insights,
      totals: { ...insights.totals, previousSpentCents: 0, variationPercent: null },
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText(/Não há gasto no período anterior para comparar/)).toBeVisible();
  });

  it('should_omit_the_changes_card_when_the_previous_period_had_no_spending', async () => {
    // Arrange
    const insights = buildInsights();
    stubInsights({
      ...insights,
      totals: { ...insights.totals, previousSpentCents: 0, variationPercent: null },
    });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Gasto no mês' });
    expect(screen.queryByRole('region', { name: 'O que mudou' })).toBeNull();
  });

  it('should_use_the_critical_color_only_on_the_exceeded_budget_status', async () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    const list = await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    const colored = list.querySelectorAll('.text-status-critical, .text-destructive');
    expect(colored).toHaveLength(1);
  });

  it('should_hide_the_attention_section_when_there_is_nothing_to_decide', async () => {
    // Arrange
    stubInsights(buildInsights({ attention: [] }));
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    expect(screen.queryByRole('region', { name: 'Pede atenção' })).toBeNull();
  });

  it('should_hide_the_trend_line_when_there_is_only_one_month_of_history', async () => {
    // Arrange
    const insights = buildInsights();
    stubInsights({
      ...insights,
      months: [CURRENT_MONTH],
      categories: insights.categories.map((category) => ({
        ...category,
        monthlyCents: [category.spentCents],
        averageCents: null,
      })),
    });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    expect(screen.queryAllByRole('img', { name: /Gasto em .* por mês/ })).toHaveLength(0);
  });

  it('should_show_the_recurring_totals_per_month_and_per_year', async () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    const card = await screen.findByRole('region', { name: 'Cobranças recorrentes' });
    expect(card).toHaveTextContent(/R\$ 39,90 por mês.*R\$ 478,80 por ano/);
  });

  it('should_say_there_are_no_recurring_charges_when_the_list_is_empty', async () => {
    // Arrange
    stubInsights(
      buildInsights({ recurring: { items: [], monthlyTotalCents: 0, yearlyTotalCents: 0 } }),
    );
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Nenhuma cobrança recorrente detectada.')).toBeVisible();
  });

  it('should_open_the_category_detail_and_close_it_with_escape', async () => {
    // Arrange
    stubInsights(buildInsights());
    renderPage();
    const list = await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    // Act
    await userEvent.click(within(list).getByRole('button', { name: /Mercado/ }));
    const dialog = await screen.findByRole('dialog');
    const hasLink = within(dialog).getByRole('link', { name: 'Ver transações' });
    await userEvent.keyboard('{Escape}');
    // Assert
    expect({ hasLink: hasLink.getAttribute('href')?.includes(`category=${MARKET_ID}`) }).toEqual({
      hasLink: true,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('should_open_the_detail_of_the_category_in_an_attention_point', async () => {
    // Arrange
    stubInsights(buildInsights());
    renderPage();
    const attention = await screen.findByRole('region', { name: 'Pede atenção' });
    // Act
    await userEvent.click(
      within(attention).getByRole('button', { name: /Mercado passou do orçamento/ }),
    );
    // Assert
    expect(await screen.findByRole('dialog')).toBeVisible();
  });

  it('should_keep_the_month_selector_visible_when_the_month_has_no_spending', async () => {
    // Arrange
    stubInsights(
      buildInsights({
        categories: [],
        attention: [],
        totals: {
          spentCents: 0,
          previousSpentCents: 0,
          variationPercent: null,
          comparedThroughDay: null,
        },
      }),
    );
    // Act
    renderPage();
    // Assert
    expect({
      empty: await screen.findByText('Nenhum gasto neste mês'),
      selector: screen.getByRole('group', { name: 'Mês da análise' }),
    }).toBeDefined();
  });

  it('should_show_an_error_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubInsights('error');
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_show_a_skeleton_while_loading', () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando análise' })).toBeVisible();
  });

  it('should_mask_the_values_and_keep_the_percentages_when_values_are_hidden', async () => {
    // Arrange
    window.localStorage.setItem('valora.hide-values', 'true');
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    const list = await screen.findByRole('region', { name: 'Para onde foi o dinheiro' });
    expect({
      hasMaskedValue: list.textContent?.includes('R$ ••••'),
      hasRealValue: /R\$ \d/.test(list.textContent ?? ''),
      hasPercent: list.textContent?.includes('74,1%'),
    }).toEqual({ hasMaskedValue: true, hasRealValue: false, hasPercent: true });
  });

  it('should_write_the_chosen_month_in_the_url', async () => {
    // Arrange
    stubInsights(buildInsights());
    renderPage();
    await screen.findByRole('region', { name: 'Gasto no mês' });
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    // Assert
    expect(screen.getByTestId('location')).toHaveTextContent(`?month=${PREVIOUS_MONTH}`);
  });

  it('should_fall_back_to_the_current_month_when_the_url_month_is_in_the_future', async () => {
    // Arrange
    const fetchMock = stubInsights(buildInsights());
    // Act
    renderPage('/categorias?month=2099-01');
    // Assert
    await screen.findByRole('region', { name: 'Gasto no mês' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `/api/v1/category-insights?month=${CURRENT_MONTH}`,
    );
  });

  it('should_disable_next_month_when_the_current_month_is_selected', async () => {
    // Arrange
    stubInsights(buildInsights());
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Gasto no mês' });
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
  });
});
