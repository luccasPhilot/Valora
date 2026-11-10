import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as InvestmentsPage } from './investments-page';

function item(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    name: `Investimento ${String(id)}`,
    subtype: 'CDB',
    balanceCents: 100000,
    percent: 50,
    institutionName: 'Nubank',
    ...overrides,
  };
}

const RENDA_FIXA = {
  type: 'FIXED_INCOME',
  totalCents: 150000,
  percent: 75,
  items: [
    item(1, { name: 'CDB Liquidez', balanceCents: 100000, percent: 50 }),
    item(2, { name: 'Tesouro Selic', subtype: 'TREASURY', balanceCents: 50000, percent: 25 }),
  ],
};
const FUNDOS = {
  type: 'MUTUAL_FUND',
  totalCents: 50000,
  percent: 25,
  items: [item(3, { name: 'Fundo Multi', subtype: null, balanceCents: 50000, percent: 25 })],
};

function overview(groups: unknown[], totals: Record<string, number> = {}) {
  return () =>
    Response.json({
      totals: { totalCents: 200000, positionsCount: 3, closedCount: 0, ...totals },
      groups,
    });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter>
          <HideValuesButton />
          <InvestmentsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe('InvestmentsPage', () => {
  it('should_show_the_total_and_the_position_count_when_there_are_investments', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA, FUNDOS]) });
    // Act
    renderPage();
    // Assert
    const summary = await screen.findByRole('region', { name: 'Investimentos' });
    expect(summary).toHaveTextContent('R$ 2.000,00');
    expect(summary).toHaveTextContent('3 posições em 1 instituição');
  });

  it('should_list_the_positions_of_each_type_with_subtype_and_institution', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA, FUNDOS]) });
    // Act
    renderPage();
    // Assert
    const fixedIncome = await screen.findByRole('region', { name: 'Renda fixa' });
    expect(within(fixedIncome).getByText('Tesouro Direto · Nubank')).toBeVisible();
    expect(within(fixedIncome).getByText('R$ 500,00')).toBeVisible();
  });

  it('should_show_only_the_institution_when_the_position_has_no_subtype', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([FUNDOS]) });
    // Act
    renderPage();
    // Assert
    const funds = await screen.findByRole('region', { name: 'Fundos' });
    expect(within(funds).getByText('Nubank')).toBeVisible();
  });

  it('should_show_groups_in_the_order_the_api_sent_them', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA, FUNDOS]) });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Renda fixa' });
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(['Renda fixa', 'Fundos']);
  });

  it('should_label_an_unknown_type_as_outros_when_pluggy_sends_a_new_type', async () => {
    // Arrange
    const unknown = { ...FUNDOS, type: 'NEW_TYPE' };
    stubRoutes({ 'GET /api/v1/investments': overview([unknown]) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('region', { name: 'Outros' })).toBeVisible();
  });

  it('should_mention_closed_positions_when_some_are_zeroed', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/investments': overview([RENDA_FIXA], { closedCount: 3 }),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('3 posições zeradas não aparecem na lista')).toBeVisible();
  });

  it('should_not_mention_closed_positions_when_none_are_zeroed', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA]) });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Renda fixa' });
    expect(screen.queryByText(/zerada/)).not.toBeInTheDocument();
  });

  it('should_mask_the_values_but_keep_the_percentages_when_values_are_hidden', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA, FUNDOS]) });
    renderPage();
    const fixedIncome = await screen.findByRole('region', { name: 'Renda fixa' });
    // Act
    await userEvent.click(screen.getByRole('button', { name: /ocultar/i }));
    // Assert
    expect(within(fixedIncome).queryByText('R$ 1.000,00')).not.toBeInTheDocument();
    expect(within(fixedIncome).getByText('50%')).toBeVisible();
  });
});

describe('InvestmentsPage hierarchy', () => {
  it('should_describe_the_composition_bar_in_text_when_the_chart_is_shown', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA, FUNDOS]) });
    // Act
    renderPage();
    // Assert
    const bar = await screen.findByRole('img', { name: /Composição por tipo/ });
    expect(bar).toHaveAccessibleName('Composição por tipo: Renda fixa 75%, Fundos 25%');
  });

  it('should_list_the_legend_with_every_type_and_its_share_in_the_hero', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA, FUNDOS]) });
    // Act
    renderPage();
    // Assert
    const hero = await screen.findByRole('region', { name: 'Investimentos' });
    expect(
      within(hero)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Renda fixaR$ 1.500,00 75%', 'FundosR$ 500,00 25%']);
  });

  it('should_rank_the_largest_positions_across_all_types', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA, FUNDOS]) });
    // Act
    renderPage();
    // Assert
    const ranking = await screen.findByRole('region', { name: 'Maiores posições' });
    const names = within(ranking)
      .getAllByRole('listitem')
      .map((row) => row.textContent ?? '');
    expect(names[0]).toContain('CDB Liquidez');
    expect(names[1]).toMatch(/Tesouro Selic|Fundo Multi/);
  });

  it('should_collapse_long_groups_and_expand_them_on_demand', async () => {
    // Arrange
    const many = {
      ...RENDA_FIXA,
      items: Array.from({ length: 8 }, (_, index) =>
        item(index + 10, { name: `Título ${String(index + 1)}` }),
      ),
    };
    stubRoutes({ 'GET /api/v1/investments': overview([many]) });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Renda fixa' });
    const rowsBefore = within(card).getAllByRole('listitem').length;
    // Act
    await userEvent.click(within(card).getByRole('button', { name: 'Mostrar mais 3' }));
    // Assert
    expect({ before: rowsBefore, after: within(card).getAllByRole('listitem').length }).toEqual({
      before: 5,
      after: 8,
    });
  });

  it('should_not_offer_show_more_when_the_group_has_few_positions', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([RENDA_FIXA]) });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Renda fixa' });
    expect(screen.queryByRole('button', { name: /Mostrar/ })).not.toBeInTheDocument();
  });
});

describe('InvestmentsPage states', () => {
  it('should_show_the_empty_state_with_a_link_to_accounts_when_there_are_no_positions', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': overview([], { totalCents: 0, positionsCount: 0 }) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Nenhum investimento encontrado')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver contas' })).toHaveAttribute('href', '/contas');
  });

  it('should_show_the_loading_skeleton_while_the_request_is_pending', () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': () => new Promise<Response>(() => undefined) });
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeVisible();
  });

  it('should_show_the_error_state_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/investments': () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });
});
