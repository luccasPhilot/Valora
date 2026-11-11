import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { netWorthBody, point } from '../../../test/helpers/net-worth';
import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as InvestmentsPage } from './investments-page';
import { NetWorthCard } from './net-worth-card';
import { netWorthFrom } from './net-worth-view';

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <HideValuesButton />
        <NetWorthCard />
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

function stubNetWorth(overrides: Record<string, unknown> = {}) {
  return stubRoutes({ 'GET /api/v1/net-worth': () => Response.json(netWorthBody(overrides)) });
}

// O cartão aparece na hora, com o skeleton dentro: só devolve quando a consulta terminou.
async function findCard() {
  const card = await screen.findByRole('region', { name: 'Patrimônio' });
  await waitFor(() => {
    expect(within(card).queryByRole('status', { name: 'Carregando patrimônio' })).toBeNull();
  });
  return card;
}

afterEach(() => {
  window.localStorage.clear();
});

describe('NetWorthCard — valores', () => {
  it('should_show_the_net_worth_total_in_the_card', async () => {
    // Arrange
    stubNetWorth();
    // Act
    renderCard();
    // Assert
    expect(await findCard()).toHaveTextContent('R$ 15.500,00');
  });

  it('should_list_accounts_investments_and_open_bills_with_a_minus_sign_on_the_bills', async () => {
    // Arrange
    stubNetWorth();
    // Act
    renderCard();
    // Assert
    const rows = within(await findCard())
      .getAllByRole('listitem')
      .map((row) => row.textContent);
    expect(rows).toEqual([
      'ContasR$ 5.000,00',
      'InvestimentosR$ 12.000,00',
      'Faturas em aberto− R$ 1.500,00',
    ]);
  });

  it('should_show_the_month_change_with_text_when_there_is_one', async () => {
    // Arrange
    stubNetWorth();
    // Act
    renderCard();
    // Assert
    expect(await findCard()).toHaveTextContent('+ R$ 1.000,00 (+6,9%)no mês');
  });

  it('should_not_show_the_month_change_when_it_is_null', async () => {
    // Arrange
    stubNetWorth({ monthChange: null });
    // Act
    renderCard();
    // Assert
    expect(await findCard()).not.toHaveTextContent('no mês');
  });

  it('should_show_the_formula_note_and_what_is_left_out', async () => {
    // Arrange
    stubNetWorth();
    // Act
    renderCard();
    // Assert
    expect(await findCard()).toHaveTextContent(
      'Patrimônio = contas + investimentos − faturas em aberto. Gastos no cartão ainda fora de fatura fechada não entram.',
    );
  });

  it('should_paint_the_total_red_when_the_net_worth_is_negative', async () => {
    // Arrange
    stubNetWorth({
      current: {
        date: '2026-11-15',
        accountsCents: 10000,
        investmentsCents: 0,
        openBillsCents: 80000,
        netWorthCents: -70000,
      },
    });
    // Act
    renderCard();
    // Assert
    const total = (await findCard()).querySelector('p.type-display');
    expect(total).toHaveClass('text-destructive');
  });

  it('should_not_paint_the_total_red_when_the_net_worth_is_positive', async () => {
    // Arrange
    stubNetWorth();
    // Act
    renderCard();
    // Assert
    const total = (await findCard()).querySelector('p.type-display');
    expect(total).not.toHaveClass('text-destructive');
  });

  it('should_mask_the_total_and_the_parts_when_values_are_hidden', async () => {
    // Arrange
    stubNetWorth();
    renderCard();
    const card = await findCard();
    // Act
    await userEvent.click(screen.getByRole('button', { name: /ocultar/i }));
    // Assert
    expect(card).not.toHaveTextContent('R$ 15.500,00');
  });
});

describe('NetWorthCard — gráfico', () => {
  it('should_draw_the_chart_with_a_text_summary_when_there_are_three_points', async () => {
    // Arrange
    stubNetWorth();
    // Act
    renderCard();
    // Assert
    expect(await findCard()).toHaveTextContent(
      'Evolução do patrimônio: R$ 13.000,00 em setembro de 2026 e R$ 15.500,00 em novembro de 2026.',
    );
  });

  it('should_explain_since_when_there_is_history_and_skip_the_chart_when_there_is_one_point', async () => {
    // Arrange
    stubNetWorth({
      points: [point('2026-11', '2026-11-15', 1550000)],
      firstSnapshotDate: '2026-11-04',
    });
    // Act
    renderCard();
    // Assert
    const card = await findCard();
    expect({
      hasMessage: card.textContent?.includes('O histórico começa em 04/11.'),
      hasChart: card.querySelector('[data-slot="chart"]') !== null,
    }).toEqual({ hasMessage: true, hasChart: false });
  });

  it('should_not_offer_the_period_control_when_the_history_is_short', async () => {
    // Arrange
    stubNetWorth({ points: [], firstSnapshotDate: null });
    // Act
    renderCard();
    // Assert
    await findCard();
    expect(screen.queryByRole('radio', { name: '6 meses' })).not.toBeInTheDocument();
  });

  it('should_ask_for_the_last_six_months_when_the_user_picks_six_months', async () => {
    // Arrange
    const fetchMock = stubNetWorth();
    renderCard();
    await findCard();
    await screen.findByRole('radio', { name: '12 meses' });
    // Act
    await userEvent.click(screen.getByRole('radio', { name: '6 meses' }));
    // Assert
    await waitFor(() => {
      const requestedFrom = fetchMock.mock.calls.map(([url]) =>
        new URL(String(url), 'http://localhost').searchParams.get('from'),
      );
      expect(requestedFrom).toEqual([netWorthFrom('12'), netWorthFrom('6')]);
    });
  });

  it('should_keep_the_chart_on_screen_while_the_new_period_loads', async () => {
    // Arrange
    let isFirstRequest = true;
    stubRoutes({
      'GET /api/v1/net-worth': () => {
        if (isFirstRequest) {
          isFirstRequest = false;
          return Response.json(netWorthBody());
        }
        return new Promise<Response>(() => undefined);
      },
    });
    renderCard();
    await findCard();
    // Act
    await userEvent.click(await screen.findByRole('radio', { name: '6 meses' }));
    // Assert
    expect(await findCard()).toHaveTextContent('Evolução do patrimônio');
  });
});

describe('NetWorthCard — estados', () => {
  it('should_show_a_loading_skeleton_while_the_request_is_pending', () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/net-worth': () => new Promise<Response>(() => undefined) });
    // Act
    renderCard();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando patrimônio' })).toBeVisible();
  });

  it('should_show_retry_inside_the_card_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/net-worth': () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderCard();
    // Assert
    const card = await findCard();
    expect(await within(card).findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_keep_the_investments_list_on_screen_when_only_the_net_worth_fails', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/net-worth': () => errorResponse(500, 'INTERNAL_ERROR'),
      'GET /api/v1/investments': () =>
        Response.json({
          totals: { totalCents: 50000, positionsCount: 1, closedCount: 0 },
          groups: [
            {
              type: 'MUTUAL_FUND',
              totalCents: 50000,
              percent: 100,
              items: [
                {
                  id: '00000000-0000-4000-8000-000000000001',
                  name: 'Fundo Multi',
                  subtype: null,
                  balanceCents: 50000,
                  percent: 100,
                  institutionName: 'Nubank',
                },
              ],
            },
          ],
        }),
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <HideValuesProvider>
          <MemoryRouter>
            <InvestmentsPage />
          </MemoryRouter>
        </HideValuesProvider>
      </QueryClientProvider>,
    );
    // Assert
    const retry = await within(await findCard()).findByRole('button', { name: 'Tentar de novo' });
    const list = await screen.findByRole('region', { name: 'Fundos' });
    expect({ isRetryVisible: retry.isConnected, isListVisible: list.isConnected }).toEqual({
      isRetryVisible: true,
      isListVisible: true,
    });
  });
});
