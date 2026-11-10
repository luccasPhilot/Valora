import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as CreditCardBillsPage } from './credit-card-bills-page';

const CARD_ID = '00000000-0000-4000-8000-000000000003';

function bill(overrides: Record<string, unknown> = {}) {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    dueDate: '2026-11-10',
    isEstimatedDueDate: false,
    closingDate: null,
    totalCents: 125050,
    paidCents: 0,
    status: 'open',
    ...overrides,
  };
}

function card(overrides: Record<string, unknown> = {}) {
  return {
    accountId: CARD_ID,
    accountName: 'Cartão Ultravioleta',
    lastDigits: '9012',
    institutionName: 'Nubank',
    currentBill: bill(),
    upcomingBills: [],
    futureInstallments: [],
    ...overrides,
  };
}

function stubBills(items: unknown[]) {
  stubRoutes({ 'GET /api/v1/credit-card-bills': () => Response.json({ items }) });
}

function renderPage(accountId: string = CARD_ID) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={[`/contas/${accountId}/faturas`]}>
          <HideValuesButton />
          <Routes>
            <Route path="/contas/:accountId/faturas" element={<CreditCardBillsPage />} />
          </Routes>
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

async function findCurrentBill() {
  return screen.findByRole('region', { name: 'Fatura atual' });
}

afterEach(() => {
  window.localStorage.clear();
});

describe('CreditCardBillsPage current bill', () => {
  it('should_show_the_amount_and_the_due_date_when_the_bill_is_open', async () => {
    // Arrange
    stubBills([card()]);
    // Act
    renderPage();
    // Assert
    const current = await findCurrentBill();
    expect(current).toHaveTextContent('R$ 1.250,50');
    expect(current).toHaveTextContent('Vence em 10/11/2026');
  });

  it('should_show_the_open_status_with_icon_and_text_when_the_bill_is_open', async () => {
    // Arrange
    stubBills([card()]);
    // Act
    renderPage();
    // Assert
    const status = within(await findCurrentBill()).getByText('Em aberto');
    expect(status.querySelector('svg')).not.toBeNull();
  });

  it('should_show_the_overdue_status_with_icon_and_text_when_the_bill_is_overdue', async () => {
    // Arrange
    stubBills([card({ currentBill: bill({ status: 'overdue', dueDate: '2026-10-10' }) })]);
    // Act
    renderPage();
    // Assert
    const current = await findCurrentBill();
    const status = within(current).getByText('Vencida');
    expect({
      hasIcon: status.querySelector('svg') !== null,
      dueText: within(current).getByText('Venceu em 10/10/2026').textContent,
    }).toEqual({ hasIcon: true, dueText: 'Venceu em 10/10/2026' });
  });

  it('should_show_the_paid_status_with_icon_and_text_when_the_bill_is_paid', async () => {
    // Arrange
    stubBills([card({ currentBill: bill({ status: 'paid', paidCents: 125050 }) })]);
    // Act
    renderPage();
    // Assert
    const status = within(await findCurrentBill()).getByText('Paga');
    expect(status.querySelector('svg')).not.toBeNull();
  });

  it('should_mark_the_due_date_as_estimated_when_the_bank_gave_a_stale_date', async () => {
    // Arrange
    stubBills([card({ currentBill: bill({ isEstimatedDueDate: true, id: null }) })]);
    // Act
    renderPage();
    // Assert
    const current = await findCurrentBill();
    expect(current).toHaveTextContent('Vencimento estimado: 10/11/2026');
  });

  it('should_say_the_bank_did_not_inform_the_due_date_when_it_is_missing', async () => {
    // Arrange
    stubBills([card({ currentBill: bill({ dueDate: null, id: null }) })]);
    // Act
    renderPage();
    // Assert
    expect(await findCurrentBill()).toHaveTextContent('Vencimento não informado pelo banco');
  });

  it('should_not_warn_about_the_due_date_when_the_bill_is_zero', async () => {
    // Arrange
    stubBills([card({ currentBill: bill({ totalCents: 0, dueDate: null, status: 'paid' }) })]);
    // Act
    renderPage();
    // Assert
    expect(await findCurrentBill()).not.toHaveTextContent('Vencimento');
  });

  it('should_show_how_much_was_already_paid_when_the_payment_is_partial', async () => {
    // Arrange
    stubBills([card({ currentBill: bill({ paidCents: 30000 }) })]);
    // Act
    renderPage();
    // Assert
    expect(await findCurrentBill()).toHaveTextContent('R$ 300,00 já pagos');
  });

  it('should_say_there_is_no_open_bill_when_the_card_has_no_current_bill', async () => {
    // Arrange
    stubBills([card({ currentBill: null })]);
    // Act
    renderPage();
    // Assert
    expect(await findCurrentBill()).toHaveTextContent('Nenhuma fatura em aberto neste cartão.');
  });
});

describe('CreditCardBillsPage upcoming bills and installments', () => {
  it('should_list_the_upcoming_bills_with_due_date_and_amount_when_the_bank_sent_them', async () => {
    // Arrange
    stubBills([
      card({
        upcomingBills: [
          bill({
            id: '10000000-0000-4000-8000-000000000002',
            dueDate: '2026-12-10',
            totalCents: 80000,
          }),
        ],
      }),
    ]);
    // Act
    renderPage();
    // Assert
    const upcoming = await screen.findByRole('region', { name: 'Próximas faturas' });
    expect(upcoming).toHaveTextContent('Vence em 10/12/2026');
    expect(upcoming).toHaveTextContent('R$ 800,00');
  });

  it('should_show_the_empty_state_when_the_card_has_no_installment_purchases', async () => {
    // Arrange
    stubBills([card({ futureInstallments: [] })]);
    // Act
    renderPage();
    // Assert
    const installments = await screen.findByRole('region', { name: 'Parcelas futuras' });
    expect(installments).toHaveTextContent('Nenhuma compra parcelada em andamento neste cartão.');
  });

  it('should_list_each_month_with_its_total_when_the_card_has_future_installments', async () => {
    // Arrange
    stubBills([
      card({
        futureInstallments: [
          { month: '2026-12-01', totalCents: 10000 },
          { month: '2027-01-01', totalCents: 5000 },
        ],
      }),
    ]);
    // Act
    renderPage();
    // Assert
    const installments = await screen.findByRole('region', { name: 'Parcelas futuras' });
    expect(within(installments).getAllByRole('listitem')).toHaveLength(2);
  });

  it('should_hide_the_amounts_when_the_hide_values_button_is_on', async () => {
    // Arrange
    stubBills([card()]);
    renderPage();
    const current = await findCurrentBill();
    // Act
    await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }));
    // Assert
    expect(current).toHaveTextContent('R$ ••••');
  });
});

describe('CreditCardBillsPage states', () => {
  it('should_show_the_skeleton_while_the_bills_are_loading', () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/credit-card-bills': () => new Promise<Response>(() => undefined) });
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('should_show_the_error_state_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/credit-card-bills': () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_show_the_error_state_when_the_response_is_out_of_format', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/credit-card-bills': () => Response.json({ items: [{ id: 1 }] }) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_tell_the_card_was_not_found_when_the_id_is_not_in_the_list', async () => {
    // Arrange
    stubBills([card()]);
    // Act
    renderPage('00000000-0000-4000-8000-0000000000ff');
    // Assert
    expect(await screen.findByText('Cartão não encontrado')).toBeVisible();
  });
});
