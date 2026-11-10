import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../../test/helpers/stub-routes';
import { ProjectionBlock } from './projection-block';

function dailyBalances(balances: readonly number[]) {
  return balances.map((balanceCents, index) => ({
    date: `2026-11-${String(index + 5).padStart(2, '0')}`,
    balanceCents,
  }));
}

function projection(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-11-05',
    startBalanceCents: 500000,
    plannedIncomeCents: 300000,
    plannedExpenseCents: 120000,
    billsDueCents: 200000,
    projectedBalanceCents: 480000,
    lowestBalanceCents: 380000,
    lowestBalanceDate: '2026-11-07',
    daily: dailyBalances([500000, 500000, 380000, 380000, 680000, 680000]),
    events: [
      {
        type: 'planned_expense',
        date: '2026-11-07',
        description: 'Aluguel',
        amountCents: -120000,
        isOverdue: false,
        isEstimatedDate: false,
      },
    ],
    warnings: [],
    ...overrides,
  };
}

const NEGATIVE_PROJECTION = projection({
  startBalanceCents: 100000,
  projectedBalanceCents: 350000,
  lowestBalanceCents: -50000,
  lowestBalanceDate: '2026-11-10',
});

function renderBlock() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <HideValuesButton />
        <ProjectionBlock />
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

function stubProjection(body: unknown) {
  stubRoutes({ 'GET /api/v1/projection': () => Response.json(body) });
}

afterEach(() => {
  window.localStorage.clear();
});

describe('ProjectionBlock', () => {
  it('should_show_the_projected_balance_and_its_composition_when_the_data_loads', async () => {
    // Arrange
    stubProjection(projection());
    // Act
    renderBlock();
    // Assert
    const caption = await screen.findByText('Saldo projetado em 10/11');
    expect(caption.previousElementSibling).toHaveTextContent('R$ 4.800,00');
  });

  it('should_show_the_negative_warning_in_the_destructive_color_when_the_lowest_balance_is_negative', async () => {
    // Arrange
    stubProjection(NEGATIVE_PROJECTION);
    // Act
    renderBlock();
    // Assert
    const warning = await screen.findByText('Saldo negativo em 10/11');
    expect(warning.closest('p')).toHaveClass('text-destructive');
  });

  it('should_show_an_icon_next_to_the_negative_warning_text', async () => {
    // Arrange
    stubProjection(NEGATIVE_PROJECTION);
    // Act
    renderBlock();
    // Assert
    const warning = await screen.findByText('Saldo negativo em 10/11');
    expect(warning.closest('p')?.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('should_not_show_a_negative_warning_when_every_day_stays_positive', async () => {
    // Arrange
    stubProjection(projection());
    // Act
    renderBlock();
    // Assert
    await screen.findByText('Saldo projetado em 10/11');
    expect(screen.queryByText(/Saldo negativo/)).not.toBeInTheDocument();
  });

  it('should_not_use_red_anywhere_when_every_day_stays_positive', async () => {
    // Arrange
    stubProjection(projection());
    // Act
    const { container } = renderBlock();
    // Assert
    await screen.findByText('Saldo projetado em 10/11');
    expect(container.querySelector('.text-destructive')).toBeNull();
  });

  it('should_mark_the_event_as_overdue_with_text_when_the_date_has_passed', async () => {
    // Arrange
    const overdue = {
      type: 'planned_expense',
      date: '2026-11-05',
      description: 'Seguro do carro',
      amountCents: -90000,
      isOverdue: true,
      isEstimatedDate: false,
    };
    stubProjection(projection({ events: [overdue] }));
    // Act
    renderBlock();
    // Assert
    expect(await screen.findByText('Atrasada')).toBeInTheDocument();
  });

  it('should_mark_the_bill_as_estimated_when_the_due_date_is_not_from_the_bank', async () => {
    // Arrange
    const estimatedBill = {
      type: 'bill',
      date: '2026-11-10',
      description: 'Fatura Cartão Visa',
      amountCents: -85973,
      isOverdue: false,
      isEstimatedDate: true,
    };
    stubProjection(projection({ events: [estimatedBill] }));
    // Act
    renderBlock();
    // Assert
    expect(await screen.findByText(/Vencimento estimado/)).toBeInTheDocument();
  });

  it('should_show_the_data_warnings_when_a_card_has_no_due_date', async () => {
    // Arrange
    const warning = 'Fatura do cartão Cartão Visa sem vencimento informado';
    stubProjection(projection({ warnings: [warning] }));
    // Act
    renderBlock();
    // Assert
    expect(await screen.findByText(warning)).toBeInTheDocument();
  });

  it('should_say_that_day_to_day_spending_is_not_included', async () => {
    // Arrange
    stubProjection(projection());
    // Act
    renderBlock();
    // Assert
    expect(await screen.findByText(/Gastos do dia a dia não entram/)).toBeInTheDocument();
  });

  it('should_show_an_empty_message_when_nothing_is_planned', async () => {
    // Arrange
    stubProjection(projection({ events: [] }));
    // Act
    renderBlock();
    // Assert
    expect(await screen.findByText(/Nada previsto nem fatura a vencer/)).toBeInTheDocument();
  });

  it('should_show_the_error_state_with_a_retry_button_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/projection': () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderBlock();
    // Assert
    expect(await screen.findByText('Não foi possível carregar a projeção.')).toBeInTheDocument();
  });

  it('should_hide_the_values_when_hide_values_is_on', async () => {
    // Arrange
    window.localStorage.setItem('valora.hide-values', 'true');
    stubProjection(projection());
    // Act
    renderBlock();
    // Assert
    await screen.findByText('Saldo projetado em 10/11');
    expect(screen.queryByText('R$ 4.800,00')).not.toBeInTheDocument();
  });
});
