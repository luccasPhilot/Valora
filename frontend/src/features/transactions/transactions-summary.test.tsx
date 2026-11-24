import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CARD_PAYMENT,
  pageResponse,
  renderPage,
  stubApi,
  summaryResponse,
  TRANSPORT,
} from './test-support';

const SUMMARY_ROUTE = 'GET /api/v1/transactions/summary';

function summaryLine(): HTMLElement {
  return screen.getByRole('region', { name: 'Resumo do filtro' });
}

function summaryQueries(fetchMock: ReturnType<typeof stubApi>): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), 'http://localhost'))
    .filter((url) => url.pathname === '/api/v1/transactions/summary')
    .map((url) => url.searchParams);
}

beforeEach(() => {
  // Só a data é falsa: os timers reais seguem rodando para o React Query.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('resumo do filtro', () => {
  it('should_show_count_income_in_positive_and_expense_in_normal_text_when_the_month_has_both', async () => {
    // Arrange
    stubApi({
      [SUMMARY_ROUTE]: () =>
        summaryResponse({ incomeCents: 850000, expenseCents: 421530, count: 38 }),
    });
    // Act
    renderPage();
    // Assert
    await screen.findByText('38 transações');
    const line = summaryLine();
    expect({
      income: within(line).getByText('+ R$ 8.500,00').parentElement?.className,
      expense: within(line).getByText('− R$ 4.215,30').parentElement?.className,
    }).toEqual({
      income: expect.stringContaining('text-positive'),
      expense: expect.stringContaining('text-foreground'),
    });
  });

  it('should_show_the_period_the_count_and_the_labeled_totals_when_the_month_has_both', async () => {
    // Arrange
    stubApi({
      [SUMMARY_ROUTE]: () =>
        summaryResponse({ incomeCents: 850000, expenseCents: 421530, count: 38 }),
    });
    // Act
    renderPage();
    // Assert
    await screen.findByText('38 transações');
    expect(summaryLine()).toHaveTextContent(
      'novembro de 2026 38 transações Receitas + R$ 8.500,00 Despesas − R$ 4.215,30',
    );
  });

  it('should_announce_the_summary_politely_without_moving_the_focus', async () => {
    // Arrange
    stubApi();
    // Act
    renderPage();
    // Assert
    await screen.findByText('4 transações');
    expect(summaryLine()).toHaveAttribute('aria-live', 'polite');
  });

  it('should_show_the_new_period_when_the_period_changes', async () => {
    // Arrange
    stubApi();
    renderPage();
    await screen.findByText('4 transações');
    // Act
    await userEvent.selectOptions(screen.getByLabelText('Período'), 'last-month');
    // Assert
    await waitFor(() => expect(summaryLine()).toHaveTextContent('outubro de 2026'));
  });

  it('should_ask_for_the_summary_with_the_same_filters_as_the_list', async () => {
    // Arrange
    const fetchMock = stubApi();
    // Act
    renderPage(`/transacoes?category=${TRANSPORT.id}&type=expense`);
    // Assert
    await screen.findByText('4 transações');
    expect(summaryQueries(fetchMock)[0]?.toString()).toBe(
      `from=2026-11-01&to=2026-11-30&categoryId=${TRANSPORT.id}&type=expense`,
    );
  });

  it('should_show_only_the_expense_and_no_income_when_the_category_has_no_income', async () => {
    // Arrange
    stubApi({
      [SUMMARY_ROUTE]: () => summaryResponse({ incomeCents: 0, expenseCents: 75000, count: 6 }),
    });
    // Act
    renderPage(`/transacoes?category=${TRANSPORT.id}`);
    // Assert
    await screen.findByText('6 transações');
    expect({
      expense: within(summaryLine()).queryByText('− R$ 750,00') !== null,
      income: within(summaryLine()).queryByText(/^\+ R\$/),
    }).toEqual({ expense: true, income: null });
  });

  it('should_use_the_singular_when_the_filter_has_one_transaction', async () => {
    // Arrange
    stubApi({
      [SUMMARY_ROUTE]: () => summaryResponse({ incomeCents: 0, expenseCents: 1000, count: 1 }),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('1 transação')).toBeInTheDocument();
  });

  it('should_show_only_the_count_and_the_transfer_note_when_the_type_is_transfer', async () => {
    // Arrange
    stubApi({
      [SUMMARY_ROUTE]: () => summaryResponse({ incomeCents: 0, expenseCents: 0, count: 2 }),
    });
    // Act
    renderPage(`/transacoes?type=transfer&category=${CARD_PAYMENT.id}`);
    // Assert
    await screen.findByText('2 transações');
    expect(summaryLine()).toHaveTextContent(
      '2 transações Transferências não entram nos totais de receita e despesa.',
    );
    expect(within(summaryLine()).queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it('should_hide_the_amounts_but_keep_the_count_when_values_are_hidden', async () => {
    // Arrange
    window.localStorage.setItem('valora.hide-values', 'true');
    stubApi({
      [SUMMARY_ROUTE]: () =>
        summaryResponse({ incomeCents: 850000, expenseCents: 421530, count: 38 }),
    });
    // Act
    renderPage();
    // Assert
    await screen.findByText('38 transações');
    expect(within(summaryLine()).getAllByText('R$ ••••')).toHaveLength(2);
    expect(summaryLine()).not.toHaveTextContent(/\d,\d\d/);
  });

  it('should_show_the_hidden_income_in_the_normal_color_when_values_are_hidden', async () => {
    // Arrange
    window.localStorage.setItem('valora.hide-values', 'true');
    stubApi({
      [SUMMARY_ROUTE]: () =>
        summaryResponse({ incomeCents: 850000, expenseCents: 421530, count: 38 }),
    });
    // Act
    renderPage();
    // Assert
    await screen.findByText('38 transações');
    expect(summaryLine().querySelector('.text-positive')).toBeNull();
  });

  it('should_keep_the_list_and_offer_retry_when_the_summary_fails', async () => {
    // Arrange
    let shouldFail = true;
    stubApi({
      [SUMMARY_ROUTE]: () =>
        shouldFail
          ? Response.json(
              { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
              { status: 500 },
            )
          : summaryResponse(),
    });
    renderPage();
    const retryButton = await screen.findByRole('button', { name: 'Tentar de novo' });
    shouldFail = false;
    // Act
    await userEvent.click(retryButton);
    // Assert
    expect(await screen.findByText('4 transações')).toBeInTheDocument();
    expect(screen.getByText('FARMÁCIA SÃO JOÃO')).toBeInTheDocument();
  });

  it('should_show_the_list_even_when_the_summary_has_failed', async () => {
    // Arrange
    stubApi({
      [SUMMARY_ROUTE]: () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
          { status: 500 },
        ),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('FARMÁCIA SÃO JOÃO')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should_not_show_the_summary_when_the_filter_finds_no_transactions', async () => {
    // Arrange
    stubApi({
      'GET /api/v1/transactions': () => pageResponse([]),
      [SUMMARY_ROUTE]: () => summaryResponse({ incomeCents: 0, expenseCents: 0, count: 0 }),
    });
    // Act
    renderPage();
    // Assert
    await screen.findByText('Nenhuma transação neste período');
    await waitFor(() => expect(screen.queryByText(/^\d+ transaç/)).not.toBeInTheDocument());
  });
});
