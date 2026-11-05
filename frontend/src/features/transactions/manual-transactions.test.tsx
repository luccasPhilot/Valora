import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubViewport } from '../../../test/helpers/match-media';
import {
  ACCOUNT,
  accountsResponse,
  CASH_ACCOUNT,
  DUPLICATE_COUNT_ROUTE,
  fixture,
  GROCERIES,
  type Handler,
  listQueries,
  pageResponse,
  PHARMACY,
  renderApp,
  SALARY,
  stubApi,
} from './test-support';

const MANUAL_ID_NUMBER = 20;
const BANK_DUPLICATE_ID_NUMBER = 21;
const CREATED_ID = '00000000-0000-4000-8000-000000000099';

const FEIRA = fixture(MANUAL_ID_NUMBER, {
  description: 'Feira',
  amountCents: -4500,
  source: 'manual',
  category: { id: GROCERIES.id, name: 'Mercado', icon: 'shopping-cart', kind: 'expense' },
  categorySource: 'user',
  account: { id: CASH_ACCOUNT.id, name: CASH_ACCOUNT.name, type: CASH_ACCOUNT.type },
});
const FEIRA_ID = String(FEIRA.id);
const BANK_FEIRA = fixture(BANK_DUPLICATE_ID_NUMBER, {
  description: 'PIX FEIRA LIVRE',
  amountCents: -4500,
  possibleDuplicateOfId: FEIRA_ID,
});

beforeEach(() => {
  // Só a data é falsa: os timers reais seguem rodando para o React Query e para o Radix.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
  stubViewport({ viewportWidth: 1440 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function jsonBodies(fetchMock: ReturnType<typeof stubApi>, method: string): unknown[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === method)
    .map(([, init]) => JSON.parse(String(init?.body ?? 'null')));
}

async function openForm() {
  await userEvent.click(await screen.findByRole('button', { name: 'Nova transação' }));
  return screen.findByRole('dialog', { name: 'Nova transação' });
}

async function fillValidExpense(form: HTMLElement) {
  await userEvent.type(within(form).getByLabelText('Valor'), '1250');
  await userEvent.type(within(form).getByLabelText('Descrição'), 'Pastel');
  await userEvent.click(within(form).getByRole('radio', { name: /Mercado/ }));
}

describe('botão "Nova transação"', () => {
  it('should_show_the_button_in_the_header_when_on_the_transactions_screen', async () => {
    // Arrange
    stubApi();
    // Act
    renderApp('/transacoes');
    // Assert
    expect(await screen.findByRole('button', { name: 'Nova transação' })).toBeInTheDocument();
  });

  it('should_not_show_the_button_when_on_another_screen', async () => {
    // Arrange
    stubApi();
    // Act
    renderApp('/orcamentos');
    await screen.findByRole('link', { name: 'Contas' });
    // Assert
    expect(screen.queryByRole('button', { name: 'Nova transação' })).not.toBeInTheDocument();
  });

  it('should_keep_the_button_name_when_the_viewport_is_320px_wide', async () => {
    // Arrange
    stubViewport({ viewportWidth: 320 });
    stubApi();
    // Act
    renderApp('/transacoes');
    // Assert
    expect(await screen.findByRole('button', { name: 'Nova transação' })).toHaveClass(
      'max-sm:w-11',
    );
  });
});

describe('formulário de nova transação', () => {
  it('should_open_with_cash_and_today_already_chosen_when_the_button_is_clicked', async () => {
    // Arrange
    stubApi();
    renderApp();
    // Act
    const form = await openForm();
    // Assert
    expect({
      account: within(form).getByLabelText('Conta'),
      today: within(form).getByRole('radio', { name: 'Hoje' }),
    }).toEqual({
      account: expect.objectContaining({ value: CASH_ACCOUNT.id }),
      today: expect.objectContaining({ ariaChecked: 'true' }),
    });
  });

  it('should_put_the_focus_on_the_amount_when_the_form_opens', async () => {
    // Arrange
    stubApi();
    renderApp();
    // Act
    const form = await openForm();
    // Assert
    await waitFor(() => expect(within(form).getByLabelText('Valor')).toHaveFocus());
  });

  it('should_list_the_connected_accounts_after_cash_when_choosing_the_account', async () => {
    // Arrange
    stubApi();
    renderApp();
    // Act
    const form = await openForm();
    // Assert
    const options = within(within(form).getByLabelText('Conta')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Dinheiro',
      'Nubank · Conta corrente',
    ]);
  });

  it('should_show_only_expense_categories_when_the_type_is_expense', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    // Act
    const names = within(form)
      .getAllByRole('radio')
      .map((radio) => radio.textContent);
    // Assert
    expect(names).toEqual(expect.arrayContaining(['Mercado', 'Transporte']));
    expect(names).not.toContain('Salário');
    expect(names).not.toContain('Pagamento de fatura');
  });

  it('should_show_only_income_categories_when_the_type_changes_to_income', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    // Act
    await userEvent.click(within(form).getByRole('radio', { name: 'Receita' }));
    // Assert
    const group = within(form).getByRole('radiogroup', { name: 'Categoria' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.textContent),
    ).toEqual(['Salário']);
  });

  it('should_clear_the_chosen_category_when_the_type_changes_to_another_kind', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    await userEvent.click(within(form).getByRole('radio', { name: /Mercado/ }));
    // Act
    await userEvent.click(within(form).getByRole('radio', { name: 'Receita' }));
    await userEvent.click(within(form).getByRole('radio', { name: 'Despesa' }));
    // Assert
    expect(within(form).getByRole('radio', { name: /Mercado/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('should_filter_the_categories_by_name_without_accents_when_searching', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    // Act
    await userEvent.type(within(form).getByLabelText('Buscar categoria'), 'transp');
    // Assert
    const group = within(form).getByRole('radiogroup', { name: 'Categoria' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.textContent),
    ).toEqual(['Transporte']);
  });
});

describe('validação do formulário', () => {
  it('should_show_choose_a_category_under_the_field_and_send_nothing_when_saving_without_category', async () => {
    // Arrange
    const fetchMock = stubApi();
    renderApp();
    const form = await openForm();
    await userEvent.type(within(form).getByLabelText('Valor'), '1250');
    await userEvent.type(within(form).getByLabelText('Descrição'), 'Pastel');
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await within(form).findByText('Escolha uma categoria')).toBeInTheDocument();
    expect(jsonBodies(fetchMock, 'POST')).toEqual([]);
  });

  it('should_show_the_amount_and_description_errors_when_saving_an_empty_form', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect([
      await within(form).findByText('Informe o valor'),
      within(form).getByText('Informe uma descrição'),
    ]).toHaveLength(2);
  });

  it('should_move_the_focus_to_the_first_field_with_an_error_when_saving_fails_validation', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    await waitFor(() => expect(within(form).getByLabelText('Valor')).toHaveFocus());
  });

  it('should_clear_the_error_of_a_field_when_it_is_edited', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    await within(form).findByText('Informe o valor');
    // Act
    await userEvent.type(within(form).getByLabelText('Valor'), '5');
    // Assert
    expect(within(form).queryByText('Informe o valor')).not.toBeInTheDocument();
  });

  it('should_show_the_date_error_when_a_custom_date_is_left_empty', async () => {
    // Arrange
    stubApi();
    renderApp();
    const form = await openForm();
    await fillValidExpense(form);
    await userEvent.click(within(form).getByRole('radio', { name: 'Escolher data' }));
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await within(form).findByText('Informe a data')).toBeInTheDocument();
  });
});

describe('salvar', () => {
  it('should_send_the_amount_in_cents_with_the_type_and_cash_account_and_confirm_when_saved', async () => {
    // Arrange
    const created = fixture(99, { id: CREATED_ID, source: 'manual', description: 'Pastel' });
    const fetchMock = stubApi({
      'POST /api/v1/transactions': () => Response.json(created, { status: 201 }),
    });
    renderApp();
    const form = await openForm();
    await fillValidExpense(form);
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await screen.findByText('Despesa registrada')).toBeInTheDocument();
    expect(jsonBodies(fetchMock, 'POST')).toEqual([
      {
        type: 'expense',
        amountCents: 1250,
        description: 'Pastel',
        date: '2026-11-04',
        categoryId: GROCERIES.id,
        accountId: CASH_ACCOUNT.id,
      },
    ]);
  });

  it('should_close_the_form_and_reload_the_list_when_saved', async () => {
    // Arrange
    const fetchMock = stubApi({
      'POST /api/v1/transactions': () => Response.json(fixture(99, {}), { status: 201 }),
    });
    renderApp();
    const form = await openForm();
    await fillValidExpense(form);
    const listRequestsBefore = listQueries(fetchMock).length;
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(listQueries(fetchMock).length).toBeGreaterThan(listRequestsBefore));
  });

  it('should_send_yesterday_when_the_yesterday_shortcut_is_chosen', async () => {
    // Arrange
    const fetchMock = stubApi({
      'POST /api/v1/transactions': () => Response.json(fixture(99, {}), { status: 201 }),
    });
    renderApp();
    const form = await openForm();
    await fillValidExpense(form);
    await userEvent.click(within(form).getByRole('radio', { name: 'Ontem' }));
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    await screen.findByText('Despesa registrada');
    expect(jsonBodies(fetchMock, 'POST')).toMatchObject([{ date: '2026-11-03' }]);
  });

  it('should_send_an_income_with_a_positive_flow_when_the_type_is_income', async () => {
    // Arrange
    const fetchMock = stubApi({
      'POST /api/v1/transactions': () => Response.json(fixture(99, {}), { status: 201 }),
    });
    renderApp();
    const form = await openForm();
    await userEvent.click(within(form).getByRole('radio', { name: 'Receita' }));
    await userEvent.type(within(form).getByLabelText('Valor'), '50000');
    await userEvent.type(within(form).getByLabelText('Descrição'), 'Freela');
    await userEvent.click(within(form).getByRole('radio', { name: /Salário/ }));
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await screen.findByText('Receita registrada')).toBeInTheDocument();
    expect(jsonBodies(fetchMock, 'POST')).toMatchObject([
      { type: 'income', amountCents: 50000, categoryId: SALARY.id },
    ]);
  });

  it('should_show_the_api_field_error_under_the_field_and_keep_the_form_open_when_the_api_rejects', async () => {
    // Arrange
    stubApi({
      'POST /api/v1/transactions': () =>
        Response.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'x',
              details: [{ field: 'categoryId', message: 'A categoria está arquivada' }],
            },
          },
          { status: 400 },
        ),
    });
    renderApp();
    const form = await openForm();
    await fillValidExpense(form);
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await within(form).findByText('A categoria está arquivada')).toBeInTheDocument();
  });

  it('should_warn_and_keep_the_form_open_when_the_server_fails', async () => {
    // Arrange
    stubApi({
      'POST /api/v1/transactions': () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
          { status: 500 },
        ),
    });
    renderApp();
    const form = await openForm();
    await fillValidExpense(form);
    // Act
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente de novo.',
    );
  });
});

describe('formulário no celular', () => {
  it('should_open_as_a_bottom_sheet_with_every_field_and_the_save_button_when_the_viewport_is_320px', async () => {
    // Arrange
    stubViewport({ viewportWidth: 320 });
    stubApi();
    renderApp();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Nova transação' }));
    // Assert
    const panel = await screen.findByRole('dialog', { name: 'Nova transação' });
    expect(panel).toHaveAttribute('data-slot', 'sheet-content');
    expect(
      ['Valor', 'Descrição', 'Conta', 'Buscar categoria'].map((label) =>
        within(panel).queryByLabelText(label),
      ),
    ).not.toContain(null);
    expect(within(panel).getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('should_keep_the_save_button_above_the_safe_area_when_on_a_phone', async () => {
    // Arrange
    stubViewport({ viewportWidth: 390 });
    stubApi();
    renderApp();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Nova transação' }));
    // Assert
    const panel = await screen.findByRole('dialog', { name: 'Nova transação' });
    expect(
      within(panel).getByRole('button', { name: 'Salvar' }).parentElement?.className,
    ).toContain('env(safe-area-inset-bottom)');
  });
});

describe('transações manuais na lista', () => {
  const manualRows = () => pageResponse([FEIRA, BANK_FEIRA, PHARMACY], 1, 3);

  it('should_show_the_manual_badge_only_on_manual_transactions', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/transactions': manualRows });
    // Act
    renderApp();
    await screen.findByText('Feira');
    // Assert
    expect(screen.getAllByText('Manual')).toHaveLength(1);
  });

  it('should_show_the_possible_duplicate_badge_on_the_bank_transaction', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/transactions': manualRows });
    // Act
    renderApp();
    await screen.findByText('PIX FEIRA LIVRE');
    // Assert
    expect(screen.getAllByText('Possível duplicata')).toHaveLength(1);
  });

  it('should_show_the_possible_duplicate_badge_in_warning_colors_not_in_red', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/transactions': manualRows });
    // Act
    renderApp();
    const badge = await screen.findByText('Possível duplicata');
    // Assert
    expect(badge.className).toEqual(expect.stringContaining('bg-warning-surface text-warning'));
  });
});

describe('editar e excluir', () => {
  function stubListWithManual(extra: Record<string, Handler> = {}) {
    return stubApi({
      'GET /api/v1/transactions': () => pageResponse([FEIRA, PHARMACY], 1, 2),
      ...extra,
    });
  }

  it('should_offer_edit_and_delete_only_on_the_manual_transaction', async () => {
    // Arrange
    stubListWithManual();
    renderApp();
    // Act
    await userEvent.click(await screen.findByText('Feira'));
    const manualDetail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    const manualActions = ['Editar', 'Excluir'].map((name) =>
      within(manualDetail).queryByRole('button', { name }),
    );
    await userEvent.keyboard('{Escape}');
    await userEvent.click(await screen.findByText('FARMÁCIA SÃO JOÃO'));
    const bankDetail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    // Assert
    expect(manualActions).not.toContain(null);
    expect(within(bankDetail).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(within(bankDetail).queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('should_open_the_form_filled_with_the_transaction_when_editing', async () => {
    // Arrange
    stubListWithManual();
    renderApp();
    await userEvent.click(await screen.findByText('Feira'));
    const detail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    // Act
    await userEvent.click(within(detail).getByRole('button', { name: 'Editar' }));
    // Assert
    const form = await screen.findByRole('dialog', { name: 'Editar transação' });
    expect({
      amount: (within(form).getByLabelText('Valor') as HTMLInputElement).value,
      description: (within(form).getByLabelText('Descrição') as HTMLInputElement).value,
      account: (within(form).getByLabelText('Conta') as HTMLSelectElement).value,
      category: within(form)
        .getByRole('radio', { name: /Mercado/ })
        .getAttribute('aria-checked'),
    }).toEqual({
      amount: 'R$ 45,00',
      description: 'Feira',
      account: CASH_ACCOUNT.id,
      category: 'true',
    });
  });

  it('should_send_the_corrected_value_and_confirm_when_the_edit_is_saved', async () => {
    // Arrange
    const fetchMock = stubListWithManual({
      [`PATCH /api/v1/transactions/${FEIRA_ID}`]: () =>
        Response.json({ ...FEIRA, amountCents: -5000 }),
    });
    renderApp();
    await userEvent.click(await screen.findByText('Feira'));
    const detail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    await userEvent.click(within(detail).getByRole('button', { name: 'Editar' }));
    const form = await screen.findByRole('dialog', { name: 'Editar transação' });
    const amount = within(form).getByLabelText('Valor');
    // Act
    await userEvent.clear(amount);
    await userEvent.type(amount, '5000');
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    // Assert
    expect(await screen.findByText('Transação atualizada')).toBeInTheDocument();
    expect(jsonBodies(fetchMock, 'PATCH')).toMatchObject([
      { type: 'expense', amountCents: 5000, description: 'Feira', accountId: CASH_ACCOUNT.id },
    ]);
  });

  it('should_ask_for_confirmation_before_deleting_and_delete_nothing_when_cancelled', async () => {
    // Arrange
    const fetchMock = stubListWithManual();
    renderApp();
    await userEvent.click(await screen.findByText('Feira'));
    const detail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    // Act
    await userEvent.click(within(detail).getByRole('button', { name: 'Excluir' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Excluir esta transação?' });
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Cancelar' }));
    // Assert
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toEqual([]);
  });

  it('should_delete_close_and_confirm_when_the_deletion_is_confirmed', async () => {
    // Arrange
    const fetchMock = stubListWithManual({
      [`DELETE /api/v1/transactions/${FEIRA_ID}`]: () => new Response(null, { status: 204 }),
    });
    renderApp();
    await userEvent.click(await screen.findByText('Feira'));
    const detail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    await userEvent.click(within(detail).getByRole('button', { name: 'Excluir' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Excluir esta transação?' });
    // Act
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Excluir' }));
    // Assert
    expect(await screen.findByText('Transação excluída.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
  });

  it('should_keep_the_confirmation_open_with_a_message_when_the_deletion_fails', async () => {
    // Arrange
    stubListWithManual({
      [`DELETE /api/v1/transactions/${FEIRA_ID}`]: () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
          { status: 500 },
        ),
    });
    renderApp();
    await userEvent.click(await screen.findByText('Feira'));
    const detail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    await userEvent.click(within(detail).getByRole('button', { name: 'Excluir' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Excluir esta transação?' });
    // Act
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Excluir' }));
    // Assert
    expect(await within(confirmation).findByRole('alert')).toHaveTextContent(
      'Não foi possível excluir',
    );
  });
});

describe('faixa de possíveis duplicatas', () => {
  it('should_show_the_count_in_the_banner_when_there_are_pending_duplicates', async () => {
    // Arrange
    stubApi({ [DUPLICATE_COUNT_ROUTE]: () => pageResponse([BANK_FEIRA], 1, 2) });
    // Act
    renderApp();
    // Assert
    expect(
      await screen.findByRole('button', { name: '2 possíveis duplicatas para conferir' }),
    ).toBeInTheDocument();
  });

  it('should_use_the_singular_when_there_is_one_pending_duplicate', async () => {
    // Arrange
    stubApi({ [DUPLICATE_COUNT_ROUTE]: () => pageResponse([BANK_FEIRA], 1, 1) });
    // Act
    renderApp();
    // Assert
    expect(
      await screen.findByRole('button', { name: '1 possível duplicata para conferir' }),
    ).toBeInTheDocument();
  });

  it('should_not_show_the_banner_when_there_are_no_pending_duplicates', async () => {
    // Arrange
    stubApi();
    // Act
    renderApp();
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    // Assert
    expect(screen.queryByText(/para conferir/)).not.toBeInTheDocument();
  });

  it('should_ask_only_for_possible_duplicates_in_every_period_when_the_banner_is_clicked', async () => {
    // Arrange
    const fetchMock = stubApi({
      [DUPLICATE_COUNT_ROUTE]: () => pageResponse([BANK_FEIRA], 1, 2),
      'GET /api/v1/transactions': (url) =>
        url.searchParams.get('possibleDuplicate') === 'true'
          ? pageResponse([BANK_FEIRA], 1, 1)
          : pageResponse([PHARMACY]),
    });
    renderApp();
    // Act
    await userEvent.click(
      await screen.findByRole('button', { name: '2 possíveis duplicatas para conferir' }),
    );
    // Assert
    await waitFor(() => {
      expect(listQueries(fetchMock).at(-1)?.toString()).toBe(
        'page=1&limit=50&to=2026-11-04&possibleDuplicate=true',
      );
    });
  });

  it('should_hide_the_banner_when_the_list_is_already_filtered_by_duplicates', async () => {
    // Arrange
    stubApi({ [DUPLICATE_COUNT_ROUTE]: () => pageResponse([BANK_FEIRA], 1, 2) });
    // Act
    renderApp('/transacoes?period=custom&to=2026-11-04&duplicates=1');
    await screen.findByRole('list', { name: 'Filtros ativos' });
    // Assert
    expect(screen.queryByText(/para conferir/)).not.toBeInTheDocument();
  });
});

describe('resolver possível duplicata', () => {
  function stubDuplicatePair(extra: Record<string, Handler> = {}) {
    return stubApi({
      'GET /api/v1/transactions': () => pageResponse([BANK_FEIRA, FEIRA], 1, 2),
      [`GET /api/v1/transactions/${FEIRA_ID}`]: () => Response.json(FEIRA),
      ...extra,
    });
  }

  async function openDuplicateDetail() {
    await userEvent.click(await screen.findByText('PIX FEIRA LIVRE'));
    return screen.findByRole('dialog', { name: 'Detalhes da transação' });
  }

  it('should_show_both_transactions_side_by_side_when_the_detail_of_a_duplicate_opens', async () => {
    // Arrange
    stubDuplicatePair();
    renderApp();
    // Act
    const detail = await openDuplicateDetail();
    // Assert
    const section = within(detail).getByRole('region', { name: 'Possível duplicata' });
    expect(await within(section).findByText('Lançada por você')).toBeInTheDocument();
    expect(within(section).getByText('Do banco')).toBeInTheDocument();
  });

  it('should_offer_merge_and_different_buttons_when_the_detail_of_a_duplicate_opens', async () => {
    // Arrange
    stubDuplicatePair();
    renderApp();
    // Act
    const detail = await openDuplicateDetail();
    // Assert
    expect(
      ['Juntar', 'São diferentes'].map((name) => within(detail).queryByRole('button', { name })),
    ).not.toContain(null);
  });

  it('should_not_offer_the_duplicate_buttons_on_a_normal_transaction', async () => {
    // Arrange
    stubDuplicatePair();
    renderApp();
    // Act
    await userEvent.click(await screen.findByText('Feira'));
    const detail = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
    // Assert
    expect(within(detail).queryByRole('button', { name: 'Juntar' })).not.toBeInTheDocument();
  });

  it('should_send_merge_and_confirm_when_merge_is_chosen', async () => {
    // Arrange
    const fetchMock = stubDuplicatePair({
      [`POST /api/v1/transactions/${String(BANK_FEIRA.id)}/duplicate-resolution`]: () =>
        Response.json({ ...BANK_FEIRA, possibleDuplicateOfId: null }),
    });
    renderApp();
    const detail = await openDuplicateDetail();
    // Act
    await userEvent.click(within(detail).getByRole('button', { name: 'Juntar' }));
    // Assert
    expect(await screen.findByText(/Transações juntadas/)).toBeInTheDocument();
    expect(jsonBodies(fetchMock, 'POST')).toEqual([{ action: 'merge' }]);
  });

  it('should_send_keep_both_and_confirm_when_different_is_chosen', async () => {
    // Arrange
    const fetchMock = stubDuplicatePair({
      [`POST /api/v1/transactions/${String(BANK_FEIRA.id)}/duplicate-resolution`]: () =>
        Response.json({ ...BANK_FEIRA, possibleDuplicateOfId: null }),
    });
    renderApp();
    const detail = await openDuplicateDetail();
    // Act
    await userEvent.click(within(detail).getByRole('button', { name: 'São diferentes' }));
    // Assert
    expect(await screen.findByText('Mantivemos as duas transações.')).toBeInTheDocument();
    expect(jsonBodies(fetchMock, 'POST')).toEqual([{ action: 'keep_both' }]);
  });
});

describe('filtro de origem', () => {
  it('should_ask_only_for_manual_transactions_when_the_source_filter_is_manual', async () => {
    // Arrange
    const fetchMock = stubApi();
    renderApp();
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    // Act
    await userEvent.selectOptions(screen.getByLabelText('Origem'), 'manual');
    // Assert
    await waitFor(() => {
      expect(listQueries(fetchMock).map((query) => query.get('source'))).toContain('manual');
    });
  });

  it('should_show_a_removable_chip_when_a_source_is_filtered', async () => {
    // Arrange
    stubApi();
    // Act
    renderApp('/transacoes?source=manual');
    // Assert
    expect(
      await screen.findByRole('button', { name: 'Remover filtro Lançamento manual' }),
    ).toBeInTheDocument();
  });

  it('should_offer_every_origin_in_the_filters_when_listing', async () => {
    // Arrange
    stubApi();
    renderApp();
    await screen.findByText('FARMÁCIA SÃO JOÃO');
    // Act
    const options = within(screen.getByLabelText('Origem')).getAllByRole('option');
    // Assert
    expect(options.map((option) => option.textContent)).toEqual([
      'Todas as origens',
      'Open Finance',
      'Lançamento manual',
    ]);
  });
});

describe('contas disponíveis', () => {
  it('should_use_the_only_bank_account_when_cash_does_not_exist_yet', async () => {
    // Arrange
    stubApi({ 'GET /api/v1/accounts': () => accountsResponse([ACCOUNT]) });
    renderApp();
    // Act
    const form = await openForm();
    // Assert
    expect(within(form).getByLabelText('Conta')).toHaveValue(ACCOUNT.id);
  });
});
