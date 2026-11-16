import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { ARCHIVED_LINK_LABEL } from './goal-linked-items';
import { Component as GoalsPage } from './goals-page';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const RESERVE_ID = '22222222-2222-4222-8222-222222222222';
const CDB_ID = '33333333-3333-4333-8333-333333333333';
const SAVINGS_ID = '44444444-4444-4444-8444-444444444444';
const OLD_CDB_ID = '55555555-5555-4555-8555-555555555555';
const CONNECTION = {
  id: '66666666-6666-4666-8666-666666666666',
  institutionName: 'Banco Azul',
  status: 'ok',
  statusDetail: null,
  lastSyncedAt: '2026-11-05T10:02:00.000Z',
};

function goal(overrides: Record<string, unknown> = {}) {
  return {
    id: TRIP_ID,
    name: 'Viagem',
    icon: 'plane',
    targetCents: 2_000_000,
    savedCents: 500_000,
    manualSavedCents: 500_000,
    isLinked: false,
    links: [],
    targetDate: null,
    progressPercent: 25,
    status: 'no_pace',
    remainingCents: 1_500_000,
    monthlyRateCents: 0,
    requiredMonthlyCents: null,
    estimatedDate: null,
    isEstimateTooFar: false,
    recentContributions: [],
    ...overrides,
  };
}

function link(overrides: Record<string, unknown> = {}) {
  return {
    type: 'investment',
    id: CDB_ID,
    name: 'CDB Reserva',
    institutionName: 'Banco Azul',
    balanceCents: 1_000_000,
    isArchived: false,
    ...overrides,
  };
}

const SAVINGS_LINK = link({
  type: 'account',
  id: SAVINGS_ID,
  name: 'Poupança',
  balanceCents: 250_000,
});

const LINKED_GOAL = goal({
  id: RESERVE_ID,
  name: 'Reserva',
  savedCents: 1_250_000,
  manualSavedCents: 150_000,
  isLinked: true,
  links: [link(), SAVINGS_LINK],
  progressPercent: 62,
  remainingCents: 750_000,
});

const ACCOUNTS = {
  items: [
    {
      id: SAVINGS_ID,
      name: 'Poupança',
      type: 'savings',
      lastDigits: '5678',
      balanceCents: 250_000,
      creditLimitCents: null,
      availableLimitCents: null,
      isHidden: false,
      connection: CONNECTION,
    },
    {
      id: '77777777-7777-4777-8777-777777777777',
      name: 'Cartão Ultravioleta',
      type: 'credit_card',
      lastDigits: '9012',
      balanceCents: 90_000,
      creditLimitCents: 500_000,
      availableLimitCents: 410_000,
      isHidden: false,
      connection: CONNECTION,
    },
    {
      id: '88888888-8888-4888-8888-888888888888',
      name: 'Dinheiro',
      type: 'cash',
      lastDigits: null,
      balanceCents: null,
      creditLimitCents: null,
      availableLimitCents: null,
      isHidden: false,
      connection: null,
    },
  ],
  totals: { totalBalanceCents: 250_000, openCreditCardBillsCents: 90_000, availableCreditCents: 0 },
};

function investments(items: unknown[] = [investmentItem()]) {
  return {
    totals: { totalCents: 1_000_000, positionsCount: items.length, closedCount: 0 },
    groups: [{ type: 'FIXED_INCOME', totalCents: 1_000_000, percent: 100, items }],
  };
}

function investmentItem(overrides: Record<string, unknown> = {}) {
  return {
    id: CDB_ID,
    name: 'CDB Reserva',
    subtype: 'CDB',
    balanceCents: 1_000_000,
    percent: 100,
    institutionName: 'Banco Azul',
    ...overrides,
  };
}

function routes(goals: unknown[], overrides: Record<string, () => Response> = {}) {
  return {
    'GET /api/v1/goals': () => Response.json({ items: goals }),
    'GET /api/v1/accounts': () => Response.json(ACCOUNTS),
    'GET /api/v1/investments': () => Response.json(investments()),
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={['/metas']}>
          <HideValuesButton />
          <GoalsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

function bodyOf(fetchMock: ReturnType<typeof stubRoutes>, method: string): unknown {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === method);
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

async function openNewGoalForm(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole('button', { name: 'Criar meta' }));
  return screen.findByRole('dialog');
}

async function chooseLinkedMode(dialog: HTMLElement): Promise<void> {
  await userEvent.click(within(dialog).getByRole('radio', { name: 'Vinculada' }));
}

async function openEditForm(goalName: string): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(goalName) }));
  await userEvent.click(await screen.findByRole('button', { name: 'Editar meta' }));
  return screen.findByRole('dialog');
}

afterEach(() => {
  window.localStorage.clear();
});

describe('GoalForm linked mode', () => {
  it('should_show_the_sum_of_the_chosen_items_when_picking_an_investment_and_an_account', async () => {
    // Arrange
    stubRoutes(routes([]));
    renderPage();
    const dialog = await openNewGoalForm();
    await chooseLinkedMode(dialog);
    // Act
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: /CDB Reserva/ }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Poupança/ }));
    // Assert
    expect(within(dialog).getByText('Soma atual').parentElement).toHaveTextContent('12.500,00');
  });

  it('should_offer_only_checking_savings_and_investments_when_listing_the_items', async () => {
    // Arrange
    stubRoutes(routes([]));
    renderPage();
    const dialog = await openNewGoalForm();
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    const names = (await within(dialog).findAllByRole('checkbox')).map(
      (checkbox) => checkbox.closest('label')?.textContent ?? '',
    );
    expect(names).toEqual([
      expect.stringContaining('Poupança'),
      expect.stringContaining('CDB Reserva'),
    ]);
  });

  it('should_hide_the_initial_value_field_when_the_goal_is_linked', async () => {
    // Arrange
    stubRoutes(routes([]));
    renderPage();
    const dialog = await openNewGoalForm();
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    expect(within(dialog).queryByLabelText('Já guardado (opcional)')).toBeNull();
  });

  it('should_ask_for_at_least_one_item_when_saving_a_linked_goal_without_items', async () => {
    // Arrange
    stubRoutes(routes([]));
    renderPage();
    const dialog = await openNewGoalForm();
    await chooseLinkedMode(dialog);
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Reserva');
    await userEvent.type(within(dialog).getByLabelText('Valor desejado'), '2000000');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar meta' }));
    // Assert
    expect(await within(dialog).findByText('Escolha ao menos um item para vincular')).toBeVisible();
  });

  it('should_send_the_chosen_links_and_no_initial_value_when_creating_a_linked_goal', async () => {
    // Arrange
    const fetchMock = stubRoutes(
      routes([], { 'POST /api/v1/goals': () => Response.json(LINKED_GOAL, { status: 201 }) }),
    );
    renderPage();
    const dialog = await openNewGoalForm();
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Reserva');
    await userEvent.type(within(dialog).getByLabelText('Valor desejado'), '2000000');
    await userEvent.type(within(dialog).getByLabelText('Já guardado (opcional)'), '150000');
    await chooseLinkedMode(dialog);
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: /CDB Reserva/ }));
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar meta' }));
    // Assert
    expect(await screen.findByText('Meta Reserva criada')).toBeVisible();
    expect(bodyOf(fetchMock, 'POST')).toMatchObject({
      initialCents: 0,
      links: [{ type: 'investment', id: CDB_ID }],
    });
  });

  it('should_warn_that_the_item_counts_in_full_when_it_is_already_in_another_goal', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    const dialog = await openNewGoalForm();
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    const row = (await within(dialog).findByRole('checkbox', { name: /CDB Reserva/ })).closest(
      'label',
    );
    expect(row).toHaveTextContent('Já está em outra meta: o saldo conta inteiro nas duas.');
  });

  it('should_not_warn_about_another_goal_when_the_item_is_only_in_the_goal_being_edited', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    // Act
    const dialog = await openEditForm('Reserva');
    // Assert
    const row = (await within(dialog).findByRole('checkbox', { name: /CDB Reserva/ })).closest(
      'label',
    );
    expect(row).not.toHaveTextContent('Já está em outra meta');
  });

  it('should_disable_the_remaining_items_when_ten_are_already_chosen', async () => {
    // Arrange
    const manyInvestments = Array.from({ length: 11 }, (_, position) =>
      investmentItem({
        id: `00000000-0000-4000-8000-${String(position + 1).padStart(12, '0')}`,
        name: `Fundo ${String(position + 1).padStart(2, '0')}`,
      }),
    );
    stubRoutes(
      routes([], {
        'GET /api/v1/investments': () => Response.json(investments(manyInvestments)),
        'GET /api/v1/accounts': () => Response.json({ ...ACCOUNTS, items: [] }),
      }),
    );
    renderPage();
    const dialog = await openNewGoalForm();
    await chooseLinkedMode(dialog);
    // Act
    for (const position of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      await userEvent.click(
        await within(dialog).findByRole('checkbox', {
          name: new RegExp(`Fundo ${String(position).padStart(2, '0')}`),
        }),
      );
    }
    // Assert
    expect(within(dialog).getByRole('checkbox', { name: /Fundo 11/ })).toBeDisabled();
  });
});

describe('GoalForm switching between manual and linked', () => {
  it('should_warn_that_the_contributions_stop_counting_when_linking_a_goal_with_contributions', async () => {
    // Arrange
    stubRoutes(routes([goal()]));
    renderPage();
    const dialog = await openEditForm('Viagem');
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      /Os aportes \(R\$.*5\.000,00\) deixam de contar enquanto a meta estiver vinculada/,
    );
  });

  it('should_warn_that_the_value_goes_back_to_the_contributions_when_unlinking', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    const dialog = await openEditForm('Reserva');
    // Act
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Eu informo' }));
    // Assert
    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      /Ao desvincular, o valor da meta volta a ser o dos aportes \(R\$.*1\.500,00\)/,
    );
  });

  it('should_send_an_empty_list_of_links_when_unlinking_a_goal', async () => {
    // Arrange
    const fetchMock = stubRoutes(
      routes([LINKED_GOAL], {
        [`PUT /api/v1/goals/${RESERVE_ID}`]: () => Response.json(goal({ id: RESERVE_ID })),
      }),
    );
    renderPage();
    const dialog = await openEditForm('Reserva');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Eu informo' }));
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar meta' }));
    // Assert
    await screen.findByText('Meta Viagem salva');
    expect(bodyOf(fetchMock, 'PUT')).toMatchObject({ links: [] });
  });
});

describe('GoalForm item list states', () => {
  it('should_show_a_skeleton_while_the_items_are_loading', async () => {
    // Arrange
    stubRoutes(
      routes([], {
        'GET /api/v1/accounts': () => new Promise<Response>(() => undefined) as never,
      }),
    );
    renderPage();
    const dialog = await openNewGoalForm();
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
  });

  it('should_show_an_error_with_retry_when_the_items_fail_to_load', async () => {
    // Arrange
    stubRoutes(
      routes([], { 'GET /api/v1/investments': () => errorResponse(500, 'INTERNAL_ERROR') }),
    );
    renderPage();
    const dialog = await openNewGoalForm();
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    expect(
      await within(dialog).findByText('Não foi possível carregar suas contas e investimentos.'),
    ).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_say_there_is_nothing_to_link_when_there_are_no_accounts_or_investments', async () => {
    // Arrange
    stubRoutes(
      routes([], {
        'GET /api/v1/accounts': () => Response.json({ ...ACCOUNTS, items: [] }),
        'GET /api/v1/investments': () => Response.json(investments([])),
      }),
    );
    renderPage();
    const dialog = await openNewGoalForm();
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    expect(
      await within(dialog).findByText(/Nenhuma conta corrente, poupança ou investimento/),
    ).toBeVisible();
  });

  it('should_still_show_the_missing_item_error_when_there_is_nothing_to_link', async () => {
    // Arrange
    stubRoutes(
      routes([], {
        'GET /api/v1/accounts': () => Response.json({ ...ACCOUNTS, items: [] }),
        'GET /api/v1/investments': () => Response.json(investments([])),
      }),
    );
    renderPage();
    const dialog = await openNewGoalForm();
    await chooseLinkedMode(dialog);
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Reserva');
    await userEvent.type(within(dialog).getByLabelText('Valor desejado'), '2000000');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar meta' }));
    // Assert
    expect(await within(dialog).findByText('Escolha ao menos um item para vincular')).toBeVisible();
  });

  it('should_keep_an_already_linked_item_in_the_list_when_it_left_the_investments', async () => {
    // Arrange
    const closedLink = link({ id: OLD_CDB_ID, name: 'CDB resgatado', balanceCents: 0 });
    stubRoutes(routes([goal({ ...LINKED_GOAL, links: [closedLink] })]));
    renderPage();
    // Act
    const dialog = await openEditForm('Reserva');
    // Assert
    expect(await within(dialog).findByRole('checkbox', { name: /CDB resgatado/ })).toBeChecked();
  });
});

describe('GoalsPage linked goal', () => {
  it('should_show_the_linked_badge_with_the_item_count_on_the_card', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    // Act
    renderPage();
    // Assert
    const card = await screen.findByRole('button', { name: /Reserva/ });
    expect(card).toHaveTextContent('Vinculada · 2 itens');
    expect(card.querySelector('.lucide-link-2')).not.toBeNull();
  });

  it('should_not_show_the_linked_badge_when_the_goal_is_manual', async () => {
    // Arrange
    stubRoutes(routes([goal()]));
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: /Viagem/ })).not.toHaveTextContent(
      'Vinculada',
    );
  });

  it('should_list_the_linked_items_with_their_balances_when_opening_the_goal', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: /Reserva/ }));
    // Assert
    const section = await screen.findByRole('region', { name: 'Itens vinculados' });
    expect(section).toHaveTextContent('CDB Reserva');
    expect(section).toHaveTextContent('10.000,00');
    expect(section).toHaveTextContent('2.500,00');
  });

  it('should_not_offer_contribution_or_withdrawal_when_the_goal_is_linked', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: /Reserva/ }));
    // Assert
    await screen.findByRole('region', { name: 'Itens vinculados' });
    expect(screen.queryByRole('button', { name: 'Registrar aporte' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar retirada' })).toBeNull();
  });

  it('should_explain_that_the_value_follows_the_balance_and_that_the_pace_mixes_yield', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: /Reserva/ }));
    // Assert
    const section = await screen.findByRole('region', { name: 'Itens vinculados' });
    expect(section).toHaveTextContent('O valor acompanha o saldo e muda na sincronização diária.');
    expect(section).toHaveTextContent('mistura aporte e rendimento');
  });

  it('should_say_the_old_contributions_do_not_count_when_the_goal_has_stored_contributions', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: /Reserva/ }));
    // Assert
    const section = await screen.findByRole('region', { name: 'Itens vinculados' });
    expect(section).toHaveTextContent(/Aportes guardados: R\$.*1\.500,00.*Não contam/);
  });

  it('should_mark_an_archived_item_with_icon_and_text_when_the_bank_left_the_app', async () => {
    // Arrange
    const archived = link({ isArchived: true });
    stubRoutes(routes([goal({ ...LINKED_GOAL, links: [archived] })]));
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: /Reserva/ }));
    // Assert
    const section = await screen.findByRole('region', { name: 'Itens vinculados' });
    expect(section).toHaveTextContent(ARCHIVED_LINK_LABEL);
    expect(section.querySelector('.lucide-archive')).not.toBeNull();
  });

  it('should_not_use_the_contribution_hint_when_a_linked_goal_has_no_pace', async () => {
    // Arrange
    stubRoutes(routes([goal({ ...LINKED_GOAL, status: 'no_pace' })]));
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: /Reserva/ })).not.toHaveTextContent(
      'registre um aporte',
    );
  });

  it('should_hide_the_balances_of_the_linked_items_when_hide_values_is_on', async () => {
    // Arrange
    stubRoutes(routes([LINKED_GOAL]));
    renderPage();
    await screen.findByRole('button', { name: /Reserva/ });
    await userEvent.click(screen.getByRole('button', { name: /Ocultar valores/ }));
    // Act
    await userEvent.click(screen.getByRole('button', { name: /Reserva/ }));
    // Assert
    const section = await screen.findByRole('region', { name: 'Itens vinculados' });
    expect(section).not.toHaveTextContent('10.000,00');
    expect(section).toHaveTextContent('R$ ••••');
  });

  it('should_hide_the_balances_in_the_item_list_when_hide_values_is_on', async () => {
    // Arrange
    stubRoutes(routes([]));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Ocultar valores/ }));
    const dialog = await openNewGoalForm();
    // Act
    await chooseLinkedMode(dialog);
    // Assert
    const row = (await within(dialog).findByRole('checkbox', { name: /CDB Reserva/ })).closest(
      'label',
    );
    expect(row).not.toHaveTextContent('10.000,00');
  });
});
