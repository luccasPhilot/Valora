import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as PlanningPage } from './planning-page';

const RENT_ID = '11111111-1111-4111-8111-111111111111';
const SALARY_ID = '22222222-2222-4222-8222-222222222222';
const HOUSING_ID = '33333333-3333-4333-8333-333333333333';
const INCOME_CATEGORY_ID = '44444444-4444-4444-8444-444444444444';
const TRANSACTION_ID = '55555555-5555-4555-8555-555555555555';

const CATEGORIES = [
  { id: HOUSING_ID, name: 'Moradia', kind: 'expense', icon: 'house', isArchived: false },
  { id: INCOME_CATEGORY_ID, name: 'Salário', kind: 'income', icon: 'wallet', isArchived: false },
];

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: RENT_ID,
    description: 'Aluguel',
    amountCents: -180000,
    categoryId: HOUSING_ID,
    categoryName: 'Moradia',
    categoryIcon: 'house',
    dayOfMonth: 10,
    recurrence: 'monthly',
    startMonth: '2026-10',
    endMonth: null,
    isActive: true,
    ...overrides,
  };
}

function occurrence(overrides: Record<string, unknown> = {}) {
  return {
    plannedEntryId: RENT_ID,
    month: '2026-11',
    date: '2026-11-10',
    entry: entry(),
    status: 'pending',
    decidedAt: null,
    transaction: null,
    candidates: [],
    ...overrides,
  };
}

const SALARY = occurrence({
  plannedEntryId: SALARY_ID,
  date: '2026-11-05',
  entry: entry({
    id: SALARY_ID,
    description: 'Salário',
    amountCents: 500000,
    categoryId: INCOME_CATEGORY_ID,
    categoryName: 'Salário',
    dayOfMonth: 5,
  }),
});

const PROJECTION = {
  date: '2026-11-05',
  startBalanceCents: 100000,
  plannedIncomeCents: 0,
  plannedExpenseCents: 0,
  billsDueCents: 0,
  projectedBalanceCents: 100000,
  lowestBalanceCents: 100000,
  lowestBalanceDate: '2026-11-05',
  daily: [{ date: '2026-11-05', balanceCents: 100000 }],
  events: [],
  warnings: [],
};

const EMPTY_TOTALS = { incomeCents: 0, expenseCents: 0 };

function overview(
  items: unknown[],
  extras: { pausedEntries?: unknown[]; totals?: Record<string, unknown> } = {},
) {
  return () =>
    Response.json({
      month: '2026-11',
      items,
      totals: {
        pending: { incomeCents: 500000, expenseCents: 180000 },
        realized: EMPTY_TOTALS,
        skipped: EMPTY_TOTALS,
        ...extras.totals,
      },
      pausedEntries: extras.pausedEntries ?? [],
    });
}

function baseRoutes(items: unknown[], extras: Parameters<typeof overview>[1] = {}) {
  return {
    'GET /api/v1/planned-entries': overview(items, extras),
    'GET /api/v1/categories': () => Response.json({ items: CATEGORIES }),
    'GET /api/v1/projection': () => Response.json(PROJECTION),
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={['/planejamento?month=2026-11']}>
          <HideValuesButton />
          <PlanningPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

async function findRow(name: string): Promise<HTMLElement> {
  return screen.findByRole('button', { name: new RegExp(name) });
}

afterEach(() => {
  window.localStorage.clear();
});

describe('PlanningPage list', () => {
  it('should_show_the_recurrence_text_when_the_entry_repeats_every_month', async () => {
    // Arrange
    stubRoutes(baseRoutes([occurrence()]));
    // Act
    renderPage();
    // Assert
    expect(await findRow('Aluguel')).toHaveTextContent('Todo mês, dia 10');
  });

  it('should_show_income_in_the_positive_color_with_plus_when_the_entry_is_an_income', async () => {
    // Arrange
    stubRoutes(baseRoutes([SALARY]));
    // Act
    renderPage();
    // Assert
    const amount = within(await findRow('Salário')).getByText('+ R$ 5.000,00');
    expect(amount.closest('span.tabular-nums')).toHaveClass('text-positive');
  });

  it('should_show_expense_in_the_normal_color_with_minus_when_the_entry_is_an_expense', async () => {
    // Arrange
    stubRoutes(baseRoutes([occurrence()]));
    // Act
    renderPage();
    // Assert
    const amount = within(await findRow('Aluguel')).getByText('− R$ 1.800,00');
    expect(amount.closest('span.tabular-nums')).not.toHaveClass('text-positive');
  });

  it('should_group_the_occurrences_by_status_when_there_are_pending_and_decided_ones', async () => {
    // Arrange
    stubRoutes(
      baseRoutes([
        occurrence(),
        occurrence({ ...SALARY, status: 'realized' }),
        occurrence({
          plannedEntryId: '66666666-6666-4666-8666-666666666666',
          status: 'skipped',
          entry: entry({ id: '66666666-6666-4666-8666-666666666666', description: 'Seguro' }),
        }),
      ]),
    );
    // Act
    renderPage();
    // Assert
    await findRow('Aluguel');
    expect(
      [
        within(screen.getByRole('region', { name: /Para acontecer/ })).getAllByRole('listitem'),
        within(screen.getByRole('region', { name: /Realizadas/ })).getAllByRole('listitem'),
        within(screen.getByRole('region', { name: /Puladas/ })).getAllByRole('listitem'),
      ].map((list) => list.length),
    ).toEqual([1, 1, 1]);
  });

  it('should_show_the_expected_totals_when_the_month_has_entries', async () => {
    // Arrange
    stubRoutes(baseRoutes([occurrence(), SALARY]));
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('region', { name: 'Receitas previstas' })).toHaveTextContent(
      '+ R$ 5.000,00',
    );
    expect(screen.getByRole('region', { name: 'Despesas previstas' })).toHaveTextContent(
      '− R$ 1.800,00',
    );
  });

  it('should_list_paused_entries_apart_when_the_api_returns_them', async () => {
    // Arrange
    stubRoutes(
      baseRoutes([occurrence()], {
        pausedEntries: [entry({ id: SALARY_ID, description: 'Bônus', isActive: false })],
      }),
    );
    // Act
    renderPage();
    // Assert
    const paused = await screen.findByRole('region', { name: /Pausadas/ });
    expect(paused).toHaveTextContent('Bônus');
  });
});

describe('PlanningPage states', () => {
  it('should_show_the_empty_state_with_the_add_action_when_the_month_has_no_entries', async () => {
    // Arrange
    stubRoutes(baseRoutes([]));
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Planeje o mês')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Adicionar previsão' })).toBeVisible();
  });

  it('should_show_the_error_state_with_retry_when_the_api_fails', async () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([]),
      'GET /api/v1/planned-entries': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_show_the_skeleton_while_the_month_is_loading', () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([]),
      'GET /api/v1/planned-entries': () => new Promise<Response>(() => undefined),
    });
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('should_mask_the_amounts_when_the_hide_values_button_is_on', async () => {
    // Arrange
    stubRoutes(baseRoutes([occurrence()]));
    renderPage();
    const row = await findRow('Aluguel');
    // Act
    await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }));
    // Assert
    expect(row).toHaveTextContent('R$ ••••');
  });
});

describe('PlanningPage occurrence actions', () => {
  it('should_link_the_transaction_when_a_candidate_is_chosen', async () => {
    // Arrange
    const candidate = {
      id: TRANSACTION_ID,
      date: '2026-11-11',
      description: 'Imobiliária',
      amountCents: -180000,
    };
    const fetchMock = stubRoutes({
      ...baseRoutes([occurrence({ candidates: [candidate] })]),
      [`PUT /api/v1/planned-entries/${RENT_ID}/occurrences/2026-11`]: () =>
        Response.json(occurrence({ status: 'realized', transaction: candidate })),
    });
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Vincular Imobiliária' }));
    // Assert
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[1]?.body).toBe(
      JSON.stringify({ action: 'realize', transactionId: TRANSACTION_ID }),
    );
  });

  it('should_explain_there_is_no_similar_transaction_when_there_are_no_candidates', async () => {
    // Arrange
    stubRoutes(baseRoutes([occurrence()]));
    renderPage();
    // Act
    await userEvent.click(await findRow('Aluguel'));
    // Assert
    expect(await screen.findByText(/Nenhuma transação parecida neste mês/)).toBeVisible();
  });

  it('should_realize_without_a_link_when_the_user_marks_it_as_done', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([occurrence()]),
      [`PUT /api/v1/planned-entries/${RENT_ID}/occurrences/2026-11`]: () =>
        Response.json(occurrence({ status: 'realized' })),
    });
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como realizada' }));
    // Assert
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[1]?.body).toBe(JSON.stringify({ action: 'realize' }));
  });

  it('should_skip_the_month_when_the_user_chooses_to_skip', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([occurrence()]),
      [`PUT /api/v1/planned-entries/${RENT_ID}/occurrences/2026-11`]: () =>
        Response.json(occurrence({ status: 'skipped' })),
    });
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Pular este mês' }));
    // Assert
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[1]?.body).toBe(JSON.stringify({ action: 'skip' }));
  });

  it('should_offer_to_undo_when_the_occurrence_was_already_decided', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([occurrence({ status: 'skipped' })]),
      [`DELETE /api/v1/planned-entries/${RENT_ID}/occurrences/2026-11`]: () =>
        new Response(null, { status: 204 }),
    });
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    // Assert
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
  });

  it('should_show_an_error_when_the_decision_is_refused', async () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([occurrence()]),
      [`PUT /api/v1/planned-entries/${RENT_ID}/occurrences/2026-11`]: () =>
        errorResponse(409, 'TRANSACTION_ALREADY_LINKED'),
    });
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Pular este mês' }));
    // Assert
    expect(await screen.findByText('Não foi possível salvar. Tente de novo.')).toBeVisible();
  });
});

describe('PlanningPage entry form', () => {
  it('should_warn_that_the_change_covers_every_month_when_editing_a_recurring_entry', async () => {
    // Arrange
    stubRoutes(baseRoutes([occurrence()]));
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Editar previsão' }));
    // Assert
    expect(await screen.findByText(/A mudança vale para todos os meses/)).toBeVisible();
  });

  it('should_not_warn_when_creating_a_new_entry', async () => {
    // Arrange
    stubRoutes(baseRoutes([]));
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar previsão' }));
    // Assert
    await screen.findByRole('button', { name: 'Criar previsão' });
    expect(screen.queryByText(/A mudança vale para todos os meses/)).not.toBeInTheDocument();
  });

  it('should_show_the_required_field_messages_when_the_empty_form_is_submitted', async () => {
    // Arrange
    stubRoutes(baseRoutes([]));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar previsão' }));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Criar previsão' }));
    // Assert
    expect(await screen.findByText('Informe o valor')).toBeVisible();
    expect(screen.getByText('Informe uma descrição')).toBeVisible();
    expect(screen.getByText('Escolha uma categoria', { selector: 'p' })).toBeVisible();
  });

  it('should_send_the_entry_with_positive_cents_and_the_type_when_the_form_is_valid', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([]),
      'POST /api/v1/planned-entries': () => Response.json(entry(), { status: 201 }),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar previsão' }));
    await userEvent.type(await screen.findByLabelText('Valor'), '180000');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Aluguel');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), HOUSING_ID);
    await userEvent.type(screen.getByLabelText('Dia do mês'), '10');
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Criar previsão' }));
    // Assert
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      description: 'Aluguel',
      type: 'expense',
      amountCents: 180000,
      categoryId: HOUSING_ID,
      dayOfMonth: 10,
      recurrence: 'monthly',
      startMonth: '2026-11',
      endMonth: null,
      isActive: true,
    });
  });

  it('should_pause_the_entry_when_the_user_chooses_to_pause_it', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([occurrence()]),
      [`PUT /api/v1/planned-entries/${RENT_ID}`]: () => Response.json(entry({ isActive: false })),
    });
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    await userEvent.click(await screen.findByRole('button', { name: 'Editar previsão' }));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Pausar previsão' }));
    // Assert
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({ isActive: false });
  });

  it('should_ask_for_confirmation_before_deleting_the_entry', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([occurrence()]),
      [`DELETE /api/v1/planned-entries/${RENT_ID}`]: () => new Response(null, { status: 204 }),
    });
    renderPage();
    await userEvent.click(await findRow('Aluguel'));
    await userEvent.click(await screen.findByRole('button', { name: 'Editar previsão' }));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir previsão' }));
    // Assert
    expect(await screen.findByText('Excluir previsão?')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });
});

describe('PlanningPage projection block', () => {
  it('should_keep_the_planned_list_working_when_the_projection_fails', async () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([occurrence()]),
      'GET /api/v1/projection': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    // Act
    renderPage();
    // Assert
    expect(await findRow('Aluguel')).toBeInTheDocument();
  });

  it('should_show_the_projection_error_without_hiding_the_page_when_the_projection_fails', async () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([occurrence()]),
      'GET /api/v1/projection': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Não foi possível carregar a projeção.')).toBeInTheDocument();
  });
});
